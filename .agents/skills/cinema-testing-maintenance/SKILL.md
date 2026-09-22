---
name: cinema-testing-maintenance
description: >-
  Hướng dẫn kiểm thử và bảo trì toàn hệ thống website cinema: smoke test,
  regression test, booking và khóa ghế, RBAC, Admin CRUD, AI API, kiểm tra
  frontend, theo dõi server, xử lý sự cố, backup mock data và bảo trì định kỳ.
  Dùng khi cần kiểm thử, sửa lỗi vận hành hoặc chuẩn bị release.
---

# Cinema Testing & Maintenance

## Phạm vi

Skill này dùng cho hai việc liên quan chặt chẽ:

- **Kiểm thử:** xác nhận website, API và các role vẫn hoạt động sau thay đổi.
- **Bảo trì:** theo dõi server, bảo vệ dữ liệu demo, xử lý lỗi runtime và chuẩn bị release.

Codebase hiện tại là Express + vanilla JavaScript, chạy mặc định tại port `5000`.
Dữ liệu phim, user, booking và trạng thái ghế đang ở memory nên restart server sẽ
làm mất dữ liệu runtime và giải phóng toàn bộ ghế đang khóa.

## Quy trình trước mỗi thay đổi

1. Xác định vùng ảnh hưởng: frontend, API, quyền, booking hoặc AI.
2. Đọc implementation và skill liên quan trước khi sửa.
3. Ghi lại behavior hiện tại bằng một smoke test ngắn.
4. Thực hiện thay đổi nhỏ nhất có thể.
5. Chạy syntax check và test đúng slice vừa sửa.
6. Kiểm tra lại cả role được phép và role bị từ chối nếu thay đổi permission.

## Khởi động và kiểm tra server

```powershell
cd backend
npm install
npm start
```

Kiểm tra server đang chạy:

```powershell
Invoke-RestMethod http://localhost:5000/api/v1/movies
```

Nếu port `5000` đã được dùng, không khởi động server thứ hai. Dùng server đang
chạy hoặc tìm process bằng:

```powershell
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

## Smoke test bắt buộc

- `GET /api/v1/movies` trả `status: SUCCESS`.
- `GET /api/v1/cinemas` trả cinema và rooms.
- `GET /api/v1/combos` trả danh sách F&B.
- Login customer, manager và admin thành công.
- Admin gọi được `/api/v1/admin/daily-report`.
- Admin gọi được `/api/v1/ai/demand-forecast`.
- Customer không gọi được endpoint quản trị cần quyền.
- Manager không gọi được `/api/v1/admin/users`.
- `node --check frontend/src/app.js` không lỗi.
- `node --check backend/src/server.js` không lỗi.

## Regression test luồng booking

1. Lấy một movie đang chiếu và showtime hợp lệ.
2. Tải seat map bằng `GET /api/v1/showtimes/:id/seats`.
3. User A lock ghế bằng `POST /api/v1/bookings/lock-seats`.
4. User B thử lock cùng ghế và phải nhận HTTP `409` với `status: CONFLICT`.
5. User A checkout và nhận booking code, QR token, tổng tiền và trạng thái `SUCCESS`.
6. Thử checkout ghế chưa được user giữ; API phải từ chối.
7. Tải booking history và xác nhận booking mới xuất hiện.
8. Kiểm tra ghế đã chuyển sang `BOOKED`.

Không dùng token, password hoặc dữ liệu khách hàng thật trong test log.

## Regression test Admin

### Movies

- List, search, filter status và pagination.
- Tạo phim với title, genres, poster, status.
- Sửa phim và kiểm tra public catalog cập nhật.
- Toggle `isHot`.
- Xóa phim và kiểm tra showtime liên quan bị xử lý đúng.

### Showtimes

- Tạo với movie/room hợp lệ.
- Từ chối movieId hoặc roomId không tồn tại.
- Sửa thời gian và giá vé.
- Xóa showtime.
- Kiểm tra filter theo phòng và search không mất pagination.

### Users/RBAC

- Chỉ ADMIN được tạo, sửa role và xóa user.
- Không thể xóa `admin_001`.
- Password không xuất hiện trong mọi response danh sách/profile.
- Manager vẫn dùng được movie, showtime và analytics theo permission.

## Kiểm tra frontend

Sau thay đổi `frontend/index.html` hoặc `frontend/src/app.js`:

```powershell
node --check frontend/src/app.js
```

Kiểm tra thủ công:

- Mở trang ở desktop và mobile.
- Không có lỗi console.
- Chuyển giữa home, AI lab, account và Admin.
- Mở/đóng mọi modal và xác nhận form được reset khi tạo mới.
- Kiểm tra loading, empty, error và `403` state.
- Chọn ghế, đổi suất chiếu và cập nhật countdown.
- Kiểm tra bảng Admin không tràn ngang ngoài vùng cho phép.

## Bảo trì dữ liệu mock

Trước khi sửa `backend/src/data/mockData.js`:

1. Sao lưu file sang bản có timestamp, ví dụ `mockData.backup-2026-09-22.js`.
2. Dùng id duy nhất cho movie, room, showtime và user.
3. Kiểm tra quan hệ `movieId`, `roomId`, `cinemaId`.
4. Không lưu password thật hoặc thông tin cá nhân thật.
5. Khởi động lại server và chạy smoke test.
6. Xóa backup tạm sau khi release đã được xác nhận, hoặc lưu ngoài source nếu cần audit.

## Bảo trì định kỳ

### Mỗi lần release

- Syntax check frontend/backend.
- Smoke test API public và auth.
- Regression booking và RBAC.
- Kiểm tra thay đổi diff, không commit file tạm hoặc secret.
- Cập nhật README hoặc skill nếu endpoint/role thay đổi.

### Hàng tuần

- Kiểm tra npm dependencies và `npm audit`.
- Kiểm tra process đang dùng port 5000.
- Kiểm tra log startup và lỗi 4xx/5xx.
- Rà soát mock data trùng id, showtime quá hạn và poster URL lỗi.

### Trước production

- Thay in-memory data bằng database.
- Dùng JWT ký bằng secret từ environment và refresh/revoke strategy.
- Thêm rate limit, audit log, HTTPS và backup tự động.
- Dùng Redis hoặc lock có transaction cho concurrent booking.
- Thêm test runner và CI thay cho kiểm tra thủ công.

## Xử lý sự cố nhanh

### Server không khởi động

- Kiểm tra port 5000.
- Kiểm tra `npm install` và phiên bản Node.
- Chạy `node src/server.js` để đọc stack trace đầy đủ.
- Không xóa `node_modules` hoặc lockfile nếu chưa xác định lỗi dependency.

### API trả 401/403

- Kiểm tra token còn hợp lệ.
- Kiểm tra role và permission trong `ROLE_PERMISSIONS`.
- Kiểm tra frontend có dùng `apiFetch()` hay đang gọi `fetch()` trực tiếp.
- Không khắc phục bằng cách mở rộng quyền cho mọi role.

### Ghế bị sai trạng thái

- Kiểm tra `seatLockService.getSeatsStatus()`.
- Xác nhận `showtimeId`, `seatId`, `userId` nhất quán.
- Nhớ rằng restart server sẽ reset lock và booking in-memory.
- Kiểm tra conflict bằng hai user khác nhau trước khi sửa logic.

## Báo cáo kết quả

Mỗi lần kiểm thử hoặc bảo trì phải ghi:

- Thời gian và commit/version.
- Môi trường và port.
- Các test đã chạy.
- Kết quả pass/fail.
- Endpoint/view bị ảnh hưởng.
- Lỗi còn tồn tại và mức độ ảnh hưởng.
- Không ghi secret, Bearer token hoặc password vào báo cáo.
