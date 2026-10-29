---
name: cinema-functional-testing
description: >-
  Quy chuẩn kiểm thử chức năng, tích hợp API, kiểm thử đồng thời (Concurrency),
  phân quyền RBAC 3 tác nhân, Dual-Mode Database (MySQL 8.0 & In-Memory) và
  Hệ sinh thái 5 AI Agents cho Hệ thống Quản lý Rạp Chiếu Phim Tích hợp AI.
---

# Cinema Management System — Functional & AI Testing Skill Guide

Skill này định nghĩa toàn bộ kiến trúc đối chiếu và quy trình **Kiểm thử Chức năng Toàn diện (End-to-End Functional & Integration Testing)** cho dự án **Hệ thống Quản lý Rạp Chiếu Phim Tích hợp Trí tuệ Nhân tạo (AI-Powered Cinema Management System)**.

---

## 1. Kiến Trúc Hệ Thống & Phạm Vi Kiểm Thử (System Under Test)

### 1.1. Các Tầng Kiến Trúc (Layered Clean Architecture)
1. **Presentation Layer (Client SPA):**
   - Công nghệ: HTML5, CSS3, Tailwind CSS, Vanilla JavaScript (`app.js`), thư viện `qrcode.js`, `chart.js`.
   - Thành phần UI chính: Hero Banner, Thanh đặt vé nhanh 4 bước (Quick Booking), Danh mục phim (phân trang 8 phim/trang), Sơ đồ ghế thời gian thực kèm đồng hồ đếm ngược `10:00`, CGV AI Recommendation Studio, Hộp thoại AI Chatbot 24/7, Quầy POS Soát vé (`STAFF`), Dashboard Quản trị & AI Analytics (`ADMIN`).
2. **API & Gateway Layer (Node.js Express):**
   - Cổng mặc định: `PORT = 5000` (tự động chuyển `5005` nếu cổng 5000 bị chiếm dụng), Base URL: `/api/v1/{resource}`.
   - Bảo mật: Middleware `requirePermission()` kiểm tra Bearer Token (`cgv_...`) và phân quyền RBAC.
3. **Orchestration & Business Services Layer:**
   - `AuthService`: Quản lý `activeTokens` (Map), `login()`, `register()`, `verifyToken()`, `logout()`, sinh thẻ thành viên 16 số (`9999-XXXX-XXXX-XXXX`), tích điểm `points` / `cgv_points` (5% giá trị thanh toán) và xét nâng hạng thẻ `MEMBER -> VIP -> VVIP`.
   - `SeatLockService`: Quản lý `lockedSeats` (Map), `bookedSeats` (Map), hằng số `LOCK_TIMEOUT_SECONDS = 600` (10 phút). Gồm các hàm: `lockSeats()`, `confirmBooking()`, `releaseSeats()`, `releaseBookedSeats()`, `getSeatsStatus()`.
   - `AIService` (`aiService.js`): Tầng điều phối trung tâm cho 5 AI Agents.
4. **AI Multi-Agent Engines:**
   - `GeminiService`: Kết nối SDK `@google/genai` với cơ chế chịu lỗi đa mô hình (`gemini-flash-lite-latest`, `gemini-3.5-flash-lite`, `gemini-flash-latest`, `gemini-3.8-flash`). Tự động fallback về `Offline Rule-based NLU Engine` khi thiếu API Key hoặc mất mạng.
   - `RecommendationAgent`: Kết hợp Hybrid NCF + Content-Based + PhoBERT theo trọng số: Content-based (50%) + Collaborative Filtering (30%) + Trending Score (20%), kèm giải thích Explainable AI (`Match %` và lý do đề xuất minh bạch).
   - `BookingAgent`: Tìm suất chiếu theo khung giờ (`morning`, `afternoon`, `evening`), định dạng (`IMAX`, `3D`, `2D`), gợi ý cụm ghế liền kề tối ưu ở trung tâm rạp (`VIP`, `STANDARD`, `SWEETBOX`) và áp mã giảm giá (`HSSV20` -20%, `MEMBER10` -10%, `COUPLE15` -15%, `BIRTHDAY30` -30%).
   - `CustomerServiceAgent`: Tự động tra cứu vé và thẩm định hoàn/hủy vé theo mốc thời gian trước giờ chiếu (`> 24h`: hoàn 100%, `2h - 24h`: hoàn 50%, `< 2h`: từ chối) và tự động giải phóng ghế về `AVAILABLE`.
   - `AdminAnalyticsAgent`: Báo cáo KPI doanh thu ngày, dự báo nhu cầu lấp đầy ghế 6 khung giờ bằng mô hình chuỗi thời gian LightGBM và đề xuất lịch chiếu tối ưu (`getOptimalSchedule()`).
5. **Data Access Layer (Dual-Mode Database):**
   - `DbService` (`backend/src/services/dbService.js`): Tự động kết nối `MySQL Connection Pool (mysql2/promise)` tối đa 15 kết nối vào CSDL `cinema_db` (`utf8mb4_unicode_ci`, InnoDB, 8 bảng chuẩn 3NF, khởi tạo qua `backend/database/schema.sql` và `npm run db:init`).
   - Cơ chế chịu lỗi: Tự động chuyển đổi sang `In-Memory Mock Data Store` (`mockData.js`) nếu MySQL chưa bật hoặc mất kết nối.

---

## 2. Ma Trận Phân Quyền RBAC Cần Kiểm Thử

| Nhóm Chức Năng / API Endpoint | Khách hàng (`CUSTOMER`) | Nhân viên (`STAFF` / `MANAGER`) | Quản trị viên (`ADMIN`) |
|---|:---:|:---:|:---:|
| Đăng ký, Đăng nhập, Xem danh mục phim & Lịch chiếu | ✅ Cho phép | ✅ Cho phép | ✅ Cho phép |
| Đặt vé cá nhân, Khóa ghế 10p, Thanh toán QR (`lock-seats`, `checkout`) | ✅ Cho phép | ✅ Cho phép | ❌ Chặn (`403` - Điều hành hệ thống) |
| Xem hồ sơ cá nhân, Thẻ CGV Membership, AI Chat & Gợi ý phim | ✅ Cho phép | ✅ Cho phép | ✅ Cho phép |
| Tra cứu toàn bộ lịch sử đơn vé tại rạp (`GET /api/v1/admin/bookings`) | ❌ Chặn (`403`) | ✅ Cho phép | ✅ Cho phép |
| Quét mã QR / Soát vé Check-in (`POST /api/v1/bookings/check-in`) | ❌ Chặn (`403`) | ✅ Cho phép | ✅ Cho phép |
| Quản lý Danh mục Phim - CRUD (`POST/PUT/DELETE /api/v1/admin/movies`) | ❌ Chặn (`403`) | ❌ Chặn (`403`) | ✅ Cho phép |
| Quản lý Suất chiếu & Phòng chiếu - CRUD (`/api/v1/admin/showtimes`) | ❌ Chặn (`403`) | ❌ Chặn (`403`) | ✅ Cho phép |
| Quản lý Người dùng & Cấp quyền RBAC (`/api/v1/admin/users`) | ❌ Chặn (`403`) | ❌ Chặn (`403`) | ✅ Cho phép |
| Xem Báo cáo KPI & Phê duyệt Lịch chiếu AI (`/api/v1/admin/*`) | ❌ Chặn (`403`) | ❌ Chặn (`403`) | ✅ Cho phép |

### 2.1. Nhóm Kịch Bản Kiểm Thử Tách Biệt Giao Diện & Phân Quyền (Role-Based UI & RBAC Isolation)

1. **`TC_UI_ROLE_01`: Kiểm thử Vai trò Khách hàng (`CUSTOMER`)**
   - **Mục tiêu:** Xác nhận giao diện chỉ hiển thị Customer Portal, cô lập hoàn toàn màn hình nghiệp vụ POS và Admin.
   - **Quy trình:**
     + Đăng nhập tài khoản `CUSTOMER` (`customer@aicinema.vn`).
     + Hệ thống điều hướng vào `home-view`.
     + Hiển thị: Hero Banner, Quick Booking bar, Catalog phim & bộ lọc, sơ đồ chọn ghế, combo bắp nước, hồ sơ thẻ CGV, AI studio và AI chatbot 24/7.
     + Ẩn hoàn toàn: Quầy soát vé POS (`staff-view`), Dashboard Admin (`admin-view`), các nút điều hướng Staff/Admin trên Header & Dropdown menu.
     + Kiểm tra ranh giới API: Gọi `POST /api/v1/bookings/check-in` và `GET /api/v1/admin/users` bị chặn với HTTP 403 Forbidden.

2. **`TC_UI_ROLE_02`: Kiểm thử Vai trò Nhân viên rạp (`STAFF` Workspace)**
   - **Mục tiêu:** Xác nhận khi Staff đăng nhập, hệ thống tự động điều hướng vào Staff POS Portal, ẩn giao diện giải trí của khách và chặn truy cập Admin.
   - **Quy trình:**
     + Đăng nhập tài khoản `STAFF` (`minhanh@aicinema.vn`).
     + Hệ thống tự động chuyển thẳng vào `staff-view` (Quầy Vận Hành & Soát Vé).
     + Ẩn hoàn toàn: Hero Banner, Quick Booking Bar, Catalog phim của khách, AI Recommendation Studio và Chatbot khách hàng.
     + Thanh điều hướng hiển thị 3 nghiệp vụ chuyên trách: (1) Quét QR / Soát vé Check-in, (2) Tra cứu Lịch sử Đơn vé (10 vé/trang), (3) Hỗ trợ Hoàn/Hủy vé tự động (`CustomerServiceAgent`).
     + Kiểm tra ranh giới API: Gọi `POST /api/v1/admin/movies`, `POST /api/v1/admin/showtimes`, `GET /api/v1/admin/daily-report` bị chặn với HTTP 403 Forbidden.

3. **`TC_UI_ROLE_03`: Kiểm thử Vai trò Quản trị viên (`ADMIN` Workspace)**
   - **Mục tiêu:** Xác nhận khi Admin đăng nhập, hệ thống tự động điều hướng vào Admin Back-Office Dashboard, ẩn giao diện đặt vé cá nhân và chặn mua vé bằng tài khoản Admin.
   - **Quy trình:**
     + Đăng nhập tài khoản `ADMIN` (`admin@aicinema.vn`).
     + Hệ thống tự động chuyển thẳng vào `admin-view` (Trung tâm Quản trị Hệ thống).
     + Ẩn hoàn toàn giao diện đặt vé cá nhân của khách hàng.
     + Thanh điều hướng hiển thị 5 phân hệ cốt lõi: (1) Dashboard Báo cáo KPI, (2) Quản lý Phim CRUD, (3) Quản lý Suất chiếu CRUD & Chống trùng giờ, (4) Quản lý Người dùng & RBAC, (5) AI Analytics & Dự báo LightGBM.
     + Kiểm tra ranh giới API: Gọi `POST /api/v1/bookings/lock-seats` hoặc `POST /api/v1/payments/checkout` bằng token Admin bị chặn với HTTP 403 Forbidden kèm thông báo: *"Tài khoản Quản trị viên chỉ dùng cho mục đích điều hành hệ thống, không thực hiện đặt vé cá nhân"*.

---

## 3. Quy Tắc Kiểm Thử State Machine & Toàn Vẹn Dữ Liệu

### 3.1. State Machine Ghế Ngồi (`SeatLockService`)
```
[ AVAILABLE (Trống) ]
        │
        ├── Client gọi POST /api/v1/bookings/lock-seats
        ▼
[ LOCKED (Khóa tạm TTL 600s) ]
        │
        ├── [Xung đột Concurrency]: Client khác chọn cùng ghế ──► 409 CONFLICT
        ├── [Hết hạn TTL / Hủy]: Quá 600s không thanh toán ──► AVAILABLE
        │
        ├── [Thanh toán thành công]: POST /api/v1/payments/checkout
        ▼
[ BOOKED (Đã thanh toán) ]
        │
        └── [Hoàn vé duyệt]: POST /api/v1/support/refund ──► AVAILABLE (Mở bán lại)
```

### 3.2. State Machine Đơn Đặt Vé (Booking Lifecycle)
```
[ PENDING ] (Khởi tạo đơn hàng)
    │
    ├── Thanh toán thành công (checkout) ──► [ PAID / CONFIRMED ]
    │                                              │
    │   ┌──────────────────────────────────────────┴─────────────────────────┐
    │   ▼                                                                    ▼
    │ [ Quét mã QR tại quầy (check-in) ]                     [ Yêu cầu hoàn vé (refund) ]
    │   │                                                                    │
    │   ├── Lần 1: Thành công ──► [ CHECKED_IN ]                             ├── Cách suất chiếu > 24h: Hoàn 100% ──► [ REFUNDED ]
    │   │   (Lưu checkedInAt & checkedInBy)                                  ├── Cách suất chiếu 2h - 24h: Hoàn 50% ──► [ REFUNDED ]
    │   │                                                                    └── Cách suất chiếu < 2h: Từ chối hoàn vé (Giữ nguyên PAID)
    │   └── Lần 2: Quét lại chính mã vé đó
    │       ──► 400 ALREADY_CHECKED_IN (Chống gian lận)
    │
    └── Hết hạn thanh toán / Hủy ──► [ CANCELLED ]
```

---

## 4. Quy Trình Kiểm Thử 5 AI Agents & Fallback Chịu Lỗi

1. **`GeminiService` & `Offline Rule-based NLU` (`POST /api/v1/ai/chat`):**
   - Kiểm tra `GET /api/v1/ai/status` trả về trạng thái hoạt động của Gemini SDK.
   - Gửi câu hỏi tự nhiên về lịch chiếu phim. Đảm bảo response trả về `replyText` và `suggestedAction: { type: "BOOKING_MODAL", movieId: ... }`.
   - Cơ chế Fallback: Khi ngắt `GEMINI_API_KEY`, hệ thống tự động trả lời bằng mẫu câu rule-based mà không báo lỗi 500.
2. **`RecommendationAgent` (`GET /api/v1/ai/recommendations`):**
   - Xác nhận thuật toán `Hybrid_NCF_PhoBERT_v2.4`.
   - Tính toán điểm số `matchPercentage` kết hợp 50% Content + 30% Trend + 20% Quality.
   - Xác nhận có trường `recommendationReason` giải thích lý do đề xuất.
3. **`BookingAgent` (`POST /api/v1/ai/booking-assist`):**
   - Tự động gợi ý 2 hoặc 4 ghế liền kề nhau tại hàng ghế trung tâm (`VIP` hoặc `STANDARD`).
   - Kiểm tra áp dụng mã giảm giá: `HSSV20` (-20%), `MEMBER10` (-10%).
4. **`CustomerServiceAgent` (`POST /api/v1/support/refund`):**
   - Kiểm tra phân loại chính sách hoàn tiền 3 mốc thời gian:
     - > 24 giờ: duyệt hoàn 100%, giải phóng ghế về `AVAILABLE`.
     - 2h - 24 giờ: duyệt hoàn 50%, giải phóng ghế về `AVAILABLE`.
     - < 2 giờ: từ chối hoàn vé, ghế giữ nguyên trạng thái `BOOKED`.
5. **`AdminAnalyticsAgent` (`/api/v1/admin/daily-report`, `/api/v1/ai/demand-forecast`, `/api/v1/admin/optimal-schedule`):**
   - Báo cáo KPI: tỷ lệ lấp đầy ghế (Occupancy Rate), doanh thu vé, doanh thu combo.
   - Dự báo LightGBM: đủ 6 khung giờ trong ngày kèm dự báo tỷ lệ khách và nhãn giờ cao điểm.
   - Lịch chiếu tối ưu: danh sách đề xuất phân bổ phòng chiếu và giờ chiếu nhằm tối đa hóa doanh thu.

---

## 5. Quy Trình Kiểm Thử Dual-Mode Database (MySQL 8.0 & Fallback)

1. **Chế độ MySQL Server 8.0+ Online:**
   - Script khởi tạo: `npm run db:init` (thực thi `backend/database/schema.sql` và nạp dữ liệu mẫu).
   - Kiểm tra toàn vẹn quan hệ khóa ngoại (Foreign Keys), bảng mã `utf8mb4_unicode_ci` hỗ trợ đầy đủ tiếng Việt.
   - Kiểm tra Transaction ACID khi đặt vé: chèn `bookings`, `booking_seats`, `booking_combos` và cập nhật điểm `users` trong 1 giao dịch.
2. **Chế độ In-Memory Mock Data Fallback:**
   - Tắt kết nối MySQL (`USE_MYSQL=false` hoặc tắt service MySQL).
   - `DbService` tự động chuyển sang đọc/ghi dữ liệu từ `backend/src/data/mockData.js`.
   - Mọi API nghiệp vụ hoạt động bình thường, không gây sập ứng dụng.

---

## 6. Tiêu Chuẩn Đánh Giá Tự Động Hóa (Automation Acceptance Criteria)

| Tiêu Chí | Yêu Cầu Kỹ Thuật | Phương Pháp Đo |
| :--- | :--- | :--- |
| **Tỷ lệ Pass Test Cases** | **100% Pass** (40/40 Cases) | Chạy file `backend/tests/cinema-e2e.test.js` |
| **Thời gian phản hồi API** | Trung bình < 100ms, tối đa < 200ms | Đo thời gian Round-trip từng request |
| **Bảo mật dữ liệu** | Tuyệt đối không trả trường `password` | Kiểm tra regex và object assertion |
| **Chống xung đột Concurrency** | HTTP 409 Conflict khi trùng ghế | Hai request đồng thời chọn cùng ghế |
| **Chống tái sử dụng vé** | Chặn check-in lần 2 với HTTP 400 | Quét lại mã vé đã `CHECKED_IN` |
