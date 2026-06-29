import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { PageHeader } from '../../components/ui/PageHeader';
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter } from '../../components/ui/Modal';
import { useAuth } from '../../auth/auth-context';
import { createMaintenanceRecord, createDirectCompletedRecord } from '../../services/maintenance';
import { getDamageReportById } from '../../services/damage-reports';
import { getAssets } from '../../services/assets';
import { useToast } from '../../toast/toast-context';
import { Asset } from '../../types/assets';
import { DamageReport } from '../../types/damage-reports';
import { FloppyDisk, CaretLeft, Printer, CheckCircle } from '@phosphor-icons/react';
import { useReactToPrint } from 'react-to-print';

const recordSchema = z.object({
  damageReportId: z.coerce.number().optional(),

  assetId: z.coerce.number().int().positive(),
  maintenanceDate: z.string().min(1, 'Vui lòng chọn ngày bảo trì.'),
  maintenanceType: z.literal('AD_HOC'),
  content: z.string().min(1, 'Nội dung không được để trống.'),
  resultStatus: z.enum(['GOOD', 'RECOMMEND_LIQUIDATION']).optional(),
  note: z.string().optional(),
});

type RecordFormValues = z.infer<typeof recordSchema>;

export function MaintenanceRecordCreatePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const basePath = user?.role === 'ADMIN' ? '/admin' : '/manager';
  
  const [assets, setAssets] = useState<Asset[]>([]);
  const [damageReport, setDamageReport] = useState<DamageReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdRecord, setCreatedRecord] = useState<any>(null);

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });

  const [searchParams] = useSearchParams();
  const damageReportIdStr = searchParams.get('damageReportId');
  const isDirectCompleteMode = !!damageReportIdStr;

  const assetIdStr = searchParams.get('assetId');

  const form = useForm<RecordFormValues>({
    resolver: zodResolver(recordSchema),
    defaultValues: {
      damageReportId: damageReportIdStr ? parseInt(damageReportIdStr) : undefined,

      assetId: assetIdStr ? parseInt(assetIdStr) : 0,
      maintenanceDate: new Date().toISOString().slice(0, 10),
      maintenanceType: 'AD_HOC',
      content: '',
      resultStatus: 'GOOD',
      note: '',
    },
  });

  useEffect(() => {
    void loadLookups();
  }, []);

  async function loadLookups() {
    setIsLoading(true);
    try {
      const promises: any[] = [getAssets({ pageSize: 100 })];
      if (damageReportIdStr) {
        promises.push(getDamageReportById(parseInt(damageReportIdStr)));
      }
      
      const results = await Promise.all(promises);
      const assetResponse = results[0];
      const report = results[1];

      setAssets(assetResponse.items.map((a: any) => ({ id: parseInt(a.id), categoryId: 1, assetCode: a.assetCode, assetName: a.assetName, status: a.status, description: a.description, yearInUse: null, createdAt: a.createdAt })));

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
      if (isDirectCompleteMode) {
        const response = await createDirectCompletedRecord({
          damageReportId: values.damageReportId!,
          maintenanceDate: values.maintenanceDate,
          content: values.content,
          resultStatus: values.resultStatus || 'GOOD',
          note: values.note?.trim() || undefined,
        });
        showToast('Nghiệm thu và tạo phiếu bảo trì thành công.', 'success');
        setCreatedRecord(response);
      } else {
        await createMaintenanceRecord({
          ...values,
          damageReportId: values.damageReportId || undefined,
          note: values.note?.trim() || undefined,
        });
        showToast('Tạo phiếu bảo trì thành công.', 'success');
        navigate(`${basePath}/maintenance`);
      }
    } catch (error) {
      showToast('Thao tác thất bại.', 'error');
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
                <label className="text-xs font-semibold text-muted-foreground">Ngày bảo trì <span className="text-destructive">*</span></label>
                <Input type="date" {...form.register('maintenanceDate')} />
                {form.formState.errors.maintenanceDate && <p className="text-xs text-destructive mt-1">{form.formState.errors.maintenanceDate.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Loại bảo trì <span className="text-destructive">*</span></label>
                <Input value="Sửa chữa phát sinh" disabled />
                <input type="hidden" {...form.register('maintenanceType')} value="AD_HOC" />
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

              <div className="space-y-1.5 xl:col-span-2">
                <label className="text-xs font-semibold text-muted-foreground">Ghi chú chung</label>
                <textarea 
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none" 
                  placeholder="Thông tin bổ sung khác..."
                  {...form.register('note')} 
                  
                />
              </div>

              {isDirectCompleteMode && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Kết quả <span className="text-destructive">*</span></label>
                    <Select {...form.register('resultStatus')} required>
                      <option value="GOOD">Tốt (Đã sửa xong)</option>
                      <option value="RECOMMEND_LIQUIDATION">Đề nghị thanh lý (Hỏng nặng)</option>
                    </Select>
                  </div>
                </>
              )}

              <div className="flex items-center gap-3 xl:col-span-2 pt-6 mt-2 border-t border-border/50">
                <Button type="submit" disabled={isSubmitting} className="w-44 gap-2">
                  <FloppyDisk size={16} weight="bold" />
                  {isSubmitting ? 'Đang lưu...' : (isDirectCompleteMode ? 'Nghiệm thu & Lưu' : 'Tạo phiếu bảo trì')}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate(isDirectCompleteMode ? `${basePath}/damage-reports` : `${basePath}/maintenance`)} className="gap-2">
                  <CaretLeft size={16} weight="bold" />
                  Quay lại
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Modal in phiếu */}
      <Modal isOpen={!!createdRecord} onClose={() => navigate(`${basePath}/damage-reports`)} size="md">
        <ModalHeader onClose={() => navigate(`${basePath}/damage-reports`)}>
          <ModalTitle className="flex items-center gap-2 text-emerald-600">
            <CheckCircle size={24} weight="fill" />
            Nghiệm thu thành công
          </ModalTitle>
        </ModalHeader>
        <ModalBody className="space-y-4">
          <p className="text-sm">Phiếu sửa chữa thiết bị đã được lưu thành công vào hệ thống. Bạn có muốn in phiếu nghiệm thu bàn giao này không?</p>
          
          {/* Printable Template (hidden from screen, used by react-to-print) */}
          <div className="hidden">
            <div ref={printRef} className="p-8 text-black bg-white font-sans text-sm space-y-6" style={{ width: '210mm', minHeight: '297mm' }}>
              <div className="flex justify-between items-start border-b border-gray-300 pb-4">
                <div>
                  <p className="text-sm font-bold">Bộ Khoa học và Công nghệ</p>
                  <p className="text-sm font-bold">Học viện Công nghệ Bưu chính Viễn thông</p>
                  <p className="text-sm font-bold">Cơ sở tại Thành phố Hồ Chí Minh</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold">Mẫu số: QL_BM3</p>
                  <p className="text-xs text-gray-500">Mã phiếu: {createdRecord?.maintenanceCode}</p>
                </div>
              </div>

              <div className="text-center my-6">
                <h1 className="text-xl font-bold uppercase tracking-wider">BIÊN BẢN NGHIỆM THU SỬA CHỮA</h1>
                <p className="text-xs italic text-gray-500 mt-1">Ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}</p>
              </div>

              <div className="space-y-3 text-black">
                <div className="grid grid-cols-2 gap-4">
                  <p><strong>Thiết bị sửa chữa:</strong> {createdRecord?.asset?.assetName} ({createdRecord?.asset?.assetCode})</p>
                  <p><strong>Vị trí (Phòng):</strong> {damageReport?.room?.roomCode || 'Kho trung tâm'}</p>
                </div>
                <p><strong>Ngày thực hiện:</strong> {createdRecord?.maintenanceDate ? new Date(createdRecord?.maintenanceDate).toLocaleDateString('vi-VN') : ''}</p>
                <div>
                  <p><strong>Nội dung công việc:</strong> {createdRecord?.content}</p>
                </div>
                <p><strong>Kết quả nghiệm thu:</strong> {createdRecord?.resultStatus === 'GOOD' ? 'Tốt (Đã sửa xong)' : 'Đề nghị thanh lý (Hỏng nặng)'}</p>
                {createdRecord?.note && (
                  <div>
                    <p><strong>Ghi chú bổ sung:</strong> {createdRecord?.note}</p>
                  </div>
                )}
              </div>

              <div className="pt-12 grid grid-cols-2 text-center gap-12 text-black">
                <div>
                  <p className="font-semibold">Đại diện bộ phận nghiệm thu</p>
                  <p className="text-xs text-gray-400 italic mt-1">(Ký và ghi rõ họ tên)</p>
                  <div className="h-20"></div>
                  <p className="font-semibold">{user?.fullName}</p>
                </div>
                <div>
                  <p className="font-semibold">Người thực hiện sửa chữa</p>
                  <p className="text-xs text-gray-400 italic mt-1">(Ký và ghi rõ họ tên)</p>
                  <div className="h-20"></div>
                  <p className="border-b border-dashed border-gray-300 w-32 mx-auto mt-12"></p>
                </div>
              </div>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => navigate(`${basePath}/damage-reports`)}>Đóng & Quay lại</Button>
          <Button onClick={handlePrint} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
            <Printer size={16} />
            In phiếu PDF
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

