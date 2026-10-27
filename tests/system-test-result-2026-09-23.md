# Kết quả kiểm thử hệ thống Cinema AI

## 1. Thông tin lần chạy

- Thời gian: 2026-09-23
- Môi trường: Windows, Node.js `v24.18.0`
- API: `http://localhost:5000/api/v1`
- Frontend HTTP smoke: `http://localhost:5000/`
- Backend: Express, dữ liệu mock in-memory
- Phạm vi: syntax, public API, authentication, RBAC, booking, AI, Admin CRUD và frontend HTTP smoke
- Ghi chú: server được khởi động từ thư mục `backend`; dữ liệu test có thể mất khi restart.

## 2. Tổng quan

| Kết quả | Số lượng |
|---|---:|
| PASS | 34 |
| FAIL | 3 |
| PASS một phần | 1 |
| BLOCKED / kiểm thử thủ công | UI tương tác sâu |

Kết luận: **Chưa đạt release gate** vì còn lỗi contract booking và phân quyền
catalog Admin cần được quyết định/sửa trước khi phát hành.

## 3. Kết quả theo nhóm

### Syntax và public API

| Test | Kết quả | Bằng chứng |
|---|---|---|
| SYS-001 backend syntax | PASS | `node --check backend/src/server.js` exit code 0 |
| SYS-002 frontend syntax | PASS | `node --check frontend/src/app.js` exit code 0 |
| PUB-001 movie catalog | PASS | HTTP 200, `SUCCESS`, có dữ liệu |
| PUB-002 movie detail | PASS | HTTP 200, `mov-01` đúng id |
| PUB-003 movie filter/search | PASS | HTTP 200, lọc Dune trả 1 kết quả |
| PUB-004 movie pagination | PASS | HTTP 200, limit 2 hoạt động |
| PUB-005 cinemas/rooms | PASS | HTTP 200, cinema có rooms |
| PUB-006 showtimes | PASS | HTTP 200, có movie/room/cinema |
| PUB-007 seat map | PASS | HTTP 200, tìm được ghế AVAILABLE |
| PUB-008 combos | PASS | HTTP 200, combo có id/price |

### Authentication và RBAC

| Test | Kết quả | Bằng chứng |
|---|---|---|
| AUTH-002 customer login | PASS | HTTP 200, nhận token |
| AUTH-003 login sai mật khẩu | PASS | HTTP 401 |
| AUTH-004 auth/me | PASS | HTTP 200, đúng user `user_guest` |
| AUTH-005 auth/me không token | PASS | HTTP 401 |
| AUTH-009 profile không lộ password | PASS | HTTP 200, response không có password |
| RBAC-001 CUSTOMER gọi `/admin/movies` | **FAIL** | HTTP 200, trong khi test plan kỳ vọng 403 |
| RBAC-004 STAFF gọi `/admin/users` | PASS | HTTP 403 |
| RBAC-005 MANAGER đọc Admin movies | PASS | HTTP 200 |
| RBAC-008 ADMIN đọc users | PASS | HTTP 200, không có password |
| RBAC-009 không auth gọi daily report | PASS | HTTP 403 |
| RBAC-010 không xóa `admin_001` | PASS | HTTP 400 |

### Booking và checkout

| Test | Kết quả | Bằng chứng |
|---|---|---|
| BOOK-002 lock ghế | **FAIL contract** | HTTP 200, TTL thực tế trả `ttlSeconds=600`, không phải `expiresInSeconds` |
| BOOK-003 lock conflict | PASS một phần | HTTP 409 đã xác nhận khi ghế bị user khác khóa; cần chuẩn hóa/kiểm tra lại field `status` trong response |
| BOOK-005 trạng thái user khác | **FAIL contract** | API trả trạng thái `LOCKED`, test plan kỳ vọng `LOCKED_BY_OTHER` |
| BOOK-006 checkout | PASS | HTTP 200, tạo booking code và QR token |
| BOOK-007 ghế sau checkout | PASS | Ghế chuyển `BOOKED` |
| BOOK-008 checkout không có lock đúng user | PASS | HTTP 409 |
| BOOK-011 booking history | PASS | Booking mới xuất hiện trong history |

### AI và báo cáo

| Test | Kết quả | Bằng chứng |
|---|---|---|
| AI-001 recommendations | PASS | HTTP 200, `SUCCESS` |
| AI-006 chatbot | PASS | HTTP 200, `SUCCESS` |
| AI-008 demand forecast | PASS | HTTP 200 với MANAGER |
| AI-009 daily report | PASS | HTTP 200 với ADMIN |

### Admin CRUD

| Test | Kết quả | Bằng chứng |
|---|---|---|
| ADM-002 tạo movie | PASS | HTTP 201, tạo id động |
| ADM-003 sửa movie | PASS | HTTP 200, title cập nhật |
| ADM-004 toggle `isHot` | PASS | HTTP 200, `isHot=true` |
| ADM-005 xóa movie test | PASS | HTTP 200, cleanup thành công |
| ADM-006 tạo movie thiếu title | PASS | HTTP 400 |

### Frontend

| Test | Kết quả | Bằng chứng |
|---|---|---|
| UI-HTTP frontend static | PASS | GET `/` trả HTTP 200 |
| UI-001..UI-011 tương tác sâu | BLOCKED | Chưa có browser automation trong lượt chạy này; cần kiểm tra console, modal, seat map, countdown và responsive thủ công/Playwright |

## 4. Findings cần xử lý

### F-001 - CUSTOMER truy cập được Admin movie list

- Mức độ: P2, hoặc P1 nếu endpoint chứa dữ liệu chỉ dành cho vận hành.
- Endpoint: `GET /api/v1/admin/movies`
- Thực tế: CUSTOMER nhận HTTP 200.
- Nguyên nhân dự kiến: route yêu cầu `movies.read`, và CUSTOMER đang có quyền
  `movies.read` trong `ROLE_PERMISSIONS`.
- Khuyến nghị: nếu Admin movie list là nội bộ, tạo permission riêng như
  `admin.movies.read` hoặc giới hạn route cho MANAGER/ADMIN/STAFF theo policy.
  Nếu chủ ý cho CUSTOMER đọc, cập nhật expected của `RBAC-001` thành 200.

### F-002 - Lock response không khớp test contract

- Mức độ: P2, ảnh hưởng frontend countdown nếu frontend đọc sai field.
- Endpoint: `POST /api/v1/bookings/lock-seats`
- Thực tế: response trả `ttlSeconds: 600` và `expiresAt`.
- Test plan hiện kỳ vọng `expiresInSeconds`.
- Khuyến nghị: thống nhất một schema. Frontend hiện đang đọc
  `json.expiresInSeconds || 600`, nên vẫn chạy fallback nhưng contract chưa nhất quán.

### F-003 - Tên trạng thái ghế không khớp test contract

- Mức độ: P2.
- Endpoint: `GET /api/v1/showtimes/:id/seats`
- Thực tế: service trả `MY_LOCK`, `LOCKED`, `BOOKED`.
- Test plan đang mô tả `LOCKED_BY_ME`, `LOCKED_BY_OTHER`.
- Khuyến nghị: cập nhật test plan/frontend theo schema hiện tại hoặc đổi service
  sang tên trạng thái thống nhất.

## 5. Các mục chưa chạy

- TTL expiry đủ 10 phút.
- AI endpoint đầy đủ: similar movies, explain, profile, feedback, booking-assist.
- Admin showtime CRUD đầy đủ.
- Admin user CRUD tạo/sửa/xóa record test.
- UI tương tác bằng browser: booking modal, countdown, ticket QR, chatbot,
  Admin tabs, responsive desktop/mobile và console errors.

Các mục trên không được tính là PASS.

## 6. Khuyến nghị trước release

1. Quyết định policy cho `RBAC-001` và sửa permission hoặc sửa expected.
2. Chuẩn hóa contract `ttlSeconds`/`expiresInSeconds` và tên trạng thái lock.
3. Chạy lại toàn bộ booking regression sau khi contract được thống nhất.
4. Chạy UI E2E bằng Playwright hoặc kiểm thử thủ công trên desktop/mobile.
5. Chỉ sign-off khi không còn lỗi P0/P1 và các mục BLOCKED đã có bằng chứng.
