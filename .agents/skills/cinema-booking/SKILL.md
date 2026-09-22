---
name: cinema-booking
description: >-
  Hướng dẫn đầy đủ về luồng đặt vé cinema: từ chọn phim, chọn suất chiếu,
  chọn ghế, khóa ghế TTL 10 phút, thêm combo F&B đến thanh toán và xuất vé QR.
  Bao gồm cách thêm dữ liệu mới và xử lý concurrent booking conflicts.
---

# Cinema Booking Workflow — Skill Guide

## Tổng quan Luồng Đặt Vé

```
Khách hàng
    │
    ▼
[1] Xem danh sách phim → GET /api/v1/movies
    │
    ▼
[2] Chọn phim & xem suất chiếu → GET /api/v1/showtimes?movieId=xxx
    │
    ▼
[3] Xem sơ đồ ghế → GET /api/v1/showtimes/:id/seats?userId=xxx
    │
    ▼
[4] KHÓA GHẾ (TTL 10 phút) → POST /api/v1/bookings/lock-seats
    │                           ← Bắt đầu đếm ngược 10:00
    ▼
[5] Chọn Combo F&B → GET /api/v1/combos
    │
    ▼
[6] Thanh toán → POST /api/v1/payments/checkout
    │
    ▼
[7] Nhận vé QR điện tử ← bookingCode + qrToken
```

---

## Cơ Chế Khóa Ghế (seatLockService)

### Trạng thái ghế
- `AVAILABLE` — Ghế trống, có thể chọn
- `LOCKED` — Đang bị người khác giữ (TTL: 600 giây = 10 phút)
- `BOOKED` — Đã thanh toán, không thể chọn
- `SELECTED` — Ghế người dùng hiện tại đang giữ (chỉ thấy trên client đó)

### Xử lý Conflict
Khi `lockSeats()` thất bại (ghế đã bị lock):
```js
// Response từ server
{ 
  status: "CONFLICT", 
  success: false,
  conflictSeats: ["A1", "B3"],  // Ghế bị xung đột
  message: "Ghế A1, B3 đã được người khác giữ chỗ"
}
```

### TTL và Auto-Release
- Ghế bị lock sẽ tự động giải phóng sau 600 giây
- `getSeatsStatus()` tự tính `remainingSeconds` cho mỗi ghế
- Client phải poll `/api/v1/showtimes/:id/seats` để cập nhật trạng thái

---

## Cách Thêm Phim Mới vào mockData

Mở file: `backend/src/data/mockData.js`

```js
// Thêm vào mảng movies
{
  id: "mov-07",              // Tăng số thứ tự
  title: "Tên phim mới",
  genres: ["Hành động", "Phiêu lưu"],
  duration: 120,             // Phút
  imdbRating: 7.8,           // 0-10
  trendingScore: 72,         // 0-100
  isHot: false,
  ageRating: "T13",          // P, T13, T16, T18
  director: "Tên đạo diễn",
  cast: ["Diễn viên 1", "Diễn viên 2"],
  synopsis: "Mô tả phim...",
  posterUrl: "/images/poster-new.jpg",
  trailerUrl: "https://youtube.com/..."
}
```

## Cách Thêm Suất Chiếu Mới

```js
// Thêm vào mảng showtimes
{
  id: "st-10",
  movieId: "mov-01",        // Phải tồn tại trong movies
  roomId: "room-02",        // Phải tồn tại trong rooms
  startTime: "2024-07-25T14:30:00+07:00",  // ISO 8601 +07:00
  price: 130000,            // VND (giá cơ bản)
  format: "2D"              // IMAX, 3D, 2D
}
```

## Cách Thêm Combo F&B Mới

```js
// Thêm vào mảng combos
{
  id: "combo-04",
  name: "Combo Family Jumbo",
  description: "2 Bắp rang bơ lớn + 4 Nước ngọt",
  price: 189000,
  items: ["Bắp rang bơ lớn x2", "Nước ngọt 500ml x4"],
  image: "/images/combo-family.jpg"
}
```

---

## Tính Giá Vé

Công thức: `finalPrice = showtime.price × seat.priceRate`

| Loại ghế | priceRate | Ví dụ (base 110k) |
|----------|-----------|-------------------|
| STANDARD | 1.0       | 110,000đ          |
| VIP      | 1.25      | 137,500đ          |
| SWEETBOX | 1.5       | 165,000đ          |

---

## BookingAgent API (Mới)

```js
// POST /api/v1/ai/booking-assist
// Body:
{
  "movieTitle": "Dune 2",
  "preferences": {
    "hallFormat": "IMAX",
    "timeOfDay": "evening",   // morning, afternoon, evening, night
    "seatType": "VIP",
    "quantity": 2
  },
  "userId": "user_123"
}

// Response:
{
  "status": "SUCCESS",
  "agent": "BookingAgent_v1",
  "data": {
    "recommendedShowtime": { ...showtimeInfo },
    "suggestedSeats": ["E5", "E6"],
    "estimatedTotal": 275000,
    "bookingSummary": "2 ghế VIP suất 19:00 phim Dune 2 tại IMAX"
  }
}
```

---

## Gotchas & Lưu Ý

1. **Restart mất data**: seatLockService dùng in-memory, restart server → tất cả ghế về AVAILABLE
2. **userId không có auth**: Bất kỳ string nào đều được chấp nhận làm userId
3. **bookingCode** format: `BKG-XXXXXX` (6 số cuối của timestamp)
4. **qrToken** format: `TICKET-QR-BKG-XXXXXX-XXXXXXX`
5. **Không có ACID**: Không có transaction, nếu server crash giữa checkout → data inconsistent
6. **Giá không áp dụng discount tự động**: Phải pass `discountCode` vào BookingAgent
