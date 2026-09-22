---
name: cinema-ai-agents
description: >-
  Hướng dẫn làm việc với hệ thống AI Agents của rạp chiếu phim: BookingAgent,
  RecommendationAgent, CustomerServiceAgent, AdminAnalyticsAgent. Bao gồm cách
  thêm intent mới cho chatbot, mở rộng recommendation engine, và tích hợp agent mới.
---

# Cinema AI Agents — Skill Guide

## Kiến Trúc AI Agent System

```
                    ┌─────────────────────────────────┐
                    │         aiService.js             │
                    │      (Orchestrator Layer)         │
                    │  - Điều phối requests             │
                    │  - Chọn đúng agent xử lý          │
                    │  - Format response cho API        │
                    └──────────────┬──────────────────-┘
                                   │
              ┌────────────────────┼───────────────────┐
              ▼                    ▼                    ▼                    ▼
    ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
    │  bookingAgent.js │  │recommendation    │  │customerService   │  │adminAnalytics    │
    │                  │  │Agent.js          │  │Agent.js          │  │Agent.js          │
    │ - findShowtimes  │  │ - buildProfile   │  │ - handleRefund   │  │ - dailyReport    │
    │ - suggestSeats   │  │ - collaborative  │  │ - checkBooking   │  │ - revenueAnalysis│
    │ - estimatePrice  │  │ - similarMovies  │  │ - processComplaint│  │ - peakHours     │
    │ - genSummary     │  │ - personalized   │  │ - escalateHuman  │  │ - optimalSchedule│
    └──────────────────┘  └──────────────────┘  └──────────────────┘  └──────────────────┘
```

---

## 1. BookingAgent

### Mục đích
Hỗ trợ khách hàng tìm và đặt vé thông minh — thay thế việc phải tự tìm suất chiếu phù hợp.

### Methods chính
```js
const bookingAgent = require('../agents/bookingAgent');

// Tìm suất chiếu phù hợp nhất với preferences
bookingAgent.findBestShowtimes(movieId, preferences);
// preferences: { timeOfDay, hallFormat, date }

// Gợi ý ghế tối ưu theo số lượng và loại ghế
bookingAgent.suggestOptimalSeats(showtimeId, quantity, seatPreference);
// seatPreference: "VIP" | "STANDARD" | "SWEETBOX" | "GROUP"

// Tính tổng giá có áp dụng discount
bookingAgent.estimateTotalPrice(seatIds, showtimeId, comboIds, discountCode);

// Tạo tóm tắt đặt vé dạng text
bookingAgent.generateBookingSummary(bookingData);
```

### Thêm tính năng discount mới
Trong `bookingAgent.js`, tìm phương thức `_applyDiscount()`:
```js
_applyDiscount(basePrice, discountCode) {
  const discounts = {
    'HSSV20': 0.20,    // Học sinh-sinh viên 20%
    'MEMBER10': 0.10,  // Thành viên 10%
    // Thêm discount code mới tại đây:
    'NEWCODE': 0.15,
  };
  return basePrice * (1 - (discounts[discountCode] || 0));
}
```

---

## 2. RecommendationAgent

### Mục đích
Gợi ý phim cá nhân hóa dựa trên lịch sử, thể loại yêu thích và xu hướng phòng vé.

### Algorithms được dùng (mô phỏng)
- **Content-based Filtering**: Dựa trên thể loại yêu thích → weight 50%
- **Collaborative Filtering**: Dựa trên hành vi users tương tự → weight 30%  
- **Popularity/Trend Score**: Xu hướng phòng vé hiện tại → weight 20%

### Methods chính
```js
const recommendationAgent = require('../agents/recommendationAgent');

// Xây dựng user profile từ lịch sử
recommendationAgent.buildUserProfile(userId, viewHistory);

// Gợi ý theo collaborative filtering
recommendationAgent.getCollaborativeRecommendations(userId, limit);

// Tìm phim tương tự
recommendationAgent.getSimilarMovies(movieId, limit);

// Gợi ý cá nhân hóa đầy đủ (hybrid)
recommendationAgent.getPersonalizedRecommendations(userId, preferences);
```

### Thêm intent Recommendation mới cho Chatbot
Trong `aiService.js`, phần `processChatbotMessage()`:
```js
// Thêm keyword pattern mới
if (rawMsg.includes('phim kinh dị') || rawMsg.includes('horror')) {
  const horrorMovies = this.recommendationAgent.getSimilarMovies('mov-06');
  return {
    intent: "GENRE_RECOMMENDATION",
    confidence: 0.94,
    replyText: `Bạn thích phim kinh dị? Đây là gợi ý của AI...`,
    suggestedMovies: horrorMovies,
    action: "SHOW_RECOMMENDATION_CARDS"
  };
}
```

---

## 3. CustomerServiceAgent

### Mục đích
Xử lý tự động các yêu cầu hỗ trợ: hoàn vé, khiếu nại, tra cứu đặt vé.

### Methods chính
```js
const customerServiceAgent = require('../agents/customerServiceAgent');

// Xử lý yêu cầu hoàn vé
customerServiceAgent.handleRefundRequest(bookingCode, reason, customerInfo);
// Trả về: { approved, refundAmount, policy, processingTime }

// Kiểm tra trạng thái đặt vé
customerServiceAgent.checkBookingStatus(bookingCode);

// Phân loại và xử lý khiếu nại
customerServiceAgent.processComplaint(message, sessionId);
// Trả về: { category, suggestedResolution, escalationRequired }

// Chuyển lên nhân viên thật
customerServiceAgent.escalateToHuman(sessionId, issue);
```

### Chính sách hoàn vé (refund policy)
Trong `customerServiceAgent.js`, tìm `REFUND_POLICIES`:
```js
const REFUND_POLICIES = {
  MORE_THAN_24H: { approved: true, refundRate: 1.0 },    // >24h: hoàn 100%
  BETWEEN_2H_24H: { approved: true, refundRate: 0.5 },    // 2-24h: hoàn 50%
  LESS_THAN_2H: { approved: false, refundRate: 0 },        // <2h: không hoàn
  // Có thể chỉnh sửa policy tại đây
};
```

### Thêm category khiếu nại mới
```js
// Trong _classifyComplaint(), thêm pattern mới:
if (rawMsg.includes('âm thanh') || rawMsg.includes('loa') || rawMsg.includes('tiếng')) {
  return { 
    category: 'AUDIO_QUALITY', 
    priority: 'MEDIUM',
    suggestedResolution: 'Xin lỗi vì sự cố kỹ thuật. Chúng tôi sẽ kiểm tra hệ thống âm thanh và hoàn tiền vé cho bạn.'
  };
}
```

---

## 4. AdminAnalyticsAgent

### Mục đích
Phân tích dữ liệu kinh doanh và đưa ra đề xuất tối ưu hóa lịch chiếu cho Ban Quản lý.

### Methods chính
```js
const adminAnalyticsAgent = require('../agents/adminAnalyticsAgent');

// Báo cáo tổng hợp ngày
adminAnalyticsAgent.generateDailyReport(date);
// Trả về: { totalTickets, revenue, occupancyRate, topMovie, kpiSummary }

// Phân tích doanh thu theo phim
adminAnalyticsAgent.analyzeRevenueByMovie(movieId);

// Dự báo giờ cao điểm theo ngày trong tuần
adminAnalyticsAgent.predictPeakHours(dayOfWeek);
// dayOfWeek: 0 (CN) - 6 (T7)

// Đề xuất lịch chiếu tối ưu
adminAnalyticsAgent.suggestOptimalSchedule(availableMovies, availableRooms);
```

---

## Thêm Agent Mới (Hướng dẫn)

### Bước 1: Tạo file agent mới
```js
// backend/src/agents/myNewAgent.js
class MyNewAgent {
  constructor() {
    // Inject dependencies nếu cần
    const { movies } = require('../data/mockData');
    this.movies = movies;
  }

  myMethod(params) {
    // Business logic
    return { result: "..." };
  }
}

module.exports = new MyNewAgent(); // Export singleton
```

### Bước 2: Import vào aiService.js
```js
// Trong aiService.js
const myNewAgent = require('../agents/myNewAgent');

class AIService {
  constructor() {
    this.myNewAgent = myNewAgent;
  }
  // Thêm method wrapper
  doSomething(params) {
    return this.myNewAgent.myMethod(params);
  }
}
```

### Bước 3: Thêm API route vào server.js
```js
// Trong server.js
app.get('/api/v1/my-endpoint', (req, res) => {
  const result = aiService.doSomething(req.query);
  res.json({ status: 'SUCCESS', agent: 'MyNewAgent_v1', data: result });
});
```

### Bước 4: Cập nhật GEMINI.md
Thêm endpoint mới vào bảng API Endpoints trong `.agents/rules/GEMINI.md`.

---

## Testing Nhanh Các Agent

```bash
# Test BookingAgent
curl -X POST http://localhost:5000/api/v1/ai/booking-assist \
  -H "Content-Type: application/json" \
  -d '{"movieTitle":"Dune 2","preferences":{"hallFormat":"IMAX","timeOfDay":"evening","quantity":2}}'

# Test RecommendationAgent - Similar Movies
curl http://localhost:5000/api/v1/ai/similar-movies/mov-01

# Test CustomerServiceAgent - Refund
curl -X POST http://localhost:5000/api/v1/support/refund \
  -H "Content-Type: application/json" \
  -d '{"bookingCode":"BKG-123456","reason":"Bận đột xuất không đi được"}'

# Test AdminAnalyticsAgent - Daily Report
curl http://localhost:5000/api/v1/admin/daily-report

# Test AdminAnalyticsAgent - Optimal Schedule
curl http://localhost:5000/api/v1/admin/optimal-schedule
```
