import { useEffect, useMemo, useState } from 'react';
import { formatDateTime } from '../../lib/date';
import { getApiErrorMessage } from '../../lib/api-client';
import { getAuditLogDetail, getAuditLogs, type AuditLogItem } from '../../services/audit-logs';
import { useToast } from '../../toast/toast-context';

import { 
  ArrowsClockwise,
  Eye,
  Spinner
} from '@phosphor-icons/react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { PageHeader } from '../../components/ui/PageHeader';
import { SkeletonTable } from '../../components/ui/Skeleton';
import { Pagination } from '../../components/ui/Pagination';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { SearchInput } from '../../components/ui/SearchInput';
import { FilterBar } from '../../components/ui/FilterBar';
import { RowActionsMenu } from '../../components/ui/RowActionsMenu';
import { MobileDataCard, DataLabel } from '../../components/ui/MobileDataCard';
import { useDebounce } from '../../hooks/useDebounce';

type AuditLogRow = AuditLogItem & {
  actorLabel: string;
  roleLabel: string;
  actionLabel: string;
};

export function AuditLogsPage() {
  const { showToast } = useToast();
  const [keyword, setKeyword] = useState('');
  const debouncedKeyword = useDebounce(keyword, 400);
  const [action, setAction] = useState('ALL');
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  useEffect(() => {
    async function loadLogs() {
      setIsLoading(true);
      try {
        const response = await getAuditLogs({
          keyword: debouncedKeyword || undefined,
          action: action === 'ALL' ? undefined : action,
          page: pagination.page,
          pageSize: pagination.pageSize,
        });

        setLogs(response.items.map(mapAuditLog));
        setPagination(response.pagination);
      } catch (error) {
        showToast(getApiErrorMessage(error, 'Không thể tải nhật ký hệ thống.'), 'error');
      } finally {
        setIsLoading(false);
      }
    }

    void loadLogs();
  }, [action, debouncedKeyword, pagination.page, pagination.pageSize, showToast]);

  const totalLabel = useMemo(() => {
    if (pagination.total === 0) return 'Không có kết quả';
    const from = (pagination.page - 1) * pagination.pageSize + 1;
    const to = Math.min(pagination.page * pagination.pageSize, pagination.total);
    return `Hiển thị ${from} đến ${to} của ${pagination.total} kết quả`;
  }, [pagination]);

  const openDetail = async (id: string) => {
    setIsDetailLoading(true);
    try {
      const detail = await getAuditLogDetail(id);
      setSelectedLog(detail);
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Không thể tải chi tiết audit log.'), 'error');
    } finally {
      setIsDetailLoading(false);
    }
  };

  const closeDetail = () => setSelectedLog(null);

  return (
    <div className="space-y-6 mx-auto max-w-7xl pb-10">
      <PageHeader 
        title="Nhật ký hệ thống" 
        description="Theo dõi các hoạt động, thay đổi trong hệ thống của người dùng."
      />

      <FilterBar 
        searchNode={
          <SearchInput
            value={keyword}
            onChange={setKeyword}
            placeholder="Tìm theo entity hoặc nội dung..."
            aria-label="Tìm kiếm nhật ký"
          />
        }
        filterNode={
          <Select
            value={action}
            onChange={(e) => {
              setPagination(p => ({ ...p, page: 1 }));
              setAction(e.target.value);
            }}
            aria-label="Lọc theo hành động"
          >
            <option value="ALL">Tất cả hành động</option>
            {auditActionOptions.map((option) => (
              <option key={option} value={option}>
                {actionLabel[option] ?? option}
              </option>
            ))}
          </Select>
        }
        appliedFilterCount={[
          action !== 'ALL' ? action : ''
        ].filter(Boolean).length}
        onResetFilters={() => {
          setKeyword('');
          setAction('ALL');
        }}
        filterChips={[
          ...(action !== 'ALL' ? [{ id: 'action', label: `Hành động: ${actionLabel[action] ?? action}`, onRemove: () => setAction('ALL') }] : []),
        ]}
      />

      <Card className="border-border/50 overflow-hidden">
        {isLoading ? (
          <div className="px-5 py-4">
            <SkeletonTable rows={10} cols={6} />
          </div>
        ) : (
          <div className="flex flex-col">
              {logs.length === 0 ? (
                <div className="p-10">
                  <EmptyState 
                    title="Không tìm thấy nhật ký" 
                    description="Chưa có bản ghi nhật ký nào phù hợp với bộ lọc hiện tại."
                  />
                </div>
              ) : (
                <>
                  <div className="hidden md:block">
                    <Table aria-label="Danh sách nhật ký">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16 text-center">STT</TableHead>
                          <TableHead>Thời gian</TableHead>
                          <TableHead>Người thực hiện</TableHead>
                          <TableHead>Vai trò</TableHead>
                          <TableHead>Hành động</TableHead>
                          <TableHead>Đối tượng</TableHead>
                          <TableHead>Nội dung</TableHead>
                          <TableHead>IP</TableHead>
                          <TableHead className="text-center w-24">Thao tác</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {logs.map((log, idx) => (
                          <TableRow key={log.id}>
                            <TableCell className="text-center font-medium text-muted-foreground">
                              {(pagination.page - 1) * pagination.pageSize + idx + 1}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-muted-foreground">
                              {formatDateTime(log.createdAt)}
                            </TableCell>
                            <TableCell className="font-semibold text-foreground">{log.actorLabel}</TableCell>
                            <TableCell className="text-muted-foreground">{log.roleLabel}</TableCell>
                            <TableCell>
                              <span className="inline-flex rounded px-2.5 py-0.5 text-[11px] font-semibold bg-blue-50 text-blue-600">
                                {log.actionLabel}
                              </span>
                            </TableCell>
                            <TableCell className="font-medium text-foreground whitespace-nowrap">
                              {log.entityType}
                            </TableCell>
                            <TableCell className="max-w-[250px] truncate text-muted-foreground">
                              {log.content || '--'}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                              {formatIp(log.ipAddress)}
                            </TableCell>
                            <TableCell className="text-center">
                              <RowActionsMenu
                                ariaLabel={`Xem nhật ký`}
                                actions={[
                                  { id: 'view', label: 'Xem chi tiết', icon: <Eye size={16} />, onClick: () => openDetail(log.id) }
                                ]}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="md:hidden flex flex-col gap-3 p-3">
                    {logs.map((log) => (
                      <MobileDataCard
                        key={log.id}
                        title={log.actorLabel}
                        subtitle={formatDateTime(log.createdAt)}
                        statusBadge={
                          <span className="inline-flex rounded px-2 py-1 text-[11px] font-bold bg-blue-50 text-blue-600">
                            {log.actionLabel}
                          </span>
                        }
                        actionMenu={
                          <RowActionsMenu
                            ariaLabel={`Xem nhật ký`}
                            actions={[
                              { id: 'view', label: 'Xem chi tiết', icon: <Eye size={16} />, onClick: () => openDetail(log.id) }
                            ]}
                          />
                        }
                      >
                        <DataLabel label="Vai trò" value={log.roleLabel} />
                        <DataLabel label="Đối tượng" value={log.entityType} />
                        <DataLabel label="IP" value={formatIp(log.ipAddress)} />
                      </MobileDataCard>
                    ))}
                  </div>
                </>
              )}
          </div>
        )}

        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          pageSize={pagination.pageSize}
          onPageChange={(p) => setPagination(prev => ({ ...prev, page: p }))}
          onPageSizeChange={(s) => setPagination(prev => ({ ...prev, pageSize: s, page: 1 }))}
          label={totalLabel}
        />
      </Card>

      <Modal isOpen={Boolean(selectedLog)} onClose={closeDetail} title="Chi tiết nhật ký" size="2xl">
        {selectedLog && (
          <div className="space-y-5">
            <div className="grid gap-3 md:grid-cols-2">
              <DetailRow label="Thời gian" value={formatDateTime(selectedLog.createdAt)} />
              <DetailRow label="IP" value={formatIp(selectedLog.ipAddress)} mono />
              <DetailRow label="Người thực hiện" value={formatActor(selectedLog)} />
              <DetailRow label="Vai trò" value={roleLabel[selectedLog.actorRole] ?? selectedLog.actorRole ?? '--'} />
              <DetailRow label="Hành động" value={actionLabel[selectedLog.action] ?? selectedLog.action} />
              <DetailRow
                label="Đối tượng"
                value={`${selectedLog.entityType}${selectedLog.entityId ? ` #${selectedLog.entityId}` : ''}`}
              />
            </div>

            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nội dung</p>
              <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm leading-relaxed text-foreground">
                {selectedLog.content || '--'}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <AuditValueBlock label="Giá trị cũ" value={selectedLog.oldValue} />
              <AuditValueBlock label="Giá trị mới" value={selectedLog.newValue} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function mapAuditLog(item: AuditLogItem): AuditLogRow {
  return {
    ...item,
    actorLabel: formatActor(item),
    roleLabel: roleLabel[item.actorRole] ?? item.actorRole ?? '--',
    actionLabel: actionLabel[item.action] ?? item.action,
  };
}

function formatActor(item: AuditLogItem) {
  if (item.actorName && item.actorUsername) return `${item.actorName} (${item.actorUsername})`;
  if (item.actorName) return item.actorName;
  if (item.actorUsername) return item.actorUsername;
  if (item.actorUserId) return `#${item.actorUserId}`;
  return 'Hệ thống';
}

function formatIp(ipAddress?: string | null) {
  return ipAddress?.trim() || 'Chưa ghi nhận';
}

function formatAuditValue(value?: string | null) {
  if (!value) return '--';
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-background p-3">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`break-words text-sm font-semibold text-foreground ${mono ? 'font-mono' : ''}`}>{value || '--'}</p>
    </div>
  );
}

function AuditValueBlock({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <pre className="max-h-64 overflow-auto rounded-lg border border-border/60 bg-card p-3 text-xs leading-relaxed text-slate-100">
        {formatAuditValue(value)}
      </pre>
    </div>
  );
}

const auditActionOptions = [
  'LOGIN',
  'LOGOUT',
  'CREATE_USER',
  'UPDATE_USER',
  'LOCK_USER',
  'UNLOCK_USER',
  'RESET_PASSWORD',
  'CHANGE_PASSWORD',
  'CREATE',
  'UPDATE',
  'LOCK',
  'UNLOCK',
];

const roleLabel: Record<string, string> = {
  ADMIN: 'Admin',
  MANAGER: 'Quản lý CSVC',
  STUDENT: 'Sinh viên',
};

const actionLabel: Record<string, string> = {
  LOGIN: 'Đăng nhập',
  LOGOUT: 'Đăng xuất',
  LOCK: 'Khóa',
  UNLOCK: 'Mở khóa',
  RESET_PASSWORD: 'Đặt lại mật khẩu',
  CREATE: 'Tạo mới',
  UPDATE: 'Cập nhật',
  CREATE_USER: 'Tạo tài khoản',
  UPDATE_USER: 'Cập nhật tài khoản',
  LOCK_USER: 'Khóa tài khoản',
  UNLOCK_USER: 'Mở khóa tài khoản',
  CHANGE_PASSWORD: 'Đổi mật khẩu',
};
