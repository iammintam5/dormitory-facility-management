# BÁO CÁO KIỂM TRA P1 – BẢN ZIP MỚI NHẤT

## 1. Kết luận

**P1 CHƯA HOÀN THÀNH VÀ CHƯA ĐỦ ĐIỀU KIỆN NGHIỆM THU.**

Bản này đã sửa được nhiều lỗi cũ, nhưng vẫn còn blocker ở vòng đời tài sản, thanh lý, xuất kho, kiểm kê, concurrency, migration và hệ thống test/build.

Mức hoàn thiện ước tính: **khoảng 60–65%**.

---

## 2. Phạm vi đã kiểm tra

- Prisma schema và toàn bộ migration.
- Asset state machine.
- Nhập kho, cấp phát, thu hồi và xuất kho.
- Thanh lý.
- Kiểm kê.
- Bảo trì.
- Báo hỏng.
- Phòng và phân phòng.
- DTO/ValidationPipe.
- Frontend asset, export, inventory và liquidation.
- Backend package/lockfile.
- Unit test và E2E test hiện có.
- Build frontend và khả năng build backend.

---

## 3. Những phần đã làm đúng

### 3.1. Asset CRUD

- Bulk create không còn nhận `status` và `roomId`.
- Tài sản tạo mới/bulk/import đều được gán `AVAILABLE` và `roomId = null` ở backend.
- Update asset chặn sửa trực tiếp `status` và `roomId`.
- Delete asset không còn tự chuyển thẳng sang `LIQUIDATED`.
- Asset có lịch sử nghiệp vụ bị chặn hard delete.

### 3.2. Cấp phát và thu hồi

- Cấp phát đã kiểm tra tài sản phải có trạng thái `AVAILABLE`.
- Asset transition dùng conditional `updateMany` theo trạng thái và phòng cũ.
- Đã chặn đổi phòng bằng `IN_USE -> IN_USE` nếu action không phải `ĐIỀU_CHUYỂN`.
- Thu hồi kiểm tra tài sản thuộc phòng nguồn.

### 3.3. Phòng và sinh viên

- Có partial unique index cho một assignment active trên mỗi sinh viên.
- Xếp/chuyển phòng sử dụng transaction `Serializable`.
- Batch update phòng kiểm tra building scope và capacity.
- Room API đã dùng JWT `sub` và kiểm tra phạm vi sinh viên.

### 3.4. Maintenance

- DTO sử dụng enum Prisma cho maintenance type và result status.
- Actor được truyền từ JWT thay vì `userId = 0`.
- Asset transition và maintenance record được đặt trong cùng transaction.

### 3.5. Frontend

- `npm ci` frontend thành công.
- `npm run build` frontend thành công.

---

## 4. Blocker còn lại

## 4.1. Reject/cancel thanh lý không khôi phục được phần lớn trạng thái tài sản

`AssetTransitionService` chỉ cho:

```text
PENDING_LIQUIDATION -> LIQUIDATED
PENDING_LIQUIDATION -> AVAILABLE
```

Trong khi `LiquidationRecordsService` cố khôi phục về `oldStatus`, có thể là:

```text
IN_USE
DAMAGED
UNDER_MAINTENANCE
```

Các transition này không nằm trong ma trận nên service sẽ ném `ConflictException` và rollback.

### File liên quan

- `backend/src/assets/asset-transition.service.ts`, dòng 17–23.
- `backend/src/liquidation-records/liquidation-records.service.ts`, dòng 281–295 và 335–349.

### Hậu quả

Reject/cancel chỉ có khả năng thành công ổn định với tài sản vốn là `AVAILABLE`. Với tài sản đang dùng, hỏng hoặc bảo trì, workflow thanh lý bị kẹt.

---

## 4.2. Xuất kho vẫn bypass quy trình thanh lý

State machine vẫn cho phép trực tiếp:

```text
AVAILABLE -> LIQUIDATED
```

API xuất kho gọi thẳng transition này mà không yêu cầu:

- Hồ sơ thanh lý tồn tại.
- Hồ sơ đã `APPROVED`.
- Asset thuộc đúng hồ sơ thanh lý đó.

Frontend hiện tải tài sản `PENDING_LIQUIDATION`, nhưng backend API không giới hạn như vậy. Gọi API trực tiếp vẫn có thể thanh lý tài sản `AVAILABLE`.

### File liên quan

- `backend/src/assets/asset-transition.service.ts`, dòng 18.
- `backend/src/asset-receipts/asset-receipts.service.ts`, dòng 252–306.
- `backend/test/asset-transition.spec.ts`, dòng 64–76 còn xác nhận `AVAILABLE -> LIQUIDATED` là hợp lệ.

### Hậu quả

Có thể bỏ qua toàn bộ chuỗi:

```text
DRAFT -> PENDING_APPROVAL -> APPROVED -> COMPLETED
```

---

## 4.3. Có thể tạo hai hồ sơ thanh lý đang mở cho cùng asset khi request đồng thời

Service thực hiện:

```text
findFirst kiểm tra trùng
-> create record
```

nhưng không có:

- Row lock.
- Serializable transaction.
- Reservation/version trên asset.
- Unique constraint chặn asset thuộc nhiều active liquidation record.

Constraint hiện tại chỉ chặn trùng asset **trong cùng một hồ sơ**, không chặn trùng giữa hai hồ sơ khác nhau.

### File liên quan

- `backend/src/liquidation-records/liquidation-records.service.ts`, dòng 121–180.
- `backend/prisma/migrations/20260628090000_add_p1_constraints/migration.sql`, dòng 45–57.

---

## 4.4. Inventory vẫn chưa atomic hoàn chỉnh

### Race condition khi lưu item

Trạng thái session được đọc **ngoài transaction**:

```text
find inventory check
check DRAFT
-> bắt đầu transaction
-> update items
```

Một request khác có thể complete session giữa hai bước trên.

Bên trong transaction còn gọi `this.findOne(id)`, sử dụng Prisma client chính thay vì `tx`.

### File liên quan

- `backend/src/inventory-checks/inventory-checks.service.ts`, dòng 131–200.

### Có thể complete ngay mà chưa kiểm kê

Item mới được khởi tạo:

```text
systemQuantity = 1
actualQuantity = 1
difference = 0
```

Không có `isChecked`, `checkedAt` hoặc điều kiện bắt buộc xác nhận item. Do đó vừa tạo phiên kiểm kê xong có thể complete ngay.

### File liên quan

- `backend/prisma/schema.prisma`, model `InventoryCheckItem`, dòng 404–418.
- `backend/src/inventory-checks/inventory-checks.service.ts`, dòng 97–128 và 203–225.

---

## 4.5. Damage-report transition vẫn có lost-update race

Service đọc trạng thái trước transaction, sau đó update theo `id`:

```text
find report
check transition
-> transaction
-> update where id
```

Không có điều kiện:

```text
id + expected old status
```

Hai request `accept` và `reject` đồng thời có thể cùng vượt kiểm tra và cùng ghi log. Trạng thái cuối phụ thuộc request ghi sau.

### File liên quan

- `backend/src/damage-reports/damage-reports.service.ts`, dòng 356–435.

Ngoài ra audit log được ghi sau transaction, nên dữ liệu chính có thể thay đổi nhưng audit bị thiếu nếu audit insert lỗi.

---

## 4.6. Migration có thể báo thành công nhưng bỏ qua constraint bắt buộc

Migration sử dụng:

```sql
IF dữ liệu lỗi THEN
  RAISE NOTICE
  không tạo constraint
END IF;
```

Điều này khiến `migrate deploy` có thể thành công dù database không có:

- Capacity check.
- Floor unique.
- Inventory item unique.
- Liquidation item unique.
- Receipt item unique.
- Quantity check.

### File liên quan

- `backend/prisma/migrations/20260628090000_add_p1_constraints/migration.sql`, dòng 4–91.

Migration production cần fail rõ ràng hoặc có bước cleanup/backfill riêng; không được âm thầm bỏ constraint.

---

## 4.7. Script data audit dùng sai tên cột

`data-audit.sql` dùng snake_case:

```text
asset_code
room_id
receipt_id
inventory_check_id
student_id
is_active
```

Trong schema/migration thực tế, các cột được tạo dạng quoted camelCase:

```text
"assetCode"
"roomId"
"receiptId"
"inventoryCheckId"
"studentId"
"isActive"
```

Script nhiều khả năng lỗi `column does not exist` trước khi kiểm tra dữ liệu.

### File liên quan

- `backend/prisma/data-audit.sql`, dòng 4–92.

---

## 4.8. Database chưa bảo vệ bất biến status/roomId

Chưa có check constraint bắt buộc:

```text
AVAILABLE -> roomId IS NULL
IN_USE -> roomId IS NOT NULL
LIQUIDATED -> roomId IS NULL
```

Service đang bảo vệ một phần, nhưng SQL trực tiếp, seed, migration hoặc code path mới vẫn có thể tạo dữ liệu sai.

---

## 4.9. Audit và actor của asset lifecycle chưa đạt

`TransitionContext` nhận `userId` nhưng `AssetTransitionService` không dùng field này.

Model `AssetHistory` không có actor ID. Các luồng:

- Cấp phát.
- Thu hồi.
- Xuất kho.
- Thanh lý.
- Bảo trì.
- Kiểm kê.

không ghi audit log nhất quán trong cùng transaction.

Một số module khác ghi audit **sau** khi dữ liệu chính đã commit.

### Hậu quả

Có thể xảy ra:

```text
nghiệp vụ thành công
nhưng không có audit hoặc không biết ai thực hiện
```

---

## 4.10. Frontend asset form vẫn có trường chỉnh sửa giả

Form cho phép sửa `condition` nhưng payload gửi backend chỉ có:

```text
assetCode
assetName
categoryId
description
```

Người dùng có thể đổi “Tình trạng vật lý”, bấm lưu, nhận thông báo thành công nhưng giá trị không được lưu.

### File liên quan

- `frontend/src/pages/admin/AssetsManagementPage.tsx`, dòng 200–215.
- Cùng file, dòng 523–543.

---

## 4.11. Backend lockfile vẫn chưa đồng bộ

Chạy trực tiếp trên project:

```bash
npm ci --ignore-scripts
```

thất bại với:

```text
Missing: @emnapi/core@1.11.1 from lock file
Missing: @emnapi/runtime@1.11.1 from lock file
```

Do đó backend chưa đạt quality gate clean install.

---

## 4.12. Hệ thống test chưa chứng minh các nghiệp vụ P1

### Liquidation test

`liquidation.spec.ts` copy một transition matrix riêng rồi test matrix đó; không gọi `LiquidationRecordsService` thật.

### E2E test

- Có thể tự `return` và báo pass nếu database chưa seed.
- Dùng dữ liệu có sẵn thay vì tự tạo đầy đủ fixture.
- Chưa test liquidation restore.
- Chưa test duplicate liquidation concurrent.
- Chưa test inventory save/complete race.
- Chưa test damage report transition race.
- Chưa test migration.
- Chưa test IDOR regression đầy đủ.

### Asset transition test

Vẫn có test khẳng định `AVAILABLE -> LIQUIDATED` trực tiếp là đúng, trái với workflow thanh lý chặt chẽ.

### Frontend

Không có test script và không có test tự động.

---

## 5. Kết quả build và cài đặt

| Hạng mục | Kết quả |
|---|---|
| Frontend `npm ci` | PASS |
| Frontend `npm run build` | PASS |
| Backend `npm ci` | FAIL – lockfile không đồng bộ |
| Backend `npm install --ignore-scripts` trên bản sao | PASS |
| Prisma format/validate/generate | Chưa xác minh do DNS không truy cập được `binaries.prisma.sh` |
| Backend typecheck/build | Chưa xác minh đầy đủ vì Prisma Client không generate được |
| Backend unit/E2E | Chưa đạt quality gate |

Lỗi Prisma engine là lỗi môi trường trong lần kiểm tra này. Tuy nhiên lỗi `npm ci` là lỗi trực tiếp của project.

---

## 6. Thứ tự sửa đề xuất

1. Sửa ma trận restore thanh lý và lưu trạng thái/phòng trước thanh lý một cách rõ ràng.
2. Cấm `AVAILABLE -> LIQUIDATED` trực tiếp; export phải gắn với hồ sơ thanh lý `APPROVED`.
3. Chặn duplicate active liquidation bằng reservation/lock/constraint.
4. Đưa toàn bộ inventory status check/read/update/response vào cùng transaction và bổ sung dấu xác nhận đã kiểm kê.
5. Làm damage-report transition bằng conditional update theo expected status.
6. Tách migration cleanup và migration constraint; không `RAISE NOTICE` rồi bỏ qua.
7. Sửa `data-audit.sql` theo tên cột thật.
8. Thêm DB check constraint cho asset status/location.
9. Ghi audit/actor trong cùng transaction cho asset lifecycle.
10. Bỏ hoặc disable thực sự trường condition trong asset edit form.
11. Cập nhật và commit lại backend `package-lock.json`.
12. Viết test service/E2E thực sự, không tự skip.

---

## 7. Chốt trạng thái

```text
P1 CHƯA HOÀN THÀNH
```

Không nên merge/đóng P1 ở phiên bản hiện tại.
