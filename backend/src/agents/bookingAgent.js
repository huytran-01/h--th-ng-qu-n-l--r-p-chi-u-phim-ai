/**
 * BookingAgent — Trợ lý đặt vé thông minh
 * Chức năng: Tìm suất chiếu phù hợp, gợi ý ghế tối ưu, tính giá và tổng hợp thông tin đặt vé
 */
const { movies, showtimes, rooms, defaultSeats } = require("../data/mockData");

// Bảng chiết khấu theo mã giảm giá
const DISCOUNT_CODES = {
  HSSV20: 0.20,       // Học sinh - sinh viên 20%
  MEMBER10: 0.10,     // Thành viên rạp 10%
  COUPLE15: 0.15,     // Cặp đôi 15% (áp dụng khi mua ≥2 ghế SWEETBOX)
  BIRTHDAY30: 0.30,   // Sinh nhật 30%
  FIRSTBUY5: 0.05,    // Lần đầu mua 5%
};

// Ánh xạ khung thời gian trong ngày sang giờ chiếu
const TIME_OF_DAY_MAP = {
  morning: { min: 8, max: 12 },
  afternoon: { min: 12, max: 17 },
  evening: { min: 17, max: 21 },
  night: { min: 21, max: 24 },
};

class BookingAgent {
  /**
   * Tìm danh sách suất chiếu phù hợp nhất theo yêu cầu người dùng
   * @param {string} movieId - ID phim cần tìm suất chiếu
   * @param {Object} preferences - Tiêu chí lọc: { timeOfDay, hallFormat, date }
   * @returns {Array} Danh sách suất chiếu đã sắp xếp theo độ phù hợp
   */
  findBestShowtimes(movieId, preferences = {}) {
    const { timeOfDay = "evening", hallFormat = null } = preferences;

    // Lọc suất chiếu theo phim
    let result = showtimes.filter(st => st.movieId === movieId);

    // Lọc thêm theo định dạng phòng (IMAX, 3D, 2D)
    if (hallFormat) {
      const filtered = result.filter(st => {
        const room = rooms.find(r => r.id === st.roomId);
        return (st.format || room?.type) === hallFormat.toUpperCase();
      });
      if (filtered.length > 0) result = filtered;
    }

    // Tính điểm phù hợp theo khung giờ
    const timeRange = TIME_OF_DAY_MAP[timeOfDay] || TIME_OF_DAY_MAP.evening;
    const scored = result.map(st => {
      const startHour = new Date(st.startTime).getHours();
      const inRange = startHour >= timeRange.min && startHour < timeRange.max;
      const room = rooms.find(r => r.id === st.roomId);
      const movie = movies.find(m => m.id === st.movieId);
      return {
        ...st,
        movie,
        room,
        format: st.format || room?.type,
        timeScore: inRange ? 1 : 0,
        // Ưu tiên suất có cả phim hot + phòng lớn
        relevanceScore: (movie?.trendingScore || 50) / 100 + (room?.capacity || 40) / 100,
      };
    });

    // Sắp xếp: Đúng khung giờ > Phim hot > Phòng lớn
    scored.sort((a, b) => b.timeScore - a.timeScore || b.relevanceScore - a.relevanceScore);
    return scored.slice(0, 5); // Trả về tối đa 5 suất phù hợp nhất
  }

  /**
   * Gợi ý ghế tối ưu theo số lượng và loại ghế mong muốn
   * @param {string} showtimeId - ID suất chiếu
   * @param {number} quantity - Số lượng ghế cần
   * @param {string} seatPreference - Loại ghế: "VIP" | "STANDARD" | "SWEETBOX" | "GROUP"
   * @returns {Object} Danh sách ghế gợi ý và lý do
   */
  suggestOptimalSeats(showtimeId, quantity = 2, seatPreference = "VIP") {
    // Lọc ghế theo loại ưu tiên
    let candidateSeats;
    if (seatPreference === "GROUP") {
      // Nhóm: ưu tiên hàng giữa (E, F, G), ghế liền nhau
      candidateSeats = defaultSeats.filter(s => ["E", "F", "G"].includes(s.row));
    } else if (seatPreference === "SWEETBOX") {
      candidateSeats = defaultSeats.filter(s => s.type === "SWEETBOX");
    } else if (seatPreference === "VIP") {
      candidateSeats = defaultSeats.filter(s => s.type === "VIP");
    } else {
      candidateSeats = defaultSeats.filter(s => s.type === "STANDARD");
    }

    // Tìm dãy ghế liền nhau đủ số lượng
    const suggested = this._findConsecutiveSeats(candidateSeats, quantity);

    const preference = seatPreference === "GROUP"
      ? "hàng giữa rạp, tầm nhìn tốt nhất"
      : seatPreference === "SWEETBOX"
        ? "ghế đôi lãng mạn phù hợp cặp đôi"
        : seatPreference === "VIP"
          ? "ghế VIP thoải mái với khoảng cách chân rộng"
          : "ghế tiêu chuẩn tiết kiệm";

    return {
      suggestedSeatIds: suggested.map(s => s.id),
      seatDetails: suggested,
      reason: `Đề xuất ${quantity} ghế liền nhau loại ${seatPreference} — ${preference}`,
      alternativeType: seatPreference === "VIP" ? "STANDARD" : "VIP",
    };
  }

  /**
   * Tính tổng giá đặt vé có áp dụng discount
   * @param {Array<string>} seatIds - Danh sách ID ghế đã chọn
   * @param {string} showtimeId - ID suất chiếu
   * @param {Array<Object>} comboItems - Danh sách combo đã chọn [{id, quantity}]
   * @param {string|null} discountCode - Mã giảm giá (nếu có)
   * @returns {Object} Chi tiết giá: từng ghế, combo, discount, tổng cuối
   */
  estimateTotalPrice(seatIds = [], showtimeId, comboItems = [], discountCode = null) {
    const showtime = showtimes.find(st => st.id === showtimeId);
    if (!showtime) return { error: "Không tìm thấy suất chiếu" };

    // Tính giá từng ghế
    const seatPrices = seatIds.map(seatId => {
      const seat = defaultSeats.find(s => s.id === seatId);
      const unitPrice = Math.round(showtime.price * (seat?.priceRate || 1.0));
      return { seatId, type: seat?.type || "STANDARD", unitPrice };
    });

    const ticketSubtotal = seatPrices.reduce((sum, s) => sum + s.unitPrice, 0);

    // Tính giá combo (simplified — lấy từ mock combos)
    const { combos } = require("../data/mockData");
    let comboSubtotal = 0;
    const comboDetails = comboItems.map(item => {
      const combo = combos.find(c => c.id === item.id);
      const lineTotal = (combo?.price || 0) * (item.quantity || 1);
      comboSubtotal += lineTotal;
      return { ...combo, quantity: item.quantity, lineTotal };
    });

    // Áp dụng discount
    const discountRate = this._applyDiscount(discountCode, seatIds.length, seatPrices);
    const discountAmount = Math.round(ticketSubtotal * discountRate);
    const grandTotal = ticketSubtotal - discountAmount + comboSubtotal;

    return {
      seatBreakdown: seatPrices,
      ticketSubtotal,
      comboBreakdown: comboDetails,
      comboSubtotal,
      discountCode,
      discountRate: `${Math.round(discountRate * 100)}%`,
      discountAmount,
      grandTotal,
      currency: "VND",
    };
  }

  /**
   * Tạo tóm tắt thông tin đặt vé dạng text thân thiện
   * @param {Object} bookingData - Dữ liệu đặt vé hoàn chỉnh
   * @returns {string} Chuỗi tóm tắt
   */
  generateBookingSummary(bookingData) {
    const { movieTitle, showtimeStart, seats, grandTotal, hallFormat, customerName } = bookingData;
    const dateStr = showtimeStart
      ? new Date(showtimeStart).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })
      : "Chưa xác định";
    const seatStr = Array.isArray(seats) ? seats.join(", ") : seats;
    return [
      `🎬 Phim: ${movieTitle || "Chưa chọn phim"}`,
      `📅 Suất chiếu: ${dateStr} | ${hallFormat || "2D"}`,
      `💺 Ghế: ${seatStr || "Chưa chọn ghế"}`,
      `💰 Tổng thanh toán: ${(grandTotal || 0).toLocaleString("vi-VN")}đ`,
      `👤 Khách hàng: ${customerName || "Khách"}`,
    ].join("\n");
  }

  // ==================== PRIVATE HELPERS ==================== //

  /** Tìm các ghế liền nhau trong một danh sách ghế */
  _findConsecutiveSeats(seats, quantity) {
    // Nhóm ghế theo hàng
    const byRow = {};
    seats.forEach(s => {
      if (!byRow[s.row]) byRow[s.row] = [];
      byRow[s.row].push(s);
    });

    // Tìm hàng đầu tiên có đủ ghế liền nhau
    for (const row of Object.keys(byRow).sort()) {
      const rowSeats = byRow[row].sort((a, b) => a.number - b.number);
      for (let i = 0; i <= rowSeats.length - quantity; i++) {
        const group = rowSeats.slice(i, i + quantity);
        // Kiểm tra liền nhau (số thứ tự liên tiếp)
        const isConsecutive = group.every((s, idx) => idx === 0 || s.number === group[idx - 1].number + 1);
        if (isConsecutive) return group;
      }
    }

    // Nếu không đủ ghế liền nhau → trả về số lượng ghế đầu tiên có thể
    return seats.slice(0, quantity);
  }

  /** Tính tỷ lệ giảm giá dựa trên mã và điều kiện */
  _applyDiscount(discountCode, seatCount, seatPrices) {
    if (!discountCode) return 0;
    const baseRate = DISCOUNT_CODES[discountCode.toUpperCase()] || 0;
    // COUPLE15 chỉ áp dụng khi mua 2+ ghế SWEETBOX
    if (discountCode.toUpperCase() === "COUPLE15") {
      const hasSweetbox = seatPrices.some(s => s.type === "SWEETBOX");
      return (seatCount >= 2 && hasSweetbox) ? baseRate : 0;
    }
    return baseRate;
  }
}

module.exports = new BookingAgent();
