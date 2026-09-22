/**
 * AdminAnalyticsAgent — Bộ phân tích dữ liệu kinh doanh cho Ban Quản lý
 * Chức năng: Báo cáo KPI ngày, phân tích doanh thu, dự báo giờ cao điểm,
 *            đề xuất lịch chiếu tối ưu theo thuật toán LightGBM (mô phỏng)
 */
const { movies, showtimes, rooms, bookings } = require("../data/mockData");

// Dữ liệu lịch sử bán vé mô phỏng (trong thực tế lấy từ DB)
const MOCK_SALES_HISTORY = {
  totalTicketsSold: 1847,
  totalRevenue: 240_110_000, // VND
  avgOccupancyRate: 0.73,
  movieSalesBreakdown: {
    "mov-01": { tickets: 612, revenue: 91_800_000, rating: 4.8 }, // Dune 2
    "mov-02": { tickets: 384, revenue: 46_080_000, rating: 4.5 }, // Mai
    "mov-03": { tickets: 298, revenue: 43_610_000, rating: 4.9 }, // Oppenheimer
    "mov-04": { tickets: 253, revenue: 30_360_000, rating: 4.3 }, // KFP4
    "mov-05": { tickets: 201, revenue: 24_120_000, rating: 4.1 }, // Godzilla
    "mov-06": { tickets: 99,  revenue: 11_880_000, rating: 4.6 }, // Exhuma
  },
};

// Hệ số điều chỉnh theo ngày trong tuần (0=CN, 6=T7)
const DAY_MULTIPLIERS = {
  0: 1.35, // Chủ nhật — đông nhất
  1: 0.65, // Thứ 2 — vắng nhất
  2: 0.68, // Thứ 3
  3: 0.72, // Thứ 4
  4: 0.78, // Thứ 5
  5: 1.15, // Thứ 6
  6: 1.40, // Thứ 7 — đông thứ 2
};

// Dự báo cơ sở theo khung giờ (occupancy %)
const BASE_HOURLY_FORECAST = [
  { timeslot: "09:00 - 11:30", baseOccupancy: 38, label: "Sáng sớm", tier: "LOW" },
  { timeslot: "11:30 - 14:00", baseOccupancy: 52, label: "Trưa",     tier: "MEDIUM" },
  { timeslot: "14:00 - 16:30", baseOccupancy: 64, label: "Chiều",    tier: "MEDIUM" },
  { timeslot: "16:30 - 19:00", baseOccupancy: 78, label: "Chiều tối", tier: "HIGH" },
  { timeslot: "19:00 - 21:30", baseOccupancy: 94, label: "Giờ vàng", tier: "PEAK" },
  { timeslot: "21:30 - 00:00", baseOccupancy: 86, label: "Đêm",      tier: "HIGH" },
];

class AdminAnalyticsAgent {
  /**
   * Tạo báo cáo tổng hợp KPI trong ngày
   * @param {string|Date} date - Ngày cần báo cáo (default: hôm nay)
   * @returns {Object} Báo cáo đầy đủ với KPI, phân tích phim và đề xuất
   */
  generateDailyReport(date = new Date()) {
    const reportDate = new Date(date);
    const dayOfWeek = reportDate.getDay();
    const dayMultiplier = DAY_MULTIPLIERS[dayOfWeek];

    // Ưu tiên doanh thu thực tế từ các booking đã thanh toán trong ngày.
    const reportDateKey = reportDate.toISOString().slice(0, 10);
    const paidBookings = bookings.filter(booking =>
      booking.status === "PAID" && booking.bookedAt?.slice(0, 10) === reportDateKey
    );
    const dailyTickets = paidBookings.length > 0
      ? paidBookings.reduce((total, booking) => total + booking.seats.length, 0)
      : Math.round((MOCK_SALES_HISTORY.totalTicketsSold / 30) * dayMultiplier);
    const dailyRevenue = paidBookings.length > 0
      ? paidBookings.reduce((total, booking) => total + Number(booking.total || 0), 0)
      : Math.round((MOCK_SALES_HISTORY.totalRevenue / 30) * dayMultiplier);
    const occupancyRate = Math.min(0.99, MOCK_SALES_HISTORY.avgOccupancyRate * dayMultiplier);

    // Tìm phim bán chạy nhất trong ngày
    const topMovie = this._getTopMovieForDay(dayOfWeek);

    // Đề xuất hành động dựa trên KPI
    const actions = this._generateActionItems(occupancyRate, dailyRevenue, dayOfWeek);

    return {
      reportDate: reportDate.toLocaleDateString("vi-VN", { dateStyle: "full" }),
      dayLabel: ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"][dayOfWeek],
      kpi: {
        totalTickets: dailyTickets,
        totalRevenue: dailyRevenue,
        revenueFormatted: `${(dailyRevenue / 1_000_000).toFixed(1)} triệu đồng`,
        avgOccupancyRate: Math.round(occupancyRate * 100),
        avgOccupancyLabel: occupancyRate >= 0.85 ? "🔥 Rất đông" : occupancyRate >= 0.65 ? "✅ Ổn định" : "⚠️ Thấp",
        customerSatisfactionScore: 4.7, // Trên thang điểm 5
        newMemberRegistrations: Math.round(dailyTickets * 0.12),
      },
      topPerformer: topMovie,
      recommendedActions: actions,
      generatedAt: new Date().toISOString(),
      model: "LightGBM_ReportGen_v2.1",
    };
  }

  /**
   * Phân tích doanh thu chi tiết theo từng bộ phim
   * @param {string|null} movieId - ID phim cần phân tích (null = tất cả phim)
   * @returns {Object} Phân tích doanh thu, thị phần và xu hướng
   */
  analyzeRevenueByMovie(movieId = null) {
    const totalRevenue = MOCK_SALES_HISTORY.totalRevenue;

    if (movieId) {
      // Phân tích riêng một phim
      const sales = MOCK_SALES_HISTORY.movieSalesBreakdown[movieId];
      const movie = movies.find(m => m.id === movieId);
      if (!sales || !movie) return { error: "Không tìm thấy dữ liệu phim" };

      const marketShare = (sales.revenue / totalRevenue * 100).toFixed(1);
      const revenuePerTicket = Math.round(sales.revenue / sales.tickets);

      return {
        movie: { id: movieId, title: movie.title, genres: movie.genres },
        metrics: {
          totalTickets: sales.tickets,
          totalRevenue: sales.revenue,
          revenueFormatted: `${(sales.revenue / 1_000_000).toFixed(2)} triệu đồng`,
          marketShare: `${marketShare}%`,
          revenuePerTicket,
          customerRating: sales.rating,
          trend: sales.tickets > 300 ? "📈 Tăng trưởng mạnh" : sales.tickets > 150 ? "➡️ Ổn định" : "📉 Cần hỗ trợ",
        },
        recommendation: this._getMovieRecommendation(sales, movie),
      };
    }

    // Phân tích tất cả phim — xếp hạng theo doanh thu
    const allAnalysis = Object.entries(MOCK_SALES_HISTORY.movieSalesBreakdown)
      .map(([mId, sales]) => {
        const movie = movies.find(m => m.id === mId);
        return {
          rank: 0, // Sẽ được gán sau khi sắp xếp
          movieId: mId,
          title: movie?.title || "Không xác định",
          tickets: sales.tickets,
          revenue: sales.revenue,
          revenueFormatted: `${(sales.revenue / 1_000_000).toFixed(1)}M đ`,
          marketShare: `${(sales.revenue / totalRevenue * 100).toFixed(1)}%`,
          rating: sales.rating,
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .map((item, index) => ({ ...item, rank: index + 1 }));

    return {
      summary: {
        totalRevenue,
        totalRevenueFormatted: `${(totalRevenue / 1_000_000).toFixed(0)} triệu đồng`,
        totalTickets: MOCK_SALES_HISTORY.totalTicketsSold,
        numberOfMovies: allAnalysis.length,
        topMovie: allAnalysis[0]?.title,
      },
      breakdown: allAnalysis,
    };
  }

  /**
   * Dự báo giờ cao điểm theo ngày trong tuần (LightGBM Time Series)
   * @param {number} dayOfWeek - Ngày trong tuần: 0 (CN) - 6 (T7)
   * @returns {Array} Dự báo từng khung giờ với tỷ lệ lấp đầy và đề xuất
   */
  predictPeakHours(dayOfWeek = new Date().getDay()) {
    const multiplier = DAY_MULTIPLIERS[dayOfWeek] || 1.0;
    const dayLabel = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"][dayOfWeek];

    return {
      dayOfWeek,
      dayLabel,
      model: "LightGBM_TimeSeries_v1.8",
      forecast: BASE_HOURLY_FORECAST.map(slot => {
        const adjustedOccupancy = Math.min(99, Math.round(slot.baseOccupancy * multiplier));
        const expectedTickets = Math.round(adjustedOccupancy * 0.8); // 80 ghế IMAX max

        const recommendation = this._getTimeslotRecommendation(slot.tier, adjustedOccupancy, dayOfWeek);

        return {
          ...slot,
          predictedOccupancy: adjustedOccupancy,
          expectedTickets,
          dayMultiplier: multiplier,
          recommendation,
          isPeakHour: adjustedOccupancy >= 85,
          staffingLevel: adjustedOccupancy >= 85 ? "Tăng cường" : adjustedOccupancy >= 65 ? "Bình thường" : "Tối giản",
        };
      }),
    };
  }

  /**
   * Đề xuất lịch chiếu tối ưu để tối đa hóa doanh thu
   * @param {Array|null} moviePool - Danh sách phim xem xét (null = tất cả phim đang chiếu)
   * @param {Array|null} roomPool - Danh sách phòng chiếu (null = tất cả phòng)
   * @returns {Object} Lịch chiếu đề xuất với dự báo doanh thu
   */
  suggestOptimalSchedule(moviePool = null, roomPool = null) {
    const availableMovies = moviePool || movies;
    const availableRooms = roomPool || rooms;

    // Sắp xếp phim theo điểm ưu tiên (trendingScore * imdbRating)
    const rankedMovies = [...availableMovies]
      .map(m => ({
        ...m,
        priority: (m.trendingScore / 100) * 0.6 + (m.imdbRating / 10) * 0.4,
        salesData: MOCK_SALES_HISTORY.movieSalesBreakdown[m.id],
      }))
      .sort((a, b) => b.priority - a.priority);

    // Sắp xếp phòng theo sức chứa (lớn → nhỏ)
    const rankedRooms = [...availableRooms].sort((a, b) => b.totalSeats - a.totalSeats);

    // Tạo ma trận ghép phim-phòng-giờ tối ưu
    const schedule = [];
    const peakSlots = ["19:00", "21:30", "16:30"]; // Giờ ưu tiên giảm dần
    const offPeakSlots = ["09:00", "11:30", "14:00"];

    // Phim hot nhất → phòng lớn nhất → giờ vàng
    rankedMovies.slice(0, 3).forEach((movie, idx) => {
      const room = rankedRooms[idx % rankedRooms.length];
      const timeslot = peakSlots[idx] || "19:00";
      const expectedOccupancy = Math.round(95 - idx * 8);
      const avgTicketPrice = 135000; // Giả sử giá trung bình
      const revenueEstimate = Math.round(room.totalSeats * expectedOccupancy / 100 * avgTicketPrice);

      schedule.push({
        priority: idx + 1,
        movie: { id: movie.id, title: movie.title, trendingScore: movie.trendingScore },
        room: { id: room.id, name: room.name, capacity: room.totalSeats, format: room.type },
        timeslot,
        expectedOccupancy,
        revenueEstimate,
        reason: idx === 0
          ? `Phim hot nhất (${movie.trendingScore}%) + Phòng lớn nhất (${room.totalSeats} ghế) + Giờ vàng = Doanh thu tối đa`
          : `Phim có độ phổ biến cao + Bố trí phòng phù hợp sức chứa`,
      });
    });

    // Phim còn lại → phòng phụ → giờ thấp điểm
    rankedMovies.slice(3).forEach((movie, idx) => {
      const room = rankedRooms[Math.min(idx + 1, rankedRooms.length - 1)];
      const timeslot = offPeakSlots[idx % offPeakSlots.length];
      const expectedOccupancy = Math.round(55 - idx * 5);
      const revenueEstimate = Math.round(room.totalSeats * expectedOccupancy / 100 * 115000);

      schedule.push({
        priority: idx + 4,
        movie: { id: movie.id, title: movie.title, trendingScore: movie.trendingScore },
        room: { id: room.id, name: room.name, capacity: room.totalSeats, format: room.type },
        timeslot,
        expectedOccupancy,
        revenueEstimate,
        reason: "Khung giờ thấp điểm: Phù hợp ưu đãi Morning/Afternoon Special",
      });
    });

    const totalProjectedRevenue = schedule.reduce((sum, s) => sum + s.revenueEstimate, 0);
    const approvalToken = `SCHED-APPROVE-${Date.now().toString(36).toUpperCase().slice(-8)}`;

    return {
      generatedAt: new Date().toISOString(),
      model: "ScheduleOptimizer_Greedy_v1.3",
      recommendations: schedule,
      totalProjectedRevenue,
      totalProjectedRevenueFormatted: `${(totalProjectedRevenue / 1_000_000).toFixed(1)} triệu đồng`,
      approvalToken,
      message: "Nhấn 'Phê duyệt & Xuất bản' để áp dụng lịch chiếu tối ưu này",
    };
  }

  // ==================== PRIVATE HELPERS ==================== //

  /** Tìm phim bán chạy nhất cho ngày cụ thể */
  _getTopMovieForDay(dayOfWeek) {
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    // Cuối tuần: ưu tiên phim action/sci-fi; ngày thường: ưu tiên phim ít tốn kém
    const topId = isWeekend ? "mov-01" : "mov-02";
    const movie = movies.find(m => m.id === topId);
    const sales = MOCK_SALES_HISTORY.movieSalesBreakdown[topId];

    return {
      movieId: topId,
      title: movie?.title,
      dailyTickets: Math.round(sales.tickets / 30 * DAY_MULTIPLIERS[dayOfWeek]),
      dailyRevenue: Math.round(sales.revenue / 30 * DAY_MULTIPLIERS[dayOfWeek]),
      occupancyPeak: isWeekend ? "94%" : "78%",
    };
  }

  /** Tạo danh sách hành động đề xuất cho ban quản lý */
  _generateActionItems(occupancyRate, dailyRevenue, dayOfWeek) {
    const actions = [];
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (occupancyRate < 0.60) {
      actions.push("🎟️ Kích hoạt chiến dịch Flash Sale — giảm 30% cho vé mua trước 2 giờ");
      actions.push("📱 Đẩy thông báo push đến khách hàng về ưu đãi ngày hôm nay");
    }
    if (occupancyRate >= 0.85) {
      actions.push("👥 Bố trí thêm nhân viên tại quầy soát vé và bán bắp nước");
      actions.push("🎬 Mở thêm suất chiếu muộn (23:00) cho phim Dune 2 nếu còn phòng trống");
    }
    if (!isWeekend) {
      actions.push("🎓 Kích hoạt ưu đãi Học sinh - Sinh viên (HSSV20) cho ngày trong tuần");
    }
    actions.push("📊 Xem báo cáo chi tiết tại Admin Dashboard → tab Phân tích Doanh thu");

    return actions;
  }

  /** Tạo khuyến nghị phân bổ phòng chiếu theo tier giờ */
  _getTimeslotRecommendation(tier, occupancy, dayOfWeek) {
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const recommendations = {
      PEAK: `GIỜ VÀNG (${occupancy}%): Ưu tiên phim Dune 2 vào phòng IMAX ${isWeekend ? "80" : "60"} ghế — Tối đa hóa doanh thu`,
      HIGH: `Giờ cao điểm (${occupancy}%): Chuẩn bị thêm nhân viên hỗ trợ soát vé`,
      MEDIUM: `Giờ ổn định (${occupancy}%): Duy trì lịch hiện tại. Có thể áp dụng Afternoon Special`,
      LOW: `Giờ thấp điểm (${occupancy}%): Áp dụng Morning Special, ưu tiên phim gia đình / hoạt hình`,
    };
    return recommendations[tier] || `Tỷ lệ lấp đầy dự kiến: ${occupancy}%`;
  }

  /** Tạo khuyến nghị cho từng phim dựa trên hiệu suất */
  _getMovieRecommendation(sales, movie) {
    if (sales.tickets > 400) {
      return `"${movie.title}" là phim TOP đang chiếu. Đề xuất: Tăng số suất IMAX, kéo dài thời gian chiếu thêm 2 tuần.`;
    }
    if (sales.tickets > 200) {
      return `"${movie.title}" có hiệu suất tốt. Đề xuất: Duy trì lịch hiện tại, thêm 1 suất chiều tối vào cuối tuần.`;
    }
    return `"${movie.title}" cần được hỗ trợ. Đề xuất: Chạy chương trình Combo Ưu Đãi và đẩy gợi ý AI trong chatbot.`;
  }
}

module.exports = new AdminAnalyticsAgent();
