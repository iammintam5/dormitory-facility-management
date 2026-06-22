import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useToast } from '../../toast/toast-context';

import { 
  Users,
  UserCheck,
  UserMinus,
  Door,
  Plus,
  Funnel,
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
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { PageHeader } from '../../components/ui/PageHeader';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../components/ui/Table';

const studentRoomSchema = z.object({
  studentId: z.string().min(1, 'Nhập mã sinh viên.'),
  fullName: z.string().min(1, 'Nhập họ và tên.'),
  faculty: z.string().optional(),
  course: z.string().optional(),
  phone: z.string().optional(),
  buildingCode: z.string().min(1, 'Chọn khu nhà.'),
  roomCode: z.string().min(1, 'Chọn phòng.'),
  bed: z.string().min(1, 'Chọn giường.'),
  moveInDate: z.string().min(1, 'Chọn ngày vào ở.'),
  notes: z.string().optional(),
});

type StudentRoomFormValues = z.infer<typeof studentRoomSchema>;

type RoomStudent = {
  id: number;
  studentId: string;
  fullName: string;
  faculty: string;
  course: string;
  buildingCode: string;
  roomCode: string;
  bed: string;
  moveInDate: string;
  status: 'Đang ở' | 'Đã chuyển';
  phone: string;
};

const mockStudents: RoomStudent[] = [
  { id: 1, studentId: 'SV00123', fullName: 'Nguyễn Văn An', faculty: 'CNTT', course: 'K21', buildingCode: 'Khu A', roomCode: 'A101', bed: '01', moveInDate: '01/09/2024', status: 'Đang ở', phone: '0987 654 321' },
  { id: 2, studentId: 'SV00124', fullName: 'Trần Thị Bình', faculty: 'KTĐT', course: 'K21', buildingCode: 'Khu A', roomCode: 'A101', bed: '02', moveInDate: '01/09/2024', status: 'Đang ở', phone: '0965 432 123' },
  { id: 3, studentId: 'SV00125', fullName: 'Lê Hoàng Cường', faculty: 'Điện - Điện tử', course: 'K20', buildingCode: 'Khu A', roomCode: 'A101', bed: '03', moveInDate: '01/09/2024', status: 'Đang ở', phone: '0977 123 456' },
  { id: 4, studentId: 'SV00126', fullName: 'Phạm Minh Dũng', faculty: 'CNTT', course: 'K21', buildingCode: 'Khu A', roomCode: 'A101', bed: '04', moveInDate: '01/09/2024', status: 'Đang ở', phone: '0912 345 678' },
  { id: 5, studentId: 'SV00127', fullName: 'Võ Thị Hà', faculty: 'Kế toán', course: 'K22', buildingCode: 'Khu A', roomCode: 'A102', bed: '01', moveInDate: '02/09/2024', status: 'Đang ở', phone: '0909 876 543' },
  { id: 6, studentId: 'SV00128', fullName: 'Đặng Quốc Huy', faculty: 'Cơ khí', course: 'K20', buildingCode: 'Khu B', roomCode: 'B201', bed: '01', moveInDate: '01/09/2024', status: 'Đang ở', phone: '0988 765 432' },
  { id: 7, studentId: 'SV00129', fullName: 'Ngô Thanh Long', faculty: 'Xây dựng', course: 'K21', buildingCode: 'Khu B', roomCode: 'B201', bed: '02', moveInDate: '01/09/2024', status: 'Đã chuyển', phone: '0933 222 111' },
  { id: 8, studentId: 'SV00130', fullName: 'Bùi Khánh Linh', faculty: 'Kinh tế', course: 'K22', buildingCode: 'Khu C', roomCode: 'C301', bed: '01', moveInDate: '03/09/2024', status: 'Đang ở', phone: '0944 333 222' },
];

export function RoomStudentsManagementPage() {
  const { showToast } = useToast();
  
  const [students, setStudents] = useState<RoomStudent[]>(mockStudents);
  const [isLoading, setIsLoading] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'new' | 'transfer'>('new');
  const [selectedStudent, setSelectedStudent] = useState<RoomStudent | null>(null);

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
      bed: '',
      moveInDate: '',
      notes: ''
    },
  });

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
      bed: '',
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
      bed: student.bed,
      moveInDate: student.moveInDate,
      notes: ''
    });
    setIsModalOpen(true);
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
      bed: '',
      moveInDate: '',
      notes: `Chuyển từ phòng ${student.roomCode}`
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: StudentRoomFormValues) => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      if (activeTab === 'transfer') {
        showToast(`Đã chuyển phòng cho sinh viên ${data.fullName}`, 'success');
      } else {
        showToast(selectedStudent ? 'Cập nhật thông tin thành công.' : 'Thêm sinh viên thành công.', 'success');
      }
      setIsModalOpen(false);
    } catch (error) {
      showToast('Lưu thông tin thất bại.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const totalStudents = 512;
  const activeStudents = 487;
  const transferredStudents = 25;
  const totalRoomsWithStudents = 112;

  const activePercent = ((activeStudents / totalStudents) * 100).toFixed(1);
  const transferPercent = ((transferredStudents / totalStudents) * 100).toFixed(1);

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

      <Card className="border-border/50">
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="lg:col-span-1">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Tìm kiếm</label>
              <div className="relative">
                <Input placeholder="Mã SV, họ tên..." className="pl-9" />
                <MagnifyingGlass size={16} className="absolute left-3 top-2.5 text-muted-foreground" />
              </div>
            </div>
            
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Khu nhà</label>
              <Select>
                <option>Tất cả</option>
                <option>Khu A</option>
                <option>Khu B</option>
              </Select>
            </div>
            
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Phòng</label>
              <Select>
                <option>Tất cả</option>
              </Select>
            </div>
            
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Trạng thái</label>
              <Select>
                <option>Tất cả</option>
                <option>Đang ở</option>
                <option>Đã chuyển</option>
              </Select>
            </div>
            
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Khoa</label>
              <Select>
                <option>Tất cả</option>
                <option>CNTT</option>
                <option>Kinh tế</option>
              </Select>
            </div>
            
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Khóa</label>
              <Select>
                <option>Tất cả</option>
                <option>K21</option>
                <option>K22</option>
              </Select>
            </div>
          </div>
          
          <div className="flex w-full items-center justify-end gap-2 pt-2">
            <Button className="gap-2">
              <Funnel size={16} weight="bold" />
              Lọc
            </Button>
            <Button variant="outline" className="gap-2">
              <ArrowsClockwise size={16} weight="bold" />
              Làm mới
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 text-center">STT</TableHead>
                <TableHead>Mã SV</TableHead>
                <TableHead>Họ và tên</TableHead>
                <TableHead className="text-center">Khoa</TableHead>
                <TableHead className="text-center">Khóa</TableHead>
                <TableHead className="text-center">Khu nhà</TableHead>
                <TableHead className="text-center">Phòng</TableHead>
                <TableHead className="text-center">Giường</TableHead>
                <TableHead className="text-center">Ngày vào ở</TableHead>
                <TableHead className="text-center">Trạng thái</TableHead>
                <TableHead className="text-center">SĐT</TableHead>
                <TableHead className="w-32 text-center">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="h-24 text-center text-muted-foreground">
                    Không có dữ liệu sinh viên
                  </TableCell>
                </TableRow>
              ) : (
                students.map((student, idx) => (
                  <TableRow key={student.id}>
                    <TableCell className="text-center font-medium text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="font-bold text-foreground">{student.studentId}</TableCell>
                    <TableCell className="font-medium text-foreground">{student.fullName}</TableCell>
                    <TableCell className="text-center text-muted-foreground">{student.faculty}</TableCell>
                    <TableCell className="text-center text-muted-foreground">{student.course}</TableCell>
                    <TableCell className="text-center font-medium text-foreground">{student.buildingCode}</TableCell>
                    <TableCell className="text-center font-medium text-foreground">{student.roomCode}</TableCell>
                    <TableCell className="text-center tabular-nums">{student.bed}</TableCell>
                    <TableCell className="text-center text-muted-foreground tabular-nums">{student.moveInDate}</TableCell>
                    <TableCell className="text-center">
                      <span className={`inline-flex min-w-[90px] items-center justify-center rounded px-2.5 py-0.5 text-[11px] font-semibold ${
                        student.status === 'Đang ở' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {student.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground tabular-nums">{student.phone}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" title="Xem chi tiết">
                          <Eye size={16} className="text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEditModal(student)} title="Sửa">
                          <PencilSimple size={16} className="text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openTransferModal(student)} title="Chuyển phòng">
                          <ArrowsLeftRight size={16} className="text-primary" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        <div className="flex items-center justify-between border-t border-border/50 bg-muted/30 px-6 py-4">
          <div className="text-sm text-muted-foreground">
            Hiển thị 1 đến {students.length} của {totalStudents} kết quả
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled className="gap-1">
              <CaretLeft size={16} /> Trước
            </Button>
            <Button variant="outline" size="sm" className="gap-1">
              Sau <CaretRight size={16} />
            </Button>
          </div>
        </div>
      </Card>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={selectedStudent ? (activeTab === 'transfer' ? 'Chuyển phòng' : 'Cập nhật thông tin') : 'Thêm sinh viên / Chuyển phòng'}
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
                    <div className="grid grid-cols-3 gap-3 md:col-span-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-foreground">
                          Khu nhà <span className="text-destructive">*</span>
                        </label>
                        <Select {...form.register('buildingCode')} error={!!form.formState.errors.buildingCode}>
                          <option value="">Chọn khu nhà</option>
                          <option value="Khu A">Khu A</option>
                          <option value="Khu B">Khu B</option>
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
                          <option value="A101">A101</option>
                          <option value="A102">A102</option>
                        </Select>
                        {form.formState.errors.roomCode && (
                          <p className="mt-1 text-xs text-destructive">{form.formState.errors.roomCode.message}</p>
                        )}
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-foreground">
                          Giường <span className="text-destructive">*</span>
                        </label>
                        <Select {...form.register('bed')} error={!!form.formState.errors.bed}>
                          <option value="">Chọn giường</option>
                          <option value="01">01</option>
                          <option value="02">02</option>
                          <option value="03">03</option>
                          <option value="04">04</option>
                        </Select>
                        {form.formState.errors.bed && (
                          <p className="mt-1 text-xs text-destructive">{form.formState.errors.bed.message}</p>
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
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Mã sinh viên</p>
                        <p className="text-sm font-bold text-foreground">{form.getValues('studentId') || 'SV00123'}</p>
                      </div>
                      <div className="col-span-2 md:col-span-1">
                        <p className="text-xs text-muted-foreground mb-1">Họ và tên</p>
                        <p className="text-sm font-bold text-foreground">{form.getValues('fullName') || 'Nguyễn Văn A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Khoa</p>
                        <p className="text-sm font-bold text-foreground">{form.getValues('faculty') || 'CNTT'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Khóa</p>
                        <p className="text-sm font-bold text-foreground">{form.getValues('course') || 'K21'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">SĐT</p>
                        <p className="text-sm font-bold text-foreground">{form.getValues('phone') || '0987 654 321'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-4 border-b border-border/50 pb-2">2. Thông tin phòng hiện tại</h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 px-2">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Khu nhà</p>
                      <p className="text-sm font-bold text-foreground">Khu A</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Phòng</p>
                      <p className="text-sm font-bold text-foreground">A101</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Giường</p>
                      <p className="text-sm font-bold text-foreground">01</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Ngày vào ở</p>
                      <p className="text-sm font-bold text-foreground">01/09/2024</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Trạng thái</p>
                      <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-700">
                        Đang ở
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 relative">
                  <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-4 border-b border-primary/10 pb-2">3. Chọn phòng mới</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid grid-cols-3 gap-3 md:col-span-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-foreground">
                          Khu nhà <span className="text-destructive">*</span>
                        </label>
                        <Select {...form.register('buildingCode')}>
                          <option value="">Chọn khu nhà</option>
                          <option value="Khu A">Khu A</option>
                          <option value="Khu B">Khu B</option>
                        </Select>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-foreground">
                          Phòng <span className="text-destructive">*</span>
                        </label>
                        <Select {...form.register('roomCode')}>
                          <option value="">Chọn phòng</option>
                          <option value="A102">A102</option>
                          <option value="B201">B201</option>
                        </Select>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-foreground">
                          Giường <span className="text-destructive">*</span>
                        </label>
                        <Select {...form.register('bed')}>
                          <option value="">Chọn giường</option>
                          <option value="01">01</option>
                          <option value="02">02</option>
                        </Select>
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
    </div>
  );
}


