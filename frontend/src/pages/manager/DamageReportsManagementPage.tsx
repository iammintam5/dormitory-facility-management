import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useToast } from '../../toast/toast-context';

import { getDamageReports, createDamageReport, reviewDamageReport, approveDamageReport, rejectDamageReport, cancelReport } from '../../services/damage-reports';
import { getApiErrorMessage } from '../../lib/api-client';
import { DamageReport, DamageReportPriority } from '../../types/damage-reports';
import { getBuildings, getRooms, BuildingRecord, RoomRecord } from '../../services/locations';
import { getAssets, AssetRecord } from '../../services/assets';
import { DamageReportPriorityBadge, DamageReportStatusBadge } from '../../components/damage-reports/DamageReportBadge';
import { DamageReportTimeline } from '../../components/damage-reports/DamageReportTimeline';

import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select as UISelect } from '../../components/ui/Select';
import { PageHeader } from '../../components/ui/PageHeader';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { SearchInput } from '../../components/ui/SearchInput';
import { FilterBar } from '../../components/ui/FilterBar';
import { RowActionsMenu } from '../../components/ui/RowActionsMenu';
import { MobileDataCard, DataLabel } from '../../components/ui/MobileDataCard';
import { useDebounce } from '../../hooks/useDebounce';
import { SkeletonTable, SkeletonStatCard } from '../../components/ui/Skeleton';
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter } from '../../components/ui/Modal';
import { 
  Plus, 
  Funnel, 
  ArrowsClockwise, 
  WarningCircle,
  Clock, 
  Wrench,
  ArrowRight,
  CheckCircle, 
  Check, 
  Play, 
  X,
  MagnifyingGlass,
  Eye
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
  const navigate = useNavigate();
  
  const [reports, setReports] = useState<DamageReport[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
  
  const [buildings, setBuildings] = useState<BuildingRecord[]>([]);
  const [rooms, setRooms] = useState<RoomRecord[]>([]);
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  
  // Filters
  const [keyword, setKeyword] = useState('');
  const debouncedKeyword = useDebounce(keyword, 400);
  const [filterBuilding, setFilterBuilding] = useState('');
  const [filterRoom, setFilterRoom] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [activeReportDetail, setActiveReportDetail] = useState<DamageReport | null>(null);
  const [detailTab, setDetailTab] = useState<'detail' | 'history'>('detail');

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
        keyword: debouncedKeyword || undefined,
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
  }, [pagination.page, pagination.pageSize, debouncedKeyword, filterBuilding, filterRoom, filterPriority, filterStatus, showToast]);

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

  const handleAction = async (reportId: number, action: 'review' | 'approve' | 'reject' | 'cancel') => {
    try {
      if (action === 'review') {
        await reviewDamageReport(reportId);
      } else if (action === 'approve') {
        await approveDamageReport(reportId);
      } else if (action === 'reject') {
        const reason = window.prompt('Vui lòng nhập lý do từ chối:');
        if (reason === null) return;
        if (!reason.trim()) {
          showToast('Lý do từ chối không được để trống.', 'error');
          return;
        }
        await rejectDamageReport(reportId, reason);
      } else if (action === 'cancel') {
        const reason = window.prompt('Vui lòng nhập lý do hủy:');
        if (reason === null) return;
        if (!reason.trim()) {
          showToast('Lý do hủy không được để trống.', 'error');
          return;
        }
        await cancelReport(reportId, reason);
      }
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
      {isFetching && reports.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)}
        </div>
      ) : (
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
      )}

      <FilterBar 
        searchNode={
          <SearchInput
            value={keyword}
            onChange={setKeyword}
            placeholder="Mã BH, người báo..."
            aria-label="Tìm kiếm báo hỏng"
          />
        }
        filterNode={
          <>
            <UISelect 
              value={filterBuilding}
              onChange={(e) => {
                setFilterBuilding(e.target.value);
                setFilterRoom('');
              }}
              aria-label="Lọc theo khu nhà"
            >
              <option value="">Tất cả khu nhà</option>
              {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </UISelect>
            <UISelect 
              value={filterRoom}
              onChange={(e) => setFilterRoom(e.target.value)}
              aria-label="Lọc theo phòng"
            >
              <option value="">Tất cả phòng</option>
              {rooms.filter(r => !filterBuilding || r.buildingId === filterBuilding).map(r => <option key={r.id} value={r.id}>{r.roomCode}</option>)}
            </UISelect>
            <UISelect value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} aria-label="Lọc theo mức độ">
              <option value="">Tất cả mức độ</option>
              <option value="LOW">Thấp</option>
              <option value="MEDIUM">Trung bình</option>
              <option value="HIGH">Cao</option>
              <option value="URGENT">Khẩn cấp</option>
            </UISelect>
            <UISelect value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} aria-label="Lọc theo trạng thái">
              <option value="">Tất cả trạng thái</option>
              <option value="SUBMITTED">Đã gửi</option>
              <option value="REVIEWING">Chờ xử lý</option>
              <option value="APPROVED">Đã duyệt</option>
              <option value="IN_PROGRESS">Đang sửa</option>
              <option value="COMPLETED">Hoàn thành</option>
              <option value="REJECTED">Từ chối/Hủy</option>
            </UISelect>
          </>
        }
        appliedFilterCount={[
          filterBuilding,
          filterRoom,
          filterPriority,
          filterStatus
        ].filter(Boolean).length}
        onResetFilters={() => {
          setKeyword('');
          setFilterBuilding('');
          setFilterRoom('');
          setFilterPriority('');
          setFilterStatus('');
          setPagination(p => ({ ...p, page: 1 }));
        }}
        filterChips={[
          ...(filterBuilding ? [{ id: 'building', label: `Khu: ${buildings.find(b => b.id === filterBuilding)?.name}`, onRemove: () => setFilterBuilding('') }] : []),
          ...(filterRoom ? [{ id: 'room', label: `Phòng: ${rooms.find(r => r.id === filterRoom)?.roomCode}`, onRemove: () => setFilterRoom('') }] : []),
          ...(filterPriority ? [{ id: 'priority', label: `Mức độ: ${filterPriority}`, onRemove: () => setFilterPriority('') }] : []),
          ...(filterStatus ? [{ id: 'status', label: `Trạng thái: ${filterStatus}`, onRemove: () => setFilterStatus('') }] : []),
        ]}
      />

      <Card className="border-border/50 overflow-hidden">
        <div className="flex flex-col py-6">
          {isFetching ? (
            <div className="px-5">
              <SkeletonTable rows={10} cols={8} />
            </div>
          ) : reports.length === 0 ? (
            <div className="p-10">
              <EmptyState 
                title="Không có dữ liệu báo hỏng" 
                description="Chưa có báo hỏng nào phù hợp với bộ lọc hiện tại."
              />
            </div>
          ) : (
            <>
              <div className="hidden lg:block overflow-x-auto">
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
                    {reports.map((report, idx) => (
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
                          <RowActionsMenu
                            ariaLabel={`Thao tác báo hỏng ${report.reportCode}`}
                            actions={[
                              { id: 'view', label: 'Xem chi tiết', icon: <Eye size={16} />, onClick: () => setActiveReportDetail(report) },
                              ...(report.status === 'SUBMITTED' ? [
                                { id: 'review', label: 'Tiếp nhận xử lý', icon: <Play size={16} />, onClick: () => handleAction(report.id, 'review') },
                                { id: 'approve', label: 'Duyệt & Sửa ngay', icon: <Check size={16} />, onClick: () => handleAction(report.id, 'approve') },
                                { id: 'reject', label: 'Từ chối', icon: <X size={16} />, variant: 'destructive' as const, onClick: () => handleAction(report.id, 'reject') },
                              ] : []),
                              ...(report.status === 'REVIEWING' ? [
                                { id: 'approve', label: 'Duyệt & Sửa ngay', icon: <Check size={16} />, onClick: () => handleAction(report.id, 'approve') },
                                { id: 'reject', label: 'Từ chối', icon: <X size={16} />, variant: 'destructive' as const, onClick: () => handleAction(report.id, 'reject') },
                              ] : []),
                              ...(report.status === 'IN_PROGRESS' ? [
                                { id: 'complete', label: 'Nghiệm thu & Tạo phiếu', icon: <Wrench size={16} />, onClick: () => navigate(`/manager/maintenance/records/new?damageReportId=${report.id}&assetId=${report.assetId}`) },
                                { id: 'cancel', label: 'Hủy phiếu', icon: <X size={16} />, variant: 'destructive' as const, onClick: () => handleAction(report.id, 'cancel') },
                              ] : []),
                              ...(report.status === 'COMPLETED' && report.maintenanceRecords && report.maintenanceRecords.length > 0 ? [
                                { id: 'view-maint', label: 'Xem phiếu bảo trì', icon: <ArrowRight size={16} />, onClick: () => navigate(`/manager/maintenance?search=${report.maintenanceRecords![0].maintenanceCode}`) },
                              ] : [])
                            ]}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                        ariaLabel={`Thao tác báo hỏng ${report.reportCode}`}
                        actions={[
                          { id: 'view', label: 'Xem chi tiết', icon: <Eye size={16} />, onClick: () => setActiveReportDetail(report) },
                          ...(report.status === 'SUBMITTED' ? [
                            { id: 'review', label: 'Tiếp nhận xử lý', icon: <Play size={16} />, onClick: () => handleAction(report.id, 'review') },
                            { id: 'approve', label: 'Duyệt & Sửa ngay', icon: <Check size={16} />, onClick: () => handleAction(report.id, 'approve') },
                            { id: 'reject', label: 'Từ chối', icon: <X size={16} />, variant: 'destructive' as const, onClick: () => handleAction(report.id, 'reject') },
                          ] : []),
                          ...(report.status === 'REVIEWING' ? [
                            { id: 'approve', label: 'Duyệt & Sửa ngay', icon: <Check size={16} />, onClick: () => handleAction(report.id, 'approve') },
                            { id: 'reject', label: 'Từ chối', icon: <X size={16} />, variant: 'destructive' as const, onClick: () => handleAction(report.id, 'reject') },
                          ] : []),
                          ...(report.status === 'IN_PROGRESS' ? [
                            { id: 'complete', label: 'Nghiệm thu & Tạo phiếu', icon: <Wrench size={16} />, onClick: () => navigate(`/manager/maintenance/records/new?damageReportId=${report.id}&assetId=${report.assetId}`) },
                            { id: 'cancel', label: 'Hủy phiếu', icon: <X size={16} />, variant: 'destructive' as const, onClick: () => handleAction(report.id, 'cancel') },
                          ] : []),
                          ...(report.status === 'COMPLETED' && report.maintenanceRecords && report.maintenanceRecords.length > 0 ? [
                            { id: 'view-maint', label: 'Xem phiếu bảo trì', icon: <ArrowRight size={16} />, onClick: () => navigate(`/manager/maintenance?search=${report.maintenanceRecords![0].maintenanceCode}`) },
                          ] : [])
                        ]}
                      />
                    }
                  >
                    <DataLabel label="Người báo" value={report.reporter?.fullName || report.reporterId || '-'} />
                    <DataLabel label="Phòng" value={report.room?.roomCode || '-'} />
                    <DataLabel label="Thiết bị" value={report.asset?.assetName || '-'} />
                    <DataLabel label="Mức độ" value={renderPriorityBadge(report.priority)} />
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

      {/* Detail Modal */}
      <Modal isOpen={activeReportDetail !== null} onClose={() => setActiveReportDetail(null)} size="lg">
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
                      <span className="text-sm font-semibold text-muted-foreground w-28 shrink-0">Người báo</span>
                      <span className="text-sm text-foreground font-medium">{activeReportDetail.reporter?.fullName || activeReportDetail.reporterId}</span>
                    </div>
                    <div className="flex items-start gap-4 pb-3 border-b border-border/50">
                      <span className="text-sm font-semibold text-muted-foreground w-28 shrink-0">Thiết bị</span>
                      <span className="text-sm text-foreground font-medium">{activeReportDetail.asset?.assetName}</span>
                    </div>
                    <div className="flex items-start gap-4 pb-3 border-b border-border/50">
                      <span className="text-sm font-semibold text-muted-foreground w-28 shrink-0">Phòng</span>
                      <span className="text-sm text-foreground font-medium">{activeReportDetail.room?.roomCode}</span>
                    </div>
                    <div className="flex items-start gap-4 pb-3 border-b border-border/50">
                      <span className="text-sm font-semibold text-muted-foreground w-28 shrink-0">Mức độ</span>
                      {renderPriorityBadge(activeReportDetail.priority)}
                    </div>
                    <div className="flex items-start gap-4 pb-3 border-b border-border/50">
                      <span className="text-sm font-semibold text-muted-foreground w-28 shrink-0">Mô tả sự cố</span>
                      <span className="text-sm text-foreground font-medium leading-relaxed">{activeReportDetail.description}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative pt-2 pl-4">
                  <DamageReportTimeline logs={activeReportDetail.damageReportLogs ?? []} />
                </div>
              )}
            </ModalBody>
            <ModalFooter>
              <div className="flex w-full justify-end gap-3">
                <Button variant="outline" onClick={() => setActiveReportDetail(null)}>Đóng</Button>
                {activeReportDetail.status === 'SUBMITTED' && (
                  <>
                    <Button variant="destructive" onClick={() => { handleAction(activeReportDetail.id, 'reject'); setActiveReportDetail(null); }}>Từ chối</Button>
                    <Button onClick={() => { handleAction(activeReportDetail.id, 'review'); setActiveReportDetail(null); }}>Tiếp nhận xử lý</Button>
                  </>
                )}
                {activeReportDetail.status === 'REVIEWING' && (
                  <>
                    <Button variant="destructive" onClick={() => { handleAction(activeReportDetail.id, 'reject'); setActiveReportDetail(null); }}>Từ chối</Button>
                    <Button onClick={() => { handleAction(activeReportDetail.id, 'approve'); setActiveReportDetail(null); }}>Duyệt phiếu</Button>
                  </>
                )}
                {activeReportDetail.status === 'APPROVED' && (
                  <>
                    <Button variant="destructive" onClick={() => { handleAction(activeReportDetail.id, 'cancel'); setActiveReportDetail(null); }}>Hủy phiếu</Button>
                    <Button className="bg-amber-600 hover:bg-amber-500" onClick={() => navigate(`/manager/maintenance/records/new?damageReportId=${activeReportDetail.id}&assetId=${activeReportDetail.assetId}`)}>
                      Tạo Phiếu bảo trì
                    </Button>
                  </>
                )}
                {activeReportDetail.status === 'IN_PROGRESS' && activeReportDetail.maintenanceRecords && activeReportDetail.maintenanceRecords.length > 0 && (
                  <Button className="bg-sky-600 hover:bg-sky-500" onClick={() => navigate(`/manager/maintenance?search=${activeReportDetail.maintenanceRecords![0].maintenanceCode}`)}>
                    Xem Phiếu bảo trì
                  </Button>
                )}
              </div>
            </ModalFooter>
          </>
        )}
      </Modal>
    </div>
  );
}
