// =========================================================================
// KIỂM THỬ TỰ ĐỘNG MA TRẬN PHÂN QUYỀN RBAC (CUSTOMER - STAFF - MANAGER)
// =========================================================================

const http = require("http");
const app = require("../backend/src/server");

async function runRBACTests() {
  console.log("==================================================================");
  console.log("🛡️  BẮT ĐẦU KIỂM THỬ MA TRẬN PHÂN QUYỀN RBAC CHUẨN 3 VAI TRÒ");
  console.log("==================================================================");

  // Khởi động server test trên cổng ngẫu nhiên
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`📡 Server test đang chạy tại: ${baseUrl}\n`);

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Đăng nhập 3 tài khoản để lấy Token
  async function login(email, password) {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const json = await res.json();
    return json.token;
  }

  const customerToken = await login("customer@aicinema.vn", "123456");
  const staffToken = await login("minhanh@aicinema.vn", "123456");
  const managerToken = await login("admin@aicinema.vn", "admin123");

  assert(Boolean(customerToken), "Đăng nhập Customer thành công & lấy Token");
  assert(Boolean(staffToken), "Đăng nhập Staff thành công & lấy Token");
  assert(Boolean(managerToken), "Đăng nhập Manager thành công & lấy Token");
  console.log("");

  // Helper gửi request
  async function testEndpoint(method, path, token, body = null) {
    const opts = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
      }
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${baseUrl}${path}`, opts);
    let json = {};
    try { json = await res.json(); } catch (e) {}
    return { status: res.status, json };
  }

  // --- MA TRẬN 1: Xem danh sách phim, lịch chiếu (CUSTOMER: Cho phép, STAFF: Cho phép, MANAGER: Cho phép) ---
  console.log("📌 KIỂM THỬ DÒNG 1: Xem phim và lịch chiếu (Công khai)");
  {
    const r1 = await testEndpoint("GET", "/api/v1/movies", customerToken);
    assert(r1.status === 200, "CUSTOMER xem danh sách phim -> 200 OK");
    const r2 = await testEndpoint("GET", "/api/v1/movies", staffToken);
    assert(r2.status === 200, "STAFF xem danh sách phim -> 200 OK");
    const r3 = await testEndpoint("GET", "/api/v1/movies", managerToken);
    assert(r3.status === 200, "MANAGER xem danh sách phim -> 200 OK");
  }
  console.log("");

  // --- MA TRẬN 2: Gợi ý phim thông minh bằng Gemini AI (CUSTOMER: Cho phép, STAFF: Từ chối 403, MANAGER: Từ chối 403) ---
  console.log("📌 KIỂM THỬ DÒNG 2: Gợi ý phim thông minh bằng AI");
  {
    const rCust = await testEndpoint("GET", "/api/v1/ai/recommendations", customerToken);
    assert(rCust.status === 200, "CUSTOMER nhận gợi ý AI -> 200 OK");

    const rStaff = await testEndpoint("GET", "/api/v1/ai/recommendations", staffToken);
    assert(rStaff.status === 403, `STAFF gọi gợi ý AI -> BỊ TỪ CHỐI 403 Forbidden (Actual: ${rStaff.status})`);

    const rMgr = await testEndpoint("GET", "/api/v1/ai/recommendations", managerToken);
    assert(rMgr.status === 403, `MANAGER gọi gợi ý AI -> BỊ TỪ CHỐI 403 Forbidden (Actual: ${rMgr.status})`);
  }
  console.log("");

  // --- MA TRẬN 3: Chọn ghế, khóa ghế tạm thời (CUSTOMER: Cho phép, STAFF: Từ chối 403, MANAGER: Từ chối 403) ---
  console.log("📌 KIỂM THỬ DÒNG 3: Khóa ghế tạm thời (seatLockService)");
  {
    const rCust = await testEndpoint("POST", "/api/v1/bookings/lock-seats", customerToken, {
      showtimeId: "st-01",
      seatIds: ["C1"]
    });
    assert(rCust.status === 200 || rCust.status === 409, `CUSTOMER khóa ghế -> Cho phép (Status: ${rCust.status})`);

    const rStaff = await testEndpoint("POST", "/api/v1/bookings/lock-seats", staffToken, {
      showtimeId: "st-01",
      seatIds: ["C2"]
    });
    assert(rStaff.status === 403, `STAFF khóa ghế -> BỊ TỪ CHỐI 403 Forbidden (Actual: ${rStaff.status})`);

    const rMgr = await testEndpoint("POST", "/api/v1/bookings/lock-seats", managerToken, {
      showtimeId: "st-01",
      seatIds: ["C3"]
    });
    assert(rMgr.status === 403, `MANAGER khóa ghế -> BỊ TỪ CHỐI 403 Forbidden (Actual: ${rMgr.status})`);
  }
  console.log("");

  // --- MA TRẬN 4: Tạo đơn đặt vé POST /api/bookings (CUSTOMER: Cho phép, STAFF: Từ chối 403, MANAGER: Từ chối 403) ---
  console.log("📌 KIỂM THỬ DÒNG 4: Tạo đơn đặt vé (POST /api/bookings)");
  {
    const rCust = await testEndpoint("POST", "/api/bookings", customerToken, {
      showtimeId: "st-01",
      seatIds: ["D1"]
    });
    assert(rCust.status === 201 || rCust.status === 409, `CUSTOMER tạo đơn đặt vé -> Cho phép (Status: ${rCust.status})`);

    const rStaff = await testEndpoint("POST", "/api/bookings", staffToken, {
      showtimeId: "st-01",
      seatIds: ["D2"]
    });
    assert(rStaff.status === 403, `STAFF tạo đơn đặt vé -> BỊ TỪ CHỐI 403 Forbidden (Actual: ${rStaff.status})`);

    const rMgr = await testEndpoint("POST", "/api/bookings", managerToken, {
      showtimeId: "st-01",
      seatIds: ["D3"]
    });
    assert(rMgr.status === 403, `MANAGER tạo đơn đặt vé -> BỊ TỪ CHỐI 403 Forbidden (Actual: ${rMgr.status})`);
  }
  console.log("");

  // --- MA TRẬN 5: Thanh toán vé POST /api/bookings/payment (CUSTOMER: Cho phép, STAFF: Từ chối 403, MANAGER: Từ chối 403) ---
  console.log("📌 KIỂM THỬ DÒNG 5: Thanh toán vé (POST /api/bookings/payment)");
  {
    const rStaff = await testEndpoint("POST", "/api/bookings/payment", staffToken, {
      showtimeId: "st-01",
      seatIds: ["A1"],
      userId: "staff_001"
    });
    assert(rStaff.status === 403, `STAFF thanh toán vé -> BỊ TỪ CHỐI 403 Forbidden (Actual: ${rStaff.status})`);

    const rMgr = await testEndpoint("POST", "/api/bookings/payment", managerToken, {
      showtimeId: "st-01",
      seatIds: ["A1"],
      userId: "admin_001"
    });
    assert(rMgr.status === 403, `MANAGER thanh toán vé -> BỊ TỪ CHỐI 403 Forbidden (Actual: ${rMgr.status})`);

    const rCust = await testEndpoint("POST", "/api/bookings/payment", customerToken, {
      showtimeId: "st-01",
      seatIds: ["A1"],
      userId: "user_guest"
    });
    assert(rCust.status !== 403, `CUSTOMER thanh toán vé -> Được quyền gọi (Status: ${rCust.status}, không bị 403)`);
  }
  console.log("");

  // --- MA TRẬN 6: Xem vé của tôi (CUSTOMER: Cho phép, STAFF: Từ chối 403, MANAGER: Từ chối 403) ---
  console.log("📌 KIỂM THỬ DÒNG 6: Xem vé của tôi (Lịch sử đặt vé cá nhân)");
  {
    const rCust = await testEndpoint("GET", "/api/users/user_guest/bookings", customerToken);
    assert(rCust.status === 200, `CUSTOMER xem vé của mình -> 200 OK`);

    const rStaff = await testEndpoint("GET", "/api/users/staff_001/bookings", staffToken);
    assert(rStaff.status === 403, `STAFF xem vé cá nhân -> BỊ TỪ CHỐI 403 Forbidden (Actual: ${rStaff.status})`);

    const rMgr = await testEndpoint("GET", "/api/users/admin_001/bookings", managerToken);
    assert(rMgr.status === 403, `MANAGER xem vé cá nhân -> BỊ TỪ CHỐI 403 Forbidden (Actual: ${rMgr.status})`);
  }
  console.log("");

  // --- MA TRẬN 7: Tra cứu vé và Check-in vé POST /api/staff/check-in (CUSTOMER: Từ chối 403, STAFF: Cho phép, MANAGER: Cho phép) ---
  console.log("📌 KIỂM THỬ DÒNG 7: Soát vé Check-in (POST /api/staff/check-in)");
  {
    const rCust = await testEndpoint("POST", "/api/staff/check-in", customerToken, { ticketCode: "BKG-240901" });
    assert(rCust.status === 403, `CUSTOMER check-in vé -> BỊ TỪ CHỐI 403 Forbidden (Actual: ${rCust.status})`);

    const rStaff = await testEndpoint("POST", "/api/staff/check-in", staffToken, { ticketCode: "BKG-240901" });
    assert(rStaff.status === 200 || rStaff.status === 400, `STAFF check-in vé -> Có quyền gọi (Status: ${rStaff.status}, không bị 403)`);

    const rMgr = await testEndpoint("POST", "/api/staff/check-in", managerToken, { ticketCode: "BKG-240842" });
    assert(rMgr.status === 200 || rMgr.status === 400, `MANAGER check-in vé -> Có quyền gọi (Status: ${rMgr.status}, không bị 403)`);
  }
  console.log("");

  // --- MA TRẬN 8: Quản lý danh sách phim, suất chiếu (CUSTOMER: Từ chối 403, STAFF: Từ chối 403, MANAGER: Cho phép) ---
  console.log("📌 KIỂM THỬ DÒNG 8: Quản lý phim, suất chiếu Admin");
  {
    const rCust = await testEndpoint("GET", "/api/admin/movies", customerToken);
    assert(rCust.status === 403, `CUSTOMER truy cập quản lý phim -> BỊ TỪ CHỐI 403 Forbidden (Actual: ${rCust.status})`);

    const rStaff = await testEndpoint("GET", "/api/admin/movies", staffToken);
    assert(rStaff.status === 403, `STAFF truy cập quản lý phim -> BỊ TỪ CHỐI 403 Forbidden (Actual: ${rStaff.status})`);

    const rMgr = await testEndpoint("GET", "/api/admin/movies", managerToken);
    assert(rMgr.status === 200, `MANAGER truy cập quản lý phim -> 200 OK`);
  }
  console.log("");

  // --- MA TRẬN 9: Xem báo cáo doanh thu & Trợ lý AI Analytics (CUSTOMER: Từ chối 403, STAFF: Từ chối 403, MANAGER: Cho phép) ---
  console.log("📌 KIỂM THỬ DÒNG 9: Xem báo cáo doanh thu & AI Analytics");
  {
    const rCust = await testEndpoint("GET", "/api/admin/revenue-analysis", customerToken);
    assert(rCust.status === 403, `CUSTOMER xem báo cáo doanh thu -> BỊ TỪ CHỐI 403 Forbidden (Actual: ${rCust.status})`);

    const rStaff = await testEndpoint("GET", "/api/admin/revenue-analysis", staffToken);
    assert(rStaff.status === 403, `STAFF xem báo cáo doanh thu -> BỊ TỪ CHỐI 403 Forbidden (Actual: ${rStaff.status})`);

    const rMgr = await testEndpoint("GET", "/api/admin/revenue-analysis", managerToken);
    assert(rMgr.status === 200, `MANAGER xem báo cáo doanh thu -> 200 OK`);
  }
  console.log("");

  // --- MA TRẬN 10: Quản lý tài khoản người dùng (CUSTOMER: Từ chối 403, STAFF: Từ chối 403, MANAGER: Cho phép) ---
  console.log("📌 KIỂM THỬ DÒNG 10: Quản lý tài khoản người dùng");
  {
    const rCust = await testEndpoint("GET", "/api/admin/users", customerToken);
    assert(rCust.status === 403, `CUSTOMER truy cập quản lý users -> BỊ TỪ CHỐI 403 Forbidden (Actual: ${rCust.status})`);

    const rStaff = await testEndpoint("GET", "/api/admin/users", staffToken);
    assert(rStaff.status === 403, `STAFF truy cập quản lý users -> BỊ TỪ CHỐI 403 Forbidden (Actual: ${rStaff.status})`);

    const rMgr = await testEndpoint("GET", "/api/admin/users", managerToken);
    assert(rMgr.status === 200, `MANAGER truy cập quản lý users -> 200 OK`);
  }
  console.log("");

  console.log("==================================================================");
  console.log(`🎉 KẾT QUẢ KIỂM THỬ: ${passed} PASS, ${failed} FAIL`);
  console.log("==================================================================");

  server.close();
  process.exit(failed > 0 ? 1 : 0);
}

runRBACTests().catch(err => {
  console.error("Lỗi thực thi test:", err);
  process.exit(1);
});

