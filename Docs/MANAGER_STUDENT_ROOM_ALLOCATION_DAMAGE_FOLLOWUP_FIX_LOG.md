# Nhật ký sửa lỗi quản lý/sinh viên - 2026-06-29

## Phạm vi xử lý

- Role quản lý: kiểm tra nhanh luồng `Phòng ở`, `Cấp phát - Thu hồi`, `Sửa chữa - Bảo trì`.
- Role sinh viên: kiểm tra thao tác hủy phiếu báo hỏng sau khi tạo.
- Mẫu in: rà lại header đơn vị và thông tin chi phí/vật tư trong phiếu sửa chữa.

## Thay đổi đã thực hiện

| Khu vực | Vấn đề | Cách xử lý |
| --- | --- | --- |
| Phòng ở | Trong modal chi tiết phòng, bấm chuyển phòng có thể không thấy form chuyển vì modal chi tiết vẫn nằm phía trên. | Đóng modal chi tiết trước khi mở modal chuyển phòng. |
| Cấp phát - Thu hồi | Service `asset-receipts` trả thẳng `response.data`, chưa đồng bộ với chuẩn unwrap response của các service khác. | Dùng `unwrapApiResponse` cho các API nhập/xuất/cấp phát/thu hồi để tránh lệch dữ liệu khi backend trả envelope. |
| Sinh viên hủy báo hỏng | Hủy phiếu từ modal chi tiết có thể bị lớp modal xác nhận che/không rõ; backend cũng phụ thuộc role từ payload. | Đóng modal chi tiết trước khi mở xác nhận hủy; backend cho phép sinh viên hủy phiếu của chính mình dựa trên quyền sở hữu phiếu. |
| Trạng thái báo hỏng | Frontend type chưa có `CANCELLED`. | Bổ sung `CANCELLED` vào type trạng thái báo hỏng. |
| Sửa chữa - Bảo trì | Dữ liệu mới vẫn có thể lưu/trả chi phí và vật tư dù UI đã bỏ. | Backend không lưu/trả chi phí/vật tư trong record bảo trì mới và không ghi chi phí vào log nghiệm thu. |
| Phiếu in bảo trì | Khi thiếu người thực hiện, màn quản lý/in phiếu còn fallback `#id`. | Đổi fallback thành `Chưa cập nhật`, tránh lộ mã nội bộ. |
| Khu nhà / Phòng ở | Form khu nhà có ô mô tả không được lưu do database chưa có cột tương ứng; modal quản lý phòng dùng màu trắng hard-code. | Cột danh sách đổi thành `Tổng quan` tự tính từ số tầng/phòng/sức chứa; bỏ ô mô tả giả khỏi form; đổi các input/select trong modal phòng sang token màu chung. |

## Kiểm tra

- Backend build: `npm run build` trong `backend` thành công.
- Frontend build: `npm run build` trong `frontend` thành công.
- Header mẫu in đang đúng định dạng:

```text
Bộ Khoa học và Công nghệ
Học viện Công nghệ Bưu chính Viễn thông
Cơ sở tại Thành phố Hồ Chí Minh
```

## Ghi chú còn cần test tay

- Cấp phát/thu hồi cần test với dữ liệu thật: phải có thiết bị trạng thái `AVAILABLE` và chưa gán phòng.
- Thu hồi cần test với phòng đang có thiết bị `IN_USE`.
- Hủy báo hỏng sinh viên chỉ hợp lệ khi phiếu còn trạng thái `SUBMITTED`.
