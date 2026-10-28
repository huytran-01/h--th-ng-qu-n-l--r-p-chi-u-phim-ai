---
name: cinema-database-engineering
description: >-
  Hướng dẫn thiết kế, quản trị, tối ưu hóa và di chuyển dữ liệu MySQL 8.0+ cho hệ thống rạp chiếu phim:
  schema DDL UTF8MB4, thiết kế Indexing tăng tốc truy vấn, quản lý Connection Pool,
  xử lý Transaction ACID chống race condition khi đặt vé, kiểm soát kiến trúc Dual-Mode (MySQL + Fallback),
  và quy trình Migration/Backup dữ liệu.
---

# Cinema Database Engineering & Optimization — Skill Guide

Tài liệu này cung cấp hướng dẫn chuyên sâu về **Thiết kế, Tối ưu hóa, Quản trị và Bảo đảm Toàn vẹn Dữ liệu** trên nền tảng MySQL 8.0+ và kiến trúc Dual-Mode của hệ thống rạp chiếu phim.

---

## 1. Kiến Trúc & Cấu Hình Cơ Sở Dữ Liệu (MySQL 8.0+)

### 1.1. Tiêu chuẩn Kỹ thuật
* **RDBMS Engine**: MySQL Server 8.0+ (Storage Engine: `InnoDB` đảm bảo hỗ trợ ACID Transactions và Row-level Locking).
* **Bộ mã hóa (Charset & Collation)**:
  ```sql
  DEFAULT CHARACTER SET utf8mb4 DEFAULT COLLATE utf8mb4_unicode_ci;
  ```
  *Bảo đảm lưu trữ trọn vẹn tiếng Việt có dấu, ký tự đặc biệt, biểu tượng cảm xúc (Emoji) và poster metadata.*

### 1.2. Cấu hình Connection Pool (`backend/src/config/database.js`)
Hệ thống sử dụng thư viện `mysql2/promise` với mô hình Connection Pool để quản lý tài nguyên kết nối hiệu quả:
```javascript
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306"),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "cinema_db",
  waitForConnections: true,
  connectionLimit: 15,          // Giới hạn số connection đồng thời
  queueLimit: 0,                // Không giới hạn hàng đợi
  enableKeepAlive: true,        // Duy trì kết nối sống, giảm latency handshake
  keepAliveInitialDelay: 10000  // 10 giây
});
```

---

## 2. Thiết Kế Indexing & Tối Ưu Truy Vấn (Query Optimization)

Để đảm bảo thời gian phản hồi API < 50ms khi lượng bản ghi tăng cao, các chỉ mục (Indexes) được thiết kế có chủ đích:

### 2.1. Danh Sách Indexes Quan Trọng
| Bảng | Tên Index | Các Cột | Mục Đích Tối Ưu |
| :--- | :--- | :--- | :--- |
| `showtimes` | `idx_showtimes_movie_time` | `(movie_id, start_time)` | Tăng tốc tìm kiếm suất chiếu của một phim theo khung giờ chiếu. |
| `showtimes` | `idx_showtimes_room_time` | `(room_id, start_time)` | Kiểm tra xung đột lịch chiếu khi Admin tạo suất chiếu mới. |
| `bookings` | `idx_bookings_user_created` | `(user_id, created_at DESC)` | Tải lịch sử đặt vé của khách hàng theo thứ tự mới nhất. |
| `bookings` | `idx_bookings_status_time` | `(payment_status, created_at)` | Lọc các đơn vé thanh toán thành công để tính toán doanh thu KPI ngày. |
| `movies` | `idx_movies_hot_trending` | `(is_hot DESC, trending_score DESC)` | Tải danh sách phim "Đang Chiếu / Hot" lên trang chủ với chi phí sắp xếp = 0. |

### 2.2. Câu lệnh DDL Bổ sung Index
```sql
CREATE INDEX idx_showtimes_movie_time ON showtimes (movie_id, start_time);
CREATE INDEX idx_showtimes_room_time ON showtimes (room_id, start_time);
CREATE INDEX idx_bookings_user_created ON bookings (user_id, created_at DESC);
CREATE INDEX idx_bookings_status_time ON bookings (payment_status, created_at);
```

---

## 3. Xử Lý Transaction & Toàn Vẹn ACID Khi Thanh Toán Vé

Khi khách hàng bấm **Thanh toán**, dữ liệu phát sinh trên nhiều bảng đồng thời (`bookings`, `booking_seats`, `booking_combos`, `users`). Toàn bộ tiến trình phải được bao bọc trong một **Database Transaction**:

```javascript
async function executeBookingTransaction(pool, bookingData) {
  const connection = await pool.getConnection();
  try {
    // 1. Bắt đầu giao dịch ACID
    await connection.beginTransaction();

    // 2. Chèn thông tin đơn đặt vé vào bảng bookings
    const insertBookingSql = `
      INSERT INTO bookings (id, showtime_id, user_id, customer_name, customer_phone, total_amount, payment_status, booking_status, qr_token)
      VALUES (?, ?, ?, ?, ?, ?, 'PAID', 'CONFIRMED', ?)
    `;
    await connection.query(insertBookingSql, [
      bookingData.id,
      bookingData.showtimeId,
      bookingData.userId,
      bookingData.customerName,
      bookingData.customerPhone,
      bookingData.totalAmount,
      bookingData.qrToken
    ]);

    // 3. Chèn các ghế đã đặt vào bảng booking_seats
    for (const seat of bookingData.seats) {
      await connection.query(
        "INSERT INTO booking_seats (booking_id, seat_id, seat_price) VALUES (?, ?, ?)",
        [bookingData.id, seat.id, seat.price]
      );
    }

    // 4. Chèn bắp nước combo vào bảng booking_combos (nếu có)
    for (const combo of bookingData.combos) {
      await connection.query(
        "INSERT INTO booking_combos (booking_id, combo_id, quantity, unit_price) VALUES (?, ?, ?, ?)",
        [bookingData.id, combo.id, combo.quantity, combo.price]
      );
    }

    // 5. Cộng điểm tích lũy CGV Points cho người dùng (5% giá trị)
    const pointsEarned = Math.floor(bookingData.totalAmount * 0.05 / 1000);
    await connection.query(
      "UPDATE users SET cgv_points = cgv_points + ? WHERE id = ?",
      [pointsEarned, bookingData.userId]
    );

    // 6. Commit toàn bộ giao dịch nếu không có lỗi
    await connection.commit();
    return { success: true, bookingId: bookingData.id };
  } catch (error) {
    // Nếu có bất kỳ lỗi nào xảy ra -> Rollback toàn bộ trạng thái ban đầu
    await connection.rollback();
    throw error;
  } finally {
    connection.release(); // Trả kết nối lại về Pool
  }
}
```

---

## 4. Cơ Chế Dual-Mode (MySQL + In-Memory Fallback)

Để ứng dụng không bao giờ bị dừng hoạt động (High Availability) khi máy chạy demo chưa bật MySQL, lớp Data Access Layer `DbService` ([dbService.js](file:///c:/Users/Admin/OneDrive/Tài%20liệu/Hệ-Thống-Quản-Lý-Rạp-Chiếu-Phim/backend/src/services/dbService.js)) áp dụng mẫu thiết kế **Adaptive Persistence**:

```
Client Request
      │
      ▼
┌───────────────┐
│   DbService   │
└───────┬───────┘
        │
        ├─► [ MySQL Connected? ]
        │         │
        │         ├─► Có (True)  ──► Truy vấn MySQL Pool (SELECT/INSERT/UPDATE)
        │         │
        │         └─► Không (False) ──► Đọc / Ghi In-Memory Object (mockData.js)
```

### Các nguyên tắc đảm bảo an toàn:
1. Luôn dùng khối `try...catch` bọc quanh mọi truy vấn MySQL.
2. Khi MySQL ném ngoại lệ (mất kết nối đột ngột, timeout), log warning và chuyển sang fallback mà không để văng `500 Internal Server Error` ra giao diện.
3. Đồng nhất cấu trúc thuộc tính trả về (`camelCase` cho tầng Service, ánh xạ từ `snake_case` của MySQL).

---

## 5. Quy Trình Di Chuyển & Nạp Dữ Liệu Tự Động (Migration & Seeding)

Hệ thống cung cấp lệnh npm chuẩn hóa để tạo database và nạp dữ liệu mẫu nhanh chóng:

```bash
cd backend
npm run db:init
```

### Script thực thi: `backend/database/initDb.js`
* **Bước 1**: Đọc và thực thi `backend/database/schema.sql` (Tạo database `cinema_db` và 8 bảng quan hệ).
* **Bước 2**: Nạp dữ liệu các cụm rạp CGV mẫu tại Hà Nội và TP. Hồ Chí Minh.
* **Bước 3**: Nạp 6 phim điện ảnh hot kèm trailer, thời lượng, độ tuổi và ảnh poster chất lượng cao.
* **Bước 4**: Tự động sinh danh sách 48 ghế/phòng (Standard, VIP, Sweetbox) với tỷ lệ giá chuẩn.
* **Bước 5**: Tạo lịch chiếu mẫu và tài khoản thành viên (Customer, Staff, Admin) với mật khẩu khởi tạo `123456`.

---

## 6. Chiến Lược Sao Lưu & Phục Hồi (Backup & Disaster Recovery)

### 6.1. Sao lưu dữ liệu tự động (Daily Backup)
Sử dụng công cụ `mysqldump` để tạo bản dump nén định kỳ:
```bash
mysqldump -u root -p --single-transaction --routines --triggers cinema_db | gzip > backup_cinema_$(date +\%F).sql.gz
```

### 6.2. Phục hồi dữ liệu (Restore)
```bash
gunzip < backup_cinema_2026-10-28.sql.gz | mysql -u root -p cinema_db
```
