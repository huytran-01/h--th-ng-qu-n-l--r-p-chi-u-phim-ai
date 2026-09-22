# HỆ THỐNG QUẢN LÝ RẠP CHIẾU PHIM TÍCH HỢP TRÍ TUỆ NHÂN TẠO (AI)
### Đồ án Tốt nghiệp / Môn học Ứng dụng Trí tuệ Nhân tạo & Kỹ thuật Phần mềm

Dự án là một giải pháp Full-stack hoàn chỉnh bao gồm **Backend RESTful API** và **Frontend Single Page Application** chuẩn giao diện rạp chiếu phim hiện đại (Cinema Dark Theme), tích hợp sâu 3 mô hình Trí tuệ Nhân tạo cốt lõi:
1. **Gợi ý phim cá nhân hóa (Hybrid Recommendation Engine):** Kết hợp sở thích cá nhân, thể loại và độ thịnh hành phòng vé.
2. **Trợ lý ảo Chatbot AI 24/7 (NLU Tiếng Việt):** Bóc tách ý định (*Intent*) và thực thể (*Entities: tên phim, ngày, giờ, phòng IMAX, số lượng vé*), hỗ trợ đặt vé và chọn ghế trực tiếp trong khung trò chuyện.
3. **Mô hình Dự báo Nhu cầu Khán giả (Demand Forecasting):** Dự báo tỷ lệ lấp đầy ghế theo từng khung giờ và đưa ra khuyến nghị phân bổ phòng chiếu tối ưu cho Ban Quản lý.

---

## 1. Hướng dẫn Khởi chạy Nhanh (1-Click Run)

### Cách 1: Sử dụng File Khởi chạy Tự động (Khuyên dùng trên Windows)
- Nhấp đúp chuột vào file: **`start_app.bat`** tại thư mục gốc của dự án.
- Hệ thống sẽ tự động khởi động máy chủ Backend tại cổng `5000` và tự động mở trình duyệt web hiển thị giao diện tại: **`http://localhost:5000`**.

### Cách 2: Khởi chạy bằng Dòng lệnh (Command Line)
```bash
# Di chuyển vào thư mục backend và cài đặt thư viện (nếu chưa cài)
cd backend
npm install

# Khởi chạy server
npm start
```
- Mở trình duyệt và truy cập: **`http://localhost:5000`**

---

## 2. Danh mục Chức năng Hoàn chỉnh Đã Triển khai

### 1. Phân hệ Khách hàng (Frontend Web App)
- **Trang chủ & Banner Bom Tấn:** Hiển thị trailer, thông tin phim, độ tuổi, điểm đánh giá IMDb.
- **Khối "Gợi ý dành riêng cho bạn" (AI Powered):** Hiển thị điểm số tương đồng (Match %), lý do đề xuất tự nhiên ("Phù hợp với gu phim Khoa học viễn tưởng của bạn").
- **Bộ lọc Thể loại:** Lọc nhanh phim Hành động, Khoa học viễn tưởng, Tâm lý, Kinh dị.
- **Sơ đồ Chọn ghế Thời gian thực (Interactive Seat Map):**
  - Màn hình cong chiếu phát sáng (*Curved Cinema Screen*).
  - Ma trận ghế đa dạng: Ghế Thường (110k), Ghế VIP (138k), Ghế Đôi Sweetbox (165k).
  - **Cơ chế Khóa ghế Phân tán (Redis-compatible Distributed Lock):** Khi chọn ghế và bấm giữ chỗ, hệ thống khóa tạm thời 10 phút, kích hoạt **Đồng hồ đếm ngược 10:00** thời gian thực, ngăn chặn tình trạng đặt trùng ghế.
  - Chọn thêm Combo bắp rang bơ và nước ngọt (F&B Add-ons).
- **Cổng Thanh toán Điện tử & Xuất vé QR Động:**
  - Mô phỏng cổng thanh toán VNPay QR Code.
  - Sau khi thanh toán thành công, hiệu ứng pháo hoa chúc mừng xuất hiện và phát hành **Vé điện tử (E-Ticket)** kèm mã QR động có thể quét kiểm tra.

### 2. Trợ lý ảo Chatbot AI 24/7 (Floating Widget)
- Nút tròn nổi ở góc dưới bên phải màn hình.
- Thấu hiểu ngôn ngữ tự nhiên tiếng Việt:
  - Gõ: *"Gợi ý phim hot"* -> Bot phân tích và trả về các phim phù hợp nhất kèm nút đặt vé nhanh.
  - Gõ: *"Tìm cho mình 2 vé phim Dune 2 tối mai phòng IMAX"* -> Bot tự động bóc tách thực thể và hiển thị thẻ chọn suất chiếu/ghế trực tiếp trong chat!
  - Gõ: *"Giá vé học sinh sinh viên?"* -> Bot giải đáp tự động chính sách rạp.

### 3. Bảng Điều hành Quản trị & Dự báo AI (Admin Dashboard)
- Nhấn vào menu **"Quản Trị & Dự Báo AI"** trên thanh điều hướng.
- Xem chỉ số KPI: Tổng vé bán, doanh thu ước tính, tỷ lệ lấp đầy ghế.
- **Biểu đồ Cột Dự báo Nhu cầu Khán giả (Chart.js):** Dự đoán tỷ lệ lấp đầy theo 6 ca chiếu trong ngày, làm nổi bật khung giờ vàng (19:00 - 21:30) đạt 94%.
- **Đề xuất Lịch chiếu Tối ưu:** AI gợi ý chuyển phim hot sang phòng chiếu lớn (IMAX 80 ghế) và nút *"Phê duyệt & Xuất bản Lịch chiếu AI"*.

---

## 3. Danh mục API Endpoints (Backend RESTful)

| Phương thức | Đường dẫn API | Chức năng nghiệp vụ |
| :--- | :--- | :--- |
| `GET` | `/api/v1/movies` | Lấy danh sách toàn bộ phim đang chiếu |
| `GET` | `/api/v1/movies/:id` | Lấy thông tin chi tiết một bộ phim |
| `GET` | `/api/v1/showtimes?movieId=...` | Lấy danh sách suất chiếu của phim |
| `GET` | `/api/v1/showtimes/:id/seats` | Lấy sơ đồ ghế và trạng thái khóa thời gian thực |
| `POST` | `/api/v1/bookings/lock-seats` | Khóa ghế tạm thời trong 10 phút (TTL: 600s) |
| `POST` | `/api/v1/payments/checkout` | Xác nhận thanh toán & Phát hành vé điện tử mã QR |
| `GET` | `/api/v1/combos` | Lấy danh sách combo bắp nước F&B |
| `GET` | `/api/v1/ai/recommendations` | Lấy danh sách phim AI gợi ý cá nhân hóa |
| `POST` | `/api/v1/ai/chat` | Chatbot NLU tiếng Việt bóc tách ý định & thực thể |
| `GET` | `/api/v1/ai/demand-forecast` | Lấy dữ liệu dự báo nhu cầu khán giả theo khung giờ |

---

## 4. Cấu trúc Mã nguồn Dự án

```text
he-thong-quan-ly-rap-chieu-phim/
├── backend/
│   ├── src/
│   │   ├── data/mockData.js          # Dữ liệu phim, rạp, phòng chiếu, suất chiếu, ghế
│   │   ├── services/
│   │   │   ├── seatLockService.js    # Quản lý khóa ghế 10 phút, chống xung đột
│   │   │   └── aiService.js          # AI Gợi ý lai, Chatbot NLU, Dự báo nhu cầu
│   │   └── server.js                 # Máy chủ Express & RESTful APIs (Port 5000)
│   └── package.json
├── frontend/
│   ├── index.html                    # Giao diện chính Single Page App (Cinema Dark Theme)
│   └── src/
│       └── app.js                    # Xử lý tương tác, gọi API, giỏ vé, Chatbot, Chart.js
├── start_app.bat                     # File 1-click khởi chạy toàn bộ hệ thống
├── DO_AN_TOT_NGHIEP_UNG_DUNG_AI.docx # Báo cáo đồ án Word môn Ứng dụng AI
├── TAP_SO_DO_UML_VA_THIET_KE_HE_THONG.docx # Bộ sưu tập 17 biểu đồ hệ thống Word
└── README.md
```
