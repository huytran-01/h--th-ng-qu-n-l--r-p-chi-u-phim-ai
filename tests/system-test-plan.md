# Bản kiểm thử chức năng hệ thống Cinema AI

## 1. Thông tin chạy

- Base URL: `http://localhost:5000/api/v1`
- Frontend: `http://localhost:5000`
- Môi trường chuẩn: Windows, Node.js, Express, dữ liệu mock in-memory.
- Ngày lập: 2026-09-23
- Cách khởi động:

```powershell
cd backend
npm install
npm start
```

- Syntax check bắt buộc:

```powershell
node --check backend/src/server.js
node --check frontend/src/app.js
```

Mỗi lần restart server có thể reset booking, trạng thái ghế khóa và dữ liệu CRUD.
Không ghi password hoặc Bearer token vào log/báo cáo.

## 2. Dữ liệu kiểm thử

| Vai trò | Email | Password | ID |
|---|---|---|---|
| CUSTOMER | customer@aicinema.vn | 123456 | user_guest |
| STAFF | minhanh@aicinema.vn | 123456 | staff_001 |
| MANAGER | huy@aicinema.vn | 123456 | manager_001 |
| ADMIN | admin@aicinema.vn | admin123 | admin_001 |

Dữ liệu động phải lấy từ API: movie có `status=NOW_SHOWING`, showtime hợp lệ,
ghế `AVAILABLE`, cinema/room và combo. Không giả định ghế chưa bị đặt.

## 3. Ma trận test chức năng

### A. Startup và public API

| ID | Chức năng | Bước kiểm thử | Expected |
|---|---|---|---|
| SYS-001 | Backend syntax | Chạy `node --check backend/src/server.js` | Exit code 0 |
| SYS-002 | Frontend syntax | Chạy `node --check frontend/src/app.js` | Exit code 0 |
| PUB-001 | Movie catalog | GET `/movies` | 200, `status=SUCCESS`, có mảng `data` |
| PUB-002 | Movie detail | GET `/movies/mov-01` | 200, đúng id; id sai trả 404 |
| PUB-003 | Movie filter/search | GET `/movies?status=NOW_SHOWING&search=Dune&genre=Khoa%20học%20viễn%20tưởng` | Chỉ trả record phù hợp |
| PUB-004 | Movie pagination | GET `/movies?page=1&limit=2` | Có `pagination.total/page/limit/totalPages`, tối đa 2 record |
| PUB-005 | Cinemas and rooms | GET `/cinemas` | 200, cinema có `rooms` |
| PUB-006 | Showtimes | GET `/showtimes?movieId=mov-01` | 200, showtime có movie/room/cinema |
| PUB-007 | Seats | GET `/showtimes/:id/seats?userId=user_guest` | 200, có seats và trạng thái AVAILABLE/BOOKED/LOCKED |
| PUB-008 | Combos | GET `/combos` | 200, combo có id/name/price |

### B. Authentication và profile

| ID | Chức năng | Bước kiểm thử | Expected |
|---|---|---|---|
| AUTH-001 | Demo users | GET `/auth/demo-users` | 200, không có password |
| AUTH-002 | Login customer | POST `/auth/login` với customer demo | 200, SUCCESS, token và user |
| AUTH-003 | Login invalid | POST `/auth/login` password sai | 401, ERROR |
| AUTH-004 | Current user | GET `/auth/me` với Bearer token | 200, SUCCESS, đúng user |
| AUTH-005 | Missing token | GET `/auth/me` không Authorization | 401 |
| AUTH-006 | Logout | POST `/auth/logout` với token | 200, SUCCESS |
| AUTH-007 | Register | POST `/auth/register` email test mới | 201, user không có password |
| AUTH-008 | Duplicate register | Đăng ký lại cùng email | 400 |
| AUTH-009 | Read profile | GET `/users/user_guest/profile` | 200, không có password |
| AUTH-010 | Update profile | PUT profile với name/phone mới | 200, giá trị cập nhật đúng |
| AUTH-011 | Customer bookings | GET `/users/user_guest/bookings?page=1&limit=5` | 200, có data và pagination |

### C. Booking, lock ghế và checkout

| ID | Chức năng | Bước kiểm thử | Expected |
|---|---|---|---|
| BOOK-001 | Lock input validation | POST `/bookings/lock-seats` thiếu showtimeId/seatIds | 400, ERROR |
| BOOK-002 | Lock seat | User A lock 1 ghế AVAILABLE | 200, SUCCESS, `expiresInSeconds` gần 600 |
| BOOK-003 | Lock conflict | User B lock cùng ghế/showtime | 409, `status=CONFLICT` |
| BOOK-004 | Own lock visibility | GET seat map với user A | Ghế là LOCKED_BY_ME hoặc trạng thái tương đương |
| BOOK-005 | Other lock visibility | GET seat map với user B | Ghế là LOCKED_BY_OTHER và có remainingSeconds |
| BOOK-006 | Checkout success | User A checkout ghế đã lock, combo hợp lệ | 200, SUCCESS, bookingCode, qrToken, total |
| BOOK-007 | Seat booked | GET seat map sau checkout | Ghế chuyển BOOKED |
| BOOK-008 | Checkout without lock | User B checkout ghế không do mình lock | 409, CONFLICT |
| BOOK-009 | Invalid showtime | Lock/checkout showtime không tồn tại | Lock 409/validation phù hợp; checkout 404 |
| BOOK-010 | Invalid seat/combo | Checkout seat hoặc combo không tồn tại | 400, ERROR |
| BOOK-011 | Booking history | GET user bookings sau BOOK-006 | Booking mới xuất hiện, status PAID |
| BOOK-012 | Total calculation | Checkout seat VIP/SWEETBOX và combo | `total = ticketTotal + comboTotal`, đúng giá |

### D. RBAC

| ID | Role | Endpoint | Expected |
|---|---|---|---|
| RBAC-001 | CUSTOMER | GET `/admin/movies` | 403 |
| RBAC-002 | CUSTOMER | GET `/ai/demand-forecast` | 403 |
| RBAC-003 | STAFF | GET `/admin/bookings` | 200 |
| RBAC-004 | STAFF | GET `/admin/users` | 403 |
| RBAC-005 | MANAGER | GET `/admin/movies` | 200 |
| RBAC-006 | MANAGER | POST/PUT/DELETE movie/showtime | 200/201 khi dữ liệu hợp lệ |
| RBAC-007 | MANAGER | GET `/admin/users` | 403 |
| RBAC-008 | ADMIN | GET `/admin/users` | 200, user list không có password |
| RBAC-009 | No auth | GET `/admin/daily-report` | 403 theo policy hiện tại |
| RBAC-010 | ADMIN | DELETE `/admin/users/admin_001` | 400, không xóa admin gốc |

### E. AI và báo cáo

| ID | Chức năng | Bước kiểm thử | Expected |
|---|---|---|---|
| AI-001 | Recommendations | GET `/ai/recommendations?userId=user_guest` | 200, SUCCESS, danh sách phim |
| AI-002 | Similar movies | GET `/ai/similar-movies/mov-01` | 200, danh sách kết quả |
| AI-003 | Explain recommendation | GET `/ai/recommendations/explain/mov-01?userId=user_guest` | 200, movie/explanation/factors |
| AI-004 | Profile | GET `/ai/profile/user_guest` | 200, profile và source |
| AI-005 | Feedback | POST `/ai/feedback` với customer token | 200, SUCCESS |
| AI-006 | Chatbot | POST `/ai/chat` message `Gợi ý phim hot` | 200, reply hoặc suggestedMovies |
| AI-007 | Booking assist | POST `/ai/booking-assist` message booking tiếng Việt | 200, intent/entities hợp lệ |
| AI-008 | Demand forecast | GET `/ai/demand-forecast` bằng MANAGER/ADMIN | 200, các timeslot và predictedOccupancy |
| AI-009 | Daily report | GET `/admin/daily-report` bằng MANAGER/ADMIN | 200, KPI và agent name |
| AI-010 | Admin AI health | GET `/admin/ai-health` bằng MANAGER/ADMIN | 200, models có status |
| AI-011 | Manager-only AI | GET `/admin/optimal-schedule` bằng CUSTOMER | 403 |

### F. Admin CRUD

| ID | Chức năng | Bước kiểm thử | Expected |
|---|---|---|---|
| ADM-001 | List movies | GET `/admin/movies?page=1&limit=5` bằng MANAGER | 200, pagination |
| ADM-002 | Create movie | POST movie title test bằng MANAGER | 201, id mới, SUCCESS |
| ADM-003 | Update movie | PUT movie test đổi title/status | 200, dữ liệu public cập nhật |
| ADM-004 | Toggle hot | PATCH movie test `{isHot:true}` | 200, isHot=true |
| ADM-005 | Delete movie | DELETE movie test | 200, movie và showtime liên quan bị xử lý |
| ADM-006 | Create invalid movie | POST không có title | 400 |
| ADM-007 | List showtimes | GET `/admin/showtimes` bằng MANAGER | 200, pagination |
| ADM-008 | Create showtime | POST movie/room hợp lệ | 201, id mới |
| ADM-009 | Invalid showtime refs | POST movieId/roomId sai | 400 |
| ADM-010 | Update/delete showtime | PUT rồi DELETE record test | 200; record biến mất |
| ADM-011 | List users | GET `/admin/users` bằng ADMIN | 200, không có password |
| ADM-012 | Create user | POST email test mới bằng ADMIN | 201, không có password |
| ADM-013 | Update user/role | PUT hoặc PATCH role test | 200, role đúng |
| ADM-014 | Delete user | DELETE user test | 200; GET list không còn |
| ADM-015 | Manager user denial | GET/POST/PATCH/DELETE `/admin/users` bằng MANAGER | 403 |
| ADM-016 | Admin bookings | GET `/admin/bookings?status=PAID` | 200, summary đúng schema |
| ADM-017 | Revenue analysis | GET `/admin/revenue-analysis` | 200 với MANAGER/ADMIN |

### G. Frontend smoke và responsive

| ID | Chức năng | Bước kiểm thử | Expected |
|---|---|---|---|
| UI-001 | Initial load | Mở `/` khi backend đang chạy | Catalog, cinemas, AI rec, combos render; không console error |
| UI-002 | Customer navigation | Chuyển Home, Account, AI Lab | Chỉ view được chọn hiển thị |
| UI-003 | Search/filter | Nhập tên phim, đổi genre/tab | Kết quả và pagination cập nhật |
| UI-004 | Booking modal | Mở mua vé, đổi showtime | Seat map và tổng tiền cập nhật |
| UI-005 | Seat/countdown | Chọn ghế, kiểm tra banner countdown | Ghế selected, timer gần 10:00, checkout enabled |
| UI-006 | Checkout ticket | Thanh toán demo | Ticket modal có booking code, QR và ghế |
| UI-007 | Account | Mở account sau checkout | Profile và booking history hiển thị vé mới |
| UI-008 | Chatbot | Mở chatbot, gửi prompt nhanh | Tin nhắn user/bot và suggested action hiển thị |
| UI-009 | Admin | Đăng nhập Admin Portal, mở các tab | Dashboard/KPI/table/modal tải đúng quyền |
| UI-010 | Responsive | Kiểm tra desktop và mobile width | Không tràn layout, modal/table thao tác được |
| UI-011 | Error state | Tắt backend hoặc gọi id sai | Có loading/error message, không crash trang |

## 4. Thứ tự chạy và tiêu chí release

1. SYS-001..002, PUB-001..008.
2. AUTH-001..011.
3. RBAC-001..010.
4. BOOK-001..012 trên dữ liệu sạch.
5. AI-001..011.
6. ADM-001..017; cleanup các record test.
7. UI-001..011.

Release chỉ đạt khi tất cả test P0/P1 pass, không có bypass RBAC, không có
checkout trùng ghế/sai tổng tiền, và không có lỗi console frontend. Test bị
blocked phải được ghi rõ, không tính là pass.

## 5. Mẫu báo cáo kết quả

```text
Test run: 2026-09-23 <HH:mm>
Version/commit: <value>
Environment: Windows, Node <version>, http://localhost:5000
Scope: <IDs>
Result: <passed>/<total> PASS; <failed> FAIL; <blocked> BLOCKED

Failures:
- ID: <TEST-ID>
  Endpoint/view: <path>
  Role: <role>
  Input: <minimal safe input>
  Actual: HTTP <status>, <safe response summary>
  Expected: <expected behavior>
  Repro: <numbered short steps>
  Severity: P0/P1/P2/P3

Evidence: <safe log/screenshot path>
Notes: <environmental limitation or data reset>
```
