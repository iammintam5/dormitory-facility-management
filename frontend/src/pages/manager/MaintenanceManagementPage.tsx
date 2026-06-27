import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useToast } from '../../toast/toast-context';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { PageHeader } from '../../components/ui/PageHeader';
import { Pagination } from '../../components/ui/Pagination';
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
  FloppyDisk
} from '@phosphor-icons/react';
import { getMaintenanceRecords, createMaintenanceRecord, updateMaintenanceRecord, getMaintenancePlans } from '../../services/maintenance';
import { getAssets } from '../../services/assets';
import { getApiErrorMessage } from '../../lib/api-client';
import type { MaintenanceRecord, MaintenancePlan } from '../../types/maintenance';
import type { Asset } from '../../types/assets';

const recordSchema = z.object({
  planId: z.coerce.number().optional(),
  assetId: z.coerce.number().int().positive('Chọn tài sản.'),
  maintenanceDate: z.string().min(1, 'Chọn ngày bảo trì.'),
  maintenanceType: z.enum(['SCHEDULED', 'AD_HOC', 'AFTER_INVENTORY']),
  content: z.string().min(1, 'Nhập nội dung thực hiện.'),
  resultStatus: z.enum(['GOOD', 'NEED_MONITORING', 'NEED_REPAIR', 'RECOMMEND_LIQUIDATION']),
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
  const [selectedRecord, setSelectedRecord] = useState<MaintenanceRecord | null>(null);
  
  const [activeTab, setActiveTab] = useState('Tất cả');
  
  // Filter states
  const [searchKeyword, setSearchKeyword] = useState('');
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
          'Cần theo dõi': 'NEED_MONITORING',
          'Cần sửa chữa': 'NEED_REPAIR',
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
      if (searchKeyword) {
        const kw = searchKeyword.toLowerCase();
        const matchCode = record.maintenanceCode.toLowerCase().includes(kw);
        const matchAsset = record.asset?.assetName?.toLowerCase().includes(kw);
        const matchRoom = record.asset?.room?.roomCode?.toLowerCase().includes(kw);
        const matchBuilding = record.asset?.room?.floor?.building?.name?.toLowerCase().includes(kw);
        const matchTechnician = record.performedByUser?.fullName?.toLowerCase().includes(kw);
        if (!(matchCode || matchAsset || matchRoom || matchBuilding || matchTechnician)) return false;
      }
      
      return true;
    });
  }, [records, activeTab, searchKeyword, statusFilter, typeFilter]);

  const summaryCounts = useMemo(() => {
    return {
      total: records.length,
      good: records.filter(r => r.resultStatus === 'GOOD').length,
      needMonitor: records.filter(r => r.resultStatus === 'NEED_MONITORING').length,
      needRepair: records.filter(r => r.resultStatus === 'NEED_REPAIR').length,
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
          resultStatus: data.resultStatus,
          nextMaintenanceDate: data.nextMaintenanceDate || undefined,
          cost: Number.isNaN(data.cost) ? undefined : data.cost,
          materialNote: data.materialNote?.trim() || undefined,
          note: data.note?.trim() || undefined,
        });
        showToast('Cập nhật phiếu bảo trì thành công.', 'success');
      } else {
        await createMaintenanceRecord({
          ...data,
          planId: data.planId || undefined,
          nextMaintenanceDate: data.nextMaintenanceDate || undefined,
          cost: Number.isNaN(data.cost) ? undefined : data.cost,
          materialNote: data.materialNote?.trim() || undefined,
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

  function translateType(type: string) {
    switch (type) {
      case 'SCHEDULED': return 'Định kỳ';
      case 'AD_HOC': return 'Đột xuất';
      case 'AFTER_INVENTORY': return 'Sau kiểm kê';
      default: return type;
    }
  }

  function translateStatus(status: string) {
    switch (status) {
      case 'GOOD': return 'Tốt';
      case 'NEED_MONITORING': return 'Cần theo dõi';
      case 'NEED_REPAIR': return 'Cần sửa chữa';
      case 'RECOMMEND_LIQUIDATION': return 'Đề nghị thanh lý';
      default: return status;
    }
  }

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'GOOD': return <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-700">Tốt</span>;
      case 'NEED_MONITORING': return <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-700">Cần theo dõi</span>;
      case 'NEED_REPAIR': return <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-700">Cần sửa chữa</span>;
      case 'RECOMMEND_LIQUIDATION': return <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-700">Đề nghị thanh lý</span>;
      default: return null;
    }
  };

  const renderTypeBadge = (type: string) => {
    switch (type) {
      case 'SCHEDULED': return <span className="text-xs font-semibold text-emerald-600">Định kỳ</span>;
      case 'AD_HOC': return <span className="text-xs font-semibold text-amber-600">Đột xuất</span>;
      case 'AFTER_INVENTORY': return <span className="text-xs font-semibold text-blue-600">Sau kiểm kê</span>;
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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
            <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
              <Clock size={24} weight="duotone" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-0.5">Cần theo dõi</p>
              <p className="text-2xl font-bold text-foreground">{summaryCounts.needMonitor}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-600 shrink-0">
              <WarningCircle size={24} weight="duotone" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-0.5">Cần sửa chữa</p>
              <p className="text-2xl font-bold text-foreground">{summaryCounts.needRepair}</p>
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

      <Card className="border-border/50">
        <CardContent className="p-5 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Tìm kiếm</label>
            <div className="relative">
              <Input 
                placeholder="Mã phiếu, thiết bị, phòng..."
                className="pl-9"
                value={searchKeyword}
                onChange={e => setSearchKeyword(e.target.value)}
              />
              <MagnifyingGlass size={16} className="absolute left-3 top-2.5 text-muted-foreground" />
            </div>
          </div>
          <div className="w-full md:w-40">
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Kết quả</label>
            <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option>Tất cả</option>
              <option value="GOOD">Tốt</option>
              <option value="NEED_MONITORING">Cần theo dõi</option>
              <option value="NEED_REPAIR">Cần sửa chữa</option>
              <option value="RECOMMEND_LIQUIDATION">Đề nghị thanh lý</option>
            </Select>
          </div>
          <div className="w-full md:w-36">
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Loại bảo trì</label>
            <Select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option>Tất cả</option>
              <option value="SCHEDULED">Định kỳ</option>
              <option value="AD_HOC">Đột xuất</option>
              <option value="AFTER_INVENTORY">Sau kiểm kê</option>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button className="gap-2" onClick={() => loadRecords()}>
              <Funnel size={16} weight="bold" />
              Lọc
            </Button>
            <Button variant="outline" className="gap-2" onClick={handleResetFilters}>
              <ArrowsClockwise size={16} weight="bold" />
              Làm mới
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 overflow-hidden">
        <div className="flex items-center gap-6 border-b border-border/50 px-6 bg-muted/20 overflow-x-auto">
          {['Tất cả', 'Tốt', 'Cần theo dõi', 'Cần sửa chữa', 'Đề nghị thanh lý'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 text-sm font-bold tracking-wider transition-colors border-b-2 whitespace-nowrap ${
                activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
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
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-10 text-muted-foreground">Không có dữ liệu bảo trì</td>
                  </tr>
                ) : filteredRecords.map((record, idx) => (
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
                      <div className="flex items-center justify-center gap-1.5">
                        <Button variant="ghost" size="icon" onClick={() => openDetailModal(record)} title="Xem chi tiết">
                          <Eye size={16} className="text-primary" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEditModal(record)} title="Sửa">
                          <PencilSimple size={16} className="text-primary" />
                        </Button>
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
                  <Select {...form.register('assetId', { valueAsNumber: true })}>
                    <option value={0}>-- Chọn tài sản --</option>
                    {assets.map((asset) => (
                      <option key={asset.id} value={asset.id}>{asset.assetCode} - {asset.assetName}</option>
                    ))}
                  </Select>
                  {form.formState.errors.assetId && <p className="text-xs text-destructive mt-1">{form.formState.errors.assetId.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Kế hoạch bảo trì</label>
                  <Select {...form.register('planId', { valueAsNumber: true })}>
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
                  <Input type="date" {...form.register('maintenanceDate')} />
                  {form.formState.errors.maintenanceDate && <p className="text-xs text-destructive mt-1">{form.formState.errors.maintenanceDate.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Loại bảo trì <span className="text-destructive">*</span></label>
                  <Select {...form.register('maintenanceType')}>
                    <option value="SCHEDULED">Định kỳ</option>
                    <option value="AD_HOC">Đột xuất</option>
                    <option value="AFTER_INVENTORY">Sau kiểm kê</option>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Kết quả <span className="text-destructive">*</span></label>
                  <Select {...form.register('resultStatus')}>
                    <option value="GOOD">Tốt</option>
                    <option value="NEED_MONITORING">Cần theo dõi</option>
                    <option value="NEED_REPAIR">Cần sửa chữa</option>
                    <option value="RECOMMEND_LIQUIDATION">Đề nghị thanh lý</option>
                  </Select>
                </div>
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Ngày bảo trì tiếp theo</label>
                    <Input type="date" {...form.register('nextMaintenanceDate')} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Chi phí (VNĐ)</label>
                    <Input type="number" min={0} placeholder="VD: 500000" {...form.register('cost', { valueAsNumber: true })} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Vật tư</label>
                    <Input placeholder="Vật tư đã sử dụng" {...form.register('materialNote')} />
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
                  {renderStatusBadge(selectedRecord.resultStatus)}
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

              <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-200/50">
                <p className="text-xs font-bold text-slate-700 mb-2">Nội dung thực hiện</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedRecord.content}</p>
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
          <Button onClick={() => setIsDetailModalOpen(false)}>Đóng</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
