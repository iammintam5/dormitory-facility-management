import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/auth-context';
import { apiClient } from '../../lib/axios';
import { getApiErrorMessage } from '../../lib/api-error';
import { formatDate, formatDateTime } from '../../lib/format';
import { Handover, HandoversResponse, HandoverStatus } from '../../types/handovers';
import { Room } from '../../types/locations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { PaginationBar } from '../../components/admin/PaginationBar';

export function HandoversManagementPage() {
  const { user } = useAuth();
  const basePath = user?.role === 'ADMIN' ? '/admin' : '/manager';
  const [items, setItems] = useState<Handover[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [status, setStatus] = useState('');
  const [roomId, setRoomId] = useState('');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    void Promise.all([fetchRooms(), fetchHandovers(1)]);
  }, []);

  const fetchRooms = async () => {
    const response = await apiClient.get<Room[]>('/locations/rooms');
    setRooms(response.data);
  };

  const fetchHandovers = async (nextPage = page) => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await apiClient.get<HandoversResponse>('/handovers', {
        params: {
          page: nextPage,
          pageSize: 10,
          status: status || undefined,
          roomId: roomId || undefined,
          keyword: keyword || undefined,
        },
      });

      setItems(response.data.items);
      setPage(response.data.pagination.page);
      setTotalPages(response.data.pagination.totalPages);
      setTotal(response.data.pagination.total);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Không thể tải danh sách biên bản bàn giao.'));
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'secondary';
      case 'PENDING': return 'warning';
      case 'APPROVED':
      case 'COMPLETED': return 'success';
      case 'REJECTED': return 'destructive';
      case 'CANCELLED': return 'outline';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Biên bản Bàn giao</CardTitle>
            <CardDescription>
              Theo dõi toàn bộ biên bản bàn giao tài sản cho sinh viên, tạo mới và in ấn.
            </CardDescription>
          </div>
          <Link to={`${basePath}/handovers/new`}>
            <Button>Tạo biên bản mới</Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="mb-6 grid gap-4 md:grid-cols-4">
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm mã biên bản, phòng, sinh viên..."
            />
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Tất cả trạng thái</option>
              {handoverStatuses.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </Select>
            <Select value={roomId} onChange={(e) => setRoomId(e.target.value)}>
              <option value="">Tất cả phòng</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>{room.roomCode}</option>
              ))}
            </Select>
            <Button onClick={() => void fetchHandovers(1)} variant="secondary">
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
              Đang tải danh sách biên bản...
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <svg className="mb-4 h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <p>Chưa có biên bản bàn giao nào phù hợp.</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Biên bản</TableHead>
                    <TableHead>Sinh viên</TableHead>
                    <TableHead>Phòng / Ngày lập</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Tài sản</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((handover) => (
                    <TableRow key={handover.id}>
                      <TableCell>
                        <p className="font-semibold">{handover.handoverCode}</p>
                        <p className="text-xs text-muted-foreground">
                          Cập nhật: {formatDateTime(handover.updatedAt ?? handover.createdAt)}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p>{handover.student.fullName}</p>
                        <p className="text-xs text-muted-foreground">{handover.student.userCode}</p>
                      </TableCell>
                      <TableCell>
                        <p>{handover.room.roomCode}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(handover.handoverDate)}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(handover.status)}>
                          {handover.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{handover.handoverItems.length}</TableCell>
                      <TableCell className="text-right">
                        <Link to={`${basePath}/handovers/${handover.id}`}>
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
                  onPageChange={(next) => void fetchHandovers(next)}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const handoverStatuses: string[] = [
  'DRAFT',
  'PENDING',
  'APPROVED',
  'REJECTED',
  'COMPLETED',
  'CANCELLED',
];
