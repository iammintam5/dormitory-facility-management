import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../../auth/auth-context';
import { apiClient } from '../../lib/axios';
import { getApiErrorMessage } from '../../lib/api-error';
import { useToast } from '../../toast/toast-context';
import { Asset } from '../../types/assets';
import { MaintenancePlan, MaintenanceRecord, MaintenanceResultStatus, MaintenanceType } from '../../types/maintenance';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';

const recordSchema = z.object({
  planId: z.coerce.number().optional(),
  assetId: z.coerce.number().int().positive(),
  maintenanceDate: z.string().min(1, 'Vui lòng chọn ngày bảo trì.'),
  maintenanceType: z.enum(['SCHEDULED', 'AD_HOC', 'AFTER_INVENTORY']),
  content: z.string().min(1, 'Nội dung không được để trống.'),
  resultStatus: z.enum(['GOOD', 'NEED_MONITORING', 'NEED_REPAIR', 'RECOMMEND_LIQUIDATION']),
  nextMaintenanceDate: z.string().optional(),
  cost: z.union([z.coerce.number().min(0), z.nan()]).optional(),
  materialNote: z.string().optional(),
  note: z.string().optional(),
});

type RecordFormValues = z.infer<typeof recordSchema>;

export function MaintenanceRecordCreatePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const basePath = user?.role === 'ADMIN' ? '/admin' : '/manager';
  const [assets, setAssets] = useState<Asset[]>([]);
  const [plans, setPlans] = useState<MaintenancePlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const form = useForm<RecordFormValues>({
    resolver: zodResolver(recordSchema),
    defaultValues: {
      planId: undefined,
      assetId: 0,
      maintenanceDate: new Date().toISOString().slice(0, 10),
      maintenanceType: 'SCHEDULED',
      content: '',
      resultStatus: 'GOOD',
      nextMaintenanceDate: '',
      materialNote: '',
      note: '',
    },
  });

  useEffect(() => {
    void loadLookups();
  }, []);

  const loadLookups = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const [assetsResponse, plansResponse] = await Promise.all([
        apiClient.get<{ items: Asset[] }>('/assets', { params: { page: 1, pageSize: 100 } }),
        apiClient.get<{ items: MaintenancePlan[] }>('/maintenance/plans', {
          params: { page: 1, pageSize: 100, isActive: true },
        }),
      ]);
      setAssets(assetsResponse.data.items);
      setPlans(plansResponse.data.items);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Không thể tải dữ liệu tạo phiếu bảo trì.'));
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = form.handleSubmit(async (values) => {
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = await apiClient.post<MaintenanceRecord>('/maintenance/records', {
        ...values,
        planId: values.planId || undefined,
        nextMaintenanceDate: values.nextMaintenanceDate || undefined,
        cost: Number.isNaN(values.cost) ? undefined : values.cost,
        materialNote: values.materialNote?.trim() || undefined,
        note: values.note?.trim() || undefined,
      });

      showToast('Tạo phiếu bảo trì thành công.');
      navigate(`${basePath}/maintenance/records/${response.data.id}/print`);
    } catch (error) {
      const message = getApiErrorMessage(error, 'Không thể tạo phiếu bảo trì.');
      setErrorMessage(message);
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tạo phiếu bảo trì</CardTitle>
          <CardDescription>
            Ghi nhận kết quả bảo trì theo kế hoạch hoặc phát sinh đột xuất.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {errorMessage && (
            <div className="mb-4 rounded-md bg-destructive/15 p-4 text-sm font-medium text-destructive">
              {errorMessage}
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-12 text-muted-foreground animate-pulse">
              Đang tải dữ liệu...
            </div>
          ) : (
            <form className="grid gap-6 xl:grid-cols-2" onSubmit={onSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tài sản</label>
                <Select {...form.register('assetId', { valueAsNumber: true })} error={!!form.formState.errors.assetId}>
                  <option value={0}>Chọn tài sản</option>
                  {assets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.assetCode} - {asset.assetName}
                    </option>
                  ))}
                </Select>
                {form.formState.errors.assetId && <p className="text-xs text-destructive">{form.formState.errors.assetId.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Kế hoạch bảo trì (nếu có)</label>
                <Select {...form.register('planId', { valueAsNumber: true })}>
                  <option value="">Không gắn kế hoạch</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.asset.assetCode} - đến hạn {plan.nextDueDate.slice(0, 10)}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Ngày bảo trì</label>
                <Input type="date" {...form.register('maintenanceDate')} error={!!form.formState.errors.maintenanceDate} />
                {form.formState.errors.maintenanceDate && <p className="text-xs text-destructive">{form.formState.errors.maintenanceDate.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Loại bảo trì</label>
                <Select {...form.register('maintenanceType')}>
                  {maintenanceTypes.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2 xl:col-span-2">
                <label className="text-sm font-medium">Nội dung thực hiện</label>
                <textarea
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  {...form.register('content')}
                />
                {form.formState.errors.content && <p className="text-xs text-destructive">{form.formState.errors.content.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Kết quả</label>
                <Select {...form.register('resultStatus')}>
                  {resultStatuses.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Ngày bảo trì tiếp theo (dự kiến)</label>
                <Input type="date" {...form.register('nextMaintenanceDate')} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Chi phí (VNĐ)</label>
                <Input type="number" min={0} {...form.register('cost', { valueAsNumber: true })} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Vật tư / Ghi chú kỹ thuật</label>
                <Input {...form.register('materialNote')} />
              </div>

              <div className="space-y-2 xl:col-span-2">
                <label className="text-sm font-medium">Ghi chú chung</label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  {...form.register('note')}
                />
              </div>

              <div className="flex gap-4 xl:col-span-2 pt-4">
                <Button type="submit" disabled={isSubmitting} className="w-40">
                  {isSubmitting ? 'Đang tạo...' : 'Tạo phiếu bảo trì'}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate(`${basePath}/maintenance`)}>
                  Quay lại
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const maintenanceTypes: MaintenanceType[] = ['SCHEDULED', 'AD_HOC', 'AFTER_INVENTORY'];
const resultStatuses: MaintenanceResultStatus[] = [
  'GOOD',
  'NEED_MONITORING',
  'NEED_REPAIR',
  'RECOMMEND_LIQUIDATION',
];
