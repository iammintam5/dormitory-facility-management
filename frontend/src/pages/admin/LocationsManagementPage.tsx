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
  batchUpdateRooms,
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
  Spinner,
  Eye
} from '@phosphor-icons/react';
import { Card, CardContent } from '../../components/ui/Card';
import { SummaryCard } from '../../components/ui/SummaryCard';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { SkeletonStatCard, SkeletonTable } from '../../components/ui/Skeleton';
import { PageHeader } from '../../components/ui/PageHeader';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../components/ui/Table';
import { EmptyState } from '../../components/ui/EmptyState';
import { SearchInput } from '../../components/ui/SearchInput';
import { FilterBar } from '../../components/ui/FilterBar';
import { RowActionsMenu } from '../../components/ui/RowActionsMenu';
import { MobileDataCard, DataLabel } from '../../components/ui/MobileDataCard';
import { AlertDialog } from '../../components/ui/AlertDialog';
import { useDebounce } from '../../hooks/useDebounce';

const locationSchema = z.object({
  code: z.string().min(1, 'Nhập mã khu nhà.'),
  name: z.string().min(1, 'Nhập tên khu nhà.'),
  floors: z.coerce.number().min(1, 'Nhập số tầng.'),
  rooms: z.coerce.number().min(1, 'Nhập số phòng, tối thiểu 1.'),
  defaultCapacity: z.coerce.number().min(1, 'Sức chứa tối thiểu 1.').default(4),
  defaultRoomType: z.string().optional(),
  defaultAreaM2: z.coerce.number().min(0).optional(),
  defaultCondition: z.string().default('Tốt'),
  defaultNote: z.string().optional(),
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
  const [rawBuildings, setRawBuildings] = useState<BuildingRecord[]>([]);
  const [keyword, setKeyword] = useState('');
  const debouncedKeyword = useDebounce(keyword, 400);
  const [statusFilter, setStatusFilter] = useState('Tất cả');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingView | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BuildingView | null>(null);

  // Room management state
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [roomBuilding, setRoomBuilding] = useState<BuildingView | null>(null);
  const [buildingRooms, setBuildingRooms] = useState<BuildingRecord['rooms']>([]);
  const [selectedRoomIds, setSelectedRoomIds] = useState<Set<string>>(new Set());
  const [batchCapacity, setBatchCapacity] = useState(4);
  const [batchRoomType, setBatchRoomType] = useState('');
  const [batchAreaM2, setBatchAreaM2] = useState('');
  const [batchCondition, setBatchCondition] = useState('');
  const [batchNote, setBatchNote] = useState('');
  const [isBatchUpdating, setIsBatchUpdating] = useState(false);

  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      code: '',
      name: '',
      floors: 1,
      rooms: 1,
      defaultCapacity: 4,
      defaultRoomType: '',
      defaultAreaM2: undefined,
      defaultCondition: 'Tốt',
      defaultNote: '',
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
      setRawBuildings(response);
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
      rooms: 1,
      defaultCapacity: 4,
      defaultRoomType: '',
      defaultAreaM2: undefined,
      defaultCondition: 'Tốt',
      defaultNote: '',
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
          floors: data.floors,
          rooms: data.rooms,
          defaultCapacity: data.defaultCapacity,
          defaultRoomType: data.defaultRoomType || null,
          defaultAreaM2: data.defaultAreaM2 || null,
          defaultCondition: data.defaultCondition || null,
          defaultNote: data.defaultNote || null,
        });
        showToast('Thêm khu nhà thành công.', 'success');
      }
      setIsModalOpen(false);
      await loadBuildings();
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Lưu khu nhà thất bại.'), 'error');
    }
  }

  function openRoomModal(building: BuildingView, rooms: BuildingRecord['rooms']) {
    setRoomBuilding(building);
    setBuildingRooms(rooms);
    setSelectedRoomIds(new Set());
    setBatchCapacity(4);
    setBatchRoomType('');
    setBatchAreaM2('');
    setBatchCondition('');
    setBatchNote('');
    setIsRoomModalOpen(true);
  }

  function toggleSelectRoom(roomId: string) {
    setSelectedRoomIds(prev => {
      const next = new Set(prev);
      if (next.has(roomId)) next.delete(roomId);
      else next.add(roomId);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedRoomIds.size === buildingRooms.length) {
      setSelectedRoomIds(new Set());
    } else {
      setSelectedRoomIds(new Set(buildingRooms.map(r => r.id)));
    }
  }

  async function handleBatchUpdate() {
    if (!roomBuilding || selectedRoomIds.size === 0) return;
    setIsBatchUpdating(true);
    try {
      await batchUpdateRooms(roomBuilding.id, {
        roomIds: Array.from(selectedRoomIds).map(Number),
        capacity: batchCapacity,
        roomType: batchRoomType || undefined,
        areaM2: batchAreaM2 ? Number(batchAreaM2) : undefined,
        condition: batchCondition || undefined,
        note: batchNote || undefined,
      });
      showToast(`Đã cập nhật ${selectedRoomIds.size} phòng.`, 'success');
      setIsRoomModalOpen(false);
      await loadBuildings();
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Cập nhật phòng thất bại.'), 'error');
    } finally {
      setIsBatchUpdating(false);
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
          !debouncedKeyword ||
          `${building.code} ${building.name} ${building.description ?? ''}`
            .toLowerCase()
            .includes(debouncedKeyword.toLowerCase());
        const matchStatus = statusFilter === 'Tất cả' || building.status === statusFilter;
        return matchKeyword && matchStatus;
      }),
    [buildings, debouncedKeyword, statusFilter],
  );

  const totalBuildings = filteredBuildings.length;
  const totalRooms = filteredBuildings.reduce((sum, building) => sum + building.rooms, 0);
  const visibleBuildingIds = new Set(filteredBuildings.map((building) => building.id));
  const visibleRawBuildings = rawBuildings.filter((building) => visibleBuildingIds.has(building.id));
  const totalDevices = visibleRawBuildings.reduce(
    (sum, building) => sum + building.rooms.reduce((roomSum, room) => roomSum + (room.assetCount ?? 0), 0),
    0,
  );
  const totalStudents = visibleRawBuildings.reduce(
    (sum, building) => sum + building.rooms.reduce((roomSum, room) => roomSum + (room.currentStudents ?? room.assignments.length), 0),
    0,
  );

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

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)}
        </div>
      ) : (
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
      )}

      <FilterBar 
        searchNode={
          <SearchInput
            value={keyword}
            onChange={setKeyword}
            placeholder="Nhập tên hoặc mã khu nhà..."
            aria-label="Tìm kiếm khu nhà"
          />
        }
        filterNode={
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Lọc theo trạng thái"
          >
            <option value="Tất cả">Tất cả trạng thái</option>
            <option value="Đang hoạt động">Đang hoạt động</option>
            <option value="Ngừng hoạt động">Ngừng hoạt động</option>
          </Select>
        }
        appliedFilterCount={[
          statusFilter !== 'Tất cả' ? statusFilter : ''
        ].filter(Boolean).length}
        onResetFilters={() => {
          setKeyword('');
          setStatusFilter('Tất cả');
        }}
        filterChips={[
          ...(statusFilter !== 'Tất cả' ? [{ id: 'status', label: `Trạng thái: ${statusFilter}`, onRemove: () => setStatusFilter('Tất cả') }] : []),
        ]}
      />

      <Card className="border-border/50 overflow-hidden">
        {isLoading ? (
          <div className="p-5 bg-card">
            <SkeletonTable rows={5} cols={5} />
          </div>
        ) : (
          <div className="flex flex-col">
              {filteredBuildings.length === 0 ? (
                <div className="p-10">
                  <EmptyState 
                    title="Không tìm thấy khu nhà" 
                    description="Chưa có khu nhà nào phù hợp với bộ lọc hiện tại."
                  />
                </div>
              ) : (
                <>
                  <div className="hidden md:block">
                    <Table aria-label="Danh sách khu nhà">
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
                        {filteredBuildings.map((building, idx) => (
                          <TableRow key={building.id}>
                            <TableCell className="text-center font-medium text-muted-foreground">{idx + 1}</TableCell>
                            <TableCell className="font-bold text-foreground">{building.code}</TableCell>
                            <TableCell className="font-medium text-foreground">{building.name}</TableCell>
                            <TableCell className="text-center tabular-nums">{building.floors}</TableCell>
                            <TableCell className="text-center tabular-nums">{building.rooms}</TableCell>
                            <TableCell className="text-muted-foreground">{building.description || '-'}</TableCell>
                            <TableCell className="text-center">
                              <span className={`inline-flex items-center justify-center rounded px-2.5 py-0.5 text-[11px] font-semibold ${building.status === 'Đang hoạt động' ? 'bg-success-muted text-success' : 'bg-destructive-muted text-destructive'}`}>
                                {building.status}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <RowActionsMenu
                                ariaLabel={`Thao tác khu nhà ${building.code}`}
                                actions={[
                                  { id: 'view', label: 'Xem phòng', icon: <Eye size={16} />, onClick: () => {
                                      const raw = rawBuildings.find(r => r.id === building.id);
                                      openRoomModal(building, raw?.rooms ?? []);
                                    } 
                                  },
                                  { id: 'edit', label: 'Sửa', icon: <PencilSimple size={16} />, onClick: () => openEditModal(building) },
                                  { id: 'delete', label: 'Xóa', icon: <Trash size={16} />, variant: 'destructive', onClick: () => setDeleteTarget(building) }
                                ]}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="md:hidden flex flex-col gap-3 p-3">
                    {filteredBuildings.map((building) => (
                      <MobileDataCard
                        key={building.id}
                        title={building.name}
                        subtitle={building.code}
                        statusBadge={
                          <span className={`inline-flex items-center justify-center rounded px-2.5 py-0.5 text-[11px] font-semibold ${building.status === 'Đang hoạt động' ? 'bg-success-muted text-success' : 'bg-destructive-muted text-destructive'}`}>
                            {building.status}
                          </span>
                        }
                        actionMenu={
                          <RowActionsMenu
                            ariaLabel={`Thao tác khu nhà ${building.code}`}
                            actions={[
                              { id: 'view', label: 'Xem phòng', icon: <Eye size={16} />, onClick: () => {
                                  const raw = rawBuildings.find(r => r.id === building.id);
                                  openRoomModal(building, raw?.rooms ?? []);
                                } 
                              },
                              { id: 'edit', label: 'Sửa', icon: <PencilSimple size={16} />, onClick: () => openEditModal(building) },
                              { id: 'delete', label: 'Xóa', icon: <Trash size={16} />, variant: 'destructive', onClick: () => setDeleteTarget(building) }
                            ]}
                          />
                        }
                      >
                        <DataLabel label="Số tầng" value={String(building.floors)} />
                        <DataLabel label="Số phòng" value={String(building.rooms)} />
                        <DataLabel label="Mô tả" value={building.description || '-'} />
                      </MobileDataCard>
                    ))}
                  </div>
                </>
              )}
          </div>
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
                Số phòng mỗi tầng <span className="text-destructive">*</span>
              </label>
              <Input 
                type="number" 
                {...form.register('rooms')} 
                error={!!form.formState.errors.rooms}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Sức chứa mỗi phòng <span className="text-destructive">*</span>
              </label>
              <Input 
                type="number" 
                {...form.register('defaultCapacity')} 
                placeholder="4"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Loại phòng</label>
              <Select {...form.register('defaultRoomType')}>
                <option value="">Mặc định</option>
                <option value="Phòng thường">Phòng thường</option>
                <option value="Phòng dịch vụ">Phòng dịch vụ</option>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Diện tích (m²)</label>
              <Input 
                type="number" 
                step="0.5"
                {...form.register('defaultAreaM2', { valueAsNumber: true })} 
                placeholder="VD: 25"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Tình trạng</label>
              <Select {...form.register('defaultCondition')}>
                <option value="Tốt">Tốt</option>
                <option value="Đang sửa">Đang sửa</option>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Ghi chú phòng</label>
              <Input 
                {...form.register('defaultNote')} 
                placeholder="VD: Phòng 4 người"
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

      {/* Room Management Modal */}
      {roomBuilding && (
        <Modal
          isOpen={isRoomModalOpen}
          onClose={() => setIsRoomModalOpen(false)}
          title={`Quản lý phòng - ${roomBuilding.name} (${roomBuilding.code})`}
          size="lg"
          footer={
            <>
              <Button variant="outline" onClick={() => setIsRoomModalOpen(false)}>Đóng</Button>
              <Button 
                onClick={() => void handleBatchUpdate()} 
                disabled={selectedRoomIds.size === 0 || isBatchUpdating}
              >
                {isBatchUpdating ? 'Đang cập nhật...' : `Cập nhật ${selectedRoomIds.size} phòng`}
              </Button>
            </>
          }
        >
          <div className="space-y-5 py-4">
            {/* Batch edit form */}
            <div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-200/50">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  Sức chứa mới
                </label>
                <input
                  type="number"
                  value={batchCapacity}
                  onChange={(e) => setBatchCapacity(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                  min={1}
                  placeholder="4"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Loại phòng mới</label>
                <select
                  value={batchRoomType}
                  onChange={(e) => setBatchRoomType(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                >
                  <option value="">Giữ nguyên</option>
                  <option value="Phòng thường">Phòng thường</option>
                  <option value="Phòng dịch vụ">Phòng dịch vụ</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Diện tích mới (m²)</label>
                <input
                  type="number"
                  step="0.5"
                  value={batchAreaM2}
                  onChange={(e) => setBatchAreaM2(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                  placeholder="VD: 25"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Tình trạng mới</label>
                <select
                  value={batchCondition}
                  onChange={(e) => setBatchCondition(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                >
                  <option value="">Giữ nguyên</option>
                  <option value="Tốt">Tốt</option>
                  <option value="Đang sửa">Đang sửa</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Ghi chú mới</label>
                <input
                  value={batchNote}
                  onChange={(e) => setBatchNote(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                  placeholder="VD: Phòng 4 người"
                />
              </div>
              <p className="col-span-2 text-xs text-muted-foreground">
                Điền giá trị mới (để trống = giữ nguyên), sau đó chọn phòng và nhấn "Cập nhật" để áp dụng.
              </p>
            </div>

            {/* Room list header */}
            <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={buildingRooms.length > 0 && selectedRoomIds.size === buildingRooms.length}
                  onChange={toggleSelectAll}
                  className="rounded border-slate-300"
                />
                <span className="font-medium text-foreground">Chọn tất cả</span>
              </label>
              <span className="text-xs text-muted-foreground">
                ({selectedRoomIds.size}/{buildingRooms.length} phòng)
              </span>
            </div>

            {/* Room list */}
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {buildingRooms.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Khu nhà này chưa có phòng nào.
                </p>
              ) : (
                groupByFloor(buildingRooms).map(([floor, rooms]) => (
                  <div key={floor}>
                    <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Tầng {floor}
                    </p>
                    <div className="mb-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                      {rooms.map((room) => (
                        <label
                          key={room.id}
                          className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                            selectedRoomIds.has(room.id)
                              ? 'border-slate-900 bg-slate-900/5 ring-1 ring-slate-900'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedRoomIds.has(room.id)}
                            onChange={() => toggleSelectRoom(room.id)}
                            className="rounded border-slate-300"
                          />
                          <span className="flex min-w-0 flex-col">
                            <span className="font-medium">{room.code}</span>
                            <span className="text-[11px] text-muted-foreground">
                              {room.currentStudents}/{room.capacity} SV · {room.assetCount ?? 0} TB
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Modal>
      )}

      <AlertDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Xác nhận xóa"
        description={
          deleteTarget
            ? `Khu nhà ${deleteTarget.code} - ${deleteTarget.name} sẽ bị xóa khỏi hệ thống. Hành động này không thể hoàn tác. Bạn có chắc chắn?`
            : ''
        }
        confirmText="Xóa khu nhà"
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}

function groupByFloor(rooms: BuildingRecord['rooms']): [number, typeof rooms][] {
  const map = new Map<number, typeof rooms>();
  for (const room of rooms) {
    if (!map.has(room.floorNumber)) {
      map.set(room.floorNumber, []);
    }
    map.get(room.floorNumber)!.push(room);
  }
  return Array.from(map.entries()).sort(([a], [b]) => a - b);
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


