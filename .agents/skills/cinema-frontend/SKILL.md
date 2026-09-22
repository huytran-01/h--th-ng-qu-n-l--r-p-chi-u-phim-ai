---
name: cinema-frontend
description: >-
  Hướng dẫn phát triển và hoàn thiện giao diện website cinema: trang khách hàng,
  Admin Cinema Operations, responsive layout, modal, bảng dữ liệu, trạng thái tải
  và tích hợp frontend vanilla JavaScript với REST API.
---

# Cinema Frontend UI

## Phạm vi

Dùng skill này khi thêm hoặc sửa màn hình trong `frontend/index.html`, logic trong
`frontend/src/app.js`, responsive layout, modal, tab Admin, form CRUD hoặc trạng
thái loading/error/empty.

## Điểm neo mã nguồn

- `frontend/index.html`: markup, modal, view và Tailwind utility classes.
- `frontend/src/app.js`: state, routing `switchView()`, gọi API và render DOM.
- `API_BASE`: mặc định `http://localhost:5000/api/v1`.
- Các view chính: `home-view`, `admin-view`, `ai-lab-view`, `account-view`.

## Quy tắc triển khai

1. Tìm function render hoặc handler hiện có trước khi thêm function mới.
2. Giữ mô hình SPA hiện tại, không thêm framework nếu chưa được yêu cầu.
3. Mọi request API phải đi qua `apiFetch()` khi cần token/RBAC.
4. Mọi bảng, card và modal phải có loading, empty và error state.
5. Không để thao tác quản trị hiển thị cho role không có quyền.
6. Giữ responsive cho mobile: bảng dùng `overflow-x-auto`, grid dùng breakpoint Tailwind.
7. Nút icon phải có `title`; form phải có label và thông báo lỗi rõ ràng.
8. Không đặt secret, token hoặc mật khẩu vào HTML tĩnh.

## Checklist màn hình mới

- [ ] View có id duy nhất và được nối vào `switchView()` hoặc `switchAdminTab()`.
- [ ] API path dùng đúng `/api/v1/`.
- [ ] Có trạng thái đang tải, không có dữ liệu và lỗi kết nối.
- [ ] Có phân quyền UI phù hợp với backend.
- [ ] Modal đóng được bằng nút đóng và không để dữ liệu cũ khi mở form mới.
- [ ] Kiểm tra desktop và viewport hẹp.
- [ ] Chạy `node --check frontend/src/app.js` sau khi sửa JS.

## Mẫu gọi API

```js
const response = await apiFetch('/admin/movies?page=1&limit=5');
const payload = await response.json();
if (payload.status !== 'SUCCESS') {
  showToast(payload.message || 'Không thể tải dữ liệu.', 'error');
  return;
}
```

## Không làm

- Không viết lại toàn bộ `index.html` chỉ để sửa một component.
- Không dùng `alert()` thay cho hệ thống `showToast()`.
- Không bỏ qua lỗi `403`; phải hiển thị hành động phù hợp với role.
