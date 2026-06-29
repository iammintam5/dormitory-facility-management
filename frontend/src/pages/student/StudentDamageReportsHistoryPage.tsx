import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '../../toast/toast-context';

import { getStudentDamageReports, getDamageReportById, createDamageReport } from '../../services/damage-reports';
import { getApiErrorMessage } from '../../lib/api-client';
import { DamageReport, DamageReportPriority } from '../../types/damage-reports';
import { studentsApi } from '../../services/students';

import { Card, CardContent } from '../../components/ui/Card';
import { SkeletonStatCard, SkeletonTable } from '../../components/ui/Skeleton';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select as UISelect } from '../../components/ui/Select';
import { PageHeader } from '../../components/ui/PageHeader';
import { Pagination } from '../../components/ui/Pagination';
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { RowActionsMenu } from '../../components/ui/RowActionsMenu';
import { MobileDataCard, DataLabel } from '../../components/ui/MobileDataCard';
import { AlertDialog } from '../../components/ui/AlertDialog';
import { 
  Plus, 
  WarningCircle, 
  Clock, 
  CalendarBlank,
  CheckCircle,
  Ticket,
  Wrench,
  Eye, 
  ArrowsClockwise
} from '@phosphor-icons/react';

const reportSchema = z.object({
  assetId: z.string().min(1, 'Chọn thiết bị.'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  description: z.string().min(1, 'Nhập mô tả chi tiết.'),
});

type ReportFormValues = z.infer<typeof reportSchema>;

export function StudentDamageReportsHistoryPage() {
  const { showToast } = useToast();
  
  const [reports, setReports] = useState<DamageReport[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
  
  const [assets, setAssets] = useState<any[]>([]);
  const [hasAssignedRoom, setHasAssignedRoom] = useState<boolean | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [cancelConfirm, setCancelConfirm] = useState<{ isOpen: boolean; reportId: number | null }>({
    isOpen: false,
    reportId: null,
  });
  const [isCancelling, setIsCancelling] = useState(false);

  const handleConfirmCancel = async () => {
    if (!cancelConfirm.reportId) return;
    setIsCancelling(true);
    try {
      await import('../../services/damage-reports').then(m => m.cancelReport(cancelConfirm.reportId!));
      showToast('Đã hủy phiếu báo hỏng.', 'success');
      setSelectedReportId(null);
      setCancelConfirm({ isOpen: false, reportId: null });
      loadReports();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Lỗi khi hủy báo hỏng', 'error');
    } finally {
      setIsCancelling(false);
    }
  };
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const [activeReportDetail, setActiveReportDetail] = useState<DamageReport | null>(null);
  const [detailTab, setDetailTab] = useState<'detail' | 'history'>('detail');

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      assetId: '',
      priority: 'MEDIUM',
      description: '',
    },
  });

  const loadReports = useCallback(async () => {
    setIsFetching(true);
    try {
      const res = await getStudentDamageReports({
        page: pagination.page,
        pageSize: pagination.pageSize,
      });
      setReports(res.items);
      setPagination(res.pagination);
    } catch (e) {
      showToast('Lỗi khi tải danh sách báo hỏng', 'error');
    } finally {
      setIsFetching(false);
    }
  }, [pagination.page, pagination.pageSize, showToast]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  useEffect(() => {
    async function loadStudentRoomContext() {
      try {
        const room = await studentsApi.getMyRoom();
        setHasAssignedRoom(Boolean(room));

        if (!room) {
          setAssets([]);
          return;
        }

        const res = await studentsApi.getMyRoomAssets();
        setAssets(res);
      } catch {
        setHasAssignedRoom(false);
        setAssets([]);
      }
    }

    void loadStudentRoomContext();
  }, []);

  useEffect(() => {
    if (selectedReportId) {
      getDamageReportById(selectedReportId).then(setActiveReportDetail).catch(() => {
        showToast('Không tải được chi tiết', 'error');
        setSelectedReportId(null);
      });
    } else {
      setActiveReportDetail(null);
    }
  }, [selectedReportId, showToast]);

  const onSubmit = async (data: ReportFormValues) => {
    setIsLoading(true);
    try {
      await createDamageReport({
        assetId: Number(data.assetId),
        priority: data.priority as DamageReportPriority,
        description: data.description,
      });
      showToast('Gửi báo hỏng thành công.', 'success');
      setShowCreateModal(false);
      form.reset();
      loadReports();
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Lưu thông tin thất bại.'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT': return <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-bold bg-destructive-muted text-destructive">Khẩn cấp</span>;
      case 'HIGH': return <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-bold bg-warning-muted text-warning">Cao</span>;
      case 'MEDIUM': return <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-bold bg-warning-muted text-warning">Trung bình</span>;
      case 'LOW': return <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-bold bg-success-muted text-success">Thấp</span>;
      default: return null;
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED': return <span className="inline-flex px-2 py-0.5 rounded bg-muted text-muted-foreground font-bold text-[11px]">Đã gửi</span>;
      case 'REVIEWING': return <span className="inline-flex px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-bold text-[11px]">Đang xử lý</span>;
      case 'APPROVED': return <span className="inline-flex px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-bold text-[11px]">Đã duyệt</span>;
      case 'IN_PROGRESS': return <span className="inline-flex px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 font-bold text-[11px]">Đang sửa</span>;
      case 'COMPLETED': return <span className="inline-flex px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold text-[11px]">Hoàn thành</span>;
      case 'REJECTED': 
      case 'CANCELLED': return <span className="inline-flex px-2 py-0.5 rounded bg-destructive/10 text-destructive font-bold text-[11px]">Đã hủy</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6 mx-auto max-w-7xl pb-10">
      <PageHeader 
        title="Báo hỏng" 
        breadcrumbs={[
          { label: 'Trang chủ', href: '/student/dashboard' },
          { label: 'Báo hỏng' }
        ]}
        actions={
          <Button
            onClick={() => {
              if (hasAssignedRoom === false) {
                showToast('Bạn chưa được phân phòng nên chưa thể tạo báo hỏng.', 'error');
                return;
              }
              if (assets.length === 0) {
                showToast('Phòng hiện chưa có thiết bị để báo hỏng.', 'error');
                return;
              }
              setShowCreateModal(true);
            }}
            disabled={hasAssignedRoom === null}
            className="gap-2"
          >
            <Plus size={16} weight="bold" />
            Tạo báo hỏng mới
          </Button>
        }
      />

      {/* Overview Cards */}
      {isFetching && pagination.total === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonStatCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-border/50">
            <CardContent className="flex gap-4 p-5 hover:bg-muted/30 transition-colors border-b border-border/50">
              <div className="w-12 h-12 rounded-full bg-info-muted flex items-center justify-center text-info shrink-0">
                <Ticket size={24} weight="duotone" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-0.5">Tổng số phiếu</p>
                <div className="flex items-baseline gap-1">
                  <p className="text-2xl font-bold text-foreground tabular-nums">{pagination.total}</p>
                  <span className="text-xs text-muted-foreground">phiếu</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border/50">
            <CardContent className="flex gap-4 p-5 hover:bg-muted/30 transition-colors border-b border-border/50 opacity-75">
              <div className="w-12 h-12 rounded-full bg-warning-muted flex items-center justify-center text-warning shrink-0">
                <Wrench size={24} weight="duotone" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-0.5">Đang xử lý</p>
                <div className="flex items-baseline gap-1">
                  <p className="text-2xl font-bold text-foreground tabular-nums">
                    {reports.filter(r => ['SUBMITTED', 'REVIEWING', 'IN_PROGRESS'].includes(r.status)).length}
                  </p>
                  <span className="text-xs text-muted-foreground">phiếu</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="flex gap-4 p-5 hover:bg-muted/30 transition-colors opacity-60 grayscale-[0.5]">
              <div className="w-12 h-12 rounded-full bg-success-muted flex items-center justify-center text-success shrink-0">
                <CheckCircle size={24} weight="duotone" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-0.5">Hoàn thành</p>
                <div className="flex items-baseline gap-1">
                  <p className="text-2xl font-bold text-foreground tabular-nums">
                    {reports.filter(r => r.status === 'COMPLETED').length}
                  </p>
                  <span className="text-xs text-muted-foreground">phiếu</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="border-border/50 overflow-hidden">
        <div className="flex flex-col py-6">
          {isFetching ? (
            <div className="p-5">
              <SkeletonTable rows={5} cols={7} />
            </div>
          ) : reports.length === 0 ? (
            <div className="p-10">
              <EmptyState 
                title="Không có báo hỏng nào" 
                description="Bạn chưa có báo hỏng nào."
              />
            </div>
          ) : (
            <>
              <div className="hidden lg:block overflow-x-auto">
                <Table aria-label="Danh sách phiếu báo hỏng">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center w-16">STT</TableHead>
                      <TableHead>Mã phiếu</TableHead>
                      <TableHead>Thiết bị</TableHead>
                      <TableHead>Mô tả</TableHead>
                      <TableHead className="text-center">Mức độ</TableHead>
                      <TableHead className="text-center">Ngày gửi</TableHead>
                      <TableHead className="text-center">Trạng thái</TableHead>
                      <TableHead className="text-center w-24">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report, idx) => (
                      <TableRow key={report.id} className="cursor-pointer" onClick={() => setSelectedReportId(report.id)}>
                        <TableCell className="text-center text-muted-foreground font-medium">
                          {(pagination.page - 1) * pagination.pageSize + idx + 1}
                        </TableCell>
                        <TableCell className="font-bold">{report.reportCode}</TableCell>
                        <TableCell className="font-medium">
                          <span className="font-semibold text-foreground text-sm truncate max-w-[200px]" title={report.asset?.assetName}>
                            {report.asset?.assetName || '-'}
                          </span>
                        </TableCell>
                        <TableCell className="truncate max-w-[200px]" title={report.description}>{report.description}</TableCell>
                        <TableCell className="text-center">{getPriorityBadge(report.priority)}</TableCell>
                        <TableCell className="text-center tabular-nums">{new Date(report.createdAt).toLocaleDateString('vi-VN')}</TableCell>
                        <TableCell className="text-center">{renderStatusBadge(report.status)}</TableCell>
                        <TableCell>
                          <RowActionsMenu
                            ariaLabel={`Thao tác ${report.reportCode}`}
                            actions={[
                              { id: 'view', label: 'Xem chi tiết', icon: <Eye size={16} />, onClick: () => setSelectedReportId(report.id) },
                            ]}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="lg:hidden flex flex-col gap-3 p-3">
                {reports.map((report) => (
                  <MobileDataCard
                    key={report.id}
                    title={report.reportCode}
                    subtitle={new Date(report.createdAt).toLocaleDateString('vi-VN')}
                    statusBadge={renderStatusBadge(report.status)}
                    actionMenu={
                      <RowActionsMenu
                        ariaLabel={`Thao tác ${report.reportCode}`}
                        actions={[
                          { id: 'view', label: 'Xem chi tiết', icon: <Eye size={16} />, onClick: () => setSelectedReportId(report.id) },
                        ]}
                      />
                    }
                  >
                    <DataLabel label="Thiết bị" value={report.asset?.assetName || '-'} />
                    <DataLabel label="Mô tả" value={report.description} />
                    <DataLabel label="Mức độ" value={getPriorityBadge(report.priority)} />
                  </MobileDataCard>
                ))}
              </div>
            </>
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

      {/* Detail Modal */}
      <Modal isOpen={selectedReportId !== null && activeReportDetail !== null} onClose={() => setSelectedReportId(null)} size="lg">
        {activeReportDetail && (
          <>
            <ModalHeader>
              <ModalTitle>Chi tiết phiếu báo hỏng</ModalTitle>
            </ModalHeader>
            <div className="flex border-b border-border/50 px-6 shrink-0 bg-muted/10">
              <button 
                className={`py-3 px-4 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${detailTab === 'detail' ? 'text-primary border-primary' : 'text-muted-foreground border-transparent hover:text-foreground'}`}
                onClick={() => setDetailTab('detail')}
              >
                Chi tiết báo hỏng
              </button>
              <button 
                className={`py-3 px-4 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${detailTab === 'history' ? 'text-primary border-primary' : 'text-muted-foreground border-transparent hover:text-foreground'}`}
                onClick={() => setDetailTab('history')}
              >
                Lịch sử xử lý
              </button>
            </div>

            <ModalBody className="p-6 overflow-y-auto max-h-[60vh]">
              {detailTab === 'detail' ? (
                <div className="space-y-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-lg font-bold text-foreground">{activeReportDetail.reportCode}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">Ngày gửi: {new Date(activeReportDetail.createdAt).toLocaleString('vi-VN')}</p>
                    </div>
                    {renderStatusBadge(activeReportDetail.status)}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start gap-4 pb-3 border-b border-border/50">
                      <span className="text-sm font-semibold text-muted-foreground w-28 shrink-0">Thiết bị</span>
                      <span className="text-sm text-foreground font-medium">{activeReportDetail.asset?.assetName}</span>
                    </div>
                    <div className="flex items-start gap-4 pb-3 border-b border-border/50">
                      <span className="text-sm font-semibold text-muted-foreground w-28 shrink-0">Phòng</span>
                      <span className="text-sm text-foreground font-medium">{activeReportDetail.room?.roomCode}</span>
                    </div>
                    <div className="flex items-start gap-4 pb-3 border-b border-border/50">
                      <span className="text-sm font-semibold text-muted-foreground w-28 shrink-0">Mức độ ưu tiên</span>
                      {getPriorityBadge(activeReportDetail.priority)}
                    </div>
                    <div className="flex items-start gap-4 pb-3 border-b border-border/50">
                      <span className="text-sm font-semibold text-muted-foreground w-28 shrink-0">Mô tả sự cố</span>
                      <span className="text-sm text-foreground font-medium leading-relaxed">{activeReportDetail.description}</span>
                    </div>
                    {activeReportDetail.status === 'REJECTED' && activeReportDetail.rejectReason && (
                      <div className="flex items-start gap-4 pb-3 border-b border-border/50 text-destructive">
                        <span className="text-sm font-semibold w-28 shrink-0">Lý do từ chối</span>
                        <span className="text-sm font-medium leading-relaxed">{activeReportDetail.rejectReason}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="relative pl-6 space-y-6 border-l-2 border-primary/20 ml-4 py-2">
                  {activeReportDetail.damageReportLogs && activeReportDetail.damageReportLogs.length > 0 ? (
                    activeReportDetail.damageReportLogs.map((log) => (
                      <div className="relative" key={log.id}>
                        <div className="absolute -left-[35px] bg-background py-1">
                          <div className="w-4 h-4 rounded-full border-2 border-primary flex items-center justify-center bg-background shadow-sm">
                            <div className="w-2 h-2 rounded-full bg-primary"></div>
                          </div>
                        </div>
                        <div className="flex gap-4 p-4 bg-muted/20 rounded-lg border border-border/50">
                          <div className="text-xs text-muted-foreground w-20 shrink-0 font-medium text-center tabular-nums">
                            {new Date(log.createdAt).toLocaleString('vi-VN')}
                          </div>
                          <div>
                            <h5 className="text-sm font-bold text-foreground">{log.action}</h5>
                            <p className="text-xs text-muted-foreground mt-1">Người thao tác: {log.createdByUser?.fullName || 'Hệ thống'}</p>
                            {log.note && <p className="text-xs text-muted-foreground mt-1 italic">Ghi chú: {log.note}</p>}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Chưa có lịch sử cập nhật.</p>
                  )}
                </div>
              )}
            </ModalBody>
            <ModalFooter className="flex justify-between w-full">
              <div>
                {activeReportDetail.status === 'SUBMITTED' && (
                  <Button 
                    variant="destructive" 
                    onClick={() => {
                      setSelectedReportId(null);
                      setCancelConfirm({ isOpen: true, reportId: activeReportDetail.id });
                    }}
                  >
                    Hủy báo hỏng
                  </Button>
                )}
              </div>
              <Button onClick={() => setSelectedReportId(null)} variant="outline">
                Đóng
              </Button>
            </ModalFooter>
          </>
        )}
      </Modal>

      {/* Create Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} size="lg">
        <ModalHeader>
          <ModalTitle>Tạo báo hỏng mới</ModalTitle>
        </ModalHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <ModalBody className="space-y-6 max-h-[70vh] overflow-y-auto">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-muted-foreground">Thiết bị <span className="text-destructive">*</span></label>
              <UISelect {...form.register('assetId')}>
                <option value="">Chọn thiết bị</option>
                {assets.map(a => <option key={a.id} value={a.id}>{a.assetName}</option>)}
              </UISelect>
              {form.formState.errors.assetId && <p className="mt-1 text-xs text-destructive">{form.formState.errors.assetId.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-muted-foreground mb-2">Mức độ ưu tiên <span className="text-destructive">*</span></label>
              <div className="flex flex-wrap items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-foreground font-medium">
                  <input type="radio" value="LOW" {...form.register('priority')} className="w-4 h-4 text-primary" />
                  <span>Thấp</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm text-foreground font-medium">
                  <input type="radio" value="MEDIUM" {...form.register('priority')} className="w-4 h-4 text-primary" />
                  <span>Trung bình</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm text-foreground font-medium">
                  <input type="radio" value="HIGH" {...form.register('priority')} className="w-4 h-4 text-primary" />
                  <span>Cao</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm text-foreground font-medium">
                  <input type="radio" value="URGENT" {...form.register('priority')} className="w-4 h-4 text-primary" />
                  <span>Khẩn cấp</span>
                </label>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-muted-foreground">Mô tả sự cố <span className="text-destructive">*</span></label>
              <textarea 
                {...form.register('description')}
                rows={4} 
                placeholder="Nhập mô tả chi tiết về sự cố, hiện tượng, thời điểm xảy ra..." 
                className="flex min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              ></textarea>
              {form.formState.errors.description && <p className="mt-1 text-xs text-destructive">{form.formState.errors.description.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-muted-foreground">Hình ảnh (nếu có)</label>
              <div className="border-2 border-dashed border-border/50 rounded-xl px-8 py-10 flex flex-col items-center justify-center text-center bg-muted/10">

              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
              Hủy bỏ
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Đang lưu...' : 'Gửi báo hỏng'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      <AlertDialog
        isOpen={cancelConfirm.isOpen}
        title="Xác nhận hủy báo hỏng"
        description="Bạn có chắc chắn muốn hủy phiếu báo hỏng này không?"
        onClose={() => setCancelConfirm({ isOpen: false, reportId: null })}
        onConfirm={handleConfirmCancel}
        isLoading={isCancelling}
        confirmText="Đồng ý"
        cancelText="Bỏ qua"
      />
    </div>
  );
}
