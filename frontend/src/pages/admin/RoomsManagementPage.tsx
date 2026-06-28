import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../toast/toast-context';
import { getRooms, createRoom, updateRoom, deleteRoom, getBuildings, getRoomStudents, assignStudentToRoom, removeStudentFromRoom, transferStudentToRoom, type BuildingRecord } from '../../services/locations';
import { getUsers } from '../../services/users';
import { getApiErrorMessage } from '../../lib/api-client';

import { 
  Door,
  Users,
  Wrench,
  CheckCircle,
  Plus,
  Funnel,
  ArrowsClockwise,
  PencilSimple,
  Trash,
  Eye,
  Spinner,
  MagnifyingGlass,
  CaretLeft,
  CaretRight,
  UserPlus,
  UserMinus,
  Student,
  ArrowsLeftRight
} from '@phosphor-icons/react';
import { Card, CardContent } from '../../components/ui/Card';
import { SummaryCard } from '../../components/ui/SummaryCard';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { PageHeader } from '../../components/ui/PageHeader';
import { SkeletonStatCard, SkeletonTable } from '../../components/ui/Skeleton';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../components/ui/Table';
import { EmptyState } from '../../components/ui/EmptyState';
import { SearchInput } from '../../components/ui/SearchInput';
import { FilterBar } from '../../components/ui/FilterBar';
import { RowActionsMenu } from '../../components/ui/RowActionsMenu';
import { MobileDataCard, DataLabel } from '../../components/ui/MobileDataCard';
import { AlertDialog } from '../../components/ui/AlertDialog';
import { useDebounce } from '../../hooks/useDebounce';

type RoomRecord = {
  id: string;
  code: string;
  roomCode: string;
  name: string | null;
  buildingId: string;
  buildingCode: string;
  buildingName: string | null;
  floorNumber: number;
  capacity: number;
  currentStudents: number;
  roomType: string | null;
  areaM2: number | null;
  status: string;
  statusLabel: string;
  condition: string;
  conditionLabel: string;
};

const roomSchema = z.object({
  buildingCode: z.string().min(1, 'Vui lòng chọn khu nhà.'),
  code: z.string().min(1, 'Nhập mã phòng.'),
  name: z.string().optional(),
  type: z.string().optional(),
  capacity: z.coerce.number().min(1, 'Nhập sức chứa.'),
  currentStudents: z.coerce.number().default(0),
  floor: z.string().min(1, 'Vui lòng chọn tầng.'),
  area: z.string().optional(),
  condition: z.string().min(1, 'Chọn tình trạng.'),
  status: z.string().min(1, 'Chọn trạng thái.'),
  description: z.string().optional(),
});

type RoomFormValues = z.infer<typeof roomSchema>;

export function RoomsManagementPage() {
  const { showToast } = useToast();
  
  const [rooms, setRooms] = useState<RoomRecord[]>([]);
  const [buildings, setBuildings] = useState<BuildingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<RoomRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoomRecord | null>(null);
  const [detailRoom, setDetailRoom] = useState<RoomRecord | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Student management states
  const [roomStudents, setRoomStudents] = useState<Array<{
    id: number;
    fullName: string;
    userCode: string;
    studentCode: string | null;
    email: string | null;
    phone: string | null;
    assignmentId: number;
    startDate: string;
  }>>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [studentSearchResults, setStudentSearchResults] = useState<Array<{
    id: string;
    fullName: string;
    username: string;
    studentCode: string | null;
    email: string | null;
  }>>([]);
  const [isSearchingStudents, setIsSearchingStudents] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [assigningStudentId, setAssigningStudentId] = useState<number | null>(null);
  const [removeStudentTarget, setRemoveStudentTarget] = useState<number | null>(null);

  // Transfer student states
  const [transferStudent, setTransferStudent] = useState<{
    id: number;
    fullName: string;
    userCode: string;
    studentCode: string | null;
  } | null>(null);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferBuildingCode, setTransferBuildingCode] = useState('');
  const [transferFloor, setTransferFloor] = useState('');
  const [transferRoomId, setTransferRoomId] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  // Filter states
  const [searchKeyword, setSearchKeyword] = useState('');
  const debouncedKeyword = useDebounce(searchKeyword, 400);
  const [buildingFilter, setBuildingFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [studentFilter, setStudentFilter] = useState('');

  const form = useForm<RoomFormValues>({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      buildingCode: '',
      code: '',
      name: '',
      type: '',
      capacity: 4,
      currentStudents: 0,
      floor: '',
      area: '',
      condition: 'Tốt',
      status: 'Đang sử dụng',
      description: ''
    },
  });

  const selectedBuildingCode = form.watch('buildingCode');

  // Derive unique floors for the selected building
  const selectedBuilding = buildings.find(b => b.code === selectedBuildingCode);
  const availableFloors = useMemo(() => {
    if (!selectedBuilding) return [];
    const floors = new Set(selectedBuilding.rooms.map(r => r.floorNumber));
    return Array.from(floors).sort((a, b) => a - b);
  }, [selectedBuilding]);

  useEffect(() => {
    Promise.all([loadRooms(), loadBuildings()]);
  }, []);

  async function loadBuildings() {
    try {
      const data = await getBuildings();
      setBuildings(data);
    } catch {
      // Non-critical
    }
  }

  async function loadRooms() {
    setIsFetching(true);
    try {
      const data = await getRooms();
      setRooms(data);
    } catch {
      showToast('Lỗi khi tải danh sách phòng.', 'error');
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  }

  // Filter logic
  const filteredRooms = useMemo(() => {
    return rooms.filter(room => {
      // Search keyword
      if (debouncedKeyword) {
        const kw = debouncedKeyword.toLowerCase();
        const matchCode = room.roomCode.toLowerCase().includes(kw);
        const matchName = room.name?.toLowerCase().includes(kw);
        const matchBuilding = room.buildingName?.toLowerCase().includes(kw);
        if (!(matchCode || matchName || matchBuilding)) return false;
      }
      // Building filter
      if (buildingFilter && room.buildingCode !== buildingFilter) return false;
      // Status filter
      if (statusFilter && room.status !== statusFilter) return false;
      // Student count filter
      if (studentFilter === 'Đầy' && room.currentStudents < room.capacity) return false;
      if (studentFilter === 'Chưa đầy' && room.currentStudents >= room.capacity) return false;
      return true;
    });
  }, [rooms, debouncedKeyword, buildingFilter, statusFilter, studentFilter]);

  const openAddModal = () => {
    setSelectedRoom(null);
    form.reset({
      buildingCode: '',
      code: '',
      name: '',
      type: '',
      capacity: 4,
      currentStudents: 0,
      floor: '',
      area: '',
      condition: 'Tốt',
      status: 'Đang sử dụng',
      description: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (room: RoomRecord) => {
    setSelectedRoom(room);
    form.reset({
      buildingCode: room.buildingCode,
      code: room.code,
      name: room.name || '',
      type: room.roomType || 'Phòng thường',
      capacity: room.capacity,
      currentStudents: room.currentStudents,
      floor: room.floorNumber.toString(),
      area: room.areaM2?.toString() || '25',
      condition: room.condition,
      status: room.status === 'Đang sử dụng' ? 'Đang sử dụng' : 'Còn trống',
      description: ''
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: RoomFormValues) => {
    setIsLoading(true);
    try {
      if (selectedRoom) {
        await updateRoom(Number(selectedRoom.id), {
          roomCode: data.code,
          capacity: data.capacity,
          note: data.description || undefined,
        });
        showToast('Cập nhật phòng thành công.', 'success');
      } else {
        await createRoom({
          roomCode: data.code,
          floorId: Number(data.floor),
          capacity: data.capacity,
          note: data.description || undefined,
        });
        showToast('Thêm phòng thành công.', 'success');
      }
      setIsModalOpen(false);
      await loadRooms();
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Lưu thông tin thất bại.'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = (room: RoomRecord) => {
    setDeleteTarget(room);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteRoom(Number(deleteTarget.id));
      setRooms(prev => prev.filter(r => r.id !== deleteTarget.id));
      setDeleteTarget(null);
      showToast('Xóa phòng thành công.', 'success');
    } catch {
      showToast('Xóa phòng thất bại.', 'error');
    }
  };

  // Student management functions
  async function loadStudents(roomId: string) {
    setIsLoadingStudents(true);
    try {
      const data = await getRoomStudents(Number(roomId));
      setRoomStudents(data);
    } catch {
      setRoomStudents([]);
    } finally {
      setIsLoadingStudents(false);
    }
  }

  async function searchStudents() {
    if (!studentSearchQuery.trim()) return;
    setIsSearchingStudents(true);
    setHasSearched(true);
    try {
      const result = await getUsers({
        keyword: studentSearchQuery.trim(),
        roleCode: 'STUDENT',
        page: 1,
        pageSize: 20,
      });
      // Filter out already-assigned students
      const assignedIds = new Set(roomStudents.map(s => s.id));
      setStudentSearchResults(result.items.filter(u => !assignedIds.has(Number(u.id))));
    } catch {
      setStudentSearchResults([]);
    } finally {
      setIsSearchingStudents(false);
    }
  }

  async function handleAssign(studentId: number) {
    if (!detailRoom) return;
    setAssigningStudentId(studentId);
    try {
      await assignStudentToRoom(Number(detailRoom.id), studentId);
      showToast('Thêm sinh viên vào phòng thành công.', 'success');
      await loadStudents(detailRoom.id);
      setStudentSearchResults(prev => prev.filter(s => Number(s.id) !== studentId));
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Thêm sinh viên thất bại.'), 'error');
    } finally {
      setAssigningStudentId(null);
    }
  }

  // Transfer student functions
  const transferTargetRooms = useMemo(() => {
    if (!transferBuildingCode && !transferFloor) return [];
    return rooms.filter(r => {
      if (transferBuildingCode && r.buildingCode !== transferBuildingCode) return false;
      if (transferFloor && r.floorNumber !== Number(transferFloor)) return false;
      if (transferStudent && r.id === String(detailRoom?.id)) return false; // exclude current room
      if (r.currentStudents >= r.capacity) return false; // exclude full rooms
      return true;
    });
  }, [rooms, transferBuildingCode, transferFloor, transferStudent, detailRoom]);

  const transferAvailableFloors = useMemo(() => {
    if (!transferBuildingCode) return [];
    const floors = new Set(
      rooms.filter(r => r.buildingCode === transferBuildingCode).map(r => r.floorNumber)
    );
    return Array.from(floors).sort((a, b) => a - b);
  }, [rooms, transferBuildingCode]);

  function openTransferModal(student: typeof roomStudents[0]) {
    setTransferStudent({
      id: student.id,
      fullName: student.fullName,
      userCode: student.userCode,
      studentCode: student.studentCode,
    });
    setTransferBuildingCode('');
    setTransferFloor('');
    setTransferRoomId('');
    setIsTransferOpen(true);
  }

  async function handleTransfer() {
    if (!transferStudent || !transferRoomId || !detailRoom) return;
    setIsTransferring(true);
    try {
      const result = await transferStudentToRoom(Number(transferRoomId), transferStudent.id);
      showToast(result.message || 'Chuyển phòng thành công.', 'success');
      setIsTransferOpen(false);
      setTransferStudent(null);
      await loadStudents(detailRoom.id);
      await loadRooms();
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Chuyển phòng thất bại.'), 'error');
    } finally {
      setIsTransferring(false);
    }
  }

  async function executeRemoveStudent() {
    if (!detailRoom || !removeStudentTarget) return;
    try {
      await removeStudentFromRoom(Number(detailRoom.id), removeStudentTarget);
      showToast('Đã xóa sinh viên khỏi phòng.', 'success');
      await loadStudents(detailRoom.id);
      await loadRooms();
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Xóa sinh viên thất bại.'), 'error');
    } finally {
      setRemoveStudentTarget(null);
    }
  }

  const totalRooms = filteredRooms.length;
  const activeRooms = filteredRooms.filter(r => r.status === 'Đang sử dụng').length;
  const hasStudentRooms = filteredRooms.filter(r => r.currentStudents > 0).length;
  const emptyRooms = filteredRooms.filter(r => r.currentStudents === 0 && r.status !== 'Đang sửa chữa').length;
  const repairingRooms = filteredRooms.filter(r => r.status === 'Đang sửa chữa' || r.condition === 'Đang sửa').length;

  if (isLoading) {
    return (
      <div className="space-y-6 mx-auto max-w-7xl pb-10">
        <PageHeader 
          title="Phòng" 
          description="Quản lý danh sách phòng và theo dõi tình trạng lưu trú."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonStatCard key={i} />)}
        </div>
        <Card className="border-border/50">
          <div className="p-5">
            <SkeletonTable rows={10} cols={8} />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 mx-auto max-w-7xl pb-10">
      <PageHeader 
        title="Phòng" 
        description="Quản lý danh sách phòng và theo dõi tình trạng lưu trú."
        actions={
          <Button onClick={openAddModal} className="gap-2">
            <Plus size={16} weight="bold" />
            Thêm phòng
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard 
          label="Tổng số phòng" 
          value={totalRooms} 
          unit="phòng" 
          icon={<Door size={24} weight="duotone" />} 
          colorClass="text-blue-600 bg-blue-50 border-blue-100" 
        />
        <SummaryCard 
          label="Đang sử dụng" 
          value={activeRooms} 
          unit="phòng" 
          icon={<CheckCircle size={24} weight="duotone" />} 
          colorClass="text-emerald-600 bg-emerald-50 border-emerald-100" 
        />
        <SummaryCard 
          label="Có sinh viên" 
          value={hasStudentRooms} 
          unit="phòng" 
          icon={<Users size={24} weight="duotone" />} 
          colorClass="text-amber-600 bg-amber-50 border-amber-100" 
        />
        <SummaryCard 
          label="Phòng trống" 
          value={emptyRooms} 
          unit="phòng" 
          icon={<Door size={24} weight="duotone" />} 
          colorClass="text-purple-600 bg-purple-50 border-purple-100" 
        />
        <SummaryCard 
          label="Đang sửa chữa" 
          value={repairingRooms} 
          unit="phòng" 
          icon={<Wrench size={24} weight="duotone" />} 
          colorClass="text-rose-600 bg-rose-50 border-rose-100" 
        />
      </div>

      <FilterBar 
        searchNode={
          <SearchInput
            value={searchKeyword}
            onChange={setSearchKeyword}
            placeholder="Nhập mã phòng, tên phòng..."
            aria-label="Tìm kiếm phòng"
          />
        }
        filterNode={
          <>
            <Select value={buildingFilter} onChange={(e) => setBuildingFilter(e.target.value)} aria-label="Lọc theo khu nhà">
              <option value="">Tất cả khu nhà</option>
              {buildings.map(b => (
                <option key={b.id} value={b.code}>{b.name}</option>
              ))}
            </Select>

            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Lọc theo trạng thái sử dụng">
              <option value="">Tất cả trạng thái</option>
              <option value="Đang sử dụng">Đang sử dụng</option>
              <option value="Còn trống">Còn trống</option>
            </Select>

            <Select value={studentFilter} onChange={(e) => setStudentFilter(e.target.value)} aria-label="Lọc theo số sinh viên">
              <option value="">Tất cả số sinh viên</option>
              <option value="Đầy">Đầy</option>
              <option value="Chưa đầy">Chưa đầy</option>
            </Select>
          </>
        }
        appliedFilterCount={[
          buildingFilter,
          statusFilter,
          studentFilter
        ].filter(Boolean).length}
        onResetFilters={() => {
          setSearchKeyword('');
          setBuildingFilter('');
          setStatusFilter('');
          setStudentFilter('');
        }}
        filterChips={[
          ...(buildingFilter ? [{ id: 'building', label: `Khu: ${buildings.find(b => b.code === buildingFilter)?.name}`, onRemove: () => setBuildingFilter('') }] : []),
          ...(statusFilter ? [{ id: 'status', label: `Trạng thái: ${statusFilter}`, onRemove: () => setStatusFilter('') }] : []),
          ...(studentFilter ? [{ id: 'student', label: `Số SV: ${studentFilter}`, onRemove: () => setStudentFilter('') }] : []),
        ]}
      />

      <Card className="border-border/50 overflow-hidden">
        {isFetching ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size={24} className="animate-spin text-primary" />
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="p-10">
                <EmptyState 
                  title="Không tìm thấy phòng" 
                  description="Chưa có phòng nào phù hợp với bộ lọc hiện tại."
                />
              </div>
            ) : (
              <>
                <div className="hidden lg:block">
                  <Table aria-label="Danh sách phòng">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16 text-center">STT</TableHead>
                        <TableHead>Mã phòng</TableHead>
                        <TableHead>Tên phòng</TableHead>
                        <TableHead className="text-center">Khu nhà</TableHead>
                        <TableHead className="text-center">Tầng</TableHead>
                        <TableHead className="text-center">Sức chứa</TableHead>
                        <TableHead className="text-center">SV hiện tại</TableHead>
                        <TableHead className="text-center">Trạng thái</TableHead>
                        <TableHead>Tình trạng</TableHead>
                        <TableHead className="w-24 text-center">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRooms.map((room, idx) => (
                        <TableRow key={room.id}>
                          <TableCell className="text-center font-medium text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell className="font-bold text-foreground">{room.roomCode}</TableCell>
                          <TableCell className="font-medium text-foreground">{room.name}</TableCell>
                          <TableCell className="text-center text-muted-foreground">{room.buildingName}</TableCell>
                          <TableCell className="text-center tabular-nums">{room.floorNumber}</TableCell>
                          <TableCell className="text-center tabular-nums">{room.capacity}</TableCell>
                          <TableCell className="text-center tabular-nums">{room.currentStudents}</TableCell>
                          <TableCell className="text-center">
                            <span className={`inline-flex min-w-[90px] items-center justify-center rounded px-2.5 py-0.5 text-[11px] font-semibold ${
                              room.status === 'Đang sử dụng' ? 'bg-success-muted text-success' :
                              room.status === 'Còn trống' ? 'bg-blue-100 text-blue-700' :
                              'bg-destructive-muted text-destructive'
                            }`}>
                              {room.status === 'Còn trống' ? 'Phòng trống' : room.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{room.conditionLabel || room.condition}</TableCell>
                          <TableCell className="text-center">
                            <RowActionsMenu
                              ariaLabel={`Thao tác phòng ${room.roomCode}`}
                              actions={[
                                { id: 'view', label: 'Xem chi tiết', icon: <Eye size={16} />, onClick: () => { setDetailRoom(room); setIsDetailOpen(true); loadStudents(room.id); setStudentSearchQuery(''); setStudentSearchResults([]); } },
                                { id: 'edit', label: 'Sửa', icon: <PencilSimple size={16} />, onClick: () => openEditModal(room) },
                                { id: 'delete', label: 'Xóa', icon: <Trash size={16} />, variant: 'destructive', onClick: () => handleDelete(room) }
                              ]}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="lg:hidden flex flex-col gap-3 p-3">
                  {filteredRooms.map((room) => (
                    <MobileDataCard
                      key={room.id}
                      title={room.name || room.roomCode}
                      subtitle={`Phòng ${room.roomCode}`}
                      statusBadge={
                        <span className={`inline-flex min-w-[90px] items-center justify-center rounded px-2.5 py-0.5 text-[11px] font-semibold ${
                          room.status === 'Đang sử dụng' ? 'bg-success-muted text-success' :
                          room.status === 'Còn trống' ? 'bg-blue-100 text-blue-700' :
                          'bg-destructive-muted text-destructive'
                        }`}>
                          {room.status === 'Còn trống' ? 'Phòng trống' : room.status}
                        </span>
                      }
                      actionMenu={
                        <RowActionsMenu
                          ariaLabel={`Thao tác phòng ${room.roomCode}`}
                          actions={[
                            { id: 'view', label: 'Xem chi tiết', icon: <Eye size={16} />, onClick: () => { setDetailRoom(room); setIsDetailOpen(true); loadStudents(room.id); setStudentSearchQuery(''); setStudentSearchResults([]); } },
                            { id: 'edit', label: 'Sửa', icon: <PencilSimple size={16} />, onClick: () => openEditModal(room) },
                            { id: 'delete', label: 'Xóa', icon: <Trash size={16} />, variant: 'destructive', onClick: () => handleDelete(room) }
                          ]}
                        />
                      }
                    >
                      <DataLabel label="Khu nhà" value={room.buildingName || ''} />
                      <DataLabel label="Tầng" value={String(room.floorNumber)} />
                      <DataLabel label="Sinh viên" value={`${room.currentStudents} / ${room.capacity}`} />
                      <DataLabel label="Tình trạng" value={room.conditionLabel || room.condition} />
                    </MobileDataCard>
                  ))}
                </div>
              </>
            )}
      </Card>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={selectedRoom ? 'Cập nhật phòng' : 'Thêm phòng'}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Hủy</Button>
            <Button onClick={form.handleSubmit(onSubmit)} disabled={isLoading}>
              {isLoading && <Spinner className="mr-2 animate-spin" />}
              Lưu
            </Button>
          </>
        }
      >
        <form id="room-form" className="space-y-4 py-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Khu nhà <span className="text-destructive">*</span>
              </label>
              <Select {...form.register('buildingCode')} error={!!form.formState.errors.buildingCode}>
                <option value="">Chọn khu nhà</option>
                {buildings.map(b => (
                  <option key={b.id} value={b.code}>{b.name} ({b.code})</option>
                ))}
              </Select>
              {form.formState.errors.buildingCode && (
                <p className="mt-1 text-xs text-destructive">{form.formState.errors.buildingCode.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Mã phòng <span className="text-destructive">*</span>
              </label>
              <Input 
                {...form.register('code')}
                placeholder="Ví dụ: A101"
                error={!!form.formState.errors.code}
              />
              {form.formState.errors.code && (
                <p className="mt-1 text-xs text-destructive">{form.formState.errors.code.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Tên phòng</label>
              <Input 
                {...form.register('name')}
                placeholder="Ví dụ: Phòng 4 người"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Loại phòng</label>
              <Select {...form.register('type')}>
                <option value="">Chọn loại phòng</option>
                <option value="Phòng thường">Phòng thường</option>
                <option value="Phòng dịch vụ">Phòng dịch vụ</option>
              </Select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Sức chứa <span className="text-destructive">*</span>
              </label>
              <Input 
                type="number"
                {...form.register('capacity')}
                placeholder="Số người tối đa"
                error={!!form.formState.errors.capacity}
              />
              {form.formState.errors.capacity && (
                <p className="mt-1 text-xs text-destructive">{form.formState.errors.capacity.message}</p>
              )}
            </div>
            
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Số sinh viên hiện tại
              </label>
              <Input 
                type="number"
                {...form.register('currentStudents')}
                readOnly
                className="bg-muted text-muted-foreground cursor-not-allowed"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Tầng <span className="text-destructive">*</span>
              </label>
              <Select {...form.register('floor')} error={!!form.formState.errors.floor}>
                <option value="">Chọn tầng</option>
                {availableFloors.map(f => (
                  <option key={f} value={f}>Tầng {f}</option>
                ))}
              </Select>
              {form.formState.errors.floor && (
                <p className="mt-1 text-xs text-destructive">{form.formState.errors.floor.message}</p>
              )}
            </div>
            
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Diện tích (m²)</label>
              <Input 
                {...form.register('area')}
                placeholder="Diện tích (nếu có)"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Tình trạng phòng <span className="text-destructive">*</span>
              </label>
              <Select {...form.register('condition')}>
                <option value="Tốt">Tốt</option>
                <option value="Đang sửa">Đang sửa</option>
              </Select>
            </div>
            
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Trạng thái <span className="text-destructive">*</span>
              </label>
              <Select {...form.register('status')}>
                <option value="Đang sử dụng">Đang sử dụng</option>
                <option value="Còn trống">Còn trống</option>
              </Select>
            </div>
          </div>
          
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Mô tả</label>
            <textarea 
              {...form.register('description')}
              placeholder="Nhập mô tả (nếu có)"
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
            ></textarea>
          </div>
        </form>
      </Modal>

      <AlertDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Xác nhận xóa"
        description={deleteTarget ? `Phòng ${deleteTarget.roomCode} sẽ bị xóa khỏi danh sách. Hành động này không thể hoàn tác. Bạn có chắc chắn?` : ''}
        confirmText="Xóa phòng"
        onConfirm={() => void confirmDelete()}
      />

      {/* Transfer Student Modal */}
      <Modal
        isOpen={isTransferOpen}
        onClose={() => { setIsTransferOpen(false); setTransferStudent(null); }}
        title={`Chuyển phòng cho ${transferStudent?.fullName ?? ''}`}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => { setIsTransferOpen(false); setTransferStudent(null); }}>Hủy</Button>
            <Button 
              onClick={() => void handleTransfer()}
              disabled={isTransferring || !transferRoomId}
              className="gap-2"
            >
              {isTransferring ? <Spinner size={16} className="animate-spin" /> : <ArrowsLeftRight size={16} />}
              Xác nhận chuyển
            </Button>
          </>
        }
      >
        <div className="space-y-5 py-4">
          {transferStudent && (
            <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
              <p className="text-xs text-muted-foreground mb-1.5">Sinh viên</p>
              <p className="font-semibold text-foreground">{transferStudent.fullName}</p>
              <p className="text-sm text-muted-foreground">{transferStudent.studentCode || transferStudent.userCode}</p>
            </div>
          )}

          <div className="border-t border-border/50 pt-4">
            <p className="text-sm font-semibold text-foreground mb-3">Chọn phòng đích</p>
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Khu nhà</label>
                <Select value={transferBuildingCode} onChange={(e) => { setTransferBuildingCode(e.target.value); setTransferFloor(''); setTransferRoomId(''); }}>
                  <option value="">Chọn khu nhà</option>
                  {buildings.map(b => (
                    <option key={b.id} value={b.code}>{b.name}</option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Tầng</label>
                <Select 
                  value={transferFloor} 
                  onChange={(e) => { setTransferFloor(e.target.value); setTransferRoomId(''); }}
                  disabled={!transferBuildingCode}
                >
                  <option value="">Chọn tầng</option>
                  {transferAvailableFloors.map(f => (
                    <option key={f} value={f}>Tầng {f}</option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Phòng</label>
                <Select 
                  value={transferRoomId} 
                  onChange={(e) => setTransferRoomId(e.target.value)}
                  disabled={!transferFloor}
                >
                  <option value="">Chọn phòng</option>
                  {transferTargetRooms.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.roomCode} — {r.currentStudents}/{r.capacity} SV
                    </option>
                  ))}
                </Select>
                {transferTargetRooms.length === 0 && transferFloor && (
                  <p className="mt-1 text-xs text-amber-600">Không còn phòng trống ở tầng này.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Detail Modal - Room info + Student Management */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => { setIsDetailOpen(false); loadRooms(); }}
        title={`Chi tiết phòng ${detailRoom?.roomCode ?? ''}`}
        size="lg"
        footer={
          <Button onClick={() => setIsDetailOpen(false)}>Đóng</Button>
        }
      >
        {detailRoom && (
          <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto custom-scrollbar pr-2">
            {/* Thông tin phòng */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Door size={16} weight="bold" />
                Thông tin phòng
              </h4>
              <div className="grid grid-cols-2 gap-4 bg-muted/30 rounded-lg p-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Mã phòng</p>
                  <p className="font-bold text-foreground">{detailRoom.roomCode}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Khu nhà</p>
                  <p className="font-medium">{detailRoom.buildingName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Tầng</p>
                  <p className="font-medium tabular-nums">{detailRoom.floorNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Sức chứa</p>
                  <p className="font-medium tabular-nums">{detailRoom.capacity}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Loại phòng</p>
                  <p className="font-medium">{detailRoom.roomType || '--'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Diện tích</p>
                  <p className="font-medium tabular-nums">{detailRoom.areaM2 ? `${detailRoom.areaM2} m²` : '--'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">SV hiện tại</p>
                  <p className="font-medium tabular-nums">{roomStudents.length} / {detailRoom.capacity}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Tình trạng</p>
                  <p className="font-medium">{detailRoom.conditionLabel || detailRoom.condition || '--'}</p>
                </div>
              </div>
            </div>

            {/* Danh sách sinh viên */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Users size={16} weight="bold" />
                Sinh viên trong phòng
                {roomStudents.length > 0 && (
                  <span className="text-xs font-normal text-muted-foreground">({roomStudents.length} / {detailRoom.capacity})</span>
                )}
              </h4>
              
              {isLoadingStudents ? (
                <div className="flex items-center justify-center py-6">
                  <Spinner size={20} className="animate-spin text-primary" />
                </div>
              ) : roomStudents.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border">
                  <Student size={32} className="mx-auto mb-2 text-muted-foreground/50" />
                  Phòng chưa có sinh viên nào
                </div>
              ) : (
                <div className="space-y-2">
                  {roomStudents.map((s) => (
                    <div key={s.assignmentId} className="flex items-center justify-between bg-muted/30 rounded-lg px-4 py-2.5 border border-border/50">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-primary">
                            {s.fullName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{s.fullName}</p>
                          <p className="text-xs text-muted-foreground">
                            {s.studentCode || s.userCode}
                            {s.email && ` · ${s.email}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openTransferModal(s)}
                          title="Chuyển phòng"
                          className="text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                        >
                          <ArrowsLeftRight size={16} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setRemoveStudentTarget(s.id)}
                          title="Xóa khỏi phòng"
                          className="text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                        >
                          <UserMinus size={16} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Thêm sinh viên */}
            {roomStudents.length < detailRoom.capacity && (
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <UserPlus size={16} weight="bold" />
                  Thêm sinh viên
                </h4>
                <div className="flex gap-2 mb-3">
                  <div className="flex-1 relative">
                    <Input
                      placeholder="Tìm theo tên, mã SV, email..."
                      value={studentSearchQuery}
                      onChange={(e) => {
                        setStudentSearchQuery(e.target.value);
                        if (e.target.value.trim() === '') setHasSearched(false);
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter') searchStudents(); }}
                      className="pl-9"
                    />
                    <MagnifyingGlass size={16} className="absolute left-3 top-2.5 text-muted-foreground" />
                  </div>
                  <Button onClick={searchStudents} disabled={isSearchingStudents || !studentSearchQuery.trim()}>
                    {isSearchingStudents ? <Spinner size={16} className="animate-spin" /> : 'Tìm'}
                  </Button>
                </div>

                {studentSearchResults.length > 0 && (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar border border-border/50 rounded-lg p-2">
                    {studentSearchResults.map((u) => (
                      <div key={u.id} className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted/50 transition-colors">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{u.fullName}</p>
                          <p className="text-xs text-muted-foreground">
                            {u.studentCode || u.username}
                            {u.email && ` · ${u.email}`}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-shrink-0 gap-1.5"
                          onClick={() => handleAssign(Number(u.id))}
                          disabled={assigningStudentId === Number(u.id)}
                        >
                          {assigningStudentId === Number(u.id) ? (
                            <Spinner size={14} className="animate-spin" />
                          ) : (
                            <UserPlus size={14} />
                          )}
                          Thêm
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                {studentSearchQuery && hasSearched && studentSearchResults.length === 0 && !isSearchingStudents && (
                  <p className="text-xs text-muted-foreground text-center py-2">Không tìm thấy sinh viên nào.</p>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Remove Student Confirm Dialog */}
      <AlertDialog
        isOpen={!!removeStudentTarget}
        onClose={() => setRemoveStudentTarget(null)}
        title="Xác nhận xóa sinh viên"
        description="Bạn có chắc chắn muốn xóa sinh viên này khỏi phòng? Hành động này không thể hoàn tác."
        confirmText="Xóa sinh viên"
        onConfirm={() => void executeRemoveStudent()}
      />
    </div>
  );
}
