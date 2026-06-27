"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var bcrypt = require("bcrypt");
var prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var hash, roleAdmin, roleManager, roleStudent, admin, manager, student1, student2, student3, student4, student5, student6, student7, student8, bDichVu, bThuong, floorDV1, floorTH1, roomDV101, roomDV102, roomTH101, roomTH102, catGT, catGD, catQT, catAC, catTS, importReceipt, createAssetBatch, allAssets, getAssets, assignAssetsToRoom, brokenAC, dr, oldFan, exportReceipt;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('🌴 Seeding database for PTIT HCM (Man Thiện)...');
                    hash = function (pw) { return bcrypt.hashSync(pw, 10); };
                    console.log('   Clearing existing data...');
                    return [4 /*yield*/, prisma.normalizedSearch.deleteMany()];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, prisma.auditLog.deleteMany()];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, prisma.notification.deleteMany()];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, prisma.councilMember.deleteMany()];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, prisma.liquidationItem.deleteMany()];
                case 5:
                    _a.sent();
                    return [4 /*yield*/, prisma.liquidationRecord.deleteMany()];
                case 6:
                    _a.sent();
                    return [4 /*yield*/, prisma.inventoryCheckItem.deleteMany()];
                case 7:
                    _a.sent();
                    return [4 /*yield*/, prisma.inventoryCheck.deleteMany()];
                case 8:
                    _a.sent();
                    return [4 /*yield*/, prisma.maintenanceRecord.deleteMany()];
                case 9:
                    _a.sent();
                    return [4 /*yield*/, prisma.maintenancePlan.deleteMany()];
                case 10:
                    _a.sent();
                    return [4 /*yield*/, prisma.damageReportLog.deleteMany()];
                case 11:
                    _a.sent();
                    return [4 /*yield*/, prisma.damageReport.deleteMany()];
                case 12:
                    _a.sent();
                    return [4 /*yield*/, prisma.assetReceiptItem.deleteMany()];
                case 13:
                    _a.sent();
                    return [4 /*yield*/, prisma.assetHistory.deleteMany()];
                case 14:
                    _a.sent();
                    return [4 /*yield*/, prisma.asset.deleteMany()];
                case 15:
                    _a.sent();
                    return [4 /*yield*/, prisma.assetReceipt.deleteMany()];
                case 16:
                    _a.sent();
                    return [4 /*yield*/, prisma.assetCategory.deleteMany()];
                case 17:
                    _a.sent();
                    return [4 /*yield*/, prisma.roomStudentAssignment.deleteMany()];
                case 18:
                    _a.sent();
                    return [4 /*yield*/, prisma.room.deleteMany()];
                case 19:
                    _a.sent();
                    return [4 /*yield*/, prisma.floor.deleteMany()];
                case 20:
                    _a.sent();
                    return [4 /*yield*/, prisma.dormBuilding.deleteMany()];
                case 21:
                    _a.sent();
                    return [4 /*yield*/, prisma.profile.deleteMany()];
                case 22:
                    _a.sent();
                    return [4 /*yield*/, prisma.user.deleteMany()];
                case 23:
                    _a.sent();
                    return [4 /*yield*/, prisma.role.deleteMany()];
                case 24:
                    _a.sent();
                    console.log('   [1/8] Creating Roles...');
                    return [4 /*yield*/, prisma.role.create({ data: { code: 'ADMIN', name: 'Quản trị viên', description: 'Quản trị hệ thống' } })];
                case 25:
                    roleAdmin = _a.sent();
                    return [4 /*yield*/, prisma.role.create({ data: { code: 'MANAGER', name: 'Quản lý CSVC', description: 'Quản lý cơ sở vật chất' } })];
                case 26:
                    roleManager = _a.sent();
                    return [4 /*yield*/, prisma.role.create({ data: { code: 'STUDENT', name: 'Sinh viên', description: 'Sinh viên ký túc xá' } })];
                case 27:
                    roleStudent = _a.sent();
                    console.log('   [2/8] Creating Users and Profiles...');
                    return [4 /*yield*/, prisma.user.create({
                            data: {
                                fullName: 'Admin PTIT HCM', userCode: 'ADMIN_HCM', password: hash('123456'),
                                email: 'admin.hcm@ptit.edu.vn', phone: '0900000001', status: 'ACTIVE', roleId: roleAdmin.id,
                            }
                        })];
                case 28:
                    admin = _a.sent();
                    return [4 /*yield*/, prisma.user.create({
                            data: {
                                fullName: 'Cô Quản Lý Man Thiện', userCode: 'QL_MANTHIEN', password: hash('123456'),
                                email: 'qlmt@ptit.edu.vn', phone: '0900000002', status: 'ACTIVE', roleId: roleManager.id,
                            }
                        })];
                case 29:
                    manager = _a.sent();
                    return [4 /*yield*/, prisma.user.create({
                            data: {
                                fullName: 'Nguyễn Văn An', userCode: 'N21DCCN001', studentCode: 'N21DCCN001', password: hash('123456'),
                                email: 'n21dccn001@student.ptithcm.edu.vn', phone: '0925876764',
                                status: 'ACTIVE', roleId: roleStudent.id,
                                profile: {
                                    create: {
                                        faculty: 'CNTT', course: 'D21', gender: 'Nam', address: 'TP.HCM',
                                        dateOfBirth: '2002-08-15',
                                        emergencyName: 'Phụ huynh Nguyễn Văn An', emergencyPhone: '0944255489'
                                    }
                                }
                            }
                        })];
                case 30:
                    student1 = _a.sent();
                    return [4 /*yield*/, prisma.user.create({
                            data: {
                                fullName: 'Lê Thị Bé', userCode: 'N21DCVT012', studentCode: 'N21DCVT012', password: hash('123456'),
                                email: 'n21dcvt012@student.ptithcm.edu.vn', phone: '0981264859',
                                status: 'ACTIVE', roleId: roleStudent.id,
                                profile: {
                                    create: {
                                        faculty: 'Viễn thông', course: 'D21', gender: 'Nữ', address: 'Đồng Nai',
                                        dateOfBirth: '2003-05-15',
                                        emergencyName: 'Phụ huynh Lê Thị Bé', emergencyPhone: '0955087057'
                                    }
                                }
                            }
                        })];
                case 31:
                    student2 = _a.sent();
                    return [4 /*yield*/, prisma.user.create({
                            data: {
                                fullName: 'Trần Minh Quân', userCode: 'N22DCAT033', studentCode: 'N22DCAT033', password: hash('123456'),
                                email: 'n22dcat033@student.ptithcm.edu.vn', phone: '0966589512',
                                status: 'ACTIVE', roleId: roleStudent.id,
                                profile: {
                                    create: {
                                        faculty: 'An toàn thông tin', course: 'D22', gender: 'Nam', address: 'Bình Dương',
                                        dateOfBirth: '2003-01-15',
                                        emergencyName: 'Phụ huynh Trần Minh Quân', emergencyPhone: '0945303241'
                                    }
                                }
                            }
                        })];
                case 32:
                    student3 = _a.sent();
                    return [4 /*yield*/, prisma.user.create({
                            data: {
                                fullName: 'Phạm Thu Thảo', userCode: 'N22DCQT045', studentCode: 'N22DCQT045', password: hash('123456'),
                                email: 'n22dcqt045@student.ptithcm.edu.vn', phone: '0953033462',
                                status: 'ACTIVE', roleId: roleStudent.id,
                                profile: {
                                    create: {
                                        faculty: 'Quản trị kinh doanh', course: 'D22', gender: 'Nữ', address: 'Cần Thơ',
                                        dateOfBirth: '2004-04-15',
                                        emergencyName: 'Phụ huynh Phạm Thu Thảo', emergencyPhone: '0917989105'
                                    }
                                }
                            }
                        })];
                case 33:
                    student4 = _a.sent();
                    return [4 /*yield*/, prisma.user.create({
                            data: {
                                fullName: 'Hoàng Trọng Nghĩa', userCode: 'N23DCDT011', studentCode: 'N23DCDT011', password: hash('123456'),
                                email: 'n23dcdt011@student.ptithcm.edu.vn', phone: '0913054052',
                                status: 'ACTIVE', roleId: roleStudent.id,
                                profile: {
                                    create: {
                                        faculty: 'Điện tử', course: 'D23', gender: 'Nam', address: 'Long An',
                                        dateOfBirth: '2004-08-15',
                                        emergencyName: 'Phụ huynh Hoàng Trọng Nghĩa', emergencyPhone: '0973255119'
                                    }
                                }
                            }
                        })];
                case 34:
                    student5 = _a.sent();
                    return [4 /*yield*/, prisma.user.create({
                            data: {
                                fullName: 'Đinh Bảo Ngọc', userCode: 'N23DCCN089', studentCode: 'N23DCCN089', password: hash('123456'),
                                email: 'n23dccn089@student.ptithcm.edu.vn', phone: '0929921836',
                                status: 'ACTIVE', roleId: roleStudent.id,
                                profile: {
                                    create: {
                                        faculty: 'CNTT', course: 'D23', gender: 'Nữ', address: 'Tiền Giang',
                                        dateOfBirth: '2004-04-15',
                                        emergencyName: 'Phụ huynh Đinh Bảo Ngọc', emergencyPhone: '0930560066'
                                    }
                                }
                            }
                        })];
                case 35:
                    student6 = _a.sent();
                    return [4 /*yield*/, prisma.user.create({
                            data: {
                                fullName: 'Vũ Đức Hải', userCode: 'N22DCPT022', studentCode: 'N22DCPT022', password: hash('123456'),
                                email: 'n22dcpt022@student.ptithcm.edu.vn', phone: '0981781827',
                                status: 'ACTIVE', roleId: roleStudent.id,
                                profile: {
                                    create: {
                                        faculty: 'Đa phương tiện', course: 'D22', gender: 'Nam', address: 'Vũng Tàu',
                                        dateOfBirth: '2000-01-15',
                                        emergencyName: 'Phụ huynh Vũ Đức Hải', emergencyPhone: '0989546967'
                                    }
                                }
                            }
                        })];
                case 36:
                    student7 = _a.sent();
                    return [4 /*yield*/, prisma.user.create({
                            data: {
                                fullName: 'Bùi Mai Lan', userCode: 'N21DCKT056', studentCode: 'N21DCKT056', password: hash('123456'),
                                email: 'n21dckt056@student.ptithcm.edu.vn', phone: '0937323925',
                                status: 'ACTIVE', roleId: roleStudent.id,
                                profile: {
                                    create: {
                                        faculty: 'Kế toán', course: 'D21', gender: 'Nữ', address: 'Tây Ninh',
                                        dateOfBirth: '2001-08-15',
                                        emergencyName: 'Phụ huynh Bùi Mai Lan', emergencyPhone: '0961987083'
                                    }
                                }
                            }
                        })];
                case 37:
                    student8 = _a.sent();
                    console.log('   [3/8] Creating Locations (Buildings, Floors, Rooms)...');
                    return [4 /*yield*/, prisma.dormBuilding.create({ data: { code: 'DV', name: 'Khu Dịch Vụ' } })];
                case 38:
                    bDichVu = _a.sent();
                    return [4 /*yield*/, prisma.dormBuilding.create({ data: { code: 'TH', name: 'Khu Thường' } })];
                case 39:
                    bThuong = _a.sent();
                    return [4 /*yield*/, prisma.floor.create({ data: { buildingId: bDichVu.id, floorNumber: 1, name: 'Tầng 1 - Dịch Vụ' } })];
                case 40:
                    floorDV1 = _a.sent();
                    return [4 /*yield*/, prisma.floor.create({ data: { buildingId: bThuong.id, floorNumber: 1, name: 'Tầng 1 - Thường' } })];
                case 41:
                    floorTH1 = _a.sent();
                    return [4 /*yield*/, prisma.room.create({ data: { floorId: floorDV1.id, roomCode: 'DV101', capacity: 8, note: 'Phòng 8 người khép kín' } })];
                case 42:
                    roomDV101 = _a.sent();
                    return [4 /*yield*/, prisma.room.create({ data: { floorId: floorDV1.id, roomCode: 'DV102', capacity: 8, note: 'Phòng 8 người khép kín' } })];
                case 43:
                    roomDV102 = _a.sent();
                    return [4 /*yield*/, prisma.room.create({ data: { floorId: floorTH1.id, roomCode: 'TH101', capacity: 12, note: 'Phòng 12 người vệ sinh chung' } })];
                case 44:
                    roomTH101 = _a.sent();
                    return [4 /*yield*/, prisma.room.create({ data: { floorId: floorTH1.id, roomCode: 'TH102', capacity: 12, note: 'Phòng 12 người vệ sinh chung' } })];
                case 45:
                    roomTH102 = _a.sent();
                    console.log('   [4/8] Assigning Students to Rooms...');
                    return [4 /*yield*/, prisma.roomStudentAssignment.create({ data: { roomId: roomDV101.id, studentId: student1.id, startDate: new Date('2024-09-01'), isActive: true } })];
                case 46:
                    _a.sent();
                    return [4 /*yield*/, prisma.roomStudentAssignment.create({ data: { roomId: roomDV101.id, studentId: student2.id, startDate: new Date('2024-09-01'), isActive: true } })];
                case 47:
                    _a.sent();
                    return [4 /*yield*/, prisma.roomStudentAssignment.create({ data: { roomId: roomDV102.id, studentId: student3.id, startDate: new Date('2024-09-01'), isActive: true } })];
                case 48:
                    _a.sent();
                    return [4 /*yield*/, prisma.roomStudentAssignment.create({ data: { roomId: roomDV102.id, studentId: student4.id, startDate: new Date('2024-09-01'), isActive: true } })];
                case 49:
                    _a.sent();
                    return [4 /*yield*/, prisma.roomStudentAssignment.create({ data: { roomId: roomTH101.id, studentId: student5.id, startDate: new Date('2024-09-01'), isActive: true } })];
                case 50:
                    _a.sent();
                    return [4 /*yield*/, prisma.roomStudentAssignment.create({ data: { roomId: roomTH101.id, studentId: student6.id, startDate: new Date('2024-09-01'), isActive: true } })];
                case 51:
                    _a.sent();
                    return [4 /*yield*/, prisma.roomStudentAssignment.create({ data: { roomId: roomTH102.id, studentId: student7.id, startDate: new Date('2024-09-01'), isActive: true } })];
                case 52:
                    _a.sent();
                    return [4 /*yield*/, prisma.roomStudentAssignment.create({ data: { roomId: roomTH102.id, studentId: student8.id, startDate: new Date('2024-09-01'), isActive: true } })];
                case 53:
                    _a.sent();
                    console.log('   [5/8] Creating Asset Categories...');
                    return [4 /*yield*/, prisma.assetCategory.create({ data: { code: 'GT', name: 'Giường tầng', maintenanceCycleMonths: 12 } })];
                case 54:
                    catGT = _a.sent();
                    return [4 /*yield*/, prisma.assetCategory.create({ data: { code: 'GD', name: 'Giường đơn VIP', maintenanceCycleMonths: 24 } })];
                case 55:
                    catGD = _a.sent();
                    return [4 /*yield*/, prisma.assetCategory.create({ data: { code: 'QT', name: 'Quạt trần', maintenanceCycleMonths: 6 } })];
                case 56:
                    catQT = _a.sent();
                    return [4 /*yield*/, prisma.assetCategory.create({ data: { code: 'AC', name: 'Điều hòa', maintenanceCycleMonths: 4 } })];
                case 57:
                    catAC = _a.sent();
                    return [4 /*yield*/, prisma.assetCategory.create({ data: { code: 'TS', name: 'Tủ sắt cá nhân', maintenanceCycleMonths: 36 } })];
                case 58:
                    catTS = _a.sent();
                    console.log('   [6/8] Simulating Asset Imports & Generating Assets...');
                    return [4 /*yield*/, prisma.assetReceipt.create({
                            data: {
                                receiptCode: 'IMP20250001',
                                type: client_1.ReceiptType.IMPORT,
                                receiptDate: new Date('2025-08-01'),
                                supplierName: 'Công ty TNHH Nội Thất Hòa Phát',
                                note: 'Nhập lô hàng chuẩn bị đón sinh viên khóa mới',
                                createdBy: manager.id,
                                totalAmount: 150000000,
                            }
                        })];
                case 59:
                    importReceipt = _a.sent();
                    createAssetBatch = function (prefix, name, catId, qty, unitPrice) { return __awaiter(_this, void 0, void 0, function () {
                        var i, code, asset;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    i = 1;
                                    _a.label = 1;
                                case 1:
                                    if (!(i <= qty)) return [3 /*break*/, 7];
                                    code = "".concat(prefix).concat(String(i).padStart(3, '0'));
                                    return [4 /*yield*/, prisma.asset.create({
                                            data: {
                                                assetCode: code,
                                                assetName: "".concat(name, " ").concat(code),
                                                categoryId: catId,
                                                status: 'AVAILABLE',
                                                yearInUse: 2025,
                                            }
                                        })];
                                case 2:
                                    asset = _a.sent();
                                    return [4 /*yield*/, prisma.assetReceiptItem.create({
                                            data: {
                                                receiptId: importReceipt.id,
                                                assetId: asset.id,
                                                quantity: 1,
                                                unitPrice: unitPrice,
                                                warrantyMonths: 12,
                                            }
                                        })];
                                case 3:
                                    _a.sent();
                                    return [4 /*yield*/, prisma.assetHistory.create({
                                            data: {
                                                assetId: asset.id, action: 'NHẬP_KHO', newStatus: 'AVAILABLE', note: "Nh\u1EADp m\u1EDBi t\u1EEB phi\u1EBFu IMP20250001"
                                            }
                                        })];
                                case 4:
                                    _a.sent();
                                    return [4 /*yield*/, prisma.normalizedSearch.create({
                                            data: { assetId: asset.id, search: "".concat(code, " ").concat(name, " ").concat(code).toLowerCase() }
                                        })];
                                case 5:
                                    _a.sent();
                                    _a.label = 6;
                                case 6:
                                    i++;
                                    return [3 /*break*/, 1];
                                case 7: return [2 /*return*/];
                            }
                        });
                    }); };
                    return [4 /*yield*/, createAssetBatch('GT', 'Giường tầng', catGT.id, 20, 2500000)];
                case 60:
                    _a.sent();
                    return [4 /*yield*/, createAssetBatch('GD', 'Giường đơn VIP', catGD.id, 10, 3000000)];
                case 61:
                    _a.sent();
                    return [4 /*yield*/, createAssetBatch('QT', 'Quạt trần Panasonic', catQT.id, 30, 1200000)];
                case 62:
                    _a.sent();
                    return [4 /*yield*/, createAssetBatch('AC', 'Điều hòa Daikin 1.5HP', catAC.id, 5, 12000000)];
                case 63:
                    _a.sent();
                    return [4 /*yield*/, createAssetBatch('TS', 'Tủ sắt Hòa Phát', catTS.id, 30, 1500000)];
                case 64:
                    _a.sent();
                    console.log('   [7/8] Simulating Handovers (Cấp phát thiết bị lên phòng)...');
                    return [4 /*yield*/, prisma.asset.findMany()];
                case 65:
                    allAssets = _a.sent();
                    getAssets = function (prefix, count) { return allAssets.filter(function (a) { return a.assetCode.startsWith(prefix); }).slice(0, count); };
                    assignAssetsToRoom = function (roomObj, assets, note) { return __awaiter(_this, void 0, void 0, function () {
                        var handoverReceipt, _i, assets_1, asset;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, prisma.assetReceipt.create({
                                        data: {
                                            receiptCode: "HO-".concat(roomObj.roomCode, "-").concat(Date.now().toString().slice(-4)),
                                            type: client_1.ReceiptType.HANDOVER,
                                            receiptDate: new Date('2025-08-15'),
                                            note: note,
                                            createdBy: manager.id,
                                        }
                                    })];
                                case 1:
                                    handoverReceipt = _a.sent();
                                    _i = 0, assets_1 = assets;
                                    _a.label = 2;
                                case 2:
                                    if (!(_i < assets_1.length)) return [3 /*break*/, 7];
                                    asset = assets_1[_i];
                                    return [4 /*yield*/, prisma.asset.update({
                                            where: { id: asset.id },
                                            data: { roomId: roomObj.id, status: 'IN_USE' }
                                        })];
                                case 3:
                                    _a.sent();
                                    return [4 /*yield*/, prisma.assetReceiptItem.create({
                                            data: { receiptId: handoverReceipt.id, assetId: asset.id, quantity: 1 }
                                        })];
                                case 4:
                                    _a.sent();
                                    return [4 /*yield*/, prisma.assetHistory.create({
                                            data: { assetId: asset.id, action: 'CẤP_PHÁT', newStatus: 'IN_USE', newRoomId: roomObj.id, note: "C\u1EA5p ph\u00E1t l\u00EAn ph\u00F2ng ".concat(roomObj.roomCode) }
                                        })];
                                case 5:
                                    _a.sent();
                                    _a.label = 6;
                                case 6:
                                    _i++;
                                    return [3 /*break*/, 2];
                                case 7: return [2 /*return*/];
                            }
                        });
                    }); };
                    // Cấp phát cho DV101 (8 người)
                    return [4 /*yield*/, assignAssetsToRoom(roomDV101, __spreadArray(__spreadArray(__spreadArray(__spreadArray([], getAssets('GD', 4), true), getAssets('TS', 8), true), getAssets('AC', 1), true), getAssets('QT', 2), true), 'Trang bị phòng Dịch vụ đầu năm')];
                case 66:
                    // Cấp phát cho DV101 (8 người)
                    _a.sent();
                    // Cấp phát cho TH101 (12 người)
                    return [4 /*yield*/, assignAssetsToRoom(roomTH101, __spreadArray(__spreadArray(__spreadArray([], getAssets('GT', 6), true), getAssets('TS', 12).slice(8, 20), true), getAssets('QT', 4).slice(2, 6), true), 'Trang bị phòng Thường đầu năm')];
                case 67:
                    // Cấp phát cho TH101 (12 người)
                    _a.sent();
                    console.log('   [8/8] Simulating Damage Reports & Liquidation...');
                    return [4 /*yield*/, prisma.asset.findFirst({ where: { assetCode: 'AC001' } })];
                case 68:
                    brokenAC = _a.sent();
                    if (!brokenAC) return [3 /*break*/, 72];
                    return [4 /*yield*/, prisma.damageReport.create({
                            data: {
                                reportCode: 'BH-2026-001', reporterId: student1.id, assetId: brokenAC.id, roomId: roomDV101.id,
                                description: 'Điều hòa không làm lạnh, Sài Gòn nóng quá chịu không nổi cô ơi!',
                                priority: 'URGENT', status: 'IN_PROGRESS'
                            }
                        })];
                case 69:
                    dr = _a.sent();
                    return [4 /*yield*/, prisma.damageReportLog.create({
                            data: { damageReportId: dr.id, createdByUserId: student1.id, action: 'Tạo phiếu', newStatus: 'SUBMITTED', note: 'SV gửi yêu cầu' }
                        })];
                case 70:
                    _a.sent();
                    return [4 /*yield*/, prisma.damageReportLog.create({
                            data: { damageReportId: dr.id, createdByUserId: manager.id, action: 'Tiếp nhận', oldStatus: 'SUBMITTED', newStatus: 'IN_PROGRESS', note: 'Đã gọi thợ sửa' }
                        })];
                case 71:
                    _a.sent();
                    _a.label = 72;
                case 72: return [4 /*yield*/, prisma.asset.findFirst({ where: { assetCode: 'QT030' } })];
                case 73:
                    oldFan = _a.sent();
                    if (!oldFan) return [3 /*break*/, 79];
                    // Chuyển thành PENDING_LIQUIDATION
                    return [4 /*yield*/, prisma.asset.update({ where: { id: oldFan.id }, data: { status: 'PENDING_LIQUIDATION' } })];
                case 74:
                    // Chuyển thành PENDING_LIQUIDATION
                    _a.sent();
                    return [4 /*yield*/, prisma.assetReceipt.create({
                            data: {
                                receiptCode: 'EXP2026001',
                                type: client_1.ReceiptType.EXPORT,
                                receiptDate: new Date(),
                                note: 'Xuất thanh lý quạt cũ rỉ sét',
                                createdBy: manager.id,
                            }
                        })];
                case 75:
                    exportReceipt = _a.sent();
                    return [4 /*yield*/, prisma.assetReceiptItem.create({
                            data: { receiptId: exportReceipt.id, assetId: oldFan.id, quantity: 1 }
                        })];
                case 76:
                    _a.sent();
                    return [4 /*yield*/, prisma.asset.update({
                            where: { id: oldFan.id },
                            data: { status: 'LIQUIDATED' }
                        })];
                case 77:
                    _a.sent();
                    return [4 /*yield*/, prisma.assetHistory.create({
                            data: { assetId: oldFan.id, action: 'XUẤT_KHO', newStatus: 'LIQUIDATED', note: "Xu\u1EA5t thi\u1EBFt b\u1ECB theo phi\u1EBFu EXP2026001. L\u00FD do: Xu\u1EA5t thanh l\u00FD qu\u1EA1t c\u0169 r\u1EC9 s\u00E9t" }
                        })];
                case 78:
                    _a.sent();
                    _a.label = 79;
                case 79:
                    console.log('✅ Seeding completed! The data is now authentic for PTIT HCM.');
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (e) {
    console.error(e);
    process.exit(1);
})
    .finally(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
