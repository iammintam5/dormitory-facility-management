# Log sửa chức năng Cấp phát - Thu hồi

Ngày cập nhật: 28/06/2026

## Phạm vi

- Role: Quản lý.
- Màn hình: Cấp phát - Thu hồi tài sản.
- Tài liệu nghiệp vụ tham chiếu:
  - QL_BM1: Biên bản bàn giao cơ sở vật chất.
  - QL_BM2: Biên bản thu hồi cơ sở vật chất.

## Đã triển khai

| Hạng mục | Điều chỉnh | Lý do |
| --- | --- | --- |
| Menu bên trái | Sửa active state của `Lịch sử nhập/xuất` để không sáng cùng lúc với `Cấp phát - Thu hồi`. | Route `asset-transactions` là cha của `asset-transactions/allocation`, nên React Router tự đánh dấu active cho cả hai nếu không ép match chính xác. |
| Tiêu đề màn hình | Đổi thành `Cấp phát - Thu hồi tài sản`, mô tả theo hướng lập biên bản bàn giao/thu hồi theo phòng KTX. | Đúng ngữ cảnh quản lý cơ sở vật chất hơn, tránh hiểu nhầm đây chỉ là thao tác chuyển trạng thái thiết bị. |
| Tab nghiệp vụ | Đổi `Cấp phát thiết bị`/`Thu hồi thiết bị` thành `Lập biên bản cấp phát`/`Lập biên bản thu hồi`. | Cấp phát và thu hồi trong ký túc xá cần có dấu vết chứng từ/biên bản. |
| Thông tin biểu mẫu | Thêm khối thông báo QL_BM1/QL_BM2 và nút mở mẫu PDF trắng. | Người quản lý có thể in biên bản có dữ liệu từ hệ thống hoặc mở mẫu trắng khi cần. |
| Chọn khu/phòng | Khi đổi tab, khu nhà hoặc phòng thì tự bỏ chọn tài sản cũ. | Tránh trường hợp người quản lý chọn tài sản ở ngữ cảnh cũ rồi vô tình lập biên bản cho phòng khác. |
| Nút thực thi | Đổi nút thành `Lập biên bản cấp phát (...)` và `Lập biên bản thu hồi (...)`. | Nút thể hiện đúng kết quả nghiệp vụ sau khi bấm. |
| In biên bản | Đổi modal/nút in theo đúng loại biên bản và thêm nút mở mẫu PDF tương ứng. | Sau khi lập phiếu, quản lý có thể in biên bản dữ liệu hệ thống hoặc mở mẫu PDF trắng để đối chiếu/in riêng. |
| Mẫu PDF mặc định | Thêm 2 file PDF mặc định trong `frontend/public/templates/asset-receipts/`. | Khi có mẫu chính thức, chỉ cần ghi đè đúng tên file là giao diện tự mở mẫu mới. |
| Type frontend | Bổ sung type receipt `HANDOVER` và `RECLAIM`. | API có trả loại biên bản bàn giao/thu hồi, frontend cần khai báo đúng để tránh lệch type về sau. |

## Chưa triển khai trong bước này

| Hạng mục | Trạng thái | Ghi chú |
| --- | --- | --- |
| Danh sách biên bản cấp phát/thu hồi | Đang cập nhật | Hiện đã có nút hiển thị trạng thái đang phát triển, chưa mở màn danh sách riêng. |
| Xuất PDF theo mẫu chính thức của trường | Đã chuẩn bị đường dẫn thay thế | Hiện có mẫu PDF mặc định. Khi có mẫu chính thức, ghi đè file cùng tên trong `frontend/public/templates/asset-receipts/`. |
| Xác nhận sinh viên/đại diện phòng | Chưa làm | Có thể bổ sung sau nếu nhóm muốn luồng chặt hơn: quản lý lập phiếu, sinh viên/đại diện phòng xác nhận. |
| Ghi nhận tình trạng chi tiết khi thu hồi từng tài sản | Chưa làm | Hiện thu hồi theo tài sản đã chọn. Bước sau có thể cho nhập tình trạng thực tế và hướng xử lý cho từng dòng. |

## Ghi chú kỹ thuật

- Không chỉnh database.
- Không chỉnh backend.
- Không thay đổi luồng `Lịch sử nhập/xuất`, chỉ sửa lỗi active menu bị dính với `Cấp phát - Thu hồi`.

## Vị trí mẫu PDF

Đặt hoặc ghi đè mẫu chính thức tại:

| Mã biểu mẫu | Tên file bắt buộc | Đường dẫn |
| --- | --- | --- |
| QL_BM1 | `QL_BM1_BIEN_BAN_BAN_GIAO_CSVC.pdf` | `frontend/public/templates/asset-receipts/QL_BM1_BIEN_BAN_BAN_GIAO_CSVC.pdf` |
| QL_BM2 | `QL_BM2_BIEN_BAN_THU_HOI_CSVC.pdf` | `frontend/public/templates/asset-receipts/QL_BM2_BIEN_BAN_THU_HOI_CSVC.pdf` |

Lưu ý: giữ nguyên tên file PDF như bảng trên. Nếu đổi tên file thì phải sửa lại đường dẫn trong `frontend/src/pages/manager/AssetAllocationPage.tsx`.
