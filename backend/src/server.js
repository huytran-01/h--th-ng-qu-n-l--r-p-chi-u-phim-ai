const express = require("express");
const cors = require("cors");
const path = require("path");

const { movies, showtimes, defaultSeats, combos, cinemas, rooms, users, bookings } = require("./data/mockData");
const seatLockService = require("./services/seatLockService");
const aiService = require("./services/aiService");
const authService = require("./services/authService");

const app = express();
const PORT = process.env.PORT || 5000;

// Hệ thống phân quyền RBAC (Role-Based Access Control)
const ROLE_PERMISSIONS = {
  CUSTOMER: ["movies.read", "bookings.create", "recommendations.read", "profile.manage"],
  STAFF: ["movies.read", "bookings.create", "bookings.scan", "support.manage"],
  MANAGER: ["movies.read", "movies.manage", "showtimes.manage", "rooms.manage", "analytics.read", "ai.manage"],
  ADMIN: ["movies.read", "movies.manage", "showtimes.manage", "rooms.manage", "analytics.read", "ai.manage", "users.manage", "system.manage"]
};

/**
 * Middleware kiểm tra quyền truy cập:
 * Ưu tiên 1: Lấy Token từ header `Authorization: Bearer <token>`
 * Ưu tiên 2 (Fallback demo): Lấy role từ header `x-demo-role`
 */
function requirePermission(permission) {
  return (req, res, next) => {
    let role = "CUSTOMER";
    let currentUser = null;

    const authHeader = req.header("authorization") || req.header("Authorization");
    if (authHeader) {
      const user = authService.verifyToken(authHeader);
      if (user) {
        role = (user.role || "CUSTOMER").toUpperCase();
        currentUser = user;
      }
    } else if (req.header("x-demo-role")) {
      role = req.header("x-demo-role").toUpperCase();
    }

    if (!ROLE_PERMISSIONS[role] || !ROLE_PERMISSIONS[role].includes(permission)) {
      return res.status(403).json({
        status: "FORBIDDEN",
        message: `Tài khoản với vai trò '${role}' không có quyền '${permission}' để thực hiện hành động này.`
      });
    }

    req.user = currentUser;
    req.userRole = role;
    next();
  };
}

app.use(cors());
app.use(express.json());

// Phục vụ giao diện Frontend tĩnh
app.use(express.static(path.join(__dirname, "../../frontend")));

// ==================== XÁC THỰC & CGV MEMBERSHIP APIs ==================== //

// 1. Đăng ký tài khoản khách hàng mới chuẩn CGV
app.post("/api/v1/auth/register", (req, res) => {
  const result = authService.register(req.body);
  if (!result.success) {
    return res.status(400).json({ status: "ERROR", message: result.message });
  }
  res.status(201).json({ status: "SUCCESS", ...result });
});

// 2. Đăng nhập tài khoản
app.post("/api/v1/auth/login", (req, res) => {
  const { email, password } = req.body;
  const result = authService.login(email, password);
  if (!result.success) {
    return res.status(401).json({ status: "ERROR", message: result.message });
  }
  res.json({ status: "SUCCESS", ...result });
});

// 3. Lấy thông tin user hiện tại qua Token
app.get("/api/v1/auth/me", (req, res) => {
  const authHeader = req.header("authorization") || req.header("Authorization");
  if (!authHeader) {
    return res.status(401).json({ status: "UNAUTHORIZED", message: "Chưa đăng nhập." });
  }
  const user = authService.verifyToken(authHeader);
  if (!user) {
    return res.status(401).json({ status: "UNAUTHORIZED", message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn." });
  }
  res.json({ status: "SUCCESS", data: user });
});

// 4. Đăng xuất
app.post("/api/v1/auth/logout", (req, res) => {
  const authHeader = req.header("authorization") || req.header("Authorization");
  if (authHeader) {
    authService.logout(authHeader);
  }
  res.json({ status: "SUCCESS", message: "Đã đăng xuất thành công." });
});

// 5. Danh sách tài khoản demo tiện ích (Quick Login)
app.get("/api/v1/auth/demo-users", (req, res) => {
  const demoList = users.map(({ id, name, email, role, membership, memberTier, memberCardNumber }) => ({
    id,
    name,
    email,
    role,
    membership,
    memberTier,
    memberCardNumber
  }));
  res.json({ status: "SUCCESS", data: demoList });
});

// ==================== RESTful API KHÁCH HÀNG (CGV EXPERIENCES) ==================== //

// 6. Danh mục phim công khai DÀNH CHO KHÁCH HÀNG (Có Phân Trang, Tìm Kiếm, Lọc Phim Đang Chiếu / Sắp Chiếu)
app.get("/api/v1/movies", (req, res) => {
  const { status, search, genre, page, limit } = req.query;
  let filtered = [...movies];

  // Lọc theo trạng thái: NOW_SHOWING (Đang chiếu) hoặc COMING_SOON (Sắp chiếu)
  if (status && status !== "ALL") {
    filtered = filtered.filter(m => m.status === status);
  }

  // Tìm kiếm theo tên phim hoặc diễn viên, đạo diễn
  if (search) {
    const s = search.toLowerCase().trim();
    filtered = filtered.filter(m =>
      m.title.toLowerCase().includes(s) ||
      (m.originalTitle && m.originalTitle.toLowerCase().includes(s)) ||
      (m.director && m.director.toLowerCase().includes(s)) ||
      (m.cast && m.cast.some(c => c.toLowerCase().includes(s)))
    );
  }

  // Lọc theo thể loại
  if (genre && genre !== "ALL") {
    filtered = filtered.filter(m => m.genres && m.genres.includes(genre));
  }

  // Nếu client truyền page và limit -> Trả về kết quả phân trang dành cho khách hàng
  if (page || limit) {
    const p = Math.max(1, parseInt(page) || 1);
    const l = Math.max(1, parseInt(limit) || 6);
    const total = filtered.length;
    const totalPages = Math.ceil(total / l) || 1;
    const startIndex = (p - 1) * l;
    const paginated = filtered.slice(startIndex, startIndex + l);

    return res.json({
      status: "SUCCESS",
      data: paginated,
      pagination: {
        total,
        page: p,
        limit: l,
        totalPages
      }
    });
  }

  // Fallback nếu không yêu cầu phân trang
  res.json({ status: "SUCCESS", data: filtered });
});

app.get("/api/v1/movies/:id", (req, res) => {
  const movie = movies.find(m => m.id === req.params.id);
  if (!movie) return res.status(404).json({ status: "ERROR", message: "Không tìm thấy phim" });
  res.json({ status: "SUCCESS", data: movie });
});

// 7. Cụm rạp CGV Cinemas
app.get("/api/v1/cinemas", (req, res) => {
  const detailedCinemas = cinemas.map(c => ({
    ...c,
    rooms: rooms.filter(r => r.cinemaId === c.id)
  }));
  res.json({ status: "SUCCESS", data: detailedCinemas });
});

// 8. Suất chiếu & Sơ đồ ghế
app.get("/api/v1/showtimes", (req, res) => {
  const { movieId, roomId, cinemaId } = req.query;
  let result = showtimes;

  if (movieId) {
    result = result.filter(st => st.movieId === movieId);
  }
  if (roomId) {
    result = result.filter(st => st.roomId === roomId);
  }

  const detailed = result.map(st => {
    const room = rooms.find(r => r.id === st.roomId);
    const cinema = room ? cinemas.find(c => c.id === room.cinemaId) : null;
    return {
      ...st,
      movie: movies.find(m => m.id === st.movieId),
      room: room,
      cinema: cinema
    };
  });

  if (cinemaId) {
    const byCinema = detailed.filter(st => st.room && st.room.cinemaId === cinemaId);
    return res.json({ status: "SUCCESS", data: byCinema });
  }

  res.json({ status: "SUCCESS", data: detailed });
});

app.get("/api/v1/showtimes/:id/seats", (req, res) => {
  const showtimeId = req.params.id;
  const userId = req.query.userId || "guest";

  const showtime = showtimes.find(st => st.id === showtimeId);
  if (!showtime) return res.status(404).json({ status: "ERROR", message: "Không tìm thấy suất chiếu" });

  const statuses = seatLockService.getSeatsStatus(showtimeId, userId);

  const seatMatrix = defaultSeats.map(s => {
    const seatStatus = statuses[s.id] ? statuses[s.id].status : "AVAILABLE";
    const remaining = statuses[s.id] ? statuses[s.id].remainingSeconds : 0;
    const finalPrice = Math.round(showtime.price * s.priceRate);

    return {
      ...s,
      status: seatStatus,
      remainingSeconds: remaining,
      price: finalPrice
    };
  });

  const room = rooms.find(r => r.id === showtime.roomId);
  const cinema = room ? cinemas.find(c => c.id === room.cinemaId) : null;

  res.json({
    status: "SUCCESS",
    data: {
      showtime: {
        ...showtime,
        movie: movies.find(m => m.id === showtime.movieId),
        room: room,
        cinema: cinema
      },
      seats: seatMatrix
    }
  });
});

// 9. Khóa ghế thời gian thực (10 phút TTL)
app.post("/api/v1/bookings/lock-seats", (req, res) => {
  const { showtimeId, seatIds, userId } = req.body;
  if (!showtimeId || !seatIds || !seatIds.length) {
    return res.status(400).json({ status: "ERROR", message: "Thiếu thông tin suất chiếu hoặc danh sách ghế" });
  }

  const result = seatLockService.lockSeats(showtimeId, seatIds, userId);
  if (!result.success) {
    return res.status(409).json({ status: "CONFLICT", ...result });
  }

  res.json({ status: "SUCCESS", ...result });
});

// 10. Combos Bắp Nước CGV Concession
app.get("/api/v1/combos", (req, res) => {
  res.json({ status: "SUCCESS", data: combos });
});

// 11. Hồ sơ người dùng & Thẻ thành viên CGV
app.get("/api/v1/users/:id/profile", (req, res) => {
  const user = users.find(item => item.id === req.params.id);
  if (!user) return res.status(404).json({ status: "ERROR", message: "Không tìm thấy tài khoản" });
  const { password: _, ...safeUser } = user;
  res.json({ status: "SUCCESS", data: safeUser });
});

app.put("/api/v1/users/:id/profile", requirePermission("profile.manage"), (req, res) => {
  const user = users.find(item => item.id === req.params.id);
  if (!user) return res.status(404).json({ status: "ERROR", message: "Không tìm thấy tài khoản" });
  const { name, phone, favoriteGenres } = req.body;
  Object.assign(user, {
    name: name || user.name,
    phone: phone || user.phone,
    favoriteGenres: Array.isArray(favoriteGenres) ? favoriteGenres : user.favoriteGenres
  });
  const { password: _, ...safeUser } = user;
  res.json({ status: "SUCCESS", data: safeUser, message: "Đã cập nhật hồ sơ" });
});

// Lịch sử đặt vé khách hàng (Có hỗ trợ phân trang)
app.get("/api/v1/users/:id/bookings", (req, res) => {
  const { page = 1, limit = 5 } = req.query;
  const userBookings = bookings.filter(item => item.userId === req.params.id).map(item => ({
    ...item,
    movie: movies.find(movie => movie.id === item.movieId),
    showtime: showtimes.find(showtime => showtime.id === item.showtimeId)
  }));

  const p = Math.max(1, parseInt(page));
  const l = Math.max(1, parseInt(limit));
  const total = userBookings.length;
  const totalPages = Math.ceil(total / l) || 1;
  const paginated = userBookings.slice((p - 1) * l, (p - 1) * l + l);

  res.json({
    status: "SUCCESS",
    data: paginated,
    pagination: { total, page: p, limit: l, totalPages }
  });
});

// 12. Thanh toán & Phát hành vé điện tử CGV (Tích lũy chi tiêu & thăng hạng CGV VIP)
app.post("/api/v1/payments/checkout", (req, res) => {
  const { showtimeId, seatIds, userId, comboIds, customerInfo } = req.body;

  if (!showtimeId || !Array.isArray(seatIds) || seatIds.length === 0 || !userId) {
    return res.status(400).json({ status: "ERROR", message: "Thiếu thông tin thanh toán hoặc danh sách ghế" });
  }

  const showtime = showtimes.find(st => st.id === showtimeId);
  if (!showtime) {
    return res.status(404).json({ status: "ERROR", message: "Không tìm thấy suất chiếu" });
  }

  const bookingConfirmation = seatLockService.confirmBooking(showtimeId, seatIds, userId);
  if (!bookingConfirmation.success) {
    return res.status(409).json({ status: "CONFLICT", ...bookingConfirmation });
  }

  const movie = movies.find(m => m.id === showtime.movieId);
  const room = rooms.find(r => r.id === showtime.roomId);
  const cinema = room ? cinemas.find(c => c.id === room.cinemaId) : null;

  const bookingCode = `CGV-${Date.now().toString().slice(-6)}`;
  const qrToken = `CGV-TICKET-${bookingCode}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

  const ticketTotal = seatIds.length * showtime.price;

  const newBooking = {
    bookingCode,
    userId,
    movieId: showtime.movieId,
    showtimeId: showtime.id,
    seats: seatIds,
    total: ticketTotal,
    status: "PAID",
    bookedAt: new Date().toISOString()
  };
  bookings.unshift(newBooking);

  // Tích điểm và thăng hạng CGV Membership
  const user = users.find(u => u.id === userId);
  let rankUpgradeNotice = "";
  if (user) {
    const earnedPoints = Math.round(ticketTotal / 1000);
    user.points = (user.points || 0) + earnedPoints;
    user.totalSpent = (user.totalSpent || 0) + ticketTotal;

    // Quy tắc thăng hạng CGV:
    if (user.totalSpent >= 5000000 && user.memberTier !== "VVIP") {
      user.memberTier = "VVIP";
      user.membership = "DIAMOND";
      rankUpgradeNotice = " 🎉 Chúc mừng bạn đã được nâng hạng thành viên CGV VVIP!";
    } else if (user.totalSpent >= 2000000 && user.memberTier === "MEMBER") {
      user.memberTier = "VIP";
      user.membership = "GOLD";
      rankUpgradeNotice = " 🎉 Chúc mừng bạn đã được nâng hạng thành viên CGV VIP!";
    }
  }

  const bookingResult = {
    bookingCode,
    qrToken,
    movieTitle: movie ? movie.title : "Phim chiếu rạp",
    showtimeStart: showtime ? showtime.startTime : "",
    cinemaName: cinema ? cinema.name : "CGV Cinema",
    roomName: room ? room.name : "Phòng chiếu",
    seats: seatIds,
    total: ticketTotal,
    customerName: customerInfo ? customerInfo.name : (user ? user.name : "Khách hàng"),
    customerPhone: customerInfo ? customerInfo.phone : (user ? user.phone : ""),
    paymentStatus: "SUCCESS",
    bookedAt: new Date().toISOString()
  };

  res.json({
    status: "SUCCESS",
    message: `Thanh toán thành công! Vé điện tử CGV đã được phát hành.${rankUpgradeNotice}`,
    data: bookingResult
  });
});

// ==================== TRÍ TUỆ NHÂN TẠO (AI APIS) ==================== //

app.get("/api/v1/ai/recommendations", (req, res) => {
  const userId = req.query.userId || "user_guest";
  const genres = req.query.genres ? String(req.query.genres).split(",").map(item => item.trim()).filter(Boolean) : [];
  const recommendations = aiService.getPersonalizedRecommendations(userId, { genres });
  res.json({ status: "SUCCESS", model: "Hybrid_NCF_PhoBERT_v2.4", agent: "RecommendationAgent", data: recommendations });
});

app.post("/api/v1/ai/chat", (req, res) => {
  const { message, sessionId } = req.body;
  if (!message) return res.status(400).json({ status: "ERROR", message: "Nội dung tin nhắn không được trống" });
  const botResponse = aiService.processChatbotMessage(message, sessionId);
  const suggestedAction = botResponse.action === "SHOW_BOOKING_CARD" && botResponse.extractedEntities?.movie
    ? { type: "BOOKING_MODAL", movieId: botResponse.extractedEntities.movie.id }
    : null;
  res.json({
    status: "SUCCESS",
    ...botResponse,
    reply: botResponse.replyText,
    suggestedAction
  });
});

app.get("/api/v1/ai/demand-forecast", requirePermission("analytics.read"), (req, res) => {
  const dayOfWeek = req.query.dayOfWeek !== undefined ? parseInt(req.query.dayOfWeek) : new Date().getDay();
  const forecast = aiService.getShowtimeDemandForecast(dayOfWeek);
  res.json({ status: "SUCCESS", model: "LightGBM_TimeSeries_v1.8", agent: "AdminAnalyticsAgent", data: forecast });
});

app.post("/api/v1/ai/booking-assist", (req, res) => {
  const { movieTitle, preferences, userId } = req.body;
  if (!movieTitle) {
    return res.status(400).json({ status: "ERROR", message: "Vui lòng cung cấp tên phim muốn đặt vé" });
  }
  const result = aiService.getBookingAssistance(movieTitle, preferences || {}, userId || "guest");
  if (result.error) {
    return res.status(404).json({ status: "ERROR", message: result.error, movie: result.movie });
  }
  res.json({ status: "SUCCESS", agent: "BookingAgent_v1", data: result });
});

app.get("/api/v1/ai/similar-movies/:id", (req, res) => {
  const movieId = req.params.id;
  const limit = parseInt(req.query.limit) || 4;
  const similar = aiService.getSimilarMovies(movieId, limit);
  if (!similar || similar.length === 0) {
    return res.status(404).json({ status: "ERROR", message: "Không tìm thấy phim tương tự" });
  }
  res.json({ status: "SUCCESS", agent: "RecommendationAgent_v2", model: "ContentSimilarity_Embedding_v1", data: similar });
});

app.get("/api/v1/ai/recommendations/explain/:movieId", (req, res) => {
  const userId = req.query.userId || "user_guest";
  const recommendations = aiService.getPersonalizedRecommendations(userId, {}, 6);
  const movie = recommendations.find(item => item.id === req.params.movieId) || movies.find(item => item.id === req.params.movieId);
  if (!movie) return res.status(404).json({ status: "ERROR", message: "Không tìm thấy phim" });
  res.json({
    status: "SUCCESS",
    model: "Hybrid_NCF_PhoBERT_v2.4",
    data: {
      movie,
      factors: [
        { label: "Gu thể loại", value: movie.genres.some(genre => ["Khoa học viễn tưởng", "Hành động", "Tâm lý"].includes(genre)) ? 92 : 58 },
        { label: "Độ thịnh hành", value: movie.trendingScore },
        { label: "Chất lượng IMDb", value: Math.round(movie.imdbRating * 10) }
      ],
      explanation: movie.recommendationReason || "Phim đang được hệ thống đánh giá phù hợp với hồ sơ của bạn."
    }
  });
});

app.get("/api/v1/ai/profile/:userId", (req, res) => {
  const profile = aiService.recommendationAgent.buildUserProfile(req.params.userId);
  res.json({ status: "SUCCESS", model: "Hybrid_NCF_PhoBERT_v2.4", data: profile });
});

app.post("/api/v1/ai/feedback", requirePermission("recommendations.read"), (req, res) => {
  const { userId, movieId, type, rating } = req.body;
  if (!userId || !movieId || !["LIKE", "DISLIKE", "WATCHLIST", "RATING"].includes(type)) {
    return res.status(400).json({ status: "ERROR", message: "Feedback không hợp lệ" });
  }
  res.json({ status: "SUCCESS", data: { userId, movieId, type, rating: rating || null, recordedAt: new Date().toISOString() }, message: "Đã ghi nhận phản hồi để cải thiện gợi ý" });
});

// ==================== SUPPORT & POS APIs ==================== //

app.get("/api/v1/support/booking-status/:code", (req, res) => {
  const bookingCode = req.params.code.toUpperCase();
  const result = aiService.customerServiceAgent.checkBookingStatus(bookingCode);
  const httpStatus = result.found ? 200 : 404;
  res.status(httpStatus).json({ status: result.found ? "SUCCESS" : "NOT_FOUND", agent: "CustomerServiceAgent_v1", data: result });
});

app.post("/api/v1/support/refund", (req, res) => {
  const { bookingCode, reason, customerInfo } = req.body;
  if (!bookingCode) {
    return res.status(400).json({ status: "ERROR", message: "Vui lòng cung cấp mã đặt vé" });
  }
  const result = aiService.customerServiceAgent.handleRefundRequest(bookingCode, reason || "", customerInfo || {});
  const httpStatus = result.success ? 200 : 404;
  res.status(httpStatus).json({ status: result.success ? "SUCCESS" : "ERROR", agent: "CustomerServiceAgent_v1", data: result });
});

// ==================== ADMIN QUẢN TRỊ (CRUD, SEARCH & PAGINATION RIÊNG CHO ADMIN) ==================== //

// 1. Quản lý Phim Admin: Tìm kiếm, Lọc và Phân trang (5 phim/trang)
app.get("/api/v1/admin/movies", requirePermission("movies.read"), (req, res) => {
  const { search, genre, status, page = 1, limit = 5 } = req.query;
  let filtered = [...movies];

  if (status && status !== "ALL") {
    filtered = filtered.filter(m => m.status === status);
  }

  if (search) {
    const s = search.toLowerCase().trim();
    filtered = filtered.filter(m =>
      m.title.toLowerCase().includes(s) ||
      (m.originalTitle && m.originalTitle.toLowerCase().includes(s)) ||
      (m.director && m.director.toLowerCase().includes(s)) ||
      (m.cast && m.cast.some(c => c.toLowerCase().includes(s)))
    );
  }

  if (genre && genre !== "ALL") {
    filtered = filtered.filter(m => m.genres && m.genres.includes(genre));
  }

  const total = filtered.length;
  const p = Math.max(1, parseInt(page));
  const l = Math.max(1, parseInt(limit));
  const totalPages = Math.ceil(total / l) || 1;
  const startIndex = (p - 1) * l;
  const paginated = filtered.slice(startIndex, startIndex + l);

  res.json({
    status: "SUCCESS",
    data: paginated,
    pagination: {
      total,
      page: p,
      limit: l,
      totalPages
    }
  });
});

app.post("/api/v1/admin/movies", requirePermission("movies.manage"), (req, res) => {
  const { title, durationMinutes, imdbRating, genres, formats, director, cast, ageRating, posterUrl, bannerUrl, description, isHot, trendingScore, status } = req.body;
  if (!title) {
    return res.status(400).json({ status: "ERROR", message: "Tên phim không được để trống." });
  }

  const newId = `mov-${String(Date.now()).slice(-4)}`;
  const newMovie = {
    id: newId,
    title: title.trim(),
    originalTitle: req.body.originalTitle || title.trim(),
    status: status || "NOW_SHOWING",
    durationMinutes: Number(durationMinutes) || 120,
    releaseDate: req.body.releaseDate || new Date().toISOString().slice(0, 10),
    ageRating: ageRating || "T13",
    genres: Array.isArray(genres) ? genres : (genres ? String(genres).split(",").map(g => g.trim()) : ["Hành động"]),
    formats: Array.isArray(formats) ? formats : (formats ? String(formats).split(",").map(f => f.trim()) : ["2D", "IMAX"]),
    director: director || "Đang cập nhật",
    cast: Array.isArray(cast) ? cast : (cast ? String(cast).split(",").map(c => c.trim()) : ["Đang cập nhật"]),
    imdbRating: Number(imdbRating) || 7.0,
    posterUrl: posterUrl || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600",
    bannerUrl: bannerUrl || "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200",
    description: description || "Chưa có tóm tắt nội dung.",
    isHot: Boolean(isHot),
    trendingScore: Number(trendingScore) || 80
  };

  movies.unshift(newMovie);
  res.status(201).json({ status: "SUCCESS", data: newMovie, message: `Thêm phim "${newMovie.title}" thành công!` });
});

app.put("/api/v1/admin/movies/:id", requirePermission("movies.manage"), (req, res) => {
  const movie = movies.find(m => m.id === req.params.id);
  if (!movie) return res.status(404).json({ status: "ERROR", message: "Không tìm thấy phim." });

  const { title, durationMinutes, imdbRating, genres, formats, director, cast, ageRating, posterUrl, bannerUrl, description, isHot, trendingScore, originalTitle, status } = req.body;

  if (title) movie.title = title.trim();
  if (originalTitle !== undefined) movie.originalTitle = originalTitle;
  if (status !== undefined) movie.status = status;
  if (durationMinutes) movie.durationMinutes = Number(durationMinutes);
  if (imdbRating !== undefined) movie.imdbRating = Number(imdbRating);
  if (genres) movie.genres = Array.isArray(genres) ? genres : String(genres).split(",").map(g => g.trim());
  if (formats) movie.formats = Array.isArray(formats) ? formats : String(formats).split(",").map(f => f.trim());
  if (director !== undefined) movie.director = director;
  if (cast) movie.cast = Array.isArray(cast) ? cast : String(cast).split(",").map(c => c.trim());
  if (ageRating) movie.ageRating = ageRating;
  if (posterUrl) movie.posterUrl = posterUrl;
  if (bannerUrl) movie.bannerUrl = bannerUrl;
  if (description !== undefined) movie.description = description;
  if (isHot !== undefined) movie.isHot = Boolean(isHot);
  if (trendingScore !== undefined) movie.trendingScore = Number(trendingScore);

  res.json({ status: "SUCCESS", data: movie, message: `Đã cập nhật phim "${movie.title}"!` });
});

app.patch("/api/v1/admin/movies/:id", requirePermission("movies.manage"), (req, res) => {
  const movie = movies.find(m => m.id === req.params.id);
  if (!movie) return res.status(404).json({ status: "ERROR", message: "Không tìm thấy phim." });
  Object.assign(movie, req.body);
  res.json({ status: "SUCCESS", data: movie, message: "Đã cập nhật trạng thái phim." });
});

app.delete("/api/v1/admin/movies/:id", requirePermission("movies.manage"), (req, res) => {
  const index = movies.findIndex(m => m.id === req.params.id);
  if (index === -1) return res.status(404).json({ status: "ERROR", message: "Không tìm thấy phim." });

  const deletedMovie = movies.splice(index, 1)[0];
  const removedShowtimesCount = showtimes.filter(st => st.movieId === deletedMovie.id).length;
  for (let i = showtimes.length - 1; i >= 0; i--) {
    if (showtimes[i].movieId === deletedMovie.id) {
      showtimes.splice(i, 1);
    }
  }

  res.json({
    status: "SUCCESS",
    message: `Đã xóa phim "${deletedMovie.title}" cùng ${removedShowtimesCount} suất chiếu liên quan.`
  });
});

// 2. Quản lý Suất chiếu Admin: Tìm kiếm, Lọc và Phân trang (5 suất/trang)
app.get("/api/v1/admin/showtimes", requirePermission("showtimes.manage"), (req, res) => {
  const { search, movieId, roomId, page = 1, limit = 5 } = req.query;

  let detailed = showtimes.map(st => {
    const room = rooms.find(r => r.id === st.roomId);
    const cinema = room ? cinemas.find(c => c.id === room.cinemaId) : null;
    return {
      ...st,
      movie: movies.find(m => m.id === st.movieId),
      room: room,
      cinema: cinema
    };
  });

  if (search) {
    const s = search.toLowerCase().trim();
    detailed = detailed.filter(st =>
      (st.movie && st.movie.title.toLowerCase().includes(s)) ||
      (st.room && st.room.name.toLowerCase().includes(s)) ||
      (st.cinema && st.cinema.name.toLowerCase().includes(s)) ||
      st.id.toLowerCase().includes(s)
    );
  }

  if (movieId) {
    detailed = detailed.filter(st => st.movieId === movieId);
  }

  if (roomId) {
    detailed = detailed.filter(st => st.roomId === roomId);
  }

  const total = detailed.length;
  const p = Math.max(1, parseInt(page));
  const l = Math.max(1, parseInt(limit));
  const totalPages = Math.ceil(total / l) || 1;
  const startIndex = (p - 1) * l;
  const paginated = detailed.slice(startIndex, startIndex + l);

  res.json({
    status: "SUCCESS",
    data: paginated,
    pagination: {
      total,
      page: p,
      limit: l,
      totalPages
    }
  });
});

app.post("/api/v1/admin/showtimes", requirePermission("showtimes.manage"), (req, res) => {
  const { movieId, roomId, startTime, endTime, price } = req.body;
  if (!movieId || !roomId || !startTime) {
    return res.status(400).json({ status: "ERROR", message: "Vui lòng cung cấp đầy đủ thông tin phim, phòng và thời gian." });
  }

  const movieExists = movies.some(m => m.id === movieId);
  const roomExists = rooms.some(r => r.id === roomId);
  if (!movieExists || !roomExists) {
    return res.status(400).json({ status: "ERROR", message: "Phim hoặc phòng chiếu không tồn tại trong hệ thống." });
  }

  const newShowtime = {
    id: `st-${Date.now().toString().slice(-5)}`,
    movieId,
    roomId,
    startTime,
    endTime: endTime || startTime,
    price: Number(price) || 110000
  };

  showtimes.unshift(newShowtime);
  res.status(201).json({ status: "SUCCESS", data: newShowtime, message: "Đã tạo suất chiếu mới thành công!" });
});

app.put("/api/v1/admin/showtimes/:id", requirePermission("showtimes.manage"), (req, res) => {
  const showtime = showtimes.find(st => st.id === req.params.id);
  if (!showtime) return res.status(404).json({ status: "ERROR", message: "Không tìm thấy suất chiếu." });

  const { movieId, roomId, startTime, endTime, price } = req.body;
  if (movieId) {
    if (!movies.some(m => m.id === movieId)) return res.status(400).json({ status: "ERROR", message: "Phim không tồn tại." });
    showtime.movieId = movieId;
  }
  if (roomId) {
    if (!rooms.some(r => r.id === roomId)) return res.status(400).json({ status: "ERROR", message: "Phòng không tồn tại." });
    showtime.roomId = roomId;
  }
  if (startTime) showtime.startTime = startTime;
  if (endTime) showtime.endTime = endTime;
  if (price !== undefined) showtime.price = Number(price);

  res.json({ status: "SUCCESS", data: showtime, message: "Đã cập nhật suất chiếu thành công!" });
});

app.delete("/api/v1/admin/showtimes/:id", requirePermission("showtimes.manage"), (req, res) => {
  const index = showtimes.findIndex(st => st.id === req.params.id);
  if (index === -1) return res.status(404).json({ status: "ERROR", message: "Không tìm thấy suất chiếu." });

  const deleted = showtimes.splice(index, 1)[0];
  res.json({ status: "SUCCESS", message: `Đã xóa suất chiếu ${deleted.id}.` });
});

// 3. Quản lý Người dùng & RBAC Admin: Phân trang (5 user/trang)
app.get("/api/v1/admin/users", requirePermission("users.manage"), (req, res) => {
  const { search, role, page = 1, limit = 5 } = req.query;
  let filtered = [...users];

  if (search) {
    const s = search.toLowerCase().trim();
    filtered = filtered.filter(u =>
      u.name.toLowerCase().includes(s) ||
      u.email.toLowerCase().includes(s) ||
      (u.phone && u.phone.includes(s)) ||
      u.id.toLowerCase().includes(s) ||
      (u.memberCardNumber && u.memberCardNumber.includes(s))
    );
  }

  if (role && role !== "ALL") {
    filtered = filtered.filter(u => u.role === role);
  }

  const total = filtered.length;
  const p = Math.max(1, parseInt(page));
  const l = Math.max(1, parseInt(limit));
  const totalPages = Math.ceil(total / l) || 1;
  const startIndex = (p - 1) * l;
  const paginated = filtered.slice(startIndex, startIndex + l).map(({ password: _, ...safeUser }) => safeUser);

  res.json({
    status: "SUCCESS",
    data: paginated,
    pagination: {
      total,
      page: p,
      limit: l,
      totalPages
    }
  });
});

app.post("/api/v1/admin/users", requirePermission("users.manage"), (req, res) => {
  const { name, email, password, phone, role, membership } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ status: "ERROR", message: "Vui lòng nhập tên, email và mật khẩu." });
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (users.some(u => u.email.toLowerCase() === normalizedEmail)) {
    return res.status(400).json({ status: "ERROR", message: "Email này đã tồn tại." });
  }

  const newUser = {
    id: `user_${Date.now().toString().slice(-6)}`,
    name: name.trim(),
    email: normalizedEmail,
    password: password,
    phone: phone ? phone.trim() : "",
    role: (role || "CUSTOMER").toUpperCase(),
    memberCardNumber: `9999-${Math.floor(1000 + Math.random()*9000)}-${Math.floor(1000 + Math.random()*9000)}-${Math.floor(1000 + Math.random()*9000)}`,
    memberTier: "MEMBER",
    membership: membership || "STANDARD",
    points: 0,
    totalSpent: 0,
    favoriteGenres: [],
    status: "ACTIVE",
    createdAt: new Date().toISOString()
  };

  users.unshift(newUser);
  const { password: _, ...safeUser } = newUser;
  res.status(201).json({ status: "SUCCESS", data: safeUser, message: `Tạo tài khoản cho ${newUser.name} thành công!` });
});

app.put("/api/v1/admin/users/:id", requirePermission("users.manage"), (req, res) => {
  const user = users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ status: "ERROR", message: "Không tìm thấy người dùng." });

  const { name, phone, role, status, membership, points, password, memberTier } = req.body;
  if (name) user.name = name.trim();
  if (phone !== undefined) user.phone = phone.trim();
  if (role && ROLE_PERMISSIONS[role.toUpperCase()]) user.role = role.toUpperCase();
  if (status) user.status = status;
  if (membership) user.membership = membership;
  if (memberTier) user.memberTier = memberTier;
  if (points !== undefined) user.points = Number(points);
  if (password) user.password = password;

  const { password: _, ...safeUser } = user;
  res.json({ status: "SUCCESS", data: safeUser, message: `Đã cập nhật tài khoản ${user.name}.` });
});

app.patch("/api/v1/admin/users/:id/role", requirePermission("users.manage"), (req, res) => {
  const user = users.find(item => item.id === req.params.id);
  const role = String(req.body.role || "").toUpperCase();
  if (!user || !ROLE_PERMISSIONS[role]) return res.status(400).json({ status: "ERROR", message: "Tài khoản hoặc vai trò không hợp lệ." });
  user.role = role;
  const { password: _, ...safeUser } = user;
  res.json({ status: "SUCCESS", data: safeUser, message: `Đã cập nhật quyền thành "${role}"` });
});

app.delete("/api/v1/admin/users/:id", requirePermission("users.manage"), (req, res) => {
  if (req.params.id === "admin_001") {
    return res.status(400).json({ status: "ERROR", message: "Không thể xóa tài khoản Quản trị viên gốc của hệ thống!" });
  }

  const index = users.findIndex(u => u.id === req.params.id);
  if (index === -1) return res.status(404).json({ status: "ERROR", message: "Không tìm thấy tài khoản." });

  const deleted = users.splice(index, 1)[0];
  res.json({ status: "SUCCESS", message: `Đã xóa tài khoản "${deleted.name}".` });
});

// 4. Admin Analytics & Báo cáo
app.get("/api/v1/admin/daily-report", requirePermission("analytics.read"), (req, res) => {
  const date = req.query.date ? new Date(req.query.date) : new Date();
  const report = aiService.getDailyReport(date);
  res.json({ status: "SUCCESS", agent: "AdminAnalyticsAgent_v1", data: report });
});

app.get("/api/v1/admin/optimal-schedule", requirePermission("ai.manage"), (req, res) => {
  const schedule = aiService.getOptimalSchedule();
  res.json({ status: "SUCCESS", agent: "AdminAnalyticsAgent_v1", data: schedule });
});

app.get("/api/v1/admin/revenue-analysis", requirePermission("analytics.read"), (req, res) => {
  const movieId = req.query.movieId || null;
  const analysis = aiService.getRevenueAnalysis(movieId);
  res.json({ status: "SUCCESS", agent: "AdminAnalyticsAgent_v1", data: analysis });
});

app.get("/api/v1/admin/ai-health", requirePermission("ai.manage"), (req, res) => {
  res.json({
    status: "SUCCESS",
    data: {
      models: [
        { name: "Hybrid Recommendation", version: "v2.4", metric: "NDCG@10", score: 0.27, target: 0.2, status: "HEALTHY" },
        { name: "Intent Recognition", version: "v1.6", metric: "Accuracy", score: 0.94, target: 0.9, status: "HEALTHY" },
        { name: "Demand Forecasting", version: "v1.8", metric: "MAPE", score: 0.094, target: 0.12, status: "HEALTHY" }
      ],
      lastRetrained: "2026-09-01T02:00:00.000Z",
      nextRetrain: "2026-09-08T02:00:00.000Z"
    }
  });
});

// Khởi chạy server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` 🎬 CGV Cultureplex Cinema Management — Port ${PORT}`);
  console.log(`    http://localhost:${PORT}`);
  console.log(` 🎟️ Thanh Đặt Vé Nhanh & Phân Trang Khách Hàng / Admin`);
  console.log(` 👑 Thẻ Thành Viên CGV Membership & Phân Quyền RBAC`);
  console.log(`====================================================`);
});
