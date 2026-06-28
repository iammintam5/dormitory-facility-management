import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { PageHeader } from '../../components/ui/PageHeader';
import { useAuth } from '../../auth/auth-context';
import { createMaintenanceRecord, getMaintenancePlans } from '../../services/maintenance';
import { getDamageReportById } from '../../services/damage-reports';
import { getAssets } from '../../services/assets';
import { useToast } from '../../toast/toast-context';
import { Asset } from '../../types/assets';
import { DamageReport } from '../../types/damage-reports';
import { MaintenancePlan, MaintenanceResultStatus, MaintenanceType } from '../../types/maintenance';
import { FloppyDisk, CaretLeft } from '@phosphor-icons/react';

const recordSchema = z.object({
  planId: z.coerce.number().optional(),
  damageReportId: z.coerce.number().optional(),
  inventoryItemId: z.coerce.number().optional(),
  assetId: z.coerce.number().int().positive(),
  maintenanceDate: z.string().min(1, 'Vui lòng chọn ngày bảo trì.'),
  maintenanceType: z.enum(['SCHEDULED', 'AD_HOC', 'AFTER_INVENTORY']),
  content: z.string().min(1, 'Nội dung không được để trống.'),
  resultStatus: z.enum(['GOOD', 'RECOMMEND_LIQUIDATION']),
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
  const [damageReport, setDamageReport] = useState<DamageReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [searchParams] = useSearchParams();
  const damageReportIdStr = searchParams.get('damageReportId');
  const inventoryItemIdStr = searchParams.get('inventoryItemId');
  const assetIdStr = searchParams.get('assetId');

  const form = useForm<RecordFormValues>({
    resolver: zodResolver(recordSchema),
    defaultValues: {
      planId: undefined,
      damageReportId: damageReportIdStr ? parseInt(damageReportIdStr) : undefined,
      inventoryItemId: inventoryItemIdStr ? parseInt(inventoryItemIdStr) : undefined,
      assetId: assetIdStr ? parseInt(assetIdStr) : 0,
      maintenanceDate: new Date().toISOString().slice(0, 10),
      maintenanceType: damageReportIdStr ? 'AD_HOC' : inventoryItemIdStr ? 'AFTER_INVENTORY' : 'SCHEDULED',
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

  async function loadLookups() {
    setIsLoading(true);
    try {
      const promises: any[] = [getAssets({ pageSize: 100 }), getMaintenancePlans()];
      if (damageReportIdStr) {
        promises.push(getDamageReportById(parseInt(damageReportIdStr)));
      }
      
      const results = await Promise.all(promises);
      const assetResponse = results[0];
      const planList = results[1];
      const report = results[2];

      setAssets(assetResponse.items.map((a: any) => ({ id: parseInt(a.id), categoryId: 1, assetCode: a.assetCode, assetName: a.assetName, status: a.status, description: a.description, yearInUse: null, createdAt: a.createdAt })));
      setPlans(planList);

      if (report) {
        setDamageReport(report);
        form.setValue('content', `Xử lý sự cố: ${report.description}`);
      }
    } catch (error) {
      showToast('Không thể tải dữ liệu tạo phiếu bảo trì.', 'error');
    } finally {
      setIsLoading(false);
    }
  }

  const onSubmit = async (values: RecordFormValues) => {
    setIsSubmitting(true);
    try {
      const response = await createMaintenanceRecord({
        ...values,
        planId: values.planId || undefined,
        damageReportId: values.damageReportId || undefined,
        inventoryItemId: values.inventoryItemId || undefined,
        nextMaintenanceDate: values.nextMaintenanceDate || undefined,
        cost: Number.isNaN(values.cost) ? undefined : values.cost,
        materialNote: values.materialNote?.trim() || undefined,
        note: values.note?.trim() || undefined,
      });
      showToast('Tạo phiếu bảo trì thành công.', 'success');
      navigate(`${basePath}/maintenance`);
    } catch (error) {
      showToast('Không thể tạo phiếu bảo trì.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onError = (errors: any) => {
    console.log('Form validation errors:', errors);
    showToast('Lỗi nhập liệu: ' + Object.keys(errors).join(', '), 'error');
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      <PageHeader 
        title="Tạo phiếu bảo trì" 
        breadcrumbs={[
          { label: 'Nghiệp vụ', href: '#' },
          { label: 'Bảo trì', href: `${basePath}/maintenance` },
          { label: 'Tạo phiếu mới' }
        ]}
      />

      <Card className="border-border/50">
        <CardContent className="p-6">
          <div className="mb-6 pb-4 border-b border-border/50">
            <p className="text-sm text-muted-foreground">Ghi nhận kết quả bảo trì theo kế hoạch hoặc phát sinh đột xuất.</p>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm">Đang tải dữ liệu...</p>
            </div>
          ) : (
            <form className="grid gap-6 xl:grid-cols-2" onSubmit={form.handleSubmit(onSubmit, onError)}>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Tài sản <span className="text-destructive">*</span></label>
                <Select {...form.register('assetId', { valueAsNumber: true })} className={assetIdStr ? "pointer-events-none opacity-60 bg-muted" : ""} tabIndex={assetIdStr ? -1 : 0}>
                  <option value={0}>-- Chọn tài sản --</option>
                  {assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.assetCode} - {asset.assetName}</option>)}
                </Select>
                {form.formState.errors.assetId && <p className="text-xs text-destructive mt-1">{form.formState.errors.assetId.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Kế hoạch bảo trì</label>
                <Select {...form.register('planId')} className={damageReportIdStr ? "pointer-events-none opacity-60 bg-muted" : ""} tabIndex={damageReportIdStr ? -1 : 0}>
                  <option value="">Không gắn kế hoạch</option>
                  {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.asset.assetCode} - đến hạn {plan.nextDueDate.slice(0, 10)}</option>)}
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Ngày bảo trì <span className="text-destructive">*</span></label>
                <Input type="date" {...form.register('maintenanceDate')} />
                {form.formState.errors.maintenanceDate && <p className="text-xs text-destructive mt-1">{form.formState.errors.maintenanceDate.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Loại bảo trì <span className="text-destructive">*</span></label>
                <Select {...form.register('maintenanceType')}>
                  {maintenanceTypes.map((item) => <option key={item} value={item}>{translateMaintenanceType(item)}</option>)}
                </Select>
              </div>

              <div className="space-y-1.5 xl:col-span-2">
                <label className="text-xs font-semibold text-muted-foreground">Nội dung thực hiện <span className="text-destructive">*</span></label>
                <textarea 
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none" 
                  placeholder="Mô tả chi tiết các công việc đã thực hiện..."
                  {...form.register('content')} 
                />
                {form.formState.errors.content && <p className="text-xs text-destructive mt-1">{form.formState.errors.content.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Kết quả <span className="text-destructive">*</span></label>
                <Select {...form.register('resultStatus')}>
                  {resultStatuses.map((item) => <option key={item} value={item}>{translateResultStatus(item)}</option>)}
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Ngày bảo trì tiếp theo</label>
                <Input type="date" {...form.register('nextMaintenanceDate')} />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Chi phí (VNĐ)</label>
                <Input type="number" min={0} placeholder="VD: 500000" {...form.register('cost', { valueAsNumber: true })} />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Vật tư / ghi chú kỹ thuật</label>
                <Input placeholder="Các vật tư đã sử dụng hoặc cần lưu ý" {...form.register('materialNote')} />
              </div>

              <div className="space-y-1.5 xl:col-span-2">
                <label className="text-xs font-semibold text-muted-foreground">Ghi chú chung</label>
                <textarea 
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none" 
                  placeholder="Thông tin bổ sung khác..."
                  {...form.register('note')} 
                />
              </div>

              <div className="flex items-center gap-3 xl:col-span-2 pt-6 mt-2 border-t border-border/50">
                <Button type="submit" disabled={isSubmitting} className="w-40 gap-2">
                  <FloppyDisk size={16} weight="bold" />
                  {isSubmitting ? 'Đang tạo...' : 'Tạo phiếu bảo trì'}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate(`${basePath}/maintenance`)} className="gap-2">
                  <CaretLeft size={16} weight="bold" />
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
const resultStatuses: MaintenanceResultStatus[] = ['GOOD', 'RECOMMEND_LIQUIDATION'];

function translateMaintenanceType(type: MaintenanceType) {
  switch (type) {
    case 'SCHEDULED': return 'Định kỳ';
    case 'AD_HOC': return 'Đột xuất';
    case 'AFTER_INVENTORY': return 'Sau kiểm kê';
    default: return type;
  }
}

function translateResultStatus(status: MaintenanceResultStatus) {
  switch (status) {
    case 'GOOD': return 'Tốt';
    case 'RECOMMEND_LIQUIDATION': return 'Đề nghị thanh lý';
    default: return status;
  }
}
