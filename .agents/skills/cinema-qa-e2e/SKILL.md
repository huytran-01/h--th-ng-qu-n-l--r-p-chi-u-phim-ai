---
name: cinema-qa-e2e
description: >-
  Hướng dẫn kiểm thử website cinema: smoke test backend, RBAC, đặt vé, khóa ghế
  TTL, checkout QR, Admin CRUD, AI endpoints và kiểm tra giao diện responsive.
---

# Cinema QA & E2E

## Khởi động

```powershell
cd backend
npm install
npm start
```

Mặc định kiểm tra tại `http://localhost:5000`. Nếu port đã được dùng, dùng server
đang chạy thay vì khởi động bản thứ hai.

## Smoke test bắt buộc

1. `GET /api/v1/movies` trả `SUCCESS`.
2. `GET /api/v1/cinemas` trả rạp và phòng.
3. Login admin trả token.
4. Admin gọi được `/admin/daily-report` và `/ai/demand-forecast`.
5. Customer không gọi được endpoint Admin cần quyền.
6. Staff không gọi được `/admin/users`.

## Luồng booking

1. Chọn phim đang chiếu.
2. Chọn suất chiếu và tải seats.
3. Lock một hoặc nhiều ghế.
4. Xác nhận conflict bằng user khác.
5. Checkout đúng user đang giữ ghế.
6. Kiểm tra booking code, QR token, tổng tiền và booking history.
7. Thử checkout ghế chưa lock để bảo đảm API trả `409`.

## Luồng Admin

- Tạo, sửa, xóa phim.
- Bật/tắt `isHot`.
- Tạo, sửa, xóa suất chiếu.
- Admin tạo/sửa role user.
- Manager bị từ chối ở user management.
- Tìm kiếm và phân trang không làm mất filter.

## Kiểm tra frontend

- Không có lỗi console khi mở trang.
- Các view không chồng lên nhau khi chuyển tab.
- Modal reset form khi tạo mới.
- Responsive ở desktop và mobile.
- Empty/error/loading state hiển thị đúng.
- Seat map cập nhật khi đổi showtime.

## Lệnh kiểm tra nhanh

```powershell
node --check frontend/src/app.js
node --check backend/src/server.js
```

Sau mỗi thay đổi frontend, chạy syntax check. Sau thay đổi API hoặc permission,
chạy lại smoke test cho cả role được phép và role bị từ chối.

## Tiêu chí báo cáo lỗi

Mỗi lỗi cần ghi endpoint/view, role, input tối thiểu, response/status thực tế,
expected behavior và bước tái hiện. Không ghi token thật vào log hoặc báo cáo.
