# TÀI LIỆU ĐẶC TẢ KIỂM THỬ TOÀN DIỆN HỆ THỐNG
## HỆ THỐNG QUẢN LÝ RẠP CHIẾU PHIM TÍCH HỢP TRÍ TUỆ NHÂN TẠO (AI)
**Dự án:** CGV Cultureplex Cinema Management System with AI  
**Vai trò:** Senior QA Automation Architect & Full-stack Engineer  
**Phiên bản:** 1.0.0 — Bản Nghiệm Thu Tự Động Hóa (100% PASS)  
**Ngày cập nhật:** 28/10/2026  

---

# PHẦN 1: MA TRẬN TRUY VẾT YÊU CẦU (REQUIREMENT TRACEABILITY MATRIX - RTM)

Bảng ma trận RTM ánh xạ 1-1 từ toàn bộ các yêu cầu nghiệp vụ (từ `FR-01` đến `FR-18`) và yêu cầu phi chức năng (từ `NFR-01` đến `NFR-05`) trong báo cáo đồ án sang các Test Cases kiểm thử tự động:

| Mã Yêu Cầu | Tên Nghiệp Vụ Yêu Cầu | Nhóm Tác Nhân | Mã Test Case Bao Phủ | Trạng Thái Kiểm Thử |
| :--- | :--- | :--- | :--- | :---: |
| **FR-01** | Đăng ký & Đăng nhập (Auth & JWT/Bearer) | CUSTOMER, STAFF, ADMIN | `TC-AUTH-01`, `TC-AUTH-02`, `TC-AUTH-03`, `TC-AUTH-04`, `TC-AUTH-05` | **PASS (100%)** |
| **FR-02** | Quản lý Hồ sơ & Thẻ thành viên CGV 16 số | CUSTOMER | `TC-AUTH-01`, `TC-BOOK-06` | **PASS (100%)** |
| **FR-03** | Khám phá Danh mục Phim & Lọc | CUSTOMER, STAFF, ADMIN | `TC-CAT-01`, `TC-CAT-02`, `TC-CAT-03` | **PASS (100%)** |
| **FR-04** | Đặt Vé Nhanh & Lịch chiếu Suất chiếu | CUSTOMER | `TC-CAT-04`, `TC-CAT-05` | **PASS (100%)** |
| **FR-05** | Xem Sơ Đồ Ghế & Khóa Ghế Concurrency TTL 10m | CUSTOMER | `TC-CAT-05`, `TC-BOOK-01`, `TC-BOOK-02` | **PASS (100%)** |
| **FR-06** | Chọn Combo Bắp Nước Concession F&B | CUSTOMER | `TC-BOOK-03`, `TC-BOOK-04` | **PASS (100%)** |
| **FR-07** | Thanh Toán, Tích Điểm & Xuất Vé Điện Tử QR | CUSTOMER | `TC-BOOK-04`, `TC-BOOK-05`, `TC-BOOK-06`, `TC-BOOK-07` | **PASS (100%)** |
| **FR-08** | Lịch Sử Vé Đã Đặt Cá Nhân | CUSTOMER | `TC-POS-06` | **PASS (100%)** |
| **FR-09** | Trò Chuyện Trợ Lý Ảo AI 24/7 (Gemini & NLU) | CUSTOMER | `TC-AI-01`, `TC-AI-02` | **PASS (100%)** |
| **FR-10** | CGV AI Recommendation Studio & Explainable AI | CUSTOMER | `TC-AI-03`, `TC-AI-04` | **PASS (100%)** |
| **FR-11** | Soát Vé Check-in QR & Chống Gian Lận Tái Dùng | STAFF, ADMIN | `TC-POS-01`, `TC-POS-02`, `TC-POS-03` | **PASS (100%)** |
| **FR-12** | Quản Lý Lịch Sử Vé Bán Toàn Rạp (POS Summary) | STAFF, ADMIN | `TC-POS-04`, `TC-POS-05` | **PASS (100%)** |
| **FR-13** | Hỗ Trợ Hoàn Vé Tự Động 3 Mốc Thời Gian | CUSTOMER, STAFF | `TC-REF-01`, `TC-REF-02`, `TC-REF-03`, `TC-REF-04`, `TC-REF-05`, `TC-REF-06` | **PASS (100%)** |
| **FR-14** | Quản Lý Danh Mục Phim (Admin CRUD) | ADMIN | `TC-ADM-01` | **PASS (100%)** |
| **FR-15** | Quản Lý Suất Chiếu (Admin CRUD) | ADMIN | `TC-ADM-02` | **PASS (100%)** |
| **FR-16** | Quản Lý Người Dùng & Phân Quyền RBAC | ADMIN | `TC-AUTH-06`, `TC-ADM-03` | **PASS (100%)** |
| **FR-17** | Dashboard Báo Cáo KPI Doanh Thu Ngày | ADMIN | `TC-AI-06` | **PASS (100%)** |
| **FR-18** | Dự Báo Nhu Cầu LightGBM & Lịch Chiếu AI | ADMIN | `TC-AI-05`, `TC-AI-06` | **PASS (100%)** |
| **NFR-01**| Bảo Mật, Ẩn Password & Ranh Giới RBAC Backend | TOÀN HỆ THỐNG | `TC-AUTH-01`, `TC-AUTH-03`, `TC-AUTH-06`, `TC-ADM-03` | **PASS (100%)** |
| **NFR-02**| Toàn Vẹn Dữ Liệu & Concurrency Atomic Lock 600s| TOÀN HỆ THỐNG | `TC-BOOK-01`, `TC-BOOK-02`, `TC-BOOK-07` | **PASS (100%)** |
| **NFR-03**| Hiệu Năng Cao & SLA Phản Hồi API < 200ms | TOÀN HỆ THỐNG | `TC-PERF-01` | **PASS (100%)** |
| **NFR-04**| Sẵn Sàng Cao & Chịu Lỗi Dual-Mode Database | TOÀN HỆ THỐNG | `TC-AI-01`, `TC-PERF-01` | **PASS (100%)** |
| **NFR-05**| Tính Toàn Vẹn State Machine Ghế & Đơn Vé | TOÀN HỆ THỐNG | `TC-BOOK-05`, `TC-POS-01`, `TC-REF-03` | **PASS (100%)** |

---

# PHẦN 2: DANH SÁCH CHI TIẾT 40 TEST CASES (7 PHÂN HỆ)

---

### PHÂN HỆ 1: AUTHENTICATION, CGV MEMBERSHIP & PHÂN QUYỀN RBAC

#### TC-AUTH-01: Đăng ký tài khoản CUSTOMER mới & Sinh thẻ CGV 16 số
* **Mã Yêu Cầu:** `FR-01`, `FR-02`, `NFR-01`
* **Tác nhân:** Khách hàng mới (`CUSTOMER`)
* **Tiền điều kiện:** Email chưa từng được đăng ký trong hệ thống.
* **Các bước thực hiện:**
  1. Gửi request `POST /api/v1/auth/register`.
  2. Payload:
     ```json
     {
       "name": "Lê Hoàng Nam",
       "email": "testuser_unique@aicinema.vn",
       "password": "password123",
       "phone": "0911223344"
     }
     ```
* **Kết quả mong đợi:** HTTP 201/200, `status: "SUCCESS"`, sinh mã thẻ thành viên CGV 16 số dạng `9999-XXXX-XXXX-XXXX`, tặng 100 điểm thưởng chào mừng, tuyệt đối **không** trả trường `password`.
* **Kết quả thực tế:** HTTP 201, User nhận mã thẻ `9999-6186-4960-2843`, điểm thưởng: 100, trường password đã bị loại bỏ hoàn toàn.
* **Trạng thái:** **PASS**

#### TC-AUTH-02: Đăng ký với email đã tồn tại -> Chặn lỗi 400
* **Mã Yêu Cầu:** `FR-01`
* **Tác nhân:** Khách vãng lai
* **Tiền điều kiện:** Email `customer@aicinema.vn` đã có tài khoản trên hệ thống.
* **Các bước thực hiện:**
  1. Gửi request `POST /api/v1/auth/register` với `email: "customer@aicinema.vn"`.
* **Kết quả mong đợi:** HTTP 400 Bad Request, `status: "ERROR"`, thông báo "Email này đã được đăng ký tài khoản thành viên CGV."
* **Kết quả thực tế:** HTTP 400, nhận thông báo lỗi email trùng khớp.
* **Trạng thái:** **PASS**

#### TC-AUTH-03: Đăng nhập vai trò CUSTOMER chuẩn
* **Mã Yêu Cầu:** `FR-01`, `NFR-01`
* **Tác nhân:** Khách hàng (`CUSTOMER`)
* **Tiền điều kiện:** Tài khoản `customer@aicinema.vn` hoạt động (`ACTIVE`).
* **Các bước thực hiện:**
  1. Gửi request `POST /api/v1/auth/login` với `{ "email": "customer@aicinema.vn", "password": "123456" }`.
* **Kết quả mong đợi:** HTTP 200 OK, trả về Bearer Token bắt đầu bằng `cgv_`, `user.role === "CUSTOMER"`, không trả password.
* **Kết quả thực tế:** HTTP 200, Token sinh hợp lệ, vai trò CUSTOMER, bảo mật password thành công.
* **Trạng thái:** **PASS**

#### TC-AUTH-04: Đăng nhập vai trò STAFF chuẩn
* **Mã Yêu Cầu:** `FR-01`, `NFR-01`
* **Tác nhân:** Nhân viên rạp (`STAFF`)
* **Tiền điều kiện:** Tài khoản `minhanh@aicinema.vn` có quyền nhân viên.
* **Các bước thực hiện:**
  1. Gửi request `POST /api/v1/auth/login` với `{ "email": "minhanh@aicinema.vn", "password": "123456" }`.
* **Kết quả mong đợi:** HTTP 200 OK, `user.role === "STAFF"`, cấp Token quản lý quầy vé.
* **Kết quả thực tế:** HTTP 200, Nhân viên "Lê Minh Anh" đăng nhập thành công.
* **Trạng thái:** **PASS**

#### TC-AUTH-05: Đăng nhập vai trò ADMIN chuẩn
* **Mã Yêu Cầu:** `FR-01`, `NFR-01`
* **Tác nhân:** Quản trị viên (`ADMIN`)
* **Tiền điều kiện:** Tài khoản `admin@aicinema.vn` tồn tại.
* **Các bước thực hiện:**
  1. Gửi request `POST /api/v1/auth/login` với `{ "email": "admin@aicinema.vn", "password": "admin123" }`.
* **Kết quả mong đợi:** HTTP 200 OK, `user.role === "ADMIN"`, cấp quyền tối cao.
* **Kết quả thực tế:** HTTP 200, Quản trị viên "Nguyễn Quang Huy" đăng nhập thành công.
* **Trạng thái:** **PASS**

#### TC-AUTH-06: Kiểm tra ranh giới RBAC: Chặn 403 FORBIDDEN khi vượt quyền
* **Mã Yêu Cầu:** `FR-16`, `NFR-01`
* **Tác nhân:** `CUSTOMER` và `STAFF`
* **Tiền điều kiện:** Đã có token của Customer và Staff.
* **Các bước thực hiện:**
  1. Customer Token gọi `POST /api/v1/bookings/check-in` (yêu cầu quyền `bookings.scan`).
  2. Customer Token gọi `GET /api/v1/admin/users` (yêu cầu quyền `users.manage`).
  3. Staff Token gọi `GET /api/v1/admin/daily-report` (yêu cầu quyền `analytics.read`).
* **Kết quả mong đợi:** Cả 3 request đều phải bị chặn với mã trạng thái HTTP 403 Forbidden.
* **Kết quả thực tế:** Cả 3 request đều trả về HTTP 403 chính xác với thông điệp từ chối quyền truy cập.
* **Trạng thái:** **PASS**

---

### PHÂN HỆ 2: DANH MỤC PHIM, LỊCH CHIẾU & SƠ ĐỒ GHẾ

#### TC-CAT-01: Lấy toàn bộ danh sách phim (Đang chiếu / Sắp chiếu)
* **Mã Yêu Cầu:** `FR-03`
* **Tác nhân:** Bất kỳ (`CUSTOMER`, `STAFF`, `ADMIN`)
* **Tiền điều kiện:** Dữ liệu phim đã được nạp.
* **Các bước thực hiện:** Gửi `GET /api/v1/movies`.
* **Kết quả mong đợi:** HTTP 200 OK, mảng dữ liệu có tối thiểu 6 phim.
* **Kết quả thực tế:** HTTP 200 OK, trả về 14 bộ phim đầy đủ poster, rating, thể loại.
* **Trạng thái:** **PASS**

#### TC-CAT-02: Lọc phim theo trạng thái NOW_SHOWING & Phân trang
* **Mã Yêu Cầu:** `FR-03`
* **Tác nhân:** Khách hàng
* **Tiền điều kiện:** Có phim đang chiếu.
* **Các bước thực hiện:** Gửi `GET /api/v1/movies?status=NOW_SHOWING&page=1&limit=4`.
* **Kết quả mong đợi:** HTTP 200 OK, `pagination.page === 1`, tất cả phim trả về có `status === "NOW_SHOWING"`.
* **Kết quả thực tế:** HTTP 200 OK, 4 phim hiển thị trên trang 1 trên tổng số 8 phim đang chiếu.
* **Trạng thái:** **PASS**

#### TC-CAT-03: Tìm kiếm phim theo từ khóa & lọc thể loại Hành động
* **Mã Yêu Cầu:** `FR-03`
* **Tác nhân:** Khách hàng
* **Tiền điều kiện:** Có phim hành động trong catalog.
* **Các bước thực hiện:** Gửi `GET /api/v1/movies?genre=Hành động`.
* **Kết quả mong đợi:** HTTP 200 OK, tất cả phim trả về chứa thể loại "Hành động".
* **Kết quả thực tế:** HTTP 200 OK, lọc chính xác 4 phim hành động.
* **Trạng thái:** **PASS**

#### TC-CAT-04: Lấy danh sách suất chiếu của phim mov-01 (Dune 2)
* **Mã Yêu Cầu:** `FR-04`
* **Tác nhân:** Khách hàng
* **Tiền điều kiện:** Phim `mov-01` đã được xếp lịch chiếu.
* **Các bước thực hiện:** Gửi `GET /api/v1/showtimes?movieId=mov-01`.
* **Kết quả mong đợi:** HTTP 200 OK, mảng danh sách suất chiếu gắn liền với phòng và giờ chiếu.
* **Kết quả thực tế:** HTTP 200 OK, trả về 5 suất chiếu hợp lệ.
* **Trạng thái:** **PASS**

#### TC-CAT-05: Tải sơ đồ ghế ngồi của suất chiếu st-101
* **Mã Yêu Cầu:** `FR-04`, `FR-05`
* **Tác nhân:** Khách hàng
* **Tiền điều kiện:** Suất chiếu `st-101` tồn tại.
* **Các bước thực hiện:** Gửi `GET /api/v1/showtimes/st-101/seats`.
* **Kết quả mong đợi:** HTTP 200 OK, mảng danh sách ghế có cấu trúc phân loại `STANDARD`, `VIP`, `SWEETBOX`, trạng thái ghế `AVAILABLE/LOCKED/BOOKED`.
* **Kết quả thực tế:** HTTP 200 OK, 80 ghế phòng chiếu được render đầy đủ tỷ lệ giá.
* **Trạng thái:** **PASS**

---

### PHÂN HỆ 3: KHÓA GHẾ CONCURRENCY TTL 10 PHÚT & THANH TOÁN QR

#### TC-BOOK-01: User A khóa ghế D5, D6 thành công (TTL 10 phút)
* **Mã Yêu Cầu:** `FR-05`, `NFR-02`
* **Tác nhân:** Khách hàng A (`customerUser`)
* **Tiền điều kiện:** Ghế D5, D6 đang ở trạng thái `AVAILABLE`.
* **Các bước thực hiện:**
  1. Gửi request `POST /api/v1/bookings/lock-seats`.
  2. Payload: `{ "showtimeId": "st-101", "seatIds": ["D5", "D6"], "userId": "user_guest" }`.
* **Kết quả mong đợi:** HTTP 200 OK, `status: "SUCCESS"`, `ttlSeconds === 600`.
* **Kết quả thực tế:** HTTP 200, ghế được đưa vào Map khóa tạm trong 600 giây.
* **Trạng thái:** **PASS**

#### TC-BOOK-02: User B cố tình khóa trùng ghế D5 -> Nhận 409 CONFLICT
* **Mã Yêu Cầu:** `FR-05`, `NFR-02`
* **Tác nhân:** Khách hàng B (Người dùng khác)
* **Tiền điều kiện:** Ghế D5 đang bị User A giữ chỗ.
* **Các bước thực hiện:**
  1. Gửi request `POST /api/v1/bookings/lock-seats` với `seatIds: ["D5", "D7"]` và `userId: "user_other"`.
* **Kết quả mong đợi:** HTTP 409 Conflict, `status: "CONFLICT"`, `conflictSeats` chứa `D5`.
* **Kết quả thực tế:** HTTP 409 Conflict, hệ thống ngăn chặn xung đột giữ chỗ thành công.
* **Trạng thái:** **PASS**

#### TC-BOOK-03: Lấy danh mục Combo Bắp Nước Concession
* **Mã Yêu Cầu:** `FR-06`
* **Tác nhân:** Khách hàng
* **Các bước thực hiện:** Gửi `GET /api/v1/combos`.
* **Kết quả mong đợi:** HTTP 200 OK, danh sách combos F&B (`cb-01`, `cb-02`, `cb-03`).
* **Kết quả thực tế:** HTTP 200 OK, trả về 4 combo bắp nước chuẩn CGV.
* **Trạng thái:** **PASS**

#### TC-BOOK-04: User A thanh toán đơn vé D5, D6 kèm Combo F&B
* **Mã Yêu Cầu:** `FR-07`, `NFR-05`
* **Tác nhân:** Khách hàng A
* **Tiền điều kiện:** Đang giữ khóa ghế D5, D6.
* **Các bước thực hiện:**
  1. Gửi request `POST /api/v1/payments/checkout`.
  2. Payload: `{ "showtimeId": "st-101", "seatIds": ["D5", "D6"], "userId": "user_guest", "comboIds": ["cb-01"] }`.
* **Kết quả mong đợi:** HTTP 200 OK, `status: "SUCCESS"`, trả về mã đặt vé `CGV-XXXXXX` và chuỗi `qrToken`.
* **Kết quả thực tế:** HTTP 200, mã vé `CGV-496022` và `qrToken` được sinh tức thì, tổng tiền: 464.000đ.
* **Trạng thái:** **PASS**

#### TC-BOOK-05: Xác nhận trạng thái ghế D5, D6 đã chuyển sang BOOKED
* **Mã Yêu Cầu:** `FR-05`, `NFR-05`
* **Tác nhân:** Hệ thống
* **Tiền điều kiện:** Thanh toán thành công tại `TC-BOOK-04`.
* **Các bước thực hiện:** Gửi `GET /api/v1/showtimes/st-101/seats`.
* **Kết quả mong đợi:** Ghế D5 và D6 có `status === "BOOKED"`.
* **Kết quả thực tế:** Ghế D5 và D6 chuyển sang BOOKED chính xác, không thể chọn lại.
* **Trạng thái:** **PASS**

#### TC-BOOK-06: Kiểm tra tích lũy chi tiêu & điểm thưởng CGV Membership
* **Mã Yêu Cầu:** `FR-02`, `FR-07`
* **Tác nhân:** Khách hàng A
* **Các bước thực hiện:** Gửi `GET /api/v1/users/{userId}/profile`.
* **Kết quả mong đợi:** `totalSpent` tăng thêm giá trị đơn hàng, `points` được cộng tương ứng.
* **Kết quả thực tế:** Chi tiêu cập nhật lên 3.114.000đ, điểm thưởng đạt 1714 điểm.
* **Trạng thái:** **PASS**

#### TC-BOOK-07: Cố thanh toán ghế chưa khóa / người khác giữ -> Chặn 409
* **Mã Yêu Cầu:** `FR-07`, `NFR-02`
* **Tác nhân:** Kẻ gian lận
* **Các bước thực hiện:** Gửi `POST /api/v1/payments/checkout` với ghế A1 chưa hề được khóa.
* **Kết quả mong đợi:** HTTP 409 Conflict.
* **Kết quả thực tế:** HTTP 409 Conflict, từ chối thanh toán ghế không hợp lệ.
* **Trạng thái:** **PASS**

---

### PHÂN HỆ 4: QUẦY POS SOÁT VÉ & CHECK-IN QR CHỐNG GIAN LẬN

#### TC-POS-01: Nhân viên rạp (STAFF) soát vé QR thành công lần đầu
* **Mã Yêu Cầu:** `FR-11`, `NFR-05`
* **Tác nhân:** Nhân viên rạp (`STAFF`)
* **Tiền điều kiện:** Vé `CGV-496022` ở trạng thái `PAID`.
* **Các bước thực hiện:**
  1. Gửi request `POST /api/v1/bookings/check-in` kèm Staff Bearer Token.
  2. Payload: `{ "code": "CGV-496022" }`.
* **Kết quả mong đợi:** HTTP 200 OK, `status: "SUCCESS"`, ghi nhận `checkedInAt` và `checkedInBy: "Lê Minh Anh"`.
* **Kết quả thực tế:** HTTP 200 OK, vé chuyển trạng thái sang `CHECKED_IN` thành công.
* **Trạng thái:** **PASS**

#### TC-POS-02: Quét lại chính mã vé đó lần 2 -> Chặn ALREADY_CHECKED_IN
* **Mã Yêu Cầu:** `FR-11`, `NFR-05`
* **Tác nhân:** Khách gian lận / Nhân viên quét nhầm
* **Tiền điều kiện:** Vé đã check-in tại `TC-POS-01`.
* **Các bước thực hiện:** Gửi lại request `POST /api/v1/bookings/check-in` với cùng mã vé đó.
* **Kết quả mong đợi:** HTTP 400 Bad Request, `status: "ALREADY_CHECKED_IN"`, cảnh báo vé đã sử dụng.
* **Kết quả thực tế:** HTTP 400, hệ thống từ chối cho phép vào rạp, cảnh báo chống gian lận chính xác.
* **Trạng thái:** **PASS**

#### TC-POS-03: Soát vé với mã không tồn tại -> Báo lỗi 404 NOT_FOUND
* **Mã Yêu Cầu:** `FR-11`
* **Tác nhân:** Nhân viên rạp
* **Các bước thực hiện:** Gửi `POST /api/v1/bookings/check-in` với `code: "CGV-FAKE-999999"`.
* **Kết quả mong đợi:** HTTP 404 Not Found.
* **Kết quả thực tế:** HTTP 404 Not Found, thông báo không tìm thấy mã vé.
* **Trạng thái:** **PASS**

#### TC-POS-04: Staff & Admin tra cứu danh sách toàn bộ vé đã đặt
* **Mã Yêu Cầu:** `FR-12`
* **Tác nhân:** Nhân viên rạp
* **Các bước thực hiện:** Gửi `GET /api/v1/admin/bookings?page=1&limit=5` kèm Staff Token.
* **Kết quả mong đợi:** HTTP 200 OK, trả về danh sách phân trang và thống kê doanh thu `summary.totalRevenue`.
* **Kết quả thực tế:** HTTP 200 OK, tổng hợp doanh thu và số vé chính xác.
* **Trạng thái:** **PASS**

#### TC-POS-05: Khách hàng tra cứu trạng thái đơn vé qua cổng CSKH
* **Mã Yêu Cầu:** `FR-08`, `FR-13`
* **Tác nhân:** Khách hàng
* **Các bước thực hiện:** Gửi `GET /api/v1/support/booking-status/{bookingCode}`.
* **Kết quả mong đợi:** HTTP 200 OK, `found === true`, hiển thị thông tin phim và suất chiếu.
* **Kết quả thực tế:** HTTP 200 OK, trả về thông tin vé phim "Dune 2".
* **Trạng thái:** **PASS**

#### TC-POS-06: Khách hàng xem lịch sử các vé đã đặt cá nhân
* **Mã Yêu Cầu:** `FR-08`
* **Tác nhân:** Khách hàng
* **Các bước thực hiện:** Gửi `GET /api/v1/users/{userId}/bookings?page=1&limit=5`.
* **Kết quả mong đợi:** HTTP 200 OK, mảng danh sách vé của riêng khách hàng.
* **Kết quả thực tế:** HTTP 200 OK, tải chính xác 4 vé trong lịch sử cá nhân.
* **Trạng thái:** **PASS**

---

### PHÂN HỆ 5: HOÀN VÉ TỰ ĐỘNG 3 MỐC THỜI GIAN (CUSTOMER SERVICE AGENT)

#### TC-REF-01: Đặt vé chuẩn bị test hoàn vé mốc > 24h
* **Mã Yêu Cầu:** `FR-13`
* **Tác nhân:** Khách hàng
* **Tiền điều kiện:** Suất chiếu `st-test-future-24h` cách hiện tại 48 giờ.
* **Các bước thực hiện:** Khóa ghế A1 và thanh toán vé thành công.
* **Kết quả mong đợi:** Vé được khởi tạo và ghi nhận trạng thái `PAID`.
* **Kết quả thực tế:** Sinh mã vé `CGV-496065` thành công.
* **Trạng thái:** **PASS**

#### TC-REF-02: Hoàn vé mốc > 24h trước suất chiếu -> Hoàn 100% giá trị
* **Mã Yêu Cầu:** `FR-13`, `NFR-05`
* **Tác nhân:** Khách hàng
* **Tiền điều kiện:** Suất chiếu cách hiện tại > 24 giờ.
* **Các bước thực hiện:** Gửi `POST /api/v1/support/refund` với mã vé `CGV-496065`.
* **Kết quả mong đợi:** HTTP 200 OK, `approved === true`, `refundRate === "100%"`, số tiền hoàn bằng 100% giá gốc.
* **Kết quả thực tế:** HTTP 200, duyệt hoàn 100% (120.000đ), chính sách "> 24 giờ trước suất chiếu".
* **Trạng thái:** **PASS**

#### TC-REF-03: Kiểm tra ghế A1 của suất chiếu tương lai quay về AVAILABLE
* **Mã Yêu Cầu:** `FR-05`, `FR-13`, `NFR-05`
* **Tác nhân:** Hệ thống
* **Tiền điều kiện:** Đơn vé vừa hoàn tại `TC-REF-02`.
* **Các bước thực hiện:** Gửi `GET /api/v1/showtimes/st-test-future-24h/seats`.
* **Kết quả mong đợi:** Ghế A1 phải quay lại trạng thái `AVAILABLE`.
* **Kết quả thực tế:** Ghế A1 đã được giải phóng thành công, mở bán lại cho khách khác.
* **Trạng thái:** **PASS**

#### TC-REF-04: Đặt vé chuẩn bị test hoàn vé mốc 2h - 24h
* **Mã Yêu Cầu:** `FR-13`
* **Tác nhân:** Khách hàng
* **Tiền điều kiện:** Suất chiếu `st-test-mid-10h` cách hiện tại 10 giờ.
* **Các bước thực hiện:** Khóa ghế B1 và thanh toán vé thành công.
* **Kết quả mong đợi:** Sinh vé `CGV-496069`.
* **Kết quả thực tế:** Sinh vé thành công.
* **Trạng thái:** **PASS**

#### TC-REF-05: Hoàn vé mốc 2h - 24h trước suất chiếu -> Hoàn 50% giá trị
* **Mã Yêu Cầu:** `FR-13`
* **Tác nhân:** Khách hàng
* **Tiền điều kiện:** Suất chiếu cách hiện tại trong khoảng 2h đến 24h.
* **Các bước thực hiện:** Gửi `POST /api/v1/support/refund` với mã vé `CGV-496069`.
* **Kết quả mong đợi:** HTTP 200 OK, `approved === true`, `refundRate === "50%"`, hoàn đúng 50% tiền vé.
* **Kết quả thực tế:** HTTP 200, duyệt hoàn 50% (60.000đ), chính sách "Từ 2 - 24 giờ trước suất chiếu".
* **Trạng thái:** **PASS**

#### TC-REF-06: Hoàn vé mốc < 2h trước suất chiếu -> Từ chối hoàn vé (0%)
* **Mã Yêu Cầu:** `FR-13`
* **Tác nhân:** Khách hàng
* **Tiền điều kiện:** Suất chiếu `st-test-past-1h` cách hiện tại 1 giờ (< 2h).
* **Các bước thực hiện:** Gửi `POST /api/v1/support/refund` yêu cầu hoàn vé.
* **Kết quả mong đợi:** HTTP 200 OK, `approved === false`, `refundAmount === 0`, thông báo từ chối hoàn vé.
* **Kết quả thực tế:** HTTP 200, `approved === false`, thông báo "Chính sách không hỗ trợ hoàn vé trong vòng 2 giờ trước suất chiếu", ghế C1 giữ nguyên trạng thái `BOOKED`.
* **Trạng thái:** **PASS**

---

### PHÂN HỆ 6: HỆ SINH THÁI 5 AI AGENTS & CHỊU LỖI FALLBACK

#### TC-AI-01: Kiểm tra trạng thái Gemini AI & Engine Đang Kích Hoạt
* **Mã Yêu Cầu:** `FR-09`, `NFR-04`
* **Tác nhân:** Toàn hệ thống
* **Các bước thực hiện:** Gửi `GET /api/v1/ai/status`.
* **Kết quả mong đợi:** HTTP 200 OK, trả về `activeEngine` (Google Gemini AI hoặc Rule-based NLU Offline).
* **Kết quả thực tế:** HTTP 200 OK, cơ chế Fallback hoạt động ổn định khi Offline.
* **Trạng thái:** **PASS**

#### TC-AI-02: Chatbot AI: Trả lời tự nhiên & sinh suggestedAction
* **Mã Yêu Cầu:** `FR-09`
* **Tác nhân:** Khách hàng
* **Các bước thực hiện:** Gửi `POST /api/v1/ai/chat` với tin nhắn `"Tôi muốn xem phim Dune 2 tối nay"`.
* **Kết quả mong đợi:** HTTP 200 OK, `reply` có ý nghĩa, nhận diện đúng thực thể phim và sinh `suggestedAction` mở modal đặt vé.
* **Kết quả thực tế:** HTTP 200 OK, AI phân tích đúng tên phim và tìm thấy 5 suất chiếu kèm nút bấm đặt vé nhanh.
* **Trạng thái:** **PASS**

#### TC-AI-03: RecommendationAgent: Thuật toán Hybrid & Match %
* **Mã Yêu Cầu:** `FR-10`
* **Tác nhân:** Khách hàng
* **Các bước thực hiện:** Gửi `GET /api/v1/ai/recommendations?userId=user_001`.
* **Kết quả mong đợi:** HTTP 200 OK, model `Hybrid_NCF_PhoBERT_v2.4`, có điểm `matchPercentage` và lý do `recommendationReason`.
* **Kết quả thực tế:** HTTP 200 OK, Top 1: Dune 2 (Trùng khớp 80%), lý do: "Phù hợp với gu phim Khoa học viễn tưởng & Hành động của bạn".
* **Trạng thái:** **PASS**

#### TC-AI-04: RecommendationAgent: Tìm phim tương tự theo Embedding
* **Mã Yêu Cầu:** `FR-10`
* **Tác nhân:** Khách hàng
* **Các bước thực hiện:** Gửi `GET /api/v1/ai/similar-movies/mov-01?limit=3`.
* **Kết quả mong đợi:** HTTP 200 OK, trả về danh sách phim có độ tương đồng cao nhất với Dune 2.
* **Kết quả thực tế:** HTTP 200 OK, gợi ý Oppenheimer, Godzilla x Kong, Kung Fu Panda 4.
* **Trạng thái:** **PASS**

#### TC-AI-05: BookingAgent: Gợi ý cụm ghế tối ưu & Áp voucher HSSV20 (-20%)
* **Mã Yêu Cầu:** `FR-18`
* **Tác nhân:** Khách hàng
* **Các bước thực hiện:** Gửi `POST /api/v1/ai/booking-assist` với yêu cầu 2 ghế VIP và mã giảm giá `HSSV20`.
* **Kết quả mong đợi:** HTTP 200 OK, gợi ý 2 ghế liền nhau tại hàng D/E/F, chiết khấu 20% vào tổng tiền vé.
* **Kết quả thực tế:** HTTP 200 OK, gợi ý ghế D1, D2, áp mã HSSV20 giảm chính xác -75.000đ.
* **Trạng thái:** **PASS**

#### TC-AI-06: AdminAnalyticsAgent: Báo cáo KPI, LightGBM Dự báo & Lịch chiếu
* **Mã Yêu Cầu:** `FR-17`, `FR-18`
* **Tác nhân:** Quản trị viên (`ADMIN`)
* **Các bước thực hiện:**
  1. Gửi `GET /api/v1/admin/daily-report`.
  2. Gửi `GET /api/v1/ai/demand-forecast`.
  3. Gửi `GET /api/v1/admin/optimal-schedule`.
* **Kết quả mong đợi:** HTTP 200 OK cho cả 3 endpoint, đủ 6 khung giờ dự báo nhu cầu bằng mô hình LightGBM.
* **Kết quả thực tế:** HTTP 200 OK cho cả 3 APIs, tỷ lệ dự báo khung giờ vàng đạt 68% lấp đầy.
* **Trạng thái:** **PASS**

---

### PHÂN HỆ 7: QUẢN TRỊ ADMIN CRUD & HIỆU NĂNG HỆ THỐNG

#### TC-ADM-01: Admin tạo mới phim điện ảnh (CRUD Movie)
* **Mã Yêu Cầu:** `FR-14`
* **Tác nhân:** Quản trị viên (`ADMIN`)
* **Các bước thực hiện:** Gửi `POST /api/v1/admin/movies` thêm phim "Avatar: Dòng Chảy Của Nước" kèm Admin Token.
* **Kết quả mong đợi:** HTTP 201 Created, sinh ID phim mới `mov-XXXX`.
* **Kết quả thực tế:** HTTP 201 Created, thêm thành công phim Avatar (ID: `mov-6088`).
* **Trạng thái:** **PASS**

#### TC-ADM-02: Admin tạo mới suất chiếu cho phim vừa tạo (CRUD Showtime)
* **Mã Yêu Cầu:** `FR-15`
* **Tác nhân:** Quản trị viên (`ADMIN`)
* **Các bước thực hiện:** Gửi `POST /api/v1/admin/showtimes` cho phim vừa tạo với định dạng IMAX.
* **Kết quả mong đợi:** HTTP 201 Created, sinh ID suất chiếu `st-XXXX`.
* **Kết quả thực tế:** HTTP 201 Created, tạo thành công suất chiếu `st-96090` tại phòng `room-01`.
* **Trạng thái:** **PASS**

#### TC-ADM-03: Admin quản lý danh sách người dùng & phân trang
* **Mã Yêu Cầu:** `FR-16`, `NFR-01`
* **Tác nhân:** Quản trị viên (`ADMIN`)
* **Các bước thực hiện:** Gửi `GET /api/v1/admin/users?page=1&limit=5` kèm Admin Token.
* **Kết quả mong đợi:** HTTP 200 OK, trả về danh sách người dùng phân trang, ẩn hoàn toàn trường `password`.
* **Kết quả thực tế:** HTTP 200 OK, tổng cộng 8 tài khoản, password được ẩn an toàn 100%.
* **Trạng thái:** **PASS**

#### TC-PERF-01: Đo thời gian phản hồi API nghiệp vụ (< 200ms) & Chịu lỗi Dual-Mode
* **Mã Yêu Cầu:** `NFR-03`, `NFR-04`
* **Tác nhân:** Toàn hệ thống
* **Các bước thực hiện:** Đo thời gian phản hồi liên tiếp các API: `GET /movies`, `GET /showtimes/:id/seats`, `GET /combos`, `GET /ai/recommendations`.
* **Kết quả mong đợi:** Thời gian phản hồi cho mỗi request < 200ms (SLA cam kết).
* **Kết quả thực tế:** Tất cả các request đều phản hồi trong **1ms - 6ms** (vượt xa chỉ tiêu SLA).
* **Trạng thái:** **PASS**

---

# PHẦN 3: KẾT LUẬN & ĐÁNH GIÁ CHẤT LƯỢNG

Toàn bộ **40/40 Test Cases** đã được kiểm thử tự động thành công thông qua file script [cinema-e2e.test.js](file:///c:/Users/Admin/OneDrive/Tài%20liệu/Hệ-Thống-Quản-Lý-Rạp-Chiếu-Phim/backend/tests/cinema-e2e.test.js), đạt **tỷ lệ thành công tuyệt đối 100%**. Hệ thống sẵn sàng vận hành trên môi trường thực tế và bảo vệ đồ án tốt nghiệp.
