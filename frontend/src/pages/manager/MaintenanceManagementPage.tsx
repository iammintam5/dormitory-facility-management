import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useToast } from '../../toast/toast-context';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
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
  MagnifyingGlass, 
  ArrowsClockwise, 
  Funnel,
  Wrench,
  Clock,
  Gear,
  Package,
  CheckCircle,
  Eye,
  PencilSimple,
  WarningCircle,
  FloppyDisk,
  Printer
} from '@phosphor-icons/react';
import { useReactToPrint } from 'react-to-print';
import { getMaintenanceRecords, createMaintenanceRecord, updateMaintenanceRecord, completeMaintenanceRecord, getMaintenancePlans, startMaintenanceRecord, cancelMaintenanceRecord } from '../../services/maintenance';
import { getAssets } from '../../services/assets';
import { getApiErrorMessage } from '../../lib/api-client';
import type { MaintenanceRecord, MaintenancePlan } from '../../types/maintenance';
import type { Asset } from '../../types/assets';

const recordSchema = z.object({
  planId: z.coerce.number().optional(),
  assetId: z.coerce.number().int().positive('Chọn tài sản.'),
  maintenanceDate: z.string().min(1, 'Chọn ngày bảo trì.'),
  maintenanceType: z.enum(['SCHEDULED', 'AD_HOC']),
  content: z.string().min(1, 'Nhập nội dung thực hiện.'),
  resultStatus: z.enum(['GOOD', 'RECOMMEND_LIQUIDATION']).optional(),
  nextMaintenanceDate: z.string().optional(),
  cost: z.union([z.coerce.number().min(0), z.nan()]).optional(),
  materialNote: z.string().optional(),
  note: z.string().optional(),
});

type RecordFormValues = z.infer<typeof recordSchema>;

export function MaintenanceManagementPage() {
  const { showToast } = useToast();
  
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
  const [isFetching, setIsFetching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [assets, setAssets] = useState<Asset[]>([]);
  const [plans, setPlans] = useState<MaintenancePlan[]>([]);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [completeResultStatus, setCompleteResultStatus] = useState('GOOD');
  const [selectedRecord, setSelectedRecord] = useState<MaintenanceRecord | null>(null);
  const [printRecord, setPrintRecord] = useState<MaintenanceRecord | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: printRecord?.maintenanceCode ?? 'phieu-bao-tri',
  });
  
  const [activeTab, setActiveTab] = useState('Tất cả');
  
  // Filter states
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const [searchKeyword, setSearchKeyword] = useState(initialSearch);
  const debouncedKeyword = useDebounce(searchKeyword, 400);
  const [statusFilter, setStatusFilter] = useState('Tất cả');
  const [typeFilter, setTypeFilter] = useState('Tất cả');

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

  const loadRecords = useCallback(async () => {
    setIsFetching(true);
    try {
      const res = await getMaintenanceRecords(pagination.page, pagination.pageSize);
      setRecords(res.items);
      setPagination(res.pagination);
    } catch (e) {
      showToast('Lỗi khi tải danh sách bảo trì', 'error');
    } finally {
      setIsFetching(false);
    }
  }, [pagination.page, pagination.pageSize, showToast]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const loadLookups = useCallback(async () => {
    try {
      const [assetResponse, planList] = await Promise.all([
        getAssets({ pageSize: 100 }),
        getMaintenancePlans(),
      ]);
      setAssets(assetResponse.items.map((a: any) => ({
        id: parseInt(a.id),
        categoryId: 1,
        assetCode: a.assetCode,
        assetName: a.assetName,
        status: a.status,
        description: a.description,
        yearInUse: null,
        createdAt: a.createdAt,
      })));
      setPlans(planList);
    } catch {
      // Non-critical, will handle on open
    }
  }, []);

  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      // Tab filter (resultStatus)
      if (activeTab !== 'Tất cả') {
        const tabMap: Record<string, string> = {
          'Tốt': 'GOOD',
          'Đề nghị thanh lý': 'RECOMMEND_LIQUIDATION',
        };
        if (record.resultStatus !== tabMap[activeTab]) return false;
      }
      
      // Status filter
      if (statusFilter !== 'Tất cả') {
        if (record.resultStatus !== statusFilter) return false;
      }
      
      // Type filter
      if (typeFilter !== 'Tất cả') {
        if (record.maintenanceType !== typeFilter) return false;
      }
      
      // Search keyword
      if (debouncedKeyword) {
        const kw = debouncedKeyword.toLowerCase();
        const matchCode = record.maintenanceCode.toLowerCase().includes(kw);
        const matchAsset = record.asset?.assetName?.toLowerCase().includes(kw);
        const matchRoom = record.asset?.room?.roomCode?.toLowerCase().includes(kw);
        const matchBuilding = record.asset?.room?.floor?.building?.name?.toLowerCase().includes(kw);
        const matchTechnician = record.performedByUser?.fullName?.toLowerCase().includes(kw);
        if (!(matchCode || matchAsset || matchRoom || matchBuilding || matchTechnician)) return false;
      }
      
      return true;
    });
  }, [records, activeTab, debouncedKeyword, statusFilter, typeFilter]);

  const summaryCounts = useMemo(() => {
    return {
      total: records.length,
      good: records.filter(r => r.resultStatus === 'GOOD').length,
      recommendLiquidation: records.filter(r => r.resultStatus === 'RECOMMEND_LIQUIDATION').length,
    };
  }, [records]);

  const handleResetFilters = () => {
    setSearchKeyword('');
    setStatusFilter('Tất cả');
    setTypeFilter('Tất cả');
    setActiveTab('Tất cả');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const openCreateModal = async () => {
    form.reset({
      planId: undefined,
      assetId: 0,
      maintenanceDate: new Date().toISOString().slice(0, 10),
      maintenanceType: 'SCHEDULED',
      content: '',
      resultStatus: 'GOOD',
      nextMaintenanceDate: '',
      materialNote: '',
      note: '',
    });
    setIsEditMode(false);
    setIsCreateModalOpen(true);
    await loadLookups();
  };

  const openDetailModal = (record: MaintenanceRecord) => {
    setSelectedRecord(record);
    setIsDetailModalOpen(true);
  };

  const openEditModal = (record: MaintenanceRecord) => {
    setSelectedRecord(record);
    setIsEditMode(true);
    form.reset({
      planId: record.planId ?? undefined,
      assetId: record.assetId,
      maintenanceDate: record.maintenanceDate.slice(0, 10),
      maintenanceType: record.maintenanceType,
      content: record.content,
      resultStatus: record.resultStatus,
      nextMaintenanceDate: record.nextMaintenanceDate?.slice(0, 10) ?? '',
      cost: record.cost ? Number(record.cost) : undefined,
      materialNote: record.materialNote ?? '',
      note: record.note ?? '',
    });
    setIsCreateModalOpen(true);
    loadLookups();
  };

  const onSubmit = async (data: RecordFormValues) => {
    setIsSubmitting(true);
    try {
      if (isEditMode && selectedRecord) {
        await updateMaintenanceRecord(selectedRecord.id, {
          maintenanceDate: data.maintenanceDate,
          maintenanceType: data.maintenanceType,
          content: data.content,
          nextMaintenanceDate: data.nextMaintenanceDate || undefined,
          note: data.note?.trim() || undefined,
        });
        showToast('Cập nhật phiếu bảo trì thành công.', 'success');
      } else {
        await createMaintenanceRecord({
          ...data,
          planId: data.planId || undefined,
          nextMaintenanceDate: data.nextMaintenanceDate || undefined,
          note: data.note?.trim() || undefined,
        });
        showToast('Tạo phiếu bảo trì thành công.', 'success');
      }
      setIsCreateModalOpen(false);
      loadRecords();
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Lưu thông tin thất bại.'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;
    
    const formData = new FormData(e.target as HTMLFormElement);
    const resultStatus = formData.get('resultStatus') as string;
    
    setIsSubmitting(true);
    try {
      await completeMaintenanceRecord(selectedRecord.id, { resultStatus });
      showToast('Hoàn tất phiếu bảo trì thành công.', 'success');
      setIsCompleteModalOpen(false);
      loadRecords();
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Lưu thông tin thất bại.'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStart = async (id: number) => {
    try {
      await startMaintenanceRecord(id);
      showToast('Bắt đầu bảo trì thành công.', 'success');
      loadRecords();
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Thao tác thất bại.'), 'error');
    }
  };

  const handleCancel = async (id: number) => {
    const reason = window.prompt('Vui lòng nhập lý do hủy phiếu bảo trì:');
    if (reason === null) return;
    if (!reason.trim()) {
      showToast('Lý do hủy không được để trống.', 'error');
      return;
    }
    try {
      await cancelMaintenanceRecord(id, { reason });
      showToast('Đã hủy phiếu bảo trì.', 'success');
      loadRecords();
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Thao tác thất bại.'), 'error');
    }
  };

  const printMaintenanceRecord = (record: MaintenanceRecord) => {
    setPrintRecord(record);
    window.setTimeout(() => handlePrint(), 0);
  };

  function translateType(type: string) {
    switch (type) {
      case 'SCHEDULED': return 'Định kỳ';
      case 'AD_HOC': return 'Đột xuất';

      default: return type;
    }
  }

  function translateStatus(status: string) {
    switch (status) {
      case 'GOOD': return 'Tốt';
      case 'RECOMMEND_LIQUIDATION': return 'Đề nghị thanh lý';
      default: return status;
    }
  }

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'GOOD': return <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-700">Tốt</span>;
      case 'RECOMMEND_LIQUIDATION': return <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-700">Đề nghị thanh lý</span>;
      default: return null;
    }
  };

  const renderTypeBadge = (type: string) => {
    switch (type) {
      case 'SCHEDULED': return <span className="text-xs font-semibold text-emerald-600">Định kỳ</span>;
      case 'AD_HOC': return <span className="text-xs font-semibold text-amber-600">Đột xuất</span>;

      default: return <span className="text-xs">{type}</span>;
    }
  };

  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  return (
    <div className="space-y-6 mx-auto max-w-7xl pb-10">
      <PageHeader 
        title="Sửa chữa - Bảo trì" 
        breadcrumbs={[
          { label: 'Nghiệp vụ', href: '#' },
          { label: 'Sửa chữa - Bảo trì' }
        ]}
        actions={
          <Button onClick={openCreateModal} className="gap-2">
            <Plus size={16} weight="bold" />
            Tạo phiếu bảo trì mới
          </Button>
        }
      />

      {/* Summary Cards */}
      {isFetching && records.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonStatCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-border/50">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0">
                <Wrench size={24} weight="duotone" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-0.5">Tổng phiếu</p>
                <p className="text-2xl font-bold text-foreground">{summaryCounts.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
                <CheckCircle size={24} weight="duotone" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-0.5">Tốt</p>
                <p className="text-2xl font-bold text-foreground">{summaryCounts.good}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-600 shrink-0">
                <Package size={24} weight="duotone" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-0.5">Đề nghị thanh lý</p>
                <p className="text-2xl font-bold text-foreground">{summaryCounts.recommendLiquidation}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <FilterBar 
        searchNode={
          <SearchInput
            value={searchKeyword}
            onChange={setSearchKeyword}
            placeholder="Mã phiếu, thiết bị, phòng..."
            aria-label="Tìm kiếm bảo trì"
          />
        }
        filterNode={
          <>
            <Select className="w-full bg-background border-border/50 text-foreground" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} aria-label="Lọc theo kết quả">
              {['Tất cả', 'Tốt', 'Đề nghị thanh lý'].map(s => <option key={s} value={s === 'Tất cả' ? 'Tất cả' : (s === 'Tốt' ? 'GOOD' : 'RECOMMEND_LIQUIDATION')}>{s}</option>)}
            </Select>
            <Select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} aria-label="Lọc theo loại bảo trì">
              <option>Tất cả</option>
              <option value="SCHEDULED">Định kỳ</option>
              <option value="AD_HOC">Đột xuất</option>
            </Select>
          </>
        }
        appliedFilterCount={[
          statusFilter !== 'Tất cả' ? statusFilter : '',
          typeFilter !== 'Tất cả' ? typeFilter : ''
        ].filter(Boolean).length}
        onResetFilters={handleResetFilters}
        filterChips={[
          ...(statusFilter !== 'Tất cả' ? [{ id: 'status', label: `Kết quả: ${statusFilter === 'GOOD' ? 'Tốt' : 'Đề nghị thanh lý'}`, onRemove: () => setStatusFilter('Tất cả') }] : []),
          ...(typeFilter !== 'Tất cả' ? [{ id: 'type', label: `Loại: ${typeFilter === 'SCHEDULED' ? 'Định kỳ' : 'Đột xuất'}`, onRemove: () => setTypeFilter('Tất cả') }] : []),
        ]}
      />

      <Card className="border-border/50 overflow-hidden">

        <div className="flex flex-col">
          {isFetching ? (
            <div className="px-5 py-4">
              <SkeletonTable rows={10} cols={8} />
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-10">
              <EmptyState 
                title="Không tìm thấy phiếu bảo trì" 
                description="Chưa có phiếu bảo trì nào phù hợp với bộ lọc hiện tại."
              />
            </div>
          ) : (
            <>
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/30 text-muted-foreground border-b border-border/50">
                    <tr>
                      <th className="px-4 py-4 text-center font-semibold w-12">STT</th>
                      <th className="px-4 py-4 text-center font-semibold">Mã phiếu</th>
                      <th className="px-4 py-4 font-semibold text-left">Thiết bị</th>
                      <th className="px-4 py-4 text-center font-semibold">Phòng</th>
                      <th className="px-4 py-4 text-center font-semibold">Khu nhà</th>
                      <th className="px-4 py-4 text-center font-semibold">Loại</th>
                      <th className="px-4 py-4 text-center font-semibold">Kết quả</th>
                      <th className="px-4 py-4 text-center font-semibold">Người thực hiện</th>
                      <th className="px-4 py-4 text-center font-semibold">Ngày bảo trì</th>
                      <th className="px-4 py-4 text-center font-semibold w-24">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50 text-foreground">
                    {filteredRecords.map((record, idx) => (
                      <tr key={record.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3.5 text-center font-medium text-muted-foreground">
                          {(pagination.page - 1) * pagination.pageSize + idx + 1}
                        </td>
                        <td className="px-4 py-3.5 text-center font-bold">{record.maintenanceCode}</td>
                        <td className="px-4 py-3.5">{record.asset?.assetName ?? '--'}</td>
                        <td className="px-4 py-3.5 text-center">{record.asset?.room?.roomCode ?? '--'}</td>
                        <td className="px-4 py-3.5 text-center">{record.asset?.room?.floor?.building?.name ?? '--'}</td>
                        <td className="px-4 py-3.5 text-center">{renderTypeBadge(record.maintenanceType)}</td>
                        <td className="px-4 py-3.5 text-center">{renderStatusBadge(record.resultStatus)}</td>
                        <td className="px-4 py-3.5 text-center font-medium">
                          {record.performedByUser?.fullName ?? `#${record.performedBy}`}
                        </td>
                        <td className="px-4 py-3.5 text-center tabular-nums">
                          {new Date(record.maintenanceDate).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="px-4 py-3.5">
                          <RowActionsMenu
                            ariaLabel={`Thao tác bảo trì ${record.maintenanceCode}`}
                            actions={[
                              { id: 'view', label: 'Xem chi tiết', icon: <Eye size={16} />, onClick: () => openDetailModal(record) },
                              { id: 'print', label: 'In phiếu PDF', icon: <Printer size={16} />, onClick: () => printMaintenanceRecord(record) },
                              ...(record.status === 'PENDING' ? [
                                { id: 'start', label: 'Bắt đầu', icon: <Gear size={16} />, onClick: () => handleStart(record.id) },
                                { id: 'edit', label: 'Sửa', icon: <PencilSimple size={16} />, onClick: () => openEditModal(record) },
                                { id: 'cancel', label: 'Hủy phiếu', icon: <WarningCircle size={16} />, variant: 'destructive' as const, onClick: () => handleCancel(record.id) }
                              ] : []),
                              ...(record.status === 'IN_PROGRESS' ? [
                                { id: 'complete', label: 'Hoàn tất', icon: <CheckCircle size={16} />, onClick: () => { setSelectedRecord(record); setIsCompleteModalOpen(true); } },
                                { id: 'cancel', label: 'Hủy phiếu', icon: <WarningCircle size={16} />, variant: 'destructive' as const, onClick: () => handleCancel(record.id) }
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
                {filteredRecords.map((record) => (
                  <MobileDataCard
                    key={record.id}
                    title={record.maintenanceCode}
                    subtitle={record.asset?.assetName ?? '--'}
                    statusBadge={renderStatusBadge(record.resultStatus)}
                    actionMenu={
                      <RowActionsMenu
                        ariaLabel={`Thao tác bảo trì ${record.maintenanceCode}`}
                        actions={[
                          { id: 'view', label: 'Xem chi tiết', icon: <Eye size={16} />, onClick: () => openDetailModal(record) },
                              { id: 'print', label: 'In phiếu PDF', icon: <Printer size={16} />, onClick: () => printMaintenanceRecord(record) },
                          ...(record.status === 'PENDING' ? [
                            { id: 'start', label: 'Bắt đầu', icon: <Gear size={16} />, onClick: () => handleStart(record.id) },
                            { id: 'edit', label: 'Sửa', icon: <PencilSimple size={16} />, onClick: () => openEditModal(record) },
                            { id: 'cancel', label: 'Hủy phiếu', icon: <WarningCircle size={16} />, variant: 'destructive' as const, onClick: () => handleCancel(record.id) }
                          ] : []),
                          ...(record.status === 'IN_PROGRESS' ? [
                            { id: 'complete', label: 'Hoàn tất', icon: <CheckCircle size={16} />, onClick: () => { setSelectedRecord(record); setIsCompleteModalOpen(true); } },
                            { id: 'cancel', label: 'Hủy phiếu', icon: <WarningCircle size={16} />, variant: 'destructive' as const, onClick: () => handleCancel(record.id) }
                          ] : [])
                        ]}
                      />
                    }
                  >
                    <DataLabel label="Phòng/Khu" value={`${record.asset?.room?.roomCode ?? '--'} / ${record.asset?.room?.floor?.building?.name ?? '--'}`} />
                    <DataLabel label="Loại" value={renderTypeBadge(record.maintenanceType)} />
                    <DataLabel label="Người thực hiện" value={record.performedByUser?.fullName ?? `#${record.performedBy}`} />
                    <DataLabel label="Ngày bảo trì" value={new Date(record.maintenanceDate).toLocaleDateString('vi-VN')} />
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

      <div className="fixed -left-[9999px] top-0 bg-white text-black">
        <div ref={printRef} className="p-8 font-sans text-sm text-black" style={{ width: '210mm', minHeight: '297mm' }}>
          {printRecord && (
            <div className="space-y-6">
              <div className="flex justify-between border-b border-gray-300 pb-4">
                <div>
                  <p className="text-sm font-bold uppercase">Bộ Khoa học và Công nghệ</p>
                  <p className="text-sm font-bold uppercase">Học viện Công nghệ Bưu chính Viễn thông</p>
                  <p className="text-sm font-bold uppercase">Cơ sở tại Thành phố Hồ Chí Minh</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold">Mẫu số: QL_BM3</p>
                  <p className="text-xs">Mã phiếu: {printRecord.maintenanceCode}</p>
                </div>
              </div>

              <div className="text-center">
                <h1 className="text-xl font-bold uppercase">Phiếu sửa chữa - bảo trì thiết bị</h1>
                <p className="mt-1 text-xs italic">
                  Ngày {new Date(printRecord.maintenanceDate).getDate()} tháng {new Date(printRecord.maintenanceDate).getMonth() + 1} năm {new Date(printRecord.maintenanceDate).getFullYear()}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <p><strong>Thiết bị:</strong> {printRecord.asset?.assetName ?? '--'} ({printRecord.asset?.assetCode ?? '--'})</p>
                <p><strong>Vị trí:</strong> {printRecord.asset?.room?.roomCode ?? 'Kho'} - {printRecord.asset?.room?.floor?.building?.name ?? '--'}</p>
                <p><strong>Loại phiếu:</strong> {translateType(printRecord.maintenanceType)}</p>
                <p><strong>Kết quả:</strong> {translateStatus(printRecord.resultStatus ?? '')}</p>
                <p><strong>Người thực hiện:</strong> {printRecord.performedByUser?.fullName ?? `#${printRecord.performedBy}`}</p>
                <p><strong>Ngày lập:</strong> {new Date(printRecord.createdAt).toLocaleDateString('vi-VN')}</p>
              </div>

              <div>
                <p className="mb-2 font-semibold">Nội dung thực hiện</p>
                <div className="min-h-24 rounded border border-gray-300 p-3 whitespace-pre-wrap">{printRecord.content}</div>
              </div>

              {printRecord.note && (
                <div>
                  <p className="mb-2 font-semibold">Ghi chú</p>
                  <div className="rounded border border-gray-300 p-3 whitespace-pre-wrap">{printRecord.note}</div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-16 pt-12 text-center">
                <div>
                  <p className="font-semibold">Người thực hiện</p>
                  <p className="mt-1 text-xs italic">(Ký và ghi rõ họ tên)</p>
                  <div className="h-24"></div>
                </div>
                <div>
                  <p className="font-semibold">Đại diện quản lý CSVC</p>
                  <p className="mt-1 text-xs italic">(Ký và ghi rõ họ tên)</p>
                  <div className="h-24"></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} size="lg">
        <ModalHeader>
          <ModalTitle>{isEditMode ? 'Cập nhật phiếu bảo trì' : 'Tạo phiếu bảo trì mới'}</ModalTitle>
        </ModalHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <ModalBody className="space-y-6 max-h-[70vh] overflow-y-auto">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border/50 pb-2">THÔNG TIN CHUNG</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Tài sản <span className="text-destructive">*</span></label>
                  <Select {...form.register('assetId', { valueAsNumber: true })} disabled={isEditMode}>
                    <option value={0}>-- Chọn tài sản --</option>
                    {assets.map((asset) => (
                      <option key={asset.id} value={asset.id}>{asset.assetCode} - {asset.assetName}</option>
                    ))}
                  </Select>
                  {form.formState.errors.assetId && <p className="text-xs text-destructive mt-1">{form.formState.errors.assetId.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Kế hoạch bảo trì</label>
                  <Select {...form.register('planId', { valueAsNumber: true })} disabled={isEditMode}>
                    <option value="">Không gắn kế hoạch</option>
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.asset?.assetCode ?? '#'}{plan.id} - đến hạn {plan.nextDueDate?.slice(0, 10) ?? '--'}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border/50 pb-2">THÔNG TIN BẢO TRÌ</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Ngày bảo trì <span className="text-destructive">*</span></label>
                  <Input type="date" {...form.register('maintenanceDate')} disabled={isEditMode} />
                  {form.formState.errors.maintenanceDate && <p className="text-xs text-destructive mt-1">{form.formState.errors.maintenanceDate.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Loại bảo trì <span className="text-destructive">*</span></label>
                  <Select {...form.register('maintenanceType')} disabled={isEditMode}>
                    <option value="SCHEDULED">Định kỳ</option>
                    <option value="AD_HOC">Đột xuất</option>

                  </Select>
                </div>
                {!isEditMode && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Kết quả <span className="text-destructive">*</span></label>
                    <Select {...form.register('resultStatus')}>
                      <option value="GOOD">Tốt</option>
                      <option value="RECOMMEND_LIQUIDATION">Đề nghị thanh lý</option>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border/50 pb-2">NỘI DUNG & CHI PHÍ</h3>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Nội dung thực hiện <span className="text-destructive">*</span></label>
                  <textarea
                    {...form.register('content')}
                    rows={4}
                    placeholder="Mô tả chi tiết các công việc đã thực hiện..."
                    className="flex min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                  />
                  {form.formState.errors.content && <p className="text-xs text-destructive mt-1">{form.formState.errors.content.message}</p>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Ngày bảo trì tiếp theo</label>
                    <Input type="date" {...form.register('nextMaintenanceDate')} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Ghi chú</label>
                  <textarea
                    {...form.register('note')}
                    rows={2}
                    placeholder="Thông tin bổ sung..."
                    className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                  />
                </div>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>Hủy bỏ</Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              <FloppyDisk size={16} weight="bold" />
              {isSubmitting ? 'Đang lưu...' : 'Lưu phiếu'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} size="lg">
        <ModalHeader>
          <ModalTitle>Chi tiết phiếu bảo trì</ModalTitle>
        </ModalHeader>
        <ModalBody>
          {selectedRecord && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-muted/20 p-4 rounded-xl border border-border/50">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Mã phiếu</p>
                  <p className="font-bold">{selectedRecord.maintenanceCode}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Kết quả</p>
                  {renderStatusBadge(selectedRecord.resultStatus || '')}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Thiết bị</p>
                  <p className="font-medium">{selectedRecord.asset?.assetName ?? '--'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Phòng</p>
                  <p className="font-medium">{selectedRecord.asset?.room?.roomCode ?? '--'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Loại bảo trì</p>
                  <p className="font-medium">{translateType(selectedRecord.maintenanceType)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Ngày thực hiện</p>
                  <p className="font-medium">{new Date(selectedRecord.maintenanceDate).toLocaleDateString('vi-VN')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Người thực hiện</p>
                  <p className="font-medium">{selectedRecord.performedByUser?.fullName ?? `#${selectedRecord.performedBy}`}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Chi phí</p>
                  <p className="font-medium">{selectedRecord.cost ? Number(selectedRecord.cost).toLocaleString('vi-VN') + ' VNĐ' : '--'}</p>
                </div>
              </div>

              <div className="rounded-xl bg-muted/30 p-4 ring-1 ring-inset ring-border">
                <p className="text-xs font-bold text-foreground mb-2">Nội dung thực hiện</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{selectedRecord.content}</p>
              </div>

              {selectedRecord.materialNote && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Vật tư</p>
                  <p className="text-sm font-medium">{selectedRecord.materialNote}</p>
                </div>
              )}

              {selectedRecord.note && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Ghi chú</p>
                  <p className="text-sm">{selectedRecord.note}</p>
                </div>
              )}

              {selectedRecord.nextMaintenanceDate && (
                <div className={`rounded-xl p-4 ring-1 ring-inset ${
                  new Date(selectedRecord.nextMaintenanceDate) <= now
                    ? 'bg-rose-50 ring-rose-200/50 text-rose-700'
                    : new Date(selectedRecord.nextMaintenanceDate) <= in30Days
                    ? 'bg-amber-50 ring-amber-200/50 text-amber-700'
                    : 'bg-emerald-50 ring-emerald-200/50 text-emerald-700'
                }`}>
                  <p className="text-xs font-bold">Bảo trì tiếp theo</p>
                  <p className="text-sm font-semibold mt-1">
                    {new Date(selectedRecord.nextMaintenanceDate).toLocaleDateString('vi-VN')}
                    {new Date(selectedRecord.nextMaintenanceDate) <= now && ' (Quá hạn!)'}
                    {new Date(selectedRecord.nextMaintenanceDate) > now && new Date(selectedRecord.nextMaintenanceDate) <= in30Days && ' (Sắp đến hạn)'}
                  </p>
                </div>
              )}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <div className="flex w-full justify-end gap-3">
            <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>Đóng</Button>
            {selectedRecord && selectedRecord.status === 'PENDING' && (
              <>
                <Button variant="destructive" onClick={() => { handleCancel(selectedRecord.id); setIsDetailModalOpen(false); }}>Hủy phiếu</Button>
                <Button onClick={() => { handleStart(selectedRecord.id); setIsDetailModalOpen(false); }}>Bắt đầu bảo trì</Button>
              </>
            )}
            {selectedRecord && selectedRecord.status === 'IN_PROGRESS' && (
              <>
                <Button variant="destructive" onClick={() => { handleCancel(selectedRecord.id); setIsDetailModalOpen(false); }}>Hủy phiếu</Button>
                <Button onClick={() => { setSelectedRecord(selectedRecord); setIsCompleteModalOpen(true); setIsDetailModalOpen(false); }} className="bg-emerald-600 hover:bg-emerald-500 text-white">Xác nhận hoàn tất</Button>
              </>
            )}
          </div>
        </ModalFooter>
      </Modal>

      <Modal isOpen={isCompleteModalOpen} onClose={() => setIsCompleteModalOpen(false)} size="sm">
        <ModalHeader>
          <ModalTitle>Hoàn tất phiếu bảo trì</ModalTitle>
        </ModalHeader>
        <form onSubmit={handleComplete}>
          <ModalBody className="space-y-4">
            <p className="text-sm text-muted-foreground">Vui lòng chọn kết quả sau khi bảo trì để hệ thống tự động mở khóa tài sản.</p>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Kết quả <span className="text-destructive">*</span></label>
              <Select name="resultStatus" required value={completeResultStatus} onChange={(e) => setCompleteResultStatus(e.target.value)}>
                <option value="GOOD">Tốt (Đã sửa xong)</option>
                <option value="RECOMMEND_LIQUIDATION">Đề nghị thanh lý (Hỏng nặng)</option>
              </Select>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => setIsCompleteModalOpen(false)}>Hủy</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {isSubmitting ? 'Đang xử lý...' : 'Xác nhận hoàn tất'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
