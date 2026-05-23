import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/auth-context';
import { apiClient } from '../../lib/axios';
import { getApiErrorMessage } from '../../lib/api-error';
import { formatDate, formatDateTime } from '../../lib/format';
import {
  InventoryCheck,
  InventoryChecksResponse,
  InventoryCheckStatus,
} from '../../types/inventory-checks';
import { Room } from '../../types/locations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { PaginationBar } from '../../components/admin/PaginationBar';

export function InventoryChecksManagementPage() {
  const { user } = useAuth();
  const basePath = user?.role === 'ADMIN' ? '/admin' : '/manager';
  const [items, setItems] = useState<InventoryCheck[]>([]);
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
    void Promise.all([fetchRooms(), fetchInventoryChecks(1)]);
  }, []);

  const fetchRooms = async () => {
    const response = await apiClient.get<Room[]>('/locations/rooms');
    setRooms(response.data);
  };

  const fetchInventoryChecks = async (nextPage = page) => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await apiClient.get<InventoryChecksResponse>('/inventory-checks', {
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
      setErrorMessage(getApiErrorMessage(error, 'Không thể tải danh sách phiếu kiểm kê.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Quản lý Phiếu Kiểm kê</CardTitle>
            <CardDescription>
              Theo dõi phiếu kiểm kê theo phòng, cập nhật kết quả và xuất biểu mẫu.
            </CardDescription>
          </div>
          <Link to={`${basePath}/inventory-checks/new`}>
            <Button>Tạo phiếu mới</Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="mb-6 grid gap-4 md:grid-cols-4">
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm mã phiếu, ghi chú..."
            />
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Tất cả trạng thái</option>
              {inventoryStatuses.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </Select>
            <Select value={roomId} onChange={(e) => setRoomId(e.target.value)}>
              <option value="">Tất cả phòng</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>{room.roomCode}</option>
              ))}
            </Select>
            <Button onClick={() => void fetchInventoryChecks(1)} variant="secondary">
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
              Đang tải danh sách phiếu kiểm kê...
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <svg className="mb-4 h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <p>Chưa có phiếu kiểm kê nào.</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã phiếu</TableHead>
                    <TableHead>Phòng / Người kiểm kê</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Chênh lệch</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((inventoryCheck) => {
                    const differenceCount = inventoryCheck.inventoryCheckItems.filter(
                      (item) => item.difference !== 0,
                    ).length;

                    return (
                      <TableRow key={inventoryCheck.id}>
                        <TableCell>
                          <p className="font-semibold">{inventoryCheck.inventoryCode}</p>
                          <p className="text-xs text-muted-foreground">
                            Ngày: {formatDate(inventoryCheck.checkDate)}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p>{inventoryCheck.room?.roomCode ?? '--'}</p>
                          <p className="text-xs text-muted-foreground">
                            {inventoryCheck.checkedByUser.fullName}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge variant={inventoryCheck.status === 'COMPLETED' ? 'success' : 'secondary'}>
                            {inventoryCheck.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {differenceCount > 0 ? (
                            <Badge variant="warning">{differenceCount} item chênh lệch</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Khớp hệ thống</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Link to={`${basePath}/inventory-checks/${inventoryCheck.id}`}>
                              <Button variant="outline" size="sm">Xem</Button>
                            </Link>
                            <Link to={`${basePath}/inventory-checks/${inventoryCheck.id}/print`}>
                              <Button variant="secondary" size="sm">In phiếu</Button>
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <div className="mt-4">
                <PaginationBar
                  page={page}
                  totalPages={totalPages}
                  total={total}
                  onPageChange={(next) => void fetchInventoryChecks(next)}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// In the new unified enum, this might be 'DRAFT' | 'COMPLETED'
const inventoryStatuses: InventoryCheckStatus[] = ['DRAFT', 'COMPLETED'];
