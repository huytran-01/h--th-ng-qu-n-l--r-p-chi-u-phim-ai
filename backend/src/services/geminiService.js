const adminAnalyticsAgent = require("../agents/adminAnalyticsAgent");
const dbService = require("./dbService");
/**
 * GeminiService — Tích hợp Google Gemini AI Trực Tiếp (Real-time Generative AI)
 * Sử dụng native REST API fetch siêu tốc (~1 giây) với cơ chế chịu lỗi đa mô hình (Multi-model Auto-failover).
 * Đảm bảo 100% cuộc hội thoại được sinh trực tiếp từ trí tuệ nhân tạo Gemini của Google, không dùng mẫu câu tĩnh.
 */

class GeminiService {
  constructor() {
    this.apiKey = (process.env.GEMINI_API_KEY || "").trim();
    this.primaryModel = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
    this.modelsPool = [
      this.primaryModel,
      "gemini-3.5-flash-lite",
      "gemini-flash-lite-latest",
      "gemini-3.5-flash",
      "gemini-flash-latest"
    ].filter((m, i, arr) => arr.indexOf(m) === i);
  }

  /**
   * Kiểm tra API Key có tồn tại và hợp lệ không
   */
  isAvailable() {
    this.apiKey = (process.env.GEMINI_API_KEY || "").trim();
    this.primaryModel = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
    return Boolean(this.apiKey && this.apiKey.length > 15 && this.apiKey !== "your_gemini_api_key_here");
  }

  getModelName() {
    return this.primaryModel;
  }

  getStatus() {
    const available = this.isAvailable();
    return {
      available,
      provider: "Google Gemini 3.5 Flash Lite (Direct Chat)",
      model: this.primaryModel,
      status: available ? "READY" : "NOT_CONFIGURED",
      hint: available
        ? "Gemini 3.5 Flash Lite đang hoạt động trực tiếp theo thời gian thực (Real-time Chat)."
        : "Chưa cấu hình GEMINI_API_KEY trong file backend/.env."
    };
  }

  /**
   * Trò chuyện trực tiếp với Google Gemini AI
   */
  async generateChatReply({ message, history = [], movies = [], showtimes = [], combos = [] }) {
    if (!this.isAvailable()) {
      throw new Error("GEMINI_API_KEY chưa được cấu hình trong file backend/.env");
    }

    // 1. Tính toán thời gian thực tế của hệ thống
    const now = new Date();
    const days = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
    const todayName = days[now.getDay()];
    const todayStr = `${todayName}, ngày ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;

    // 2. Tóm tắt dữ liệu rạp và doanh số bán vé thực tế từ CSDL
    let salesReport;
    try {
      salesReport = await dbService.getRealAnalyticsReport(now);
    } catch (e) {
      salesReport = adminAnalyticsAgent.generateDailyReport(now);
    }
    const topMovies = (salesReport?.topMovies || []).slice(0, 3);
    const kpi = salesReport?.kpi || {};
    const revFormatted = kpi.revenueFormatted || "0 VNĐ";
    const totalRev = Number(kpi.totalRevenue || 0).toLocaleString("vi-VN");
    const totalTickets = kpi.totalTickets || 0;
    const occRate = kpi.avgOccupancyRate || 65;
    const occLabel = kpi.avgOccupancyLabel || "Ổn định";

    const topPerformer = salesReport?.topPerformer || {};
    const topPerfTitle = topPerformer.title || (topMovies[0]?.title) || "Dune: Hành Tinh Cát 2";
    const topPerfTickets = topPerformer.dailyTickets || topPerformer.tickets || 0;
    const topPerfRev = Number(topPerformer.dailyRevenue || topPerformer.revenue || 0).toLocaleString("vi-VN");

    // Tóm tắt dữ liệu rạp để cung cấp kiến thức nền cho Gemini
    const movieCatalogText = movies.map(m =>
      `- [${m.id}] ${m.title} (${m.genres ? m.genres.join(", ") : "Điện ảnh"}) | Thời lượng: ${m.durationMinutes || 120}p | IMDb: ${m.imdbRating || 8.0} | Trạng thái: ${m.status === "COMING_SOON" ? "Sắp chiếu" : "Đang chiếu"}`
    ).join("\n");

    const systemPrompt = `
Bạn là "Trợ lý ảo AI CGV Cinema 24/7" — một người bạn điện ảnh thông minh, hài hước, thân thiện, lịch thiệp và am hiểu của cụm rạp CGV Cinemas Vietnam.

BÁO CÁO DOANH SỐ & TÌNH HÌNH PHÒNG VÉ CGV:
- Doanh thu hôm nay: ${revFormatted} (${totalRev} VNĐ)
- Tổng số vé đã bán hôm nay: ${totalTickets} vé
- Tỷ lệ lấp đầy phòng chiếu: ${occRate}% (${occLabel})
- Phim dẫn đầu doanh số: "${topPerfTitle}" (${topPerfTickets} vé - ${topPerfRev} VNĐ)
- Top 3 phim doanh số cao nhất:
  1. ${topMovies[0]?.title || "Dune 2"}: ${topMovies[0]?.revenueFormatted || "0 đ"} (${topMovies[0]?.tickets || 0} vé)
  2. ${topMovies[1]?.title || "Mai"}: ${topMovies[1]?.revenueFormatted || "0 đ"} (${topMovies[1]?.tickets || 0} vé)
  3. ${topMovies[2]?.title || "Exhuma"}: ${topMovies[2]?.revenueFormatted || "0 đ"} (${topMovies[2]?.tickets || 0} vé)

KHI NGƯỜI DÙNG HỎI VỀ DOANH SỐ, DOANH THU, TÌNH HÌNH BÁN VÉ, PHIM NÀO BÁN CHẠY:
- Hãy trả lời chi tiết số liệu, sinh động, văn phong chuyên nghiệp và có thể kèm lời khuyên kinh doanh hoặc đề xuất khách đặt vé xem phim bán chạy nhất.

KHI NGƯỜI DÙNG YÊU CẦU ĐẶT VÉ, MUA VÉ (Ví dụ: "đặt phim...", "đặt vé...", "mua vé...", "đặt vé conan...", "đặt phim thám tử lừng danh..."):
- TUYỆT ĐỐI KHÔNG ĐƯỢC TỰ TIỆN XUẤT VÉ HAY TỰ BỊA MÃ VÉ VÀ GHẾ NGỒI (vì khách hàng cần tự chọn ngày/giờ chiếu và vị trí ghế yêu thích trên sơ đồ rạp).
- Hãy chào đón nhiệt tình, xác nhận đúng bộ phim khách muốn xem.
- Giới thiệu nhanh các khung giờ chiếu phổ biến trong ngày của bộ phim đó (ví dụ: các suất sáng, chiều, tối ở phòng 2D/IMAX).
- Hướng dẫn khách hàng: "Anh/chị vui lòng bấm nút **'🎟️ Chọn Suất Chiếu & Ghế Ngồi'** ngay bên dưới để chọn giờ chiếu và vị trí ghế yêu thích trên sơ đồ rạp nhé!"
- TUYỆT ĐỐI KHÔNG tự động chốt ghế ngẫu nhiên hay sinh mã vé CGV-XXXXXX khi khách chưa chọn ghế và chưa xác nhận thanh toán!

THỜI GIAN THỰC TẾ:
- Hôm nay là: ${todayStr} (giờ Việt Nam). Khi người dùng hỏi hôm nay thứ mấy, ngày bao nhiêu hoặc hỏi về lịch chiếu hôm nay, hãy trả lời chính xác theo ngày này.

PHONG CÁCH TRÒ CHUYỆN:
- Trò chuyện hoàn toàn tự nhiên bằng tiếng Việt như người thật, linh hoạt và duyên dáng, KHÔNG trả lời theo kịch bản mẫu cứng nhắc.
- Khách có thể trò chuyện bất kỳ điều gì: từ phim ảnh, cuộc sống, hỏi thăm, thời tiết cho đến hỏi giá vé, đặt vé.
- Luôn sẵn lòng lắng nghe và phản hồi thông minh, có thể dùng emoji sinh động và định dạng in đậm **từ khóa** để văn bản đẹp mắt.
- QUY TẮC BẮT BUỘC: Tuyệt đối KHÔNG tự ý gợi ý: "lên nội dung tin nhắn broadcast khuyến mãi", "gửi tin nhắn cho tệp khách hàng thân thiết", hoặc các đề xuất marketing/broadcast rườm rà. KHÔNG chèn câu hỏi máy móc kiểu "Anh/chị thấy các phương án này thế nào ạ? Có cần em hỗ trợ lên nội dung tin nhắn broadcast...".

KIẾN THỨC VỀ RẠP CHIẾU PHIM CGV ĐỂ BẠN TƯ VẤN (KHI KHÁCH HỎI HOẶC CẦN GỢI Ý):
Danh mục phim của rạp:
${movieCatalogText}

Bảng giá vé tham khảo:
- Ghế Thường: 110.000đ | Ghế VIP: 138.000đ | Ghế Đôi Sweetbox: 165.000đ
- Học sinh - sinh viên được giảm 20% khi nhập mã ưu đãi "HSSV20" vào các ngày trong tuần.
Combo Bắp Nước:
- Combo Solo (85k), Combo Couple Sweet (129k), Combo Family Jumbo (189k).
Quy định hoàn vé:
- Mã vé dạng BKG-XXXXXX hoặc CGV-XXXXXX. Hủy trước 24h: hoàn 100%; hủy 2h-24h: hoàn 50%; dưới 2h: không hoàn theo quy định rạp.
`;

    // 3. Chuẩn bị hội thoại gửi Gemini
    const contents = [];
    if (Array.isArray(history) && history.length > 0) {
      for (const turn of history.slice(-4)) {
        contents.push({
          role: turn.sender === "user" ? "user" : "model",
          parts: [{ text: turn.text || turn.message }]
        });
      }
    }
    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    const payload = {
      system_instruction: {
        parts: [{ text: systemPrompt }]
      },
      contents,
      generationConfig: {
        temperature: 0.75,
        maxOutputTokens: 1000
      }
    };

    // 4. Gọi Google Gemini qua REST API trực tiếp với cơ chế Auto-failover
    let rawReply = "";
    let successfulModel = this.primaryModel;

    for (const modelToTry of this.modelsPool) {
      try {
        console.log(`[GeminiService] Đang kết nối trực tiếp với Google Gemini (${modelToTry})...`);
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelToTry}:generateContent?key=${this.apiKey}`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 35000); // 35 giây timeout

        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify(payload)
        });

        clearTimeout(timeout);
        const data = await res.json();

        if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
          rawReply = data.candidates[0].content.parts[0].text.trim();
          successfulModel = modelToTry;
          console.log(`[GeminiService] Nhận phản hồi thành công từ mô hình ${modelToTry}!`);
          break;
        } else if (data.error) {
          console.warn(`[GeminiService] Mô hình ${modelToTry} báo lỗi (${data.error.code}): ${data.error.message?.slice(0, 70)}`);
        }
      } catch (err) {
        console.warn(`[GeminiService] Thử mô hình ${modelToTry} thất bại (${err.name || err.message}), chuyển sang mô hình tiếp theo...`);
      }
    }

    if (!rawReply) {
      throw new Error("Không nhận được phản hồi từ các mô hình Google Gemini.");
    }

    // Làm sạch triệt để các câu máy móc về broadcast khuyến mãi nếu xuất hiện
    rawReply = rawReply
      .replace(/Anh\/chị thấy các phương án này thế nào ạ\?[\s\S]*?broadcast[\s\S]*?thân thiết không nào\?[\s\S]*?[🎬✨]*/gi, "")
      .replace(/Có cần em hỗ trợ lên nội dung tin nhắn broadcast[\s\S]*?[🎬✨]*/gi, "")
      .replace(/Anh\/chị thấy các phương án này thế nào ạ\?[\s\S]*?[🎬✨]*/gi, "")
      .trim();

    // 5. Trích xuất phim gợi ý và hành động tương tác từ câu trả lời tự nhiên của Gemini
    const normalizedReply = rawReply.toLowerCase();
    const normalizedMsg = message.toLowerCase();

    // Tìm phim nào trong catalog được người dùng hoặc Gemini nhắc đến
    const matchedMovies = movies.filter(m => {
      const titleLower = m.title.toLowerCase();
      const shortTitle = titleLower.split(":")[0].trim();
      const origLower = (m.originalTitle || "").toLowerCase();

      if (normalizedReply.includes(titleLower) || normalizedReply.includes(shortTitle) ||
        normalizedMsg.includes(titleLower) || normalizedMsg.includes(shortTitle)) {
        return true;
      }

      // Xử lý các cụm tìm kiếm như "đặt phim thám tử lừng danh", "mua vé conan"
      const searchTerms = normalizedMsg
        .replace(/^(đặt vé|đặt phim|mua vé|mua ve|phim|xem phim|tìm vé|tìm phim)\s+/i, "")
        .trim();
      if (searchTerms.length >= 3 && (titleLower.includes(searchTerms) || origLower.includes(searchTerms) || searchTerms.includes(shortTitle))) {
        return true;
      }

      const keywords = searchTerms.split(/\s+/).filter(w => w.length >= 3);
      if (keywords.length >= 2 && keywords.every(kw => titleLower.includes(kw) || origLower.includes(kw))) {
        return true;
      }

      return false;
    });

    const isBookingIntent = normalizedMsg.includes("đặt") || normalizedMsg.includes("dat") || normalizedMsg.includes("mua vé") || normalizedMsg.includes("mua ve") || normalizedMsg.includes("suất chiếu");
    const targetMovie = matchedMovies[0] || null;

    let suggestedAction = null;
    if (targetMovie && isBookingIntent) {
      suggestedAction = { type: "BOOKING_MODAL", movieId: targetMovie.id };
    }

    const isRevenueIntent = normalizedMsg.includes("doanh số") || normalizedMsg.includes("doanh so") ||
      normalizedMsg.includes("doanh thu") || normalizedMsg.includes("báo cáo") ||
      normalizedMsg.includes("bao cao") || normalizedMsg.includes("bán chạy") ||
      normalizedMsg.includes("ban chay") || normalizedMsg.includes("kpi");

    let revenueData = null;
    if (isRevenueIntent) {
      revenueData = {
        totalRevenue: kpi.totalRevenue || 0,
        revenueFormatted: revFormatted,
        totalTickets: totalTickets,
        avgOccupancyRate: occRate,
        topPerformer: salesReport?.topPerformer,
        topMovies
      };
    }

    const movieShowtimes = (targetMovie && Array.isArray(showtimes)) ? showtimes.filter(st => st.movieId === targetMovie.id) : [];

    return {
      intent: isRevenueIntent ? "SALES_REPORT" : (targetMovie && isBookingIntent ? "CHOOSE_SHOWTIME_SEAT" : (targetMovie ? "MOVIE_INQUIRY" : "GEMINI_DIRECT_CHAT")),
      confidence: 0.99,
      model: `Google Gemini 3.5 Flash Lite (${successfulModel})`,
      replyText: rawReply,
      targetMovie: targetMovie,
      suggestedShowtimes: movieShowtimes.slice(0, 4),
      action: isRevenueIntent ? "SHOW_REVENUE_REPORT" : (targetMovie && isBookingIntent ? "SHOW_CHOOSE_SEATS_CARD" : (matchedMovies.length > 0 ? "SHOW_RECOMMENDATION_CARDS" : "NONE")),
      suggestedAction: targetMovie && isBookingIntent ? { type: "BOOKING_MODAL", movieId: targetMovie.id } : null,
      suggestedMovies: matchedMovies.slice(0, 3),
      revenueData,
      suggestedQuestions: isRevenueIntent ? [
        "Đặt vé phim Dune 2 ngay",
        "Dự báo khung giờ cao điểm",
        "Giá vé phòng IMAX và VIP",
        "Các combo bắp nước hôm nay"
      ] : [
        "Báo cáo doanh số rạp hôm nay",
        "Phim nào bán chạy nhất?",
        "Gợi ý phim hot cuối tuần",
        "Giá vé học sinh sinh viên"
      ]
    };
  }
}

module.exports = new GeminiService();
