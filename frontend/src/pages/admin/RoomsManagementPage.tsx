import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../toast/toast-context';
import { getRooms, createRoom, updateRoom, deleteRoom } from '../../services/locations';

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
  CaretRight
} from '@phosphor-icons/react';
import { Card, CardContent } from '../../components/ui/Card';
import { SummaryCard } from '../../components/ui/SummaryCard';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { PageHeader } from '../../components/ui/PageHeader';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../components/ui/Table';

type RoomRecord = {
  id: string;
  code: string;
  roomCode: string;
  name: string;
  buildingId: string;
  buildingCode: string;
  buildingName: string;
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
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<RoomRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoomRecord | null>(null);

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

  useEffect(() => {
    loadRooms();
  }, []);

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
    } catch {
      showToast('Lưu thông tin thất bại.', 'error');
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

  const totalRooms = rooms.length;
  const activeRooms = rooms.filter(r => r.status === 'Đang sử dụng').length;
  const hasStudentRooms = rooms.filter(r => r.currentStudents > 0).length;
  const emptyRooms = rooms.filter(r => r.currentStudents === 0 && r.status !== 'Đang sửa chữa').length;
  const repairingRooms = rooms.filter(r => r.status === 'Đang sửa chữa' || r.condition === 'Đang sửa').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size={32} className="animate-spin text-primary" />
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

      <Card className="border-border/50">
        <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Tìm kiếm</label>
            <div className="relative">
              <Input placeholder="Nhập mã phòng, tên phòng..." className="pl-9" />
              <MagnifyingGlass size={16} className="absolute left-3 top-2.5 text-muted-foreground" />
            </div>
          </div>
          <div className="w-full md:w-[150px]">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Khu nhà</label>
            <Select>
              <option>Tất cả</option>
              <option>Khu A</option>
              <option>Khu B</option>
            </Select>
          </div>
          <div className="w-full md:w-[150px]">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Trạng thái sử dụng</label>
            <Select>
              <option>Tất cả</option>
              <option>Đang sử dụng</option>
              <option>Còn trống</option>
            </Select>
          </div>
          <div className="w-full md:w-[150px]">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Số sinh viên</label>
            <Select>
              <option>Tất cả</option>
              <option>Đầy</option>
              <option>Chưa đầy</option>
            </Select>
          </div>
          
          <div className="flex w-full items-center gap-2 md:w-auto">
            <Button className="flex-1 gap-2 md:flex-none" onClick={loadRooms}>
              <Funnel size={16} weight="bold" />
              Lọc
            </Button>
            <Button variant="outline" className="flex-1 gap-2 md:flex-none" onClick={loadRooms}>
              <ArrowsClockwise size={16} weight="bold" />
              Làm mới
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 overflow-hidden">
        {isFetching ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size={24} className="animate-spin text-primary" />
          </div>
        ) : (
          <>
            <Table>
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
                  <TableHead className="w-32 text-center">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rooms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">Không có dữ liệu phòng</TableCell>
                  </TableRow>
                ) : (
                  rooms.map((room, idx) => (
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
                          room.status === 'Đang sử dụng' ? 'bg-emerald-100 text-emerald-700' :
                          room.status === 'Còn trống' ? 'bg-blue-100 text-blue-700' :
                          'bg-rose-100 text-rose-700'
                        }`}>
                          {room.status === 'Còn trống' ? 'Phòng trống' : room.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{room.conditionLabel || room.condition}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" title="Xem chi tiết">
                            <Eye size={16} className="text-muted-foreground" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEditModal(room)} title="Sửa">
                            <PencilSimple size={16} className="text-muted-foreground" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(room)} title="Xóa">
                            <Trash size={16} className="text-rose-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            
            <div className="flex items-center justify-between border-t border-border/50 bg-muted/30 px-6 py-4">
              <div className="text-sm text-muted-foreground">
                Hiển thị 1 - {rooms.length} / {rooms.length} kết quả
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled className="gap-1">
                  <CaretLeft size={16} />
                  Trước
                </Button>
                <Button variant="outline" size="sm" disabled className="gap-1">
                  Sau
                  <CaretRight size={16} />
                </Button>
              </div>
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
                <option value="Khu A">Khu A</option>
                <option value="Khu B">Khu B</option>
                <option value="Khu C">Khu C</option>
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
                <option value="1">Tầng 1</option>
                <option value="2">Tầng 2</option>
                <option value="3">Tầng 3</option>
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

      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Xác nhận xóa"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Hủy</Button>
            <Button variant="destructive" onClick={() => void confirmDelete()}>Xóa phòng</Button>
          </>
        }
      >
        <p className="py-4 text-sm leading-6 text-muted-foreground">
          {deleteTarget ? `Phòng ${deleteTarget.roomCode} sẽ bị xóa khỏi danh sách. Bạn có chắc chắn?` : ''}
        </p>
      </Modal>
    </div>
  );
}


