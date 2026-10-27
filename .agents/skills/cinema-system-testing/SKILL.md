---
name: cinema-system-testing
description: >-
  Agent kiểm thử hệ thống cinema end-to-end: tự động kiểm tra startup, REST API,
  authentication, RBAC 3 tác nhân, catalog, booking khóa ghế, checkout QR, AI, Admin CRUD
  và frontend smoke test; tạo báo cáo pass/fail có bằng chứng và không lộ secret.
  Dùng khi cần test toàn hệ thống, regression test hoặc xác nhận release.
---

# Cinema System Testing Agent

## Mục tiêu

Kiểm tra các chức năng đang có của hệ thống rạp chiếu phim từ backend đến frontend,
ưu tiên các luồng có rủi ro cao: quyền truy cập, giữ ghế đồng thời, checkout và
thay đổi dữ liệu Admin. Kết quả phải tái hiện được, có mã test, status thực tế,
expected result và bằng chứng; không ghi Bearer token hoặc password vào log.

## Phạm vi kiểm thử

- Startup và syntax: `backend/src/server.js`, `frontend/src/app.js`.
- Public/customer: phim, tìm kiếm/lọc/phân trang, rạp, suất chiếu, ghế, combo,
  profile, lịch sử vé.
- Authentication: register, login, me, logout, demo users.
- Booking: lock ghế TTL 600 giây, conflict giữa hai user, checkout, combo, QR,
  booking history và trạng thái ghế `BOOKED`.
- RBAC 3 Tác Nhân: CUSTOMER (Khách hàng), STAFF (Nhân viên rạp), ADMIN (Quản trị viên);
  kiểm tra cả quyền được phép và bị từ chối bằng HTTP `401` hoặc `403`.
- Soát vé POS: Kiểm tra API `/api/v1/bookings/check-in` cho STAFF.
- AI: recommendations, chat, booking-assist, similar movies, explain,
  profile, feedback, demand forecast.
- Admin: movies, showtimes, users, bookings, daily report, schedule,
  revenue analysis và AI health.
- Frontend: home, booking modal, seat map, countdown, ticket modal, account,
  AI lab, Admin tabs, loading/empty/error state, responsive desktop/mobile.

## Điều kiện và dữ liệu chuẩn

```powershell
cd backend
npm install
npm start
```

Mặc định dùng `http://localhost:5000`. Nếu port 5000 đã có server, dùng server
đó và không khởi động thêm process. Các tài khoản demo chỉ dùng trong local:

- CUSTOMER (Khách hàng): `customer@aicinema.vn` / `123456`, id `user_guest`.
- STAFF (Nhân viên rạp): `minhanh@aicinema.vn` / `123456`, id `staff_001`.
- ADMIN (Quản trị viên): `admin@aicinema.vn` / `admin123`, id `admin_001`.

Không đưa password, token hoặc dữ liệu cá nhân vào báo cáo. Có thể dùng
`GET /api/v1/auth/demo-users` để xác minh danh sách demo nhưng không lưu response
nhạy cảm vào artifact.

## Quy trình chạy test

1. Đọc `tests/system-test-plan.md` và xác định scope theo thay đổi hiện tại.
2. Kiểm tra server bằng `GET /api/v1/movies`; nếu server chưa chạy thì khởi động.
3. Chạy syntax check:
   `node --check backend/src/server.js` và `node --check frontend/src/app.js`.
4. Chạy smoke test public, auth và AI.
5. Chạy ma trận RBAC cho role được phép và role bị từ chối.
6. Chạy booking regression trước khi chạy test Admin có thao tác dữ liệu.
7. Chạy Admin CRUD bằng record mới tạo; xóa record test sau khi xác nhận.
8. Kiểm tra frontend trên desktop và mobile, mở console để xác nhận không có lỗi.
9. Ghi báo cáo theo template trong test plan, gồm thời gian, môi trường, test ID,
   kết quả, status HTTP, lỗi và bằng chứng tối thiểu.

## Quy tắc booking regression

- Lấy movie `NOW_SHOWING`, showtime và một ghế `AVAILABLE` động từ API; không
  hard-code ghế đã đặt.
- User A lock ghế bằng `POST /api/v1/bookings/lock-seats`.
- User B lock cùng showtime/ghế phải nhận HTTP `409` và `status: CONFLICT`.
- User A checkout phải nhận `SUCCESS`, `bookingCode`, `qrToken`, `seats`, `total`.
- Checkout không lock hoặc sai user phải bị từ chối `409`.
- Sau checkout, seat map trả `BOOKED` và booking history chứa booking mới.
- Không chờ 10 phút trong regression thường; chỉ kiểm tra `expiresInSeconds` gần
  600. TTL expiry là test riêng, có thể dùng fake timer hoặc test service.

## Quy tắc Admin và dữ liệu

- Chạy test tạo/sửa/xóa bằng id trả về từ response, không đoán id theo timestamp.
- Tạo movie hoặc user với email/title có hậu tố test; cleanup ngay sau test.
- Xác nhận password không xuất hiện trong list, profile hoặc mutation response.
- Xác nhận `admin_001` không thể bị xóa.
- Sau test tạo showtime, xác nhận movie và room tồn tại; test id không hợp lệ phải
  trả `400` hoặc `404` đúng theo route.
- Vì dữ liệu in-memory, ghi rõ server restart trước/sau test có thể làm mất dữ liệu.

## Tiêu chí pass/fail

- **PASS:** status HTTP, `status` JSON, schema và side effect đều đúng expected.
- **FAIL:** sai status, thiếu trường bắt buộc, lộ secret, side effect sai hoặc
  frontend có lỗi console/runtime.
- **BLOCKED:** không thể chạy do server/dependency/environment; không đổi thành pass.
- Lỗi P0: mất dữ liệu, bypass quyền, đặt trùng ghế hoặc checkout sai tiền.
- Lỗi P1: hỏng booking, CRUD chính, login hoặc AI endpoint cốt lõi.
- Lỗi P2: lỗi lọc/phân trang/UI hoặc thông báo không chính xác.
- Lỗi P3: lỗi hiển thị nhỏ không ảnh hưởng nghiệp vụ.
