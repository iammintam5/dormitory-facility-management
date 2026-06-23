import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MagnifyingGlass, 
  Plus, 
  ArrowsClockwise, 
  Eye, 
  Printer, 
  DotsThree,
  CaretLeft,
  CaretRight,
  ListChecks,
  CheckCircle,
  Clock,
  WarningCircle,
  X,
  FileText,
  Spinner
} from '@phosphor-icons/react';
import { CouncilMemberSelect, CouncilMemberState } from '../../components/council/CouncilMemberSelect';
import { createInventoryCheck, getInventoryCheck, saveInventoryCheckItems, completeInventoryCheck } from '../../services/inventory-checks';
import { getRooms } from '../../services/locations';
import { formatDateOnly, formatDateTime } from '../../lib/date';
import { useToast } from '../../toast/toast-context';
import { InventoryCheck } from '../../types/inventory-checks';
import { Room } from '../../types/locations';
import { InventoryCheckStatusBadge } from '../../components/inventory-checks/InventoryCheckStatusBadge';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { PageHeader } from '../../components/ui/PageHeader';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../components/ui/Table';
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter } from '../../components/ui/Modal';
import { useAuth } from '../../auth/auth-context';

// Dummy data matching the screenshot
const inventoryData = [
  { id: 1, code: 'KK2024-05', name: 'Kiểm kê định kỳ Quý I/2024', building: 'A, B, C', fromDate: '01/05/2024', toDate: '05/05/2024', status: 'Hoàn thành', total: '1.250', checked: '1.250', diff: 5, creator: 'Nguyễn Văn A' },
  { id: 2, code: 'KK2024-04', name: 'Kiểm kê định kỳ Quý I/2024', building: 'A, B, C', fromDate: '15/02/2024', toDate: '20/02/2024', status: 'Hoàn thành', total: '1.230', checked: '1.230', diff: 2, creator: 'Nguyễn Văn A' },
  { id: 3, code: 'KK2024-03', name: 'Kiểm kê toàn bộ năm 2023', building: 'A, B, C', fromDate: '01/12/2023', toDate: '10/12/2023', status: 'Hoàn thành', total: '1.210', checked: '1.210', diff: 8, creator: 'Trần Văn K' },
  { id: 4, code: 'KK2024-02', name: 'Kiểm kê định kỳ Quý IV/2023', building: 'B, C', fromDate: '01/11/2023', toDate: '05/11/2023', status: 'Đang thực hiện', total: '840', checked: '620', diff: 0, creator: 'Trần Văn K' },
  { id: 5, code: 'KK2024-01', name: 'Kiểm kê định kỳ Quý III/2023', building: 'A, B', fromDate: '01/08/2023', toDate: '05/08/2023', status: 'Đang thực hiện', total: '780', checked: '300', diff: 0, creator: 'Nguyễn Văn A' },
  { id: 6, code: 'KK2023-02', name: 'Kiểm kê bổ sung Khu C', building: 'C', fromDate: '15/06/2023', toDate: '16/06/2023', status: 'Chưa thực hiện', total: '210', checked: '0', diff: 0, creator: 'Nguyễn Văn A' },
  { id: 7, code: 'KK2023-01', name: 'Kiểm kê định kỳ Quý II/2023', building: 'A, B', fromDate: '01/05/2023', toDate: '05/05/2023', status: 'Chưa thực hiện', total: '760', checked: '0', diff: 0, creator: 'Trần Văn K' },
];

export function InventoryChecksManagementPage() {
  const [activeTab, setActiveTab] = useState('DANH SÁCH ĐỢT KIỂM KÊ');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailCheckId, setDetailCheckId] = useState<number | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  
  // Filter states
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('Tất cả');
  const [yearFilter, setYearFilter] = useState('Tất cả');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  
  const navigate = useNavigate();

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
  const { user } = useAuth();
  const { showToast } = useToast();
  const basePath = user?.role === 'ADMIN' ? '/admin' : '/manager';

  // Extract unique years from inventoryData
  const yearOptions = useMemo(() => {
    const years = [...new Set(inventoryData.map(item => item.fromDate.split('/')[2]))];
    return years.sort((a, b) => Number(b) - Number(a));
  }, []);

  // Filtered data based on all filter criteria
  const filteredData = useMemo(() => {
    return inventoryData.filter(item => {
      // Search keyword
      if (searchKeyword) {
        const kw = searchKeyword.toLowerCase();
        const matchCode = item.code.toLowerCase().includes(kw);
        const matchName = item.name.toLowerCase().includes(kw);
        const matchCreator = item.creator.toLowerCase().includes(kw);
        if (!(matchCode || matchName || matchCreator)) return false;
      }
      
      // Status filter
      if (statusFilter !== 'Tất cả' && item.status !== statusFilter) return false;
      
      // Year filter
      if (yearFilter !== 'Tất cả') {
        const fromYear = item.fromDate.split('/')[2];
        const toYear = item.toDate.split('/')[2];
        if (fromYear !== yearFilter && toYear !== yearFilter) return false;
      }
      
      // Date range filter
      if (fromDate && toDate) {
        const parseDate = (dateStr: string) => {
          const [d, m, y] = dateStr.split('/');
          return `${y}-${m}-${d}`;
        };
        const itemFromDate = parseDate(item.fromDate);
        const itemToDate = parseDate(item.toDate);
        const rangeFrom = fromDate;
        const rangeTo = toDate;
        if (itemToDate < rangeFrom || itemFromDate > rangeTo) return false;
      }
      
      return true;
    });
  }, [searchKeyword, statusFilter, yearFilter, fromDate, toDate]);

  // Summary counts from all data (unfiltered)
  const summaryCounts = useMemo(() => {
    const total = inventoryData.length;
    const completed = inventoryData.filter(i => i.status === 'Hoàn thành').length;
    const inProgress = inventoryData.filter(i => i.status === 'Đang thực hiện').length;
    const notStarted = inventoryData.filter(i => i.status === 'Chưa thực hiện').length;
    const totalDiff = inventoryData.reduce((sum, i) => sum + i.diff, 0);
    return { total, completed, inProgress, notStarted, totalDiff };
  }, []);

  const completedPercent = summaryCounts.total > 0 
    ? ((summaryCounts.completed / summaryCounts.total) * 100).toFixed(2) 
    : '0.00';
  const inProgressPercent = summaryCounts.total > 0 
    ? ((summaryCounts.inProgress / summaryCounts.total) * 100).toFixed(2) 
    : '0.00';
  const notStartedPercent = summaryCounts.total > 0 
    ? ((summaryCounts.notStarted / summaryCounts.total) * 100).toFixed(2) 
    : '0.00';

  const handleResetFilters = () => {
    setSearchKeyword('');
    setStatusFilter('Tất cả');
    setYearFilter('Tất cả');
    setFromDate('');
    setToDate('');
  };

  return (
    <div className="space-y-6 mx-auto max-w-7xl pb-10">
      <PageHeader 
        title="Kiểm kê tài sản" 
        breadcrumbs={[
          { label: 'Nghiệp vụ', href: '#' },
          { label: 'Kiểm kê tài sản' }
        ]}
        actions={
          <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
            <Plus size={16} weight="bold" />
            Tạo phiếu kiểm kê
          </Button>
        }
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0">
              <ListChecks size={24} weight="duotone" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-0.5">Tổng số đợt</p>
              <p className="text-2xl font-bold text-foreground">{summaryCounts.total}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Tất cả thời gian</p>
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
              <p className="text-2xl font-bold text-foreground">{summaryCounts.completed}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">{completedPercent}%</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
              <Clock size={24} weight="duotone" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-0.5">Đang thực hiện</p>
              <p className="text-2xl font-bold text-foreground">{summaryCounts.inProgress}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">{inProgressPercent}%</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 shrink-0">
              <WarningCircle size={24} weight="duotone" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-0.5">Chưa thực hiện</p>
              <p className="text-2xl font-bold text-foreground">{summaryCounts.notStarted}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">{notStartedPercent}%</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-600 shrink-0">
              <FileText size={24} weight="duotone" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-0.5">Chênh lệch xử lý</p>
              <p className="text-2xl font-bold text-foreground">{summaryCounts.totalDiff}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">Trong 2 đợt gần nhất</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-5 flex flex-wrap gap-4 items-end">
          <div className="w-full md:w-64">
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Từ khóa</label>
            <div className="relative">
              <Input placeholder="Tìm theo mã đợt, ghi chú..." className="pl-9" 
                value={searchKeyword}
                onChange={e => setSearchKeyword(e.target.value)}
              />
              <MagnifyingGlass size={16} className="absolute left-3 top-2.5 text-muted-foreground" />
            </div>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Trạng thái</label>
            <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option>Tất cả</option>
              <option>Hoàn thành</option>
              <option>Đang thực hiện</option>
              <option>Chưa thực hiện</option>
            </Select>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Năm</label>
            <Select value={yearFilter} onChange={e => setYearFilter(e.target.value)}>
              <option>Tất cả</option>
              {yearOptions.map(y => (
                <option key={y}>{y}</option>
              ))}
            </Select>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Từ ngày</label>
            <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Đến ngày</label>
            <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
          </div>
          <Button variant="outline" className="gap-2" onClick={handleResetFilters}>
            <ArrowsClockwise size={16} weight="bold" />
            Làm mới
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/50 overflow-hidden">
        <div className="flex items-center gap-6 border-b border-border/50 px-6 bg-muted/20">
          {['DANH SÁCH ĐỢT KIỂM KÊ', 'LỊCH SỬ KIỂM KÊ'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 text-sm font-bold tracking-wider transition-colors border-b-2 ${
                activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Mã đợt kiểm kê</TableHead>
                <TableHead>Tên đợt kiểm kê</TableHead>
                <TableHead>Khu nhà</TableHead>
                <TableHead>Từ ngày</TableHead>
                <TableHead>Đến ngày</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-center">Tổng SL thiết bị</TableHead>
                <TableHead className="text-center">Đã kiểm kê</TableHead>
                <TableHead className="text-center">Chênh lệch</TableHead>
                <TableHead>Người tạo</TableHead>
                <TableHead className="text-center">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((item) => (
                <TableRow key={item.id} className={item.id === 3 ? 'bg-primary/5' : ''}>
                  <TableCell className="pl-6 font-bold text-foreground">{item.code}</TableCell>
                  <TableCell className={`font-medium ${item.id === 3 ? 'text-primary' : ''}`}>{item.name}</TableCell>
                  <TableCell className={item.id === 3 ? 'text-primary font-medium' : 'text-muted-foreground'}>{item.building}</TableCell>
                  <TableCell className="tabular-nums">{item.fromDate}</TableCell>
                  <TableCell className="tabular-nums">{item.toDate}</TableCell>
                  <TableCell>
                    <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold ${
                      item.status === 'Hoàn thành' ? 'bg-emerald-100 text-emerald-700' :
                      item.status === 'Đang thực hiện' ? 'bg-amber-100 text-amber-700' :
                      'bg-rose-100 text-rose-700'
                    }`}>
                      {item.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-center tabular-nums">{item.total}</TableCell>
                  <TableCell className="text-center tabular-nums">{item.checked}</TableCell>
                  <TableCell className={`text-center font-bold tabular-nums ${item.diff > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {item.diff > 0 ? item.diff : '-'}
                  </TableCell>
                  <TableCell className="font-medium">{item.creator}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <Button variant="ghost" size="icon" title="Xem" onClick={() => { setDetailCheckId(item.id); setIsDetailModalOpen(true); }}>
                        <Eye size={16} className="text-primary" />
                      </Button>
                      {item.status !== 'Chưa thực hiện' && (
                        <Button variant="ghost" size="icon" title="In" onClick={() => navigate(`${basePath}/inventory-checks/${item.id}/print`)}>
                          <Printer size={16} className="text-primary" />
                        </Button>
                      )}
                      <div className="relative">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          title="Thêm thao tác"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === item.id ? null : item.id);
                          }}
                        >
                          <DotsThree size={20} className="text-muted-foreground" />
                        </Button>
                        {openMenuId === item.id && (
                          <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-xl border border-border/50 bg-popover shadow-lg">
                            <div className="py-1.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(null);
                                  setDetailCheckId(item.id);
                                  setIsDetailModalOpen(true);
                                }}
                                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-foreground hover:bg-muted/50"
                              >
                                <Eye size={16} />
                                Xem chi tiết
                              </button>
                              {item.status !== 'Chưa thực hiện' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(null);
                                    navigate(`${basePath}/inventory-checks/${item.id}/print`);
                                  }}
                                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-foreground hover:bg-muted/50"
                                >
                                  <Printer size={16} />
                                  In phiếu
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="px-6 py-4 border-t border-border/50 flex items-center justify-between text-sm text-muted-foreground bg-muted/30">
          <div>Hiển thị 1 đến {filteredData.length} của {filteredData.length} đợt kiểm kê</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled className="gap-1">
              <CaretLeft size={16} />
            </Button>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground shadow">
              1
            </div>
            <Button variant="outline" size="sm" disabled className="gap-1">
              <CaretRight size={16} />
            </Button>
            <Select className="ml-2 h-8 text-sm">
              <option>10 / trang</option>
            </Select>
          </div>
        </div>
      </Card>

      <Card className="border-border/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">TỔNG HỢP CHÊNH LỆCH (2 ĐỢT GẦN NHẤT)</h2>
            <Button variant="outline" size="sm" className="gap-2">
              <FileText size={16} />
              Xem chi tiết báo cáo
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-muted/30 border border-border/50 rounded-xl p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Tổng số thiết bị</p>
              <p className="text-2xl font-bold text-foreground">1.630</p>
            </div>
            <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 rounded-xl p-4">
              <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 mb-2">Khớp đúng</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-500">1.615 <span className="text-sm font-semibold text-emerald-500 dark:text-emerald-400/80">(98.47%)</span></p>
            </div>
            <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 rounded-xl p-4">
              <p className="text-xs font-semibold text-blue-800 dark:text-blue-400 mb-2">Thừa</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-500">9 <span className="text-sm font-semibold text-blue-500 dark:text-blue-400/80">(0.55%)</span></p>
            </div>
            <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900 rounded-xl p-4">
              <p className="text-xs font-semibold text-rose-800 dark:text-rose-400 mb-2">Thiếu</p>
              <p className="text-2xl font-bold text-rose-600 dark:text-rose-500">6 <span className="text-sm font-semibold text-rose-500 dark:text-rose-400/80">(0.98%)</span></p>
            </div>
            <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900 rounded-xl p-4">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-400 mb-2">Hỏng</p>
              <p className="text-2xl font-bold text-amber-500">4 <span className="text-sm font-semibold text-amber-400 dark:text-amber-500/80">(0.25%)</span></p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Modal */}
      <CreateInventoryCheckModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        basePath={basePath}
      />

      {/* Detail Modal */}
      <DetailInventoryCheckModal
        checkId={detailCheckId}
        isOpen={isDetailModalOpen}
        onClose={() => { setIsDetailModalOpen(false); setDetailCheckId(null); }}
        basePath={basePath}
      />

    </div>
  );
}

function CreateInventoryCheckModal({ isOpen, onClose, basePath }: { isOpen: boolean; onClose: () => void; basePath: string }) {
  const { showToast } = useToast();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomId, setRoomId] = useState('');
  const [checkDate, setCheckDate] = useState(new Date().toISOString().slice(0, 10));
  const [generalNote, setGeneralNote] = useState('');
  const [members, setMembers] = useState<CouncilMemberState[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setRoomId('');
      setCheckDate(new Date().toISOString().slice(0, 10));
      setGeneralNote('');
      setMembers([]);
      setErrorMessage('');
      getRooms().then(setRooms).catch(() => showToast('Không thể tải danh sách phòng.', 'error'));
    }
  }, [isOpen, showToast]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!roomId) { showToast('Vui lòng chọn phòng kiểm kê.', 'error'); return; }
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const record = await createInventoryCheck({
        roomId: Number(roomId),
        checkDate,
        generalNote: generalNote.trim() || undefined,
      });
      showToast('Tạo phiếu kiểm kê thành công.', 'success');
      onClose();
      setTimeout(() => navigate(`${basePath}/inventory-checks/${record.id}/print`), 100);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể tạo phiếu kiểm kê.';
      setErrorMessage(message);
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader>
        <ModalTitle>Tạo phiếu kiểm kê</ModalTitle>
      </ModalHeader>
      <form onSubmit={handleSubmit}>
        <ModalBody className="space-y-5">
          {errorMessage && (
            <div className="rounded-md bg-destructive/15 p-3 text-sm font-medium text-destructive border border-destructive/20">
              {errorMessage}
            </div>
          )}
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Phòng kiểm kê <span className="text-destructive">*</span></label>
              <Select value={roomId} onChange={(event) => setRoomId(event.target.value)} disabled={isSubmitting}>
                <option value="">Chọn phòng</option>
                {rooms.map((room) => <option key={room.id} value={room.id}>{room.roomCode}</option>)}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Ngày kiểm kê <span className="text-destructive">*</span></label>
              <Input type="date" value={checkDate} onChange={(event) => setCheckDate(event.target.value)} disabled={isSubmitting} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Ghi chú chung</label>
            <textarea 
              value={generalNote} 
              onChange={(event) => setGeneralNote(event.target.value)} 
              className="flex min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 resize-none" 
              disabled={isSubmitting} 
              placeholder="Nhập ghi chú hoặc lý do kiểm kê (nếu có)..."
            />
          </div>
          <div className="space-y-3 rounded-xl border border-border/50 bg-muted/20 p-5">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Hội đồng kiểm kê</h3>
              <p className="text-xs text-muted-foreground mt-1">Tùy chọn: Thêm các thành viên tham gia vào buổi kiểm kê.</p>
            </div>
            <CouncilMemberSelect members={members} onChange={setMembers} disabled={isSubmitting} />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="outline" onClick={onClose}>Hủy</Button>
          <Button type="submit" disabled={isSubmitting || !roomId}>
            {isSubmitting ? <><Spinner className="mr-2 animate-spin" /> Đang tạo...</> : 'Tạo phiếu kiểm kê'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

function DetailInventoryCheckModal({ checkId, isOpen, onClose, basePath }: { checkId: number | null; isOpen: boolean; onClose: () => void; basePath: string }) {
  const { showToast } = useToast();
  const [inventoryCheck, setInventoryCheck] = useState<InventoryCheck | null>(null);
  const [draftItems, setDraftItems] = useState<Record<number, { actualQuantity: number; actualCondition: string; note: string }>>({});
  const [generalNote, setGeneralNote] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || checkId === null) return;
    loadCheck(checkId);
  }, [isOpen, checkId]);

  async function loadCheck(id: number) {
    setIsLoading(true);
    setErrorMessage('');
    try {
      try {
        const response = await getInventoryCheck(id);
        setInventoryCheck(response);
      setGeneralNote(response.generalNote ?? '');
      setDraftItems(
        Object.fromEntries(
          response.inventoryCheckItems.map((item) => [
            item.id,
            {
              actualQuantity: item.actualQuantity,
              actualCondition: item.actualCondition ?? '',
              note: item.note ?? '',
            },
          ]),
        ),
      );      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Không thể tải phiếu kiểm kê.');
        setInventoryCheck(null);
      } finally {
        setIsLoading(false);
      }
  }

  function updateDraft(itemId: number, field: 'actualQuantity' | 'actualCondition' | 'note', value: string | number) {
    setDraftItems((current) => ({
      ...current,
      [itemId]: {
        ...(current[itemId] || { actualQuantity: 0, actualCondition: '', note: '' }),
        [field]: value,
      },
    }));
  }

  async function saveResults() {
    if (!inventoryCheck) return;
    setIsSubmitting(true);
    try {
      const rows = inventoryCheck.inventoryCheckItems.map((item) => {
        const draft = draftItems[item.id];
        return {
          itemId: item.id,
          actualQuantity: draft?.actualQuantity ?? item.actualQuantity,
          actualCondition: (draft?.actualCondition ?? item.actualCondition ?? '').trim() || undefined,
          note: (draft?.note ?? item.note ?? '').trim() || undefined,
        };
      });
      await saveInventoryCheckItems(inventoryCheck.id, rows);
      showToast('Đã lưu kết quả kiểm kê.');
      await loadCheck(inventoryCheck.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể lưu kết quả kiểm kê.';
      setErrorMessage(message);
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function completeCheck() {
    if (!inventoryCheck) return;
    setIsSubmitting(true);
    try {
      await completeInventoryCheck(inventoryCheck.id, generalNote.trim() || undefined);
      showToast('Đã hoàn tất phiếu kiểm kê.');
      await loadCheck(inventoryCheck.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể hoàn tất phiếu kiểm kê.';
      setErrorMessage(message);
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  const isDraft = inventoryCheck?.status === 'DRAFT';

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="full" className="max-w-5xl">
      <ModalHeader>
        <ModalTitle>
          {isLoading ? 'Đang tải...' : inventoryCheck ? `${inventoryCheck.inventoryCode} - ${inventoryCheck.room?.roomCode ?? ''}` : 'Chi tiết phiếu kiểm kê'}
        </ModalTitle>
      </ModalHeader>
      <ModalBody>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size={32} className="animate-spin text-primary" />
          </div>
        ) : errorMessage ? (
          <div className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive font-medium">{errorMessage}</div>
        ) : inventoryCheck ? (
          <div className="space-y-6">
            {/* Header Info */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-muted/20 rounded-xl border border-border/50">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{inventoryCheck.inventoryCode}</p>
                <p className="mt-1 text-lg font-bold text-foreground">Phiếu kiểm kê phòng {inventoryCheck.room?.roomCode ?? '--'}</p>
                <p className="text-sm text-muted-foreground">Ngày {formatDateOnly(inventoryCheck.checkDate)} - {inventoryCheck.checkedByUser.fullName}</p>
              </div>
              <div className="flex items-center gap-3">
                <InventoryCheckStatusBadge status={inventoryCheck.status} />
                <Button size="sm" variant="outline" onClick={() => navigate(`${basePath}/inventory-checks/${inventoryCheck.id}/print`)} className="gap-2">
                  <Printer size={14} /> In
                </Button>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <InfoBox label="Phòng" value={inventoryCheck.room?.roomCode ?? '--'} />
              <InfoBox label="Người kiểm kê" value={`${inventoryCheck.checkedByUser.fullName}`} />
              <InfoBox label="Ngày tạo" value={formatDateTime(inventoryCheck.createdAt)} />
              <InfoBox label="Cập nhật" value={formatDateTime(inventoryCheck.completedAt ?? inventoryCheck.updatedAt)} />
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto rounded-lg border border-border/50">
              <table className="min-w-full divide-y divide-border/50 text-sm">
                <thead className="bg-muted/30 text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Tài sản</th>
                    <th className="px-4 py-3 font-semibold text-center">SL hệ thống</th>
                    <th className="px-4 py-3 font-semibold text-center">SL thực tế</th>
                    <th className="px-4 py-3 font-semibold text-center">Chênh lệch</th>
                    <th className="px-4 py-3 font-semibold">Tình trạng</th>
                    <th className="px-4 py-3 font-semibold">Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {inventoryCheck.inventoryCheckItems.map((item) => {
                    const draft = draftItems[item.id];
                    const actualQty = draft?.actualQuantity ?? item.actualQuantity;
                    const actualCond = draft?.actualCondition ?? item.actualCondition ?? '';
                    const note = draft?.note ?? item.note ?? '';
                    const diff = actualQty - item.systemQuantity;
                    const highlight = diff !== 0 || isPoorCondition(actualCond);
                    return (
                      <tr key={item.id} className={highlight ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-foreground">{item.asset.assetName}</p>
                          <p className="text-xs text-muted-foreground">{item.asset.assetCode}</p>
                        </td>
                        <td className="px-4 py-3 text-center tabular-nums">{item.systemQuantity}</td>
                        <td className="px-4 py-3 text-center">
                          {isDraft ? (
                            <input type="number" min={0} value={actualQty} onChange={(e) => updateDraft(item.id, 'actualQuantity', Number(e.target.value || 0))} className="w-20 rounded-md border border-input bg-background px-2.5 py-1.5 text-center text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                          ) : (
                            <span className="tabular-nums">{actualQty}</span>
                          )}
                        </td>
                        <td className={`px-4 py-3 text-center font-semibold tabular-nums ${diff !== 0 ? 'text-destructive' : 'text-muted-foreground'}`}>{diff}</td>
                        <td className="px-4 py-3">
                          {isDraft ? (
                            <input value={actualCond} onChange={(e) => updateDraft(item.id, 'actualCondition', e.target.value)} className="w-full min-w-[120px] rounded-md border border-input bg-background px-2.5 py-1.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                          ) : (
                            <span>{actualCond || '--'}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isDraft ? (
                            <input value={note} onChange={(e) => updateDraft(item.id, 'note', e.target.value)} className="w-full min-w-[140px] rounded-md border border-input bg-background px-2.5 py-1.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                          ) : (
                            <span>{note || '--'}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Note & Actions */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">Ghi chú tổng quan</label>
              <textarea
                value={generalNote}
                onChange={(e) => setGeneralNote(e.target.value)}
                disabled={!isDraft || isSubmitting}
                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-muted/50 resize-none"
                placeholder="Nhập ghi chú tổng quan..."
              />
            </div>

            {isDraft && (
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button onClick={() => saveResults()} disabled={isSubmitting} variant="outline" className="gap-2">
                  <Spinner size={14} className={isSubmitting ? 'animate-spin' : 'hidden'} />
                  Lưu kết quả
                </Button>
                <Button onClick={() => completeCheck()} disabled={isSubmitting} className="gap-2">
                  {isSubmitting ? <Spinner size={14} className="animate-spin" /> : null}
                  Hoàn tất kiểm kê
                </Button>
              </div>
            )}
          </div>
        ) : null}
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={onClose}>Đóng</Button>
      </ModalFooter>
    </Modal>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-background p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function isPoorCondition(value?: string | null) {
  if (!value) return false;
  const normalized = value.toLowerCase();
  return ['hỏng', 'xấu', 'xuống cấp', 'kém', 'mất', 'hong', 'xuong cap'].some((keyword) => normalized.includes(keyword));
}
