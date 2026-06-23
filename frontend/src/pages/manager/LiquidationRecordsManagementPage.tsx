import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { CouncilMemberSelect, CouncilMemberState } from '../../components/council/CouncilMemberSelect';
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select as UISelect } from '../../components/ui/Select';
import { PageHeader } from '../../components/ui/PageHeader';
import { useAuth } from '../../auth/auth-context';
import { createLiquidationRecord, getLiquidationRecords, submitApprovalLiquidation, approveLiquidation, rejectLiquidation, completeLiquidation, cancelLiquidation } from '../../services/liquidation-records';
import { getAssets } from '../../services/assets';
import { formatDateOnly } from '../../lib/date';
import { useToast } from '../../toast/toast-context';
import { Asset } from '../../types/assets';
import { LiquidationRecord, LiquidationStatus } from '../../types/liquidation-records';
import {
  Plus,
  ClipboardText,
  Clock,
  Gear,
  CheckCircle,
  XCircle,
  MagnifyingGlass,
  Funnel,
  ArrowsClockwise,
  DotsThree,
  ListDashes,
  FileText,
  DownloadSimple
} from '@phosphor-icons/react';

const createSchema = z.object({
  assetId: z.coerce.number().int().positive(),
  liquidationDate: z.string().min(1, 'Vui lòng chọn ngày thanh lý.'),
  assetCondition: z.string().min(5, 'Mô tả tình trạng tối thiểu 5 ký tự.'),
  reason: z.string().min(10, 'Lý do thanh lý tối thiểu 10 ký tự.'),
  estimatedRemainingValue: z.coerce.number().min(0).optional(),
  note: z.string().optional(),
});

type CreateFormValues = z.infer<typeof createSchema>;
type StatusView = 'ALL' | 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'REJECTED';

const pageSize = 5;

export function LiquidationRecordsManagementPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const basePath = user?.role === 'ADMIN' ? '/admin' : '/manager';

  const [assets, setAssets] = useState<Asset[]>([]);
  const [records, setRecords] = useState<LiquidationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [members, setMembers] = useState<CouncilMemberState[]>([]);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  const [statusView, setStatusView] = useState<StatusView>('ALL');
  const [statusFilter, setStatusFilter] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('');
  const [keyword, setKeyword] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

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
    void loadData();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [statusView, statusFilter, buildingFilter, keyword, fromDate, toDate]);

  async function loadData() {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const [assetResponse, liquidationResponse] = await Promise.all([
        getAssets({ pageSize: 100 }),
        getLiquidationRecords({ page: 1, pageSize: 100 }),
      ]);
      setAssets(assetResponse.items.map((a: any) => ({ id: parseInt(a.id), categoryId: 1, assetCode: a.assetCode, assetName: a.assetName, status: a.status, description: a.description, yearInUse: null, createdAt: a.createdAt })));
      setRecords(liquidationResponse.items);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể tải dữ liệu thanh lý.');
    } finally {
      setIsLoading(false);
    }
  }

  const buildingOptions = useMemo(() => {
    const unique = new Map<string, string>();
    records.forEach((record) => {
      const building = record.liquidationItems[0]?.asset.room?.floor?.building;
      if (building) unique.set(building.code, building.name);
    });
    return Array.from(unique.entries()).map(([code, name]) => ({ code, label: name }));
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const firstAsset = record.liquidationItems[0]?.asset;
      const buildingCode = firstAsset?.room?.floor?.building?.code ?? '';
      const haystack = [
        record.liquidationCode,
        record.note ?? '',
        record.createdByUser.fullName,
        ...record.liquidationItems.map((item) => `${item.reason} ${item.asset.assetCode} ${item.asset.assetName}`),
      ]
        .join(' ')
        .toLowerCase();

      const recordDate = record.liquidationDate;
      const matchesSearch = !keyword.trim() || haystack.includes(keyword.trim().toLowerCase());
      const matchesStatus = !statusFilter || record.status === statusFilter;
      const matchesBuilding = !buildingFilter || buildingCode === buildingFilter;
      const matchesFromDate = !fromDate || recordDate >= fromDate;
      const matchesToDate = !toDate || recordDate <= toDate;
      const matchesTab =
        statusView === 'ALL' ||
        (statusView === 'PENDING' && record.status === 'PENDING_APPROVAL') ||
        (statusView === 'PROCESSING' && ['DRAFT', 'APPROVED'].includes(record.status)) ||
        (statusView === 'COMPLETED' && record.status === 'COMPLETED') ||
        (statusView === 'REJECTED' && ['REJECTED', 'CANCELLED'].includes(record.status));

      return matchesSearch && matchesStatus && matchesBuilding && matchesFromDate && matchesToDate && matchesTab;
    });
  }, [records, keyword, statusFilter, buildingFilter, fromDate, toDate, statusView]);

  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, page]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));

  const overview = useMemo(() => {
    const total = records.length;
    const pending = records.filter((item) => item.status === 'PENDING_APPROVAL').length;
    const processing = records.filter((item) => ['DRAFT', 'APPROVED'].includes(item.status)).length;
    const completed = records.filter((item) => item.status === 'COMPLETED').length;
    const rejected = records.filter((item) => ['REJECTED', 'CANCELLED'].includes(item.status)).length;

    const totalEstimated = records.reduce((sum, record) => sum + sumEstimatedValue(record), 0);
    const recovered = records
      .filter((record) => record.status === 'COMPLETED')
      .reduce((sum, record) => sum + sumEstimatedValue(record), 0);
    const unrecovered = Math.max(totalEstimated - recovered, 0);

    return { total, pending, processing, completed, rejected, totalEstimated, recovered, unrecovered };
  }, [records]);

  const reasonStats = useMemo(() => {
    const groups = new Map<string, number>();
    records.flatMap((record) => record.liquidationItems).forEach((item) => {
      const group = normalizeReason(item.reason);
      groups.set(group, (groups.get(group) ?? 0) + 1);
    });
    return Array.from(groups.entries())
      .map(([label, count], index) => ({
        label,
        count,
        color: reasonPalette[index % reasonPalette.length],
      }))
      .sort((left, right) => right.count - left.count);
  }, [records]);

  const donutStyle = useMemo(() => {
    const total = reasonStats.reduce((sum, item) => sum + item.count, 0);
    if (total === 0) return { background: '#e2e8f0' };

    let current = 0;
    const slices = reasonStats.map((item) => {
      const start = current;
      const span = (item.count / total) * 100;
      current += span;
      return `${item.color} ${start}% ${current}%`;
    });

    return {
      background: `conic-gradient(${slices.join(', ')})`,
    };
  }, [reasonStats]);

  const submitCreate = createForm.handleSubmit(async (values) => {
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await createLiquidationRecord({
        assetId: values.assetId,
        liquidationDate: values.liquidationDate,
        assetCondition: values.assetCondition.trim(),
        reason: values.reason.trim(),
        estimatedRemainingValue: values.estimatedRemainingValue || undefined,
        note: values.note?.trim() || undefined,
      });
      showToast('Đã tạo đề xuất thanh lý.', 'success');
      createForm.reset({
        assetId: 0,
        liquidationDate: new Date().toISOString().slice(0, 10),
        assetCondition: '',
        reason: '',
        estimatedRemainingValue: undefined,
        note: '',
      });
      setMembers([]);
      setIsModalOpen(false);
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể tạo đề xuất thanh lý.';
      setErrorMessage(message);
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  });

  const clearFilters = () => {
    setStatusView('ALL');
    setStatusFilter('');
    setBuildingFilter('');
    setKeyword('');
    setFromDate('');
    setToDate('');
  };

  async function handleWorkflowAction(recordId: number, action: string) {
    try {
      const actionMap: Record<string, () => Promise<any>> = {
        'submit-approval': () => submitApprovalLiquidation(recordId),
        'approve': () => approveLiquidation(recordId),
        'reject': () => rejectLiquidation(recordId),
        'complete': () => completeLiquidation(recordId),
        'cancel': () => cancelLiquidation(recordId),
      };
      const actionLabels: Record<string, string> = {
        'submit-approval': 'Đã gửi đề xuất duyệt.',
        'approve': 'Đã duyệt hồ sơ thanh lý.',
        'reject': 'Đã từ chối hồ sơ thanh lý.',
        'complete': 'Đã hoàn tất thanh lý.',
        'cancel': 'Đã hủy hồ sơ thanh lý.',
      };
      if (actionMap[action]) {
        await actionMap[action]();
      }
      showToast(actionLabels[action] ?? 'Đã cập nhật trạng thái.', 'success');
      setOpenMenuId(null);
      await loadData();
    } catch (error) {
      showToast('Cập nhật trạng thái thất bại.', 'error');
    }
  }

  function getWorkflowActions(status: LiquidationStatus) {
    switch (status) {
      case 'DRAFT':
        return [{ action: 'submit-approval', label: 'Gửi duyệt', tone: 'text-blue-600 hover:bg-blue-50' }];
      case 'PENDING_APPROVAL':
        return [
          { action: 'approve', label: 'Duyệt', tone: 'text-emerald-600 hover:bg-emerald-50' },
          { action: 'reject', label: 'Từ chối', tone: 'text-rose-600 hover:bg-rose-50' },
        ];
      case 'APPROVED':
        return [{ action: 'complete', label: 'Hoàn tất', tone: 'text-emerald-600 hover:bg-emerald-50' }];
      default:
        return [];
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick() {
      setOpenMenuId(null);
    }
    if (openMenuId !== null) {
      window.addEventListener('click', handleClick, { once: true });
    }
    return () => window.removeEventListener('click', handleClick);
  }, [openMenuId]);

  return (
    <div className="space-y-6 mx-auto max-w-7xl pb-10">
      <PageHeader 
        title="Thanh lý thiết bị" 
        breadcrumbs={[
          { label: 'Nghiệp vụ', href: '#' },
          { label: 'Thanh lý thiết bị' }
        ]}
        actions={
          <Button onClick={() => setIsModalOpen(true)} className="gap-2">
            <Plus size={16} weight="bold" />
            Tạo đề xuất thanh lý
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Tổng số phiếu" value={overview.total} subtitle="Tất cả thời gian" tone="blue" icon={<ClipboardText size={28} weight="duotone" />} />
        <StatCard title="Chờ duyệt" value={overview.pending} subtitle={percentLabel(overview.pending, overview.total)} tone="amber" icon={<Clock size={28} weight="duotone" />} />
        <StatCard title="Đang xử lý" value={overview.processing} subtitle={percentLabel(overview.processing, overview.total)} tone="indigo" icon={<Gear size={28} weight="duotone" />} />
        <StatCard title="Đã thanh lý" value={overview.completed} subtitle={percentLabel(overview.completed, overview.total)} tone="emerald" icon={<CheckCircle size={28} weight="duotone" />} />
        <StatCard title="Đã từ chối" value={overview.rejected} subtitle={percentLabel(overview.rejected, overview.total)} tone="rose" icon={<XCircle size={28} weight="duotone" />} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <Card className="border-border/50">
            <CardContent className="p-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.3fr)_180px_140px_160px_160px]">
                <FilterField label="Tìm kiếm">
                  <div className="relative">
                    <Input
                      value={keyword}
                      onChange={(event) => setKeyword(event.target.value)}
                      placeholder="Nhập mã phiếu, lý do..."
                      className="pr-11"
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted-foreground">
                      <MagnifyingGlass size={16} />
                    </div>
                  </div>
                </FilterField>
                <FilterField label="Trạng thái">
                  <UISelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                    <option value="">Tất cả</option>
                    <option value="DRAFT">Bản nháp</option>
                    <option value="PENDING_APPROVAL">Chờ duyệt</option>
                    <option value="APPROVED">Đang xử lý</option>
                    <option value="COMPLETED">Đã thanh lý</option>
                    <option value="REJECTED">Đã từ chối</option>
                    <option value="CANCELLED">Đã hủy</option>
                  </UISelect>
                </FilterField>
                <FilterField label="Khu nhà">
                  <UISelect value={buildingFilter} onChange={(event) => setBuildingFilter(event.target.value)}>
                    <option value="">Tất cả</option>
                    {buildingOptions.map((building) => (
                      <option key={building.code} value={building.code}>
                        {building.label}
                      </option>
                    ))}
                  </UISelect>
                </FilterField>
                <FilterField label="Từ ngày">
                  <Input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
                </FilterField>
                <FilterField label="Đến ngày">
                  <Input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
                </FilterField>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
                <Button className="gap-2">
                  <Funnel size={16} weight="bold" />
                  Lọc
                </Button>
                <Button type="button" variant="outline" onClick={clearFilters} className="gap-2">
                  <ArrowsClockwise size={16} weight="bold" />
                  Làm mới
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 overflow-hidden">
            <div className="flex flex-wrap gap-3 border-b border-border/50 px-5 py-4 bg-muted/20">
              {[
                { key: 'ALL' as const, label: `Tất cả (${records.length})`, tone: 'text-foreground bg-muted hover:bg-muted/80' },
                { key: 'PENDING' as const, label: `Chờ duyệt (${overview.pending})`, tone: 'text-amber-700 bg-amber-100 hover:bg-amber-200/80' },
                { key: 'PROCESSING' as const, label: `Đang xử lý (${overview.processing})`, tone: 'text-indigo-700 bg-indigo-100 hover:bg-indigo-200/80' },
                { key: 'COMPLETED' as const, label: `Đã thanh lý (${overview.completed})`, tone: 'text-emerald-700 bg-emerald-100 hover:bg-emerald-200/80' },
                { key: 'REJECTED' as const, label: `Đã từ chối (${overview.rejected})`, tone: 'text-rose-700 bg-rose-100 hover:bg-rose-200/80' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusView(tab.key)}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                    statusView === tab.key ? tab.tone : 'bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {errorMessage ? (
              <div className="px-5 py-6 text-sm text-destructive font-medium">{errorMessage}</div>
            ) : isLoading ? (
              <div className="px-5 py-14 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                <ArrowsClockwise size={24} className="animate-spin text-primary" />
                Đang tải dữ liệu thanh lý...
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="px-5 py-14 text-center text-sm text-muted-foreground">Chưa có hồ sơ thanh lý phù hợp với bộ lọc hiện tại.</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-muted/30 text-left text-muted-foreground border-b border-border/50">
                      <tr>
                        <th className="px-5 py-4 font-semibold">STT</th>
                        <th className="px-5 py-4 font-semibold">Mã phiếu</th>
                        <th className="px-5 py-4 font-semibold">Ngày lập</th>
                        <th className="px-5 py-4 font-semibold">Khu nhà</th>
                        <th className="px-5 py-4 font-semibold">Lý do thanh lý</th>
                        <th className="px-5 py-4 text-center font-semibold">Số thiết bị</th>
                        <th className="px-5 py-4 text-right font-semibold">Giá trị còn lại (VNĐ)</th>
                        <th className="px-5 py-4 font-semibold">Trạng thái</th>
                        <th className="px-5 py-4 text-center font-semibold">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50 text-foreground">
                      {paginatedRecords.map((record, index) => {
                        const firstItem = record.liquidationItems[0];
                        const building = firstItem?.asset.room?.floor?.building?.name ?? '--';
                        return (
                          <tr key={record.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-5 py-4 text-muted-foreground">{(page - 1) * pageSize + index + 1}</td>
                            <td className="px-5 py-4">
                              <span className="font-semibold">{record.liquidationCode}</span>
                            </td>
                            <td className="px-5 py-4 tabular-nums">{formatDateOnly(record.liquidationDate)}</td>
                            <td className="px-5 py-4">{building}</td>
                            <td className="px-5 py-4">
                              <div className="max-w-[280px]">
                                <p className="line-clamp-2">{firstItem?.reason ?? record.note ?? '--'}</p>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-center font-semibold tabular-nums">{record.liquidationItems.length}</td>
                            <td className="px-5 py-4 text-right font-semibold tabular-nums">{formatCurrency(sumEstimatedValue(record))}</td>
                            <td className="px-5 py-4">
                              <Badge status={record.status} label={getLiquidationStatusLabel(record.status)} />
                            </td>
                            <td className="px-5 py-4 text-center relative">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                title="Thao tác khác"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(openMenuId === record.id ? null : record.id);
                                }}
                              >
                                <DotsThree size={20} weight="bold" />
                              </Button>
                              {openMenuId === record.id && (
                                <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-xl border border-border/50 bg-popover shadow-lg">
                                  <div className="py-1.5">
                                    {getWorkflowActions(record.status).map((act) => (
                                      act.action === 'reject' || act.action === 'cancel' ? (
                                        <button
                                          key={act.action}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (window.confirm(`Xác nhận ${act.label.toLowerCase()} hồ sơ ${record.liquidationCode}?`)) {
                                              handleWorkflowAction(record.id, act.action);
                                            }
                                          }}
                                          className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium ${act.tone}`}
                                        >
                                          {act.label}
                                        </button>
                                      ) : (
                                        <button
                                          key={act.action}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleWorkflowAction(record.id, act.action);
                                          }}
                                          className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium ${act.tone}`}
                                        >
                                          {act.label}
                                        </button>
                                      )
                                    ))}
                                    {record.status !== 'CANCELLED' && record.status !== 'COMPLETED' && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (window.confirm(`Xác nhận hủy hồ sơ ${record.liquidationCode}?`)) {
                                            handleWorkflowAction(record.id, 'cancel');
                                          }
                                        }}
                                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-rose-600 hover:bg-rose-50"
                                      >
                                        Hủy
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col gap-4 border-t border-border/50 px-5 py-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between bg-muted/10">
                  <div>
                    Hiển thị {(page - 1) * pageSize + 1} đến {Math.min(page * pageSize, filteredRecords.length)} của {filteredRecords.length} kết quả
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md border border-input bg-background px-3 py-1.5 text-foreground">{pageSize} / trang</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                      disabled={page === 1}
                    >
                      ‹
                    </Button>
                    {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                      <Button
                        key={pageNumber}
                        variant={pageNumber === page ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPage(pageNumber)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNumber}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                      disabled={page === totalPages}
                    >
                      ›
                    </Button>
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <AsideCard title="Thống kê theo lý do">
            <div className="flex items-center gap-4">
              <div className="relative h-28 w-28 shrink-0">
                <div className="h-full w-full rounded-full" style={donutStyle} />
                <div className="absolute inset-[22px] rounded-full bg-card" />
              </div>
              <div className="flex-1 space-y-2">
                {reasonStats.map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="font-medium text-muted-foreground">{item.label}</span>
                    </div>
                    <span className="font-semibold text-foreground">
                      {item.count} ({percentLabel(item.count, reasonStats.reduce((sum, entry) => sum + entry.count, 0))})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </AsideCard>

          <AsideCard title="Giá trị thanh lý">
            <div className="space-y-4">
              <ValueLine label="Tổng giá trị còn lại" value={formatCurrency(overview.totalEstimated)} tone="violet" />
              <ValueLine label="Đã thu hồi" value={formatCurrency(overview.recovered)} tone="emerald" />
              <ValueLine label="Chưa thu hồi" value={formatCurrency(overview.unrecovered)} tone="amber" />
            </div>
          </AsideCard>

          <AsideCard title="Thao tác nhanh">
            <div className="space-y-3">
              <QuickActionButton onClick={() => setIsModalOpen(true)} icon={<Plus size={16} weight="bold" />}>
                Tạo đề xuất thanh lý
              </QuickActionButton>
              <QuickActionLink to={`${basePath}/assets`} icon={<ListDashes size={16} weight="bold" />}>
                Danh sách thiết bị đề xuất
              </QuickActionLink>
              <QuickActionLink to={`${basePath}/damage-reports`} icon={<FileText size={16} weight="bold" />}>
                Báo cáo thanh lý
              </QuickActionLink>
              <Button 
                variant="outline" 
                className="w-full gap-2 justify-start"
                onClick={() => showToast('Tính năng xuất dữ liệu đang phát triển.', 'success')}
              >
                <DownloadSimple size={16} weight="bold" />
                Xuất dữ liệu
              </Button>
            </div>
          </AsideCard>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <ModalHeader>
          <ModalTitle>Tạo đề xuất thanh lý</ModalTitle>
        </ModalHeader>
        <form onSubmit={submitCreate}>
          <ModalBody className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="grid gap-4 md:grid-cols-2">
              <FilterField label="Tài sản cần thanh lý">
                <UISelect {...createForm.register('assetId', { valueAsNumber: true })}>
                  <option value={0}>-- Chọn tài sản --</option>
                  {assets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.assetCode} - {asset.assetName}
                    </option>
                  ))}
                </UISelect>
              </FilterField>
              <FilterField label="Ngày thanh lý">
                <Input type="date" {...createForm.register('liquidationDate')} />
              </FilterField>
            </div>

            <FilterField label="Tình trạng tài sản">
              <textarea 
                className="flex min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none" 
                {...createForm.register('assetCondition')} 
                placeholder="Mô tả tình trạng hư hỏng, hết khấu hao..."
              />
            </FilterField>

            <FilterField label="Lý do thanh lý">
              <textarea 
                className="flex min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none" 
                {...createForm.register('reason')} 
                placeholder="Nêu rõ lý do cần thanh lý thiết bị này..."
              />
            </FilterField>

            <div className="grid gap-4 md:grid-cols-2">
              <FilterField label="Giá trị còn lại ước tính (VNĐ)">
                <Input type="number" min={0} step="1000" {...createForm.register('estimatedRemainingValue', { valueAsNumber: true })} />
              </FilterField>
              <FilterField label="Ghi chú thêm">
                <Input type="text" {...createForm.register('note')} />
              </FilterField>
            </div>

            <div className="rounded-xl border border-border/50 bg-muted/20 p-5 mt-4">
              <h3 className="text-sm font-semibold text-foreground">Hội đồng thanh lý</h3>
              <p className="mt-1 text-xs text-muted-foreground">Có thể chọn trước thành viên hội đồng nếu hồ sơ cần trình duyệt ngay.</p>
              <div className="mt-4">
                <CouncilMemberSelect members={members} onChange={setMembers} disabled={isSubmitting} />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Đang tạo...' : 'Tạo đề xuất'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  tone,
  icon,
}: {
  title: string;
  value: number;
  subtitle: string;
  tone: 'blue' | 'amber' | 'indigo' | 'emerald' | 'rose';
  icon: ReactNode;
}) {
  const toneMap = {
    blue: 'bg-blue-500/10 text-blue-600',
    amber: 'bg-amber-500/10 text-amber-600',
    indigo: 'bg-indigo-500/10 text-indigo-600',
    emerald: 'bg-emerald-500/10 text-emerald-600',
    rose: 'bg-rose-500/10 text-rose-600',
  } as const;

  return (
    <Card className="border-border/50">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${toneMap[tone]}`}>{icon}</div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-4xl font-bold text-foreground tabular-nums">{value}</span>
              <span className="text-sm font-medium text-muted-foreground">phiếu</span>
            </div>
            <p className="mt-2 text-xs font-medium text-muted-foreground">{subtitle}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AsideCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm uppercase tracking-wider">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
}

function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function ValueLine({ label, value, tone }: { label: string; value: string; tone: 'violet' | 'emerald' | 'amber' }) {
  const tones = {
    violet: 'text-violet-600',
    emerald: 'text-emerald-600',
    amber: 'text-amber-600',
  } as const;

  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${tones[tone]}`}>{value}</p>
    </div>
  );
}

function QuickActionButton({
  children,
  icon,
  onClick,
}: {
  children: ReactNode;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <Button onClick={onClick} className="w-full justify-start gap-2 text-primary bg-primary/10 hover:bg-primary/20 hover:text-primary border-none">
      {icon}
      {children}
    </Button>
  );
}

function QuickActionLink({ to, children, icon }: { to: string; children: ReactNode; icon: ReactNode }) {
  return (
    <Button variant="outline" asChild className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground">
      <Link to={to}>
        {icon}
        {children}
      </Link>
    </Button>
  );
}

function sumEstimatedValue(record: LiquidationRecord) {
  return record.liquidationItems.reduce((sum, item) => sum + Number(item.estimatedRemainingValue ?? 0), 0);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('vi-VN').format(value);
}

function percentLabel(value: number, total: number) {
  if (!total) return '0.00%';
  return `${((value / total) * 100).toFixed(2)}%`;
}

function normalizeReason(reason: string) {
  const normalized = reason.toLowerCase();
  if (normalized.includes('hư hỏng') || normalized.includes('hu hong')) return 'Hỏng nặng';
  if (normalized.includes('hết niên hạn') || normalized.includes('het nien han')) return 'Hết hạn SD';
  if (normalized.includes('nâng cấp') || normalized.includes('nang cap')) return 'Nâng cấp';
  if (normalized.includes('thất lạc') || normalized.includes('that lac')) return 'Thất lạc';
  return 'Khác';
}

function getLiquidationStatusLabel(status: LiquidationStatus) {
  switch (status) {
    case 'DRAFT':
      return 'Bản nháp';
    case 'PENDING_APPROVAL':
      return 'Chờ duyệt';
    case 'APPROVED':
      return 'Đang xử lý';
    case 'COMPLETED':
      return 'Đã thanh lý';
    case 'REJECTED':
      return 'Đã từ chối';
    case 'CANCELLED':
      return 'Đã hủy';
    default:
      return status;
  }
}

const reasonPalette = ['#3B82F6', '#22C55E', '#F59E0B', '#A855F7', '#EF4444', '#94A3B8'];
