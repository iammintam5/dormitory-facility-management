# 🏢 Dormitory Facility Management — REST API Documentation

**Base URL:** `http://localhost:3000`
**Auth:** JWT Bearer token (except `/auth/login`)

---

## 📋 Mục lục

1. [Auth](#-1-auth)
2. [Users](#-2-users)
3. [Profiles](#-3-profiles)
4. [Asset Categories](#-4-asset-categories)
5. [Assets](#-5-assets)
6. [Locations (Buildings)](#-6-locations-buildings)
7. [Rooms](#-7-rooms)
8. [Damage Reports](#-8-damage-reports)
9. [Maintenance](#-9-maintenance)
10. [Inventory Checks](#-10-inventory-checks)
11. [Liquidation Records](#-11-liquidation-records)
12. [Notifications](#-12-notifications)
13. [Audit Logs](#-13-audit-logs)
14. [Reports](#-14-reports)
15. [Health](#-15-health)

---

## 🔐 1. Auth

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| `POST` | `/auth/login` | ❌ Public | Đăng nhập |
| `GET` | `/auth/me` | ✅ JWT | Lấy thông tin user hiện tại |
| `POST` | `/auth/change-password` | ✅ JWT | Đổi mật khẩu |

### POST /auth/login
```json
// Request
{ "username": "ADMIN001", "password": "123456" }

// Response 200
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "username": "ADMIN001",
    "fullName": "Admin Hệ thống",
    "userCode": "ADMIN001",
    "email": "admin@dormitory.edu.vn",
    "phone": "0901000001",
    "status": "ACTIVE",
    "role": { "id": 1, "code": "ADMIN", "name": "Admin" },
    "profile": { /* ... */ }
  }
}
```

### GET /auth/me
```json
// Response 200
{
  "id": 1,
  "username": "ADMIN001",
  "fullName": "Admin Hệ thống",
  "userCode": "ADMIN001",
  "email": "admin@dormitory.edu.vn",
  "phone": "0901000001",
  "status": "ACTIVE",
  "role": { "id": 1, "code": "ADMIN", "name": "Admin" },
  "profile": { "gender": null, "dateOfBirth": null, "address": null, "notes": null }
}
```

### POST /auth/change-password
```json
// Request
{ "currentPassword": "123456", "newPassword": "newPass123" }

// Response 200
{ "message": "Password changed successfully" }
```

---

## 👥 2. Users

**Auth:** ✅ JWT + `@Roles('ADMIN', 'MANAGER')`

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/users` | Danh sách người dùng (phân trang, lọc) |
| `GET` | `/users/roles` | Danh sách role |
| `POST` | `/users` | Tạo user mới |
| `PATCH` | `/:id` | Cập nhật thông tin user |
| `PATCH` | `/:id/lock` | Khóa tài khoản |
| `PATCH` | `/:id/unlock` | Mở khóa tài khoản |
| `POST` | `/:id/reset-password` | Reset mật khẩu |

### GET /users
| Query | Type | Default | Mô tả |
|-------|------|---------|-------|
| `page` | number | 1 | Số trang |
| `pageSize` | number | 10 | Số lượng/trang |
| `keyword` | string | - | Tìm kiếm (username, fullName, email) |
| `roleCode` | string | - | Lọc theo role (ADMIN, MANAGER, STUDENT) |
| `status` | string | - | Lọc theo status (ACTIVE, LOCKED) |

### POST /users
```json
{
  "roleId": "2",
  "fullName": "Nguyễn Văn A",
  "username": "NV001",
  "password": "123456",
  "email": "nv001@dormitory.edu.vn",
  "phone": "0901000002",
  "studentCode": "SV20230001"
}
```

### PATCH /users/:id
```json
{
  "roleId": "2",
  "fullName": "Nguyễn Văn B",
  "username": "NV002",
  "email": null,
  "phone": null,
  "studentCode": null
}
```

---

## 👤 3. Profiles

**Auth:** ✅ JWT

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/profiles/me` | Lấy profile của user hiện tại |
| `PATCH` | `/profiles/me` | Cập nhật profile |

### PATCH /profiles/me
```json
{
  "fullName": "Nguyễn Văn A",
  "email": "nva@dormitory.edu.vn",
  "phone": "0901000002",
  "gender": "MALE",
  "dateOfBirth": "2000-01-15",
  "address": "Hà Nội",
  "notes": "Ghi chú thêm"
}
```

---

## 🏷️ 4. Asset Categories

**Auth:** ✅ JWT

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/asset-categories` | Danh sách loại tài sản |
| `POST` | `/asset-categories` | Tạo loại tài sản |
| `PATCH` | `/:id` | Cập nhật loại tài sản |
| `DELETE` | `/:id` | Xóa loại tài sản (nếu không có tài sản nào) |

### POST /asset-categories
```json
{
  "code": "FURNITURE",
  "name": "Nội thất",
  "description": "Bàn ghế, tủ, giường",
  "unit": "Cái"
}
```

---

## 🛋️ 5. Assets

**Auth:** ✅ JWT

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/assets` | Danh sách tài sản (phân trang, lọc) |
| `POST` | `/assets` | Tạo tài sản |
| `POST` | `/assets/bulk` | Tạo hàng loạt tài sản |
| `PATCH` | `/:id` | Cập nhật tài sản |
| `DELETE` | `/:id` | Xóa tài sản |
| `GET` | `/:id/history` | Lịch sử thay đổi tài sản |

### GET /assets
| Query | Type | Default | Mô tả |
|-------|------|---------|-------|
| `page` | number | 1 | Số trang |
| `pageSize` | number | 10 | Số lượng/trang |
| `keyword` | string | - | Tìm kiếm (assetCode, assetName) |
| `categoryId` | number | - | Lọc theo loại tài sản |
| `buildingId` | number | - | Lọc theo khu nhà |
| `roomId` | number | - | Lọc theo phòng |
| `status` | string | - | Lọc theo trạng thái |

### POST /assets/bulk
```json
{
  "prefix": "GH",
  "startNumber": 1,
  "endNumber": 10,
  "assetName": "Ghế",
  "categoryId": 1,
  "roomId": 1,
  "description": "Ghế nhựa",
  "status": "AVAILABLE"
}
```

---

## 🏢 6. Locations (Buildings)

**Auth:** ✅ JWT

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/locations/buildings` | Danh sách khu nhà + phòng |
| `POST` | `/locations/buildings` | Tạo khu nhà |
| `PATCH` | `/locations/buildings/:id` | Cập nhật khu nhà |
| `DELETE` | `/locations/buildings/:id` | Xóa khu nhà |
| `GET` | `/locations/rooms` | Danh sách phòng (theo buildingId) |

### POST /locations/buildings
```json
{
  "code": "A",
  "name": "Khu A",
  "genderZone": "MALE",
  "status": "ACTIVE",
  "description": "Khu nhà A"
}
```

---

## 🚪 7. Rooms

**Auth:** ✅ JWT

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/rooms` | Danh sách phòng (theo buildingId) |
| `POST` | `/rooms` | Tạo phòng mới |
| `PATCH` | `/:id` | Cập nhật phòng |
| `DELETE` | `/:id` | Xóa phòng |
| `GET` | `/:id/students` | Danh sách sinh viên trong phòng |
| `GET` | `/:id/assets` | Danh sách tài sản trong phòng |

### POST /rooms
```json
{
  "roomCode": "A101",
  "floorId": 1,
  "capacity": 4,
  "note": "Phòng 4 người"
}
```

### PATCH /rooms/:id
```json
{
  "roomCode": "A102",
  "capacity": 6,
  "note": "Cập nhật sức chứa"
}
```

---

## ⚠️ 8. Damage Reports

**Auth:** ✅ JWT

**Workflow:** `SUBMITTED` → `REVIEWING` → `IN_PROGRESS` → `COMPLETED`

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/damage-reports` | Danh sách phiếu (phân trang, lọc) |
| `GET` | `/:id` | Chi tiết phiếu |
| `POST` | `/damage-reports` | Tạo phiếu báo hỏng |
| `PATCH` | `/:id` | Cập nhật phiếu (chỉ khi SUBMITTED) |
| `POST` | `/:id/accept` | Tiếp nhận phiếu (SUBMITTED → REVIEWING) |
| `POST` | `/:id/reject` | Từ chối (SUBMITTED/REVIEWING → REJECTED) |
| `POST` | `/:id/start-processing` | Bắt đầu xử lý (REVIEWING → IN_PROGRESS) |
| `POST` | `/:id/complete` | Hoàn thành (IN_PROGRESS → COMPLETED) |
| `POST` | `/:id/cancel` | Hủy phiếu (SUBMITTED → REJECTED) |

### POST /damage-reports
```json
{
  "assetId": 1,
  "roomId": 1,
  "description": "Quạt trần bị hỏng cánh",
  "priority": "HIGH"
}
```

### PATCH /damage-reports/:id
```json
{
  "description": "Cập nhật mô tả mới",
  "priority": "URGENT",
  "assetId": 2,
  "roomId": 1
}
```

**Priority enum:** `LOW` | `MEDIUM` | `HIGH` | `URGENT`
**Status enum:** `SUBMITTED` | `REVIEWING` | `IN_PROGRESS` | `COMPLETED` | `REJECTED`

---

## 🔧 9. Maintenance

**Auth:** ✅ JWT

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/maintenance/plans` | Danh sách kế hoạch bảo trì |
| `GET` | `/maintenance/records` | Danh sách phiếu bảo trì (phân trang) |
| `POST` | `/maintenance/records` | Tạo phiếu bảo trì |
| `PATCH` | `/maintenance/records/:id` | Cập nhật phiếu bảo trì |
| `GET` | `/maintenance/dashboard` | Thống kê tổng quan bảo trì |
| `GET` | `/maintenance/history/:assetId` | Lịch sử bảo trì của tài sản |

### POST /maintenance/records
```json
{
  "planId": 1,
  "assetId": 1,
  "maintenanceDate": "2026-06-23",
  "maintenanceType": "REPAIR",
  "content": "Thay cánh quạt",
  "resultStatus": "COMPLETED",
  "nextMaintenanceDate": "2026-12-23",
  "cost": 500000,
  "materialNote": "Cánh quạt mới",
  "note": "Ghi chú"
}
```

### PATCH /maintenance/records/:id
```json
{
  "content": "Cập nhật nội dung",
  "resultStatus": "IN_PROGRESS",
  "cost": 600000,
  "note": "Đã thay vật tư khác"
}
```

---

## 📋 10. Inventory Checks

**Auth:** ✅ JWT

**Workflow:** `DRAFT` → (save items → complete) → `COMPLETED`

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/inventory-checks` | Danh sách phiếu kiểm kê (phân trang) |
| `GET` | `/:id` | Chi tiết phiếu kiểm kê |
| `POST` | `/inventory-checks` | Tạo phiếu kiểm kê (tự động thêm items từ assets trong phòng) |
| `PATCH` | `/:id` | Cập nhật thông tin phiếu (chỉ khi DRAFT) |
| `POST` | `/:id/items` | Lưu kết quả kiểm kê từng item |
| `POST` | `/:id/complete` | Hoàn tất phiếu kiểm kê |
| `GET` | `/:id/export` | Xuất dữ liệu in phiếu |

### POST /inventory-checks
```json
{
  "roomId": 1,
  "checkDate": "2026-06-23",
  "generalNote": "Kiểm kê định kỳ"
}
```

### PATCH /inventory-checks/:id
```json
{
  "checkDate": "2026-06-24",
  "generalNote": "Đổi ngày kiểm kê"
}
```

### POST /inventory-checks/:id/items
```json
{
  "items": [
    { "itemId": 1, "actualQuantity": 1, "actualCondition": "Tốt", "note": "" }
  ]
}
```

### POST /inventory-checks/:id/complete
```json
{ "generalNote": "Hoàn tất kiểm kê" }
```

---

## 🗑️ 11. Liquidation Records

**Auth:** ✅ JWT

**Workflow:** `DRAFT` → (submit) → `PENDING_APPROVAL` → (approve) → `APPROVED` → (complete) → `COMPLETED`

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/liquidation-records` | Danh sách hồ sơ thanh lý (phân trang, lọc) |
| `GET` | `/:id` | Chi tiết hồ sơ |
| `POST` | `/liquidation-records` | Tạo đề xuất thanh lý (set asset → PENDING_LIQUIDATION) |
| `PATCH` | `/:id` | Cập nhật hồ sơ (chỉ khi DRAFT) |
| `POST` | `/:id/submit-approval` | Gửi duyệt (DRAFT → PENDING_APPROVAL) |
| `POST` | `/:id/approve` | Duyệt (PENDING_APPROVAL → APPROVED) |
| `POST` | `/:id/reject` | Từ chối (set asset → IN_USE) |
| `POST` | `/:id/complete` | Hoàn tất thanh lý (set asset → LIQUIDATED) |
| `POST` | `/:id/cancel` | Hủy hồ sơ |
| `GET` | `/:id/export` | Xuất dữ liệu in biên bản |

### POST /liquidation-records
```json
{
  "assetId": 1,
  "liquidationDate": "2026-06-23",
  "assetCondition": "Hỏng nặng, không thể sửa chữa",
  "reason": "Hết niên hạn sử dụng",
  "estimatedRemainingValue": 500000,
  "note": "Ghi chú"
}
```

### PATCH /liquidation-records/:id
```json
{
  "liquidationDate": "2026-06-30",
  "note": "Đổi ngày thanh lý"
}
```

**Status enum:** `DRAFT` | `PENDING_APPROVAL` | `APPROVED` | `COMPLETED` | `REJECTED` | `CANCELLED`

---

## 🔔 12. Notifications

**Auth:** ✅ JWT

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/notifications` | Danh sách thông báo (phân trang) |
| `GET` | `/notifications/unread-count` | Số thông báo chưa đọc |
| `POST` | `/notifications/:id/mark-read` | Đánh dấu đã đọc |
| `POST` | `/notifications/mark-all-read` | Đánh dấu tất cả đã đọc |

---

## 📜 13. Audit Logs

**Auth:** ✅ JWT

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/audit-logs` | Danh sách nhật ký (phân trang, lọc) |
| `GET` | `/:id` | Chi tiết nhật ký |

### GET /audit-logs
| Query | Type | Default | Mô tả |
|-------|------|---------|-------|
| `page` | number | 1 | Số trang |
| `pageSize` | number | 10 | Số lượng/trang |
| `keyword` | string | - | Tìm kiếm |
| `action` | string | - | Lọc theo hành động |

---

## 📊 14. Reports

**Auth:** ✅ JWT

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/reports/summary` | Thống kê tổng quan (theo role) |
| `GET` | `/reports/damage-by-month` | Thống kê báo hỏng theo tháng |

### GET /reports/summary

**Role-based response:**

- **ADMIN:** `totalUsers`, `totalStudents`, `totalManagers`, `totalAssets`, `totalDamageReports`
- **MANAGER:** `totalBuildings`, `totalRooms`, `totalAssets`, `damagedAssets`, `maintenanceProcessing`, `liquidationPending`
- **STUDENT:** `currentRoom`, `assetCount`, `damageReportProcessing`

---

## ❤️ 15. Health

**Auth:** ❌ Public

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/health` | Kiểm tra server |

### GET /health
```json
{ "status": "ok" }
```

---

## 🛡️ Authentication

Tất cả API (trừ `/auth/login` và `/health`) yêu cầu **JWT Bearer token** trong header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Tài khoản mẫu (seed data)

| Role | Username | Password |
|------|----------|----------|
| **Admin** | `ADMIN001` | `123456` |
| **Quản lý** | `QL001` | `123456` |
| **Sinh viên** | `SV20230001` | `123456` |

---

## 📝 Response Envelope

Tất cả response trả về trực tiếp data object/array (NestJS mặc định), không wrap trong `{ success, data }`.

### Error Response
```json
{
  "message": "Damage report not found",
  "error": "Not Found",
  "statusCode": 404
}
```

### Pagination Response
```json
{
  "items": [],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 50,
    "totalPages": 5
  }
}
```
