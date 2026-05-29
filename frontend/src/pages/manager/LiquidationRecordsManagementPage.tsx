import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '../../auth/auth-context';
import { apiClient } from '../../lib/axios';
import { getApiErrorMessage } from '../../lib/api-error';
import { formatDate, formatDateTime } from '../../lib/format';
import { useToast } from '../../toast/toast-context';
import { Asset } from '../../types/assets';
import {
  LiquidationRecord,
  LiquidationRecordsResponse,
  LiquidationStatus,
} from '../../types/liquidation-records';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { PaginationBar } from '../../components/admin/PaginationBar';
import { Modal } from '../../components/ui/Modal';
import { CouncilMemberSelect, CouncilMemberState } from '../../components/council/CouncilMemberSelect';

const createSchema = z.object({
  assetId: z.coerce.number().int().positive(),
  liquidationDate: z.string().min(1, 'Vui lòng chọn ngày thanh lý.'),
  assetCondition: z.string().min(5, 'Mô tả tình trạng tối thiểu 5 ký tự.'),
  reason: z.string().min(10, 'Lý do thanh lý tối thiểu 10 ký tự.'),
  estimatedRemainingValue: z.coerce.number().min(0).optional(),
  note: z.string().optional(),
});

type CreateFormValues = z.infer<typeof createSchema>;

const statusOptions: LiquidationStatus[] = [
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'REJECTED',
  'COMPLETED',
  'CANCELLED',
];

export function LiquidationRecordsManagementPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const basePath = user?.role === 'ADMIN' ? '/admin' : '/manager';
  const [assets, setAssets] = useState<Asset[]>([]);
  const [records, setRecords] = useState<LiquidationRecord[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [roomFilter, setRoomFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [keyword, setKeyword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [members, setMembers] = useState<CouncilMemberState[]>([]);

  const createForm = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      assetId: 0,
      liquidationDate: new Date().toISOString().slice(0, 10),
      assetCondition: '',
      reason: '',
      estimatedRemainingValue: undefined,
      note: '',
    },
  });

  useEffect(() => {
    void loadAssets();
  }, []);

  useEffect(() => {
    void loadRecords(page);
  }, [page, statusFilter, roomFilter, categoryFilter, keyword]);

  async function loadAssets() {
    try {
      const response = await apiClient.get<{ items: Asset[] }>('/assets', {
        params: { page: 1, pageSize: 100 },
      });
      setAssets(response.data.items);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Không thể tải danh sách tài sản.'));
    }
  }

  async function loadRecords(nextPage = page) {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await apiClient.get<LiquidationRecordsResponse>('/liquidation-records', {
        params: {
          page: nextPage,
          pageSize: 10,
          status: statusFilter || undefined,
          roomId: roomFilter || undefined,
          categoryId: categoryFilter || undefined,
          keyword: keyword.trim() || undefined,
        },
      });

      setRecords(response.data.items);
      setPage(response.data.pagination.page);
      setTotalPages(response.data.pagination.totalPages);
      setTotal(response.data.pagination.total);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Không thể tải danh sách biên bản thanh lý.'));
    } finally {
      setIsLoading(false);
    }
  }

  const submitCreate = createForm.handleSubmit(async (values) => {
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await apiClient.post('/liquidation-records', {
        ...values,
        assetCondition: values.assetCondition.trim(),
        reason: values.reason.trim(),
        note: values.note?.trim() || undefined,
        members: members.length > 0 ? members.map(m => ({
          userId: m.user.id,
          roleInCouncil: m.roleInCouncil.trim()
        })) : undefined,
      });
      showToast('Tạo biên bản thanh lý thành công.');
      createForm.reset({
        assetId: 0,
        liquidationDate: new Date().toISOString().slice(0, 10),
        assetCondition: '',
        reason: '',
        estimatedRemainingValue: undefined,
        note: '',
      });
      setMembers([]);
      await loadAssets();
      await loadRecords(1);
      setPage(1);
      setIsModalOpen(false);
    } catch (error) {
      const message = getApiErrorMessage(error, 'Không thể tạo biên bản thanh lý.');
      setErrorMessage(message);
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  });

  const roomOptions = useMemo(
    () =>
      assets
        .filter((asset) => asset.room)
        .reduce<Array<{ id: number; label: string }>>((acc, asset) => {
          if (acc.some((item) => item.id === asset.room!.id)) return acc;
          acc.push({
            id: asset.room!.id,
            label: `${asset.room!.roomCode} - ${asset.room!.floor?.building?.name ?? 'Khu'}`,
          });
          return acc;
        }, [])
        .sort((left, right) => left.label.localeCompare(right.label)),
    [assets],
  );

  const categoryOptions = useMemo(
    () =>
      assets
        .reduce<Array<{ id: number; label: string }>>((acc, asset) => {
          const category = asset.category;
          if (!category) return acc;
          if (acc.some((item) => item.id === category.id)) return acc;
          acc.push({ id: category.id, label: category.name });
          return acc;
        }, [])
        .sort((left, right) => left.label.localeCompare(right.label)),
    [assets],
  );

  const getStatusVariant = (status: LiquidationStatus) => {
    switch (status) {
      case 'DRAFT': return 'secondary';
      case 'PENDING_APPROVAL': return 'warning';
      case 'APPROVED': 
      case 'COMPLETED': return 'success';
      case 'REJECTED': 
      case 'CANCELLED': return 'destructive';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Quản lý Thanh lý tài sản</h1>
          <p className="text-sm text-slate-500 mt-1">Theo dõi và tạo mới biên bản thanh lý cho thiết bị hư hỏng, hết khấu hao.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-slate-900 text-white hover:bg-slate-800 rounded-xl px-5 py-2 h-auto font-medium">
          + Tạo Biên bản Thanh lý
        </Button>
      </div>

      {errorMessage && (
        <div className="rounded-md bg-destructive/15 p-4 text-sm font-medium text-destructive">
          {errorMessage}
        </div>
      )}

      <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
        <CardContent className="p-4 bg-slate-50/50">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Trạng thái</label>
              <Select
                value={statusFilter}
                onChange={(e) => {
                  setPage(1);
                  setStatusFilter(e.target.value);
                }}
                className="bg-white"
              >
                <option value="">Tất cả</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Phòng</label>
              <Select
                value={roomFilter}
                onChange={(e) => {
                  setPage(1);
                  setRoomFilter(e.target.value);
                }}
                className="bg-white"
              >
                <option value="">Tất cả phòng</option>
                {roomOptions.map((room) => (
                  <option key={room.id} value={room.id}>{room.label}</option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Loại tài sản</label>
              <Select
                value={categoryFilter}
                onChange={(e) => {
                  setPage(1);
                  setCategoryFilter(e.target.value);
                }}
                className="bg-white"
              >
                <option value="">Tất cả loại</option>
                {categoryOptions.map((category) => (
                  <option key={category.id} value={category.id}>{category.label}</option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Từ khóa</label>
              <Input
                value={keyword}
                onChange={(e) => {
                  setPage(1);
                  setKeyword(e.target.value);
                }}
                placeholder="Mã biên bản, lý do..."
                className="bg-white"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-8 text-muted-foreground animate-pulse">
              Đang tải danh sách biên bản thanh lý...
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <svg className="mb-4 h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <p>Chưa có biên bản nào. Hãy tạo biên bản đầu tiên.</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Biên bản</TableHead>
                    <TableHead>Tài sản</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Tác vụ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <p className="font-semibold">{record.liquidationCode}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(record.liquidationDate)} - {record.createdByUser.fullName}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p>{record.liquidationItems[0]?.asset.assetCode} - {record.liquidationItems[0]?.asset.assetName}</p>
                        <p className="text-xs text-muted-foreground">
                          {record.liquidationItems[0]?.asset.room?.roomCode ?? '--'} / {record.liquidationItems[0]?.asset.category?.name}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(record.status)}>
                          {record.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link to={`${basePath}/liquidations/${record.id}`}>
                            <Button variant="outline" size="sm">Chi tiết</Button>
                          </Link>
                          <Link to={`${basePath}/liquidations/${record.id}/print`}>
                            <Button variant="secondary" size="sm">In phiếu</Button>
                          </Link>
                        </div>
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
                  onPageChange={(nextPage) => setPage(nextPage)}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Tạo Biên bản Thanh lý"
        size="lg"
      >
        <p className="text-sm text-slate-500 mb-4">Tài sản được chọn sẽ được chuyển sang trạng thái chờ thanh lý sau khi tạo biên bản.</p>
        <form id="create-liquidation-form" className="space-y-4" onSubmit={submitCreate}>
          <div className="space-y-2">
            <label className="text-sm font-medium">Tài sản cần thanh lý</label>
            <Select {...createForm.register('assetId', { valueAsNumber: true })} error={!!createForm.formState.errors.assetId}>
              <option value={0}>-- Chọn tài sản --</option>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.assetCode} - {asset.assetName}
                </option>
              ))}
            </Select>
            {createForm.formState.errors.assetId && <p className="text-xs text-destructive">{createForm.formState.errors.assetId.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Ngày thanh lý</label>
            <Input type="date" {...createForm.register('liquidationDate')} error={!!createForm.formState.errors.liquidationDate} />
            {createForm.formState.errors.liquidationDate && <p className="text-xs text-destructive">{createForm.formState.errors.liquidationDate.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Tình trạng tài sản</label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Mô tả tình trạng hư hỏng hiện tại..."
              {...createForm.register('assetCondition')}
            />
            {createForm.formState.errors.assetCondition && <p className="text-xs text-destructive">{createForm.formState.errors.assetCondition.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Lý do thanh lý</label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Lý do đề xuất thanh lý..."
              {...createForm.register('reason')}
            />
            {createForm.formState.errors.reason && <p className="text-xs text-destructive">{createForm.formState.errors.reason.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Giá trị còn lại ước tính (VNĐ)</label>
            <Input
              type="number"
              min={0}
              step="1000"
              placeholder="VD: 50000"
              {...createForm.register('estimatedRemainingValue', { valueAsNumber: true })}
            />
          </div>

          <div className="space-y-2 border-t pt-4">
            <h3 className="text-sm font-medium">Hội đồng thanh lý (Tùy chọn)</h3>
            <p className="text-sm text-slate-500 mb-4">Bạn có thể chọn hội đồng ngay bây giờ hoặc cập nhật sau khi tạo phiếu.</p>
            <CouncilMemberSelect 
              members={members} 
              onChange={setMembers} 
              disabled={isSubmitting} 
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Đang tạo...' : 'Tạo biên bản'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
