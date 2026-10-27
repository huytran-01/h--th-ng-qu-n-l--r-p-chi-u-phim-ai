---
name: cinema-testing-maintenance
description: >-
  Hướng dẫn kiểm thử và bảo trì toàn hệ thống website cinema: smoke test,
  regression test, booking và khóa ghế, RBAC 3 tác nhân, Admin CRUD, AI API, kiểm tra
  frontend, theo dõi server, xử lý sự cố, backup mock data và bảo trì định kỳ.
  Dùng khi cần kiểm thử, sửa lỗi vận hành hoặc chuẩn bị release.
---

# Cinema Testing & Maintenance (3 Tác Nhân Người Dùng)

## Phạm vi

Skill này dùng cho hai việc liên quan chặt chẽ:

- **Kiểm thử:** xác nhận website, API và 3 tác nhân người dùng (CUSTOMER, STAFF, ADMIN) vẫn hoạt động sau thay đổi.
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
- Login customer, staff và admin thành công.
- Staff gọi được `/api/v1/bookings/check-in` để soát vé.
- Admin gọi được `/api/v1/admin/daily-report`.
- Admin gọi được `/api/v1/ai/demand-forecast`.
- Customer không gọi được endpoint quản trị cần quyền.
- Staff không gọi được `/api/v1/admin/users`.
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

### Users/RBAC (3 Tác Nhân: CUSTOMER, STAFF, ADMIN)

- Chỉ ADMIN được tạo, sửa role và xóa user.
- Không thể xóa `admin_001`.
- Password không xuất hiện trong mọi response danh sách/profile.
- Staff dùng được check-in soát vé và tra cứu booking history.

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

## Bảo trì định kỳ

### Mỗi lần release

- Syntax check frontend/backend.
- Smoke test API public và auth.
- Regression booking và RBAC.
- Kiểm tra thay đổi diff, không commit file tạm hoặc secret.
- Cập nhật README hoặc skill nếu endpoint/role thay đổi.

### Trước production

- Thay in-memory data bằng database.
- Dùng JWT ký bằng secret từ environment và refresh/revoke strategy.
- Thêm rate limit, audit log, HTTPS và backup tự động.
- Dùng Redis hoặc lock có transaction cho concurrent booking.
- Thêm test runner và CI thay cho kiểm tra thủ công.
