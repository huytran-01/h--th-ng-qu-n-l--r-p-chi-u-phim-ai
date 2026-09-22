/**
 * CustomerServiceAgent — Trợ lý chăm sóc khách hàng tự động 24/7
 * Chức năng: Xử lý hoàn vé, tra cứu đặt vé, phân loại khiếu nại, chuyển nhân viên
 */

const { bookings, movies, showtimes } = require("../data/mockData");

// Chính sách hoàn vé theo thời gian còn lại đến suất chiếu
const REFUND_POLICIES = {
  MORE_THAN_24H: {
    label: "> 24 giờ trước suất chiếu",
    approved: true,
    refundRate: 1.00,
    processingTime: "2-3 ngày làm việc",
  },
  BETWEEN_2H_24H: {
    label: "Từ 2 - 24 giờ trước suất chiếu",
    approved: true,
    refundRate: 0.50,
    processingTime: "3-5 ngày làm việc",
  },
  LESS_THAN_2H: {
    label: "Dưới 2 giờ trước suất chiếu",
    approved: false,
    refundRate: 0,
    processingTime: null,
    note: "Chính sách không hỗ trợ hoàn vé trong vòng 2 giờ trước suất chiếu",
  },
  SPECIAL_CASE: {
    label: "Trường hợp đặc biệt (sự cố kỹ thuật, lỗi hệ thống)",
    approved: true,
    refundRate: 1.00,
    processingTime: "1 ngày làm việc",
  },
};

// Cơ sở dữ liệu đặt vé mô phỏng (in-memory)
const MOCK_BOOKING_DB = {
  "BKG-001234": {
    bookingCode: "BKG-001234",
    movieTitle: "Dune: Part Two",
    showtimeStart: "2024-07-20T19:00:00+07:00",
    seats: ["E5", "E6"],
    customerName: "Nguyễn Văn An",
    customerPhone: "0912345678",
    totalAmount: 275000,
    paymentStatus: "PAID",
    bookedAt: "2024-07-18T10:00:00+07:00",
  },
  "BKG-005678": {
    bookingCode: "BKG-005678",
    movieTitle: "Mai",
    showtimeStart: "2024-07-19T14:30:00+07:00",
    seats: ["C3"],
    customerName: "Trần Thị Bình",
    customerPhone: "0987654321",
    totalAmount: 110000,
    paymentStatus: "PAID",
    bookedAt: "2024-07-19T09:00:00+07:00",
  },
};

// Hàng đợi chuyển nhân viên (escalation queue)
const ESCALATION_QUEUE = [];

class CustomerServiceAgent {
  /**
   * Xử lý yêu cầu hoàn vé từ khách hàng
   * @param {string} bookingCode - Mã đặt vé (format: BKG-XXXXXX)
   * @param {string} reason - Lý do hoàn vé
   * @param {Object} customerInfo - Thông tin khách hàng xác minh: { name, phone }
   * @returns {Object} Kết quả xử lý hoàn vé
   */
  handleRefundRequest(bookingCode, reason = "", customerInfo = {}) {
    // Tra cứu booking
    const booking = this._findBooking(bookingCode);
    if (!booking) {
      return {
        success: false,
        error: "NOT_FOUND",
        message: `Không tìm thấy mã đặt vé "${bookingCode}". Vui lòng kiểm tra lại mã đặt vé trong email xác nhận.`,
      };
    }

    // Xác minh thông tin khách hàng (đơn giản)
    if (customerInfo.phone && !booking.customerPhone.includes(customerInfo.phone.slice(-4))) {
      return {
        success: false,
        error: "VERIFICATION_FAILED",
        message: "Thông tin xác minh không khớp. Vui lòng cung cấp đúng số điện thoại đã đặt vé.",
      };
    }

    // Kiểm tra trạng thái thanh toán
    if (booking.paymentStatus !== "PAID") {
      return {
        success: false,
        error: "INVALID_STATUS",
        message: "Vé chưa thanh toán hoặc đã được hoàn trước đó.",
      };
    }

    // Xác định chính sách hoàn vé dựa trên thời gian
    const policy = this._determineRefundPolicy(booking.showtimeStart, reason);
    const refundAmount = Math.round(booking.totalAmount * policy.refundRate);

    // Kiểm tra trường hợp đặc biệt (lý do kỹ thuật/force majeure)
    const isForceCase = this._isSpecialCase(reason);
    const finalPolicy = isForceCase ? REFUND_POLICIES.SPECIAL_CASE : policy;
    const finalRefund = Math.round(booking.totalAmount * finalPolicy.refundRate);

    return {
      success: true,
      bookingCode,
      movieTitle: booking.movieTitle,
      originalAmount: booking.totalAmount,
      refundPolicy: finalPolicy.label,
      approved: finalPolicy.approved,
      refundAmount: finalPolicy.approved ? finalRefund : 0,
      refundRate: `${Math.round(finalPolicy.refundRate * 100)}%`,
      processingTime: finalPolicy.processingTime,
      note: finalPolicy.note || null,
      refundMethod: "Hoàn về phương thức thanh toán gốc",
      caseId: `REFUND-${Date.now().toString().slice(-6)}`,
      reason,
    };
  }

  /**
   * Tra cứu trạng thái đặt vé theo mã
   * @param {string} bookingCode - Mã đặt vé
   * @returns {Object} Thông tin chi tiết đặt vé hoặc thông báo lỗi
   */
  checkBookingStatus(bookingCode) {
    const booking = this._findBooking(bookingCode);
    if (!booking) {
      return {
        found: false,
        message: `Không tìm thấy mã đặt vé "${bookingCode}".`,
        suggestions: [
          "Kiểm tra lại email xác nhận để tìm đúng mã vé",
          "Mã vé có định dạng BKG-XXXXXX (6 ký tự sau BKG-)",
          "Liên hệ hotline 1900-CINEMA nếu cần hỗ trợ thêm",
        ],
      };
    }

    const now = new Date();
    const showtimeDate = new Date(booking.showtimeStart);
    const hoursUntilShowtime = (showtimeDate - now) / (1000 * 60 * 60);

    let statusLabel;
    if (hoursUntilShowtime > 0) {
      statusLabel = `Còn ${Math.round(hoursUntilShowtime)} giờ đến suất chiếu`;
    } else {
      statusLabel = "Suất chiếu đã diễn ra";
    }

    return {
      found: true,
      booking: {
        ...booking,
        showtimeStatus: statusLabel,
        canRefund: hoursUntilShowtime > 2,
      },
    };
  }

  /**
   * Phân loại và đề xuất giải quyết khiếu nại tự động
   * @param {string} message - Nội dung khiếu nại từ khách hàng
   * @param {string} sessionId - ID phiên trò chuyện
   * @returns {Object} Phân loại, mức độ ưu tiên, đề xuất giải quyết
   */
  processComplaint(message, sessionId = "sess_default") {
    const rawMsg = message.toLowerCase().trim();
    const classification = this._classifyComplaint(rawMsg);

    // Ghi log complaint (trong thực tế sẽ lưu DB)
    const complaintId = `CMP-${Date.now().toString().slice(-6)}`;

    return {
      complaintId,
      sessionId,
      category: classification.category,
      priority: classification.priority,
      requiresEscalation: classification.priority === "HIGH",
      suggestedResolution: classification.suggestedResolution,
      estimatedResponseTime: classification.priority === "HIGH" ? "15-30 phút" : "1-2 giờ",
      autoResolved: classification.priority === "LOW",
      message: `Khiếu nại của bạn đã được ghi nhận [${complaintId}]. ${classification.suggestedResolution}`,
    };
  }

  /**
   * Chuyển vụ việc lên nhân viên thật khi AI không xử lý được
   * @param {string} sessionId - ID phiên chat
   * @param {string} issue - Mô tả vấn đề cần chuyển
   * @returns {Object} Thông tin ticket và thời gian chờ ước tính
   */
  escalateToHuman(sessionId, issue = "") {
    const ticketId = `ESC-${Date.now().toString().slice(-6)}`;
    const queuePosition = ESCALATION_QUEUE.length + 1;

    ESCALATION_QUEUE.push({
      ticketId,
      sessionId,
      issue,
      createdAt: new Date().toISOString(),
      status: "WAITING",
    });

    const estimatedWait = queuePosition <= 2 ? "2-5 phút" : `${queuePosition * 3}-${queuePosition * 5} phút`;

    return {
      success: true,
      ticketId,
      queuePosition,
      estimatedWaitTime: estimatedWait,
      message: `✅ Đã kết nối với nhân viên hỗ trợ! Mã ticket của bạn là **${ticketId}**. Nhân viên sẽ liên hệ trong khoảng ${estimatedWait}. Bạn cũng có thể gọi hotline **1900-CINEMA** để được hỗ trợ ngay.`,
      hotline: "1900-CINEMA",
      workingHours: "07:00 - 23:00 mỗi ngày",
    };
  }

  // ==================== PRIVATE HELPERS ==================== //

  _findBooking(bookingCode) {
    if (MOCK_BOOKING_DB[bookingCode]) return MOCK_BOOKING_DB[bookingCode];
    const storedBooking = bookings.find(item => item.bookingCode === bookingCode);
    if (!storedBooking) return null;
    const movie = movies.find(item => item.id === storedBooking.movieId);
    const showtime = showtimes.find(item => item.id === storedBooking.showtimeId);
    return {
      bookingCode: storedBooking.bookingCode,
      movieTitle: movie?.title || "Phim chiếu rạp",
      showtimeStart: showtime?.startTime || storedBooking.bookedAt,
      seats: storedBooking.seats,
      customerName: "Khách hàng AI Cinema",
      customerPhone: "0987654321",
      totalAmount: storedBooking.total,
      paymentStatus: storedBooking.status === "PAID" ? "PAID" : storedBooking.status,
      bookedAt: storedBooking.bookedAt,
    };
  }

  /** Xác định chính sách hoàn vé theo thời gian còn lại */
  _determineRefundPolicy(showtimeStart, reason) {
    const now = new Date();
    const showtime = new Date(showtimeStart);
    const hoursLeft = (showtime - now) / (1000 * 60 * 60);

    if (hoursLeft > 24) return REFUND_POLICIES.MORE_THAN_24H;
    if (hoursLeft > 2) return REFUND_POLICIES.BETWEEN_2H_24H;
    return REFUND_POLICIES.LESS_THAN_2H;
  }

  /** Kiểm tra trường hợp đặc biệt (force majeure, lỗi hệ thống) */
  _isSpecialCase(reason) {
    const specialKeywords = ["lỗi hệ thống", "sự cố kỹ thuật", "rạp hủy", "tai nạn", "cấp cứu", "thiên tai"];
    return specialKeywords.some(kw => reason.toLowerCase().includes(kw));
  }

  /** Phân loại khiếu nại theo nội dung */
  _classifyComplaint(rawMsg) {
    if (rawMsg.includes("ghế") && (rawMsg.includes("bẩn") || rawMsg.includes("hỏng") || rawMsg.includes("không ngả"))) {
      return {
        category: "SEAT_QUALITY",
        priority: "MEDIUM",
        suggestedResolution: "Xin lỗi vì sự bất tiện. Bộ phận kỹ thuật sẽ kiểm tra và bảo trì ghế ngay. Chúng tôi sẽ bù đắp bằng voucher giảm giá cho lần mua vé tiếp theo.",
      };
    }
    if (rawMsg.includes("âm thanh") || rawMsg.includes("loa") || rawMsg.includes("tiếng ồn")) {
      return {
        category: "AUDIO_QUALITY",
        priority: "MEDIUM",
        suggestedResolution: "Chúng tôi ghi nhận sự cố âm thanh tại phòng chiếu. Kỹ thuật viên sẽ kiểm tra hệ thống Dolby Atmos ngay. Bạn sẽ nhận được voucher xem phim miễn phí như lời xin lỗi.",
      };
    }
    if (rawMsg.includes("màn hình") || rawMsg.includes("hình ảnh") || rawMsg.includes("mờ") || rawMsg.includes("tối")) {
      return {
        category: "VISUAL_QUALITY",
        priority: "HIGH",
        suggestedResolution: "Lỗi hình ảnh màn hình chiếu là vấn đề nghiêm trọng. Chúng tôi sẽ hoàn tiền 100% và tặng thêm 2 vé xem phim miễn phí như lời xin lỗi chân thành.",
      };
    }
    if (rawMsg.includes("nhân viên") || rawMsg.includes("thái độ") || rawMsg.includes("phục vụ")) {
      return {
        category: "STAFF_CONDUCT",
        priority: "HIGH",
        suggestedResolution: "Chúng tôi nghiêm túc tiếp nhận phản ánh về thái độ phục vụ. Quản lý ca sẽ liên hệ với bạn trong vòng 30 phút để làm rõ và xử lý sự việc.",
      };
    }
    if (rawMsg.includes("lạnh") || rawMsg.includes("điều hòa") || rawMsg.includes("nóng")) {
      return {
        category: "TEMPERATURE",
        priority: "LOW",
        suggestedResolution: "Chúng tôi sẽ điều chỉnh nhiệt độ phòng chiếu theo phản ánh của bạn. Nếu cảm thấy không thoải mái, nhân viên tại rạp có thể hỗ trợ đổi sang phòng chiếu khác.",
      };
    }
    // Mặc định — khiếu nại chung
    return {
      category: "GENERAL_FEEDBACK",
      priority: "LOW",
      suggestedResolution: "Cảm ơn bạn đã phản ánh. Chúng tôi đã ghi nhận và sẽ chuyển tới bộ phận liên quan để cải thiện chất lượng dịch vụ.",
    };
  }
}

module.exports = new CustomerServiceAgent();
