# BÁO CÁO PHÂN TÍCH TOÀN BỘ LUỒNG NGHIỆP VỤ
## Hệ thống quản lý cơ sở vật chất ký túc xá

**Project được phân tích:** `dormitory-facility-management-main(1).zip`  
**Ngày rà soát:** 27/06/2026  
**Phạm vi:** Frontend React/Vite, Backend NestJS/Prisma, mô hình dữ liệu PostgreSQL, phân quyền, luồng trạng thái, tính toàn vẹn dữ liệu và mức độ nối liền giữa các phân hệ.

---

# 1. Kết luận tổng quan

Project đã có khung chức năng khá đầy đủ cho đề tài **quản lý cơ sở vật chất KTX**:

- Quản trị tài khoản và phân quyền.
- Quản lý khu nhà, tầng, phòng.
- Xếp sinh viên vào phòng, chuyển phòng, rời phòng.
- Quản lý danh mục và tài sản.
- Nhập kho, cấp phát, thu hồi, xuất kho.
- Sinh viên báo hỏng.
- Quản lý bảo trì.
- Kiểm kê.
- Thanh lý.
- Thông báo, nhật ký hệ thống và báo cáo.

Tuy nhiên, hệ thống hiện mới đạt mức **có giao diện và API cho phần lớn phân hệ**, chưa đạt mức **luồng nghiệp vụ khép kín, an toàn và nhất quán**. Các phân hệ đang tồn tại tương đối độc lập; trạng thái tài sản có thể bị thay đổi từ nhiều nơi mà không tuân theo một ma trận chuyển trạng thái chung.

## 1.1. Đánh giá mức độ hoàn thiện

| Nhóm | Đánh giá |
|---|---|
| Phân chia giao diện theo vai trò | Khá tốt |
| Chức năng CRUD cơ bản | Khá đầy đủ |
| Phân quyền ở route | Có triển khai nhưng còn lỗ hổng theo bản ghi |
| Luồng xuyên suốt vòng đời tài sản | Chưa chặt chẽ |
| Ma trận trạng thái | Thiếu hoặc không được cưỡng chế |
| Tính toàn vẹn dữ liệu | Còn nhiều khoảng trống |
| Giao dịch đồng thời | Chưa xử lý đủ |
| Thông báo tự động | Hầu như chưa nối |
| Audit log | Chỉ phủ một phần |
| Kiểm thử tự động | Chưa có |
| Mức sẵn sàng dùng thật | Chưa nên đưa vào vận hành thực tế |

## 1.2. Năm vấn đề phải sửa trước tiên

1. **Lỗ hổng truy cập dữ liệu theo ID:** sinh viên có thể gọi API để xem phòng, thiết bị hoặc phiếu báo hỏng không thuộc mình.
2. **Trang sinh viên lấy sai phòng:** trang “Phòng của tôi” và “Thiết bị trong phòng” lấy phòng đầu tiên toàn hệ thống thay vì phòng đang được phân công.
3. **Các API phiếu tài sản lấy sai ID người dùng:** controller dùng `user.userId`, trong khi JWT cung cấp `sub`, dẫn đến `createdBy` có thể là `undefined`.
4. **Luồng trạng thái không hợp lệ:** hủy báo hỏng không chạy; thanh lý có thể nhảy trạng thái tùy ý; cập nhật tài sản cho phép bỏ qua toàn bộ quy trình nghiệp vụ.
5. **Thiếu ràng buộc cơ sở dữ liệu:** chưa bảo đảm một sinh viên chỉ có một phòng đang hoạt động, chưa ngăn trùng tài sản trong kiểm kê/thanh lý, chưa cưỡng chế hội đồng thuộc đúng một loại hồ sơ.

---

# 2. Phạm vi và bằng chứng rà soát

Project có:

- 72 file TypeScript backend.
- 92 file TypeScript/TSX frontend.
- 16 controller và 16 service backend.
- 12 file DTO.
- Không phát hiện test tự động trong source.
- README hiện trống.

## 2.1. Kết quả kiểm tra build

- Frontend cài dependency và build production thành công.
- Frontend audit dependency báo 6 lỗ hổng: 1 thấp, 3 trung bình, 2 cao.
- Backend không thể hoàn tất build độc lập trong môi trường rà soát vì `bcrypt` và Prisma Engine cần tải binary từ mạng, trong khi môi trường không truy cập được nguồn binary. Sau khi bỏ script cài đặt, TypeScript chỉ còn lỗi liên quan Prisma Client chưa được generate. Vì vậy không thể kết luận backend build hỏng do source code; kết luận backend chủ yếu dựa trên phân tích tĩnh.
- Backend audit dependency báo 26 lỗ hổng: 3 thấp, 13 trung bình, 10 cao.

---

# 3. Phân quyền phải chốt

Định hướng đúng cho đề tài này là:

## 3.1. ADMIN – chỉ quản trị hệ thống

ADMIN được phép:

- Quản lý tài khoản.
- Gán hoặc thay đổi vai trò.
- Khóa, mở khóa, đặt lại mật khẩu.
- Xem audit log.
- Quản lý cấu hình hệ thống, phiên đăng nhập và sức khỏe hệ thống.
- Xem thống kê tài khoản và an ninh.

ADMIN **không trực tiếp xử lý**:

- Nhập, xuất, cấp phát, thu hồi tài sản.
- Báo hỏng, bảo trì, kiểm kê, thanh lý.
- Xếp sinh viên vào phòng.

Dashboard ADMIN hiện vẫn thống kê tổng tài sản và báo hỏng tại `backend/src/reports/reports.service.ts:9-26`. Nên thay bằng số tài khoản, tài khoản bị khóa, đăng nhập gần đây, lỗi hệ thống và hoạt động audit.

## 3.2. MANAGER – quản lý toàn bộ nghiệp vụ chính

MANAGER được phép:

- Quản lý khu nhà, tầng, phòng.
- Quản lý xếp phòng sinh viên.
- Quản lý danh mục, hồ sơ tài sản.
- Nhập kho, cấp phát, thu hồi, điều chuyển, xuất khỏi hệ thống.
- Tiếp nhận và xử lý báo hỏng.
- Lập kế hoạch và thực hiện bảo trì.
- Kiểm kê.
- Đề xuất và hoàn tất thanh lý.
- Xem báo cáo vận hành.

Trong cùng vai trò MANAGER vẫn nên có **quyền chi tiết** để tách người lập và người duyệt, ví dụ:

- `ASSET_OPERATOR`
- `INVENTORY_OPERATOR`
- `LIQUIDATION_CREATOR`
- `LIQUIDATION_APPROVER`

Không cần tạo thêm vai trò cấp cao mới; có thể dùng bảng permission hoặc cờ chức năng trong nhóm MANAGER.

## 3.3. STUDENT – chỉ thao tác dữ liệu của chính mình

STUDENT được phép:

- Xem hồ sơ cá nhân.
- Xem phòng hiện tại và bạn cùng phòng.
- Xem tài sản thuộc phòng hiện tại.
- Tạo, sửa hoặc hủy phiếu báo hỏng của mình khi chưa được tiếp nhận.
- Theo dõi tiến độ phiếu của mình.
- Xem thông báo của mình.

Quy tắc bắt buộc:

> Với STUDENT, backend phải tự suy ra `userId`, `roomId` từ token và phân công phòng đang hoạt động. Không tin `studentId`, `reporterId` hoặc `roomId` do frontend gửi lên.

---

# 4. Luồng vòng đời tài sản phải thống nhất

Hiện `AssetStatus` đồng thời thể hiện cả vị trí sử dụng và tình trạng kỹ thuật:

- `AVAILABLE`
- `IN_USE`
- `UNDER_MAINTENANCE`
- `DAMAGED`
- `PENDING_LIQUIDATION`
- `LIQUIDATED`

Điều này gây mâu thuẫn. Một thiết bị có thể vừa “đang ở phòng”, vừa “hỏng”, nhưng chỉ lưu được một trạng thái.

## 4.1. Phương án tốt nhất

Tách thành hai trường:

### Trạng thái vòng đời/phân bổ

- `IN_STOCK`: trong kho, chưa cấp phát.
- `ALLOCATED`: đang được giao cho phòng.
- `RETIRED`: đã ra khỏi hệ thống.

### Tình trạng kỹ thuật

- `GOOD`
- `REPORTED_DAMAGED`
- `UNDER_MAINTENANCE`
- `DAMAGED`
- `LOST`

### Trạng thái quy trình thanh lý

Không nên nhét hoàn toàn vào `AssetStatus`; lưu bằng hồ sơ thanh lý đang hoạt động hoặc cờ `isLockedForLiquidation`.

## 4.2. Phương án ngắn hạn nếu chưa đổi schema lớn

Áp dụng ma trận bắt buộc:

```text
AVAILABLE --cấp phát--> IN_USE
IN_USE --tiếp nhận hỏng/bắt đầu sửa--> UNDER_MAINTENANCE
UNDER_MAINTENANCE --sửa tốt, còn ở phòng--> IN_USE
UNDER_MAINTENANCE --sửa tốt, đã thu hồi--> AVAILABLE
IN_USE --thu hồi đạt--> AVAILABLE
IN_USE/DAMAGED/UNDER_MAINTENANCE --trình thanh lý--> PENDING_LIQUIDATION
PENDING_LIQUIDATION --từ chối/hủy--> trạng thái trước đó
PENDING_LIQUIDATION --hoàn tất--> LIQUIDATED và roomId = null
```

Mọi chuyển trạng thái phải đi qua service chuyên trách; không cho `PATCH /assets/:id` thay đổi tùy ý `status` và `roomId` như hiện tại tại `backend/src/assets/assets.service.ts:186-241`.

---

# 5. Phân tích và chốt từng luồng nghiệp vụ

# 5.1. Đăng nhập và xác thực

## Hiện trạng

- Đăng nhập bằng `userCode` và mật khẩu.
- Chỉ tài khoản `ACTIVE` được đăng nhập.
- JWT chứa `sub` và `role`.
- Ghi lại thời điểm đăng nhập và audit log.
- Đổi mật khẩu có kiểm tra mật khẩu hiện tại và tối thiểu 6 ký tự.

Bằng chứng: `backend/src/auth/auth.service.ts:15-79`, `122-155`.

## Vấn đề

- Không giới hạn số lần đăng nhập sai.
- Không có khóa tạm thời hoặc CAPTCHA/rate limit.
- Mật khẩu 6 ký tự là quá yếu.
- Sau khi tài khoản bị khóa hoặc đổi mật khẩu, token cũ vẫn có thể tiếp tục hoạt động đến khi hết hạn.
- `getMe` chỉ kiểm tra người dùng tồn tại, không kiểm tra trạng thái còn `ACTIVE` tại `backend/src/auth/auth.service.ts:82-119`.
- JWT strategy chỉ dựa vào payload, không tái kiểm tra tài khoản.
- Secret dự phòng không được phép dùng trong production.

## Luồng chốt

1. Người dùng gửi `userCode`, `password`.
2. Backend rate-limit theo IP và tài khoản.
3. Tìm tài khoản; trả cùng một thông báo cho trường hợp sai user hoặc sai password.
4. Chỉ cho phép `ACTIVE`.
5. So sánh mật khẩu.
6. Nếu sai, tăng `failedLoginCount`; đủ ngưỡng thì khóa tạm thời.
7. Nếu đúng, đặt lại số lần sai, cập nhật `lastLoginAt`.
8. Phát access token ngắn hạn và refresh token có thể thu hồi.
9. Mỗi request quan trọng kiểm tra `status`, `role`, `authVersion` hoặc session.
10. Ghi audit với IP, user-agent, request ID.

## Điều kiện chặn

- `LOCKED` hoặc `INACTIVE`.
- Token phát trước lần đổi mật khẩu/khóa tài khoản.
- Role trong token không còn khớp DB.

---

# 5.2. Quản lý người dùng

## Hiện trạng

ADMIN có thể:

- Danh sách và lọc người dùng.
- Tạo/cập nhật.
- Khóa/mở khóa.
- Reset mật khẩu.

## Vấn đề

- Chưa ngăn ADMIN tự khóa tài khoản đang dùng.
- Chưa bảo đảm luôn còn ít nhất một ADMIN hoạt động.
- `studentCode` không unique trong schema: `backend/prisma/schema.prisma:103-117`.
- Chưa bắt buộc `studentCode` đối với STUDENT và chưa xóa trường này khi đổi sang vai trò khác.
- Frontend có khả năng gửi password trong luồng cập nhật nhưng DTO update không hỗ trợ; với `forbidNonWhitelisted`, request sẽ bị từ chối.
- MANAGER cần tìm người dùng để chọn hội đồng, nhưng `GET /users` chỉ cho ADMIN tại `backend/src/users/users.controller.ts:15-38`. Component hội đồng gọi trực tiếp API này tại `frontend/src/components/council/CouncilMemberSelect.tsx:29-51`, nên MANAGER không tìm được thành viên.

## Luồng chốt – tạo tài khoản

1. ADMIN nhập họ tên, mã tài khoản, vai trò và thông tin liên hệ.
2. Backend chuẩn hóa mã tài khoản: trim, quy tắc chữ hoa/thường thống nhất.
3. Kiểm tra `userCode` duy nhất.
4. Nếu vai trò STUDENT:
   - Bắt buộc `studentCode`.
   - `studentCode` duy nhất.
5. Nếu không phải STUDENT, `studentCode = null`.
6. Tạo mật khẩu tạm thời an toàn hoặc gửi liên kết thiết lập mật khẩu.
7. Bắt buộc đổi mật khẩu ở lần đăng nhập đầu.
8. Ghi audit.

## Luồng chốt – khóa tài khoản

1. ADMIN chọn lý do khóa.
2. Không cho tự khóa chính mình.
3. Không cho khóa ADMIN hoạt động cuối cùng.
4. Cập nhật `LOCKED`, tăng `authVersion` hoặc thu hồi session.
5. Đóng refresh token.
6. Ghi audit đầy đủ.

## API hỗ trợ nghiệp vụ MANAGER

Không mở toàn bộ `GET /users` cho MANAGER. Tạo endpoint giới hạn:

```text
GET /directory/users?keyword=&eligibleForCouncil=true
GET /directory/students?keyword=
```

Chỉ trả các trường tối thiểu: ID, mã, họ tên, vai trò, trạng thái.

---

# 5.3. Hồ sơ cá nhân và đổi mật khẩu

## Hiện trạng

- Mọi người dùng có thể xem/sửa profile và đổi mật khẩu.
- Schema có nhiều trường: khoa, lớp, khóa, liên hệ khẩn cấp.

## Vấn đề

- API profile chưa đồng bộ đủ các trường trong schema.
- `dateOfBirth` lưu dạng `String` thay vì kiểu ngày tại `backend/prisma/schema.prisma:136-153`.
- Avatar có xu hướng gửi trực tiếp dạng base64; không phù hợp khi file lớn.
- Chưa phân biệt trường người dùng tự sửa và trường chỉ ADMIN được sửa.

## Luồng chốt

- Người dùng tự sửa: avatar, điện thoại, địa chỉ, liên hệ khẩn cấp.
- ADMIN sửa: họ tên chính thức, mã tài khoản, mã sinh viên, vai trò, trạng thái.
- Upload ảnh vào object storage; DB chỉ lưu URL.
- Xác thực MIME, kích thước, phần mở rộng.
- Đổi mật khẩu làm mất hiệu lực các phiên khác.

---

# 5.4. Quản lý khu nhà, tầng và phòng

## Hiện trạng

- Tạo khu nhà có thể tự sinh tầng và phòng.
- Sửa, xóa khu nhà.
- Sửa hàng loạt phòng.
- CRUD phòng riêng.

## Vấn đề

1. Schema `DormBuilding` chỉ có code/name, nhưng frontend/API hiển thị `genderZone`, `status`, `description`; service trả giá trị giả `null`, `ACTIVE` tại `backend/src/locations/locations.service.ts:27-43`.
2. Service tự tạo “một giường giả” cho mỗi phòng bằng ID tính toán tại dòng 39 và 102, trong khi không có bảng Bed.
3. Tạo khu nhà, tầng, phòng không nằm trong một transaction; lỗi giữa chừng tạo dữ liệu dở dang tại `locations.service.ts:63-107`.
4. `batchUpdateRooms` chỉ kiểm tra khu nhà tồn tại, nhưng update mọi `roomIds` được gửi, kể cả phòng thuộc khu khác tại dòng 184-212.
5. Xóa khu nhà dùng cascade tầng/phòng; không phù hợp khi đã có lịch sử nghiệp vụ.
6. Chưa có trạng thái phòng: hoạt động, khóa, đang sửa, ngừng sử dụng.
7. Cho giảm sức chứa xuống thấp hơn số sinh viên hiện tại.
8. Thiếu unique `(buildingId, floorNumber)`.

## Luồng chốt – tạo khu nhà

1. MANAGER nhập mã, tên, khu giới tính, trạng thái, mô tả.
2. Kiểm tra mã duy nhất sau chuẩn hóa.
3. Nếu tự sinh tầng/phòng, kiểm tra toàn bộ mã dự kiến trước.
4. Tạo khu nhà, tầng, phòng trong một transaction.
5. Không tạo “giường giả”. Nếu cần quản lý giường, thêm model Bed thật; nếu đề tài không cần, bỏ hoàn toàn giao diện giường.
6. Ghi audit.

## Luồng chốt – cập nhật phòng

- Không cho capacity < số assignment đang hoạt động.
- Không cho chuyển phòng sang `CLOSED` nếu còn sinh viên hoặc tài sản.
- Chỉ update hàng loạt các phòng thuộc đúng khu nhà trong URL.

## Luồng chốt – ngừng sử dụng

Không xóa vật lý khi đã có lịch sử. Dùng:

- `ACTIVE`
- `MAINTENANCE`
- `INACTIVE`
- `CLOSED`

Chỉ hard-delete khu/phòng chưa từng phát sinh sinh viên, tài sản, kiểm kê hoặc báo hỏng.

---

# 5.5. Xếp phòng, chuyển phòng và trả phòng

## Hiện trạng

- MANAGER xem danh sách phòng và sinh viên.
- Thêm sinh viên vào phòng.
- Chuyển phòng.
- Xóa sinh viên khỏi phòng.

## Vấn đề

- `assignStudent` không kiểm tra sức chứa tại `backend/src/rooms/rooms.service.ts:101-129`.
- Không kiểm tra user thật sự có role STUDENT và status ACTIVE.
- Chưa có unique index bảo đảm một sinh viên chỉ có một assignment hoạt động.
- Có race condition khi hai request xếp phòng đồng thời.
- Chuyển phòng có kiểm tra sức chứa nhưng chưa khóa hàng dữ liệu.
- Không có lý do, người thực hiện, ngày hiệu lực, ghi chú.
- Trả phòng không kiểm tra phiếu báo hỏng đang mở hoặc nghĩa vụ bàn giao thiết bị.
- Không có audit/notification.

## Luồng chốt – xếp phòng

### Tiền điều kiện

- Tài khoản là STUDENT và `ACTIVE`.
- Sinh viên chưa có assignment hoạt động.
- Phòng ở trạng thái `ACTIVE`.
- Số người hiện tại < capacity.
- Phù hợp quy định khu nam/nữ nếu hệ thống quản lý giới tính.

### Xử lý

1. MANAGER chọn sinh viên và phòng.
2. Backend mở transaction.
3. Khóa hoặc kiểm tra lại số lượng assignment.
4. Tạo assignment với `startDate`, `assignedBy`, `reason`.
5. Ghi audit.
6. Gửi thông báo cho sinh viên.

### Ràng buộc DB

PostgreSQL partial unique index:

```sql
CREATE UNIQUE INDEX uq_active_room_assignment_per_student
ON room_student_assignments(student_id)
WHERE is_active = true;
```

## Luồng chốt – chuyển phòng

1. Phải có assignment hiện tại.
2. Phòng đích hợp lệ và còn chỗ.
3. Có lý do chuyển.
4. Trong cùng transaction:
   - Kết thúc assignment cũ.
   - Tạo assignment mới.
   - Ghi lịch sử.
5. Gửi thông báo.

## Luồng chốt – trả phòng

1. Kiểm tra phiếu báo hỏng chưa đóng.
2. Kiểm tra biên bản bàn giao/ghi nhận tình trạng phòng nếu có.
3. Kết thúc assignment.
4. Không xóa lịch sử.
5. Gửi xác nhận cho sinh viên.

---

# 5.6. Sinh viên xem phòng của mình

## Lỗi hiện tại rất nghiêm trọng

`StudentRoomPage` gọi `getRooms()` và lấy `rooms[0]` tại:

- `frontend/src/pages/student/StudentRoomPage.tsx:30-49`.

Trang còn đặt `roommates = []`, nên danh sách bạn cùng phòng luôn trống.

`StudentRoomAssetsPage` cũng lấy phòng đầu tiên tại:

- `frontend/src/pages/student/StudentRoomAssetsPage.tsx:31-51`.

Trong khi API `/locations/rooms` trả toàn bộ phòng cho STUDENT. Điều này vừa sai chức năng vừa rò rỉ dữ liệu.

## Luồng chốt

Tạo API riêng:

```text
GET /students/me/room
GET /students/me/roommates
GET /students/me/room-assets
```

Backend:

1. Lấy `userId` từ token.
2. Tìm assignment `isActive = true`.
3. Nếu không có, trả `currentRoom: null`.
4. Chỉ trả phòng, bạn cùng phòng và tài sản của assignment đó.
5. Không nhận `roomId` từ client.

Loại bỏ quyền STUDENT khỏi:

```text
GET /locations/rooms
GET /rooms/:id/students
GET /rooms/:id/assets
GET /assets
GET /assets/:id/history
```

Hoặc bắt buộc các endpoint đó kiểm tra ID chính là phòng hiện tại.

---

# 5.7. Danh mục tài sản

## Hiện trạng

- MANAGER CRUD danh mục.
- Schema có `maintenanceCycleMonths`.

## Vấn đề

- Chu kỳ bảo trì trong schema chưa được nối đầy đủ vào DTO/service/UI.
- UI/API có một số trường như unit nhưng DB không có, service trả placeholder.
- Chưa chặn xóa danh mục đã có tài sản theo chính sách nghiệp vụ rõ ràng.

## Luồng chốt

1. Tạo mã và tên danh mục duy nhất.
2. Khai báo đơn vị tính, chu kỳ bảo trì mặc định, thời gian khấu hao nếu cần.
3. Khi tạo tài sản, có thể kế thừa chu kỳ bảo trì.
4. Danh mục đã phát sinh tài sản chỉ được vô hiệu hóa, không xóa.
5. Thay đổi chu kỳ mặc định không tự ý sửa kế hoạch cũ nếu chưa được xác nhận.

---

# 5.8. Hồ sơ tài sản

## Hiện trạng

- MANAGER tạo một hoặc hàng loạt tài sản.
- Cập nhật mã, tên, danh mục, phòng, trạng thái.
- Xóa cứng nếu chưa có lịch sử; “xóa mềm” bằng cách đổi thành `LIQUIDATED` nếu đã có lịch sử.
- Có AssetHistory.

## Vấn đề

1. Nhiều trường giao diện là dữ liệu giả/null: giá mua, ngày mua, bảo hành, serial, nhà cung cấp tại `backend/src/assets/assets.service.ts:61-88`.
2. Có thể tạo tài sản `AVAILABLE` nhưng đã có `roomId`.
3. Có thể đổi status/room trực tiếp qua update, bỏ qua cấp phát, thu hồi, bảo trì và thanh lý.
4. Bulk create không kiểm tra `endNumber >= startNumber`, không giới hạn số lượng, không tạo history cho từng tài sản.
5. “Xóa mềm” bằng cách đổi status thành `LIQUIDATED` làm sai lịch sử nghiệp vụ tại `assets.service.ts:257-316`.
6. Không có `deletedAt`, `deletedBy`, `isActive`.
7. Mã tài sản có thể được đổi sau khi đã phát sinh chứng từ, gây khó truy vết.

## Luồng chốt – tạo hồ sơ tài sản

Tài sản chỉ nên được tạo từ:

- Phiếu nhập đã ghi sổ; hoặc
- Chức năng tạo dữ liệu ban đầu có quyền đặc biệt và audit rõ ràng.

Các trường tối thiểu:

- Mã tài sản.
- Tên.
- Danh mục.
- Serial/model nếu có.
- Ngày mua, nguyên giá, nhà cung cấp.
- Ngày hết bảo hành.
- Nguồn hình thành.
- Trạng thái phân bổ.
- Tình trạng kỹ thuật.

## Luồng chốt – sửa hồ sơ

Cho sửa thông tin mô tả, nhưng:

- Không đổi status hoặc room bằng CRUD chung.
- Không đổi mã sau khi đã ghi sổ, hoặc phải có luồng đổi mã riêng.
- Mọi thay đổi quan trọng phải có history/audit.

## Luồng chốt – xóa

- Dữ liệu chưa ghi sổ và chưa có quan hệ: được xóa cứng.
- Tài sản đã phát sinh: chỉ `isActive = false`, `deletedAt`, `deletedBy`, `deleteReason`.
- Không dùng `LIQUIDATED` để biểu diễn “đã xóa”.

---

# 5.9. Nhập kho

## Hiện trạng

- Tạo phiếu nhập và đồng thời sinh tài sản.
- Có thông tin nhà cung cấp, hợp đồng, chứng từ, giá và bảo hành.
- Có AssetReceiptItem và AssetHistory.

## Lỗi trực tiếp

Controller dùng `user.userId` tại:

- `backend/src/asset-receipts/asset-receipts.controller.ts:19-38`.

JWT thực tế chứa `sub`. Cần đổi thành:

```ts
@CurrentUser('sub') userId: number
```

## Vấn đề nghiệp vụ

- `items` có thể rỗng.
- `qty`, `unitPrice`, `warranty` không được validate chặt.
- `totalAmount` tin từ client, không tính lại từ item.
- Chưa kiểm tra mã trùng trong chính danh sách request.
- Nếu nhập thẳng vào phòng, tài sản vẫn `AVAILABLE` nhưng có `roomId` tại `asset-receipts.service.ts:82-93`.
- Không kiểm tra danh mục/phòng hợp lệ trước toàn bộ giao dịch.
- Phiếu được ghi ngay, không có trạng thái nháp/ghi sổ/hủy đảo.
- Mã chứng từ dựa timestamp đến millisecond; vẫn có khả năng trùng trong nhiều process/request cùng thời điểm.

## Luồng chốt

### Trạng thái phiếu

```text
DRAFT -> POSTED -> REVERSED
DRAFT -> CANCELLED
```

### Quy trình

1. MANAGER tạo nháp phiếu nhập.
2. Nhập nhà cung cấp, số chứng từ và danh sách tài sản.
3. Backend kiểm tra:
   - Ít nhất một item.
   - Số lượng > 0.
   - Giá >= 0.
   - Mã/serial không trùng trong request và DB.
   - Danh mục tồn tại.
4. Backend tính tổng tiền; không tin `totalAmount` từ client.
5. Khi POSTED:
   - Tạo tài sản trong kho với `IN_STOCK/AVAILABLE`, `roomId = null`.
   - Tạo receipt item.
   - Tạo history.
   - Tạo kế hoạch bảo trì nếu có cấu hình.
6. Phiếu POSTED không cho sửa trực tiếp.
7. Sai sót phải tạo phiếu đảo/reversal, không xóa chứng từ.

Nếu muốn nhập và cấp thẳng cho phòng, phải thể hiện thành hai sự kiện trong cùng transaction:

```text
NHẬP_KHO -> CẤP_PHÁT
```

---

# 5.10. Cấp phát tài sản cho phòng

## Hiện trạng

- Tạo phiếu HANDOVER.
- Cập nhật `roomId` và `IN_USE`.
- Tạo receipt item và history.

## Vấn đề

- Không xác minh phòng đích tồn tại trước toàn bộ vòng lặp.
- Không xác minh tài sản tồn tại, ở trong kho và đủ điều kiện cấp phát.
- Không ngăn asset ID trùng trong request.
- Có thể cấp phát tài sản đã thanh lý hoặc đang bảo trì.
- History không lưu đủ old status/old room.
- Không có người nhận hoặc biên bản xác nhận.

## Luồng chốt

### Tiền điều kiện

- Phiếu có ít nhất một tài sản.
- Phòng đích `ACTIVE`.
- Tài sản đang trong kho, tình trạng GOOD.
- Tài sản chưa bị khóa bởi kiểm kê/thanh lý.

### Xử lý

1. Kiểm tra tất cả item trước khi update.
2. Thực hiện all-or-nothing trong transaction.
3. Mỗi tài sản:
   - Lưu old room/status.
   - Gán phòng.
   - Chuyển sang ALLOCATED/IN_USE.
   - Tạo history.
4. Lưu người bàn giao, người nhận, ngày, ghi chú.
5. Gửi thông báo đến sinh viên trong phòng nếu cần.

---

# 5.11. Thu hồi tài sản

## Hiện trạng

- Gửi `fromRoomId`, danh sách asset.
- Xóa `roomId`, đặt `AVAILABLE`.

## Vấn đề

- Không xác minh tài sản thật sự đang ở `fromRoomId`.
- Có thể thu hồi tài sản hỏng hoặc đang bảo trì rồi tự động chuyển thành `AVAILABLE`.
- Không ghi nhận tình trạng khi thu hồi.

## Luồng chốt

1. Chọn phòng nguồn.
2. Backend chỉ trả tài sản đang thuộc phòng đó.
3. Với mỗi tài sản, bắt buộc đánh giá:
   - GOOD → về kho.
   - DAMAGED → về khu chờ sửa/phiếu bảo trì.
   - LOST → tạo biên bản mất.
4. Chỉ GOOD mới chuyển `AVAILABLE`.
5. Ghi old/new room, trạng thái và tình trạng.
6. Không tin `fromRoomId` nếu không khớp DB.

---

# 5.12. Xuất kho/đưa tài sản ra khỏi hệ thống

## Hiện trạng

Phiếu EXPORT hiện đặt thẳng tài sản thành `LIQUIDATED` tại `backend/src/asset-receipts/asset-receipts.service.ts:226-303`.

## Vấn đề

“Xuất kho” và “thanh lý” là hai nghiệp vụ khác nhau:

- Xuất điều chuyển sang đơn vị khác.
- Trả nhà cung cấp.
- Cho mượn bên ngoài.
- Thanh lý/hủy bỏ.

Dùng chung `LIQUIDATED` làm sai ý nghĩa.

## Luồng chốt

Thêm `outboundType`:

- `TRANSFER_OUT`
- `RETURN_TO_SUPPLIER`
- `LOAN_OUT`
- `DISPOSAL`

Chỉ `DISPOSAL` được tạo sau khi hồ sơ thanh lý hoàn tất.

Tài sản serialized thì quantity luôn bằng 1; không cho client gửi `qty > 1` cho một `assetId` duy nhất.

---

# 5.13. Sinh viên báo hỏng

## Hiện trạng

Luồng hiện tại:

```text
SUBMITTED -> REVIEWING -> IN_PROGRESS -> COMPLETED
SUBMITTED/REVIEWING -> REJECTED
```

Có endpoint sinh viên sửa và hủy phiếu.

## Lỗi và lỗ hổng

1. `GET /damage-reports/:id` không truyền user/role vào service, nên STUDENT có thể đọc phiếu khác nếu biết ID: `damage-reports.controller.ts:31-35`.
2. Update không kiểm tra `report.reporterId === userId`: `damage-reports.service.ts:237-315`.
3. Hủy không bao giờ chạy vì `VALID_TRANSITIONS.SUBMITTED` không có `cancel`, dù controller có endpoint: dòng 14-21 và 318-328.
4. Hủy bị ánh xạ thành `REJECTED`, không có trạng thái `CANCELLED`.
5. Sinh viên tự gửi `roomId`; backend chỉ kiểm tra phòng và asset tồn tại, không kiểm tra asset thuộc phòng của sinh viên: dòng 176-205.
6. Không ngăn nhiều phiếu đang mở cho cùng một tài sản.
7. Priority cast `any`, chưa dùng enum DTO.
8. Hoàn tất phiếu luôn đưa tài sản về `IN_USE`, bất kể sửa không được: dòng 381-396.
9. Không có lý do từ chối, nội dung xử lý, người phụ trách, ảnh trước/sau.
10. Không liên kết MaintenanceRecord.
11. UI upload ảnh báo “đang phát triển”.

## Luồng chốt

### Trạng thái

```text
SUBMITTED -> ACCEPTED -> IN_PROGRESS -> RESOLVED
SUBMITTED -> CANCELLED              (chỉ người tạo)
SUBMITTED/ACCEPTED -> REJECTED       (MANAGER, bắt buộc lý do)
```

Có thể giữ tên `REVIEWING` thay `ACCEPTED`, nhưng phải dùng thống nhất. Nên bỏ `APPROVED` vì hiện không có ý nghĩa riêng.

### Tạo phiếu

1. Sinh viên chọn tài sản từ danh sách tài sản phòng mình.
2. Frontend gửi `assetId`, mô tả, mức độ và ảnh.
3. Backend tự lấy phòng từ assignment.
4. Xác minh tài sản đang thuộc phòng đó.
5. Chặn nếu có phiếu mở cho cùng asset.
6. Tạo `SUBMITTED` và log.
7. Thông báo cho MANAGER.

### Tiếp nhận

1. MANAGER chọn người phụ trách và thời hạn dự kiến.
2. Ghi note tiếp nhận.
3. Chuyển `ACCEPTED`.
4. Thông báo sinh viên.

### Bắt đầu xử lý

1. Tạo hoặc liên kết lệnh bảo trì.
2. Chuyển tài sản sang `UNDER_MAINTENANCE`.
3. Chuyển phiếu `IN_PROGRESS`.

### Hoàn tất

Bắt buộc có kết quả:

- `FIXED`: tài sản GOOD, trở lại IN_USE nếu còn ở phòng.
- `NEED_MORE_REPAIR`: tiếp tục UNDER_MAINTENANCE.
- `UNREPAIRABLE`: DAMAGED và tạo đề xuất thanh lý.
- `FALSE_REPORT`: REJECTED với lý do.

Không được mặc định mọi trường hợp về `IN_USE`.

---

# 5.14. Bảo trì

## Hiện trạng

- Có model MaintenancePlan.
- API chỉ đọc kế hoạch.
- Tạo/cập nhật MaintenanceRecord.
- Có dashboard quá hạn/sắp đến hạn.

## Vấn đề

- Không có CRUD kế hoạch bảo trì.
- Chu kỳ danh mục chưa tự tạo/cập nhật kế hoạch.
- MaintenanceRecord là “kết quả đã làm”, nhưng chưa có work order thể hiện lên lịch/đang xử lý.
- Tạo record không đổi trạng thái tài sản, không cập nhật plan, không đóng báo hỏng.
- `maintenanceType` và `resultStatus` chỉ validate string rồi cast `any`: `maintenance-record.dto.ts:14-24` và `maintenance.service.ts:103-125`.
- Có thể sửa bản ghi lịch sử bất kỳ lúc nào.
- Không kiểm tra cost âm, ngày bảo trì/next date, plan có đúng asset không.
- `performedBy` luôn là người nhập hệ thống, chưa tách người thực hiện thực tế.

## Luồng chốt

### Kế hoạch định kỳ

```text
ACTIVE -> PAUSED -> CLOSED
```

- Có chu kỳ, ngày đến hạn, người tạo.
- Tự sinh nhắc việc.
- Khi hoàn tất lần bảo trì, tính `nextDueDate` mới.

### Lệnh bảo trì

Nên thêm `MaintenanceWorkOrder` hoặc status cho quy trình:

```text
DRAFT -> SCHEDULED -> IN_PROGRESS -> COMPLETED
DRAFT/SCHEDULED -> CANCELLED
```

Nguồn tạo:

- Kế hoạch định kỳ.
- Phiếu báo hỏng.
- Kết quả kiểm kê.

### Hoàn tất bảo trì

Trong một transaction:

1. Lưu nội dung, chi phí, vật tư, ảnh, người thực hiện.
2. Lưu kết quả enum chuẩn.
3. Cập nhật tài sản:
   - GOOD/NEED_MONITORING → GOOD, vị trí giữ nguyên.
   - NEED_REPAIR → UNDER_MAINTENANCE.
   - RECOMMEND_LIQUIDATION → DAMAGED và tạo đề xuất, chưa tự thanh lý.
4. Cập nhật kế hoạch lần sau.
5. Đóng/liên kết phiếu báo hỏng nếu có.
6. Tạo history, audit, notification.

Bản ghi đã chốt chỉ được “đính chính” bằng phiên bản hoặc amendment, không sửa âm thầm.

---

# 5.15. Kiểm kê

## Hiện trạng

- Tạo phiếu cho một phòng.
- Snapshot tài sản đang ở phòng thành item.
- Nhập số lượng thực tế, tình trạng và ghi chú.
- Hoàn tất và in.

## Lỗi

1. Trạng thái chỉ có `DRAFT` và `COMPLETED`.
2. Không kiểm tra phòng tồn tại rõ ràng trước khi tạo.
3. Không chặn nhiều đợt kiểm kê đang mở cùng phòng.
4. Hội đồng được chọn trên UI nhưng không gửi lên backend. Submit payload tại `InventoryChecksManagementPage.tsx:589-603` chỉ có roomId, checkDate, generalNote.
5. Component hội đồng gọi API chỉ ADMIN được dùng.
6. `saveItems` không kiểm tra phiếu còn DRAFT.
7. Không dùng transaction.
8. Không kiểm tra itemId thuộc đúng phiếu; có thể update item của phiếu khác: `inventory-checks.service.ts:131-150`.
9. Difference tính `actualQuantity - 1`, không dùng `systemQuantity`.
10. DTO không chặn số lượng âm.
11. Complete không kiểm tra item đã kiểm đủ, hội đồng, trạng thái hiện tại.
12. Kết quả thiếu/hỏng không tạo follow-up.
13. Các thẻ thống kê “thừa/thiếu/hỏng” trên UI đang chứa số cứng như 9, 6, 4 tại `InventoryChecksManagementPage.tsx:520-529`.

## Luồng chốt

### Trạng thái

```text
DRAFT -> IN_PROGRESS -> COMPLETED
DRAFT/IN_PROGRESS -> CANCELLED
```

### Tạo đợt

1. Chọn phạm vi: phòng, tầng, khu hoặc toàn KTX.
2. Chọn ngày và hội đồng.
3. Chặn một scope có hai phiếu mở trùng nhau.
4. Snapshot:
   - assetId
   - systemRoomId
   - systemAllocationStatus
   - systemCondition
   - systemQuantity
5. Lưu council member thật trong DB.

### Thực hiện

Vì mỗi asset có mã riêng, nên nên dùng:

- `isFound: boolean`
- `actualCondition`
- `actualRoomId`
- `note`

Thay vì quantity tùy ý. Nếu vẫn dùng quantity, chỉ cho 0 hoặc 1.

### Hoàn tất

1. Chỉ cho hoàn tất từ IN_PROGRESS.
2. Tất cả item phải được xác nhận.
3. Bắt buộc hội đồng theo quy định.
4. Trong transaction:
   - Khóa phiếu.
   - Ghi completedAt.
   - Tạo discrepancy records.
   - Với hỏng: tạo đề nghị bảo trì/báo hỏng nội bộ.
   - Với thiếu: tạo biên bản mất/điều tra.
   - Với sai phòng: tạo đề nghị điều chuyển, không tự sửa âm thầm.
5. Ghi audit và thông báo.

Ràng buộc DB:

```text
UNIQUE(inventoryCheckId, assetId)
```

---

# 5.16. Thanh lý

## Hiện trạng

Frontend hiển thị:

```text
DRAFT -> PENDING_APPROVAL -> APPROVED -> COMPLETED
```

Có reject/cancel.

## Lỗi

1. Backend chỉ map action sang status, không kiểm tra trạng thái hiện tại: `liquidation-records.service.ts:5-11`, `171-181`. Có thể complete từ DRAFT hoặc approve hồ sơ đã completed.
2. Cùng một MANAGER có thể tạo, trình, duyệt và hoàn tất.
3. Ngay khi tạo DRAFT, tài sản đã bị đổi thành `PENDING_LIQUIDATION`: dòng 115-166.
4. Không ngăn một tài sản nằm trong nhiều hồ sơ thanh lý đang hoạt động.
5. Reject luôn trả asset về `IN_USE`, không nhớ trạng thái trước đó: dòng 209-225.
6. Cancel không khôi phục trạng thái tài sản.
7. Complete không xóa `roomId`.
8. Không lưu approver, thời điểm duyệt, lý do từ chối, doanh thu, bên mua, phương thức xử lý.
9. UI chọn hội đồng nhưng không gửi trong submit: `LiquidationRecordsManagementPage.tsx:204-225`.
10. Schema hỗ trợ nhiều item, nhưng API/UI chỉ tạo một asset mỗi hồ sơ.
11. Không nối từ kết quả bảo trì/kiểm kê sang đề xuất thanh lý.

## Luồng chốt

### Trạng thái

```text
DRAFT -> PENDING_APPROVAL -> APPROVED -> COMPLETED
DRAFT -> CANCELLED
PENDING_APPROVAL -> REJECTED
PENDING_APPROVAL -> CANCELLED          (nếu quy định cho phép)
```

### Ma trận hành động

| Trạng thái hiện tại | Hành động hợp lệ |
|---|---|
| DRAFT | sửa, thêm/bớt tài sản, submit, cancel |
| PENDING_APPROVAL | approve, reject, cancel có quyền |
| APPROVED | complete |
| REJECTED | chỉ xem hoặc clone thành hồ sơ mới |
| COMPLETED | chỉ xem/in |
| CANCELLED | chỉ xem |

### Tách nhiệm vụ

- Người tạo không được tự approve.
- Approver phải có permission `LIQUIDATION_APPROVER`.
- Có hội đồng hoặc chữ ký theo yêu cầu.

### Tạo nháp

- Tài sản chưa cần đổi thành `PENDING_LIQUIDATION`; chỉ đánh dấu hồ sơ đang tham chiếu.
- Khi submit mới khóa tài sản và lưu:
  - `previousStatus`
  - `previousRoomId`

### Reject/cancel

- Khôi phục đúng previous status/room.
- Bắt buộc lý do.

### Complete

Trong transaction:

1. Kiểm tra record đang APPROVED.
2. Ghi phương thức xử lý, bên nhận, giá trị thu hồi, chứng từ.
3. Chuyển tài sản `LIQUIDATED/RETIRED`.
4. `roomId = null`.
5. Tạo AssetHistory.
6. Tạo phiếu xuất loại DISPOSAL.
7. Ghi approver/completer/audit.

Nên hỗ trợ hồ sơ nhiều tài sản vì thanh lý thường theo đợt. Ràng buộc:

```text
UNIQUE(liquidationRecordId, assetId)
```

---

# 5.17. Hội đồng kiểm kê/thanh lý

## Hiện trạng

Có model dùng chung `CouncilMember`, nhưng UI chỉ giữ state cục bộ; DTO/service không lưu.

## Vấn đề dữ liệu

Một CouncilMember có thể:

- Không thuộc hồ sơ nào.
- Hoặc đồng thời thuộc cả inventory và liquidation.

Schema chưa có check constraint tại `backend/prisma/schema.prisma:461-473`.

## Luồng chốt

- Mỗi thành viên phải thuộc đúng một hồ sơ.
- Không trùng user trong cùng hồ sơ.
- Vai trò hội đồng dùng enum hoặc danh mục:
  - CHAIRPERSON
  - SECRETARY
  - MEMBER
  - TECHNICAL_EXPERT
- Có tối thiểu một chủ tịch và một thư ký nếu quy định yêu cầu.
- DTO create/update phải chứa `councilMembers`.
- API tìm thành viên phải dành cho MANAGER với dữ liệu tối thiểu.

Ràng buộc:

```text
CHECK ((inventory_check_id IS NOT NULL)::int +
       (liquidation_record_id IS NOT NULL)::int = 1)
```

---

# 5.18. Thông báo

## Hiện trạng

- Danh sách thông báo của user.
- Đếm chưa đọc.
- Đánh dấu một hoặc tất cả đã đọc.

## Lỗ hổng

`markRead(id)` không kiểm tra notification thuộc user hiện tại:

- `backend/src/notifications/notifications.controller.ts:28-30`
- `backend/src/notifications/notifications.service.ts:49-53`

Bất kỳ user đăng nhập nào biết ID có thể đánh dấu thông báo của người khác.

Ngoài ra, gần như không có service nghiệp vụ nào tạo Notification, nên trung tâm thông báo chưa có nguồn dữ liệu thực.

## Luồng chốt

### Sự kiện cần thông báo

- Sinh viên được xếp/chuyển/trả phòng.
- Sinh viên gửi báo hỏng → MANAGER.
- Phiếu được tiếp nhận/từ chối/bắt đầu/hoàn tất → sinh viên.
- Kế hoạch bảo trì đến hạn → MANAGER.
- Kiểm kê được phân công/hoàn tất.
- Thanh lý chờ duyệt/được duyệt/từ chối.

### Bảo mật

```text
POST /notifications/:id/read
WHERE id = :id AND userId = currentUserId
```

Nếu không thuộc user, trả 404 để không tiết lộ sự tồn tại.

### Kiến trúc

- Phát domain event sau transaction.
- Dùng outbox nếu cần độ tin cậy.
- Notification có `type`, `route`, `relatedId`, `dedupeKey`.

---

# 5.19. Audit log

## Hiện trạng

Audit được gọi ở auth, users, assets và damage report.

## Vấn đề

Các nghiệp vụ trọng yếu chưa audit đầy đủ:

- Khu/phòng.
- Xếp/chuyển/trả phòng.
- Phiếu nhập/cấp phát/thu hồi/xuất.
- Bảo trì.
- Kiểm kê.
- Thanh lý.

Một số audit được ghi sau transaction nghiệp vụ. Nếu audit lỗi, nghiệp vụ đã thành công nhưng log thiếu; hoặc ngược lại response có thể thất bại dù dữ liệu đã đổi.

## Luồng chốt

Mọi command thay đổi dữ liệu phải ghi:

- actorUserId
- action
- entity/table
- recordId
- before/after
- reason
- IP
- user-agent
- requestId/correlationId
- timestamp

Với nghiệp vụ trọng yếu, audit/outbox phải nằm trong cùng transaction.

---

# 5.20. Báo cáo và dashboard

## Hiện trạng

Có summary theo role và báo hỏng theo tháng.

## Vấn đề

- ADMIN đang xem số liệu nghiệp vụ dù định hướng chỉ quản trị hệ thống.
- “Tài sản hỏng” chỉ đếm `Asset.status = DAMAGED`; phiếu hỏng mở có thể chưa đổi status nên số liệu lệch.
- Báo hỏng theo tháng tải toàn bộ record lên memory rồi group tại `reports.service.ts:97-116`.
- Chưa có filter thời gian rõ ràng.
- Nhiều số liệu UI còn hard-code.

## Luồng chốt

### ADMIN dashboard

- Tổng user theo role/status.
- Tài khoản bị khóa.
- Đăng nhập gần đây/thất bại.
- Audit đáng chú ý.
- Health hệ thống.

### MANAGER dashboard

- Tài sản theo vị trí và tình trạng.
- Báo hỏng theo SLA.
- Bảo trì đến hạn/quá hạn.
- Kiểm kê chưa hoàn tất và sai lệch.
- Thanh lý chờ duyệt.
- Giá trị tài sản nếu dữ liệu đủ.

### STUDENT dashboard

- Phòng hiện tại.
- Số tài sản trong phòng.
- Phiếu báo hỏng đang xử lý.
- Thông báo mới.

Dùng DB aggregation, có `fromDate`, `toDate`, timezone thống nhất.

---

# 6. Các lỗ hổng phân quyền theo bản ghi

Frontend route guard chỉ là hỗ trợ trải nghiệm. Bảo mật phải nằm ở backend.

## 6.1. Các endpoint cần sửa ngay

| Endpoint | Lỗi | Cách sửa |
|---|---|---|
| `GET /damage-reports/:id` | Student đọc phiếu người khác | Scope `reporterId = currentUserId` nếu STUDENT |
| `PATCH /damage-reports/:id` | Student sửa phiếu người khác | Kiểm tra owner và SUBMITTED |
| `POST /damage-reports/:id/cancel` | Không kiểm owner; transition lại không cho cancel | Owner + trạng thái SUBMITTED + CANCELLED |
| `GET /locations/rooms` | Student xem toàn bộ phòng | Bỏ quyền STUDENT |
| `GET /rooms/:id/students` | Student xem phòng khác | Dùng `/students/me/roommates` |
| `GET /rooms/:id/assets` | Student xem tài sản phòng khác | Dùng `/students/me/room-assets` |
| `GET /assets` | Student xem toàn kho | Bỏ quyền STUDENT |
| `GET /assets/:id/history` | Student xem lịch sử tài sản tùy ý | Chỉ cho asset thuộc phòng hiện tại hoặc bỏ quyền |
| `POST /notifications/:id/mark-read` | User sửa notification người khác | Update theo cả id và userId |

---

# 7. Ràng buộc dữ liệu cần bổ sung

## 7.1. User

- Unique nullable `studentCode`.
- Index roleId, status, createdAt.
- `authVersion`, `passwordChangedAt`, `failedLoginCount`, `lockedUntil`.

## 7.2. Location

- `DormBuilding.status`, `genderZone`, `description` nếu UI thật sự cần.
- Unique `(buildingId, floorNumber)`.
- `Room.status`.
- Không cascade xóa dữ liệu có lịch sử.

## 7.3. Assignment

- Partial unique một assignment active/sinh viên.
- Index `(roomId, isActive)` và `(studentId, isActive)`.
- Thêm `assignedBy`, `endedBy`, `reason`.

## 7.4. Asset

- Thêm purchaseDate, purchaseCost, warrantyExpiryDate, serialNumber, supplierId/source.
- `isActive`, `deletedAt`, `deletedBy`.
- Tách allocationStatus và conditionStatus.
- Index categoryId, roomId, status, createdAt.

## 7.5. Inventory/liquidation/receipt

- Unique `(inventoryCheckId, assetId)`.
- Unique `(liquidationRecordId, assetId)`.
- Unique `(receiptId, assetId)` nếu mỗi dòng ánh xạ tài sản riêng.
- Receipt status và reversal link.
- Liquidation previousStatus/previousRoomId hoặc bảng lock/history.

## 7.6. Council

- Check đúng một foreign key hồ sơ khác null.
- Unique user trong cùng hội đồng.

## 7.7. Concurrency

Thêm `version` hoặc optimistic locking cho:

- Asset.
- InventoryCheck.
- LiquidationRecord.
- Room assignment.

---

# 8. Chuẩn hóa API đề xuất

## 8.1. Resource đọc

```text
GET /me
GET /students/me/room
GET /students/me/roommates
GET /students/me/room-assets
GET /damage-reports/my
GET /notifications/my
```

## 8.2. Command nghiệp vụ

```text
POST /rooms/:roomId/assign-student
POST /room-assignments/:id/transfer
POST /room-assignments/:id/checkout

POST /receipts/import/drafts
POST /receipts/:id/post
POST /receipts/:id/reverse
POST /asset-handovers
POST /asset-reclaims

POST /damage-reports/:id/accept
POST /damage-reports/:id/start
POST /damage-reports/:id/resolve
POST /damage-reports/:id/reject
POST /damage-reports/:id/cancel

POST /maintenance-work-orders
POST /maintenance-work-orders/:id/start
POST /maintenance-work-orders/:id/complete

POST /inventory-checks/:id/start
POST /inventory-checks/:id/complete
POST /inventory-checks/:id/cancel

POST /liquidations/:id/submit
POST /liquidations/:id/approve
POST /liquidations/:id/reject
POST /liquidations/:id/complete
POST /liquidations/:id/cancel
```

Mọi command phải:

- Validate current state.
- Validate permission và ownership.
- Validate tất cả relation.
- Chạy transaction.
- Tạo history/audit.
- Phát notification event.

---

# 9. Những phần giao diện chưa phải tính năng hoàn chỉnh

Cần gắn nhãn hoặc ẩn cho đến khi nối backend:

- Lưu nháp phiếu nhập: đang hiển thị toast “chức năng đang phát triển”.
- Lưu nháp phiếu xuất: đang hiển thị toast “chức năng đang phát triển”.
- Upload ảnh báo hỏng: chưa triển khai.
- Xuất dữ liệu thanh lý: chưa triển khai hoàn chỉnh.
- Hội đồng kiểm kê/thanh lý: chọn được nhưng không lưu.
- Bộ lọc tìm kiếm/tình trạng trên trang tài sản phòng sinh viên: có UI nhưng không có state/filter thực.
- Bạn cùng phòng: luôn rỗng.
- Một số KPI kiểm kê: số hard-code.
- Dữ liệu building gender/status/description và bed: placeholder/giả lập.
- Một số trường tài sản như giá, bảo hành, serial, supplier: API trả null cố định.

Nguyên tắc UI:

> Không hiển thị nút có vẻ hoạt động nhưng thực tế chỉ toast “đang phát triển”. Hoặc hoàn thiện end-to-end, hoặc disable kèm nhãn rõ ràng.

---

# 10. Bộ kiểm thử nghiệp vụ tối thiểu

## 10.1. Phân quyền

1. Student không thể xem phiếu báo hỏng của student khác.
2. Student không thể sửa/hủy phiếu người khác.
3. Student không thể xem phòng và asset ngoài phòng hiện tại.
4. User không thể đánh dấu notification người khác đã đọc.
5. Manager không truy cập chức năng quản trị tài khoản đầy đủ.
6. Admin không có endpoint mutation nghiệp vụ tài sản.

## 10.2. Xếp phòng

7. Không xếp user không phải STUDENT.
8. Không xếp STUDENT bị khóa.
9. Không xếp quá capacity.
10. Hai request đồng thời không tạo hai assignment active.
11. Không giảm capacity dưới số người hiện tại.

## 10.3. Tài sản và chứng từ

12. Không nhập phiếu rỗng.
13. Không nhập mã tài sản trùng trong cùng request.
14. Total amount phải do backend tính.
15. Không cấp phát tài sản đang bảo trì/thanh lý.
16. Không thu hồi asset không thuộc phòng nguồn.
17. Thu hồi asset hỏng không được trở thành AVAILABLE.
18. Không đổi room/status qua PATCH asset chung.

## 10.4. Báo hỏng

19. Chỉ asset trong phòng hiện tại mới được báo.
20. Không tạo hai phiếu mở cho cùng asset.
21. Owner được cancel ở SUBMITTED.
22. Không cancel sau khi accepted.
23. Reject bắt buộc lý do.
24. Resolve theo kết quả bảo trì, không luôn IN_USE.

## 10.5. Kiểm kê

25. Item của phiếu A không thể update qua API phiếu B.
26. Không actualQuantity âm.
27. Không complete phiếu đã complete.
28. Không complete khi còn item chưa kiểm.
29. Hội đồng được lưu đúng.
30. Sai lệch tạo follow-up đúng loại.

## 10.6. Thanh lý

31. Không approve từ DRAFT nếu chưa submit.
32. Người tạo không tự approve.
33. Không complete trước APPROVED.
34. Một asset không nằm trong hai hồ sơ active.
35. Reject/cancel khôi phục đúng trạng thái trước.
36. Complete xóa roomId và tạo phiếu xuất DISPOSAL.

---

# 11. Thứ tự sửa project

## P0 – sửa lỗi bảo mật và lỗi làm nghiệp vụ sai ngay

1. Sửa `user.userId` thành `@CurrentUser('sub')` trong asset receipts.
2. Tạo API `/students/me/room`, roommates, room-assets.
3. Gỡ quyền STUDENT khỏi các API danh sách toàn hệ thống.
4. Bổ sung ownership cho damage report và notification.
5. Thêm `CANCELLED` và sửa transition báo hỏng.
6. Sửa API tìm người cho hội đồng.
7. Không cho update status/room tài sản qua CRUD chung.

## P1 – khóa tính toàn vẹn lõi

1. Thêm unique/index cho assignment, inventory item, liquidation item.
2. Kiểm tra capacity và role/student status trong transaction.
3. Chuẩn hóa asset lifecycle/condition.
4. Thêm state transition matrix cho tất cả workflow.
5. Sửa nhập/cấp phát/thu hồi/xuất theo validation all-or-nothing.
6. Bỏ xóa mềm bằng `LIQUIDATED`.

## P2 – nối các phân hệ thành vòng đời khép kín

1. Báo hỏng ↔ lệnh bảo trì.
2. Bảo trì ↔ kế hoạch định kỳ.
3. Kiểm kê ↔ discrepancy ↔ bảo trì/mất/điều chuyển.
4. Bảo trì/kiểm kê ↔ đề xuất thanh lý.
5. Thanh lý ↔ phiếu xuất DISPOSAL.
6. Domain event ↔ notification ↔ audit.

## P3 – hoàn thiện chất lượng

1. Loại bỏ dữ liệu placeholder/hard-code.
2. Hoàn thiện upload ảnh và lưu trữ file.
3. Pagination/filter server-side đúng.
4. Swagger/OpenAPI và README.
5. Unit test, integration test, e2e test.
6. Sửa dependency vulnerabilities.
7. Thêm CI chạy lint, test, build, migration check.

---

# 12. Luồng nghiệp vụ cuối cùng được chốt

Toàn hệ thống nên vận hành theo chuỗi sau:

```text
ADMIN tạo/quản lý tài khoản
        ↓
MANAGER cấu hình khu – tầng – phòng – danh mục
        ↓
MANAGER xếp STUDENT vào phòng
        ↓
MANAGER lập và POST phiếu nhập
        ↓
Tài sản vào kho, có hồ sơ và lịch sử
        ↓
MANAGER cấp phát cho phòng
        ↓
STUDENT chỉ xem phòng và tài sản của mình
        ↓
STUDENT báo hỏng tài sản thuộc phòng
        ↓
MANAGER tiếp nhận và tạo lệnh bảo trì
        ↓
Bảo trì hoàn tất:
  ├─ sửa tốt → tiếp tục sử dụng
  ├─ cần sửa tiếp → tiếp tục bảo trì
  └─ không thể sửa → đề xuất thanh lý
        ↓
MANAGER kiểm kê định kỳ
        ↓
Sai lệch kiểm kê tạo follow-up:
  ├─ hỏng → bảo trì
  ├─ thiếu → biên bản mất/xác minh
  └─ sai vị trí → điều chuyển
        ↓
Hồ sơ thanh lý được trình và phê duyệt tách nhiệm vụ
        ↓
Hoàn tất thanh lý → tài sản ra khỏi phòng và khỏi hệ thống
        ↓
Mọi bước đều tạo history + audit + notification
```

# 13. Kết luận cuối

Project có nền tảng tốt để tiếp tục hoàn thiện và đã bao phủ đúng phần lớn danh mục nghiệp vụ của đề tài. Điểm yếu không nằm ở việc “thiếu nhiều màn hình”, mà nằm ở ba vấn đề cốt lõi:

1. **Chưa bảo vệ dữ liệu theo chủ sở hữu/phạm vi phòng.**
2. **Chưa có một vòng đời tài sản và ma trận trạng thái duy nhất.**
3. **Các phân hệ báo hỏng, bảo trì, kiểm kê, thanh lý, chứng từ chưa liên kết thành giao dịch nghiệp vụ khép kín.**

Sau khi hoàn thành P0 và P1, hệ thống sẽ từ mức “CRUD demo” chuyển thành một hệ thống nghiệp vụ có logic tương đối chặt. Sau P2 và P3, project mới đạt mức đủ tin cậy để trình bày như một hệ thống quản lý cơ sở vật chất KTX hoàn chỉnh.
