# Admin - sửa luồng thêm/cập nhật tài khoản

Ngày cập nhật: 2026-06-29

## Phạm vi

- Role: Admin.
- Màn hình: Tài khoản người dùng.
- Chức năng: Thêm tài khoản, cập nhật tài khoản, đổi mật khẩu trong form cập nhật.

## Lỗi/điểm chưa đúng đã xử lý

| Mục | Vấn đề | Điều chỉnh |
| --- | --- | --- |
| DTO cập nhật tài khoản | Frontend có trường mật khẩu mới khi sửa tài khoản nhưng backend DTO chưa cho phép `password`, dễ bị `forbidNonWhitelisted` chặn request. | Bổ sung `password` optional trong `UpdateUserDto`, kèm `MinLength(6)`. |
| Mã sinh viên | Form cho nhập mã sinh viên với mọi role, dễ lưu mã sinh viên cho ADMIN/MANAGER. | Frontend chỉ bật ô mã sinh viên khi chọn role STUDENT; backend tự ép `studentCode = null` với ADMIN/MANAGER. |
| Tài khoản STUDENT | Chưa bắt buộc mã sinh viên khi tạo/sửa tài khoản STUDENT. | Frontend và backend đều bắt buộc `studentCode` cho STUDENT. |
| Trùng mã sinh viên | Schema hiện chưa unique `studentCode`, nên có thể tạo trùng bằng nghiệp vụ. | Backend kiểm tra trùng `studentCode` trước khi tạo/sửa. |
| Dữ liệu nhập có khoảng trắng | `username`, họ tên, email, phone có thể bị lưu thừa khoảng trắng. | Backend chuẩn hóa trước khi ghi database. |
| Ô nhập trong modal bị mất focus | `Modal` chạy lại effect focus mỗi khi `onClose` đổi identity, khiến người dùng chỉ gõ được từng ký tự. | Lưu `onClose` bằng ref và chỉ chạy focus effect khi mở/đóng modal. |

## Ghi chú

- Chưa đổi schema Prisma và chưa tạo migration để tránh ảnh hưởng database chung của nhóm.
- Kiểm tra trùng mã sinh viên hiện xử lý ở tầng service bằng `findFirst`.
- Với ADMIN/MANAGER, mã sinh viên không được lưu dù frontend có gửi nhầm.
