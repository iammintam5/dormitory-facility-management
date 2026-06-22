import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Modal } from '../../components/ui/Modal';
import { getApiErrorMessage } from '../../lib/api-client';
import {
  createBuilding,
  deleteBuilding,
  getBuildings,
  updateBuilding,
  type BuildingRecord,
} from '../../services/locations';
import { useToast } from '../../toast/toast-context';

import { 
  Buildings,
  DoorOpen,
  Desktop,
  Users,
  Plus,
  PencilSimple,
  Trash,
  Spinner
} from '@phosphor-icons/react';
import { Card, CardContent } from '../../components/ui/Card';
import { SummaryCard } from '../../components/ui/SummaryCard';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { PageHeader } from '../../components/ui/PageHeader';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../components/ui/Table';

const locationSchema = z.object({
  code: z.string().min(1, 'Nhập mã khu nhà.'),
  name: z.string().min(1, 'Nhập tên khu nhà.'),
  floors: z.coerce.number().min(1, 'Nhập số tầng.'),
  rooms: z.coerce.number().min(0, 'Nhập số phòng.'),
  status: z.string().default('Đang hoạt động'),
  description: z.string().optional(),
});

type LocationFormValues = z.infer<typeof locationSchema>;
type BuildingView = {
  id: string;
  code: string;
  name: string;
  floors: number;
  rooms: number;
  status: string;
  description?: string;
};

export function LocationsManagementPage() {
  const { showToast } = useToast();
  const [buildings, setBuildings] = useState<BuildingView[]>([]);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('Tất cả');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingView | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BuildingView | null>(null);

  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      code: '',
      name: '',
      floors: 1,
      rooms: 0,
      status: 'Đang hoạt động',
      description: '',
    },
  });

  useEffect(() => {
    void loadBuildings();
  }, []);

  async function loadBuildings() {
    setIsLoading(true);
    try {
      const response = await getBuildings();
      setBuildings(response.map(mapBuilding));
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Không thể tải danh sách khu nhà.'), 'error');
    } finally {
      setIsLoading(false);
    }
  }

  function openAddModal() {
    setSelectedBuilding(null);
    form.reset({
      code: '',
      name: '',
      floors: 1,
      rooms: 0,
      status: 'Đang hoạt động',
      description: '',
    });
    setIsModalOpen(true);
  }

  function openEditModal(building: BuildingView) {
    setSelectedBuilding(building);
    form.reset({
      code: building.code,
      name: building.name,
      floors: building.floors,
      rooms: building.rooms,
      status: building.status,
      description: building.description ?? '',
    });
    setIsModalOpen(true);
  }

  async function onSubmit(data: LocationFormValues) {
    try {
      if (selectedBuilding) {
        await updateBuilding(selectedBuilding.id, {
          code: data.code,
          name: data.name,
          status: data.status === 'Đang hoạt động' ? 'ACTIVE' : 'INACTIVE',
          description: data.description || null,
        });
        showToast('Cập nhật khu nhà thành công.', 'success');
      } else {
        await createBuilding({
          code: data.code,
          name: data.name,
          status: data.status === 'Đang hoạt động' ? 'ACTIVE' : 'INACTIVE',
          description: data.description || null,
        });
        showToast('Thêm khu nhà thành công.', 'success');
      }
      setIsModalOpen(false);
      await loadBuildings();
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Lưu khu nhà thất bại.'), 'error');
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteBuilding(deleteTarget.id);
      showToast('Xóa khu nhà thành công.', 'success');
      setDeleteTarget(null);
      await loadBuildings();
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Xóa khu nhà thất bại.'), 'error');
    }
  }

  const filteredBuildings = useMemo(
    () =>
      buildings.filter((building) => {
        const matchKeyword =
          !keyword ||
          `${building.code} ${building.name} ${building.description ?? ''}`
            .toLowerCase()
            .includes(keyword.toLowerCase());
        const matchStatus = statusFilter === 'Tất cả' || building.status === statusFilter;
        return matchKeyword && matchStatus;
      }),
    [buildings, keyword, statusFilter],
  );

  const totalBuildings = filteredBuildings.length;
  const totalRooms = filteredBuildings.reduce((sum, building) => sum + building.rooms, 0);
  const totalDevices = filteredBuildings.reduce((sum, building) => sum + building.rooms * 28, 0);
  const totalStudents = filteredBuildings.reduce((sum, building) => sum + building.rooms * 5, 0);

  return (
    <div className="space-y-6 mx-auto max-w-7xl pb-10">
      <PageHeader 
        title="Khu nhà" 
        description="Quản lý danh sách các tòa nhà, khu nhà lưu trú."
        actions={
          <Button onClick={openAddModal} className="gap-2">
            <Plus size={16} weight="bold" />
            Thêm khu nhà
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard 
          label="Tổng số khu nhà" 
          value={String(totalBuildings)} 
          unit="khu" 
          icon={<Buildings size={24} weight="duotone" />} 
          colorClass="text-blue-600 bg-blue-50 border-blue-100" 
        />
        <SummaryCard 
          label="Tổng số phòng" 
          value={String(totalRooms)} 
          unit="phòng" 
          icon={<DoorOpen size={24} weight="duotone" />} 
          colorClass="text-emerald-600 bg-emerald-50 border-emerald-100" 
        />
        <SummaryCard 
          label="Tổng số thiết bị" 
          value={totalDevices.toLocaleString('vi-VN')} 
          unit="thiết bị" 
          icon={<Desktop size={24} weight="duotone" />} 
          colorClass="text-amber-600 bg-amber-50 border-amber-100" 
        />
        <SummaryCard 
          label="Tổng số sinh viên" 
          value={totalStudents.toLocaleString('vi-VN')} 
          unit="sinh viên" 
          icon={<Users size={24} weight="duotone" />} 
          colorClass="text-purple-600 bg-purple-50 border-purple-100" 
        />
      </div>

      <Card className="border-border/50">
        <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-end">
          <div className="flex-1 w-full">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Tìm kiếm</label>
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Nhập tên hoặc mã khu nhà..."
            />
          </div>

          <div className="w-full md:w-64">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Trạng thái</label>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option>Tất cả</option>
              <option>Đang hoạt động</option>
              <option>Ngừng hoạt động</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size={32} className="animate-spin text-primary" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 text-center">STT</TableHead>
                <TableHead>Mã khu nhà</TableHead>
                <TableHead>Tên khu nhà</TableHead>
                <TableHead className="text-center">Số tầng</TableHead>
                <TableHead className="text-center">Số phòng</TableHead>
                <TableHead>Mô tả</TableHead>
                <TableHead className="text-center">Trạng thái</TableHead>
                <TableHead className="w-24 text-center">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBuildings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    Không có dữ liệu khu nhà
                  </TableCell>
                </TableRow>
              ) : filteredBuildings.map((building, idx) => (
                <TableRow key={building.id}>
                  <TableCell className="text-center font-medium text-muted-foreground">{idx + 1}</TableCell>
                  <TableCell className="font-bold text-foreground">{building.code}</TableCell>
                  <TableCell className="font-medium text-foreground">{building.name}</TableCell>
                  <TableCell className="text-center tabular-nums">{building.floors}</TableCell>
                  <TableCell className="text-center tabular-nums">{building.rooms}</TableCell>
                  <TableCell className="text-muted-foreground">{building.description || '-'}</TableCell>
                  <TableCell className="text-center">
                    <span className={`inline-flex items-center justify-center rounded px-2.5 py-0.5 text-[11px] font-semibold ${building.status === 'Đang hoạt động' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {building.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditModal(building)}>
                        <PencilSimple size={16} className="text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(building)}>
                        <Trash size={16} className="text-rose-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={selectedBuilding ? 'Cập nhật khu nhà' : 'Thêm khu nhà'}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Hủy</Button>
            <Button onClick={form.handleSubmit(onSubmit)} disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Spinner className="mr-2 animate-spin" />}
              Lưu
            </Button>
          </>
        }
      >
        <form id="location-form" className="space-y-4 py-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Mã khu nhà <span className="text-destructive">*</span>
            </label>
            <Input 
              {...form.register('code')} 
              placeholder="VD: TOA_A" 
              error={!!form.formState.errors.code}
            />
            {form.formState.errors.code && (
              <p className="mt-1 text-xs text-destructive">{form.formState.errors.code.message}</p>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Tên khu nhà <span className="text-destructive">*</span>
            </label>
            <Input 
              {...form.register('name')} 
              placeholder="VD: Tòa A" 
              error={!!form.formState.errors.name}
            />
            {form.formState.errors.name && (
              <p className="mt-1 text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Số tầng <span className="text-destructive">*</span>
              </label>
              <Input 
                type="number" 
                {...form.register('floors')} 
                error={!!form.formState.errors.floors}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Số phòng <span className="text-destructive">*</span>
              </label>
              <Input 
                type="number" 
                {...form.register('rooms')} 
                error={!!form.formState.errors.rooms}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Mô tả</label>
            <textarea 
              {...form.register('description')} 
              placeholder="Nhập mô tả..." 
              rows={4} 
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Trạng thái</label>
            <Select {...form.register('status')}>
              <option value="Đang hoạt động">Đang hoạt động</option>
              <option value="Ngừng hoạt động">Ngừng hoạt động</option>
            </Select>
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
            <Button variant="destructive" onClick={() => void confirmDelete()}>Xóa khu nhà</Button>
          </>
        }
      >
        <p className="text-sm leading-6 text-muted-foreground py-4">
          {deleteTarget
            ? `Khu nhà ${deleteTarget.code} - ${deleteTarget.name} sẽ bị xóa khỏi hệ thống. Bạn có chắc chắn?`
            : ''}
        </p>
      </Modal>
    </div>
  );
}

function mapBuilding(building: BuildingRecord): BuildingView {
  const floors = new Set(building.rooms.map((room) => room.floorNumber)).size || 1;
  return {
    id: building.id,
    code: building.code,
    name: building.name,
    floors,
    rooms: building.rooms.length,
    status: building.status === 'ACTIVE' ? 'Đang hoạt động' : 'Ngừng hoạt động',
    description: building.description ?? '',
  };
}


