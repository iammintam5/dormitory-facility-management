import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { useAuth } from '../../auth/auth-context';
import { useToast } from '../../toast/toast-context';
import { 
  ArrowLeft, 
  Plus, 
  MagnifyingGlass, 
  Trash, 
  Check,
  ArrowsClockwise,
  Printer,
} from '@phosphor-icons/react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter } from '../../components/ui/Modal';
import { PageHeader } from '../../components/ui/PageHeader';
import { SkeletonTable, SkeletonStatCard } from '../../components/ui/Skeleton';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../components/ui/Table';
import { getAssetCategories, AssetCategoryRecord } from '../../services/asset-categories';
import { getBuildings, getRooms, BuildingRecord, RoomRecord } from '../../services/locations';
import { getAssets, AssetRecord } from '../../services/assets';
import { createExportReceipt } from '../../services/asset-receipts';
import { getApiErrorMessage } from '../../lib/api-client';

type ExportItem = {
  tempId: string;
  id: string;
  assetCode: string;
  assetName: string;
  categoryName: string;
  unit: string;
  qty: number;
  condition: string;
  conditionLabel: string;
  note: string;
  roomCode: string | null;
};

export function ExportEquipmentPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const basePath = user?.role === 'ADMIN' ? '/admin' : '/manager';

  // Data from API
  const [categories, setCategories] = useState<AssetCategoryRecord[]>([]);
  const [buildings, setBuildings] = useState<BuildingRecord[]>([]);
  const [rooms, setRooms] = useState<RoomRecord[]>([]);
  const [allAssets, setAllAssets] = useState<AssetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Export items
  const [exportItems, setExportItems] = useState<ExportItem[]>([]);

  const [exportType, setExportType] = useState('TRANSFER');

  // Form state
  const [formData, setFormData] = useState({
    exportDate: new Date().toISOString().split('T')[0],
    reason: '',
    buildingId: '',
    roomId: '',
    recipient: '',
    contactPhone: '',
    requestDate: '',
    expectedDate: '',
    note: '',
    generalNote: '',
  });

  // Add item modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterBuilding, setFilterBuilding] = useState('');
  const [filterRoom, setFilterRoom] = useState('');
  const [filterRooms, setFilterRooms] = useState<RoomRecord[]>([]);
  const [selectedExportIds, setSelectedExportIds] = useState<Set<string>>(new Set());
  const [exportQty, setExportQty] = useState<Record<string, number>>({});

  const [createdReceiptCode, setCreatedReceiptCode] = useState('');
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });

  useEffect(() => {
    if (createdReceiptCode) {
      handlePrint();
      const timer = setTimeout(() => {
        navigate(`${basePath}/asset-transactions`);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [createdReceiptCode, navigate, basePath]);

  // Load data on mount
  useEffect(() => {
    async function loadData() {
      try {
        const exportableStatuses = ['AVAILABLE', 'DAMAGED', 'UNDER_MAINTENANCE', 'PENDING_LIQUIDATION'];
        const [cats, blds, ...assetResponses] = await Promise.all([
          getAssetCategories(),
          getBuildings(),
          ...exportableStatuses.map((status) =>
            getAssets({ pageSize: 1000, status }).catch(() => ({ items: [] as AssetRecord[], pagination: { page: 1, pageSize: 1000, total: 0, totalPages: 0 } }))
          ),
        ]);
        const assetsById = new Map<string, AssetRecord>();
        assetResponses.flatMap((response) => response.items || [])
          .filter((asset) => asset.status !== 'IN_USE' && !asset.roomCode)
          .forEach((asset) => assetsById.set(asset.id, asset));
        setCategories(cats || []);
        setBuildings(blds || []);
        setAllAssets(Array.from(assetsById.values()));
      } catch (err) {
        showToast(getApiErrorMessage(err, 'Không thể tải dữ liệu'), 'error');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleBuildingChangeAssetFilter = useCallback(async (buildingId: string) => {
    setFilterBuilding(buildingId);
    setFilterRoom('');
    if (buildingId) {
      try {
        const roomData = await getRooms({ buildingId });
        setFilterRooms(roomData || []);
      } catch { setFilterRooms([]); }
    } else {
      setFilterRooms([]);
    }
  }, []);

  // Remove export item
  const removeItem = (tempId: string) => {
    setExportItems(prev => prev.filter(i => i.tempId !== tempId));
  };

  // Confirm export
  const handleConfirmExport = async () => {
    if (exportItems.length === 0) {
      showToast('Vui lòng thêm ít nhất một thiết bị vào danh sách xuất', 'error');
      return;
    }
    if (!formData.reason.trim()) {
      showToast('Vui lòng nhập lý do xuất', 'error');
      return;
    }

    try {
      setSaving(true);

      const payload = {
        exportDate: formData.exportDate,
        reason: formData.reason,
        recipient: formData.recipient,
        contactPhone: formData.contactPhone,
        note: formData.note,
        generalNote: formData.generalNote,
        items: exportItems.map(i => ({
          id: i.id,
          qty: i.qty,
          note: i.note,
        }))
      };

      const res = await createExportReceipt(payload);

      showToast(`Đã xuất ${exportItems.length} thiết bị thành công`, 'success');
      setCreatedReceiptCode(res.receiptCode);
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Lỗi khi xác nhận xuất thiết bị'), 'error');
    } finally {
      setSaving(false);
    }
  };

  // Add selected assets to export list
  const handleAddSelected = () => {
    const selected = allAssets.filter(a => selectedExportIds.has(a.id));
    if (selected.length === 0) {
      showToast('Vui lòng chọn ít nhất một thiết bị', 'error');
      return;
    }
    const newItems: ExportItem[] = selected.map(a => ({
      tempId: `export-${a.id}-${Date.now()}-${Math.random().toString(36).slice(2, 4)}`,
      id: a.id,
      assetCode: a.assetCode,
      assetName: a.assetName,
      categoryName: a.categoryName,
      unit: 'Cái',
      qty: 1,
      condition: a.status === 'PENDING_LIQUIDATION' ? 'PENDING_LIQUIDATION' : a.condition,
      conditionLabel: a.status === 'PENDING_LIQUIDATION' ? 'Chờ thanh lý' : (a.conditionLabel || (a.status === 'DAMAGED' ? 'Hư hỏng' : 'Tốt')),
      note: '',
      roomCode: a.roomCode,
    }));
    setExportItems(prev => [...prev, ...newItems]);
    setSelectedExportIds(new Set());
    setExportQty({});
    setIsAddModalOpen(false);
    showToast(`Đã thêm ${newItems.length} thiết bị vào danh sách xuất`, 'success');
  };

  // Filtered assets for selection
  const filteredAssets = useMemo(() => {
    return allAssets.filter(a => {
      if (exportType === 'LIQUIDATE') {
        if (a.status !== 'PENDING_LIQUIDATION') return false;
      } else {
        if (a.status === 'PENDING_LIQUIDATION') return false;
      }
      if (searchKeyword && !a.assetCode.toLowerCase().includes(searchKeyword.toLowerCase()) && !a.assetName.toLowerCase().includes(searchKeyword.toLowerCase())) return false;
      if (filterCategory && a.categoryCode !== filterCategory) return false;
      if (filterBuilding && a.buildingCode !== filterBuilding) return false;
      if (filterRoom && a.roomCode !== filterRoom) return false;
      return true;
    });
  }, [allAssets, searchKeyword, filterCategory, filterBuilding, filterRoom, exportType]);

  const toggleSelection = (id: string) => {
    setSelectedExportIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        next.add(id);
        if (!exportQty[id]) {
          setExportQty(q => ({ ...q, [id]: 1 }));
        }
      }
      return next;
    });
  };

  // Get unique building codes from assets
  const buildingCodes = useMemo(() => {
    const codes = new Set(allAssets.map(a => a.buildingCode).filter((c): c is string => Boolean(c)));
    return Array.from(codes).sort();
  }, [allAssets]);

  const conditionBadge = (conditionLabel: string, condition: string) => {
    const isGood = condition === 'GOOD';
    return (
      <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold ${
        isGood ? 'bg-emerald-100 text-emerald-700' : condition === 'DAMAGED' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
      }`}>
        {conditionLabel}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
          <p className="text-sm font-medium text-muted-foreground">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 mx-auto max-w-7xl pb-10">
      <PageHeader 
        title="Xuất thiết bị" 
        breadcrumbs={[
          { label: 'Nghiệp vụ', href: '#' },
          { label: 'Nhập/Xuất thiết bị', href: `${basePath}/asset-transactions` },
          { label: 'Xuất thiết bị' }
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild className="gap-2">
              <Link to={`${basePath}/asset-transactions`}>
                <ArrowLeft size={16} weight="bold" />
                Quay lại
              </Link>
            </Button>
          </div>
        }
      />

      {loading ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SkeletonStatCard />
            <SkeletonStatCard />
          </div>
          <Card className="border-border/50">
            <div className="p-5">
              <SkeletonTable rows={5} cols={5} />
            </div>
          </Card>
        </>
      ) : (
        <>
          <Card className="border-border/50">
        {/* Section 1: Export Info */}
        <div className="p-6 border-b border-border/50">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-6">1. Thông tin phiếu xuất</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Loại phiếu xuất <span className="text-destructive">*</span>
              </label>
              <Select 
                value={exportType}
                onChange={(e) => {
                  setExportType(e.target.value);
                  setExportItems([]);
                  setSelectedExportIds(new Set());
                }}
              >
                <option value="TRANSFER">Xuất điều chuyển (sang cơ sở khác)</option>
                <option value="RETURN_SCHOOL">Xuất trả Trường</option>
                <option value="RETURN_SUPPLIER">Xuất trả Nhà cung cấp</option>
                <option value="LIQUIDATE">Xuất thanh lý / Hủy bỏ</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Ngày xuất <span className="text-destructive">*</span>
              </label>
              <Input 
                type="date" 
                value={formData.exportDate}
                onChange={(e) => setFormData(prev => ({ ...prev, exportDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                Số phiếu xuất
              </label>
              <div className="font-semibold text-sm text-muted-foreground mt-2">Tự sinh khi lưu phiếu</div>
            </div>
          </div>

          <div className="mb-6 rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
            Phiếu xuất dùng cho thiết bị rời khỏi kho hoặc thanh lý/hủy bỏ. Tài sản đang ở phòng cần được thu hồi về kho trước khi xuất.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Người thực hiện <span className="text-destructive">*</span>
              </label>
              <Input type="text" value={user?.fullName || ''} readOnly className="bg-muted" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Đơn vị nhận</label>
              <Input 
                type="text" 
                placeholder="VD: P.Quản trị Thiết bị"
                value={formData.recipient}
                onChange={(e) => setFormData(prev => ({ ...prev, recipient: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Lý do xuất <span className="text-destructive">*</span>
              </label>
              <Input 
                type="text" 
                placeholder="VD: Trả lại đồ hỏng"
                value={formData.reason}
                onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="relative">
              <label className="block text-sm font-medium text-foreground mb-1.5">Ghi chú thêm</label>
              <textarea 
                rows={1}
                value={formData.note}
                onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
                placeholder="Ghi chú thêm (nếu có)"
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              />
              <span className="absolute bottom-2.5 right-3 text-xs text-muted-foreground">{formData.note.length}/200</span>
            </div>
          </div>
        </div>

        {/* Section 2: Equipment List */}
        <div className="p-6">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">2. Danh sách thiết bị xuất</h3>
          
          <div className="flex flex-wrap gap-4 mb-4">
            <Button variant="outline" className="gap-2" onClick={() => setIsAddModalOpen(true)}>
              <Plus size={16} weight="bold" />
              Thêm thiết bị
            </Button>
          </div>

          {exportItems.length === 0 ? (
            <div className="py-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                <Plus size={28} className="text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Chưa có thiết bị nào trong phiếu xuất</p>
              <p className="text-xs text-muted-foreground mt-1">Nhấn "Thêm thiết bị" để chọn từ kho</p>
            </div>
          ) : (
            <div className="overflow-x-auto mb-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16 text-center">STT</TableHead>
                    <TableHead>Mã thiết bị</TableHead>
                    <TableHead>Tên thiết bị</TableHead>
                    <TableHead className="text-center">Loại thiết bị</TableHead>
                    <TableHead className="text-center">ĐVT</TableHead>
                    <TableHead className="text-center w-24">Số lượng</TableHead>
                    <TableHead className="text-center">Tình trạng</TableHead>
                    <TableHead>Ghi chú</TableHead>
                    <TableHead className="text-center w-20">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exportItems.map((item, index) => (
                    <TableRow key={item.tempId}>
                      <TableCell className="text-center font-medium text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="font-semibold text-foreground">{item.assetCode}</TableCell>
                      <TableCell className="font-medium">{item.assetName}</TableCell>
                      <TableCell className="text-center text-muted-foreground">{item.categoryName}</TableCell>
                      <TableCell className="text-center text-muted-foreground">{item.unit}</TableCell>
                      <TableCell className="text-center font-bold tabular-nums">{item.qty}</TableCell>
                      <TableCell className="text-center">
                        {conditionBadge(item.conditionLabel, item.condition)}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[120px] truncate" title={item.note}>
                        {item.note || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="icon" onClick={() => removeItem(item.tempId)} title="Xóa">
                          <Trash size={16} className="text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Summary */}
          <div className="flex flex-col md:flex-row justify-between items-start pt-4 border-t border-border/50">
            <div className="font-semibold text-sm text-foreground mb-4 md:mb-0">
              Tổng số lượng: <span className="text-primary">{exportItems.reduce((s, i) => s + i.qty, 0)}</span>
            </div>
            <div className="w-full md:w-[400px] relative">
              <label className="block text-sm font-medium text-foreground mb-1.5">Ghi chú chung</label>
              <textarea 
                rows={3} 
                value={formData.generalNote}
                onChange={(e) => setFormData(prev => ({ ...prev, generalNote: e.target.value }))}
                placeholder="Nhập ghi chú chung cho phiếu xuất..."
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              />
              <span className="absolute bottom-2 right-3 text-xs text-muted-foreground">{formData.generalNote.length}/200</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border/50 bg-muted/30 flex flex-col md:flex-row justify-between items-center gap-4">
          <Button variant="outline" asChild className="w-full md:w-auto">
            <Link to={`${basePath}/asset-transactions`}>
              Hủy bỏ
            </Link>
          </Button>
          <div className="flex items-center gap-2 w-full md:w-auto flex-wrap md:flex-nowrap">

            <Button 
              className="w-full md:w-auto gap-2"
              onClick={handleConfirmExport}
              disabled={saving || exportItems.length === 0}
            >
              {saving ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <Check size={16} weight="bold" />
                  Xác nhận xuất
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
        </>
      )}

      {/* Add Item Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} size="2xl">
        <ModalHeader onClose={() => setIsAddModalOpen(false)}>
          <ModalTitle>Chọn thiết bị xuất</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <p className="text-sm text-muted-foreground mb-4">
            Chọn thiết bị trong kho, đang hỏng, đang bảo trì hoặc chờ thanh lý để thêm vào phiếu xuất. Sau khi xác nhận, thiết bị sẽ chuyển sang trạng thái "Đã thanh lý".
          </p>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Input 
                type="text" 
                placeholder="Tìm kiếm thiết bị..." 
                className="pl-9"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
              />
              <MagnifyingGlass size={16} className="absolute left-3 top-2.5 text-muted-foreground" />
            </div>
            <Select 
              className="w-[160px]"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="">Tất cả loại</option>
              {categories.map(c => (
                <option key={c.id} value={c.code}>{c.name}</option>
              ))}
            </Select>
            <Select 
              className="w-[140px]"
              value={filterBuilding}
              onChange={(e) => handleBuildingChangeAssetFilter(e.target.value)}
            >
              <option value="">Tất cả khu</option>
              {buildingCodes.map(code => (
                <option key={code} value={code}>{code}</option>
              ))}
            </Select>
            <Select 
              className="w-[140px]"
              value={filterRoom}
              onChange={(e) => setFilterRoom(e.target.value)}
              disabled={!filterBuilding}
            >
              <option value="">Tất cả phòng</option>
              {filterRooms.map(r => (
                <option key={r.id} value={r.roomCode}>{r.roomCode}</option>
              ))}
            </Select>
          </div>

          {/* Assets table */}
          <div className="overflow-x-auto max-h-72 overflow-y-auto border border-border/50 rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300"
                      checked={filteredAssets.length > 0 && filteredAssets.every(a => selectedExportIds.has(a.id))}
                      onChange={() => {
                        if (filteredAssets.every(a => selectedExportIds.has(a.id))) {
                          setSelectedExportIds(new Set());
                        } else {
                          setSelectedExportIds(new Set(filteredAssets.map(a => a.id)));
                          filteredAssets.forEach(a => {
                            if (!exportQty[a.id]) {
                              setExportQty(q => ({ ...q, [a.id]: 1 }));
                            }
                          });
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Mã TB</TableHead>
                  <TableHead>Tên thiết bị</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Tình trạng</TableHead>
                  <TableHead className="text-center w-24">SL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Không tìm thấy thiết bị
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAssets.map(a => (
                    <TableRow 
                      key={a.id} 
                      className={`cursor-pointer ${selectedExportIds.has(a.id) ? 'bg-primary/5' : ''}`}
                      onClick={() => toggleSelection(a.id)}
                    >
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300"
                          checked={selectedExportIds.has(a.id)}
                          onChange={() => toggleSelection(a.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{a.assetCode}</TableCell>
                      <TableCell>{a.assetName}</TableCell>
                      <TableCell>{a.categoryName}</TableCell>
                      <TableCell>
                        <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold ${
                          a.status === 'PENDING_LIQUIDATION' ? 'bg-amber-100 text-amber-800' :
                          a.condition === 'GOOD' ? 'bg-emerald-100 text-emerald-700' : 
                          a.condition === 'DAMAGED' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {a.status === 'PENDING_LIQUIDATION' ? 'Chờ thanh lý' : (a.conditionLabel || a.status)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center font-semibold text-foreground">1</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </ModalBody>

        <ModalFooter>
          <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
            Hủy
          </Button>
          <Button onClick={handleAddSelected} disabled={selectedExportIds.size === 0}>
            <Plus size={16} weight="bold" className="mr-1" />
            Thêm {selectedExportIds.size} thiết bị
          </Button>
        </ModalFooter>
      </Modal>
      {/* Hidden printable Export Receipt */}
      <div className="hidden">
        <div className="bg-white text-black p-12" ref={printRef} style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'Times New Roman' }}>
          <style>{`
            @page {
              size: A4;
              margin: 15mm 20mm;
            }
          `}</style>
          <div className="flex justify-between items-start mb-6 text-[11px] text-black">
            <div className="text-center font-semibold text-black">
              <p className="uppercase">Bộ Khoa học và Công nghệ</p>
              <p className="uppercase font-bold">Học viện Công nghệ Bưu chính Viễn thông</p>
              <p className="font-bold">Cơ sở tại Thành phố Hồ Chí Minh</p>
            </div>
            <div className="text-center text-black">
              <p className="font-bold uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
              <p className="font-bold">Độc lập - Tự do - Hạnh phúc</p>
            </div>
          </div>

          <div className="text-center my-6">
            <h1 className="text-xl font-bold uppercase text-black text-center">PHIẾU XUẤT KHO CƠ SỞ VẬT CHẤT</h1>
            <p className="font-semibold text-xs mt-1 text-black text-center">Số phiếu: PXK/{createdReceiptCode}</p>
          </div>
          
          <div className="mb-6 text-xs space-y-2 text-black text-left">
            <h3 className="font-bold text-sm">1. Thông tin phiếu</h3>
            <p>- Ngày lập: <span className="font-semibold">{formData.exportDate ? new Date(formData.exportDate).toLocaleDateString('vi-VN') : new Date().toLocaleDateString('vi-VN')}</span></p>
            <p>- Người thực hiện: <span className="font-semibold">{user?.fullName || '--'}</span></p>
            <p>- Đơn vị nhận/lý do xuất: <span className="font-semibold">Phòng/Phân ban / {formData.reason || '--'}</span></p>
            <p>- Số chứng từ/Hợp đồng: <span className="font-semibold">--</span></p>
          </div>

          <div className="mb-6 text-xs text-black text-left">
            <h3 className="font-bold text-sm mb-2">2. Danh sách thiết bị</h3>
            <p className="mb-2 italic text-black">Thiết bị được xuất khỏi kho trung tâm để phục vụ nghiệp vụ đã được phê duyệt:</p>
            
            <table className="w-full border-collapse border border-black text-xs text-black">
              <thead>
                <tr className="text-center font-bold text-black bg-gray-50">
                  <th className="border border-black p-2 w-12 text-black">STT</th>
                  <th className="border border-black p-2 w-28 text-black">Mã tài sản</th>
                  <th className="border border-black p-2 text-black">Tên tài sản</th>
                  <th className="border border-black p-2 w-16 text-black">ĐVT</th>
                  <th className="border border-black p-2 w-16 text-black">Số lượng</th>
                  <th className="border border-black p-2 w-28 text-black">Đơn giá</th>
                  <th className="border border-black p-2 w-28 text-black">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {exportItems.map((item, index) => (
                  <tr key={item.tempId} className="text-black">
                    <td className="border border-black p-2 text-center text-black">{index + 1}</td>
                    <td className="border border-black p-2 font-mono text-center text-black">{item.assetCode}</td>
                    <td className="border border-black p-2 text-black text-left">{item.assetName}</td>
                    <td className="border border-black p-2 text-center text-black">Cái</td>
                    <td className="border border-black p-2 text-center text-black">{item.qty}</td>
                    <td className="border border-black p-2 text-right text-black">--</td>
                    <td className="border border-black p-2 text-black">{item.note || item.conditionLabel || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mb-6 text-xs text-black space-y-1 pl-1 text-left">
            <p>- Tổng số lượng: <span className="font-semibold">{exportItems.reduce((sum, i) => sum + i.qty, 0)}</span></p>
            <p>- Tổng giá trị: <span className="font-semibold">--</span></p>
            <p>- Ghi chú xuất kho: <span className="font-semibold">{formData.generalNote || formData.note || '--'}</span></p>
          </div>

          <div className="grid grid-cols-3 text-center mt-8 mb-20 text-[11px] font-semibold text-black">
            <div>
              <p className="text-black font-bold">NGƯỜI LẬP PHIẾU</p>
              <p className="italic text-[10px] font-normal text-black">(Ký, ghi rõ họ tên)</p>
            </div>
            <div>
              <p className="text-black font-bold">THỦ KHO / BỘ PHẬN CSVC</p>
              <p className="italic text-[10px] font-normal text-black">(Ký, ghi rõ họ tên)</p>
            </div>
            <div>
              <p className="text-black font-bold">ĐẠI DIỆN LIÊN QUAN</p>
              <p className="italic text-[10px] font-normal text-black">(Ký, ghi rõ họ tên)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
