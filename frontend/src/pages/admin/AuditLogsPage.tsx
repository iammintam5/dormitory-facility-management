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
import { Pagination } from '../../components/ui/Pagination';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../components/ui/Table';

type AuditLogRow = AuditLogItem & {
  actorLabel: string;
  roleLabel: string;
  actionLabel: string;
};

export function AuditLogsPage() {
  const { showToast } = useToast();
  const [keyword, setKeyword] = useState('');
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

  useEffect(() => {
    async function loadLogs() {
      setIsLoading(true);
      try {
        const response = await getAuditLogs({
          keyword: keyword || undefined,
          action: action === 'ALL' ? undefined : action,
          page,
          pageSize: 10,
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
  }, [action, keyword, page, showToast]);

  const totalLabel = useMemo(() => {
    if (pagination.total === 0) return 'Không có kết quả';
    const from = (pagination.page - 1) * pagination.pageSize + 1;
    const to = Math.min(pagination.page * pagination.pageSize, pagination.total);
    return `Hiển thị ${from} đến ${to} của ${pagination.total} kết quả`;
  }, [pagination]);

  const openDetail = async (id: string) => {
    try {
      const detail = await getAuditLogDetail(id);
      window.alert(
        [
          `Hành động: ${detail.action}`,
          `Đối tượng: ${detail.entityType}`,
          `Nội dung: ${detail.content || '--'}`,
          `Thời gian: ${formatDateTime(detail.createdAt)}`,
          `IP: ${detail.ipAddress ?? '--'}`,
        ].join('\n'),
      );
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Không thể tải chi tiết audit log.'), 'error');
    }
  };

  return (
    <div className="space-y-6 mx-auto max-w-7xl pb-10">
      <PageHeader 
        title="Nhật ký hệ thống" 
        description="Theo dõi các hoạt động, thay đổi trong hệ thống của người dùng."
      />

      <Card className="border-border/50">
        <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-end">
          <div className="flex-1 min-w-[220px]">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Tìm kiếm</label>
            <Input
              value={keyword}
              onChange={(e) => {
                setPage(1);
                setKeyword(e.target.value);
              }}
              placeholder="Tìm theo entity hoặc nội dung..."
            />
          </div>

          <div className="w-full md:w-[200px]">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Hành động</label>
            <Select
              value={action}
              onChange={(e) => {
                setPage(1);
                setAction(e.target.value);
              }}
            >
              <option value="ALL">Tất cả</option>
              <option value="LOGIN">LOGIN</option>
              <option value="LOGOUT">LOGOUT</option>
              <option value="LOCK">LOCK</option>
              <option value="UNLOCK">UNLOCK</option>
              <option value="RESET_PASSWORD">RESET_PASSWORD</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
            </Select>
          </div>

          <div className="flex w-full md:w-auto">
            <Button
              variant="outline"
              onClick={() => {
                setKeyword('');
                setAction('ALL');
                setPage(1);
              }}
              className="gap-2 w-full md:w-auto"
            >
              <ArrowsClockwise size={16} weight="bold" />
              Làm mới
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size={32} className="animate-spin text-primary" />
          </div>
        ) : (
          <Table>
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
                <TableHead className="text-center">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                    Chưa có dữ liệu audit log.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log, index) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-center font-medium text-muted-foreground">
                      {(pagination.page - 1) * pagination.pageSize + index + 1}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDateTime(log.createdAt)}
                    </TableCell>
                    <TableCell className="font-semibold text-foreground">{log.actorLabel}</TableCell>
                    <TableCell className="text-muted-foreground">{log.roleLabel}</TableCell>
                    <TableCell>
                      <span className="inline-flex rounded px-2 py-1 text-[11px] font-bold bg-blue-50 text-blue-600">
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
                      {log.ipAddress ?? '--'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => void openDetail(log.id)}
                        title="Xem chi tiết"
                      >
                        <Eye size={16} className="text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}

        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          pageSize={pagination.pageSize}
          onPageChange={(p) => { setPage(p); }}
          label={totalLabel}
        />
      </Card>
    </div>
  );
}

function mapAuditLog(item: AuditLogItem): AuditLogRow {
  return {
    ...item,
    actorLabel: item.actorUserId,
    roleLabel: item.actorRole,
    actionLabel: item.action,
  };
}
