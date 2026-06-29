# Student role - rà soát và sửa luồng phòng/thiết bị

Ngày cập nhật: 2026-06-29

## Phạm vi rà soát

- Role: Sinh viên.
- Màn hình: Trang chủ sinh viên, Phòng của tôi, Thiết bị trong phòng, Báo hỏng.
- Backend liên quan: `students/me/room`, `students/me/roommates`, `students/me/room-assets`, `damage-reports`.

## Nhận xét nhanh

| Mục | Tình trạng | Ghi chú |
| --- | --- | --- |
| Trang chủ sinh viên | Cơ bản hợp lý | Dashboard lấy phòng hiện tại từ assignment active. Nếu chưa có phòng thì hiện `--` và số thiết bị là 0. |
| Phòng của tôi | Backend đúng, UI còn sơ sài | Backend trả `null` khi chưa phân phòng. UI đã đổi sang thông báo rõ “Chưa được phân phòng”. |
| Thiết bị trong phòng | Có lỗi | Frontend đặt mặc định phòng `A101`, nên tài khoản chưa phân phòng vẫn nhìn như có phòng. Đã bỏ phòng mặc định và hiển thị empty state. |
| Báo hỏng | Backend đúng, UI cần chặn sớm | Backend chỉ cho tạo báo hỏng khi sinh viên có phòng và thiết bị thuộc phòng. UI đã kiểm tra phòng/thiết bị trước khi mở form tạo. |
| Dữ liệu thiết bị | Thiếu đồng bộ response | Backend `getMyRoomAssets` đã bổ sung `categoryId`, `roomId`, `yearInUse`, `updatedAt`, và object `category` để frontend hiển thị đủ. |

## Điều chỉnh đã làm

- `StudentRoomAssetsPage`: bỏ giá trị mặc định `A101/A`, dùng room thật từ API.
- `StudentRoomAssetsPage`: nếu chưa phân phòng thì không hiển thị bảng thiết bị, thay bằng trạng thái “Chưa được phân phòng”.
- `StudentRoomPage`: trạng thái chưa phân phòng hiển thị rõ ràng hơn.
- `StudentDamageReportsHistoryPage`: tải context phòng trước khi cho tạo báo hỏng.
- `StudentsService.getMyRoomAssets`: trả dữ liệu asset đúng cấu trúc frontend đang dùng.

## Ghi chú

- Chưa đổi database/schema.
- Tài khoản mới tạo chưa phân phòng là trạng thái hợp lệ; các màn hình sinh viên phải hiển thị “chưa phân phòng”, không tự gán phòng mặc định.
