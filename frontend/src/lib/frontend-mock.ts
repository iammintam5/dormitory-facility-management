import { Asset, AssetCategory } from '../types/assets';
import { CouncilMember } from '../types/council';
import {
  DamageReport,
  DamageReportLog,
  DamageReportPriority,
  DamageReportStudentAssetsResponse,
} from '../types/damage-reports';
import {
  InventoryCheck,
  InventoryCheckExportResponse,
  InventoryCheckItem,
  InventoryCheckStatus,
} from '../types/inventory-checks';
import { DormBuilding, Floor, Room } from '../types/locations';
import {
  LiquidationRecord,
  LiquidationRecordExportResponse,
  LiquidationStatus,
} from '../types/liquidation-records';
import {
  MaintenancePlan,
  MaintenanceRecord,
  MaintenanceResultStatus,
  MaintenanceType,
} from '../types/maintenance';
import { AppNotification, NotificationsResponse } from '../types/notifications';
import { MonthlyCount, ReportsSummary } from '../types/reports';
import { Role, User } from '../types/users';

type BuildingDraft = {
  code: string;
  name: string;
  floors: number;
  rooms: number;
  status: string;
  description?: string;
};

type InventoryDraftItem = {
  itemId: number;
  actualQuantity: number;
  actualCondition?: string;
  note?: string;
};

type SearchableBuilding = DormBuilding & {
  floors: number;
  rooms: number;
  status: string;
  description: string;
};

const delay = (ms = 120) => new Promise((resolve) => window.setTimeout(resolve, ms));
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const roleAdmin: Role = { id: 1, code: 'ADMIN', name: 'Quản trị viên' };
const roleManager: Role = { id: 2, code: 'MANAGER', name: 'Quản lý CSVC' };
const roleStudent: Role = { id: 3, code: 'STUDENT', name: 'Sinh viên' };

const users: User[] = [
  {
    id: 1,
    fullName: 'Nguyễn Hữu Minh',
    userCode: 'ADMIN001',
    email: 'admin@ktx.local',
    phone: '0901000001',
    status: 'ACTIVE',
    createdAt: '2026-01-01T08:00:00.000Z',
    role: roleAdmin,
  },
  {
    id: 2,
    fullName: 'Trần Thu Hà',
    userCode: 'QL001',
    email: 'manager@ktx.local',
    phone: '0901000002',
    status: 'ACTIVE',
    createdAt: '2026-01-01T08:00:00.000Z',
    role: roleManager,
  },
  {
    id: 3,
    fullName: 'Nguyễn Văn An',
    userCode: 'SV20230001',
    email: 'sv01@ktx.local',
    phone: '0901000003',
    status: 'ACTIVE',
    createdAt: '2026-01-01T08:00:00.000Z',
    role: roleStudent,
  },
  {
    id: 4,
    fullName: 'Lê Thu Trang',
    userCode: 'SV20230002',
    email: 'sv02@ktx.local',
    phone: '0901000004',
    status: 'ACTIVE',
    createdAt: '2026-01-01T08:00:00.000Z',
    role: roleStudent,
  },
  {
    id: 5,
    fullName: 'Phạm Quốc Bảo',
    userCode: 'QL002',
    email: 'staff02@ktx.local',
    phone: '0901000005',
    status: 'ACTIVE',
    createdAt: '2026-01-01T08:00:00.000Z',
    role: roleManager,
  },
  {
    id: 6,
    fullName: 'Đặng Hoàng Mai',
    userCode: 'GV001',
    email: 'mai@ktx.local',
    phone: '0901000006',
    status: 'ACTIVE',
    createdAt: '2026-01-01T08:00:00.000Z',
    role: roleAdmin,
  },
];

let buildings: SearchableBuilding[] = [
  {
    id: 1,
    code: 'A',
    name: 'Khu A',
    createdAt: '2026-01-03T08:00:00.000Z',
    floors: 4,
    rooms: 40,
    status: 'Đang hoạt động',
    description: 'Khu nhà A - khối nam sinh gần cổng chính.',
  },
  {
    id: 2,
    code: 'B',
    name: 'Khu B',
    createdAt: '2026-01-03T08:00:00.000Z',
    floors: 3,
    rooms: 32,
    status: 'Đang hoạt động',
    description: 'Khu nhà B - ưu tiên sinh viên năm nhất.',
  },
  {
    id: 3,
    code: 'C',
    name: 'Khu C',
    createdAt: '2026-01-03T08:00:00.000Z',
    floors: 2,
    rooms: 20,
    status: 'Ngưng hoạt động',
    description: 'Khu nhà C đang chờ cải tạo và nâng cấp hạ tầng.',
  },
];

const floors: Floor[] = [
  { id: 1, buildingId: 1, floorNumber: 1, building: buildings[0] },
  { id: 2, buildingId: 1, floorNumber: 2, building: buildings[0] },
  { id: 3, buildingId: 2, floorNumber: 1, building: buildings[1] },
];

const rooms: Room[] = [
  {
    id: 1,
    floorId: 1,
    roomCode: 'A101',
    capacity: 6,
    note: 'Phòng tiêu chuẩn 6 sinh viên.',
    createdAt: '2026-01-05T08:00:00.000Z',
    floor: { ...floors[0], building: buildings[0] },
  },
  {
    id: 2,
    floorId: 2,
    roomCode: 'A201',
    capacity: 6,
    note: 'Phòng có điều hòa.',
    createdAt: '2026-01-05T08:00:00.000Z',
    floor: { ...floors[1], building: buildings[0] },
  },
  {
    id: 3,
    floorId: 3,
    roomCode: 'B105',
    capacity: 4,
    note: 'Phòng gần khu tự học.',
    createdAt: '2026-01-05T08:00:00.000Z',
    floor: { ...floors[2], building: buildings[1] },
  },
];

rooms[0].roomStudents = [
  {
    id: 1,
    roomId: 1,
    studentId: 3,
    startDate: '2024-09-01',
    isActive: true,
    student: users[2],
  },
  {
    id: 2,
    roomId: 1,
    studentId: 4,
    startDate: '2024-09-01',
    isActive: true,
    student: users[3],
  },
];

const categories: AssetCategory[] = [
  {
    id: 1,
    code: 'BED',
    name: 'Giường',
    maintenanceCycleMonths: 12,
    createdAt: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 2,
    code: 'FAN',
    name: 'Quạt trần',
    maintenanceCycleMonths: 6,
    createdAt: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 3,
    code: 'AC',
    name: 'Điều hòa',
    maintenanceCycleMonths: 4,
    createdAt: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 4,
    code: 'LIGHT',
    name: 'Đèn LED',
    maintenanceCycleMonths: 6,
    createdAt: '2026-01-01T08:00:00.000Z',
  },
];

let assets: Asset[] = [
  {
    id: 1,
    categoryId: 2,
    roomId: 1,
    assetCode: 'TS-A101-01',
    assetName: 'Quạt trần phòng A101',
    status: 'IN_USE',
    yearInUse: 2023,
    description: 'Quạt trần 5 cánh Panasonic',
    createdAt: '2026-01-05T08:00:00.000Z',
    category: categories[1],
    room: rooms[0],
  },
  {
    id: 2,
    categoryId: 3,
    roomId: 1,
    assetCode: 'TS-A101-02',
    assetName: 'Điều hòa phòng A101',
    status: 'UNDER_MAINTENANCE',
    yearInUse: 2022,
    description: 'Điều hòa 1.5HP',
    createdAt: '2026-01-05T08:00:00.000Z',
    category: categories[2],
    room: rooms[0],
  },
  {
    id: 3,
    categoryId: 4,
    roomId: 1,
    assetCode: 'TS-A101-03',
    assetName: 'Đèn LED hành lang A101',
    status: 'AVAILABLE',
    yearInUse: 2024,
    description: 'Đèn led 24W',
    createdAt: '2026-01-05T08:00:00.000Z',
    category: categories[3],
    room: rooms[0],
  },
  {
    id: 4,
    categoryId: 1,
    roomId: 2,
    assetCode: 'TS-A201-01',
    assetName: 'Giường tầng phòng A201',
    status: 'IN_USE',
    yearInUse: 2024,
    description: 'Giường thép sơn tĩnh điện',
    createdAt: '2026-01-05T08:00:00.000Z',
    category: categories[0],
    room: rooms[1],
  },
  {
    id: 5,
    categoryId: 2,
    roomId: 3,
    assetCode: 'TS-B105-01',
    assetName: 'Quạt trần phòng B105',
    status: 'PENDING_LIQUIDATION',
    yearInUse: 2019,
    description: 'Quạt xuống cấp, rung mạnh',
    createdAt: '2026-01-05T08:00:00.000Z',
    category: categories[1],
    room: rooms[2],
  },
  {
    id: 6,
    categoryId: 1,
    roomId: 1,
    assetCode: 'TS-A101-04',
    assetName: 'Giường tầng phòng A101 số 2',
    status: 'DAMAGED',
    yearInUse: 2018,
    description: 'Khung giường oxy hóa, cong vênh sau thời gian dài sử dụng',
    createdAt: '2026-01-05T08:00:00.000Z',
    category: categories[0],
    room: rooms[0],
  },
  {
    id: 7,
    categoryId: 4,
    roomId: 2,
    assetCode: 'TS-A201-02',
    assetName: 'Đèn LED phòng A201',
    status: 'DAMAGED',
    yearInUse: 2020,
    description: 'Hệ thống đèn xuống cấp, nhấp nháy liên tục',
    createdAt: '2026-01-05T08:00:00.000Z',
    category: categories[3],
    room: rooms[1],
  },
  {
    id: 8,
    categoryId: 3,
    roomId: 2,
    assetCode: 'TS-A201-03',
    assetName: 'Điều hòa phòng A201',
    status: 'PENDING_LIQUIDATION',
    yearInUse: 2017,
    description: 'Thiết bị hoạt động kém hiệu quả, tiêu hao điện cao',
    createdAt: '2026-01-05T08:00:00.000Z',
    category: categories[2],
    room: rooms[1],
  },
  {
    id: 9,
    categoryId: 2,
    roomId: 2,
    assetCode: 'TS-A201-04',
    assetName: 'Quạt trần phòng A201',
    status: 'DAMAGED',
    yearInUse: 2019,
    description: 'Quạt phát tiếng ồn lớn và rung mạnh khi hoạt động',
    createdAt: '2026-01-05T08:00:00.000Z',
    category: categories[1],
    room: rooms[1],
  },
  {
    id: 10,
    categoryId: 1,
    roomId: 3,
    assetCode: 'TS-B105-02',
    assetName: 'Giường tầng phòng B105',
    status: 'PENDING_LIQUIDATION',
    yearInUse: 2016,
    description: 'Mối mọt và lỏng khung giường, không còn an toàn sử dụng',
    createdAt: '2026-01-05T08:00:00.000Z',
    category: categories[0],
    room: rooms[2],
  },
];

const inventoryCouncil: CouncilMember[] = [
  { userId: 2, roleInCouncil: 'Trưởng ban', user: users[1] },
  { userId: 5, roleInCouncil: 'Ủy viên', user: users[4] },
];

const liquidationCouncil: CouncilMember[] = [
  { userId: 1, roleInCouncil: 'Chủ tịch hội đồng', user: users[0] },
  { userId: 6, roleInCouncil: 'Ủy viên', user: users[5] },
];

let notifications: AppNotification[] = [
  {
    id: 1,
    userId: 3,
    title: 'Phiếu báo hỏng BH-2026-004 đã được tiếp nhận',
    content: 'Bộ phận CSVC đã tiếp nhận và đang điều phối xử lý.',
    status: 'UNREAD',
    relatedTable: 'damage_reports',
    relatedId: 2,
    createdAt: '2026-05-31T08:30:00.000Z',
  },
  {
    id: 3,
    userId: 2,
    title: 'Lịch bảo trì tháng 6 đã sẵn sàng',
    content: '3 tài sản đến hạn bảo trì trong tuần này.',
    status: 'READ',
    createdAt: '2026-05-29T07:45:00.000Z',
    readAt: '2026-05-29T08:00:00.000Z',
  },
  {
    id: 4,
    userId: 1,
    title: 'Đề xuất thanh lý cần phê duyệt',
    content: 'Biên bản TL-2026-001 đang chờ phê duyệt cuối.',
    status: 'UNREAD',
    createdAt: '2026-05-28T14:20:00.000Z',
  },
];

const damageLogs: DamageReportLog[] = [
  {
    id: 1,
    action: 'Tạo phiếu',
    oldStatus: null,
    newStatus: 'SUBMITTED',
    note: 'Sinh viên gửi phiếu báo hỏng ban đầu.',
    createdAt: '2026-05-28T08:00:00.000Z',
    createdByUser: users[2],
  },
  {
    id: 2,
    action: 'Tiếp nhận',
    oldStatus: 'SUBMITTED',
    newStatus: 'REVIEWING',
    note: 'QL CSVC đã tiếp nhận phiếu và kiểm tra hiện trạng.',
    createdAt: '2026-05-28T10:00:00.000Z',
    createdByUser: users[1],
  },
];

let damageReports: DamageReport[] = [
  {
    id: 1,
    reportCode: 'BH-2026-001',
    reporterId: 3,
    assetId: 1,
    roomId: 1,
    description: 'Quạt trần phát tiếng ồn lớn khi bật số cao và rung mạnh vào ban đêm.',
    priority: 'HIGH',
    status: 'REVIEWING',
    createdAt: '2026-05-28T08:00:00.000Z',
    updatedAt: '2026-05-28T10:00:00.000Z',
    reporter: users[2],
    asset: assets[0],
    room: rooms[0],
    damageReportLogs: damageLogs,
  },
  {
    id: 2,
    reportCode: 'BH-2026-004',
    reporterId: 3,
    assetId: 2,
    roomId: 1,
    description: 'Điều hòa không làm lạnh, có hiện tượng chảy nước sau khoảng 20 phút hoạt động.',
    priority: 'URGENT',
    status: 'IN_PROGRESS',
    createdAt: '2026-05-31T07:00:00.000Z',
    updatedAt: '2026-05-31T10:30:00.000Z',
    reporter: users[2],
    asset: assets[1],
    room: rooms[0],
    damageReportLogs: [
      ...damageLogs,
      {
        id: 3,
        action: 'Chuyển sửa chữa',
        oldStatus: 'REVIEWING',
        newStatus: 'IN_PROGRESS',
        note: 'Đã tạo lịch cho đội kỹ thuật.',
        createdAt: '2026-05-31T10:30:00.000Z',
        createdByUser: users[1],
      },
    ],
  },
];

const inventoryItems: InventoryCheckItem[] = [
  {
    id: 1,
    inventoryCheckId: 1,
    assetId: 1,
    systemQuantity: 1,
    actualQuantity: 1,
    difference: 0,
    actualCondition: 'Tốt',
    note: '',
    asset: assets[0],
  },
  {
    id: 2,
    inventoryCheckId: 1,
    assetId: 2,
    systemQuantity: 1,
    actualQuantity: 1,
    difference: 0,
    actualCondition: 'Cần vệ sinh dàn lạnh',
    note: 'Đưa vào kế hoạch bảo trì tuần tới.',
    asset: assets[1],
  },
];

let inventoryChecks: InventoryCheck[] = [
  {
    id: 1,
    inventoryCode: 'KK-2026-001',
    roomId: 1,
    checkedBy: 2,
    checkDate: '2026-05-25',
    status: 'DRAFT',
    generalNote: 'Kiểm kê định kỳ khu A đợt 2.',
    createdAt: '2026-05-25T08:00:00.000Z',
    updatedAt: '2026-05-25T08:00:00.000Z',
    room: rooms[0],
    checkedByUser: users[1],
    inventoryCheckItems: inventoryItems,
    councilMembers: inventoryCouncil,
  },
];

let maintenancePlans: MaintenancePlan[] = [
  {
    id: 1,
    assetId: 1,
    createdBy: 2,
    cycleMonths: 6,
    nextDueDate: '2026-06-20',
    isActive: true,
    note: 'Bảo dưỡng quạt trước cao điểm hè.',
    createdAt: '2026-01-10T08:00:00.000Z',
    asset: assets[0],
    createdByUser: users[1],
  },
  {
    id: 2,
    assetId: 2,
    createdBy: 2,
    cycleMonths: 4,
    nextDueDate: '2026-06-10',
    isActive: true,
    note: 'Điều hòa cần vệ sinh định kỳ.',
    createdAt: '2026-01-10T08:00:00.000Z',
    asset: assets[1],
    createdByUser: users[1],
  },
];

let maintenanceRecords: MaintenanceRecord[] = [
  {
    id: 1,
    maintenanceCode: 'BT-2026-001',
    planId: 2,
    assetId: 2,
    performedBy: 5,
    maintenanceDate: '2026-05-18',
    maintenanceType: 'SCHEDULED',
    content: 'Vệ sinh dàn lạnh, kiểm tra gas và siết lại đầu nối thoát nước.',
    resultStatus: 'GOOD',
    nextMaintenanceDate: '2026-09-18',
    cost: 350000,
    materialNote: 'Bổ sung ống thoát nước 1m.',
    note: 'Thiết bị hoạt động ổn định sau bảo trì.',
    createdAt: '2026-05-18T08:00:00.000Z',
    updatedAt: '2026-05-18T10:00:00.000Z',
    asset: assets[1],
    plan: maintenancePlans[1],
    performedByUser: users[4],
  },
];

let liquidationRecords: LiquidationRecord[] = [
  {
    id: 1,
    liquidationCode: 'TL-2026-001',
    createdBy: 2,
    liquidationDate: '2026-05-27',
    status: 'PENDING_APPROVAL',
    note: 'Thiết bị rung mạnh, không còn hiệu quả sử dụng.',
    createdAt: '2026-05-27T09:00:00.000Z',
    updatedAt: '2026-05-27T09:30:00.000Z',
    liquidationItems: [
      {
        id: 1,
        liquidationRecordId: 1,
        assetId: 5,
        assetCondition: 'Quạt xuống cấp nghiêm trọng, rung và phát tiếng ồn lớn.',
        reason: 'Chi phí sửa chữa cao hơn giá trị sử dụng còn lại.',
        estimatedRemainingValue: 50000,
        asset: assets[4],
      },
    ],
    createdByUser: users[1],
    councilMembers: liquidationCouncil,
  },
  {
    id: 2,
    liquidationCode: 'TL-2026-002',
    createdBy: 5,
    liquidationDate: '2026-05-24',
    status: 'APPROVED',
    note: 'Ho so dang cho hoan tat ban thanh ly cho lo thiet bi khu A.',
    createdAt: '2026-05-24T08:15:00.000Z',
    updatedAt: '2026-05-25T10:00:00.000Z',
    liquidationItems: [
      {
        id: 2,
        liquidationRecordId: 2,
        assetId: 8,
        assetCondition: 'Hieu suat lam lanh thap, tieu hao dien nang.',
        reason: 'Het nien han su dung.',
        estimatedRemainingValue: 750000,
        asset: assets[7],
      },
      {
        id: 3,
        liquidationRecordId: 2,
        assetId: 9,
        assetCondition: 'Quat rung manh, canh quat lech truc.',
        reason: 'Het nien han su dung.',
        estimatedRemainingValue: 180000,
        asset: assets[8],
      },
      {
        id: 4,
        liquidationRecordId: 2,
        assetId: 7,
        assetCondition: 'He den nhap nhay lien tuc, chap chon.',
        reason: 'Nang cap, thay the thiet bi moi.',
        estimatedRemainingValue: 120000,
        asset: assets[6],
      },
    ],
    createdByUser: users[4],
    councilMembers: liquidationCouncil,
  },
  {
    id: 3,
    liquidationCode: 'TL-2026-003',
    createdBy: 2,
    liquidationDate: '2026-05-20',
    status: 'COMPLETED',
    note: 'Da hoan tat thanh ly lo thiet bi cu khu A.',
    createdAt: '2026-05-20T08:00:00.000Z',
    updatedAt: '2026-05-22T16:20:00.000Z',
    liquidationItems: [
      {
        id: 5,
        liquidationRecordId: 3,
        assetId: 6,
        assetCondition: 'Khung giuong cong venh, lop son bong troc nghiem trong.',
        reason: 'Hu hong do chay no cuc bo.',
        estimatedRemainingValue: 0,
        asset: assets[5],
      },
      {
        id: 6,
        liquidationRecordId: 3,
        assetId: 7,
        assetCondition: 'Den hu hong toan bo mach nguon.',
        reason: 'Hu hong do chay no cuc bo.',
        estimatedRemainingValue: 0,
        asset: assets[6],
      },
    ],
    createdByUser: users[1],
    councilMembers: liquidationCouncil,
  },
  {
    id: 4,
    liquidationCode: 'TL-2026-004',
    createdBy: 5,
    liquidationDate: '2026-05-15',
    status: 'REJECTED',
    note: 'Tam thoi chua du can cu thanh ly, yeu cau kiem tra lai hien trang.',
    createdAt: '2026-05-15T09:00:00.000Z',
    updatedAt: '2026-05-16T14:20:00.000Z',
    liquidationItems: [
      {
        id: 7,
        liquidationRecordId: 4,
        assetId: 4,
        assetCondition: 'Khong tim thay tai thoi diem kiem tra.',
        reason: 'That lac, khong tim thay.',
        estimatedRemainingValue: 0,
        asset: assets[3],
      },
    ],
    createdByUser: users[4],
    councilMembers: liquidationCouncil,
  },
  {
    id: 5,
    liquidationCode: 'TL-2026-005',
    createdBy: 2,
    liquidationDate: '2026-05-10',
    status: 'COMPLETED',
    note: 'Hoan tat thanh ly do nang cap dong bo phong o.',
    createdAt: '2026-05-10T08:20:00.000Z',
    updatedAt: '2026-05-13T17:00:00.000Z',
    liquidationItems: [
      {
        id: 8,
        liquidationRecordId: 5,
        assetId: 1,
        assetCondition: 'Quat da cu, hieu suat thap, khong dong bo voi he thong moi.',
        reason: 'Nang cap, thay the thiet bi moi.',
        estimatedRemainingValue: 350000,
        asset: assets[0],
      },
      {
        id: 9,
        liquidationRecordId: 5,
        assetId: 3,
        assetCondition: 'Den LED cu duoc thay dong bo sang mau tiet kiem dien.',
        reason: 'Nang cap, thay the thiet bi moi.',
        estimatedRemainingValue: 200000,
        asset: assets[2],
      },
      {
        id: 10,
        liquidationRecordId: 5,
        assetId: 10,
        assetCondition: 'Giuong cu khong con phu hop voi chuan bo tri moi.',
        reason: 'Khac.',
        estimatedRemainingValue: 550000,
        asset: assets[9],
      },
    ],
    createdByUser: users[1],
    councilMembers: liquidationCouncil,
  },
];

function nextIdFrom<T extends { id: number }>(collection: T[]) {
  return (collection.length > 0 ? collection[collection.length - 1].id : 0) + 1;
}

function nextCode(prefix: string, collection: Array<{ id: number }>) {
  return `${prefix}-2026-${String(collection.length + 1).padStart(3, '0')}`;
}

function getAssetById(assetId: number) {
  return assets.find((asset) => asset.id === assetId) ?? null;
}

function getRoomById(roomId: number) {
  return rooms.find((room) => room.id === roomId) ?? null;
}

function buildPagination<T>(items: T[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);

  return {
    items: pageItems,
    pagination: {
      page,
      pageSize,
      total: items.length,
      totalPages: Math.max(1, Math.ceil(items.length / pageSize)),
    },
  };
}

function getInventoryPrintable(record: InventoryCheck): InventoryCheckExportResponse {
  return {
    ...clone(record),
    printable: {
      title: 'Phiếu kiểm kê tài sản',
      generatedAt: new Date().toISOString(),
      roomLabel: record.room?.roomCode ?? '--',
      checkedByLabel: record.checkedByUser.fullName,
    },
  };
}

function getLiquidationPrintable(record: LiquidationRecord): LiquidationRecordExportResponse {
  const asset = record.liquidationItems[0]?.asset;
  return {
    ...clone(record),
    printable: {
      title: 'Biên bản thanh lý tài sản',
      generatedAt: new Date().toISOString(),
      assetLabel: asset ? `${asset.assetCode} - ${asset.assetName}` : '--',
      createdByLabel: record.createdByUser.fullName,
    },
  };
}



export async function getMockReportsSummary(): Promise<ReportsSummary> {
  await delay();
  return {
    totalAssets: 3560,
    assetsByStatus: [
      { status: 'IN_USE', count: 3420 },
      { status: 'DAMAGED', count: 140 },
    ],
    totalRooms: 120,
    totalStudents: 522,
    pendingDamageReports: 8,
    maintenanceDueCount: 14,
    liquidatedAssetsCount: 5,
  };
}

export async function getMockDamageByMonth(): Promise<MonthlyCount[]> {
  await delay();
  return [
    { month: '01/2026', count: 45 },
    { month: '02/2026', count: 38 },
    { month: '03/2026', count: 50 },
    { month: '04/2026', count: 62 },
    { month: '05/2026', count: 55 },
  ];
}

export async function getMockNotifications(page = 1, pageSize = 12): Promise<NotificationsResponse> {
  await delay();
  return clone(buildPagination(notifications, page, pageSize));
}

export async function getMockUnreadCount() {
  await delay(60);
  return notifications.filter((item) => item.status === 'UNREAD').length;
}

export async function markMockNotificationRead(id: number) {
  await delay(60);
  notifications = notifications.map((item) =>
    item.id === id ? { ...item, status: 'READ', readAt: item.readAt ?? new Date().toISOString() } : item,
  );
}

export async function markAllMockNotificationsRead() {
  await delay(60);
  notifications = notifications.map((item) => ({
    ...item,
    status: 'READ',
    readAt: item.readAt ?? new Date().toISOString(),
  }));
}

export async function getMockStudentAssets(): Promise<DamageReportStudentAssetsResponse> {
  await delay();
  return clone({
    room: rooms[0],
    assets: assets.filter((asset) => asset.roomId === 1),
  });
}

export async function getMockDamageReportsPaginated(params?: Record<string, string | number | boolean | undefined>) {
  await delay();
  const page = Number(params?.page ?? 1);
  const pageSize = Number(params?.pageSize ?? 10);
  return clone(buildPagination(damageReports, page, pageSize));
}

export async function getMockDamageReport(reportId: number) {
  await delay();
  const report = damageReports.find((item) => item.id === reportId);
  return report ? clone(report) : null;
}

export async function createMockDamageReport(input: {
  assetId: number;
  roomId: number;
  description: string;
  priority: DamageReportPriority;
}) {
  await delay();
  const asset = getAssetById(input.assetId);
  const room = getRoomById(input.roomId);
  if (!asset || !room) {
    throw new Error('Không tìm thấy tài sản hoặc phòng.');
  }

  const id = nextIdFrom(damageReports);
  const createdAt = new Date().toISOString();
  const report: DamageReport = {
    id,
    reportCode: nextCode('BH', damageReports),
    reporterId: users[2].id,
    assetId: asset.id,
    roomId: room.id,
    description: input.description,
    priority: input.priority,
    status: 'SUBMITTED',
    createdAt,
    updatedAt: createdAt,
    reporter: users[2],
    asset,
    room,
    damageReportLogs: [
      {
        id: Date.now(),
        action: 'Tạo phiếu',
        oldStatus: null,
        newStatus: 'SUBMITTED',
        note: 'Sinh viên tạo phiếu mới.',
        createdAt,
        createdByUser: users[2],
      },
    ],
  };
  damageReports = [report, ...damageReports];
  notifications = [
    {
      id: nextIdFrom(notifications),
      userId: 2,
      title: `Có phiếu báo hỏng mới ${report.reportCode}`,
      content: 'Sinh viên vừa gửi một phiếu báo hỏng mới cần tiếp nhận.',
      status: 'UNREAD',
      createdAt,
      relatedTable: 'damage_reports',
      relatedId: id,
    },
    ...notifications,
  ];
  return clone(report);
}

export async function updateMockDamageReport(
  reportId: number,
  input: { assetId: number; description: string; priority: DamageReportPriority },
) {
  await delay();
  const asset = getAssetById(input.assetId);
  if (!asset) {
    throw new Error('Không tìm thấy tài sản.');
  }

  damageReports = damageReports.map((report) =>
    report.id === reportId
      ? {
          ...report,
          assetId: asset.id,
          asset,
          description: input.description,
          priority: input.priority,
          updatedAt: new Date().toISOString(),
        }
      : report,
  );

  return getMockDamageReport(reportId);
}

export async function runMockDamageWorkflow(
  reportId: number,
  action: string,
  note?: string,
  assetStatus?: Asset['status'],
) {
  await delay();
  const report = damageReports.find((item) => item.id === reportId);
  if (!report) {
    throw new Error('Không tìm thấy phiếu báo hỏng.');
  }

  const nextStatusMap: Record<string, DamageReport['status']> = {
    accept: 'REVIEWING',
    reject: 'REJECTED',
    'start-processing': 'IN_PROGRESS',
    complete: 'COMPLETED',
    cancel: 'REJECTED',
  };
  const nextStatus = nextStatusMap[action];
  const now = new Date().toISOString();

  damageReports = damageReports.map((item) =>
    item.id === reportId
      ? {
          ...item,
          status: nextStatus ?? item.status,
          updatedAt: now,
          asset: assetStatus && item.asset ? { ...item.asset, status: assetStatus } : item.asset,
          damageReportLogs: [
            ...(item.damageReportLogs ?? []),
            {
              id: Date.now(),
              action,
              oldStatus: item.status,
              newStatus: nextStatus ?? item.status,
              note: note || null,
              createdAt: now,
              createdByUser: users[1],
            },
          ],
        }
      : item,
  );

  if (assetStatus) {
    assets = assets.map((asset) =>
      asset.id === report.assetId ? { ...asset, status: assetStatus } : asset,
    );
  }
}

export async function getMockRooms() {
  await delay();
  return clone(rooms);
}

export async function getMockRoomStudents(roomId: number) {
  await delay();
  const room = getRoomById(roomId);
  return clone(room?.roomStudents?.map((entry) => entry.student) ?? []);
}

export async function getMockRoomAssets(roomId: number) {
  await delay();
  return clone(assets.filter((asset) => asset.roomId === roomId));
}

export async function createMockInventoryCheck(input: {
  roomId: number;
  checkDate: string;
  generalNote?: string;
  members?: CouncilMember[];
}) {
  await delay();
  const room = getRoomById(input.roomId);
  if (!room) {
    throw new Error('Không tìm thấy phòng kiểm kê.');
  }

  const id = nextIdFrom(inventoryChecks);
  const roomAssets = assets.filter((asset) => asset.roomId === room.id);
  const items = roomAssets.map<InventoryCheckItem>((asset, index) => ({
    id: id * 10 + index + 1,
    inventoryCheckId: id,
    assetId: asset.id,
    systemQuantity: 1,
    actualQuantity: 1,
    difference: 0,
    actualCondition: asset.status === 'UNDER_MAINTENANCE' ? 'Cần bảo trì' : 'Tốt',
    note: '',
    asset,
  }));

  const record: InventoryCheck = {
    id,
    inventoryCode: nextCode('KK', inventoryChecks),
    roomId: room.id,
    checkedBy: users[1].id,
    checkDate: input.checkDate,
    status: 'DRAFT',
    generalNote: input.generalNote ?? '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    room,
    checkedByUser: users[1],
    inventoryCheckItems: items,
    councilMembers: input.members && input.members.length > 0 ? input.members : inventoryCouncil,
  };
  inventoryChecks = [record, ...inventoryChecks];
  return clone(record);
}

export async function getMockInventoryCheck(inventoryCheckId: number) {
  await delay();
  const record = inventoryChecks.find((item) => item.id === inventoryCheckId);
  return record ? clone(record) : null;
}

export async function saveMockInventoryResults(
  inventoryCheckId: number,
  input: { generalNote?: string; items: InventoryDraftItem[] },
) {
  await delay();
  inventoryChecks = inventoryChecks.map((record) =>
    record.id === inventoryCheckId
      ? {
          ...record,
          generalNote: input.generalNote ?? record.generalNote,
          updatedAt: new Date().toISOString(),
          inventoryCheckItems: record.inventoryCheckItems.map((item) => {
            const draft = input.items.find((entry) => entry.itemId === item.id);
            if (!draft) return item;
            return {
              ...item,
              actualQuantity: draft.actualQuantity,
              actualCondition: draft.actualCondition,
              note: draft.note,
              difference: draft.actualQuantity - item.systemQuantity,
            };
          }),
        }
      : record,
  );
}

export async function completeMockInventoryCheck(inventoryCheckId: number, generalNote?: string) {
  await delay();
  inventoryChecks = inventoryChecks.map((record) =>
    record.id === inventoryCheckId
      ? {
          ...record,
          status: 'COMPLETED' as InventoryCheckStatus,
          generalNote: generalNote ?? record.generalNote,
          completedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      : record,
  );
}

export async function getMockInventoryCheckExport(inventoryCheckId: number) {
  const record = await getMockInventoryCheck(inventoryCheckId);
  return record ? getInventoryPrintable(record) : null;
}

export async function getMockAssets() {
  await delay();
  return clone(assets);
}

export async function getMockMaintenancePlans() {
  await delay();
  return clone(maintenancePlans);
}

export async function createMockMaintenanceRecord(input: {
  planId?: number;
  assetId: number;
  maintenanceDate: string;
  maintenanceType: MaintenanceType;
  content: string;
  resultStatus: MaintenanceResultStatus;
  nextMaintenanceDate?: string;
  cost?: number;
  materialNote?: string;
  note?: string;
}) {
  await delay();
  const asset = getAssetById(input.assetId);
  if (!asset) {
    throw new Error('Không tìm thấy tài sản bảo trì.');
  }

  const id = nextIdFrom(maintenanceRecords);
  const record: MaintenanceRecord = {
    id,
    maintenanceCode: nextCode('BT', maintenanceRecords),
    planId: input.planId,
    assetId: asset.id,
    performedBy: users[4].id,
    maintenanceDate: input.maintenanceDate,
    maintenanceType: input.maintenanceType,
    content: input.content,
    resultStatus: input.resultStatus,
    nextMaintenanceDate: input.nextMaintenanceDate ?? null,
    cost: input.cost ?? null,
    materialNote: input.materialNote ?? null,
    note: input.note ?? null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    asset,
    plan: maintenancePlans.find((plan) => plan.id === input.planId) ?? null,
    performedByUser: users[4],
  };
  maintenanceRecords = [record, ...maintenanceRecords];
  return clone(record);
}

export async function getMockMaintenanceHistory(assetId: number) {
  await delay();
  return clone(maintenanceRecords.filter((record) => record.assetId === assetId));
}

export async function getMockLiquidationRecords(filters: {
  page?: number;
  pageSize?: number;
  status?: string;
  roomId?: string;
  categoryId?: string;
  keyword?: string;
}) {
  await delay();
  const { page = 1, pageSize = 10, status, roomId, categoryId, keyword } = filters;

  const filtered = liquidationRecords.filter((record) => {
    const asset = record.liquidationItems[0]?.asset;
    const matchesStatus = !status || record.status === status;
    const matchesRoom = !roomId || String(asset?.room?.id ?? '') === String(roomId);
    const matchesCategory = !categoryId || String(asset?.category?.id ?? '') === String(categoryId);
    const matchesKeyword =
      !keyword ||
      `${record.liquidationCode} ${record.note ?? ''} ${asset?.assetCode ?? ''} ${asset?.assetName ?? ''}`
        .toLowerCase()
        .includes(keyword.toLowerCase());

    return matchesStatus && matchesRoom && matchesCategory && matchesKeyword;
  });

  return clone(buildPagination(filtered, page, pageSize));
}

export async function createMockLiquidationRecord(input: {
  assetId: number;
  liquidationDate: string;
  assetCondition: string;
  reason: string;
  estimatedRemainingValue?: number;
  note?: string;
  members?: CouncilMember[];
}) {
  await delay();
  const asset = getAssetById(input.assetId);
  if (!asset) {
    throw new Error('Không tìm thấy tài sản cần thanh lý.');
  }

  const id = nextIdFrom(liquidationRecords);
  const record: LiquidationRecord = {
    id,
    liquidationCode: nextCode('TL', liquidationRecords),
    createdBy: users[1].id,
    liquidationDate: input.liquidationDate,
    status: 'DRAFT',
    note: input.note ?? null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    liquidationItems: [
      {
        id,
        liquidationRecordId: id,
        assetId: asset.id,
        assetCondition: input.assetCondition,
        reason: input.reason,
        estimatedRemainingValue: input.estimatedRemainingValue ?? null,
        asset: { ...asset, status: 'PENDING_LIQUIDATION' },
      },
    ],
    createdByUser: users[1],
    councilMembers: input.members && input.members.length > 0 ? input.members : liquidationCouncil,
  };
  assets = assets.map((item) => (item.id === asset.id ? { ...item, status: 'PENDING_LIQUIDATION' } : item));
  liquidationRecords = [record, ...liquidationRecords];
  return clone(record);
}

export async function getMockLiquidationRecord(recordId: number) {
  await delay();
  const record = liquidationRecords.find((item) => item.id === recordId);
  return record ? clone(record) : null;
}

export async function runMockLiquidationWorkflow(recordId: number, action: string, note?: string) {
  await delay();
  const statusMap: Record<string, LiquidationStatus> = {
    'submit-approval': 'PENDING_APPROVAL',
    approve: 'APPROVED',
    reject: 'REJECTED',
    complete: 'COMPLETED',
    cancel: 'CANCELLED',
  };
  const nextStatus = statusMap[action];
  liquidationRecords = liquidationRecords.map((record) =>
    record.id === recordId
      ? {
          ...record,
          status: nextStatus ?? record.status,
          note: note || record.note,
          updatedAt: new Date().toISOString(),
        }
      : record,
  );

  if (action === 'complete') {
    const assetId = liquidationRecords.find((item) => item.id === recordId)?.liquidationItems[0]?.assetId;
    if (assetId) {
      assets = assets.map((asset) => (asset.id === assetId ? { ...asset, status: 'LIQUIDATED' } : asset));
    }
  }
}

export async function getMockLiquidationRecordExport(recordId: number) {
  const record = await getMockLiquidationRecord(recordId);
  return record ? getLiquidationPrintable(record) : null;
}

export async function getMockBuildings() {
  await delay();
  return clone(buildings);
}

export async function createMockBuilding(input: BuildingDraft) {
  await delay();
  const building: SearchableBuilding = {
    id: nextIdFrom(buildings),
    code: input.code,
    name: input.name,
    floors: input.floors,
    rooms: input.rooms,
    status: input.status,
    description: input.description || `Khu nhà ${input.code}`,
    createdAt: new Date().toISOString(),
  };
  buildings = [building, ...buildings];
  return clone(building);
}

export async function updateMockBuilding(buildingId: number, input: BuildingDraft) {
  await delay();
  buildings = buildings.map((building) =>
    building.id === buildingId
      ? {
          ...building,
          code: input.code,
          name: input.name,
          floors: input.floors,
          rooms: input.rooms,
          status: input.status,
          description: input.description || building.description,
          updatedAt: new Date().toISOString(),
        }
      : building,
  );
}

export async function deleteMockBuilding(buildingId: number) {
  await delay();
  buildings = buildings.filter((building) => building.id !== buildingId);
}

export async function searchMockUsers(keyword: string) {
  await delay(80);
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) return [];
  return clone(
    users.filter(
      (user) =>
        user.fullName.toLowerCase().includes(normalized) ||
        user.userCode.toLowerCase().includes(normalized),
    ),
  );
}

// ========== USERS MOCK (service-format) ==========

const roleOptions = [
  { id: '1', code: 'ADMIN' as const, name: 'Quản trị viên' },
  { id: '2', code: 'MANAGER' as const, name: 'Quản lý CSVC' },
  { id: '3', code: 'STUDENT' as const, name: 'Sinh viên' },
];

function userToManagedUser(u: User) {
  return {
    id: String(u.id),
    fullName: u.fullName,
    username: u.userCode,
    studentCode: u.id === 3 ? 'SV20230001' : u.id === 4 ? 'SV20230002' : null,
    email: u.email ?? null,
    phone: u.phone ?? null,
    status: u.status as 'ACTIVE' | 'LOCKED' | 'INACTIVE',
    createdAt: u.createdAt,
    updatedAt: u.updatedAt ?? new Date().toISOString(),
    lastLoginAt: null,
    role: roleOptions.find(r => r.code === u.role.code) ?? roleOptions[0],
    profile: null,
  };
}

export async function getMockManagedUsers(params: { page?: number; pageSize?: number; keyword?: string; roleCode?: string; status?: string; includeLocked?: boolean }) {
  await delay();
  const { page = 1, pageSize = 10, keyword, roleCode, status } = params;
  let filtered = users.filter(u => true);
  if (keyword) {
    const kw = keyword.toLowerCase();
    filtered = filtered.filter(u => u.fullName.toLowerCase().includes(kw) || u.userCode.toLowerCase().includes(kw) || (u.email ?? '').toLowerCase().includes(kw));
  }
  if (roleCode) filtered = filtered.filter(u => u.role.code === roleCode);
  if (status) filtered = filtered.filter(u => u.status === status);
  const items = filtered.map(userToManagedUser);
  return clone(buildPagination(items, page, pageSize));
}

export async function getMockRoles() {
  await delay(60);
  return clone(roleOptions);
}

export async function createMockManagedUser(payload: { roleId: string; fullName: string; username: string; password: string; email?: string; phone?: string; studentCode?: string }) {
  await delay();
  const newId = users.length + 1;
  const role = roleOptions.find(r => r.id === payload.roleId) ?? roleOptions[2];
  const user: User = {
    id: newId,
    fullName: payload.fullName,
    userCode: payload.username,
    email: payload.email ?? null,
    phone: payload.phone ?? null,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    role: { id: newId, code: role.code, name: role.name },
  };
  users.push(user);
  return userToManagedUser(user);
}

export async function updateMockManagedUser(id: string, payload: { roleId?: string; fullName?: string; username?: string; password?: string; email?: string | null; phone?: string | null; studentCode?: string | null }) {
  await delay();
  const idx = users.findIndex(u => String(u.id) === id);
  if (idx === -1) throw new Error('User not found');
  const existing = users[idx];
  const updated: User = {
    ...existing,
    fullName: payload.fullName ?? existing.fullName,
    userCode: payload.username ?? existing.userCode,
    email: payload.email !== undefined ? payload.email : existing.email,
    phone: payload.phone !== undefined ? payload.phone : existing.phone,
    updatedAt: new Date().toISOString(),
    role: payload.roleId ? { id: parseInt(payload.roleId), code: (roleOptions.find(r => r.id === payload.roleId) ?? roleOptions[2]).code, name: (roleOptions.find(r => r.id === payload.roleId) ?? roleOptions[2]).name } : existing.role,
  };
  users[idx] = updated;
  return userToManagedUser(updated);
}

export async function lockMockUser(id: string) {
  await delay();
  const idx = users.findIndex(u => String(u.id) === id);
  if (idx === -1) throw new Error('User not found');
  users[idx] = { ...users[idx], status: 'LOCKED', updatedAt: new Date().toISOString() };
  return userToManagedUser(users[idx]);
}

export async function unlockMockUser(id: string) {
  await delay();
  const idx = users.findIndex(u => String(u.id) === id);
  if (idx === -1) throw new Error('User not found');
  users[idx] = { ...users[idx], status: 'ACTIVE', updatedAt: new Date().toISOString() };
  return userToManagedUser(users[idx]);
}

export async function resetMockUserPassword(id: string, newPassword: string) {
  await delay(60);
  return { userId: id };
}

// ========== ASSET CATEGORIES MOCK ==========

function catToRecord(c: AssetCategory) {
  return {
    id: String(c.id),
    code: c.code,
    name: c.name,
    description: c.description ?? null,
    unit: null,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt ?? new Date().toISOString(),
  };
}

export async function getMockAssetCategoryRecords() {
  await delay();
  return clone(categories.map(catToRecord));
}

export async function createMockAssetCategoryRecord(payload: { code: string; name: string; description?: string | null; unit?: string | null }) {
  await delay();
  const newId = categories.length + 1;
  const cat: AssetCategory = {
    id: newId,
    code: payload.code,
    name: payload.name,
    description: payload.description ?? null,
    createdAt: new Date().toISOString(),
  };
  categories.push(cat);
  return catToRecord(cat);
}

export async function updateMockAssetCategoryRecord(id: string, payload: { code?: string; name?: string; description?: string | null; unit?: string | null }) {
  await delay();
  const idx = categories.findIndex(c => String(c.id) === id);
  if (idx === -1) throw new Error('Category not found');
  categories[idx] = { ...categories[idx], ...payload, updatedAt: new Date().toISOString() } as AssetCategory;
  return catToRecord(categories[idx]);
}

export async function deleteMockAssetCategoryRecord(id: string) {
  await delay(60);
  const idx = categories.findIndex(c => String(c.id) === id);
  if (idx >= 0) categories.splice(idx, 1);
  return { message: 'Deleted' };
}

// ========== AUDIT LOGS MOCK ==========

const auditLogEntries: Array<{ id: string; actorUserId: string; actorRole: string; action: string; entityType: string; entityId: string; content: string; ipAddress: string | null; userAgent: string | null; createdAt: string }> = [
  { id: '1', actorUserId: '2', actorRole: 'MANAGER', action: 'LOGIN', entityType: 'auth', entityId: '2', content: 'Manager đăng nhập hệ thống', ipAddress: '192.168.1.100', userAgent: 'Chrome/120', createdAt: '2026-05-31T08:00:00.000Z' },
  { id: '2', actorUserId: '1', actorRole: 'ADMIN', action: 'LOCK', entityType: 'user', entityId: '3', content: 'Khóa tài khoản sinh viên', ipAddress: '192.168.1.1', userAgent: 'Chrome/120', createdAt: '2026-05-30T14:30:00.000Z' },
  { id: '3', actorUserId: '2', actorRole: 'MANAGER', action: 'CREATE', entityType: 'damage_report', entityId: '1', content: 'Tạo phiếu báo hỏng BH-2026-001', ipAddress: '192.168.1.100', userAgent: null, createdAt: '2026-05-28T08:00:00.000Z' },
  { id: '4', actorUserId: '2', actorRole: 'MANAGER', action: 'UPDATE', entityType: 'asset', entityId: '2', content: 'Cập nhật trạng thái tài sản thành UNDER_MAINTENANCE', ipAddress: '192.168.1.100', userAgent: null, createdAt: '2026-05-28T10:00:00.000Z' },
  { id: '5', actorUserId: '1', actorRole: 'ADMIN', action: 'CREATE', entityType: 'user', entityId: '5', content: 'Tạo tài khoản quản lý mới', ipAddress: '192.168.1.1', userAgent: 'Chrome/120', createdAt: '2026-05-25T09:00:00.000Z' },
  { id: '6', actorUserId: '3', actorRole: 'STUDENT', action: 'CREATE', entityType: 'damage_report', entityId: '2', content: 'Sinh viên gửi báo hỏng BH-2026-004', ipAddress: '192.168.1.50', userAgent: null, createdAt: '2026-05-31T07:00:00.000Z' },
];

export async function getMockAuditLogs(params: { page?: number; pageSize?: number; keyword?: string; action?: string }) {
  await delay();
  const { page = 1, pageSize = 10, keyword, action } = params;
  let filtered = [...auditLogEntries];
  if (keyword) {
    const kw = keyword.toLowerCase();
    filtered = filtered.filter(l => l.content.toLowerCase().includes(kw) || l.entityType.toLowerCase().includes(kw));
  }
  if (action && action !== 'ALL') filtered = filtered.filter(l => l.action === action);
  return clone(buildPagination(filtered, page, pageSize));
}

export async function getMockAuditLogDetail(id: string) {
  await delay();
  const entry = auditLogEntries.find(e => e.id === id) ?? null;
  return entry ? clone(entry) : null;
}

// ========== PROFILES MOCK ==========

export async function getMockMyProfile() {
  await delay();
  return {
    id: '2',
    fullName: 'Trần Thu Hà',
    username: 'QL001',
    email: 'manager@ktx.local',
    phone: '0901000002',
    studentCode: null,
    status: 'ACTIVE',
    role: { id: 'role-2', code: 'MANAGER' as const, name: 'Quản lý CSVC' },
    createdAt: '2026-01-01T08:00:00.000Z',
    updatedAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    profile: {
      id: 'profile-2',
      avatarUrl: null,
      gender: 'Nữ',
      dateOfBirth: '1990-05-15',
      address: 'Hà Nội',
      faculty: null,
      className: null,
      emergencyName: null,
      emergencyPhone: null,
      notes: '',
    },
  };
}

export async function updateMockMyProfile(payload: { fullName?: string; email?: string | null; phone?: string | null; gender?: string | null; dateOfBirth?: string | null; address?: string | null; notes?: string | null }) {
  await delay();
  const profile = await getMockMyProfile();
  return {
    ...profile,
    ...payload,
    fullName: payload.fullName ?? profile.fullName,
    updatedAt: new Date().toISOString(),
  };
}

// ========== DASHBOARD SUMMARY MOCK ==========

export async function getMockAdminDashboardSummary() {
  await delay();
  return {
    role: 'ADMIN' as const,
    totalUsers: users.length,
    totalStudents: users.filter(u => u.role.code === 'STUDENT').length,
    totalManagers: users.filter(u => u.role.code === 'MANAGER').length,
    totalAssets: assets.length,
    totalDamageReports: damageReports.length,
  };
}

export async function getMockManagerDashboardSummary() {
  await delay();
  const bldgs = new Set(rooms.map(r => r.floor?.building?.code).filter(Boolean));
  return {
    role: 'MANAGER' as const,
    totalBuildings: bldgs.size,
    totalRooms: rooms.length,
    totalAssets: assets.length,
    damagedAssets: assets.filter(a => a.status === 'DAMAGED').length,
    maintenanceProcessing: assets.filter(a => a.status === 'UNDER_MAINTENANCE').length,
    liquidationPending: assets.filter(a => a.status === 'PENDING_LIQUIDATION').length,
  };
}

export async function getMockStudentDashboardSummary() {
  await delay();
  const studentRoom = rooms[0];
  return {
    role: 'STUDENT' as const,
    currentRoom: {
      assignmentId: '1',
      roomId: String(studentRoom.id),
      roomCode: studentRoom.roomCode,
      floorNumber: studentRoom.floor?.floorNumber ?? null,
      buildingId: String(studentRoom.floor?.building?.id ?? 1),
      buildingName: studentRoom.floor?.building?.name ?? 'Khu A',
      bedId: '1',
    },
    assetCount: assets.filter(a => a.roomId === studentRoom.id).length,
    damageReportProcessing: damageReports.filter(r => ['SUBMITTED', 'REVIEWING', 'IN_PROGRESS', 'APPROVED'].includes(r.status)).length,
  };
}

// ========== ASSET RECORDS (service-format) ==========

const statusLabels: Record<string, string> = {
  AVAILABLE: 'Sẵn sàng',
  IN_USE: 'Đang sử dụng',
  UNDER_MAINTENANCE: 'Đang bảo trì',
  DAMAGED: 'Hỏng',
  PENDING_LIQUIDATION: 'Chờ thanh lý',
  LIQUIDATED: 'Đã thanh lý',
  INACTIVE: 'Không hoạt động',
};

function assetToRecord(a: Asset) {
  const assetRoom = a.room;
  const building = assetRoom?.floor?.building;
  return {
    id: String(a.id),
    assetCode: a.assetCode,
    assetName: a.assetName,
    categoryCode: a.category?.code ?? '',
    categoryName: a.category?.name ?? '',
    buildingCode: building?.code ?? null,
    buildingName: building?.name ?? null,
    roomCode: assetRoom?.roomCode ?? null,
    roomName: assetRoom?.roomCode ?? null,
    supplierCode: null,
    supplierName: null,
    status: a.status,
    statusLabel: statusLabels[a.status] ?? a.status,
    condition: a.status === 'DAMAGED' ? 'DAMAGED' : a.status === 'UNDER_MAINTENANCE' ? 'NEED_CHECK' : 'GOOD',
    conditionLabel: a.status === 'DAMAGED' ? 'Hỏng' : a.status === 'UNDER_MAINTENANCE' ? 'Cần kiểm tra' : 'Tốt',
    purchaseCost: null,
    purchaseDate: null,
    warrantyExpiryDate: null,
    serialNumber: null,
    description: a.description ?? null,
    notes: null,
    createdAt: a.createdAt,
  };
}

export async function getMockAssetRecords(params?: Record<string, string | number | boolean | undefined>) {
  await delay();
  const p = params ?? {};
  const page = Number(p.page ?? 1);
  const pageSize = Number(p.pageSize ?? 10);
  const keyword = p.keyword ? String(p.keyword).toLowerCase() : '';
  const categoryId = p.categoryId ? String(p.categoryId) : '';
  const buildingId = p.buildingId ? String(p.buildingId) : '';
  const roomId = p.roomId ? String(p.roomId) : '';
  const status = p.status ? String(p.status) : '';
  let filtered = assets.filter(asset => {
    if (keyword && !asset.assetCode.toLowerCase().includes(keyword) && !asset.assetName.toLowerCase().includes(keyword)) return false;
    if (categoryId && String(asset.categoryId) !== categoryId && String(asset.category?.id) !== categoryId) return false;
    if (buildingId && String(asset.room?.floor?.building?.id) !== buildingId) return false;
    if (roomId && String(asset.roomId) !== roomId) return false;
    if (status && asset.status !== status) return false;
    return true;
  });
  const items = filtered.map(assetToRecord);
  return clone(buildPagination(items, page, pageSize));
}

export async function createMockAssetRecord(payload: {
  categoryId?: string | number;
  roomId?: string | number;
  assetCode?: string;
  assetName?: string;
  status?: string;
  description?: string | null;
  purchaseCost?: string | number | null;
  purchaseDate?: string | null;
  warrantyExpiryDate?: string | null;
  serialNumber?: string | null;
  notes?: string | null;
  buildingId?: string | number;
  supplierId?: string | number;
}) {
  await delay();
  const newId = assets.length + 1;
  const cat = categories.find(c => String(c.id) === String(payload.categoryId));
  const assetRoom = rooms.find(r => String(r.id) === String(payload.roomId));
  const asset: Asset = {
    id: newId,
    categoryId: cat?.id ?? 1,
    roomId: assetRoom?.id ?? null,
    assetCode: payload.assetCode ?? `TS-${String(newId).padStart(4, '0')}`,
    assetName: payload.assetName ?? 'Thiết bị mới',
    status: (payload.status ?? 'AVAILABLE') as Asset['status'],
    yearInUse: new Date().getFullYear(),
    description: payload.description ?? null,
    createdAt: new Date().toISOString(),
    category: cat,
    room: assetRoom ?? undefined,
  };
  assets.push(asset);
  return assetToRecord(asset);
}

export async function updateMockAssetRecord(id: string, payload: {
  assetCode?: string;
  assetName?: string;
  status?: string;
  description?: string | null;
  categoryId?: string | number;
  roomId?: string | number;
}) {
  await delay();
  const idx = assets.findIndex(a => String(a.id) === id);
  if (idx === -1) throw new Error('Asset not found');
  const existing = assets[idx];
  const updated: Asset = {
    ...existing,
    assetCode: payload.assetCode ?? existing.assetCode,
    assetName: payload.assetName ?? existing.assetName,
    status: (payload.status ?? existing.status) as Asset['status'],
    description: payload.description !== undefined ? payload.description : existing.description,
    updatedAt: new Date().toISOString(),
  };
  if (payload.categoryId) {
    const cat = categories.find(c => String(c.id) === String(payload.categoryId));
    if (cat) { updated.categoryId = cat.id; updated.category = cat; }
  }
  if (payload.roomId) {
    const assetRoom = rooms.find(r => String(r.id) === String(payload.roomId));
    if (assetRoom) { updated.roomId = assetRoom.id; updated.room = assetRoom; }
  }
  assets[idx] = updated;
  return assetToRecord(updated);
}

export async function deleteMockAssetRecord(id: string) {
  await delay(60);
  const idx = assets.findIndex(a => String(a.id) === id);
  if (idx >= 0) assets.splice(idx, 1);
  return { message: 'Deleted' };
}

// ========== BUILDING RECORDS (service-format) ==========

function buildingToRecord(b: SearchableBuilding) {
  const buildingRooms = rooms.filter(r => r.floor?.building?.id === b.id);
  const roomEntries = buildingRooms.map(r => ({
    id: String(r.id),
    code: r.roomCode,
    floorNumber: r.floor?.floorNumber ?? 1,
    beds: [{ id: String(r.id * 10 + 1), bedLabel: 'Giường 1' }],
    assignments: r.roomStudents?.map(s => ({ id: String(s.id) })) ?? [],
  }));
  return {
    id: String(b.id),
    code: b.code,
    name: b.name,
    genderZone: null,
    status: (b.status === 'Đang hoạt động' ? 'ACTIVE' : 'INACTIVE') as 'ACTIVE' | 'INACTIVE',
    description: b.description ?? null,
    rooms: roomEntries,
  };
}

export async function getMockBuildingRecords() {
  await delay();
  return clone(buildings.map(buildingToRecord));
}

export async function createMockBuildingRecord(payload: { code: string; name: string; genderZone?: string | null; status?: 'ACTIVE' | 'INACTIVE'; description?: string | null }) {
  await delay();
  const newId = buildings.length + 1;
  const b: SearchableBuilding = {
    id: newId,
    code: payload.code,
    name: payload.name,
    floors: 1,
    rooms: 0,
    status: payload.status === 'ACTIVE' ? 'Đang hoạt động' : 'Ngưng hoạt động',
    description: payload.description ?? '',
    createdAt: new Date().toISOString(),
  };
  buildings.push(b);
  return buildingToRecord(b);
}

export async function updateMockBuildingRecord(id: string, payload: { code?: string; name?: string; genderZone?: string | null; status?: 'ACTIVE' | 'INACTIVE'; description?: string | null }) {
  await delay();
  const idx = buildings.findIndex(b => String(b.id) === id);
  if (idx === -1) throw new Error('Building not found');
  const existing = buildings[idx];
  buildings[idx] = {
    ...existing,
    code: payload.code ?? existing.code,
    name: payload.name ?? existing.name,
    status: payload.status ? (payload.status === 'ACTIVE' ? 'Đang hoạt động' : 'Ngưng hoạt động') : existing.status,
    description: payload.description !== undefined ? (payload.description ?? '') : existing.description,
  };
  return buildingToRecord(buildings[idx]);
}

export async function deleteMockBuildingRecord(id: string) {
  await delay(60);
  const idx = buildings.findIndex(b => String(b.id) === id);
  if (idx >= 0) buildings.splice(idx, 1);
  return { message: 'Deleted' };
}

// ========== ROOM RECORDS (service-format) ==========

export async function getMockRoomRecords(params?: Record<string, string | number | boolean | undefined>) {
  await delay();
  const p = params ?? {};
  const buildingId = p.buildingId ? String(p.buildingId) : '';
  let filtered = rooms;
  if (buildingId) {
    filtered = filtered.filter(r => String(r.floor?.building?.id) === buildingId);
  }
  return clone(filtered.map(r => {
    const floor = r.floor;
    const building = floor?.building;
    return {
      id: String(r.id),
      code: r.roomCode,
      roomCode: r.roomCode,
      name: `Phòng ${r.roomCode}`,
      buildingId: String(building?.id ?? 1),
      buildingCode: building?.code ?? '',
      buildingName: building?.name ?? '',
      floorNumber: floor?.floorNumber ?? 1,
      capacity: r.capacity ?? 4,
      currentStudents: r.roomStudents?.filter(s => s.isActive).length ?? 0,
      roomType: null,
      areaM2: null,
      status: r.roomStudents && r.roomStudents.length > 0 ? 'Đang sử dụng' : 'Còn trống',
      statusLabel: r.roomStudents && r.roomStudents.length > 0 ? 'Đang sử dụng' : 'Còn trống',
      condition: 'Tốt',
      conditionLabel: 'Tốt',
    };
  }));
}
