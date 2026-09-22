---
name: cinema-admin
description: >-
  Hướng dẫn quản trị hệ thống rạp chiếu phim: thêm/sửa phòng chiếu và lịch chiếu,
  đọc báo cáo admin dashboard, dự báo nhu cầu, deploy và vận hành server.
  Dành cho người quản lý hệ thống và developer.
---

# Cinema Admin & Operations — Skill Guide

## Khởi Chạy Hệ Thống

### Cách 1: One-click (Windows)
```
Double-click: start_app.bat
→ Tự động cài npm, khởi server, mở browser tại http://localhost:5000
```

### Cách 2: Dòng lệnh
```bash
cd backend
npm install      # Lần đầu
npm start        # Khởi server tại Port 5000
```

### Kiểm tra server đang chạy
```bash
curl http://localhost:5000/api/v1/movies
# → { "status": "SUCCESS", "data": [...] }
```

---

## Cấu Hình Phòng Chiếu

File: `backend/src/data/mockData.js` — mảng `rooms`

```js
const rooms = [
  {
    id: "room-01",
    name: "Phòng IMAX Galaxy",
    cinema: "AI Cinema Galaxy",
    capacity: 80,       // Số ghế tối đa
    format: "IMAX",     // IMAX, 3D, 2D
    features: ["IMAX Laser", "Dolby Atmos", "4K"]
  },
  // Thêm phòng mới tại đây
];
```

### Thêm Phòng Mới
1. Thêm object vào mảng `rooms` với `id` duy nhất (format: `room-XX`)
2. Cập nhật `defaultSeats` nếu số ghế thay đổi
3. Restart server để áp dụng

---

## Admin Dashboard — Các Chỉ Số KPI

### Xem qua giao diện
Truy cập tab **"Quản Trị & Dự Báo AI"** trên thanh nav của frontend.

### Xem qua API
```bash
# Báo cáo ngày
GET /api/v1/admin/daily-report

# Dự báo nhu cầu theo khung giờ
GET /api/v1/ai/demand-forecast

# Đề xuất lịch chiếu tối ưu
GET /api/v1/admin/optimal-schedule
```

### Ý nghĩa các chỉ số
| Chỉ số | Ý nghĩa | Ngưỡng tốt |
|--------|---------|------------|
| `totalTickets` | Tổng vé bán trong ngày | > 200 vé |
| `revenue` | Doanh thu ước tính (VND) | > 26,000,000đ |
| `occupancyRate` | Tỷ lệ lấp đầy ghế trung bình | > 70% |
| `predictedOccupancy` | Dự báo % lấp đầy theo ca | Peak: 85%+ |

---

## Dự Báo Nhu Cầu — Đọc Kết Quả

Response từ `GET /api/v1/ai/demand-forecast`:
```json
{
  "timeslot": "19:00 - 21:30",
  "predictedOccupancy": 94,
  "expectedTickets": 75,
  "recommendation": "GIỜ VÀNG (Peak): Đề xuất ưu tiên phim Dune 2 vào phòng IMAX"
}
```

### Hành động tương ứng
- `occupancy < 50%` → Áp dụng giá ưu đãi, chương trình Morning/Afternoon Special
- `occupancy 50-75%` → Duy trì lịch hiện tại
- `occupancy 75-90%` → Chuẩn bị mở thêm quầy phục vụ
- `occupancy > 90%` → Giờ vàng: Đặt phim hot vào phòng lớn, tăng giá IMAX

---

## Phê Duyệt Lịch Chiếu Tối Ưu

### Xem đề xuất
```bash
GET /api/v1/admin/optimal-schedule
```

### Cấu trúc response
```json
{
  "status": "SUCCESS",
  "agent": "AdminAnalyticsAgent_v1",
  "data": {
    "recommendations": [
      {
        "movie": "Dune 2",
        "room": "Phòng IMAX Galaxy",
        "timeslot": "19:00",
        "expectedOccupancy": 94,
        "revenueEstimate": 12320000,
        "reason": "Phim hot nhất + Giờ vàng + Phòng lớn nhất = Doanh thu tối đa"
      }
    ],
    "totalProjectedRevenue": 34500000,
    "approvalToken": "SCHED-APPROVE-xxxxx"
  }
}
```

### Phê duyệt lịch
Frontend có nút **"Phê duyệt & Xuất bản Lịch chiếu AI"** — trong demo này chỉ hiển thị thông báo thành công.

---

## Cập Nhật Dữ Liệu Phim Hot

### Thay đổi phim đang hiển thị banner
Trong `mockData.js`, set `isHot: true` cho phim muốn hiển thị nổi bật:
```js
{ id: "mov-01", title: "Dune 2", isHot: true, ... }
```

### Thay đổi trendingScore
```js
trendingScore: 98  // 0-100, ảnh hưởng thứ tự hiển thị và recommendation
```

---

## Troubleshooting Thường Gặp

### Port 5000 bị chiếm
```bash
# Windows: Tìm process đang dùng port 5000
netstat -ano | findstr :5000
taskkill /PID <PID_number> /F
```

### npm install thất bại
```bash
cd backend
del package-lock.json
rmdir /s /q node_modules
npm install
```

### Ghế không cập nhật trạng thái
- Nguyên nhân: seatLockService là in-memory, restart server sẽ reset
- Giải pháp: Reload trang frontend sau khi restart server

### API trả về 404
- Kiểm tra URL: Phải bắt đầu bằng `/api/v1/`
- Kiểm tra server đang chạy tại đúng port 5000

---

## Mở Rộng Hệ Thống

### Thêm Database thực
Để thay thế mockData bằng database thực (MongoDB/PostgreSQL):
1. Thêm thư viện: `npm install mongoose` hoặc `npm install pg`
2. Tạo `backend/src/db/` với connection config
3. Thay thế `require('../data/mockData')` bằng DB queries trong các service/agent
4. Cập nhật GEMINI.md với schema database

### Thêm Authentication
1. `npm install jsonwebtoken bcryptjs`
2. Tạo `backend/src/middleware/auth.js`
3. Thêm middleware `app.use('/api/v1/admin/', authMiddleware)` trong server.js
4. Frontend thêm Bearer token vào headers

### Chuyển sang Production
```bash
# Dùng PM2 để chạy ổn định
npm install -g pm2
pm2 start backend/src/server.js --name "cinema-api"
pm2 startup
pm2 save
```
