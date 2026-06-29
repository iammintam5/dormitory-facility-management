import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useToast } from '../../toast/toast-context';

import { 
  Users,
  UserCheck,
  UserMinus,
  Door,
  Plus,
  ArrowsClockwise,
  Eye,
  PencilSimple,
  ArrowsLeftRight,
  MagnifyingGlass,
  CaretLeft,
  CaretRight,
  Spinner,
  FileArrowUp
} from '@phosphor-icons/react';
import { Card, CardContent } from '../../components/ui/Card';
import { SummaryCard } from '../../components/ui/SummaryCard';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { SkeletonStatCard, SkeletonTable } from '../../components/ui/Skeleton';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { PageHeader } from '../../components/ui/PageHeader';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../components/ui/Table';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { SearchInput } from '../../components/ui/SearchInput';
import { FilterBar } from '../../components/ui/FilterBar';
import { RowActionsMenu } from '../../components/ui/RowActionsMenu';
import { MobileDataCard, DataLabel } from '../../components/ui/MobileDataCard';
import { useDebounce } from '../../hooks/useDebounce';
import { getAllRoomsWithAssignments, assignStudentToRoom, transferStudentToRoom } from '../../services/locations';
import { getUsers } from '../../services/users';

const studentRoomSchema = z.object({
  studentId: z.string().min(1, 'Nhập mã sinh viên.'),
  fullName: z.string().min(1, 'Nhập họ và tên.'),
  faculty: z.string().optional(),
  course: z.string().optional(),
  phone: z.string().optional(),
  buildingCode: z.string().min(1, 'Chọn khu nhà.'),
  roomCode: z.string().min(1, 'Chọn phòng.'),
  moveInDate: z.string().min(1, 'Chọn ngày vào ở.'),
  notes: z.string().optional(),
});

type StudentRoomFormValues = z.infer<typeof studentRoomSchema>;

type RoomStudent = {
  id: number;
  userId: number;
  studentId: string;
  fullName: string;
  faculty: string;
  course: string;
  buildingCode: string;
  roomCode: string;
  moveInDate: string;
  status: 'Đang ở' | 'Đã chuyển';
  phone: string;
};

// Raw room data from API for lookups
type RoomWithAssignments = Awaited<ReturnType<typeof getAllRoomsWithAssignments>>[number];

export function RoomStudentsManagementPage() {
  const { showToast } = useToast();
  
  const [students, setStudents] = useState<RoomStudent[]>([]);
  const [allRooms, setAllRooms] = useState<RoomWithAssignments[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStudents();
  }, []);

  async function loadStudents() {
    setIsLoading(true);
    try {
      const rooms = await getAllRoomsWithAssignments();
      setAllRooms(rooms);
      const allStudents: RoomStudent[] = [];
      let idCounter = 1;
      for (const room of rooms) {
        const buildingName = room.floor?.building?.name ?? '';
        for (const assignment of room.roomStudentAssignments) {
          allStudents.push({
            id: idCounter++,
            userId: assignment.student.id,
            studentId: assignment.student.studentCode || assignment.student.userCode,
            fullName: assignment.student.fullName,
            faculty: assignment.student.profile?.faculty || '',
            course: assignment.student.profile?.course || '',
            buildingCode: buildingName,
            roomCode: room.roomCode,
            moveInDate: assignment.startDate ? new Date(assignment.startDate).toLocaleDateString('vi-VN') : '',
            status: assignment.isActive ? 'Đang ở' : 'Đã chuyển',
            phone: assignment.student.phone ?? '',
          });
        }
      }
      setStudents(allStudents);
    } catch {
      showToast('Không thể tải danh sách sinh viên.', 'error');
    } finally {
      setIsLoading(false);
    }
  }
  
  // === Filter state ===
  const [filterValues, setFilterValues] = useState({
    search: '',
    buildingCode: '',
    roomCode: '',
    status: '',
    faculty: '',
    course: '',
  });
  const debouncedSearch = useDebounce(filterValues.search, 400);

  // === Pagination state ===
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // === Derived: filtered + paginated data ===
  const filteredStudents = students.filter(s => {
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      if (!s.studentId.toLowerCase().includes(q) && !s.fullName.toLowerCase().includes(q)) return false;
    }
    if (filterValues.buildingCode && s.buildingCode !== filterValues.buildingCode) return false;
    if (filterValues.roomCode && s.roomCode !== filterValues.roomCode) return false;
    if (filterValues.status && s.status !== filterValues.status) return false;
    if (filterValues.faculty && s.faculty !== filterValues.faculty) return false;
    if (filterValues.course && s.course !== filterValues.course) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedStudents = filteredStudents.slice((safePage - 1) * pageSize, safePage * pageSize);

  // === Dynamic filter options from data ===
  const filterOptions = {
    buildings: [...new Set(students.map(s => s.buildingCode).filter(Boolean))].sort(),
    rooms: [...new Set(
      students
        .filter(s => !filterValues.buildingCode || s.buildingCode === filterValues.buildingCode)
        .map(s => s.roomCode)
    )].sort(),
    statuses: [...new Set(students.map(s => s.status))],
    faculties: [...new Set(students.map(s => s.faculty).filter(Boolean))].sort(),
    courses: [...new Set(students.map(s => s.course).filter(Boolean))].sort(),
  };

  // Reset trang khi filter thay đổi
  const filterJson = JSON.stringify(filterValues);
  useEffect(() => { setCurrentPage(1); }, [filterJson]);

  const clearFilters = () => {
    setFilterValues({ search: '', buildingCode: '', roomCode: '', status: '', faculty: '', course: '' });
    setCurrentPage(1);
  };

  const updateFilter = (key: string, value: string) => {
    setFilterValues(prev => {
      const next = { ...prev, [key]: value };
      if (key === 'buildingCode') next.roomCode = '';
      return next;
    });
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'new' | 'transfer'>('new');
  const [selectedStudent, setSelectedStudent] = useState<RoomStudent | null>(null);
  const [detailStudent, setDetailStudent] = useState<RoomStudent | null>(null);

  const form = useForm<StudentRoomFormValues>({
    resolver: zodResolver(studentRoomSchema),
    defaultValues: {
      studentId: '',
      fullName: '',
      faculty: '',
      course: '',
      phone: '',
      buildingCode: '',
      roomCode: '',
      moveInDate: '',
      notes: ''
    },
  });

  // Tự động xóa error roomCode khi người dùng chọn phòng khác
  const watchedRoomCode = form.watch('roomCode');
  useEffect(() => {
    if (form.formState.errors.roomCode) {
      form.clearErrors('roomCode');
    }
  }, [watchedRoomCode]);

  const openAddModal = () => {
    setSelectedStudent(null);
    setActiveTab('new');
    form.reset({
      studentId: '',
      fullName: '',
      faculty: '',
      course: '',
      phone: '',
      buildingCode: '',
      roomCode: '',
      moveInDate: '',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (student: RoomStudent) => {
    setSelectedStudent(student);
    setActiveTab('new');
    form.reset({
      studentId: student.studentId,
      fullName: student.fullName,
      faculty: student.faculty,
      course: student.course,
      phone: student.phone,
      buildingCode: student.buildingCode,
      roomCode: student.roomCode,
      moveInDate: student.moveInDate,
      notes: ''
    });
    setIsModalOpen(true);
  };

  const openDetailModal = (student: RoomStudent) => {
    setDetailStudent(student);
  };

  const openTransferModal = (student: RoomStudent) => {
    setSelectedStudent(student);
    setActiveTab('transfer');
    form.reset({
      studentId: student.studentId,
      fullName: student.fullName,
      faculty: student.faculty,
      course: student.course,
      phone: student.phone,
      buildingCode: '',
      roomCode: '',
      moveInDate: '',
      notes: `Chuyển từ phòng ${student.roomCode}`
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: StudentRoomFormValues) => {
    setIsLoading(true);
    try {
      // Helper tìm phòng theo mã + khu nhà
      function findTargetRoom(formData: StudentRoomFormValues) {
        return allRooms.find(r => 
          r.roomCode === formData.roomCode && 
          r.floor?.building?.name === formData.buildingCode
        );
      }

      if (activeTab === 'transfer' && selectedStudent) {
        // Validation: không cho chọn phòng trùng với phòng hiện tại
        if (data.roomCode === selectedStudent.roomCode) {
          form.setError('roomCode', { message: 'Phòng chuyển đến không được trùng với phòng hiện tại.' });
          return;
        }
        // Chuyển phòng: tìm phòng đích từ rooms data
        const targetRoom = findTargetRoom(data);
        if (!targetRoom) throw new Error('Không tìm thấy phòng đích.');
        await transferStudentToRoom(targetRoom.id, selectedStudent.userId);
        showToast(`Đã chuyển ${selectedStudent.fullName} sang phòng ${targetRoom.roomCode}`, 'success');
      } else if (activeTab === 'new' && selectedStudent) {
        // Cập nhật thông tin
        if (data.roomCode === selectedStudent.roomCode) {
          // Giữ nguyên phòng → không cần gọi API, chỉ đóng modal
          showToast(`Đã cập nhật thông tin cho ${selectedStudent.fullName}`, 'success');
        } else {
          // Đổi sang phòng khác → gọi transfer
          const targetRoom = findTargetRoom(data);
          if (!targetRoom) throw new Error('Không tìm thấy phòng đích.');
          await transferStudentToRoom(targetRoom.id, selectedStudent.userId);
          showToast(`Đã chuyển ${selectedStudent.fullName} sang phòng ${targetRoom.roomCode}`, 'success');
        }
      } else {
        // Thêm sinh viên mới: tìm user theo studentCode rồi gán phòng
        const usersRes = await getUsers({ studentCode: data.studentId, status: 'ACTIVE' });
        const user = usersRes.items[0];
        if (!user) throw new Error(`Không tìm thấy sinh viên với mã "${data.studentId}".`);
        const targetRoom = findTargetRoom(data);
        if (!targetRoom) throw new Error('Không tìm thấy phòng.');
        await assignStudentToRoom(targetRoom.id, Number(user.id));
        showToast(`Đã thêm ${data.fullName} vào phòng ${targetRoom.roomCode}`, 'success');
      }
      setIsModalOpen(false);
      await loadStudents(); // Refresh lại dữ liệu
    } catch (error: any) {
      const message = error?.response?.data?.message || error.message || 'Lưu thông tin thất bại.';
      if (message.toLowerCase().includes('đầy')) {
        form.setError('roomCode', { type: 'manual', message: message });
      } else {
        showToast(message, 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const totalStudents = students.length;
  const activeStudents = students.filter(s => s.status === 'Đang ở').length;
  const transferredStudents = students.filter(s => s.status === 'Đã chuyển').length;
  const totalRoomsWithStudents = new Set(students.map(s => `${s.buildingCode}-${s.roomCode}`)).size;

  const activePercent = totalStudents > 0 ? ((activeStudents / totalStudents) * 100).toFixed(1) : '0';
  const transferPercent = totalStudents > 0 ? ((transferredStudents / totalStudents) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6 mx-auto max-w-7xl pb-10">
      <PageHeader 
        title="Sinh viên trong phòng" 
        description="Quản lý danh sách sinh viên lưu trú và theo dõi tình trạng."
        actions={
          <Button onClick={openAddModal} className="gap-2">
            <Plus size={16} weight="bold" />
            Thêm sinh viên / Chuyển phòng
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard 
            label="Tổng số sinh viên" 
            value={String(totalStudents)} 
            unit="sinh viên" 
            icon={<Users size={24} weight="duotone" />} 
            colorClass="text-blue-600 bg-blue-50 border-blue-100" 
          />
          <SummaryCard 
            label="Đang ở" 
            value={String(activeStudents)} 
            unit={`sinh viên (${activePercent}%)`} 
            icon={<UserCheck size={24} weight="duotone" />} 
            colorClass="text-emerald-600 bg-emerald-50 border-emerald-100" 
          />
          <SummaryCard 
            label="Đã chuyển / Ra ngoài" 
            value={String(transferredStudents)} 
            unit={`sinh viên (${transferPercent}%)`} 
            icon={<UserMinus size={24} weight="duotone" />} 
            colorClass="text-amber-600 bg-amber-50 border-amber-100" 
          />
          <SummaryCard 
            label="Tổng số phòng có SV" 
            value={String(totalRoomsWithStudents)} 
            unit="phòng" 
            icon={<Door size={24} weight="duotone" />} 
            colorClass="text-purple-600 bg-purple-50 border-purple-100" 
          />
        </div>
      )}

      <FilterBar 
        searchNode={
          <SearchInput
            value={filterValues.search}
            onChange={v => setFilterValues(prev => ({ ...prev, search: v }))}
            placeholder="Mã SV, họ tên..."
            aria-label="Tìm kiếm sinh viên"
          />
        }
        filterNode={
          <>
            <Select value={filterValues.buildingCode} onChange={e => updateFilter('buildingCode', e.target.value)} aria-label="Lọc theo khu nhà">
              <option value="">Tất cả khu nhà</option>
              {filterOptions.buildings.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </Select>

            <Select value={filterValues.roomCode} onChange={e => updateFilter('roomCode', e.target.value)} aria-label="Lọc theo phòng">
              <option value="">Tất cả phòng</option>
              {filterOptions.rooms.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </Select>

            <Select value={filterValues.status} onChange={e => updateFilter('status', e.target.value)} aria-label="Lọc theo trạng thái">
              <option value="">Tất cả trạng thái</option>
              {filterOptions.statuses.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>

            <Select value={filterValues.faculty} onChange={e => updateFilter('faculty', e.target.value)} aria-label="Lọc theo khoa">
              <option value="">Tất cả khoa</option>
              {filterOptions.faculties.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </Select>

            <Select value={filterValues.course} onChange={e => updateFilter('course', e.target.value)} aria-label="Lọc theo khóa">
              <option value="">Tất cả khóa</option>
              {filterOptions.courses.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </>
        }
        appliedFilterCount={[
          filterValues.buildingCode,
          filterValues.roomCode,
          filterValues.status,
          filterValues.faculty,
          filterValues.course
        ].filter(Boolean).length}
        onResetFilters={clearFilters}
        filterChips={[
          ...(filterValues.buildingCode ? [{ id: 'building', label: `Khu: ${filterValues.buildingCode}`, onRemove: () => updateFilter('buildingCode', '') }] : []),
          ...(filterValues.roomCode ? [{ id: 'room', label: `Phòng: ${filterValues.roomCode}`, onRemove: () => updateFilter('roomCode', '') }] : []),
          ...(filterValues.status ? [{ id: 'status', label: `Trạng thái: ${filterValues.status}`, onRemove: () => updateFilter('status', '') }] : []),
          ...(filterValues.faculty ? [{ id: 'faculty', label: `Khoa: ${filterValues.faculty}`, onRemove: () => updateFilter('faculty', '') }] : []),
          ...(filterValues.course ? [{ id: 'course', label: `Khóa: ${filterValues.course}`, onRemove: () => updateFilter('course', '') }] : []),
        ]}
      />

      <Card className="border-border/50 overflow-hidden">
        {isLoading ? (
          <div className="p-5 bg-card">
            <SkeletonTable rows={5} cols={11} />
          </div>
        ) : (
        <div className="flex flex-col">
          {filteredStudents.length === 0 ? (
            <div className="p-10">
              <EmptyState 
                title="Không tìm thấy sinh viên" 
                description={students.length === 0 ? 'Không có dữ liệu sinh viên.' : 'Không tìm thấy kết quả phù hợp.'}
              />
            </div>
          ) : (
            <>
              <div className="hidden lg:block overflow-x-auto">
                <Table aria-label="Danh sách sinh viên">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16 text-center">STT</TableHead>
                      <TableHead>Mã SV</TableHead>
                      <TableHead>Họ và tên</TableHead>
                      <TableHead className="text-center">Khoa</TableHead>
                      <TableHead className="text-center">Khóa</TableHead>
                      <TableHead className="text-center">Khu nhà</TableHead>
                      <TableHead className="text-center">Phòng</TableHead>
                      <TableHead className="text-center">Ngày vào ở</TableHead>
                      <TableHead className="text-center">Trạng thái</TableHead>
                      <TableHead className="text-center">SĐT</TableHead>
                      <TableHead className="w-24 text-center">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedStudents.map((student, idx) => (
                      <TableRow key={student.id}>
                        <TableCell className="text-center font-medium text-muted-foreground">{(safePage - 1) * pageSize + idx + 1}</TableCell>
                        <TableCell className="font-bold text-foreground whitespace-nowrap"><span title={student.studentId}>{student.studentId}</span></TableCell>
                        <TableCell className="font-medium text-foreground whitespace-nowrap"><span title={student.fullName}>{student.fullName}</span></TableCell>
                        <TableCell className="text-center text-muted-foreground whitespace-nowrap"><span title={student.faculty}>{student.faculty}</span></TableCell>
                        <TableCell className="text-center text-muted-foreground">{student.course}</TableCell>
                        <TableCell className="text-center font-medium text-foreground whitespace-nowrap"><span title={student.buildingCode}>{student.buildingCode}</span></TableCell>
                        <TableCell className="text-center font-medium text-foreground">{student.roomCode}</TableCell>
                        <TableCell className="text-center text-muted-foreground tabular-nums whitespace-nowrap">{student.moveInDate}</TableCell>
                        <TableCell className="text-center whitespace-nowrap">
                          <span className={`inline-flex min-w-[90px] items-center justify-center rounded px-2.5 py-0.5 text-[11px] font-semibold ${
                            student.status === 'Đang ở' ? 'bg-success-muted text-success' : 'bg-warning-muted text-warning'
                          }`}>
                            {student.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground tabular-nums whitespace-nowrap">{student.phone}</TableCell>
                        <TableCell className="text-center">
                          <RowActionsMenu
                            ariaLabel={`Thao tác sinh viên ${student.fullName}`}
                            actions={[
                              { id: 'view', label: 'Xem chi tiết', icon: <Eye size={16} />, onClick: () => openDetailModal(student) },
                              { id: 'edit', label: 'Sửa', icon: <PencilSimple size={16} />, onClick: () => openEditModal(student) },
                              { id: 'transfer', label: 'Chuyển phòng', icon: <ArrowsLeftRight size={16} />, onClick: () => openTransferModal(student) }
                            ]}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="lg:hidden flex flex-col gap-3 p-3">
                {paginatedStudents.map((student) => (
                  <MobileDataCard
                    key={student.id}
                    title={student.fullName}
                    subtitle={student.studentId}
                    statusBadge={
                      <span className={`inline-flex items-center justify-center rounded px-2.5 py-0.5 text-[11px] font-semibold ${
                        student.status === 'Đang ở' ? 'bg-success-muted text-success' : 'bg-warning-muted text-warning'
                      }`}>
                        {student.status}
                      </span>
                    }
                    actionMenu={
                      <RowActionsMenu
                        ariaLabel={`Thao tác sinh viên ${student.fullName}`}
                        actions={[
                          { id: 'view', label: 'Xem chi tiết', icon: <Eye size={16} />, onClick: () => openDetailModal(student) },
                          { id: 'edit', label: 'Sửa', icon: <PencilSimple size={16} />, onClick: () => openEditModal(student) },
                          { id: 'transfer', label: 'Chuyển phòng', icon: <ArrowsLeftRight size={16} />, onClick: () => openTransferModal(student) }
                        ]}
                      />
                    }
                  >
                    <DataLabel label="Phòng" value={`${student.buildingCode} - ${student.roomCode}`} />
                    <DataLabel label="Khoa/Khóa" value={`${student.faculty || '-'} / ${student.course || '-'}`} />
                    <DataLabel label="SĐT" value={student.phone || '-'} />
                    <DataLabel label="Ngày vào ở" value={student.moveInDate} />
                  </MobileDataCard>
                ))}
              </div>
              <Pagination
                page={safePage}
                totalPages={totalPages}
                total={filteredStudents.length}
                pageSize={pageSize}
                onPageChange={(p) => setCurrentPage(p)}
              />
            </>
          )}
        </div>
        )}
      </Card>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={selectedStudent ? (activeTab === 'transfer' ? 'Chuyển phòng' : 'Cập nhật thông tin') : 'Thêm sinh viên / Chuyển phòng'}
        size="3xl"
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
        {!selectedStudent && (
          <div className="flex border-b border-border/50 mb-4 px-2">
            <button 
              className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'new' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              onClick={() => setActiveTab('new')}
            >
              Thêm sinh viên mới
            </button>
            <button 
              className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'transfer' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              onClick={() => setActiveTab('transfer')}
            >
              Chuyển phòng cho sinh viên
            </button>
          </div>
        )}

        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar pr-2 pb-4">
          <form id="student-room-form" className="space-y-6">
            {activeTab === 'new' ? (
              <>
                <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-4 border-b border-border/50 pb-2">Thông tin sinh viên</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">
                        Mã sinh viên <span className="text-destructive">*</span>
                      </label>
                      <div className="relative">
                        <Input 
                          {...form.register('studentId')}
                          placeholder="Nhập mã sinh viên"
                          error={!!form.formState.errors.studentId}
                        />
                      </div>
                      {form.formState.errors.studentId && (
                        <p className="mt-1 text-xs text-destructive">{form.formState.errors.studentId.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">
                        Họ và tên <span className="text-destructive">*</span>
                      </label>
                      <Input 
                        {...form.register('fullName')}
                        placeholder="Nhập họ và tên"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-foreground">Khoa</label>
                        <Select {...form.register('faculty')}>
                          <option value="">Chọn khoa</option>
                          <option value="CNTT">CNTT</option>
                          <option value="Kinh tế">Kinh tế</option>
                          <option value="Điện tử">Điện tử</option>
                        </Select>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-foreground">Khóa</label>
                        <Select {...form.register('course')}>
                          <option value="">Chọn khóa</option>
                          <option value="K21">K21</option>
                          <option value="K22">K22</option>
                          <option value="K23">K23</option>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">Số điện thoại</label>
                      <Input 
                        {...form.register('phone')}
                        placeholder="Nhập số điện thoại"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-4 border-b border-border/50 pb-2">
                    Thông tin phòng ở
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid grid-cols-2 gap-3 md:col-span-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-foreground">
                          Khu nhà <span className="text-destructive">*</span>
                        </label>
                        <Select {...form.register('buildingCode')} error={!!form.formState.errors.buildingCode}>
                          <option value="">Chọn khu nhà</option>
                          {[...new Set(allRooms.map(r => r.floor?.building?.name).filter(Boolean))].map(name => (
                            <option key={name} value={name}>{name}</option>
                          ))}
                        </Select>
                        {form.formState.errors.buildingCode && (
                          <p className="mt-1 text-xs text-destructive">{form.formState.errors.buildingCode.message}</p>
                        )}
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-foreground">
                          Phòng <span className="text-destructive">*</span>
                        </label>
                        <Select {...form.register('roomCode')} error={!!form.formState.errors.roomCode}>
                          <option value="">Chọn phòng</option>
                          {allRooms
                            .filter(r => r.floor?.building?.name === form.watch('buildingCode'))
                            .map(r => (
                              <option key={r.id} value={r.roomCode}>
                                {r.roomCode} ({r.capacity - r.roomStudentAssignments.length}/{r.capacity} trống)
                              </option>
                            ))
                          }
                        </Select>
                        {form.formState.errors.roomCode && (
                          <p className="mt-1 text-xs text-destructive">{form.formState.errors.roomCode.message}</p>
                        )}
                      </div>

                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">
                        Ngày vào ở <span className="text-destructive">*</span>
                      </label>
                      <Input 
                        type="date"
                        {...form.register('moveInDate')}
                        error={!!form.formState.errors.moveInDate}
                      />
                      {form.formState.errors.moveInDate && (
                        <p className="mt-1 text-xs text-destructive">{form.formState.errors.moveInDate.message}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">
                        Ghi chú
                      </label>
                      <textarea 
                        {...form.register('notes')}
                        placeholder="Nhập ghi chú (nếu có)"
                        rows={2}
                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                      ></textarea>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3 border-b border-border/50 pb-2">Hồ sơ (nếu có)</h3>
                  <div className="border-2 border-dashed border-border rounded-xl px-6 py-8 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors cursor-pointer bg-background">
                    <FileArrowUp size={32} className="text-primary mb-2" weight="duotone" />
                    <p className="text-sm font-semibold text-foreground mb-1">Kéo thả file hoặc click để chọn file</p>
                    <p className="text-xs text-muted-foreground">Hỗ trợ: JPG, PNG, PDF (Tối đa 5MB)</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-4 border-b border-border/50 pb-2">1. Thông tin sinh viên</h3>
                  <div className="flex items-center gap-6">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/20">
                      <Users size={28} weight="duotone" />
                    </div>
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-8 gap-4">
                      <div className="col-span-2 md:col-span-2">
                        <p className="text-xs text-muted-foreground mb-1">Mã sinh viên</p>
                        <p className="text-sm font-bold text-foreground" title={selectedStudent?.studentId || ''}>{selectedStudent?.studentId || form.getValues('studentId')}</p>
                      </div>
                      <div className="col-span-2 md:col-span-2">
                        <p className="text-xs text-muted-foreground mb-1">Họ và tên</p>
                        <p className="text-sm font-bold text-foreground" title={selectedStudent?.fullName || ''}>{selectedStudent?.fullName || form.getValues('fullName')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Khoa</p>
                        <p className="text-sm font-bold text-foreground" title={selectedStudent?.faculty || ''}>{selectedStudent?.faculty || form.getValues('faculty')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Khóa</p>
                        <p className="text-sm font-bold text-foreground" title={selectedStudent?.course || ''}>{selectedStudent?.course || form.getValues('course')}</p>
                      </div>
                      <div className="col-span-2 md:col-span-2">
                        <p className="text-xs text-muted-foreground mb-1">SĐT</p>
                        <p className="text-sm font-bold text-foreground" title={selectedStudent?.phone || ''}>{selectedStudent?.phone || form.getValues('phone')}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-4 border-b border-border/50 pb-2">2. Thông tin phòng hiện tại</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-2">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Khu nhà</p>
                      <p className="text-sm font-bold text-foreground" title={selectedStudent?.buildingCode || ''}>{selectedStudent?.buildingCode || ''}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Phòng</p>
                      <p className="text-sm font-bold text-foreground" title={selectedStudent?.roomCode || ''}>{selectedStudent?.roomCode || ''}</p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Ngày vào ở</p>
                      <p className="text-sm font-bold text-foreground" title={selectedStudent?.moveInDate || ''}>{selectedStudent?.moveInDate || ''}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Trạng thái</p>
                      <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded text-[11px] font-bold ${selectedStudent?.status === 'Đang ở' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`} title={selectedStudent?.status || ''}>
                        {selectedStudent?.status || ''}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 relative">
                  <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-4 border-b border-primary/10 pb-2">3. Chọn phòng mới</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid grid-cols-2 gap-3 md:col-span-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-foreground">
                          Khu nhà <span className="text-destructive">*</span>
                        </label>
                        <Select {...form.register('buildingCode')} error={!!form.formState.errors.buildingCode}>
                          <option value="">Chọn khu nhà</option>
                          {[...new Set(allRooms.map(r => r.floor?.building?.name).filter(Boolean))].map(name => (
                            <option key={name} value={name}>{name}</option>
                          ))}
                        </Select>
                        {form.formState.errors.buildingCode && (
                          <p className="mt-1 text-xs text-destructive">{form.formState.errors.buildingCode.message}</p>
                        )}
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-foreground">
                          Phòng <span className="text-destructive">*</span>
                        </label>
                        <Select {...form.register('roomCode')} error={!!form.formState.errors.roomCode}>
                          <option value="">Chọn phòng</option>
                          {allRooms
                            .filter(r =>
                              r.roomCode !== selectedStudent?.roomCode &&
                              r.floor?.building?.name === form.watch('buildingCode')
                            )
                            .map(r => (
                              <option key={r.id} value={r.roomCode}>
                                {r.roomCode} ({r.capacity - r.roomStudentAssignments.length}/{r.capacity} trống)
                              </option>
                            ))
                          }
                        </Select>
                        {form.formState.errors.roomCode && (
                          <p className="mt-1 text-xs text-destructive">{form.formState.errors.roomCode.message}</p>
                        )}
                      </div>

                    </div>
                    
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-foreground">
                        Ngày chuyển <span className="text-destructive">*</span>
                      </label>
                      <Input 
                        type="date"
                        {...form.register('moveInDate')}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-foreground">
                        Lý do chuyển / Ghi chú
                      </label>
                      <textarea 
                        {...form.register('notes')}
                        placeholder="Nhập lý do..."
                        rows={2}
                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                      ></textarea>
                    </div>
                  </div>
                </div>
              </>
            )}
          </form>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal 
        isOpen={!!detailStudent} 
        onClose={() => setDetailStudent(null)} 
        title="Chi tiết sinh viên"
        size="md"
        footer={
          <Button variant="outline" onClick={() => setDetailStudent(null)}>Đóng</Button>
        }
      >
        {detailStudent && (
          <div className="space-y-5">
            <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-4 border-b border-border/50 pb-2">
                <Users size={14} className="inline mr-1.5 -mt-0.5" weight="duotone" />
                Thông tin sinh viên
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Mã sinh viên</p>
                  <p className="text-sm font-semibold text-foreground">{detailStudent.studentId}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Họ và tên</p>
                  <p className="text-sm font-semibold text-foreground">{detailStudent.fullName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Khoa</p>
                  <p className="text-sm font-semibold text-foreground">{detailStudent.faculty || <span className="text-muted-foreground italic">Chưa cập nhật</span>}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Khóa</p>
                  <p className="text-sm font-semibold text-foreground">{detailStudent.course || <span className="text-muted-foreground italic">Chưa cập nhật</span>}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground mb-0.5">Số điện thoại</p>
                  <p className="text-sm font-semibold text-foreground">{detailStudent.phone || <span className="text-muted-foreground italic">Chưa cập nhật</span>}</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-4 border-b border-border/50 pb-2">
                <Door size={14} className="inline mr-1.5 -mt-0.5" weight="duotone" />
                Thông tin phòng
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Khu nhà</p>
                  <p className="text-sm font-semibold text-foreground">{detailStudent.buildingCode}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Phòng</p>
                  <p className="text-sm font-semibold text-foreground">{detailStudent.roomCode}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Ngày vào ở</p>
                  <p className="text-sm font-semibold text-foreground">{detailStudent.moveInDate}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Trạng thái</p>
                  <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded text-[11px] font-bold mt-0.5 ${detailStudent.status === 'Đang ở' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {detailStudent.status}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}


