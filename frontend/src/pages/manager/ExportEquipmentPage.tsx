import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/auth-context';
import { useToast } from '../../toast/toast-context';
import { 
  ArrowLeft, 
  Plus, 
  MagnifyingGlass, 
  Trash, 
  Check,
  ArrowsClockwise,
} from '@phosphor-icons/react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter } from '../../components/ui/Modal';
import { PageHeader } from '../../components/ui/PageHeader';
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

  // Form state
  const [formData, setFormData] = useState({
    exportDate: new Date().toISOString().split('T')[0],
    reason: '',
    buildingId: '',
    roomId: '',
    recipient: '',
    contactPhone: '',
    contractNumber: '',
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

  // Load data on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [cats, blds, assetsData] = await Promise.all([
          getAssetCategories(),
          getBuildings(),
          getAssets({ pageSize: 1000 }).catch(() => ({ items: [] as AssetRecord[], pagination: { page: 1, pageSize: 1000, total: 0, totalPages: 0 } })),
        ]);
        setCategories(cats || []);
        setBuildings(blds || []);
        setAllAssets(assetsData?.items || []);
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
        ...formData,
        items: exportItems.map(i => ({
          id: i.id,
          qty: i.qty,
          note: i.note,
        }))
      };

      await createExportReceipt(payload);

      showToast(`Đã xuất ${exportItems.length} thiết bị thành công`, 'success');
      navigate(`${basePath}/asset-transactions`);
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
      qty: exportQty[a.id] || 1,
      condition: a.condition,
      conditionLabel: a.conditionLabel || (a.status === 'DAMAGED' ? 'Hư hỏng' : 'Tốt'),
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
      if (searchKeyword && !a.assetCode.toLowerCase().includes(searchKeyword.toLowerCase()) && !a.assetName.toLowerCase().includes(searchKeyword.toLowerCase())) return false;
      if (filterCategory && a.categoryCode !== filterCategory) return false;
      if (filterBuilding && a.buildingCode !== filterBuilding) return false;
      if (filterRoom && a.roomCode !== filterRoom) return false;
      return true;
    });
  }, [allAssets, searchKeyword, filterCategory, filterBuilding, filterRoom]);

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

  const exportNumber = `XX${new Date().getFullYear()}-${String(exportItems.length > 0 ? Math.floor(Date.now() / 1000) % 10000 : 0).padStart(4, '0')}`;

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
          { label: 'Nhập - Xuất thiết bị', href: `${basePath}/asset-transactions` },
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

      <Card className="border-border/50">
        {/* Section 1: Export Info */}
        <div className="p-6 border-b border-border/50">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-6">1. Thông tin phiếu xuất</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Loại phiếu xuất <span className="text-destructive">*</span>
              </label>
              <Select defaultValue="Xuất điều chuyển (sang cơ sở khác)">
                <option>Xuất điều chuyển (sang cơ sở khác)</option>
                <option>Xuất trả Trường</option>
                <option>Xuất trả Nhà cung cấp</option>
                <option>Xuất thanh lý / Hủy bỏ</option>
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
              <div className="font-bold text-lg text-primary mt-1">{exportNumber}</div>
            </div>
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
                    <TableHead>Phòng</TableHead>
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
                      <TableCell className="text-muted-foreground">{item.roomCode || '-'}</TableCell>
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
              variant="outline" 
              className="flex-1 md:flex-none gap-2 text-primary hover:text-primary"
              onClick={() => showToast('Đã lưu nháp (chức năng đang phát triển)', 'success')}
            >
              <ArrowsClockwise size={16} weight="bold" />
              Lưu nháp
            </Button>
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

      {/* Add Item Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} size="2xl">
        <ModalHeader onClose={() => setIsAddModalOpen(false)}>
          <ModalTitle>Chọn thiết bị xuất</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <p className="text-sm text-muted-foreground mb-4">
            Chọn thiết bị từ kho để thêm vào phiếu xuất. Thiết bị sẽ được đánh dấu là "Đã thanh lý" sau khi xác nhận.
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
                  <TableHead>Phòng</TableHead>
                  <TableHead>Tình trạng</TableHead>
                  <TableHead className="text-center w-24">SL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
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
                      <TableCell>{a.roomCode || '-'}</TableCell>
                      <TableCell>
                        <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold ${
                          a.condition === 'GOOD' ? 'bg-emerald-100 text-emerald-700' : 
                          a.condition === 'DAMAGED' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {a.conditionLabel || a.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        {selectedExportIds.has(a.id) ? (
                          <Input 
                            type="number" 
                            min="1"
                            value={exportQty[a.id] || 1}
                            onChange={(e) => setExportQty(q => ({ ...q, [a.id]: parseInt(e.target.value) || 1 }))}
                            className="text-center h-8 w-16"
                          />
                        ) : '-'}
                      </TableCell>
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
    </div>
  );
}
