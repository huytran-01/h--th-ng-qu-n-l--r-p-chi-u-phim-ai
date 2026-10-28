/**
 * AIService — Orchestrator Layer: Điều phối các AI Agent chuyên biệt
 * Đây là lớp trung gian giữa API routes và các agent.
 * Không chứa business logic — chỉ điều phối và format response.
 *
 * Agents được quản lý:
 *  - BookingAgent         → Hỗ trợ đặt vé thông minh
 *  - RecommendationAgent  → Gợi ý phim cá nhân hóa (Hybrid NCF + PhoBERT)
 *  - CustomerServiceAgent → Chăm sóc khách hàng, hoàn vé, khiếu nại
 *  - AdminAnalyticsAgent  → Báo cáo KPI, dự báo, lịch chiếu tối ưu
 */
const { movies, showtimes } = require("../data/mockData");

// Import các AI Agent chuyên biệt
const bookingAgent        = require("../agents/bookingAgent");
const recommendationAgent = require("../agents/recommendationAgent");
const customerServiceAgent = require("../agents/customerServiceAgent");
const adminAnalyticsAgent  = require("../agents/adminAnalyticsAgent");
const geminiService        = require("./geminiService");

class AIService {
  constructor() {
    // Expose agents cho tiện kiểm thử hoặc gọi trực tiếp nếu cần
    this.bookingAgent        = bookingAgent;
    this.recommendationAgent = recommendationAgent;
    this.customerServiceAgent = customerServiceAgent;
    this.adminAnalyticsAgent  = adminAnalyticsAgent;
    this.geminiService        = geminiService;
    this.chatSessions = new Map();
  }

  // ==================== RECOMMENDATION AGENT APIs ==================== //

  /**
   * Lấy danh sách phim gợi ý cá nhân hóa (Hybrid Algorithm)
   * @param {string} userId - ID người dùng
   * @param {Object} userPreferences - Thể loại yêu thích
   */
  getPersonalizedRecommendations(userId = "user_guest", userPreferences = {}) {
    return this.recommendationAgent.getPersonalizedRecommendations(userId, userPreferences);
  }

  /**
   * Lấy danh sách phim tương tự với phim đã chọn
   * @param {string} movieId - ID phim gốc
   * @param {number} limit - Số lượng gợi ý tối đa
   */
  getSimilarMovies(movieId, limit = 4) {
    return this.recommendationAgent.getSimilarMovies(movieId, limit);
  }

  /**
   * Lấy gợi ý phim theo Collaborative Filtering
   * @param {string} userId - ID người dùng
   */
  getCollaborativeRecommendations(userId) {
    return this.recommendationAgent.getCollaborativeRecommendations(userId);
  }

  // ==================== BOOKING AGENT APIs ==================== //

  /**
   * Hỗ trợ tìm suất chiếu và ghế phù hợp theo yêu cầu (BookingAgent)
   * @param {string} movieTitle - Tên phim (sẽ tìm movieId tự động)
   * @param {Object} preferences - Tiêu chí: { hallFormat, timeOfDay, seatType, quantity }
   * @param {string} userId - ID người dùng
   */
  getBookingAssistance(movieTitle, preferences = {}, userId = "guest") {
    // Tìm phim theo tên (tìm gần đúng)
    const movie = movies.find(m =>
      m.title.toLowerCase().includes(movieTitle.toLowerCase())
      || movieTitle.toLowerCase().includes(m.title.toLowerCase().split(":")[0])
    ) || movies[0];

    // Tìm suất chiếu phù hợp
    const bestShowtimes = this.bookingAgent.findBestShowtimes(movie.id, preferences);
    const topShowtime = bestShowtimes[0];

    if (!topShowtime) {
      return { error: "Không tìm thấy suất chiếu phù hợp", movie };
    }

    // Gợi ý ghế tối ưu
    const seatSuggestion = this.bookingAgent.suggestOptimalSeats(
      topShowtime.id,
      preferences.quantity || 2,
      preferences.seatType || "VIP"
    );

    // Ước tính giá
    const pricing = this.bookingAgent.estimateTotalPrice(
      seatSuggestion.suggestedSeatIds,
      topShowtime.id,
      preferences.comboItems || [],
      preferences.discountCode || null
    );

    // Tạo tóm tắt
    const summary = this.bookingAgent.generateBookingSummary({
      movieTitle: movie.title,
      showtimeStart: topShowtime.startTime,
      seats: seatSuggestion.suggestedSeatIds,
      grandTotal: pricing.grandTotal,
      hallFormat: topShowtime.format,
      customerName: userId !== "guest" ? userId : "Khách hàng",
    });

    return {
      movie,
      recommendedShowtime: topShowtime,
      alternativeShowtimes: bestShowtimes.slice(1, 3),
      seatSuggestion,
      pricing,
      bookingSummary: summary,
    };
  }

  // ==================== CHATBOT NLU APIs ==================== //

  /**
   * Xử lý tin nhắn chatbot: Ưu tiên Google Gemini AI (nếu có key), tự động fallback sang Rule-based NLU
   * @param {string} message - Tin nhắn từ người dùng
   * @param {string} sessionId - ID phiên chat
   */
  async processChatbotMessage(message, sessionId = "sess_default") {
    const session = this._getChatSession(sessionId);

    // 1. Ưu tiên xử lý bằng Google Gemini AI (nếu đã cấu hình GEMINI_API_KEY)
    if (this.geminiService && this.geminiService.isAvailable()) {
      try {
        const { combos } = require("../data/mockData");
        const geminiResponse = await this.geminiService.generateChatReply({
          message,
          history: session.history || [],
          movies,
          showtimes,
          combos
        });

        if (!session.history) session.history = [];
        session.history.push({ sender: "user", text: message });
        session.history.push({ sender: "bot", text: geminiResponse.replyText });
        if (session.history.length > 8) session.history = session.history.slice(-8);

        return geminiResponse;
      } catch (geminiErr) {
        console.warn("[AIService] Gemini API error, fallback to Rule-based NLU:", geminiErr.message);
      }
    }

    // 2. Chế độ Fallback: Rule-based NLU tiếng Việt (Offline, Deterministic)
    const fallbackResponse = this._processRuleBasedChat(message, session);
    return {
      ...fallbackResponse,
      model: fallbackResponse.model || "Rule-based NLU (Offline fallback)"
    };
  }

  /**
   * Bộ xử lý hội thoại Rule-based NLU (Offline fallback)
   */
  _processRuleBasedChat(message, session) {
    // Xây thực thể trực tiếp từ catalog để phim mới tự động dùng được trong chat.
    const movieEntities = movies.flatMap(movie => {
      const aliases = [movie.title, movie.originalTitle, movie.title.split(":")[0]]
        .filter(Boolean)
        .map(value => this._normalizeChatText(value))
        .filter(value => value.length > 2);
      return aliases.map(alias => ({ movie, alias }));
    }).sort((a, b) => b.alias.length - a.alias.length);

    let detectedMovie = null;
    const normalizedMessage = this._normalizeChatText(message);
    for (const entity of movieEntities) {
      if (normalizedMessage.includes(entity.alias)) {
        detectedMovie = entity.movie;
        break;
      }
    }

    if (!detectedMovie && /phim (do|nay)|vua noi|phim tren/.test(normalizedMessage)) {
      detectedMovie = session.lastMovieId ? movies.find(movie => movie.id === session.lastMovieId) : null;
    }
    if (detectedMovie) session.lastMovieId = detectedMovie.id;

    // Bóc tách số lượng vé
    let ticketQty = 2;
    const qtyMatch = normalizedMessage.match(/(\d+)\s*(ve|nguoi|cho)/);
    if (qtyMatch) ticketQty = parseInt(qtyMatch[1], 10);

    // Bóc tách định dạng phòng
    let hallFormat = "STANDARD";
    if (normalizedMessage.includes("imax")) hallFormat = "IMAX";
    else if (normalizedMessage.includes("vip") || normalizedMessage.includes("gold class")) hallFormat = "VIP";
    else if (normalizedMessage.includes("3d")) hallFormat = "3D";

    // ---- Phân loại Intent ---- //

    // Intent 1: Báo cáo doanh số & Tình hình kinh doanh rạp CGV
    if (
      normalizedMessage.includes("doanh so") ||
      normalizedMessage.includes("doanh thu") ||
      normalizedMessage.includes("bao cao") ||
      normalizedMessage.includes("tinh hinh ban ve") ||
      normalizedMessage.includes("ban duoc bao nhieu") ||
      normalizedMessage.includes("ban the nao") ||
      normalizedMessage.includes("phong ve") ||
      normalizedMessage.includes("thong ke") ||
      normalizedMessage.includes("kpi") ||
      normalizedMessage.includes("tai chinh") ||
      normalizedMessage.includes("thu nhap")
    ) {
      const dailyReport = this.adminAnalyticsAgent.generateDailyReport(new Date());
      const revenueAnalysis = this.adminAnalyticsAgent.analyzeRevenueByMovie();
      const topMovies = (revenueAnalysis.breakdown || []).slice(0, 3);

      return {
        intent: "SALES_REPORT",
        confidence: 0.99,
        replyText: `📊 **BÁO CÁO DOANH SỐ & TÌNH HÌNH KINH DOANH CGV** (${dailyReport.reportDate}):\n\n` +
          `💰 **Doanh thu hôm nay:** **${dailyReport.kpi.totalRevenue.toLocaleString("vi-VN")} VNĐ** (${dailyReport.kpi.revenueFormatted})\n` +
          `🎟️ **Tổng vé đã bán:** **${dailyReport.kpi.totalTickets} vé**\n` +
          `📈 **Tỷ lệ lấp đầy phòng chiếu:** **${dailyReport.kpi.avgOccupancyRate}%** (${dailyReport.kpi.avgOccupancyLabel})\n\n` +
          `🏆 **Top 3 Phim Dẫn Đầu Doanh Số:**\n` +
          `1. 🥇 **${topMovies[0]?.title || 'Dune 2'}** — ${topMovies[0]?.revenueFormatted || '91.8M đ'} (${topMovies[0]?.tickets || 612} vé · ${topMovies[0]?.marketShare || '38.2%'})\n` +
          `2. 🥈 **${topMovies[1]?.title || 'Mai'}** — ${topMovies[1]?.revenueFormatted || '46.1M đ'} (${topMovies[1]?.tickets || 384} vé · ${topMovies[1]?.marketShare || '19.2%'})\n` +
          `3. 🥉 **${topMovies[2]?.title || 'Oppenheimer'}** — ${topMovies[2]?.revenueFormatted || '43.6M đ'} (${topMovies[2]?.tickets || 298} vé · ${topMovies[2]?.marketShare || '18.2%'})\n\n` +
          `💡 **Khuyến nghị vận hành:** ${dailyReport.recommendedActions[0] || 'Tối ưu suất chiếu giờ cao điểm tối nay.'}\n\n` +
          `Anh/chị có muốn xem chi tiết suất chiếu hay cần em hỗ trợ đặt vé phim nào không ạ?`,
        action: "SHOW_REVENUE_REPORT",
        revenueData: {
          totalRevenue: dailyReport.kpi.totalRevenue,
          revenueFormatted: dailyReport.kpi.revenueFormatted,
          totalTickets: dailyReport.kpi.totalTickets,
          avgOccupancyRate: dailyReport.kpi.avgOccupancyRate,
          topPerformer: dailyReport.topPerformer,
          topMovies
        },
        suggestedQuestions: [
          "Đặt vé phim Dune 2 ngay",
          "Dự báo khung giờ cao điểm",
          "Giá vé các phòng chiếu IMAX",
          "Các combo bắp nước hôm nay"
        ]
      };
    }

    // Intent 2: Phim bán chạy nhất / Quán quân phòng vé
    if (
      normalizedMessage.includes("ban chay") ||
      normalizedMessage.includes("hot nhat") ||
      normalizedMessage.includes("top phim") ||
      normalizedMessage.includes("xem nhieu") ||
      normalizedMessage.includes("phim quan quan") ||
      normalizedMessage.includes("phim nao hay nhat")
    ) {
      const revenueAnalysis = this.adminAnalyticsAgent.analyzeRevenueByMovie();
      const topMovies = (revenueAnalysis.breakdown || []).slice(0, 3);
      const topMovie = topMovies[0];

      return {
        intent: "TOP_SELLING_MOVIES",
        confidence: 0.98,
        replyText: `🏆 **BẢNG XẾP HẠNG PHIM BÁN CHẠY NHẤT RẠP CGV HIỆN TẠI:**\n\n` +
          `🥇 **Quán quân:** **${topMovie.title}** với **${topMovie.tickets} vé** đã bán ra (${topMovie.revenueFormatted}, chiếm ${topMovie.marketShare} thị phần phòng vé).\n\n` +
          `🥈 **Á quân:** **${topMovies[1]?.title}** (${topMovies[1]?.tickets} vé · ${topMovies[1]?.revenueFormatted})\n` +
          `🥉 **Top 3:** **${topMovies[2]?.title}** (${topMovies[2]?.tickets} vé · ${topMovies[2]?.revenueFormatted})\n\n` +
          `Anh/chị có muốn đặt vé trải nghiệm bộ phim bom tấn **${topMovie.title}** ngay hôm nay không ạ?`,
        action: "SHOW_BOOKING_CARD",
        suggestedAction: { type: "BOOKING_MODAL", movieId: topMovie.movieId },
        suggestedMovies: movies.filter(m => topMovies.some(tm => tm.movieId === m.id)).slice(0, 3),
        suggestedQuestions: [
          `Đặt vé phim ${topMovie.title}`,
          "Báo cáo doanh số rạp hôm nay",
          "Dự báo khung giờ cao điểm",
          "Combo bắp nước ưu đãi"
        ]
      };
    }

    // Intent 3: Cảm ơn / Đánh giá tốt
    if (
      normalizedMessage.includes("cam on") ||
      normalizedMessage.includes("thanks") ||
      normalizedMessage.includes("thank you") ||
      normalizedMessage.includes("tuyet voi") ||
      normalizedMessage.includes("hay qua") ||
      normalizedMessage.includes("gioi qua") ||
      normalizedMessage.includes("ok em")
    ) {
      return {
        intent: "THANK_YOU",
        confidence: 0.98,
        replyText: "Dạ không có chi ạ! Rất vui được đồng hành và hỗ trợ anh/chị. Chúc anh/chị có những phút giây xem phim thật bùng nổ và thư giãn tại cụm rạp CGV Cinemas nhé! ❤️🍿",
        suggestedQuestions: [
          "Báo cáo doanh số hôm nay",
          "Gợi ý phim hot cuối tuần",
          "Giá vé các phòng chiếu IMAX",
          "Đặt vé phim Dune 2"
        ]
      };
    }

    // Intent 4: Giờ mở cửa & Vị trí cụm rạp
    if (
      normalizedMessage.includes("mo cua") ||
      normalizedMessage.includes("may gio") ||
      normalizedMessage.includes("dia chi") ||
      normalizedMessage.includes("rap o dau") ||
      normalizedMessage.includes("o dau")
    ) {
      return {
        intent: "THEATER_INFO",
        confidence: 0.97,
        replyText: "🎬 **Cụm rạp CGV Cultureplex Vincom Landmark 81** mở cửa đón khách từ **08:30 sáng đến 01:00 sáng hôm sau** tất cả các ngày trong tuần (kể cả Lễ, Tết).\n\n" +
          "📍 Địa chỉ: Tầng B1, TTTM Vincom Landmark 81, 720A Điện Biên Phủ, Phường 22, Bình Thạnh, TP.HCM.\n" +
          "Hệ thống phòng chiếu bao gồm: **IMAX Laser, 4DX Dynamic, ScreenX 270° và Gold Class VIP** cao cấp!",
        suggestedQuestions: [
          "Báo cáo doanh số hôm nay",
          "Giá vé phòng chiếu IMAX",
          "Đặt 2 vé phim Dune 2",
          "Combo bắp nước"
        ]
      };
    }

    // Intent 5: Dự báo nhu cầu & Giờ cao điểm
    if (
      normalizedMessage.includes("du bao") ||
      normalizedMessage.includes("gio cao diem") ||
      normalizedMessage.includes("khung gio dong") ||
      normalizedMessage.includes("luc nao vang")
    ) {
      const forecast = this.adminAnalyticsAgent.predictPeakHours(new Date().getDay());
      const peakSlot = forecast.forecast.find(f => f.isPeakHour) || forecast.forecast[2];
      const lowSlot = forecast.forecast.find(f => f.tier === "LOW") || forecast.forecast[0];

      return {
        intent: "PEAK_HOUR_FORECAST",
        confidence: 0.98,
        replyText: `📈 **DỰ BÁO NHU CẦU & KHUNG GIỜ RẠP (${forecast.dayLabel}):**\n\n` +
          `🔥 **Khung giờ cao điểm:** **${peakSlot.timeslot}** (Lấp đầy dự kiến ~${peakSlot.predictedOccupancy}%, lượng khách rất đông, nên đặt vé sớm).\n\n` +
          `☕ **Khung giờ xem thoải mái:** **${lowSlot.timeslot}** (Lấp đầy ~${lowSlot.predictedOccupancy}%, chỗ ngồi đẹp và thoáng mát).\n\n` +
          `Anh/chị muốn đặt vé vào khung giờ nào để em hỗ trợ giữ chỗ tốt nhất ạ?`,
        suggestedQuestions: [
          "Đặt vé suất 19:30 tối nay",
          "Báo cáo doanh số hôm nay",
          "Phim nào bán chạy nhất?",
          "Giá vé phòng IMAX"
        ]
      };
    }

    // Intent 6: Chào hỏi tương tác thân thiện
    if (
      normalizedMessage.includes("chao") ||
      /\b(hi|hello|helo|alo)\b/.test(normalizedMessage) ||
      normalizedMessage.includes("ban la ai") ||
      normalizedMessage.includes("co ai khong")
    ) {
      return {
        intent: "GREETING",
        confidence: 0.95,
        replyText: "Dạ em chào anh/chị! 👋 Em là **Trợ lý Trí Tuệ Nhân Tạo CGV 24/7**.\n\n" +
          "Em có thể hỗ trợ anh/chị ngay lập tức:\n" +
          "📊 **Báo cáo doanh số & thị phần phòng vé**\n" +
          "🏆 **Tra cứu top phim bán chạy nhất**\n" +
          "🎬 **Gợi ý phim bom tấn theo gu cá nhân**\n" +
          "🎟️ **Tra cứu lịch chiếu & đặt vé trực tuyến**\n" +
          "💰 **Bảng giá vé IMAX, VIP & Combo bắp nước**\n\n" +
          "Hôm nay anh/chị cần em hỗ trợ nội dung gì ạ?",
        suggestedQuestions: [
          "Báo cáo doanh số hôm nay",
          "Phim nào bán chạy nhất?",
          "Gợi ý phim hot cuối tuần",
          "Đặt vé phim Dune 2"
        ]
      };
    }

    // Intent: Hoàn vé / Hỗ trợ khách hàng
    if (normalizedMessage.includes("hoan ve") || normalizedMessage.includes("huy ve") || normalizedMessage.includes("tra ve")) {
      const bookingCodeMatch = normalizedMessage.match(/bkg-\d+/i);
      const bookingCode = bookingCodeMatch ? bookingCodeMatch[0].toUpperCase() : null;
      if (bookingCode) {
        const refundResult = this.customerServiceAgent.handleRefundRequest(bookingCode, message);
        return {
          intent: "REFUND_REQUEST",
          confidence: 0.97,
          replyText: refundResult.success
            ? `Yêu cầu hoàn vé **${bookingCode}** đã được xử lý. ${refundResult.approved ? `✅ Hoàn ${refundResult.refundAmount?.toLocaleString("vi-VN")}đ trong ${refundResult.processingTime}.` : `❌ ${refundResult.note}`}`
            : `Không tìm thấy mã vé "${bookingCode}". Vui lòng kiểm tra lại email xác nhận.`,
          refundData: refundResult,
          action: "SHOW_REFUND_STATUS",
        };
      }
      return {
        intent: "REFUND_INQUIRY",
        confidence: 0.91,
        replyText: "Bạn muốn hoàn vé? Vui lòng cung cấp mã đặt vé (định dạng BKG-XXXXXX trong email xác nhận) để em xử lý ngay!",
        action: "REQUEST_BOOKING_CODE",
      };
    }

    // Intent: Tra cứu đặt vé
    if (normalizedMessage.includes("ma ve") || normalizedMessage.includes("kiem tra ve") || normalizedMessage.includes("tra cuu ve")) {
      const bookingCodeMatch = normalizedMessage.match(/bkg-\d+/i);
      if (bookingCodeMatch) {
        const status = this.customerServiceAgent.checkBookingStatus(bookingCodeMatch[0].toUpperCase());
        return {
          intent: "CHECK_BOOKING",
          confidence: 0.96,
          replyText: status.found
            ? `✅ Tìm thấy vé: **${status.booking.movieTitle}** — ${status.booking.showtimeStatus}. Ghế: ${status.booking.seats.join(", ")}`
            : "Không tìm thấy mã vé này. Vui lòng kiểm tra lại mã trong email xác nhận.",
          bookingData: status.booking,
          action: "SHOW_BOOKING_DETAIL",
        };
      }
    }

    // Intent: Giá vé
    if (normalizedMessage.includes("gia ve") || normalizedMessage.includes("bao nhieu tien") || normalizedMessage.includes("bang gia") || normalizedMessage.includes("hssv")) {
      return {
        intent: "CHECK_PRICE",
        confidence: 0.98,
        replyText: "Dạ, giá vé tại AI Cinema: 🎟️ Ghế Thường **110.000đ** | Ghế VIP **138.000đ** | Ghế Đôi Sweetbox **165.000đ**. Học sinh - sinh viên được giảm **20%** (dùng mã HSSV20) vào các ngày trong tuần!",
        action: "SHOW_PRICE_TABLE",
      };
    }

    // Intent: Combo F&B
    if (normalizedMessage.includes("do an") || normalizedMessage.includes("bap nuoc") || normalizedMessage.includes("bong ngo") || normalizedMessage.includes("combo")) {
      return {
        intent: "CHECK_FOOD",
        confidence: 0.95,
        replyText: "Rạp có các Combo hấp dẫn: 🍿 **Combo Solo** (85k) — Bắp + Nước ngọt | **Combo Couple Sweet** (129k) — 2 Bắp phô mai + 2 Nước | **Combo Family Jumbo** (189k) — Dành cho 4 người!",
        action: "SHOW_FOOD_MENU",
      };
    }

    // Intent: Gợi ý phim (AI Recommendation)
    if (normalizedMessage.includes("goi y") || normalizedMessage.includes("phim gi hay") || normalizedMessage.includes("tu van phim") || normalizedMessage.includes("cuoi tuan xem gi")) {
      const topRec = this.getPersonalizedRecommendations("user_guest").slice(0, 3);
      return {
        intent: "RECOMMENDATION",
        confidence: 0.97,
        replyText: `🤖 AI gợi ý ${topRec.length} phim hot nhất hôm nay: **${topRec[0].title}** (${topRec[0].matchPercentage}% phù hợp) | **${topRec[1].title}** | **${topRec[2].title}**. Bạn muốn xem chi tiết hoặc đặt vé phim nào?`,
        suggestedMovies: topRec,
        action: "SHOW_RECOMMENDATION_CARDS",
      };
    }

    // Intent: Danh mục phim sắp chiếu
    if (normalizedMessage.includes("sap chieu") || normalizedMessage.includes("phim moi")) {
      const upcoming = movies.filter(movie => movie.status === "COMING_SOON").slice(0, 5);
      return {
        intent: "COMING_SOON",
        confidence: 0.96,
        replyText: upcoming.length
          ? `🎞️ Các phim sắp chiếu nổi bật: ${upcoming.map(movie => `**${movie.title}**`).join(" | ")}. Bạn muốn xem chi tiết phim nào?`
          : "Hiện chưa có phim sắp chiếu mới trong lịch hệ thống.",
        suggestedMovies: upcoming,
        action: "SHOW_RECOMMENDATION_CARDS",
      };
    }

    // Intent: Phim tương tự
    if (normalizedMessage.includes("phim tuong tu") || normalizedMessage.includes("phim giong") || normalizedMessage.includes("phim cung the loai")) {
      if (detectedMovie) {
        const similar = this.getSimilarMovies(detectedMovie.id, 3);
        return {
          intent: "SIMILAR_MOVIES",
          confidence: 0.93,
          replyText: `Nếu bạn thích **${detectedMovie.title}**, AI gợi ý thêm: ${similar.map(m => m.title).join(", ")}. Chúng có cùng phong cách và thể loại!`,
          suggestedMovies: similar,
          action: "SHOW_RECOMMENDATION_CARDS",
        };
      }
    }

    // Intent: Đặt vé / Tìm suất chiếu
    if (detectedMovie || normalizedMessage.includes("dat ve") || normalizedMessage.includes("mua ve") || normalizedMessage.includes("suat chieu")) {
      const targetMovie = detectedMovie || movies[0];
      const availableShowtimes = showtimes.filter(st => st.movieId === targetMovie.id);

      return {
        intent: "BOOK_TICKET",
        confidence: 0.96,
        replyText: `🎬 Tìm thấy **${availableShowtimes.length}** suất chiếu cho phim **${targetMovie.title}** (${hallFormat}). Bấm vào suất chiếu bên dưới để chọn ghế ngay!`,
        extractedEntities: { movie: targetMovie, ticketQuantity: ticketQty, hallFormat },
        suggestedShowtimes: availableShowtimes,
        action: "SHOW_BOOKING_CARD",
      };
    }

    // Intent: Khiếu nại / Hỗ trợ
    if (normalizedMessage.includes("khieu nai") || normalizedMessage.includes("phan nan") || /\bte\b/.test(normalizedMessage) || normalizedMessage.includes("khong hai long")) {
      const complaintResult = this.customerServiceAgent.processComplaint(message, sessionId);
      return {
        intent: "COMPLAINT",
        confidence: 0.90,
        replyText: complaintResult.message,
        complaintData: complaintResult,
        action: complaintResult.requiresEscalation ? "SHOW_ESCALATION" : "SHOW_RESOLUTION",
      };
    }

    // Mặc định — Chào hỏi / Câu hỏi chung
    return {
      intent: "GREETING",
      confidence: 0.92,
      replyText: "Xin chào! 👋 Em là Trợ lý ảo AI Cinema 24/7. Em có thể giúp bạn: 🎬 Gợi ý phim | 🎟️ Đặt vé | 💰 Tra cứu giá | 🍿 Xem menu combo | 📋 Kiểm tra mã vé | 🔄 Hoàn vé. Bạn cần em hỗ trợ gì ạ?",
      suggestedQuestions: [
        "Gợi ý phim hot cuối tuần này",
        "Tìm 2 vé phim Dune 2 phòng IMAX",
        "Giá vé học sinh sinh viên bao nhiêu?",
        "Có những combo bắp nước nào?",
        "Kiểm tra mã vé BKG-001234",
      ],
      action: "SHOW_QUICK_REPLIES",
    };
  }

  // ==================== ADMIN ANALYTICS APIs ==================== //

  /**
   * Lấy dự báo nhu cầu khán giả theo khung giờ (LightGBM)
   * @param {number} dayOfWeek - Ngày trong tuần (0=CN...6=T7), mặc định: hôm nay
   */
  getShowtimeDemandForecast(dayOfWeek = new Date().getDay()) {
    return this.adminAnalyticsAgent.predictPeakHours(dayOfWeek).forecast;
  }

  /**
   * Tạo báo cáo KPI ngày cho Admin Dashboard
   * @param {string|Date} date - Ngày báo cáo
   */
  getDailyReport(date = new Date()) {
    return this.adminAnalyticsAgent.generateDailyReport(date);
  }

  /**
   * Đề xuất lịch chiếu tối ưu hóa doanh thu
   */
  getOptimalSchedule() {
    return this.adminAnalyticsAgent.suggestOptimalSchedule();
  }

  /**
   * Phân tích doanh thu theo phim
   * @param {string|null} movieId - null = tất cả phim
   */
  getRevenueAnalysis(movieId = null) {
    return this.adminAnalyticsAgent.analyzeRevenueByMovie(movieId);
  }

  _normalizeChatText(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9\s:]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  _getChatSession(sessionId) {
    const key = String(sessionId || "sess_default").slice(0, 100);
    const now = Date.now();
    const existing = this.chatSessions.get(key);
    if (existing && now - existing.updatedAt < 30 * 60 * 1000) {
      existing.updatedAt = now;
      return existing;
    }
    const session = { lastMovieId: null, updatedAt: now };
    this.chatSessions.set(key, session);
    return session;
  }

  /**
   * Lấy thông tin trạng thái tích hợp Google Gemini API
   */
  getGeminiStatus() {
    return this.geminiService ? this.geminiService.getStatus() : { available: false, status: "NOT_LOADED" };
  }
}

module.exports = new AIService();
