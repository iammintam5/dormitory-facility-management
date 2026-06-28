# Log sửa chức năng Nhập/Xuất

Ngày cập nhật: 28/06/2026

## Phạm vi

- Role: Quản lý.
- Màn hình: Nhập/Xuất.
- Các màn liên quan: Nhập thiết bị, Xuất thiết bị.

## Đã triển khai

| Hạng mục | Điều chỉnh | Lý do |
| --- | --- | --- |
| Dữ liệu lịch sử | Đổi từ dữ liệu mẫu hard-code sang gọi API `GET /asset-receipts`. | Phiếu nhập/xuất tạo thật từ database sẽ hiển thị lại trong lịch sử. |
| Lọc loại phiếu | Chỉ lấy và hiển thị `IMPORT` và `EXPORT`. | Không để lẫn biên bản cấp phát/thu hồi trong màn lịch sử nhập/xuất. |
| Bộ lọc frontend | Thêm tìm kiếm theo mã phiếu, đối tác, ghi chú; lọc loại phiếu và khoảng ngày. | Giúp quản lý tra cứu nhanh phiếu nhập/xuất. |
| Thống kê | Tính tổng phiếu, phiếu nhập, phiếu xuất, hoàn thành từ dữ liệu thật. | Không còn phụ thuộc số liệu mẫu. |
| Chi tiết phiếu | Khi bấm xem, gọi `GET /asset-receipts/:id` và hiển thị danh sách tài sản thật. | Bỏ trạng thái "tính năng đang phát triển" ở chi tiết thiết bị. |
| Backend list API | Bổ sung filter `types`, `search`, `dateFrom`, `dateTo` và `_count.items`. | Trang danh sách có số lượng thiết bị và sẵn sàng mở rộng lọc server-side. |
| Mẫu PDF | Thêm mẫu `PNK` và `PXK` trong `frontend/public/templates/asset-receipts/`. | Cho phép mở/in mẫu phiếu nhập kho và phiếu xuất kho giống cách đã làm ở cấp phát/thu hồi. |
| Thanh lý thiết bị | Ẩn màn thanh lý riêng khỏi menu, chuyển quick action sang `Xuất/Thanh lý thiết bị`, route cũ tự chuyển sang màn xuất. | Tránh chồng chéo nghiệp vụ; thanh lý/hủy bỏ được xem là một loại xuất kho. |
| Xuất thiết bị | Cho phép xuất trực tiếp tài sản trong kho, hỏng, đang bảo trì hoặc chờ thanh lý; tài sản đang ở phòng phải thu hồi trước. | Giữ ranh giới với `Cấp phát - Thu hồi`: thu hồi đưa tài sản về kho, xuất/thanh lý mới đưa tài sản ra khỏi hệ thống hoạt động. |
| Số phiếu | Đổi hiển thị số phiếu nhập/xuất thành `Tự sinh khi lưu phiếu`. | Mã phiếu chính thức do backend sinh khi lưu, không nên để người dùng hiểu là có thể sửa tay. |

## Vị trí mẫu PDF

Đặt hoặc ghi đè mẫu chính thức tại:

| Mã mẫu | Tên file bắt buộc | Đường dẫn |
| --- | --- | --- |
| PNK | `PHIEU_NHAP_KHO_CSVC.pdf` | `frontend/public/templates/asset-receipts/PHIEU_NHAP_KHO_CSVC.pdf` |
| PXK | `PHIEU_XUAT_KHO_CSVC.pdf` | `frontend/public/templates/asset-receipts/PHIEU_XUAT_KHO_CSVC.pdf` |

Lưu ý: giữ nguyên tên file PDF như bảng trên. Nếu đổi tên file thì phải sửa lại đường dẫn trong `frontend/src/pages/manager/EquipmentTransactionsPage.tsx`.

## Chưa triển khai trong bước này

| Hạng mục | Trạng thái | Ghi chú |
| --- | --- | --- |
| In phiếu nhập/xuất có dữ liệu trực tiếp từ modal | Chưa làm | Hiện đã có mẫu PDF trắng và chi tiết dữ liệu thật trong modal. Nếu cần có thể thêm bản in HTML giống cấp phát/thu hồi. |
| Phân trang server-side | Chưa làm | Hiện danh sách lấy toàn bộ phiếu nhập/xuất rồi lọc phía frontend. |

## Ghi chú kỹ thuật

- Không chỉnh database schema.
- Không gửi `.env`.
- Không gửi các file `.bat` chạy local.
