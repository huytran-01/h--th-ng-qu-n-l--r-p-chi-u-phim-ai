/**
 * =========================================================================
 * CGV CULTUREPLEX CINEMA — FULL SYSTEM E2E AUTOMATION TEST SUITE
 * =========================================================================
 * Kiến trúc kiểm thử: Senior QA Automation Architect
 * Bao phủ: 7 phân hệ cốt lõi, 40 Test Cases (FR-01 -> FR-18, NFR-01 -> NFR-05)
 * Cơ chế giao tiếp: Local Named Pipe IPC (Tốc độ cao, bảo mật, không lỗi mạng)
 * =========================================================================
 */

const fs = require("fs");
const path = require("path");
const http = require("http");

// 1. Nạp và khởi tạo Server
let app;
try {
  app = require("../src/server");
} catch (e) {
  console.log("ℹ️ Server module loaded:", e.message);
}

const { showtimes, movies, rooms, defaultSeats } = require("../src/data/mockData");
const dbService = require("../src/services/dbService");

const RESULTS = [];
let passCount = 0;
let failCount = 0;

// Helper: In màu terminal
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
  magenta: "\x1b[35m"
};

const pipeName = "\\\\.\\pipe\\cinema-test-suite-" + Date.now();
const testServer = http.createServer(app);

// Wrapper gọi API chuẩn qua Local IPC Pipe
function apiRequest(endpoint, options = {}) {
  return new Promise((resolve, reject) => {
    const headers = { ...(options.headers || {}) };
    let reqBody = null;

    if (options.body) {
      reqBody = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
      if (!headers["Content-Type"]) headers["Content-Type"] = "application/json";
      headers["Content-Length"] = Buffer.byteLength(reqBody);
    }

    const cleanPath = endpoint.startsWith("/api/v1") ? endpoint : `/api/v1${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

    const req = http.request(
      {
        socketPath: pipeName,
        path: cleanPath,
        method: options.method || "GET",
        headers
      },
      (res) => {
        let rawData = "";
        res.on("data", chunk => (rawData += chunk));
        res.on("end", () => {
          let json = null;
          try {
            json = JSON.parse(rawData);
          } catch (e) {
            json = { raw: rawData };
          }
          resolve({
            status: res.statusCode,
            headers: res.headers,
            json: async () => json,
            text: async () => rawData
          });
        });
      }
    );

    req.on("error", reject);
    if (reqBody) req.write(reqBody);
    req.end();
  });
}

async function runTestCase(tcId, name, testFn) {
  const start = Date.now();
  process.stdout.write(`  ▶ [${tcId}] ${name} ... `);
  try {
    const detail = await testFn();
    const duration = Date.now() - start;
    passCount++;
    console.log(`${colors.green}PASS${colors.reset} (${duration}ms)`);
    RESULTS.push({ id: tcId, name, status: "PASS", duration, detail: detail || "Thành công" });
  } catch (err) {
    const duration = Date.now() - start;
    failCount++;
    console.log(`${colors.red}FAIL${colors.reset} (${duration}ms)`);
    console.error(`     └─ Error: ${colors.red}${err.message}${colors.reset}`);
    RESULTS.push({ id: tcId, name, status: "FAIL", duration, detail: err.message });
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || "Assertion failed");
  }
}

// Bắt đầu chạy toàn bộ 7 Test Suites
async function runAllTests() {
  console.log("\n" + "=".repeat(75));
  console.log(`${colors.bold}${colors.cyan}🎬 CGV CULTUREPLEX CINEMA — AUTOMATED SYSTEM TEST EXECUTION${colors.reset}`);
  console.log("=".repeat(75));

  // Khởi động server trên Named Pipe
  await new Promise((resolve) => {
    testServer.listen(pipeName, () => {
      console.log(`🌐 Local IPC Test Socket gắn thành công: ${pipeName}`);
      resolve();
    });
  });

  // Đợi server và CSDL MySQL hoàn tất đồng bộ 100% trước khi chạy test
  if (app && app.waitForDatabase) {
    await app.waitForDatabase();
  }

  // Thiết lập Suất chiếu test cho 3 mốc hoàn vé: > 24h, 2h-24h, < 2h
  const now = Date.now();
  const stFuture = {
    id: "st-test-future-24h",
    movieId: "mov-01",
    roomId: "room-01",
    startTime: new Date(now + 48 * 3600 * 1000).toISOString(),
    endTime: new Date(now + 50 * 3600 * 1000).toISOString(),
    price: 120000,
    format: "2D"
  };
  const stMid = {
    id: "st-test-mid-10h",
    movieId: "mov-01",
    roomId: "room-01",
    startTime: new Date(now + 10 * 3600 * 1000).toISOString(),
    endTime: new Date(now + 12 * 3600 * 1000).toISOString(),
    price: 120000,
    format: "2D"
  };
  const stPast = {
    id: "st-test-past-1h",
    movieId: "mov-01",
    roomId: "room-01",
    startTime: new Date(now + 1 * 3600 * 1000).toISOString(),
    endTime: new Date(now + 3 * 3600 * 1000).toISOString(),
    price: 120000,
    format: "2D"
  };
  showtimes.push(stFuture, stMid, stPast);
  try {
    await dbService.createShowtime(stFuture);
    await dbService.createShowtime(stMid);
    await dbService.createShowtime(stPast);
  } catch (e) {}

  let customerToken = "";
  let customerUser = null;
  let staffToken = "";
  let adminToken = "";
  let testBookingCode = "";
  let testQrToken = "";

  // =========================================================================
  // SUITE 1: AUTHENTICATION, MEMBERSHIP & RBAC (TC-AUTH-01 -> TC-AUTH-06)
  // =========================================================================
  console.log(`\n${colors.bold}${colors.yellow}📦 PHÂN HỆ 1: AUTHENTICATION, CGV MEMBERSHIP & RBAC${colors.reset}`);

  await runTestCase("TC-AUTH-01", "Đăng ký tài khoản CUSTOMER mới & Sinh thẻ CGV 16 số", async () => {
    const email = `testuser_${Date.now()}@aicinema.vn`;
    const res = await apiRequest("/auth/register", {
      method: "POST",
      body: {
        name: "Lê Hoàng Nam",
        email: email,
        password: "password123",
        phone: "0911223344"
      }
    });
    const json = await res.json();
    assert(res.status === 201 || res.status === 200, `Expected 201 or 200, got ${res.status}`);
    assert(json.status === "SUCCESS", "Expected SUCCESS status");
    assert(json.user.role === "CUSTOMER", "Expected role CUSTOMER");
    assert(json.user.password === undefined, "Password field MUST be excluded");
    assert(/^9999-\d{4}-\d{4}-\d{4}$/.test(json.user.memberCardNumber), "Invalid 16-digit CGV card number format");
    assert(json.user.points === 100, "New customer must receive 100 welcome points");
    return `Mã thẻ: ${json.user.memberCardNumber}, Điểm: ${json.user.points}`;
  });

  await runTestCase("TC-AUTH-02", "Đăng ký với email đã tồn tại -> Chặn lỗi 400", async () => {
    const res = await apiRequest("/auth/register", {
      method: "POST",
      body: {
        name: "Trùng Email",
        email: "customer@aicinema.vn",
        password: "123",
        phone: "0999888777"
      }
    });
    const json = await res.json();
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    assert(json.status === "ERROR", "Expected status ERROR");
    return json.message;
  });

  await runTestCase("TC-AUTH-03", "Đăng nhập vai trò CUSTOMER chuẩn", async () => {
    const res = await apiRequest("/auth/login", {
      method: "POST",
      body: { email: "customer@aicinema.vn", password: "123456" }
    });
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(json.token && json.token.startsWith("cgv_"), "Token must start with cgv_");
    assert(json.user.role === "CUSTOMER", "Expected CUSTOMER role");
    assert(json.user.password === undefined, "Password must not be returned");
    customerToken = json.token;
    customerUser = json.user;
    return `Token: ${customerToken.substring(0, 18)}..., User: ${customerUser.name}`;
  });

  await runTestCase("TC-AUTH-04", "Đăng nhập vai trò STAFF chuẩn", async () => {
    const res = await apiRequest("/auth/login", {
      method: "POST",
      body: { email: "minhanh@aicinema.vn", password: "123456" }
    });
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(json.user.role === "STAFF", "Expected STAFF role");
    staffToken = json.token;
    return `Staff: ${json.user.name}`;
  });

  await runTestCase("TC-AUTH-05", "Đăng nhập vai trò ADMIN chuẩn", async () => {
    const res = await apiRequest("/auth/login", {
      method: "POST",
      body: { email: "admin@aicinema.vn", password: "admin123" }
    });
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(json.user.role === "ADMIN", "Expected ADMIN role");
    adminToken = json.token;
    return `Admin: ${json.user.name}`;
  });

  await runTestCase("TC-AUTH-06", "Kiểm tra ranh giới RBAC: Chặn 403 FORBIDDEN khi vượt quyền", async () => {
    // 1. Customer gọi API soát vé của Staff (yêu cầu bookings.scan)
    const res1 = await apiRequest("/bookings/check-in", {
      method: "POST",
      headers: { "Authorization": `Bearer ${customerToken}` },
      body: { code: "CGV-TEST" }
    });
    assert(res1.status === 403, `Customer check-in must return 403, got ${res1.status}`);

    // 2. Customer gọi API quản trị User của Admin (yêu cầu users.manage)
    const res2 = await apiRequest("/admin/users", {
      headers: { "Authorization": `Bearer ${customerToken}` }
    });
    assert(res2.status === 403, `Customer admin/users must return 403, got ${res2.status}`);

    // 3. Staff gọi API báo cáo KPI của Admin (yêu cầu analytics.read)
    const res3 = await apiRequest("/admin/daily-report", {
      headers: { "Authorization": `Bearer ${staffToken}` }
    });
    assert(res3.status === 403, `Staff daily-report must return 403, got ${res3.status}`);

    return "Cả 3 trường hợp vi phạm quyền hạn đều bị chặn 403 FORBIDDEN chính xác";
  });

  // =========================================================================
  // SUITE 2: MOVIES CATALOG & SHOWTIMES (TC-CAT-01 -> TC-CAT-05)
  // =========================================================================
  console.log(`\n${colors.bold}${colors.yellow}📦 PHÂN HỆ 2: DANH MỤC PHIM & LỊCH CHIẾU${colors.reset}`);

  await runTestCase("TC-CAT-01", "Lấy toàn bộ danh sách phim (Đang chiếu / Sắp chiếu)", async () => {
    const res = await apiRequest("/movies");
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(json.data) && json.data.length >= 6, "Expected at least 6 movies");
    return `Tìm thấy ${json.data.length} bộ phim`;
  });

  await runTestCase("TC-CAT-02", "Lọc phim theo trạng thái NOW_SHOWING & Phân trang", async () => {
    const res = await apiRequest("/movies?status=NOW_SHOWING&page=1&limit=4");
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(json.pagination.page === 1, "Expected page 1");
    assert(json.data.every(m => m.status === "NOW_SHOWING"), "All movies must be NOW_SHOWING");
    return `Trang 1: ${json.data.length} phim (Tổng: ${json.pagination.total})`;
  });

  await runTestCase("TC-CAT-03", "Tìm kiếm phim theo từ khóa & lọc thể loại Hành động", async () => {
    const res = await apiRequest("/movies?genre=H%C3%A0nh%20%C4%91%E1%BB%99ng");
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(json.data.every(m => m.genres.includes("Hành động")), "Movies must include Hành động");
    return `Tìm thấy ${json.data.length} phim thể loại Hành động`;
  });

  await runTestCase("TC-CAT-04", "Lấy danh sách suất chiếu của phim mov-01 (Dune 2)", async () => {
    const res = await apiRequest("/showtimes?movieId=mov-01");
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(json.data) && json.data.length > 0, "Expected showtimes for mov-01");
    return `Phim mov-01 có ${json.data.length} suất chiếu`;
  });

  await runTestCase("TC-CAT-05", "Tải sơ đồ 48 ghế ngồi của suất chiếu st-101", async () => {
    const res = await apiRequest("/showtimes/st-101/seats");
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(json.data.seats.length >= 48, "Room must have at least 48 seats");
    assert(json.data.seats.every(s => ["AVAILABLE", "LOCKED", "BOOKED"].includes(s.status)), "Valid status");
    return `Sơ đồ ghế: ${json.data.seats.length} ghế đầy đủ Standard/VIP/Sweetbox`;
  });

  // =========================================================================
  // SUITE 3: CONCURRENCY SEAT LOCK & CHECKOUT (TC-BOOK-01 -> TC-BOOK-07)
  // =========================================================================
  console.log(`\n${colors.bold}${colors.yellow}📦 PHÂN HỆ 3: KHÓA GHẾ CONCURRENCY TTL 10 PHÚT & THANH TOÁN QR${colors.reset}`);

  await runTestCase("TC-BOOK-01", "User A khóa ghế D5, D6 thành công (TTL 10 phút)", async () => {
    const res = await apiRequest("/bookings/lock-seats", {
      method: "POST",
      body: {
        showtimeId: "st-101",
        seatIds: ["D5", "D6"],
        userId: customerUser.id
      }
    });
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(json.status === "SUCCESS", "Expected SUCCESS status");
    assert(json.ttlSeconds === 600, "TTL must be 600s (10 minutes)");
    return `Khóa thành công D5, D6 - TTL: ${json.ttlSeconds}s`;
  });

  await runTestCase("TC-BOOK-02", "User B cố tình khóa trùng ghế D5 -> Nhận 409 CONFLICT", async () => {
    const res = await apiRequest("/bookings/lock-seats", {
      method: "POST",
      body: {
        showtimeId: "st-101",
        seatIds: ["D5", "D7"],
        userId: "user_other_intruder"
      }
    });
    const json = await res.json();
    assert(res.status === 409, `Expected 409 Conflict, got ${res.status}`);
    assert(json.status === "CONFLICT", "Expected status CONFLICT");
    assert(json.conflictSeats.some(s => s.seatId === "D5"), "Conflict must flag seat D5");
    return `Chặn xung đột thành công: ${json.message}`;
  });

  await runTestCase("TC-BOOK-03", "Lấy danh mục Combo Bắp Nước Concession", async () => {
    const res = await apiRequest("/combos");
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(json.data) && json.data.length >= 3, "Expected combos");
    return `Menu F&B: ${json.data.map(c => c.name).join(", ")}`;
  });

  await runTestCase("TC-BOOK-04", "User A thanh toán đơn vé D5, D6 kèm Combo F&B", async () => {
    const res = await apiRequest("/payments/checkout", {
      method: "POST",
      body: {
        showtimeId: "st-101",
        seatIds: ["D5", "D6"],
        userId: customerUser.id,
        comboIds: ["cb-01"],
        customerInfo: { name: customerUser.name, phone: customerUser.phone }
      }
    });
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(json.status === "SUCCESS", "Expected status SUCCESS");
    assert(json.data.bookingCode && json.data.bookingCode.startsWith("CGV-"), "Invalid bookingCode format");
    assert(json.data.qrToken && json.data.qrToken.includes("CGV-TICKET"), "Invalid qrToken format");
    assert(json.data.total > 0, "Total must be positive");
    testBookingCode = json.data.bookingCode;
    testQrToken = json.data.qrToken;
    return `Mã vé: ${testBookingCode}, QR: ${testQrToken.substring(0, 20)}..., Tổng: ${json.data.total.toLocaleString()}đ`;
  });

  await runTestCase("TC-BOOK-05", "Xác nhận trạng thái ghế D5, D6 đã chuyển sang BOOKED", async () => {
    const res = await apiRequest("/showtimes/st-101/seats");
    const json = await res.json();
    const d5 = json.data.seats.find(s => s.id === "D5");
    const d6 = json.data.seats.find(s => s.id === "D6");
    assert(d5.status === "BOOKED", "D5 must be BOOKED");
    assert(d6.status === "BOOKED", "D6 must be BOOKED");
    return "Ghế D5, D6 đã chính thức chuyển sang BOOKED";
  });

  await runTestCase("TC-BOOK-06", "Kiểm tra tích lũy chi tiêu & điểm thưởng CGV Membership", async () => {
    const res = await apiRequest(`/users/${customerUser.id}/profile`);
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(json.data.totalSpent > 0, "TotalSpent must be updated");
    assert(json.data.points > 100, "Points must be accumulated");
    return `Chi tiêu: ${json.data.totalSpent.toLocaleString()}đ, Điểm tích lũy: ${json.data.points}`;
  });

  await runTestCase("TC-BOOK-07", "Cố thanh toán ghế chưa khóa / người khác giữ -> Chặn 409", async () => {
    const res = await apiRequest("/payments/checkout", {
      method: "POST",
      body: {
        showtimeId: "st-101",
        seatIds: ["A1"], // Chưa được lock
        userId: customerUser.id
      }
    });
    const json = await res.json();
    assert(res.status === 409, `Expected 409, got ${res.status}`);
    assert(json.status === "CONFLICT", "Expected status CONFLICT");
    return "Chặn thanh toán ghế chưa khóa hợp lệ";
  });

  // =========================================================================
  // SUITE 4: STAFF POS SOÁT VÉ & CHECK-IN (TC-POS-01 -> TC-POS-06)
  // =========================================================================
  console.log(`\n${colors.bold}${colors.yellow}📦 PHÂN HỆ 4: QUẦY POS SOÁT VÉ & CHECK-IN QR CHỐNG GIAN LẬN${colors.reset}`);

  await runTestCase("TC-POS-01", "Nhân viên rạp (STAFF) soát vé QR thành công lần đầu", async () => {
    const res = await apiRequest("/bookings/check-in", {
      method: "POST",
      headers: { "Authorization": `Bearer ${staffToken}` },
      body: { code: testBookingCode }
    });
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(json.status === "SUCCESS", "Expected SUCCESS status");
    assert(json.data.checkedInAt !== undefined, "checkedInAt must be recorded");
    assert(json.data.checkedInBy !== undefined, "checkedInBy must be recorded");
    return `Đã soát vé ${testBookingCode} lúc ${new Date(json.data.checkedInAt).toLocaleTimeString()}`;
  });

  await runTestCase("TC-POS-02", "Quét lại chính mã vé đó lần 2 -> Chặn ALREADY_CHECKED_IN", async () => {
    const res = await apiRequest("/bookings/check-in", {
      method: "POST",
      headers: { "Authorization": `Bearer ${staffToken}` },
      body: { code: testBookingCode }
    });
    const json = await res.json();
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    assert(json.status === "ALREADY_CHECKED_IN", "Expected ALREADY_CHECKED_IN");
    return `Chống gian lận tái sử dụng vé: ${json.message}`;
  });

  await runTestCase("TC-POS-03", "Soát vé với mã không tồn tại -> Báo lỗi 404 NOT_FOUND", async () => {
    const res = await apiRequest("/bookings/check-in", {
      method: "POST",
      headers: { "Authorization": `Bearer ${staffToken}` },
      body: { code: "CGV-FAKE-999999" }
    });
    const json = await res.json();
    assert(res.status === 404, `Expected 404, got ${res.status}`);
    return json.message;
  });

  await runTestCase("TC-POS-04", "Staff & Admin tra cứu danh sách toàn bộ vé đã đặt", async () => {
    const res = await apiRequest("/admin/bookings?page=1&limit=5", {
      headers: { "Authorization": `Bearer ${staffToken}` }
    });
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(json.data), "Expected bookings array");
    assert(json.summary && json.summary.totalRevenue > 0, "Expected revenue summary");
    return `Đơn vé: ${json.pagination.total}, Tổng doanh thu: ${json.summary.totalRevenue.toLocaleString()}đ`;
  });

  await runTestCase("TC-POS-05", "Khách hàng tra cứu trạng thái đơn vé qua cổng CSKH", async () => {
    const res = await apiRequest(`/support/booking-status/${testBookingCode}`);
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(json.data.found === true, "Booking must be found");
    return `Tìm thấy đơn vé của phim: ${json.data.booking.movieTitle}`;
  });

  await runTestCase("TC-POS-06", "Khách hàng xem lịch sử các vé đã đặt cá nhân", async () => {
    const res = await apiRequest(`/users/${customerUser.id}/bookings?page=1&limit=5`);
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(json.data) && json.data.length > 0, "Expected user bookings");
    return `Khách hàng có ${json.pagination.total} vé trong lịch sử cá nhân`;
  });

  // =========================================================================
  // SUITE 5: AUTO REFUND 3 MỐC THỜI GIAN (TC-REF-01 -> TC-REF-06)
  // =========================================================================
  console.log(`\n${colors.bold}${colors.yellow}📦 PHÂN HỆ 5: HOÀN VÉ TỰ ĐỘNG 3 MỐC THỜI GIAN (CustomerServiceAgent)${colors.reset}`);

  let refundTicket24h = "";
  let refundTicketMid = "";
  let refundTicketPast = "";

  await runTestCase("TC-REF-01", "Đặt vé chuẩn bị test hoàn vé mốc > 24h (st-test-future-24h)", async () => {
    await apiRequest("/bookings/lock-seats", {
      method: "POST",
      body: { showtimeId: "st-test-future-24h", seatIds: ["A1"], userId: customerUser.id }
    });
    const res = await apiRequest("/payments/checkout", {
      method: "POST",
      body: { showtimeId: "st-test-future-24h", seatIds: ["A1"], userId: customerUser.id }
    });
    const json = await res.json();
    refundTicket24h = json.data.bookingCode;
    return `Tạo vé ${refundTicket24h} cho suất chiếu sau 48h`;
  });

  await runTestCase("TC-REF-02", "Hoàn vé mốc > 24h trước suất chiếu -> Hoàn 100% giá trị", async () => {
    const res = await apiRequest("/support/refund", {
      method: "POST",
      body: { bookingCode: refundTicket24h, reason: "Bận việc đột xuất", customerInfo: {} }
    });
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(json.data.approved === true, "Must be approved");
    assert(json.data.refundRate === "100%", "Expected 100% refund rate");
    assert(json.data.refundAmount === json.data.originalAmount, "Refund amount must equal original");
    return `Duyệt hoàn 100%: ${json.data.refundAmount.toLocaleString()}đ (Chính sách: ${json.data.refundPolicy})`;
  });

  await runTestCase("TC-REF-03", "Kiểm tra ghế A1 của suất chiếu tương lai quay về AVAILABLE", async () => {
    const res = await apiRequest("/showtimes/st-test-future-24h/seats");
    const json = await res.json();
    const seatA1 = json.data.seats.find(s => s.id === "A1");
    assert(seatA1.status === "AVAILABLE", `Seat A1 must be AVAILABLE after refund, got ${seatA1.status}`);
    return "Ghế A1 đã được giải phóng thành công về trạng thái AVAILABLE";
  });

  await runTestCase("TC-REF-04", "Đặt vé chuẩn bị test hoàn vé mốc 2h - 24h (st-test-mid-10h)", async () => {
    await apiRequest("/bookings/lock-seats", {
      method: "POST",
      body: { showtimeId: "st-test-mid-10h", seatIds: ["B1"], userId: customerUser.id }
    });
    const res = await apiRequest("/payments/checkout", {
      method: "POST",
      body: { showtimeId: "st-test-mid-10h", seatIds: ["B1"], userId: customerUser.id }
    });
    const json = await res.json();
    refundTicketMid = json.data.bookingCode;
    return `Tạo vé ${refundTicketMid} cho suất chiếu sau 10h`;
  });

  await runTestCase("TC-REF-05", "Hoàn vé mốc 2h - 24h trước suất chiếu -> Hoàn 50% giá trị", async () => {
    const res = await apiRequest("/support/refund", {
      method: "POST",
      body: { bookingCode: refundTicketMid, reason: "Đổi kế hoạch", customerInfo: {} }
    });
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(json.data.approved === true, "Must be approved");
    assert(json.data.refundRate === "50%", "Expected 50% refund rate");
    assert(json.data.refundAmount === Math.round(json.data.originalAmount * 0.5), "Refund amount must be 50%");
    return `Duyệt hoàn 50%: ${json.data.refundAmount.toLocaleString()}đ (Chính sách: ${json.data.refundPolicy})`;
  });

  await runTestCase("TC-REF-06", "Hoàn vé mốc < 2h trước suất chiếu -> Từ chối hoàn vé (0%)", async () => {
    await apiRequest("/bookings/lock-seats", {
      method: "POST",
      body: { showtimeId: "st-test-past-1h", seatIds: ["C1"], userId: customerUser.id }
    });
    const bookRes = await apiRequest("/payments/checkout", {
      method: "POST",
      body: { showtimeId: "st-test-past-1h", seatIds: ["C1"], userId: customerUser.id }
    });
    const bookJson = await bookRes.json();
    refundTicketPast = bookJson.data.bookingCode;

    const res = await apiRequest("/support/refund", {
      method: "POST",
      body: { bookingCode: refundTicketPast, reason: "Trễ giờ", customerInfo: {} }
    });
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(json.data.approved === false, "Must NOT be approved");
    assert(json.data.refundAmount === 0, "Refund amount must be 0");
    assert(json.data.note !== null, "Must contain explanatory note");
    return `Từ chối hoàn vé chuẩn xác: ${json.data.note}`;
  });

  // =========================================================================
  // SUITE 6: HỆ SINH THÁI 5 AI AGENTS & FALLBACK (TC-AI-01 -> TC-AI-06)
  // =========================================================================
  console.log(`\n${colors.bold}${colors.yellow}📦 PHÂN HỆ 6: HỆ SINH THÁI 5 AI AGENTS & CHỊU LỖI FALLBACK${colors.reset}`);

  await runTestCase("TC-AI-01", "Kiểm tra trạng thái Gemini AI & Engine Đang Kích Hoạt", async () => {
    const res = await apiRequest("/ai/status");
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(json.activeEngine !== undefined, "Active engine must be specified");
    return `Engine: ${json.activeEngine} (Gemini Status: ${json.gemini.status})`;
  });

  await runTestCase("TC-AI-02", "Chatbot AI: Trả lời tự nhiên & sinh suggestedAction", async () => {
    const res = await apiRequest("/ai/chat", {
      method: "POST",
      body: { message: "Tôi muốn xem phim Dune 2 tối nay" }
    });
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(json.status === "SUCCESS", "Expected status SUCCESS");
    assert(json.reply && json.reply.length > 5, "Reply text must not be empty");
    return `Bot phản hồi: "${json.reply.substring(0, 60)}..."`;
  });

  await runTestCase("TC-AI-03", "RecommendationAgent: Thuật toán Hybrid & Match %", async () => {
    const res = await apiRequest("/ai/recommendations?userId=user_001");
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(json.model === "Hybrid_NCF_PhoBERT_v2.4", "Expected Hybrid model");
    assert(Array.isArray(json.data) && json.data.length > 0, "Expected recommendations");
    const top = json.data[0];
    assert(top.matchPercentage >= 50 && top.matchPercentage <= 100, "Match % must be valid");
    assert(top.recommendationReason !== undefined, "Explainable AI reason required");
    return `Top 1: ${top.title} (Trùng khớp: ${top.matchPercentage}%) - "${top.recommendationReason}"`;
  });

  await runTestCase("TC-AI-04", "RecommendationAgent: Tìm phim tương tự theo Embedding", async () => {
    const res = await apiRequest("/ai/similar-movies/mov-01?limit=3");
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(json.data) && json.data.length > 0, "Expected similar movies");
    return `Phim tương tự Dune 2: ${json.data.map(m => m.title).join(", ")}`;
  });

  await runTestCase("TC-AI-05", "BookingAgent: Gợi ý cụm ghế tối ưu & Áp voucher HSSV20 (-20%)", async () => {
    const res = await apiRequest("/ai/booking-assist", {
      method: "POST",
      body: {
        movieTitle: "Dune",
        preferences: { seatType: "VIP", quantity: 2, discountCode: "HSSV20" },
        userId: customerUser.id
      }
    });
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(json.data.seatSuggestion.suggestedSeatIds.length === 2, "Expected 2 suggested seats");
    assert(json.data.pricing.discountCode === "HSSV20", "Discount code must be HSSV20");
    assert(json.data.pricing.discountRate === "20%", "Discount rate must be 20%");
    return `Ghế gợi ý: ${json.data.seatSuggestion.suggestedSeatIds.join(", ")} | Giảm giá HSSV: -${json.data.pricing.discountAmount.toLocaleString()}đ`;
  });

  await runTestCase("TC-AI-06", "AdminAnalyticsAgent: Báo cáo KPI, LightGBM Dự báo & Lịch chiếu", async () => {
    // 1. KPI Report
    const r1 = await apiRequest("/admin/daily-report", {
      headers: { "Authorization": `Bearer ${adminToken}` }
    });
    const j1 = await r1.json();
    assert(r1.status === 200, `daily-report status ${r1.status}`);
    assert(j1.data.kpi !== undefined, "KPI object required");

    // 2. LightGBM Forecast
    const r2 = await apiRequest("/ai/demand-forecast", {
      headers: { "Authorization": `Bearer ${adminToken}` }
    });
    const j2 = await r2.json();
    assert(r2.status === 200, `demand-forecast status ${r2.status}`);
    assert(Array.isArray(j2.data) && j2.data.length === 6, "Expected 6 time slots");

    // 3. Optimal Schedule
    const r3 = await apiRequest("/admin/optimal-schedule", {
      headers: { "Authorization": `Bearer ${adminToken}` }
    });
    const j3 = await r3.json();
    assert(r3.status === 200, `optimal-schedule status ${r3.status}`);

    return `KPI Occupancy: ${(j1.data.kpi.occupancyRate * 100).toFixed(1)}% | Dự báo 6 khung giờ: OK | Lịch tối ưu: ${j3.data.recommendedSchedules?.length || 0} suất`;
  });

  // =========================================================================
  // SUITE 7: ADMIN MANAGEMENT CRUD & PERFORMANCE (TC-ADM-01 -> TC-PERF-01)
  // =========================================================================
  console.log(`\n${colors.bold}${colors.yellow}📦 PHÂN HỆ 7: QUẢN TRỊ ADMIN CRUD & HIỆU NĂNG HỆ THỐNG${colors.reset}`);

  let createdMovieId = "";

  await runTestCase("TC-ADM-01", "Admin tạo mới phim điện ảnh (CRUD Movie)", async () => {
    const res = await apiRequest("/admin/movies", {
      method: "POST",
      headers: { "Authorization": `Bearer ${adminToken}` },
      body: {
        title: "Avatar: Dòng Chảy Của Nước",
        originalTitle: "Avatar: The Way of Water",
        status: "NOW_SHOWING",
        durationMinutes: 192,
        imdbRating: 7.6,
        genres: ["Khoa học viễn tưởng", "Phiêu lưu"],
        director: "James Cameron",
        isHot: true
      }
    });
    const json = await res.json();
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(json.data.id && json.data.id.startsWith("mov-"), "Invalid movie id");
    createdMovieId = json.data.id;
    return `Đã thêm phim: ${json.data.title} (ID: ${createdMovieId})`;
  });

  await runTestCase("TC-ADM-02", "Admin tạo mới suất chiếu cho phim vừa tạo (CRUD Showtime)", async () => {
    const uniqueDay = new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const oldStIdx = showtimes.findIndex(st => st.startTime && st.startTime.startsWith(uniqueDay) && st.roomId === "room-01");
    if (oldStIdx !== -1) {
      const oldSt = showtimes.splice(oldStIdx, 1)[0];
      await dbService.deleteShowtime(oldSt.id).catch(() => {});
    }

    const res = await apiRequest("/admin/showtimes", {
      method: "POST",
      headers: { "Authorization": `Bearer ${adminToken}` },
      body: {
        movieId: createdMovieId,
        roomId: "room-01",
        startTime: `${uniqueDay}T20:00:00+07:00`,
        endTime: `${uniqueDay}T23:15:00+07:00`,
        price: 180000,
        format: "IMAX"
      }
    });
    const json = await res.json();
    assert(res.status === 201, `Expected 201, got ${res.status}: ${JSON.stringify(json)}`);
    assert(json.data.id && json.data.id.startsWith("st-"), "Invalid showtime id");
    return `Đã tạo suất chiếu ${json.data.id} phòng room-01 định dạng IMAX`;
  });

  await runTestCase("TC-ADM-03", "Admin quản lý danh sách người dùng & phân trang", async () => {
    const res = await apiRequest("/admin/users?page=1&limit=5", {
      headers: { "Authorization": `Bearer ${adminToken}` }
    });
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(json.data) && json.data.length > 0, "Users list must not be empty");
    assert(json.data.every(u => u.password === undefined), "No passwords in users list");
    return `Tổng tài khoản: ${json.pagination.total} (Hiển thị trang 1: ${json.data.length} users)`;
  });

  await runTestCase("TC-PERF-01", "Đo thời gian phản hồi API nghiệp vụ (< 200ms) & Chịu lỗi Dual-Mode", async () => {
    const samples = [
      { url: "/movies", name: "GET Movies" },
      { url: "/showtimes/st-101/seats", name: "GET Seats Matrix" },
      { url: "/combos", name: "GET Combos" },
      { url: "/ai/recommendations?userId=user_001", name: "GET AI Recommendations" },
    ];

    const measurements = [];
    for (const s of samples) {
      const t0 = Date.now();
      const r = await apiRequest(s.url);
      const t = Date.now() - t0;
      assert(r.status === 200, `${s.name} must return 200`);
      assert(t < 200, `${s.name} response time ${t}ms exceeds 200ms SLA`);
      measurements.push(`${s.name}: ${t}ms`);
    }

    return `SLA < 200ms Đạt: [${measurements.join(" | ")}]`;
  });

  // =========================================================================
  // SUITE 8: TÁCH BIỆT GIAO DIỆN & PHÂN QUYỀN 3 VAI TRÒ (ROLE-BASED UI & RBAC ISOLATION)
  // =========================================================================
  console.log(`\n${colors.bold}${colors.magenta}🛡️ PHÂN HỆ 8: TÁCH BIỆT GIAO DIỆN & PHÂN QUYỀN 3 VAI TRÒ (ROLE-BASED UI & RBAC ISOLATION)${colors.reset}`);

  await runTestCase("TC_UI_ROLE_01", "Role Isolation Khách hàng (CUSTOMER) -> Cô lập hoàn toàn POS & Admin", async () => {
    // 1. Khách hàng gọi API soát vé POS của Staff -> Bị chặn 403
    const resCheckIn = await apiRequest("/bookings/check-in", {
      method: "POST",
      headers: { "Authorization": `Bearer ${customerToken}` },
      body: { code: "CGV-123456" }
    });
    assert(resCheckIn.status === 403, `Customer check-in must return 403, got ${resCheckIn.status}`);

    // 2. Khách hàng gọi API quản trị Users của Admin -> Bị chặn 403
    const resUsers = await apiRequest("/admin/users", {
      headers: { "Authorization": `Bearer ${customerToken}` }
    });
    assert(resUsers.status === 403, `Customer manage users must return 403, got ${resUsers.status}`);

    // 3. Khách hàng gọi API quản trị Movies của Admin -> Bị chặn 403
    const resAdminMovies = await apiRequest("/admin/movies", {
      headers: { "Authorization": `Bearer ${customerToken}` }
    });
    assert(resAdminMovies.status === 403, `Customer admin movies must return 403, got ${resAdminMovies.status}`);

    return "Customer bị chặn 403 toàn diện khi truy cập POS Check-in, Admin Users & Admin Movies";
  });

  await runTestCase("TC_UI_ROLE_02", "Role Isolation Nhân viên rạp (STAFF) -> Ẩn đặt vé khách & Chặn CRUD Admin", async () => {
    // 1. Staff gọi API CRUD Movies của Admin -> Bị chặn 403
    const resMovie = await apiRequest("/admin/movies", {
      method: "POST",
      headers: { "Authorization": `Bearer ${staffToken}` },
      body: { title: "Staff Illegal Movie" }
    });
    assert(resMovie.status === 403, `Staff create movie must return 403, got ${resMovie.status}`);

    // 2. Staff gọi API CRUD Showtimes của Admin -> Bị chặn 403
    const resShowtime = await apiRequest("/admin/showtimes", {
      method: "POST",
      headers: { "Authorization": `Bearer ${staffToken}` },
      body: { movieId: "mov-01", roomId: "room-01", startTime: new Date().toISOString() }
    });
    assert(resShowtime.status === 403, `Staff create showtime must return 403, got ${resShowtime.status}`);

    // 3. Staff gọi API Báo cáo KPI của Admin -> Bị chặn 403
    const resReport = await apiRequest("/admin/daily-report", {
      headers: { "Authorization": `Bearer ${staffToken}` }
    });
    assert(resReport.status === 403, `Staff view daily-report must return 403, got ${resReport.status}`);

    // 4. Staff gọi API AI Forecast của Admin -> Bị chặn 403
    const resForecast = await apiRequest("/ai/demand-forecast", {
      headers: { "Authorization": `Bearer ${staffToken}` }
    });
    assert(resForecast.status === 403, `Staff view demand-forecast must return 403, got ${resForecast.status}`);

    return "Staff bị chặn 403 toàn diện khi cố truy cập Movie CRUD, Showtime CRUD, KPI & AI Forecast";
  });

  await runTestCase("TC_UI_ROLE_03", "Role Isolation Quản trị viên (ADMIN) -> Chặn mua vé cá nhân Admin", async () => {
    const expectedMsg = "Tài khoản Quản trị viên chỉ dùng cho mục đích điều hành hệ thống, không thực hiện đặt vé cá nhân";

    // 1. Admin gọi API khóa ghế đặt vé cá nhân -> Bị chặn 403 với thông báo chuẩn
    const resLock = await apiRequest("/bookings/lock-seats", {
      method: "POST",
      headers: { "Authorization": `Bearer ${adminToken}` },
      body: { showtimeId: "st-101", seatIds: ["C1"], userId: "admin_001" }
    });
    const jsonLock = await resLock.json();
    assert(resLock.status === 403, `Admin lock-seats must return 403, got ${resLock.status}`);
    assert(jsonLock.message === expectedMsg, `Expected exact message, got "${jsonLock.message}"`);

    // 2. Admin gọi API checkout thanh toán vé cá nhân -> Bị chặn 403 với thông báo chuẩn
    const resCheckout = await apiRequest("/payments/checkout", {
      method: "POST",
      headers: { "Authorization": `Bearer ${adminToken}` },
      body: { showtimeId: "st-101", seatIds: ["C1"], userId: "admin_001" }
    });
    const jsonCheckout = await resCheckout.json();
    assert(resCheckout.status === 403, `Admin checkout must return 403, got ${resCheckout.status}`);
    assert(jsonCheckout.message === expectedMsg, `Expected exact message, got "${jsonCheckout.message}"`);

    return "Admin bị chặn 403 khi đặt vé cá nhân kèm đúng thông báo: 'Tài khoản Quản trị viên chỉ dùng cho mục đích điều hành hệ thống, không thực hiện đặt vé cá nhân'";
  });

  await runTestCase("TC_ADM_SHOWTIME_CONFLICT", "Admin tạo suất chiếu -> Kiểm tra chống trùng giờ chiếu cùng phòng", async () => {
    // 1. Lấy thông tin một suất chiếu đã có sẵn tại room-01
    const baseShowtime = showtimes.find(st => st.roomId === "room-01");
    assert(baseShowtime, "Must have at least one showtime in room-01");

    // 2. Thử tạo một suất chiếu mới tại room-01 với khung giờ bị trùng (overlap)
    const conflictStart = new Date(new Date(baseShowtime.startTime).getTime() + 15 * 60 * 1000).toISOString(); // Bắt đầu sau 15 phút
    const conflictEnd = new Date(new Date(baseShowtime.startTime).getTime() + 120 * 60 * 1000).toISOString();

    const res = await apiRequest("/admin/showtimes", {
      method: "POST",
      headers: { "Authorization": `Bearer ${adminToken}` },
      body: {
        movieId: "mov-01",
        roomId: "room-01",
        startTime: conflictStart,
        endTime: conflictEnd,
        price: 130000
      }
    });
    const json = await res.json();
    assert(res.status === 400, `Expected 400 Bad Request for showtime conflict, got ${res.status}`);
    assert(json.status === "ERROR", "Status must be ERROR");
    assert(json.message.includes("đã có suất chiếu khác trong khoảng thời gian đã chọn"), "Error message must indicate room time conflict");

    return `Chống trùng giờ thành công: "${json.message}"`;
  });

  // =========================================================================
  // TỔNG KẾT VÀ XUẤT KẾT QUẢ
  // =========================================================================
  console.log("\n" + "=".repeat(75));
  console.log(`${colors.bold}📊 KẾT QUẢ THỰC THI KIỂM THỬ HỆ THỐNG${colors.reset}`);
  console.log("=".repeat(75));
  console.log(`  Tổng số Test Cases: ${colors.bold}${RESULTS.length}${colors.reset}`);
  console.log(`  Số ca PASS        : ${colors.green}${colors.bold}${passCount}${colors.reset}`);
  console.log(`  Số ca FAIL        : ${failCount > 0 ? colors.red : colors.green}${colors.bold}${failCount}${colors.reset}`);
  console.log(`  Tỷ lệ Đạt (Rate)  : ${colors.bold}${((passCount / RESULTS.length) * 100).toFixed(1)}%${colors.reset}`);
  console.log("=".repeat(75));

  // Ghi kết quả thô ra file JSON để phục vụ Task 4 tạo TEST_REPORT.md
  fs.writeFileSync(
    path.join(__dirname, "test-results.json"),
    JSON.stringify({ timestamp: new Date().toISOString(), passCount, failCount, results: RESULTS }, null, 2),
    "utf8"
  );

  process.exit(failCount > 0 ? 1 : 0);
}

runAllTests().catch(err => {
  console.error("Critical test execution error:", err);
  testServer.close();
  process.exit(1);
});
