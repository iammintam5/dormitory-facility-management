import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useToast } from '../../toast/toast-context';
import { getAssets, updateAsset, deleteAsset, AssetRecord, AssetStatus, AssetCondition } from '../../services/assets';
import { QRCodeSVG } from 'qrcode.react';
import { useReactToPrint } from 'react-to-print';
import { getApiErrorMessage } from '../../lib/api-client';
import { getBuildings, getRooms, BuildingRecord, RoomRecord } from '../../services/locations';
import { getAssetCategories, AssetCategoryRecord } from '../../services/asset-categories';

import { 
  Desktop,
  Checks,
  Wrench,
  Prohibit,
  Plus,
  ArrowsClockwise,
  PencilSimple,
  Trash,
  Spinner,
  WarningCircle,
  Eye,
  QrCode
} from '@phosphor-icons/react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { PageHeader } from '../../components/ui/PageHeader';
import { Pagination } from '../../components/ui/Pagination';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../components/ui/Table';

const assetSchema = z.object({
  assetCode: z.string().min(1, 'Nhập mã thiết bị (hoặc tiền tố nếu thêm nhiều).'),
  assetName: z.string().min(1, 'Nhập tên thiết bị.'),
  categoryId: z.string().min(1, 'Chọn loại thiết bị.'),
  description: z.string().optional(),
  buildingId: z.string().min(1, 'Chọn khu nhà.'),
  roomId: z.string().optional(),
  location: z.string().optional(),
  
  purchaseDate: z.string().optional(),
  purchaseCost: z.string().optional(),
  supplierId: z.string().optional(),
  quantity: z.string().min(1, 'Nhập số lượng.'),
  warrantyExpiryDate: z.string().optional(),
  serialNumber: z.string().optional(),
  
  status: z.string().min(1, 'Chọn trạng thái.'),
  condition: z.string().min(1, 'Chọn tình trạng.'),
  notes: z.string().optional(),
});

type AssetFormValues = z.infer<typeof assetSchema>;

export function AssetsManagementPage() {
  const { showToast } = useToast();
  
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
  
  const [categories, setCategories] = useState<AssetCategoryRecord[]>([]);
  const [buildings, setBuildings] = useState<BuildingRecord[]>([]);
  const [rooms, setRooms] = useState<RoomRecord[]>([]);
  
  const [keyword, setKeyword] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterBuilding, setFilterBuilding] = useState('');
  const [filterRoom, setFilterRoom] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetRecord | null>(null);

  // QR Modal
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrAsset, setQrAsset] = useState<AssetRecord | null>(null);
  const qrPrintRef = useRef<HTMLDivElement>(null);

  const handlePrintQr = useReactToPrint({
    contentRef: qrPrintRef,
    documentTitle: 'Ma_QR_Thiet_Bi',
  });
  const [deleteTarget, setDeleteTarget] = useState<AssetRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const assetCounts = {
    inUse: assets.filter(a => a.status === 'IN_USE').length,
    maintenance: assets.filter(a => a.status === 'UNDER_MAINTENANCE').length,
    damaged: assets.filter(a => ['PENDING_LIQUIDATION', 'LIQUIDATED', 'DAMAGED'].includes(a.status)).length,
  };

  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      assetCode: '',
      assetName: '',
      categoryId: '',
      description: '',
      buildingId: '',
      roomId: '',
      location: '',
      purchaseDate: '',
      purchaseCost: '',
      supplierId: '',
      quantity: '1',
      warrantyExpiryDate: '',
      serialNumber: '',
      status: 'AVAILABLE',
      condition: 'GOOD',
      notes: ''
    },
  });

  const loadData = useCallback(async () => {
    setIsFetching(true);
    try {
      const res = await getAssets({
        page: pagination.page,
        pageSize: pagination.pageSize,
        keyword: keyword || undefined,
        categoryId: filterCategory || undefined,
        buildingId: filterBuilding || undefined,
        roomId: filterRoom || undefined,
        status: filterStatus || undefined,
      });
      setAssets(res.items);
      setPagination(res.pagination);
    } catch (error) {
      showToast('Lỗi khi tải danh sách thiết bị', 'error');
    } finally {
      setIsFetching(false);
    }
  }, [pagination.page, pagination.pageSize, keyword, filterCategory, filterBuilding, filterRoom, filterStatus]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    Promise.all([
      getAssetCategories(),
      getBuildings(),
      getRooms()
    ]).then(([cats, blds, rms]) => {
      setCategories(cats);
      setBuildings(blds);
      setRooms(rms);
    }).catch(() => {
      showToast('Lỗi khi tải dữ liệu danh mục', 'error');
    });
  }, []);


  // Add modal has been removed; assets are now imported via ImportEquipmentPage.

  const openQrModal = (asset: AssetRecord) => {
    setQrAsset(asset);
    setShowQrModal(true);
  };

  const openEditModal = (asset: AssetRecord) => {
    setSelectedAsset(asset);
    
    const roomMatches = rooms.find(r => r.roomCode === asset.roomCode);
    const matchedBuildingId = roomMatches ? roomMatches.buildingId : '';

    form.reset({
      assetCode: asset.assetCode,
      assetName: asset.assetName,
      categoryId: '',
      description: asset.description || '',
      buildingId: matchedBuildingId,
      roomId: roomMatches ? roomMatches.id : '',
      location: '',
      purchaseDate: asset.purchaseDate ? asset.purchaseDate.split('T')[0] : '',
      purchaseCost: asset.purchaseCost?.toString() || '',
      supplierId: asset.supplierCode || '',
      quantity: '1', 
      warrantyExpiryDate: asset.warrantyExpiryDate ? asset.warrantyExpiryDate.split('T')[0] : '',
      serialNumber: asset.serialNumber || '',
      status: asset.status,
      condition: asset.condition,
      notes: asset.notes || ''
    });
    
    if (asset.categoryCode) {
      const cat = categories.find(c => c.code === asset.categoryCode);
      if (cat) form.setValue('categoryId', cat.id);
    }

    setIsModalOpen(true);
  };

  const onSubmit = async (data: AssetFormValues) => {
    setIsLoading(true);
    try {
      const quantityNum = parseInt(data.quantity, 10);
      
      // FIX 12: Only send fields that UpdateAssetDto accepts
      const payload = {
        assetCode: data.assetCode,
        assetName: data.assetName,
        categoryId: data.categoryId,
        description: data.description || undefined,
      };

      if (selectedAsset) {
        await updateAsset(selectedAsset.id, payload);
        showToast('Cập nhật thiết bị thành công.', 'success');
      }
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Lưu thông tin thất bại.'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const statusBadgeColor = (status: string) => {
    if (['IN_USE', 'AVAILABLE'].includes(status)) return 'bg-emerald-100 text-emerald-700';
    if (status === 'UNDER_MAINTENANCE') return 'bg-amber-100 text-amber-700';
    return 'bg-rose-100 text-rose-700';
  };

  return (
    <div className="space-y-6 mx-auto max-w-7xl pb-10">
      <PageHeader 
        title="Thiết bị" 
        description="Quản lý danh sách thiết bị và tài sản trong ký túc xá."
        actions={null}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border bg-blue-50 text-blue-600 border-blue-100">
              <Desktop size={24} weight="duotone" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Tổng thiết bị</p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-bold tabular-nums text-foreground">{pagination.total}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border/50">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border bg-emerald-50 text-emerald-600 border-emerald-100">
              <Checks size={24} weight="duotone" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Đang sử dụng</p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-bold tabular-nums text-emerald-600">{assetCounts.inUse}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border bg-amber-50 text-amber-600 border-amber-100">
              <Wrench size={24} weight="duotone" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Bảo trì / Sửa chữa</p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-bold tabular-nums text-amber-600">{assetCounts.maintenance}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border bg-rose-50 text-rose-600 border-rose-100">
              <Prohibit size={24} weight="duotone" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Hỏng / Thanh lý</p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-bold tabular-nums text-rose-600">{assetCounts.damaged}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Section */}
      <Card className="border-border/50">
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-end">
          <div className="flex-1 w-full lg:w-auto">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Tìm kiếm</label>
            <Input 
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Nhập tên thiết bị, mã thiết bị..." 
            />
          </div>
          
          <div className="w-full lg:w-40">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Loại thiết bị</label>
            <Select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="">Tất cả</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>

          <div className="w-full lg:w-32">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Khu nhà</label>
            <Select 
              value={filterBuilding}
              onChange={(e) => {
                setFilterBuilding(e.target.value);
                setFilterRoom('');
              }}
            >
              <option value="">Tất cả</option>
              {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </div>

          <div className="w-full lg:w-32">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Phòng</label>
            <Select value={filterRoom} onChange={(e) => setFilterRoom(e.target.value)}>
              <option value="">Tất cả</option>
              {rooms.filter(r => !filterBuilding || r.buildingId === filterBuilding).map(r => <option key={r.id} value={r.id}>{r.roomCode}</option>)}
            </Select>
          </div>

          <div className="w-full lg:w-40">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Trạng thái</label>
            <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">Tất cả</option>
              <option value="AVAILABLE">Sẵn sàng</option>
              <option value="IN_USE">Đang sử dụng</option>
              <option value="UNDER_MAINTENANCE">Đang bảo trì</option>
              <option value="DAMAGED">Hỏng</option>
              <option value="PENDING_LIQUIDATION">Chờ thanh lý</option>
              <option value="LIQUIDATED">Đã thanh lý</option>
            </Select>
          </div>
          
          <div className="flex w-full items-center gap-2 lg:w-auto">
            <Button 
              variant="ghost"
              size="sm"
              onClick={() => {
                setKeyword('');
                setFilterCategory('');
                setFilterBuilding('');
                setFilterRoom('');
                setFilterStatus('');
                setPagination(p => ({ ...p, page: 1 }));
              }}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <ArrowsClockwise size={14} weight="bold" />
              Làm mới bộ lọc
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table Section */}
      <Card className="border-border/50 overflow-hidden">
        {isFetching ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size={32} className="animate-spin text-primary" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 text-center">STT</TableHead>
                <TableHead>Mã thiết bị</TableHead>
                <TableHead>Tên thiết bị</TableHead>
                <TableHead>Loại thiết bị</TableHead>
                <TableHead>Khu nhà</TableHead>
                <TableHead>Phòng</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="w-20 text-center">Mã QR</TableHead>
                <TableHead className="w-20 text-center">Sửa</TableHead>
                <TableHead className="w-20 text-center">Xóa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                    Không có dữ liệu thiết bị
                  </TableCell>
                </TableRow>
              ) : assets.map((asset, idx) => (
                <TableRow key={asset.id}>
                  <TableCell className="text-center font-medium">
                    {(pagination.page - 1) * pagination.pageSize + idx + 1}
                  </TableCell>
                  <TableCell className="font-semibold text-foreground">{asset.assetCode}</TableCell>
                  <TableCell>{asset.assetName}</TableCell>
                  <TableCell>{asset.categoryName}</TableCell>
                  <TableCell>{asset.buildingCode || '-'}</TableCell>
                  <TableCell>{asset.roomCode || '-'}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center justify-center rounded px-2.5 py-0.5 text-[11px] font-semibold ${statusBadgeColor(asset.status)}`}>
                      {asset.statusLabel}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button variant="ghost" size="icon" onClick={() => openQrModal(asset)}>
                      <QrCode size={16} />
                    </Button>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button variant="ghost" size="icon" onClick={() => openEditModal(asset)}>
                      <PencilSimple size={16} className="text-muted-foreground" />
                    </Button>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(asset)}>
                      <Trash size={16} className="text-rose-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          pageSize={pagination.pageSize}
          onPageChange={(p) => setPagination(prev => ({ ...prev, page: p }))}
        />
      </Card>

      {/* Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Cập nhật thiết bị"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Hủy</Button>
            <Button onClick={form.handleSubmit(onSubmit)} disabled={isLoading}>
              {isLoading && <Spinner className="mr-2 animate-spin" />}
              Lưu thiết bị
            </Button>
          </>
        }
      >
        <form id="asset-form" className="space-y-4 py-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Mã thiết bị
              </label>
              <Input 
                {...form.register('assetCode')}
                disabled
                className="bg-muted font-medium"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Tên thiết bị
              </label>
              <Input 
                {...form.register('assetName')}
                disabled
                className="bg-muted font-medium"
              />
            </div>
            
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Loại thiết bị
              </label>
              <Select {...form.register('categoryId')} disabled className="bg-muted font-medium">
                <option value="">Chọn loại thiết bị</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Vị trí hiện tại
              </label>
              <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm font-medium text-primary">
                {form.watch('buildingId') 
                  ? `${buildings.find(b => b.id === form.watch('buildingId'))?.name} - Phòng ${rooms.find(r => r.id === form.watch('roomId'))?.roomCode || '...'}` 
                  : 'Kho trung tâm (Chưa cấp phát)'}
              </div>
            </div>
            
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Mô tả thêm
              </label>
              <textarea 
                {...form.register('description')}
                placeholder="Nhập mô tả, ghi chú về thiết bị này..."
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              ></textarea>
            </div>
          </div>

          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-6 mb-3">Cập nhật Trạng thái</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Trạng thái sử dụng <span className="text-muted-foreground text-xs font-normal ml-1">(chỉ xem)</span></label>
              <Select {...form.register('status')} disabled className="bg-muted">
                <option value="AVAILABLE">Sẵn sàng</option>
                <option value="IN_USE">Đang sử dụng</option>
                <option value="UNDER_MAINTENANCE">Đang bảo trì</option>
                <option value="DAMAGED">Hỏng</option>
                <option value="PENDING_LIQUIDATION">Chờ thanh lý</option>
                <option value="LIQUIDATED">Đã thanh lý</option>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Tình trạng vật lý</label>
              <Select {...form.register('condition')}>
                <option value="GOOD">Tốt</option>
                <option value="NEED_CHECK">Cần kiểm tra</option>
                <option value="DAMAGED">Hỏng</option>
              </Select>
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Xác nhận xóa"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Hủy</Button>
            <Button 
              variant="destructive" 
              disabled={isDeleting}
              onClick={async () => {
                if (!deleteTarget) return;
                setIsDeleting(true);
                try {
                  await deleteAsset(deleteTarget.id);
                  showToast('Xóa thiết bị thành công.', 'success');
                  setDeleteTarget(null);
                  loadData();
                } catch (error) {
                  showToast(getApiErrorMessage(error, 'Xóa thiết bị thất bại.'), 'error');
                } finally {
                  setIsDeleting(false);
                }
              }}
            >
              {isDeleting ? 'Đang xóa...' : 'Xóa thiết bị'}
            </Button>
          </>
        }
      >
        <p className="py-4 text-sm leading-6 text-muted-foreground">
          {deleteTarget ? `Thiết bị ${deleteTarget.assetCode} - ${deleteTarget.assetName} sẽ bị xóa khỏi hệ thống. Bạn có chắc chắn?` : ''}
        </p>
      </Modal>
      <Modal 
        isOpen={showQrModal} 
        onClose={() => setShowQrModal(false)} 
        title="Mã QR Thiết Bị" 
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowQrModal(false)}>Đóng</Button>
            <Button onClick={() => handlePrintQr()}>In mã QR</Button>
          </>
        }
      >
        <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg border border-border" ref={qrPrintRef}>
          {qrAsset && (
            <>
              <div className="mb-4 text-center text-black">
                <h3 className="font-bold text-lg">{qrAsset.assetCode}</h3>
                <p className="text-sm">{qrAsset.assetName}</p>
              </div>
              <QRCodeSVG value={qrAsset.assetCode} size={200} />
              <div className="mt-4 text-center text-black text-xs">
                <p>Phòng: {qrAsset.roomName || 'Trong Kho'}</p>
              </div>
            </>
          )}
        </div>
      </Modal>

    </div>
  );
}
