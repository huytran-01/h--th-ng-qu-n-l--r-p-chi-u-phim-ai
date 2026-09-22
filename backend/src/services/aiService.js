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

class AIService {
  constructor() {
    // Expose agents cho tiện kiểm thử hoặc gọi trực tiếp nếu cần
    this.bookingAgent        = bookingAgent;
    this.recommendationAgent = recommendationAgent;
    this.customerServiceAgent = customerServiceAgent;
    this.adminAnalyticsAgent  = adminAnalyticsAgent;
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
   * Xử lý tin nhắn chatbot AI NLU tiếng Việt (Intent & Entity Extraction)
   * @param {string} message - Tin nhắn từ người dùng
   * @param {string} sessionId - ID phiên chat
   */
  processChatbotMessage(message, sessionId = "sess_default") {
    const session = this._getChatSession(sessionId);

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
}

module.exports = new AIService();
