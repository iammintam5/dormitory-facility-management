import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../../auth/auth-context';
import { apiClient } from '../../lib/axios';
import { getApiErrorMessage } from '../../lib/api-error';
import { formatDate, formatDateTime } from '../../lib/format';
import { useToast } from '../../toast/toast-context';
import { Asset } from '../../types/assets';
import {
  DueAssetsResponse,
  MaintenancePlan,
  MaintenancePlansResponse,
  MaintenanceRecord,
  MaintenanceRecordsResponse,
} from '../../types/maintenance';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { PaginationBar } from '../../components/admin/PaginationBar';

const planSchema = z.object({
  assetId: z.coerce.number().int().positive(),
  cycleMonths: z.coerce.number().int().min(1),
  nextDueDate: z.string().min(1, 'Vui lòng chọn ngày đến hạn.'),
  isActive: z.boolean(),
  note: z.string().optional(),
});

type PlanFormValues = z.infer<typeof planSchema>;

export function MaintenanceManagementPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const basePath = user?.role === 'ADMIN' ? '/admin' : '/manager';
  const [assets, setAssets] = useState<Asset[]>([]);
  const [plans, setPlans] = useState<MaintenancePlan[]>([]);
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [dueAssets, setDueAssets] = useState<DueAssetsResponse | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<MaintenancePlan | null>(null);
  const [planPage, setPlanPage] = useState(1);
  const [planTotalPages, setPlanTotalPages] = useState(1);
  const [planTotal, setPlanTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const planForm = useForm<PlanFormValues>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      assetId: 0,
      cycleMonths: 3,
      nextDueDate: '',
      isActive: true,
      note: '',
    },
  });

  useEffect(() => {
    void loadAll();
  }, []);

  const loadAll = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const [assetsResponse, plansResponse, dueResponse, recordsResponse] = await Promise.all([
        apiClient.get<{ items: Asset[] }>('/assets', {
          params: { page: 1, pageSize: 100 },
        }),
        apiClient.get<MaintenancePlansResponse>('/maintenance/plans', {
          params: { page: 1, pageSize: 10 },
        }),
        apiClient.get<DueAssetsResponse>('/maintenance/due-assets', {
          params: { days: 14 },
        }),
        apiClient.get<MaintenanceRecordsResponse>('/maintenance/records', {
          params: { page: 1, pageSize: 6 },
        }),
      ]);

      setAssets(assetsResponse.data.items);
      setPlans(plansResponse.data.items);
      setPlanPage(plansResponse.data.pagination.page);
      setPlanTotalPages(plansResponse.data.pagination.totalPages);
      setPlanTotal(plansResponse.data.pagination.total);
      setDueAssets(dueResponse.data);
      setRecords(recordsResponse.data.items);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Không thể tải dữ liệu bảo trì.'));
    } finally {
      setIsLoading(false);
    }
  };

  const loadPlans = async (nextPage = planPage) => {
    const response = await apiClient.get<MaintenancePlansResponse>('/maintenance/plans', {
      params: { page: nextPage, pageSize: 10 },
    });

    setPlans(response.data.items);
    setPlanPage(response.data.pagination.page);
    setPlanTotalPages(response.data.pagination.totalPages);
    setPlanTotal(response.data.pagination.total);
  };

  const submitPlan = planForm.handleSubmit(async (values) => {
    setIsSavingPlan(true);
    setErrorMessage('');

    try {
      if (selectedPlan) {
        await apiClient.patch(`/maintenance/plans/${selectedPlan.id}`, values);
        showToast('Cập nhật kế hoạch bảo trì thành công.');
      } else {
        await apiClient.post('/maintenance/plans', values);
        showToast('Tạo kế hoạch bảo trì thành công.');
      }

      planForm.reset({
        assetId: 0,
        cycleMonths: 3,
        nextDueDate: '',
        isActive: true,
        note: '',
      });
      setSelectedPlan(null);
      await loadAll();
    } catch (error) {
      const message = getApiErrorMessage(error, 'Không thể lưu kế hoạch bảo trì.');
      setErrorMessage(message);
      showToast(message, 'error');
    } finally {
      setIsSavingPlan(false);
    }
  });

  const handleEditPlan = (plan: MaintenancePlan) => {
    setSelectedPlan(plan);
    planForm.reset({
      assetId: plan.assetId,
      cycleMonths: plan.cycleMonths,
      nextDueDate: plan.nextDueDate.slice(0, 10),
      isActive: plan.isActive,
      note: plan.note ?? '',
    });
  };

  const cancelEdit = () => {
    setSelectedPlan(null);
    planForm.reset({
      assetId: 0,
      cycleMonths: 3,
      nextDueDate: '',
      isActive: true,
      note: '',
    });
  };

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div className="rounded-md bg-destructive/15 p-4 text-sm font-medium text-destructive">
          {errorMessage}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center p-8 text-muted-foreground animate-pulse">
          Đang tải dữ liệu bảo trì...
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Đến hạn trong 14 ngày</CardTitle>
                <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-500">{dueAssets?.summary.dueSoonCount ?? 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Quá hạn bảo trì</CardTitle>
                <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{dueAssets?.summary.overdueCount ?? 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Lịch sử gần đây</CardTitle>
                <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{records.length}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <Card>
              <CardHeader>
                <CardTitle>{selectedPlan ? 'Cập nhật kế hoạch bảo trì' : 'Tạo kế hoạch bảo trì'}</CardTitle>
                <CardDescription>Mỗi tài sản chỉ nên có một kế hoạch bảo trì đang hoạt động.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={submitPlan}>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tài sản</label>
                    <Select {...planForm.register('assetId', { valueAsNumber: true })} error={!!planForm.formState.errors.assetId}>
                      <option value={0}>Chọn tài sản</option>
                      {assets.map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {asset.assetCode} - {asset.assetName}
                        </option>
                      ))}
                    </Select>
                    {planForm.formState.errors.assetId && <p className="text-xs text-destructive">{planForm.formState.errors.assetId.message}</p>}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Chu kỳ (tháng)</label>
                      <Input type="number" min={1} {...planForm.register('cycleMonths', { valueAsNumber: true })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Ngày đến hạn tiếp theo</label>
                      <Input type="date" {...planForm.register('nextDueDate')} />
                      {planForm.formState.errors.nextDueDate && <p className="text-xs text-destructive">{planForm.formState.errors.nextDueDate.message}</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Ghi chú</label>
                    <textarea
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      {...planForm.register('note')}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="isActive" className="rounded border-gray-300" {...planForm.register('isActive')} />
                    <label htmlFor="isActive" className="text-sm font-medium">Đang hoạt động</label>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button type="submit" disabled={isSavingPlan} className="flex-1">
                      {isSavingPlan ? 'Đang lưu...' : selectedPlan ? 'Cập nhật' : 'Tạo mới'}
                    </Button>
                    {selectedPlan && (
                      <Button type="button" variant="outline" onClick={cancelEdit}>
                        Hủy
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tài sản đến hạn bảo trì</CardTitle>
                <CardDescription>Tài sản đã quá hạn hoặc đến hạn trong 14 ngày tới.</CardDescription>
              </CardHeader>
              <CardContent>
                {!dueAssets || dueAssets.items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                    <p>Hệ thống hiện không có tài sản nào cần bảo trì gấp.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {dueAssets.items.map((plan) => {
                      const isOverdue = new Date(plan.nextDueDate) < new Date();
                      return (
                        <div
                          key={plan.id}
                          className={`flex items-center justify-between rounded-lg border p-4 ${
                            isOverdue ? 'border-destructive/30 bg-destructive/10' : 'border-amber-500/30 bg-amber-500/10'
                          }`}
                        >
                          <div>
                            <p className="font-semibold">{plan.asset.assetCode} - {plan.asset.assetName}</p>
                            <p className="text-sm text-muted-foreground">Đến hạn: {formatDate(plan.nextDueDate)}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleEditPlan(plan)}>Sửa</Button>
                            <Link to={`${basePath}/maintenance/assets/${plan.assetId}/history`}>
                              <Button variant="secondary" size="sm">Lịch sử</Button>
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Danh sách kế hoạch bảo trì</CardTitle>
              <CardDescription>Theo dõi các kế hoạch đang hoạt động và xem nhanh lịch sử.</CardDescription>
            </CardHeader>
            <CardContent>
              {plans.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Chưa có kế hoạch bảo trì nào được tạo.</div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tài sản</TableHead>
                        <TableHead>Chu kỳ / Đến hạn</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead className="text-right">Lịch sử</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {plans.map((plan) => (
                        <TableRow key={plan.id}>
                          <TableCell>
                            <p className="font-semibold">{plan.asset.assetCode} - {plan.asset.assetName}</p>
                            <p className="text-xs text-muted-foreground">Tạo bởi {plan.createdByUser.fullName}</p>
                          </TableCell>
                          <TableCell>
                            <p>{plan.cycleMonths} tháng</p>
                            <p className="text-xs text-muted-foreground">{formatDate(plan.nextDueDate)}</p>
                          </TableCell>
                          <TableCell>
                            <Badge variant={plan.isActive ? 'success' : 'secondary'}>
                              {plan.isActive ? 'Đang hoạt động' : 'Ngừng'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleEditPlan(plan)}>Sửa</Button>
                              <Link to={`${basePath}/maintenance/assets/${plan.assetId}/history`}>
                                <Button variant="secondary" size="sm">Lịch sử</Button>
                              </Link>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="mt-4">
                    <PaginationBar
                      page={planPage}
                      totalPages={planTotalPages}
                      total={planTotal}
                      onPageChange={(next) => void loadPlans(next)}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Phiếu bảo trì gần đây</CardTitle>
                <CardDescription>Xem lại các biên bản bảo trì tài sản mới được ghi nhận.</CardDescription>
              </div>
              <Link to={`${basePath}/maintenance/records/new`}>
                <Button>Tạo phiếu bảo trì</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {records.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Chưa có phiếu bảo trì nào.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Phiếu bảo trì</TableHead>
                      <TableHead>Tài sản</TableHead>
                      <TableHead>Kết quả</TableHead>
                      <TableHead className="text-right">Tác vụ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <p className="font-semibold">{record.maintenanceCode}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(record.maintenanceDate)} - {record.maintenanceType}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{record.asset.assetName}</p>
                          <p className="text-xs text-muted-foreground">{record.asset.assetCode}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{record.resultStatus}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Link to={`${basePath}/maintenance/assets/${record.assetId}/history`}>
                              <Button variant="outline" size="sm">Lịch sử</Button>
                            </Link>
                            <Link to={`${basePath}/maintenance/records/${record.id}/print`}>
                              <Button variant="secondary" size="sm">In phiếu</Button>
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
