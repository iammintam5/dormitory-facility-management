import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useToast } from '../../toast/toast-context';

import { getDamageReports, createDamageReport, acceptDamageReport, rejectDamageReport, startProcessingReport, completeReport, cancelReport } from '../../services/damage-reports';
import { getApiErrorMessage } from '../../lib/api-client';
import { DamageReport, DamageReportPriority } from '../../types/damage-reports';
import { getBuildings, getRooms, BuildingRecord, RoomRecord } from '../../services/locations';
import { getAssets, AssetRecord } from '../../services/assets';

import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select as UISelect } from '../../components/ui/Select';
import { PageHeader } from '../../components/ui/PageHeader';
import { Pagination } from '../../components/ui/Pagination';
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter } from '../../components/ui/Modal';
import { 
  Plus, 
  Funnel, 
  ArrowsClockwise, 
  WarningCircle, 
  Clock, 
  Wrench, 
  CheckCircle, 
  Check, 
  Play, 
  X,
  MagnifyingGlass 
} from '@phosphor-icons/react';

const reportSchema = z.object({
  source: z.enum(['Sinh viên', 'Cán bộ CSVC']).default('Sinh viên'),
  reporter: z.string().optional(),
  reporterId: z.string().optional(), 
  
  buildingCode: z.string().min(1, 'Chọn khu nhà.'),
  roomId: z.string().min(1, 'Chọn phòng.'),
  location: z.string().optional(),
  
  assetId: z.string().min(1, 'Chọn thiết bị.'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  
  description: z.string().min(1, 'Nhập mô tả chi tiết.'),
});

type ReportFormValues = z.infer<typeof reportSchema>;

export function DamageReportsManagementPage() {
  const { showToast } = useToast();
  
  const [reports, setReports] = useState<DamageReport[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
  
  const [buildings, setBuildings] = useState<BuildingRecord[]>([]);
  const [rooms, setRooms] = useState<RoomRecord[]>([]);
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  
  // Filters
  const [keyword, setKeyword] = useState('');
  const [filterBuilding, setFilterBuilding] = useState('');
  const [filterRoom, setFilterRoom] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      source: 'Cán bộ CSVC',
      reporter: '',
      reporterId: '',
      buildingCode: '',
      roomId: '',
      location: '',
      assetId: '',
      priority: 'MEDIUM',
      description: '',
    },
  });

  const selectedBuildingId = form.watch('buildingCode');
  const selectedRoomId = form.watch('roomId');

  const loadReports = useCallback(async () => {
    setIsFetching(true);
    try {
      const res = await getDamageReports({
        page: pagination.page,
        pageSize: pagination.pageSize,
        keyword: keyword || undefined,
        buildingId: filterBuilding || undefined,
        roomId: filterRoom || undefined,
        priority: filterPriority || undefined,
        status: filterStatus || undefined,
      });
      setReports(res.items);
      setPagination(res.pagination);
    } catch (e) {
      showToast('Lỗi khi tải danh sách báo hỏng', 'error');
    } finally {
      setIsFetching(false);
    }
  }, [pagination.page, pagination.pageSize, keyword, filterBuilding, filterRoom, filterPriority, filterStatus, showToast]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  useEffect(() => {
    Promise.all([
      getBuildings(),
      getRooms()
    ]).then(([blds, rms]) => {
      setBuildings(blds);
      setRooms(rms);
    }).catch(() => {
      // Ignore
    });
  }, []);

  useEffect(() => {
    if (selectedRoomId) {
      getAssets({ roomId: selectedRoomId, pageSize: 100 }).then(res => {
        setAssets(res.items);
      }).catch(() => {});
    } else {
      setAssets([]);
    }
  }, [selectedRoomId]);

  const openAddModal = () => {
    form.reset({
      source: 'Cán bộ CSVC',
      reporter: '',
      reporterId: '',
      buildingCode: '',
      roomId: '',
      location: '',
      assetId: '',
      priority: 'MEDIUM',
      description: '',
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: ReportFormValues) => {
    setIsLoading(true);
    try {
      await createDamageReport({
        roomId: data.roomId,
        assetId: data.assetId,
        priority: data.priority as DamageReportPriority,
        description: data.description,
      });
      showToast('Tiếp nhận báo hỏng thành công.', 'success');
      setIsModalOpen(false);
      loadReports();
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Lưu thông tin thất bại.'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (reportId: number, action: 'accept' | 'reject' | 'start' | 'complete' | 'cancel') => {
    try {
      if (action === 'accept') await acceptDamageReport(reportId);
      if (action === 'reject') await rejectDamageReport(reportId);
      if (action === 'start') await startProcessingReport(reportId);
      if (action === 'complete') await completeReport(reportId);
      if (action === 'cancel') await cancelReport(reportId);
      showToast('Cập nhật trạng thái thành công', 'success');
      loadReports();
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Thao tác thất bại'), 'error');
    }
  };

  const renderPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT': return <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-700">Khẩn cấp</span>;
      case 'HIGH': return <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-bold bg-orange-100 text-orange-700">Cao</span>;
      case 'MEDIUM': return <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-700">Trung bình</span>;
      case 'LOW': return <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-700">Thấp</span>;
      default: return null;
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED': return <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-bold bg-muted text-muted-foreground">Đã gửi</span>;
      case 'REVIEWING': return <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-700">Chờ xử lý</span>;
      case 'APPROVED': return <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-700">Đã duyệt</span>;
      case 'IN_PROGRESS': return <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-700">Đang sửa</span>;
      case 'COMPLETED': return <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-700">Hoàn thành</span>;
      case 'REJECTED': 
      case 'CANCELLED': return <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-bold bg-destructive/10 text-destructive">Đã hủy/Từ chối</span>;
      default: return <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-bold bg-muted text-muted-foreground">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 mx-auto max-w-7xl pb-10">
      <PageHeader 
        title="Báo hỏng" 
        breadcrumbs={[
          { label: 'Nghiệp vụ', href: '#' },
          { label: 'Báo hỏng' }
        ]}
        actions={
          <Button onClick={openAddModal} className="gap-2">
            <Plus size={16} weight="bold" />
            Tiếp nhận báo hỏng
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0">
              <WarningCircle size={24} weight="duotone" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-0.5">Tổng báo hỏng</p>
              <div className="flex items-baseline gap-1">
                <p className="text-2xl font-bold text-foreground">{pagination.total}</p>
                <span className="text-xs text-muted-foreground">yêu cầu</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
              <Clock size={24} weight="duotone" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-0.5">Chờ xử lý / Đã gửi</p>
              <p className="text-2xl font-bold text-foreground">
                {reports.filter(r => ['SUBMITTED', 'REVIEWING', 'APPROVED'].includes(r.status)).length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-600 shrink-0">
              <Wrench size={24} weight="duotone" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-0.5">Đang sửa</p>
              <p className="text-2xl font-bold text-foreground">
                {reports.filter(r => r.status === 'IN_PROGRESS').length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle size={24} weight="duotone" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-0.5">Hoàn thành</p>
              <p className="text-2xl font-bold text-foreground">
                {reports.filter(r => r.status === 'COMPLETED').length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-5 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Tìm kiếm</label>
            <div className="relative">
              <Input 
                placeholder="Mã BH, người báo..." 
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="pl-9"
              />
              <MagnifyingGlass size={16} className="absolute left-3 top-2.5 text-muted-foreground" />
            </div>
          </div>
          <div className="w-full md:w-32">
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Khu nhà</label>
            <UISelect 
              value={filterBuilding}
              onChange={(e) => {
                setFilterBuilding(e.target.value);
                setFilterRoom('');
              }}
            >
              <option value="">Tất cả</option>
              {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </UISelect>
          </div>
          <div className="w-full md:w-32">
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Phòng</label>
            <UISelect 
              value={filterRoom}
              onChange={(e) => setFilterRoom(e.target.value)}
            >
              <option value="">Tất cả</option>
              {rooms.filter(r => !filterBuilding || r.buildingId === filterBuilding).map(r => <option key={r.id} value={r.id}>{r.roomCode}</option>)}
            </UISelect>
          </div>
          <div className="w-full md:w-36">
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Mức độ</label>
            <UISelect value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
              <option value="">Tất cả</option>
              <option value="LOW">Thấp</option>
              <option value="MEDIUM">Trung bình</option>
              <option value="HIGH">Cao</option>
              <option value="URGENT">Khẩn cấp</option>
            </UISelect>
          </div>
          <div className="w-full md:w-40">
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Trạng thái</label>
            <UISelect value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">Tất cả</option>
              <option value="SUBMITTED">Đã gửi</option>
              <option value="REVIEWING">Chờ xử lý</option>
              <option value="APPROVED">Đã duyệt</option>
              <option value="IN_PROGRESS">Đang sửa</option>
              <option value="COMPLETED">Hoàn thành</option>
              <option value="REJECTED">Từ chối/Hủy</option>
            </UISelect>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={loadReports} className="gap-2">
              <Funnel size={16} weight="bold" />
              Lọc
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setKeyword('');
                setFilterBuilding('');
                setFilterRoom('');
                setFilterPriority('');
                setFilterStatus('');
                setPagination(p => ({ ...p, page: 1 }));
              }} 
              className="gap-2"
            >
              <ArrowsClockwise size={16} weight="bold" />
              Làm mới
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 overflow-hidden">
        <div className="overflow-x-auto py-6">
          {isFetching ? (
            <div className="flex flex-col items-center justify-center p-10 gap-2 text-muted-foreground">
              <ArrowsClockwise size={24} className="animate-spin text-primary" />
              <span className="text-sm">Đang tải dữ liệu...</span>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/30 text-muted-foreground border-b border-border/50">
                <tr>
                  <th className="px-4 py-4 text-center font-semibold w-12">STT</th>
                  <th className="px-4 py-4 text-center font-semibold">Mã báo hỏng</th>
                  <th className="px-4 py-4 text-center font-semibold">Ngày tạo</th>
                  <th className="px-4 py-4 text-center font-semibold">Phòng</th>
                  <th className="px-4 py-4 text-center font-semibold">Người báo</th>
                  <th className="px-4 py-4 text-center font-semibold">Thiết bị</th>
                  <th className="px-4 py-4 text-center font-semibold">Mức độ</th>
                  <th className="px-4 py-4 text-center font-semibold">Trạng thái</th>
                  <th className="px-4 py-4 text-center font-semibold w-24">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 text-foreground">
                {reports.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-10 text-muted-foreground">Không có dữ liệu báo hỏng</td>
                  </tr>
                ) : reports.map((report, idx) => (
                  <tr key={report.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3.5 text-center font-medium text-muted-foreground">
                      {(pagination.page - 1) * pagination.pageSize + idx + 1}
                    </td>
                    <td className="px-4 py-3.5 text-center font-bold">{report.reportCode}</td>
                    <td className="px-4 py-3.5 text-center tabular-nums">{new Date(report.createdAt).toLocaleDateString('vi-VN')}</td>
                    <td className="px-4 py-3.5 text-center font-medium">{report.room?.roomCode || '-'}</td>
                    <td className="px-4 py-3.5 text-center font-semibold text-primary">
                      {report.reporter?.fullName || report.reporterId}
                    </td>
                    <td className="px-4 py-3.5 text-center">{report.asset?.assetName || '-'}</td>
                    <td className="px-4 py-3.5 text-center">{renderPriorityBadge(report.priority)}</td>
                    <td className="px-4 py-3.5 text-center">{renderStatusBadge(report.status)}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-center gap-1.5">
                        {report.status === 'SUBMITTED' && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => handleAction(report.id, 'accept')} title="Duyệt">
                              <Check size={16} className="text-primary" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleAction(report.id, 'reject')} title="Từ chối">
                              <X size={16} className="text-destructive" />
                            </Button>
                          </>
                        )}
                        {(report.status === 'APPROVED' || report.status === 'REVIEWING') && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => handleAction(report.id, 'start')} title="Bắt đầu sửa">
                              <Play size={16} className="text-amber-600" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleAction(report.id, 'reject')} title="Từ chối">
                              <X size={16} className="text-destructive" />
                            </Button>
                          </>
                        )}
                        {report.status === 'IN_PROGRESS' && (
                          <Button variant="ghost" size="icon" onClick={() => handleAction(report.id, 'complete')} title="Hoàn thành">
                            <CheckCircle size={16} className="text-emerald-600" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          pageSize={pagination.pageSize}
          onPageChange={(p) => setPagination(prev => ({ ...prev, page: p }))}
        />
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size="lg">
        <ModalHeader>
          <ModalTitle>Tiếp nhận báo hỏng (Cán bộ tạo thay)</ModalTitle>
        </ModalHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <ModalBody className="space-y-6 max-h-[70vh] overflow-y-auto">
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border/50 pb-2">THÔNG TIN VỊ TRÍ</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Khu nhà <span className="text-destructive">*</span></label>
                  <UISelect {...form.register('buildingCode')}>
                    <option value="">Chọn khu nhà</option>
                    {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </UISelect>
                  {form.formState.errors.buildingCode && <p className="text-xs text-destructive mt-1">{form.formState.errors.buildingCode.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Phòng <span className="text-destructive">*</span></label>
                  <UISelect {...form.register('roomId')}>
                    <option value="">Chọn phòng</option>
                    {rooms.filter(r => !form.watch('buildingCode') || r.buildingId === form.watch('buildingCode')).map(r => <option key={r.id} value={r.id}>{r.roomCode}</option>)}
                  </UISelect>
                  {form.formState.errors.roomId && <p className="text-xs text-destructive mt-1">{form.formState.errors.roomId.message}</p>}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border/50 pb-2">THÔNG TIN THIẾT BỊ</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Thiết bị <span className="text-destructive">*</span></label>
                  <UISelect {...form.register('assetId')} disabled={!selectedRoomId}>
                    <option value="">{selectedRoomId ? 'Chọn thiết bị' : 'Vui lòng chọn phòng trước'}</option>
                    {assets.map(a => <option key={a.id} value={a.id}>{a.assetName} - {a.assetCode}</option>)}
                  </UISelect>
                  {form.formState.errors.assetId && <p className="text-xs text-destructive mt-1">{form.formState.errors.assetId.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Mức độ <span className="text-destructive">*</span></label>
                  <UISelect {...form.register('priority')}>
                    <option value="LOW">Thấp</option>
                    <option value="MEDIUM">Trung bình</option>
                    <option value="HIGH">Cao</option>
                    <option value="URGENT">Khẩn cấp</option>
                  </UISelect>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border/50 pb-2">NỘI DUNG BÁO HỎNG</h3>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Mô tả chi tiết <span className="text-destructive">*</span></label>
                  <textarea 
                    {...form.register('description')}
                    placeholder="Mô tả tình trạng hư hỏng, hiện tượng gặp phải..."
                    rows={4}
                    className="flex min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                  ></textarea>
                  {form.formState.errors.description && <p className="text-xs text-destructive mt-1">{form.formState.errors.description.message}</p>}
                </div>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Hủy bỏ</Button>
            <Button type="submit" disabled={isLoading}>{isLoading ? 'Đang lưu...' : 'Lưu báo hỏng'}</Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
