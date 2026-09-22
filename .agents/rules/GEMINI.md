# 🎬 Hệ Thống Quản Lý Rạp Chiếu Phim — Project Rules

## Tổng quan Dự án

Đây là hệ thống **Full-Stack Cinema Management** tích hợp AI, được xây dựng cho đồ án tốt nghiệp.
Kiến trúc gồm 2 tầng chính: **Express.js Backend** (Port 5000) và **Vanilla JS Frontend** (SPA).

### Tech Stack
- **Backend**: Node.js + Express.js (CommonJS modules)
- **Frontend**: HTML5 + CSS3 + Vanilla JavaScript (không dùng framework)
- **AI Engine**: Rule-based NLU + Hybrid Recommendation (mô phỏng)
- **Data**: In-memory mock data (không có database thực)
- **Port**: 5000 (backend serve luôn static frontend)

---

## Cấu Trúc Dự Án

```
Hệ-Thống-Quản-Lý-Rạp-Chiếu-Phim/
├── .agents/                          ← Antigravity customizations
│   ├── rules/GEMINI.md               ← File này
│   └── skills/
│       ├── cinema-booking/SKILL.md   ← Workflow đặt vé
│       ├── cinema-ai-agents/SKILL.md ← Hướng dẫn AI agents
│       └── cinema-admin/SKILL.md     ← Quản trị hệ thống
├── backend/
│   └── src/
│       ├── agents/                   ← AI Agent classes (chuyên biệt)
│       │   ├── bookingAgent.js
│       │   ├── recommendationAgent.js
│       │   ├── customerServiceAgent.js
│       │   └── adminAnalyticsAgent.js
│       ├── services/
│       │   ├── aiService.js          ← Orchestrator điều phối agents
│       │   └── seatLockService.js    ← Quản lý khóa ghế TTL 10 phút
│       ├── data/mockData.js          ← Dữ liệu phim, phòng, ghế, suất chiếu
│       └── server.js                 ← Express server + API routes
└── frontend/
    ├── index.html                    ← SPA chính
    └── src/app.js                    ← Frontend logic
```

---

## Quy Tắc Code

### Ngôn ngữ
- **Comments/JSDoc**: Tiếng Việt — giúp sinh viên hiểu logic nghiệp vụ
- **Code (biến, hàm, class)**: Tiếng Anh — camelCase cho JS
- **API responses**: Có thể mix Vietnamese strings trong data

### Module Pattern
- Backend dùng **CommonJS** (`require`/`module.exports`) — KHÔNG dùng ES Modules
- Mỗi agent là một **class** được export dưới dạng **singleton instance**
- `aiService.js` là **Orchestrator** — điều phối các agent, KHÔNG chứa business logic

### API Convention
- Prefix: `/api/v1/`
- Response format luôn có `status: "SUCCESS" | "ERROR" | "CONFLICT"`
- AI endpoints thêm field `model` để ghi nhận model/agent đã dùng

### Error Handling
- Luôn có HTTP status code phù hợp (400, 404, 409, 500)
- Response lỗi có format: `{ status: "ERROR", message: "..." }`

---

## Data Models Quan trọng

### Movie
```js
{
  id: "mov-01",          // Format: mov-XX
  title: "Tên phim",
  genres: ["Hành động"],
  duration: 155,          // phút
  imdbRating: 8.5,
  trendingScore: 95,      // 0-100
  isHot: true,
  ageRating: "T13",       // T13, T16, T18, P
  director: "Tên đạo diễn",
  synopsis: "Mô tả"
}
```

### Showtime
```js
{
  id: "st-01",
  movieId: "mov-01",
  roomId: "room-01",
  startTime: "2024-07-20T19:00:00+07:00",  // ISO 8601
  price: 130000,   // giá cơ bản (VND)
  format: "IMAX"   // IMAX, 3D, 2D
}
```

### Seat
```js
{
  id: "A1",          // Row + Number
  row: "A",
  number: 1,
  type: "VIP",       // STANDARD, VIP, SWEETBOX
  priceRate: 1.25    // Nhân với showtime.price
}
```

---

## Các Lưu Ý Quan Trọng (Gotchas)

1. **seatLockService** dùng in-memory Map — restart server sẽ mất trạng thái ghế
2. **mockData** được import trực tiếp — thay đổi data cần restart server
3. **Frontend** được serve qua `express.static()` — path là `../../frontend` từ `src/`
4. **Không có Auth** — `userId` là string tùy ý, không có session thực
5. **AI responses** là deterministic (không random) để demo ổn định
6. Khi thêm agent mới → phải import trong `aiService.js` VÀ thêm route trong `server.js`

---

## API Endpoints Hiện Có

| Method | Path | Agent/Service |
|--------|------|--------------|
| GET | `/api/v1/movies` | mockData |
| GET | `/api/v1/movies/:id` | mockData |
| GET | `/api/v1/showtimes` | mockData |
| GET | `/api/v1/showtimes/:id/seats` | seatLockService |
| POST | `/api/v1/bookings/lock-seats` | seatLockService |
| GET | `/api/v1/combos` | mockData |
| POST | `/api/v1/payments/checkout` | seatLockService |
| GET | `/api/v1/ai/recommendations` | RecommendationAgent |
| POST | `/api/v1/ai/chat` | ChatbotNLU (trong aiService) |
| GET | `/api/v1/ai/demand-forecast` | AdminAnalyticsAgent |
| POST | `/api/v1/ai/booking-assist` | BookingAgent |
| GET | `/api/v1/ai/similar-movies/:id` | RecommendationAgent |
| POST | `/api/v1/support/refund` | CustomerServiceAgent |
| GET | `/api/v1/admin/daily-report` | AdminAnalyticsAgent |
| GET | `/api/v1/admin/optimal-schedule` | AdminAnalyticsAgent |
