---
name: cinema-security-rbac
description: >-
  Hướng dẫn bảo mật và phân quyền cho website cinema: đăng nhập, token Bearer,
  RBAC ADMIN/MANAGER/STAFF/CUSTOMER, bảo vệ API Admin, kiểm tra quyền frontend,
  không lộ mật khẩu và xử lý truy cập trái phép.
---

# Cinema Security & RBAC

## Role matrix hiện tại

| Role | Phạm vi chính |
|---|---|
| CUSTOMER | Xem phim, đặt vé, profile, recommendation |
| STAFF | Xem phim, tạo booking, scan vé, hỗ trợ |
| MANAGER | Quản lý phim, suất chiếu, phòng, analytics, AI |
| ADMIN | Toàn quyền, bao gồm users và system |

Nguồn chuẩn quyền: `ROLE_PERMISSIONS` trong `backend/src/server.js`.

## Quy tắc xác thực

- Login qua `POST /api/v1/auth/login`.
- Gửi token bằng `Authorization: Bearer <token>`.
- Backend xác minh bằng `authService.verifyToken()`.
- Frontend dùng `apiFetch()` để tự gắn header.
- Không tin role chỉ từ UI hoặc localStorage; backend luôn là lớp quyết định cuối.

## Khi thêm endpoint

1. Xác định permission nhỏ nhất cần thiết, ví dụ `movies.read` hoặc `users.manage`.
2. Gắn `requirePermission('permission.name')` trước handler.
3. Trả `401` cho phiên không hợp lệ và `403` cho role không đủ quyền.
4. Không trả field `password`; dùng destructuring loại bỏ trước response.
5. Kiểm tra ownership với profile, bookings và dữ liệu cá nhân.
6. Validate input, enum role/status và id tài nguyên trước khi mutate dữ liệu.

## Khi sửa Admin UI

- `ADMIN` và `MANAGER` mới được mở Admin Cinema Operations.
- Tab Users/RBAC chỉ dành cho `ADMIN`.
- UI ẩn nút không đủ quyền nhưng không được xem đó là biện pháp bảo mật duy nhất.
- Với `403`, dùng `showToast()` và giữ nguyên trạng thái dữ liệu hiện tại.

## Checklist kiểm tra

- [ ] Customer không gọi được API `users.manage`.
- [ ] Staff không gọi được API `analytics.read` hoặc `users.manage`.
- [ ] Manager quản lý được movies/showtimes/analytics nhưng không quản lý users.
- [ ] Admin dùng được toàn bộ admin endpoint.
- [ ] Password không xuất hiện trong login response, profile response hoặc admin list.
- [ ] Token hết hạn bị từ chối.
- [ ] Không dùng `x-demo-role` như cơ chế production; đây chỉ là fallback demo.

## Cảnh báo production

Hệ thống hiện dùng token in-memory và dữ liệu in-memory. Khi triển khai thật cần
JWT ký bằng secret quản lý qua environment, refresh/revoke strategy, database,
rate limit login, audit log và HTTPS.
