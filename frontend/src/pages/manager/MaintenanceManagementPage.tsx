import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useToast } from '../../toast/toast-context';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { PageHeader } from '../../components/ui/PageHeader';
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
  PencilSimple
} from '@phosphor-icons/react';

const ticketSchema = z.object({
  reportCode: z.string().min(1, 'Chọn mã báo hỏng.'),
  technician: z.string().min(1, 'Chọn kỹ thuật viên.'),
  createdDate: z.string().min(1, 'Chọn ngày tạo.'),
  deadline: z.string().optional(),
  priority: z.string().min(1, 'Chọn ưu tiên.'),
  status: z.string().min(1, 'Chọn trạng thái.'),
  workType: z.string().min(1, 'Chọn loại công việc.'),
  notes: z.string().optional(),
  estTime: z.string().optional(),
  estCost: z.string().optional(),
  fundingSource: z.string().optional(),
});

type TicketFormValues = z.infer<typeof ticketSchema>;

type TicketMock = {
  id: number;
  code: string;
  reportCode: string;
  asset: string;
  room: string;
  building: string;
  priority: 'Thấp' | 'Trung bình' | 'Cao';
  status: 'Chờ xử lý' | 'Đang xử lý' | 'Chờ vật tư' | 'Hoàn thành' | 'Đã hủy';
  technician: string;
  createdDate: string;
};

const mockTickets: TicketMock[] = [
  { id: 1, code: 'SC00048', reportCode: 'BH001', asset: 'Quạt trần', room: 'A101', building: 'Khu A', priority: 'Cao', status: 'Chờ xử lý', technician: '-', createdDate: '13/05/2026 09:20' },
  { id: 2, code: 'SC00047', reportCode: 'BH002', asset: 'Máy lạnh', room: 'B203', building: 'Khu B', priority: 'Trung bình', status: 'Đang xử lý', technician: 'Trần Văn K', createdDate: '13/05/2026 08:45' },
  { id: 3, code: 'SC00046', reportCode: 'BH003', asset: 'Ổ cắm điện', room: 'C305', building: 'Khu C', priority: 'Cao', status: 'Chờ vật tư', technician: 'Lê Minh T', createdDate: '12/05/2026 16:10' },
  { id: 4, code: 'SC00045', reportCode: 'BH004', asset: 'Đèn phòng', room: 'A202', building: 'Khu A', priority: 'Thấp', status: 'Hoàn thành', technician: 'Phạm Quốc H', createdDate: '12/05/2026 15:30' },
  { id: 5, code: 'SC00044', reportCode: 'BH005', asset: 'Cửa sổ', room: 'B101', building: 'Khu B', priority: 'Trung bình', status: 'Đang xử lý', technician: 'Trần Văn K', createdDate: '12/05/2026 11:05' },
];

export function MaintenanceManagementPage() {
  const { showToast } = useToast();
  
  const [tickets] = useState<TicketMock[]>(mockTickets);
  const [isLoading, setIsLoading] = useState(false);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketMock | null>(null);
  
  const [activeTab, setActiveTab] = useState('Tất cả');
  
  // Filter states
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('Tất cả');
  const [priorityFilter, setPriorityFilter] = useState('Tất cả');
  const [technicianFilter, setTechnicianFilter] = useState('Tất cả');

  // Compute unique technicians for filter dropdown
  const technicianOptions = useMemo(() => {
    const unique = [...new Set(mockTickets.map(t => t.technician).filter(t => t !== '-'))];
    return unique;
  }, []);

  // Filtered tickets based on tab, search, and filters
  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      // Tab filter
      if (activeTab !== 'Tất cả' && ticket.status !== activeTab) return false;
      
      // Status filter
      if (statusFilter !== 'Tất cả' && ticket.status !== statusFilter) return false;
      
      // Priority filter
      if (priorityFilter !== 'Tất cả' && ticket.priority !== priorityFilter) return false;
      
      // Technician filter
      if (technicianFilter !== 'Tất cả' && ticket.technician !== technicianFilter) return false;
      
      // Search keyword
      if (searchKeyword) {
        const kw = searchKeyword.toLowerCase();
        const matchCode = ticket.code.toLowerCase().includes(kw);
        const matchReportCode = ticket.reportCode.toLowerCase().includes(kw);
        const matchAsset = ticket.asset.toLowerCase().includes(kw);
        const matchRoom = ticket.room.toLowerCase().includes(kw);
        const matchBuilding = ticket.building.toLowerCase().includes(kw);
        const matchTechnician = ticket.technician.toLowerCase().includes(kw);
        if (!(matchCode || matchReportCode || matchAsset || matchRoom || matchBuilding || matchTechnician)) return false;
      }
      
      return true;
    });
  }, [tickets, activeTab, searchKeyword, statusFilter, priorityFilter, technicianFilter]);

  // Summary counts from all tickets (unfiltered)
  const summaryCounts = useMemo(() => {
    return {
      total: tickets.length,
      pending: tickets.filter(t => t.status === 'Chờ xử lý').length,
      inProgress: tickets.filter(t => t.status === 'Đang xử lý').length,
      waitingMaterial: tickets.filter(t => t.status === 'Chờ vật tư').length,
      completed: tickets.filter(t => t.status === 'Hoàn thành').length,
    };
  }, [tickets]);

  const form = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      reportCode: '',
      technician: '',
      createdDate: '2026-05-13',
      deadline: '',
      priority: 'Trung bình',
      status: 'Chờ xử lý',
      workType: 'Sửa chữa',
      notes: '',
      estTime: '',
      estCost: '',
      fundingSource: '',
    },
  });

  const handleFilter = () => {
    // Filters applied via useMemo — just triggers re-render if needed
    // No additional action needed since filtering is reactive
  };

  const handleResetFilters = () => {
    setSearchKeyword('');
    setStatusFilter('Tất cả');
    setPriorityFilter('Tất cả');
    setTechnicianFilter('Tất cả');
    setActiveTab('Tất cả');
  };

  const openCreateModal = () => {
    form.reset();
    setIsEditMode(false);
    setIsCreateModalOpen(true);
  };

  const openDetailModal = (ticket: TicketMock) => {
    setSelectedTicket(ticket);
    setIsDetailModalOpen(true);
  };

  const openEditModal = (ticket: TicketMock) => {
    setSelectedTicket(ticket);
    setIsEditMode(true);
    form.reset({
      reportCode: ticket.reportCode,
      technician: ticket.technician,
      createdDate: ticket.createdDate.split(' ')[0].split('/').reverse().join('-'),
      deadline: '',
      priority: ticket.priority,
      status: ticket.status,
      workType: 'Sửa chữa',
      notes: '',
      estTime: '',
      estCost: '',
      fundingSource: '',
    });
    setIsCreateModalOpen(true);
  };

  const onSubmit = async (data: TicketFormValues) => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 600));
      showToast('Tạo phiếu sửa chữa thành công.', 'success');
      setIsCreateModalOpen(false);
    } catch (error) {
      showToast('Lưu thông tin thất bại.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'Chờ xử lý': return <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-700">Chờ xử lý</span>;
      case 'Đang xử lý': return <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-700">Đang xử lý</span>;
      case 'Chờ vật tư': return <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-700">Chờ vật tư</span>;
      case 'Hoàn thành': return <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-700">Hoàn thành</span>;
      case 'Đã hủy': return <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-700">Đã hủy</span>;
      default: return null;
    }
  };

  const renderPriority = (priority: string) => {
    switch (priority) {
      case 'Cao': return <span className="text-destructive font-bold text-xs">Cao</span>;
      case 'Trung bình': return <span className="text-amber-500 font-bold text-xs">Trung bình</span>;
      case 'Thấp': return <span className="text-emerald-500 font-bold text-xs">Thấp</span>;
      default: return null;
    }
  };

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
            Tạo phiếu sửa chữa mới
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
            <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
              <Clock size={24} weight="duotone" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-0.5">Chờ xử lý</p>
              <p className="text-2xl font-bold text-foreground">{summaryCounts.pending}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
              <Gear size={24} weight="duotone" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-0.5">Đang xử lý</p>
              <p className="text-2xl font-bold text-foreground">{summaryCounts.inProgress}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-600 shrink-0">
              <Package size={24} weight="duotone" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-0.5">Chờ vật tư</p>
              <p className="text-2xl font-bold text-foreground">{summaryCounts.waitingMaterial}</p>
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
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-5 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Tìm kiếm (Mã phiếu, thiết bị, phòng...)</label>
            <div className="relative">
              <Input 
            placeholder="Nhập từ khóa..." 
            className="pl-9" 
            value={searchKeyword}
            onChange={e => setSearchKeyword(e.target.value)}
          />
              <MagnifyingGlass size={16} className="absolute left-3 top-2.5 text-muted-foreground" />
            </div>
          </div>
          <div className="w-full md:w-36">
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Trạng thái</label>
            <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option>Tất cả</option>
              <option>Chờ xử lý</option>
              <option>Đang xử lý</option>
              <option>Chờ vật tư</option>
              <option>Hoàn thành</option>
              <option>Đã hủy</option>
            </Select>
          </div>
          <div className="w-full md:w-32">
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Ưu tiên</label>
            <Select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
              <option>Tất cả</option>
              <option>Cao</option>
              <option>Trung bình</option>
              <option>Thấp</option>
            </Select>
          </div>
          <div className="w-full md:w-40">
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Kỹ thuật viên</label>
            <Select value={technicianFilter} onChange={e => setTechnicianFilter(e.target.value)}>
              <option>Tất cả</option>
              {technicianOptions.map(t => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button className="gap-2" onClick={handleFilter}>
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
        <div className="flex items-center gap-6 border-b border-border/50 px-6 bg-muted/20">
          {['Tất cả', 'Chờ xử lý', 'Đang xử lý', 'Chờ vật tư', 'Hoàn thành', 'Đã hủy'].map((tab) => (
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
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/30 text-muted-foreground border-b border-border/50">
              <tr>
                <th className="px-4 py-4 text-center font-semibold w-12">STT</th>
                <th className="px-4 py-4 text-center font-semibold">Mã phiếu</th>
                <th className="px-4 py-4 text-center font-semibold">Mã báo hỏng</th>
                <th className="px-4 py-4 font-semibold text-left">Thiết bị</th>
                <th className="px-4 py-4 text-center font-semibold">Phòng</th>
                <th className="px-4 py-4 text-center font-semibold">Khu nhà</th>
                <th className="px-4 py-4 text-center font-semibold">Ưu tiên</th>
                <th className="px-4 py-4 text-center font-semibold">Trạng thái</th>
                <th className="px-4 py-4 text-center font-semibold">Kỹ thuật viên</th>
                <th className="px-4 py-4 text-center font-semibold">Ngày tạo</th>
                <th className="px-4 py-4 text-center font-semibold w-24">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 text-foreground">
              {filteredTickets.map((ticket, idx) => (
                <tr key={ticket.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3.5 text-center font-medium text-muted-foreground">{idx + 1}</td>
                  <td className="px-4 py-3.5 text-center font-bold">{ticket.code}</td>
                  <td className="px-4 py-3.5 text-center font-semibold text-primary">{ticket.reportCode}</td>
                  <td className="px-4 py-3.5">{ticket.asset}</td>
                  <td className="px-4 py-3.5 text-center">{ticket.room}</td>
                  <td className="px-4 py-3.5 text-center">{ticket.building}</td>
                  <td className="px-4 py-3.5 text-center">{renderPriority(ticket.priority)}</td>
                  <td className="px-4 py-3.5 text-center">{renderStatusBadge(ticket.status)}</td>
                  <td className="px-4 py-3.5 text-center font-medium">{ticket.technician}</td>
                  <td className="px-4 py-3.5 text-center tabular-nums">{ticket.createdDate}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-center gap-1.5">
                      <Button variant="ghost" size="icon" onClick={() => openDetailModal(ticket)} title="Xem chi tiết">
                        <Eye size={16} className="text-primary" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEditModal(ticket)} title="Sửa">
                        <PencilSimple size={16} className="text-primary" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} size="lg">              <ModalHeader>
          <ModalTitle>{isEditMode ? 'Cập nhật phiếu sửa chữa' : 'Tạo phiếu sửa chữa mới'}</ModalTitle>
        </ModalHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <ModalBody className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border/50 pb-2">THÔNG TIN BÁO HỎNG</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Mã báo hỏng <span className="text-destructive">*</span></label>
                  <Select {...form.register('reportCode')}>
                    <option value="">Chọn mã báo hỏng</option>
                    <option value="BH001">BH001</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Người báo</label>
                  <Input value="Tự động hiển thị" readOnly disabled />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Phòng / Khu</label>
                  <Input value="Tự động hiển thị" readOnly disabled />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border/50 pb-2">THÔNG TIN PHIẾU SỬA CHỮA</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Kỹ thuật viên <span className="text-destructive">*</span></label>
                  <Select {...form.register('technician')}>
                    <option value="">Chọn kỹ thuật viên</option>
                    <option value="Trần Văn K">Trần Văn K</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Ngày tạo <span className="text-destructive">*</span></label>
                  <Input type="date" {...form.register('createdDate')} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Hạn xử lý</label>
                  <Input type="date" {...form.register('deadline')} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Ưu tiên <span className="text-destructive">*</span></label>
                  <Select {...form.register('priority')}>
                    <option value="Trung bình">Trung bình</option>
                    <option value="Cao">Cao</option>
                    <option value="Thấp">Thấp</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Trạng thái <span className="text-destructive">*</span></label>
                  <Select {...form.register('status')}>
                    <option value="Chờ xử lý">Chờ xử lý</option>
                  </Select>
                </div>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>Hủy bỏ</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Đang lưu...' : 'Lưu phiếu'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} size="lg">
        <ModalHeader>
          <ModalTitle>Chi tiết phiếu sửa chữa</ModalTitle>
        </ModalHeader>
        <ModalBody>
          {selectedTicket && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-muted/20 p-4 rounded-xl border border-border/50">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Mã phiếu</p>
                  <p className="font-bold">{selectedTicket.code}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Trạng thái</p>
                  {renderStatusBadge(selectedTicket.status)}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Thiết bị</p>
                  <p className="font-medium">{selectedTicket.asset}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Phòng</p>
                  <p className="font-medium">{selectedTicket.room}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">Chi tiết thông tin phiếu sửa chữa có thể được hiển thị ở đây dựa trên dữ liệu thực tế.</p>
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
