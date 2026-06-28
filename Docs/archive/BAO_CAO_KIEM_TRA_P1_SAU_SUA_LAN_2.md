# BÁO CÁO KIỂM TRA P1 SAU KHI SỬA – HỆ THỐNG QUẢN LÝ CƠ SỞ VẬT CHẤT KTX

## 1. Kết luận

**P1 CHƯA HOÀN THÀNH VÀ CHƯA ĐỦ ĐIỀU KIỆN NGHIỆM THU.**

Mức hoàn thiện ước tính: **55–60%**.

Project đã sửa đúng một số blocker quan trọng, nhưng vẫn còn các lỗi về vòng đời tài sản, thanh lý, kiểm kê, regression P0, tích hợp frontend–backend, migration/constraint và kiểm thử tự động.

---

## 2. Những phần đã đạt hoặc cải thiện rõ

### 2.1. Tạo tài sản đơn lẻ

`CreateAssetDto` không còn nhận `status` và `roomId`. `AssetsService.create()` tự gán:

```text
status = AVAILABLE
roomId = null
```

Đây là hướng xử lý đúng.

### 2.2. Nhập kho

`AssetReceiptsService.createImportReceipt()` tạo tài sản với:

```text
status = AVAILABLE
roomId = null
```

Frontend trang nhập kho cũng đã bỏ lựa chọn khu/phòng trong luồng chính.

### 2.3. Asset transition

`AssetTransitionService` đã có:

- Ma trận chuyển trạng thái tập trung.
- Kiểm tra bất biến cơ bản giữa `status` và `roomId`.
- Chặn `IN_USE -> IN_USE` đổi phòng nếu không phải hành động điều chuyển.
- Conditional update theo `id + status cũ + roomId cũ`.
- Trả `ConflictException` nếu bản ghi đã bị giao dịch khác thay đổi.
- Ghi `AssetHistory` trong cùng transaction client.

Đây là cải tiến quan trọng và đúng hướng.

### 2.4. Batch update phòng

`LocationsService.batchUpdateRooms()` đã:

- Kiểm tra building tồn tại.
- Kiểm tra tất cả room thuộc đúng building trên URL.
- Kiểm tra capacity không nhỏ hơn số sinh viên hiện tại.
- Dùng transaction `Serializable`.
- Rollback toàn batch khi có lỗi.

### 2.5. Phân phòng

Đã có partial unique index:

```sql
CREATE UNIQUE INDEX "idx_active_assignment"
ON "room_student_assignments" ("studentId")
WHERE "isActive" = true;
```

Xếp phòng và chuyển phòng cũng đã dùng transaction `Serializable`.

### 2.6. Khóa ngoại lịch sử

Migration `20260627185903_remove_dangerous_cascades` đã đổi nhiều quan hệ quan trọng sang `ON DELETE RESTRICT`, gồm:

- Building → Floor.
- Floor → Room.
- Room → RoomStudentAssignment.
- User → RoomStudentAssignment.
- Asset → AssetHistory.
- DamageReport → DamageReportLog.
- InventoryCheck → InventoryCheckItem.
- LiquidationRecord → LiquidationItem.
- AssetReceipt → AssetReceiptItem.

### 2.7. Frontend

Lệnh sau chạy thành công:

```bash
cd frontend
npm ci
npm run build
```

Frontend TypeScript và Vite build thành công.

---

## 3. Blocker còn lại

## BLOCKER 1 – Bulk create asset vẫn nhận `status` và `roomId`

File:

```text
backend/src/assets/dto/bulk-create-asset.dto.ts
```

Các dòng 30–37 vẫn khai báo:

```ts
status?: AssetStatusEnum;
roomId?: number | null;
```

Do global `ValidationPipe` đang bật `forbidNonWhitelisted: true`, hai field này được xem là field hợp lệ và request gửi chúng vẫn được chấp nhận.

Hiện service đang bỏ qua giá trị và tự gán `AVAILABLE + roomId null`, nên chưa trực tiếp tạo dữ liệu mâu thuẫn. Tuy nhiên tiêu chí P1 yêu cầu client không được phép gửi field vòng đời qua CRUD/bulk CRUD, vì vậy hạng mục này chưa đạt.

Frontend service cũng vẫn khai báo `status` và `roomId` trong payload `createBulkAssets()`.

### Cần sửa

- Xóa `status` và `roomId` khỏi `BulkCreateAssetDto`.
- Xóa khỏi type frontend.
- Test gửi hai field này phải nhận `400 Bad Request`.

---

## BLOCKER 2 – DTO nhập kho vẫn nhận `roomId`

File:

```text
backend/src/asset-receipts/dto/create-import-receipt.dto.ts
```

Dòng 67–69 vẫn khai báo:

```ts
roomId?: string;
```

Service hiện bỏ qua field này và tạo asset trong kho, nhưng API vẫn chấp nhận input không đúng nghiệp vụ.

### Cần sửa

- Xóa `roomId` khỏi DTO nhập kho.
- Xóa biến `roomId` được destructure trong service.
- Test gửi `roomId` phải trả `400`.

---

## BLOCKER 3 – Xóa tài sản bypass state machine

File:

```text
backend/src/assets/assets.service.ts
```

Trong `delete()`, khi asset có lịch sử, service cập nhật trực tiếp:

```ts
status: 'LIQUIDATED',
roomId: null,
```

mà không đi qua `AssetTransitionService`.

Hệ quả:

- Có thể chuyển trực tiếp `IN_USE -> LIQUIDATED`.
- Có thể chuyển trực tiếp `UNDER_MAINTENANCE -> LIQUIDATED`.
- Có thể bỏ qua quy trình thanh lý.
- Có thể làm trạng thái asset và hồ sơ thanh lý không đồng bộ.

Nếu asset chưa có history, service còn cho hard delete bất kể asset có đang ở phòng hay không.

### Cần sửa

- Không dùng thao tác xóa asset để thay thế nghiệp vụ thanh lý.
- Asset đã phát sinh nghiệp vụ phải được vô hiệu hóa bằng lifecycle riêng hoặc bị từ chối xóa.
- Mọi thay đổi trạng thái phải qua state machine.
- Không hard delete asset đang có `roomId`, trạng thái khác kho, hoặc đang nằm trong nghiệp vụ mở.

---

## BLOCKER 4 – Cấp phát lại asset đã `IN_USE` vào cùng phòng vẫn thành công

`AssetTransitionService` chỉ kiểm tra ma trận khi trạng thái thay đổi:

```ts
if (currentStatus !== newStatus && ...)
```

Nếu asset đã:

```text
IN_USE + ROOM_A
```

và tạo phiếu cấp phát mới vào chính `ROOM_A`, transition trở thành:

```text
IN_USE + ROOM_A -> IN_USE + ROOM_A
```

Transition không bị chặn, không ghi history, nhưng service vẫn tạo phiếu và receipt item mới.

Như vậy một asset có thể được “cấp phát” nhiều lần dù không rời kho.

### Cần sửa

Command cấp phát phải kiểm tra rõ:

```text
currentStatus = AVAILABLE
currentRoomId = null
```

Không chỉ dựa vào transition chung.

Ngoài ra cần unique constraint hoặc application rule cho:

```text
receiptId + assetId
```

---

## BLOCKER 5 – Xuất kho có thể không hoạt động đúng và trả sai mã lỗi

`createExportReceipt()` gọi:

```text
AVAILABLE/PENDING_LIQUIDATION -> LIQUIDATED
```

nhưng ma trận hiện chỉ cho:

```text
PENDING_LIQUIDATION -> LIQUIDATED
```

Frontend lại tải toàn bộ asset, không lọc theo trạng thái hợp lệ. Manager có thể chọn asset `AVAILABLE`, `IN_USE`, `UNDER_MAINTENANCE` hoặc trạng thái khác.

Ngoài ra service bắt mọi lỗi và đổi thành:

```text
500 Failed to create export receipt
```

kể cả lỗi transition đáng ra phải là `409 Conflict`.

### Cần sửa

- Chốt rõ loại xuất kho nào được phép với từng trạng thái.
- Frontend chỉ hiển thị asset đủ điều kiện.
- Backend vẫn kiểm tra lại.
- Không wrap `ConflictException`/`BadRequestException` thành 500.

---

## BLOCKER 6 – Thanh lý vẫn chưa đúng vòng đời

File:

```text
backend/src/liquidation-records/liquidation-records.service.ts
```

### 6.1. Asset bị chuyển `PENDING_LIQUIDATION` ngay khi record còn `DRAFT`

Trong `create()`, asset được chuyển trạng thái trước rồi mới tạo record `DRAFT`.

Điều này khóa asset ngay từ bản nháp và làm draft có side effect vòng đời.

### 6.2. Có thể tạo nhiều record thanh lý đang mở cho cùng asset

Lần tạo thứ hai gọi:

```text
PENDING_LIQUIDATION -> PENDING_LIQUIDATION
```

Do same-state transition được cho qua, record thứ hai vẫn được tạo.

Không có partial unique index hoặc kiểm tra active liquidation item.

### 6.3. `cancel` không khôi phục asset

Service chỉ khôi phục asset khi action là `reject`. Các trường hợp:

```text
DRAFT -> CANCELLED
PENDING_APPROVAL -> CANCELLED
APPROVED -> CANCELLED
```

đều để asset mắc kẹt ở `PENDING_LIQUIDATION`.

### 6.4. Race condition transition record

Record được đọc ngoài transaction, sau đó update theo `id` mà không kèm expected status.

Hai request `approve/reject`, `complete/cancel` đồng thời có thể cùng vượt qua kiểm tra trạng thái cũ.

### 6.5. Không phân tách người tạo và người duyệt

Cùng một manager có thể tạo và approve hồ sơ của chính mình.

### 6.6. Vẫn dùng `as any`

Status được ghi bằng:

```ts
data: { status: newStatus as any }
```

### Cần sửa

- DRAFT không làm thay đổi asset.
- Chỉ khi submit mới khóa asset.
- Conditional update record theo `id + expectedStatus`.
- Reject/cancel khôi phục chính xác status và room trước đó.
- Chặn nhiều hồ sơ active cùng asset.
- Tách người tạo/người duyệt nếu nghiệp vụ yêu cầu.
- Audit và notification trong cùng transaction.

---

## BLOCKER 7 – Maintenance vẫn dùng string và `as any`, actor cập nhật sai

File DTO:

```text
backend/src/maintenance/dto/maintenance-record.dto.ts
```

`maintenanceType` và `resultStatus` vẫn chỉ dùng `@IsString()` thay vì enum thật.

Service tiếp tục ghi:

```ts
maintenanceType: body.maintenanceType as any,
resultStatus: body.resultStatus as any,
```

Điều này làm TypeScript không bảo vệ enum và validation không chặn giá trị không hợp lệ trước khi vào Prisma.

Trong `updateRecord()`, asset transition dùng:

```ts
userId: 0
```

nên actor history/audit không phản ánh người thực hiện thật.

Controller update cũng không truyền current user vào service.

### Cần sửa

- Dùng `MaintenanceType` và `MaintenanceResultStatus` thực từ Prisma/domain.
- Dùng `@IsEnum()`.
- Bỏ toàn bộ `as any` liên quan.
- Controller update lấy `@CurrentUser('sub')`.
- Service nhận actor thật.
- Bổ sung test enum sai và transition rollback.

---

## BLOCKER 8 – Inventory save vẫn có thể cập nhật dở dang một phần

File:

```text
backend/src/inventory-checks/inventory-checks.service.ts
```

`saveItems()` lặp qua từng item và gọi Prisma ngoài transaction.

Nếu item 1 cập nhật thành công nhưng item 2 không thuộc session, item 1 vẫn bị lưu.

Các vấn đề khác:

- Không chặn item ID trùng trong payload.
- DTO chưa có `@Min(0)` cho `actualQuantity`.
- `difference` tính bằng `actualQuantity - 1` thay vì `actualQuantity - systemQuantity`.
- Complete chưa xác minh tất cả item bắt buộc đã được kiểm kê.
- Chưa có audit/history.
- Chưa có unique constraint `(inventoryCheckId, assetId)`.

### Cần sửa

- Validate toàn bộ item trước.
- Dùng một transaction cho toàn bộ batch.
- Tính difference từ dữ liệu DB.
- Conditional update session khi complete.
- Bổ sung duplicate check và constraint.

---

## BLOCKER 9 – Single room update vẫn có race condition với xếp phòng

`RoomsService.update()` thực hiện:

```text
count active assignment
-> update capacity
```

ngoài transaction serializable/lock.

Một request giảm capacity có thể chạy đồng thời với request xếp phòng và tạo kết quả:

```text
occupancy > capacity
```

Batch update đã dùng Serializable, nhưng update một phòng chưa dùng.

### Cần sửa

- Đưa read-check-write vào transaction có isolation/lock phù hợp.
- Test đồng thời giảm capacity và assign student.
- Map serialization conflict thành `409`, không trả 500 thô.

---

## BLOCKER 10 – API room dành cho student dùng sai field JWT

JWT payload thực tế là:

```ts
{ sub, role }
```

Nhưng `RoomsService.getStudents()` và `getAssets()` kiểm tra:

```ts
studentId: user.userId
```

`user.userId` không tồn tại.

Hệ quả:

- Student không xem được chính phòng của mình qua `/rooms/:id/students` và `/rooms/:id/assets`.
- Đây không còn là lỗ hổng đọc phòng khác, nhưng là regression chức năng P0.

### Cần sửa

- Dùng `user.sub`.
- Hoặc tốt hơn, bỏ role STUDENT khỏi route `/rooms/:id/...` và chỉ dùng `/students/me/...`.
- Bổ sung E2E test phòng mình/phòng khác.

---

## BLOCKER 11 – Student có thể đổi asset của phiếu báo hỏng sang asset phòng khác

Trong `DamageReportsService.update()`, nếu student gửi `assetId` mới, service cập nhật trực tiếp:

```ts
updateData.assetId = body.assetId;
```

Không kiểm tra asset mới có thuộc phòng hiện tại của student hay không.

Như vậy sinh viên có thể sửa phiếu `SUBMITTED` của mình để trỏ tới asset ngoài phạm vi.

Ngoài ra controller dùng inline object type thay vì DTO class, nên global ValidationPipe không thực hiện validation đầy đủ cho payload này.

### Cần sửa

- Khi đổi asset, xác minh assignment hiện tại và asset thuộc đúng room.
- Chống phiếu mở trùng trên asset mới.
- Tạo DTO class với `@IsEnum`, `@IsInt`, `@IsString`.
- Không nhận `roomId` từ student.

---

## BLOCKER 12 – Frontend sửa tài sản sẽ bị backend trả 400

Frontend `AssetsManagementPage` gửi payload gồm:

```text
supplierId
serialNumber
condition
notes
purchaseDate
warrantyExpiryDate
purchaseCost
```

Nhưng `UpdateAssetDto` backend chỉ cho:

```text
assetCode
assetName
description
categoryId
```

Do `forbidNonWhitelisted: true`, request update sẽ bị từ chối vì các field thừa.

Frontend build thành công không phát hiện lỗi hợp đồng API này.

### Cần sửa

Chọn một trong hai:

1. Backend hỗ trợ thật các field và schema có cột tương ứng; hoặc
2. Frontend chỉ gửi các field backend hỗ trợ.

Không gửi “condition” giả nếu schema asset chưa có condition riêng.

---

## BLOCKER 13 – Database constraint/index P1 còn thiếu

Schema/migration chưa có các ràng buộc quan trọng:

- Check `rooms.capacity > 0`.
- Unique `(buildingId, floorNumber)`.
- Unique `(inventoryCheckId, assetId)`.
- Unique `(liquidationRecordId, assetId)`.
- Unique `(receiptId, assetId)`.
- Check quantity không âm/dương theo nghiệp vụ.
- Check `actualQuantity >= 0`.
- Constraint/bảo vệ `AVAILABLE => roomId null` và `IN_USE => roomId not null`.
- Cơ chế chặn một asset ở nhiều nghiệp vụ active.
- Các index truy vấn asset/history/receipt theo yêu cầu P1.

Partial unique active assignment đã có, nhưng chưa đủ để kết luận phần database hoàn thành.

---

## BLOCKER 14 – Test chưa đủ và chưa chạy được theo chuẩn project

Backend `package.json` chưa có script:

```text
test
test:e2e
lint
```

Chỉ có một file:

```text
backend/test/concurrency.e2e-spec.ts
```

Test này còn các vấn đề:

- Nếu database chưa seed category, test `return` và được xem như pass giả.
- Hard-code `roomId = 1`, có thể không tồn tại.
- Không gửi HTTP request dù import `supertest`.
- Không test cấp phát hai phiếu vào hai phòng.
- Không test capacity concurrency.
- Không test liquidation/inventory/P0 regression.
- Kỳ vọng message chứa “trạng thái”, trong khi conflict thực tế có thể là message “Xung đột dữ liệu”.

Chưa có unit test, integration test và regression test theo checklist P1.

---

## BLOCKER 15 – Backend chưa reproducible bằng `npm ci`

Lệnh:

```bash
cd backend
npm ci
```

thất bại ngay do `package.json` và `package-lock.json` không đồng bộ:

```text
Missing: @emnapi/core@1.11.1 from lock file
Missing: @emnapi/runtime@1.11.1 from lock file
```

Đây là lỗi của project/lockfile, không phải lỗi mạng.

Sau khi cài tạm bằng `npm install --ignore-scripts`, Prisma không thể tải engine do DNS môi trường. Vì Prisma Client không generate được, backend build phát sinh hàng loạt lỗi thiếu model/type Prisma. Phần này là blocker môi trường sau bước lockfile, nhưng project vẫn chưa có bằng chứng backend build pass.

---

## 4. Kết quả lệnh kiểm tra

| Lệnh | Kết quả |
|---|---|
| `frontend/npm ci` | Pass |
| `frontend/npm run build` | Pass |
| `backend/npm ci` | Fail – package-lock không đồng bộ |
| `backend/npm install` | Fail ở bcrypt binary do DNS mạng |
| `backend/npm install --ignore-scripts` | Pass tạm để kiểm tra source |
| `npx prisma format/validate` | Không chạy được do không tải Prisma engine |
| `backend/npm run build` | Không xác minh được vì Prisma Client chưa generate |
| `npm run test` | Script không tồn tại |
| `npm run test:e2e` | Script không tồn tại |

Frontend audit ghi nhận 6 vulnerability; backend cài tạm ghi nhận 44 vulnerability. Đây không phải tiêu chí chính của P1 nhưng cần được xử lý trong pha hardening.

---

## 5. Đánh giá checklist P1

| Nhóm | Trạng thái |
|---|---|
| Create asset đơn lẻ khóa status/room | Đạt |
| Bulk create khóa status/room | Chưa đạt |
| Import luôn vào kho | Logic service đạt, DTO chưa đạt |
| Asset transition tập trung | Đạt phần lớn |
| Transition atomic | Đạt ở asset transition cơ bản |
| Cấp phát không trùng | Chưa đạt hoàn toàn |
| Thu hồi đúng phòng | Đạt cơ bản |
| Batch room capacity | Đạt |
| Single room capacity concurrency | Chưa đạt |
| Partial unique active assignment | Đạt |
| Dangerous cascade chính | Đạt phần lớn |
| Liquidation state machine | Chưa đạt |
| Maintenance enum/actor | Chưa đạt |
| Inventory atomicity | Chưa đạt |
| P0 IDOR regression | Chưa đạt |
| DB constraints/index | Chưa đạt |
| Frontend contract | Chưa đạt |
| Automated tests | Chưa đạt |
| Backend reproducible build | Chưa đạt |
| Frontend build | Đạt |

---

## 6. Thứ tự sửa đề xuất

### P0/P1 critical

1. Sửa liquidation create/cancel/duplicate/concurrency.
2. Chặn delete asset bypass state machine.
3. Chặn cấp phát lại asset đã IN_USE.
4. Sửa damage report update asset ownership.
5. Sửa rooms JWT `userId` thành `sub` hoặc bỏ route student.
6. Đưa inventory batch vào transaction.

### P1 high

7. Sửa maintenance DTO enum và actor.
8. Sửa single room capacity concurrency.
9. Đồng bộ frontend asset edit với UpdateAssetDto.
10. Xóa status/roomId khỏi bulk/import DTO.
11. Bổ sung DB constraint/index.

### Quality gate

12. Đồng bộ package-lock.
13. Thêm scripts Jest/lint.
14. Viết test unit/integration/E2E/concurrency/regression.
15. Chạy migration trên database test có dữ liệu.
16. Chứng minh backend build pass.

---

## 7. Kết luận bắt buộc

```text
P1 CHƯA HOÀN THÀNH
```

Project đã tiến bộ hơn lần kiểm tra trước, đặc biệt ở asset transition, batch room capacity và foreign key lịch sử. Tuy nhiên thanh lý, inventory, đường bypass lifecycle, regression P0, contract frontend–backend và test/build vẫn là các blocker trực tiếp, nên chưa thể chuyển sang P2 một cách an toàn.
