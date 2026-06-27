# Tài liệu Phân tích Dự án: Hệ thống Quản lý Cơ sở Vật chất Ký túc xá (Dormitory Facility Management)

## 1. Tổng quan hệ thống
Hệ thống được thiết kế nhằm mục đích số hóa và tự động hóa quy trình quản lý tài sản, cơ sở vật chất tại một Ký túc xá. Hệ thống không chỉ lưu trữ thông tin về phòng ốc, tài sản mà còn theo dõi toàn bộ vòng đời của tài sản: từ lúc nhập kho, đưa vào sử dụng, bảo trì, sửa chữa khi có báo hỏng, cho đến lúc kiểm kê và thanh lý.

Hệ thống được thiết kế với các đối tượng (Roles) chính có thể bao gồm: 
- **Admin**: Quản trị viên hệ thống (quản lý danh mục, cấu hình, phân quyền).
- **Manager**: Cán bộ quản lý cơ sở vật chất (người trực tiếp xử lý báo hỏng, lập kế hoạch bảo trì, kiểm kê, thanh lý).
- **Student**: Sinh viên nội trú (người sử dụng tài sản, thực hiện báo hỏng khi có sự cố).

---

## 2. Các thực thể dữ liệu chính (Core Entities)

Dựa trên cấu trúc Database (Prisma Schema), hệ thống có các nhóm dữ liệu cốt lõi sau:

### 2.1. Nhóm Người dùng & Phân quyền
- **User & Role**: Quản lý tài khoản đăng nhập và quyền hạn.
- **Profile**: Thông tin chi tiết của người dùng (Khoa, Lớp, Mã sinh viên, Khóa học, Liên hệ khẩn cấp...).

### 2.2. Nhóm Vị trí (Locations)
- **DormBuilding (Tòa nhà)** $\to$ **Floor (Tầng)** $\to$ **Room (Phòng)**.
- Hệ thống quản lý cấu trúc phân cấp vị trí một cách rõ ràng.
- **RoomStudentAssignment**: Theo dõi việc xếp sinh viên vào phòng theo thời gian (Từ ngày - Đến ngày).

### 2.3. Nhóm Tài sản (Assets)
- **AssetCategory**: Phân loại tài sản (ví dụ: Bàn, Ghế, Giường, Quạt, Điều hòa) kèm chu kỳ bảo trì dự kiến.
- **Asset**: Từng cá thể tài sản cụ thể với mã tài sản (`assetCode`) duy nhất. Tài sản có nhiều trạng thái: `AVAILABLE` (Sẵn sàng), `IN_USE` (Đang sử dụng ở phòng), `UNDER_MAINTENANCE` (Đang bảo trì), `DAMAGED` (Đang hỏng), `PENDING_LIQUIDATION` (Chờ thanh lý), `LIQUIDATED` (Đã thanh lý).
- **AssetHistory**: Lưu lại lịch sử luân chuyển và thay đổi trạng thái của từng tài sản để dễ dàng truy vết.

### 2.4. Nhóm Nghiệp vụ (Business Transactions)
- **DamageReport**: Phiếu báo hỏng tài sản.
- **MaintenancePlan & MaintenanceRecord**: Kế hoạch bảo trì định kỳ và Nhật ký/Biên bản bảo trì thực tế.
- **InventoryCheck & InventoryCheckItem**: Phiếu kiểm kê định kỳ.
- **LiquidationRecord & LiquidationItem**: Hồ sơ thanh lý tài sản.
- **CouncilMember**: Hội đồng (được sử dụng chung cho các quy trình phức tạp như Kiểm kê hoặc Thanh lý cần nhiều người đánh giá/chứng kiến).

---

## 3. Các Luồng Nghiệp vụ Chính (Main Business Flows)

### 3.1. Luồng Quản lý Vòng đời Tài sản (Asset Lifecycle)
Đây là luồng bao trùm toàn bộ hệ thống:
1. **Nhập mới (Created)**: Cán bộ thêm tài sản mới vào hệ thống (Trạng thái: `AVAILABLE`).
2. **Cấp phát/Bố trí (Assigned)**: Gắn tài sản vào một Phòng (`Room`) cụ thể để sử dụng (Trạng thái chuyển thành `IN_USE`). Hệ thống tự động ghi lại lịch sử vào `AssetHistory`.
3. **Thay đổi trạng thái**: Trong quá trình sử dụng, tài sản có thể bị hỏng (`DAMAGED`), hoặc được mang đi bảo trì (`UNDER_MAINTENANCE`).
4. **Kết thúc vòng đời**: Tài sản quá cũ hoặc không thể sửa chữa sẽ được đưa vào danh sách chờ thanh lý (`PENDING_LIQUIDATION`) và cuối cùng là thanh lý hoàn toàn (`LIQUIDATED`).

### 3.2. Luồng Báo hỏng và Sửa chữa (Damage Reporting Flow)
1. **Sinh viên tạo báo hỏng**: Sinh viên phát hiện tài sản trong phòng bị hỏng $\to$ Vào hệ thống tạo `DamageReport` (Trạng thái phiếu: `SUBMITTED`).
2. **Tiếp nhận & Đánh giá**: Cán bộ quản lý nhận thông báo $\to$ Chuyển sang trạng thái xem xét (`REVIEWING`) để xuống kiểm tra thực tế.
3. **Phê duyệt**: Cán bộ xác nhận đúng là hỏng và cần sửa $\to$ Chuyển trạng thái (`APPROVED`).
4. **Tiến hành sửa chữa**: Nhân viên kỹ thuật đến sửa (Trạng thái phiếu: `IN_PROGRESS`, trạng thái tài sản có thể là `UNDER_MAINTENANCE`).
5. **Hoàn thành**: Sửa xong, tài sản hoạt động bình thường $\to$ Đóng phiếu (`COMPLETED`) và cập nhật lại trạng thái tài sản về `IN_USE`. Mỗi lần đổi trạng thái đều được ghi log vào `DamageReportLog`.

### 3.3. Luồng Bảo trì/Bảo dưỡng (Maintenance Flow)
Có 2 hình thức bảo trì: Bảo trì định kỳ (Scheduled) và Bảo trì đột xuất (Ad-hoc / After Inventory).
1. **Lập kế hoạch**: Cán bộ tạo `MaintenancePlan` cho các tài sản (ví dụ: Bảo dưỡng điều hòa 6 tháng/lần). Hệ thống tính toán `nextDueDate`.
2. **Thực hiện bảo trì**: Khi đến hạn hoặc có sự cố, nhân viên thực hiện bảo trì.
3. **Ghi nhận kết quả**: Sau khi bảo trì, lập `MaintenanceRecord`. Cán bộ đánh giá tình trạng sau bảo trì:
   - `GOOD` (Tốt)
   - `NEED_MONITORING` (Cần theo dõi thêm)
   - `NEED_REPAIR` (Cần sửa chữa lớn)
   - `RECOMMEND_LIQUIDATION` (Đề xuất thanh lý nếu chi phí sửa quá cao).
4. Hệ thống tự động cập nhật lại ngày bảo trì tiếp theo cho tài sản.

### 3.4. Luồng Kiểm kê (Inventory Check Flow)
Thường diễn ra định kỳ (cuối năm học, cuối kỳ).
1. **Lập đợt kiểm kê**: Cán bộ tạo `InventoryCheck` (Trạng thái: `DRAFT`).
2. **Thành lập Hội đồng**: Thêm các thành viên tham gia giám sát kiểm kê vào `CouncilMember`.
3. **Thực hiện kiểm kê**: Hội đồng đi đến từng phòng (Rooms). Hệ thống tự động lấy danh sách tài sản lẽ ra phải có trong phòng (`systemQuantity`). Người kiểm kê nhập số lượng thực tế (`actualQuantity`) và tình trạng hiện tại. Hệ thống tự động tính độ lệch (`difference`).
4. **Chốt kết quả**: Hoàn tất kiểm kê, chuyển trạng thái `COMPLETED`. 
5. **Hậu xử lý**: Dựa trên độ lệch và tình trạng, cán bộ sẽ có các thao tác tiếp theo (Tạo phiếu bảo trì cho đồ hỏng, phạt đền bù nếu mất tài sản, tạo phiếu thanh lý cho đồ không còn giá trị sử dụng).

### 3.5. Luồng Thanh lý tài sản (Liquidation Flow)
1. **Đề xuất thanh lý**: Từ kết quả kiểm kê hoặc bảo trì, cán bộ tạo `LiquidationRecord` liệt kê các tài sản cần thanh lý (Trạng thái: `DRAFT`).
2. **Đánh giá tình trạng & Định giá**: Nhập lý do thanh lý và ước tính giá trị thu hồi (nếu có). Thêm danh sách Hội đồng thanh lý (`CouncilMember`).
3. **Trình duyệt**: Chuyển trạng thái `PENDING_APPROVAL`.
4. **Phê duyệt**: Lãnh đạo hoặc Hội đồng xem xét $\to$ Duyệt (`APPROVED`) hoặc Từ chối (`REJECTED`).
5. **Hoàn tất**: Sau khi mang đi bán phế liệu hoặc vứt bỏ $\to$ Đóng hồ sơ (`COMPLETED`). Trạng thái các tài sản tương ứng tự động chuyển thành `LIQUIDATED` và không còn tính vào tổng tài sản đang sử dụng.

---

## 4. Các tính năng bổ trợ
- **Notifications (Thông báo)**: Hệ thống sinh ra các thông báo (Ví dụ: Khi sinh viên gửi báo hỏng thì Cán bộ nhận thông báo; Khi phiếu báo hỏng được duyệt thì Sinh viên nhận thông báo).
- **Audit Logs (Nhật ký hệ thống)**: Lưu vết toàn bộ các thao tác nhạy cảm (Ai đã xóa tài sản, Ai đã cập nhật trạng thái phiếu) bao gồm giá trị cũ (`oldValue`) và giá trị mới (`newValue`) để đảm bảo minh bạch, có thể quy trách nhiệm khi xảy ra sai sót.
- **Normalized Search**: Cơ chế tối ưu hóa tìm kiếm Full-text cho tài sản.
