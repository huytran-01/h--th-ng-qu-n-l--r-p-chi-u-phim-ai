---
name: cinema-content
description: >-
  Hướng dẫn quản lý nội dung cinema trên website: thêm phim, poster, banner,
  thể loại, độ tuổi, định dạng, suất chiếu, phòng chiếu và dữ liệu demo Admin.
  Dùng khi cần cập nhật catalog hoặc chuẩn hóa nội dung hiển thị.
---

# Cinema Content Operations

## Nguồn dữ liệu

- `backend/src/data/mockData.js`: movies, showtimes, cinemas, rooms, combos, users.
- Admin CRUD trong `backend/src/server.js` là đường ưu tiên khi chỉnh dữ liệu lúc runtime.
- `frontend/index.html` chứa placeholder và option UI, không phải nguồn dữ liệu phim chính.

## Thêm phim

Phim cần có tối thiểu:

```js
{
  id: 'mov-unique',
  title: 'Tên hiển thị',
  originalTitle: 'Original title',
  status: 'NOW_SHOWING',
  durationMinutes: 120,
  ageRating: 'T13',
  genres: ['Hành động'],
  formats: ['2D'],
  director: 'Đạo diễn',
  cast: ['Diễn viên'],
  imdbRating: 7.5,
  posterUrl: 'https://...',
  bannerUrl: 'https://...',
  description: 'Tóm tắt',
  isHot: false,
  trendingScore: 70
}
```

## Thêm suất chiếu

- `movieId` phải tồn tại.
- `roomId` phải tồn tại.
- `startTime` và `endTime` dùng format nhất quán.
- Giá là số nguyên VND, tối thiểu theo chính sách hiện tại.
- Không tạo hai suất trùng phòng và chồng thời gian trong production.

## Quy tắc nội dung

- `NOW_SHOWING` chỉ dùng phim có suất chiếu bán vé.
- `COMING_SOON` không xuất hiện trong quick booking.
- Poster/banner phải có fallback nếu URL lỗi.
- Thể loại dùng đúng nhãn đã có để bộ lọc hoạt động.
- Độ tuổi chỉ dùng `P`, `T13`, `T16`, `T18`.
- Không dùng tên thương hiệu thật hoặc dữ liệu cá nhân không cần thiết trong mock data.

## Checklist sau cập nhật

- [ ] Phim xuất hiện ở API public và Admin list.
- [ ] Tìm kiếm, lọc thể loại và phân trang hoạt động.
- [ ] Có thể mở booking từ movie card.
- [ ] Phim có showtime hợp lệ và seat map tải được.
- [ ] Poster không làm vỡ layout khi ảnh chậm hoặc lỗi.
- [ ] `isHot` và `trendingScore` phản ánh đúng banner/recommendation.
