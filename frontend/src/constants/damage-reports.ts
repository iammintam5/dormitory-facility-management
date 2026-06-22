// Enum for damage report status - must match Backend Prisma schema
export const DAMAGE_REPORT_STATUS = {
  SUBMITTED: 'SUBMITTED',
  REVIEWING: 'REVIEWING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
} as const;

export type DamageReportStatusType = typeof DAMAGE_REPORT_STATUS[keyof typeof DAMAGE_REPORT_STATUS];

// Status color mapping for UI display
export const STATUS_COLOR_MAP: Record<DamageReportStatusType, string> = {
  [DAMAGE_REPORT_STATUS.SUBMITTED]: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  [DAMAGE_REPORT_STATUS.REVIEWING]: 'bg-blue-50 text-blue-700 border-blue-200',
  [DAMAGE_REPORT_STATUS.APPROVED]: 'bg-green-50 text-green-700 border-green-200',
  [DAMAGE_REPORT_STATUS.REJECTED]: 'bg-red-50 text-red-700 border-red-200',
  [DAMAGE_REPORT_STATUS.IN_PROGRESS]: 'bg-purple-50 text-purple-700 border-purple-200',
  [DAMAGE_REPORT_STATUS.COMPLETED]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

// Status label mapping for Vietnamese display
export const STATUS_LABEL_MAP: Record<DamageReportStatusType, string> = {
  [DAMAGE_REPORT_STATUS.SUBMITTED]: 'Chờ xử lý',
  [DAMAGE_REPORT_STATUS.REVIEWING]: 'Đang kiểm tra',
  [DAMAGE_REPORT_STATUS.APPROVED]: 'Được duyệt',
  [DAMAGE_REPORT_STATUS.REJECTED]: 'Từ chối',
  [DAMAGE_REPORT_STATUS.IN_PROGRESS]: 'Đang xử lý',
  [DAMAGE_REPORT_STATUS.COMPLETED]: 'Hoàn thành',
};
