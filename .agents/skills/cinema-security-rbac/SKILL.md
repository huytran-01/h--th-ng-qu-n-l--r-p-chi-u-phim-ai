---
name: cinema-security-rbac
description: >-
  Hướng dẫn bảo mật và phân quyền cho website cinema: đăng nhập, token Bearer,
  RBAC 3 tác nhân CUSTOMER/STAFF/ADMIN, bảo vệ API Admin, kiểm tra quyền frontend,
  không lộ mật khẩu và xử lý truy cập trái phép.
---

# Cinema Security & RBAC (3 Tác Nhân Người Dùng)

## Role matrix hiện tại (Chuẩn hóa 3 tác nhân người dùng)

| Role | Tác nhân | Phạm vi chính |
|---|---|---|
| CUSTOMER | Khách hàng | Xem phim, chọn suất chiếu, khóa ghế, đặt vé, profile, recommendation, AI chat |
| STAFF | Nhân viên rạp | Hỗ trợ vận hành rạp: Đăng nhập, tra cứu vé, kiểm tra mã vé hoặc QR, xác nhận soát vé khi khách vào rạp |
| ADMIN | Quản trị viên | Quản trị dữ liệu và hoạt động hệ thống: Quản lý người dùng, phim, phòng chiếu, ghế, lịch chiếu, theo dõi đơn đặt vé và xem báo cáo |

Nguồn chuẩn quyền: `ROLE_PERMISSIONS` trong `backend/src/server.js`.

## Quy tắc xác thực

- Login qua `POST /api/v1/auth/login`.
- Gửi token bằng `Authorization: Bearer <token>`.
- Backend xác minh bằng `authService.verifyToken()`.
- Frontend dùng `apiFetch()` để tự gắn header.
- Không tin role chỉ từ UI hoặc localStorage; backend luôn là lớp quyết định cuối.

## Khi thêm endpoint

1. Xác định permission nhỏ nhất cần thiết, ví dụ `movies.read`, `bookings.scan` hoặc `users.manage`.
2. Gắn `requirePermission('permission.name')` trước handler.
3. Trả `401` cho phiên không hợp lệ và `403` cho role không đủ quyền.
4. Không trả field `password`; dùng destructuring loại bỏ trước response.
5. Kiểm tra ownership với profile, bookings và dữ liệu cá nhân.
6. Validate input, enum role/status và id tài nguyên trước khi mutate dữ liệu.

## Khi sửa Admin UI

- `ADMIN` và `STAFF` được vào khu vực quản trị/nghiệp vụ.
- `STAFF` (Nhân viên rạp) chỉ truy cập tab Quản lý đơn vé & Quầy soát vé (`bookings`). Các tab cấu hình danh mục và hệ thống được ẩn.
- Tab Users/RBAC, Movies, Showtimes, Forecast chỉ dành cho `ADMIN`.
- Với `403`, dùng `showToast()` và giữ nguyên trạng thái dữ liệu hiện tại.

## Checklist kiểm tra

- [ ] Customer không gọi được API `users.manage` hay `bookings.scan`.
- [ ] Staff không gọi được API `analytics.read` hoặc `users.manage`.
- [ ] Staff soát được vé qua API `/api/v1/bookings/check-in`.
- [ ] Admin dùng được toàn bộ admin endpoint.
- [ ] Password không xuất hiện trong login response, profile response hoặc admin list.
- [ ] Token hết hạn bị từ chối.
