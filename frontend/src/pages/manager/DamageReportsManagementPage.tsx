import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/auth-context';
import { apiClient } from '../../lib/axios';
import { getApiErrorMessage } from '../../lib/api-error';
import { formatDateTime } from '../../lib/format';
import { DamageReport, DamageReportPriority, DamageReportsResponse, DamageReportStatus } from '../../types/damage-reports';
import { Room } from '../../types/locations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { DamageReportPriorityBadge, DamageReportStatusBadge } from '../../components/damage-reports/DamageReportBadge';
import { PaginationBar } from '../../components/admin/PaginationBar';

export function DamageReportsManagementPage() {
  const { user } = useAuth();
  const basePath = user?.role === 'ADMIN' ? '/admin' : '/manager';
  const [reports, setReports] = useState<DamageReport[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [roomId, setRoomId] = useState('');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    void Promise.all([fetchRooms(), fetchReports(1)]);
  }, []);

  const fetchRooms = async () => {
    try {
      const response = await apiClient.get<Room[]>('/locations/rooms');
      setRooms(response.data);
    } catch (error) {
      console.error('Lỗi tải danh sách phòng:', error);
      setErrorMessage('Không thể tải danh sách phòng. Vui lòng làm mới trang.');
    }
  };

  const fetchReports = async (nextPage = page) => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await apiClient.get<DamageReportsResponse>('/damage-reports', {
        params: {
          page: nextPage,
          pageSize: 10,
          status: status || undefined,
          priority: priority || undefined,
          roomId: roomId || undefined,
          keyword: keyword || undefined,
        },
      });

      setReports(response.data.items);
      setPage(response.data.pagination.page);
      setTotalPages(response.data.pagination.totalPages);
      setTotal(response.data.pagination.total);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Không thể tải danh sách phiếu báo hỏng.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Quản lý Phiếu Báo hỏng</CardTitle>
          <CardDescription>
            Theo dõi tất cả báo cáo hư hỏng tài sản, phân loại, và cập nhật trạng thái xử lý.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 grid gap-4 md:grid-cols-5">
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm mã phiếu, tài sản..."
            />
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Tất cả trạng thái</option>
              {damageStatuses.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </Select>
            <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="">Tất cả ưu tiên</option>
              {damagePriorities.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </Select>
            <Select value={roomId} onChange={(e) => setRoomId(e.target.value)}>
              <option value="">Tất cả phòng</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>{room.roomCode}</option>
              ))}
            </Select>
            <Button onClick={() => void fetchReports(1)} className="w-full">
              Lọc dữ liệu
            </Button>
          </div>

          {errorMessage && (
            <div className="mb-4 rounded-md bg-destructive/15 p-4 text-sm font-medium text-destructive">
              {errorMessage}
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center p-8 text-muted-foreground animate-pulse">
              Đang tải dữ liệu...
            </div>
          ) : reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <svg className="mb-4 h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>Không tìm thấy phiếu báo hỏng phù hợp.</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Phiếu</TableHead>
                    <TableHead>Người báo</TableHead>
                    <TableHead>Phòng / Tài sản</TableHead>
                    <TableHead>Ưu tiên</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Cập nhật</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <p className="font-semibold">{report.reportCode}</p>
                      </TableCell>
                      <TableCell>
                        <p>{report.reporter?.fullName}</p>
                        <p className="text-xs text-muted-foreground">{report.reporter?.userCode}</p>
                      </TableCell>
                      <TableCell>
                        <p>{report.room?.roomCode}</p>
                        <p className="text-xs text-muted-foreground">{report.asset?.assetName}</p>
                      </TableCell>
                      <TableCell>
                        <DamageReportPriorityBadge priority={report.priority} />
                      </TableCell>
                      <TableCell>
                        <DamageReportStatusBadge status={report.status} />
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatDateTime(report.updatedAt ?? report.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link to={`${basePath}/damage-reports/${report.id}`}>
                          <Button variant="outline" size="sm">Xem</Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-4">
                <PaginationBar
                  page={page}
                  totalPages={totalPages}
                  total={total}
                  onPageChange={(next) => void fetchReports(next)}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const tabs: { label: string; values: DamageReportStatus[] | null }[] = [
  { label: 'Tất cả', values: null },
  {
    label: 'Cần tiếp nhận',
    values: ['SUBMITTED'],
  },
  {
    label: 'Đang xử lý',
    values: ['REVIEWING', 'APPROVED', 'IN_PROGRESS'],
  },
  {
    label: 'Hoàn tất',
    values: ['COMPLETED'],
  },
];

const damagePriorities: DamageReportPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

const inputClassName =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500';

const damageStatuses: DamageReportStatus[] = [
  'SUBMITTED',
  'REVIEWING',
  'APPROVED',
  'REJECTED',
  'IN_PROGRESS',
  'COMPLETED',
];
