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
import { createAsset, createBulkAssets, getAssets, AssetRecord } from '../../services/assets';
import { getApiErrorMessage } from '../../lib/api-client';

type ImportItem = {
  tempId: string;
  assetCode: string;
  assetName: string;
  categoryId: string;
  categoryName: string;
  unit: string;
  qty: number;
  unitPrice: number;
  total: number;
  warranty: number;
  note: string;
};

export function ImportEquipmentPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const basePath = user?.role === 'ADMIN' ? '/admin' : '/manager';

  // Data from API
  const [categories, setCategories] = useState<AssetCategoryRecord[]>([]);
  const [buildings, setBuildings] = useState<BuildingRecord[]>([]);
  const [rooms, setRooms] = useState<RoomRecord[]>([]);
  const [existingAssets, setExistingAssets] = useState<AssetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Import items
  const [importItems, setImportItems] = useState<ImportItem[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    receiptDate: new Date().toISOString().split('T')[0],
    supplierName: '',
    supplierAddress: '',
    supplierPhone: '',
    contractNumber: '',
    contractDate: '',
    documentNumber: '',
    note: '',
    buildingId: '',
    roomId: '',
  });

  // Add item modal - New tab
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'new' | 'existing'>('new');
  const [newItem, setNewItem] = useState({
    assetCode: '',
    assetName: '',
    categoryId: '',
    unit: 'Cái',
    qty: 1,
    unitPrice: 0,
    warranty: 12,
    note: '',
  });

  // Existing assets selection
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [selectedExistingIds, setSelectedExistingIds] = useState<Set<string>>(new Set());
  const [existingQty, setExistingQty] = useState<Record<string, number>>({});

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
        setExistingAssets(assetsData?.items || []);
        if (blds?.length > 0) {
          try {
            const roomData = await getRooms({ buildingId: blds[0].id });
            setRooms(roomData || []);
          } catch { /* ignore */ }
        }
      } catch (err) {
        showToast(getApiErrorMessage(err, 'Không thể tải dữ liệu'), 'error');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleBuildingChange = useCallback(async (buildingId: string) => {
    setFormData(prev => ({ ...prev, buildingId, roomId: '' }));
    if (buildingId) {
      try {
        const roomData = await getRooms({ buildingId });
        setRooms(roomData || []);
      } catch { setRooms([]); }
    } else {
      setRooms([]);
    }
  }, []);

  // Add new item
  const handleAddNewItem = () => {
    if (!newItem.assetCode.trim() || !newItem.assetName.trim() || !newItem.categoryId) {
      showToast('Vui lòng nhập đầy đủ: mã thiết bị, tên thiết bị, loại thiết bị', 'error');
      return;
    }
    const cat = categories.find(c => c.id === newItem.categoryId);
    const item: ImportItem = {
      tempId: `new-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      assetCode: newItem.assetCode.trim(),
      assetName: newItem.assetName.trim(),
      categoryId: newItem.categoryId,
      categoryName: cat?.name ?? '',
      unit: newItem.unit,
      qty: newItem.qty,
      unitPrice: newItem.unitPrice,
      total: newItem.qty * newItem.unitPrice,
      warranty: newItem.warranty,
      note: newItem.note.trim(),
    };
    setImportItems(prev => [...prev, item]);
    setNewItem({ assetCode: '', assetName: '', categoryId: '', unit: 'Cái', qty: 1, unitPrice: 0, warranty: 12, note: '' });
    setIsAddModalOpen(false);
    showToast(`Đã thêm ${item.assetName} vào danh sách`, 'success');
  };

  // Add existing assets
  const handleAddExistingItems = () => {
    const selectedAssets = existingAssets.filter(a => selectedExistingIds.has(a.id));
    if (selectedAssets.length === 0) {
      showToast('Vui lòng chọn ít nhất một thiết bị', 'error');
      return;
    }
    const newItems: ImportItem[] = selectedAssets.map(a => ({
      tempId: `existing-${a.id}-${Date.now()}-${Math.random().toString(36).slice(2, 4)}`,
      assetCode: a.assetCode,
      assetName: a.assetName,
      categoryId: a.categoryCode,
      categoryName: a.categoryName,
      unit: 'Cái',
      qty: existingQty[a.id] || 1,
      unitPrice: 0,
      total: 0,
      warranty: 0,
      note: '',
    }));
    setImportItems(prev => [...prev, ...newItems]);
    setSelectedExistingIds(new Set());
    setExistingQty({});
    setIsAddModalOpen(false);
    showToast(`Đã thêm ${newItems.length} thiết bị vào danh sách`, 'success');
  };

  const removeItem = (tempId: string) => {
    setImportItems(prev => prev.filter(i => i.tempId !== tempId));
  };

  const updateItemQty = (tempId: string, qty: number) => {
    if (qty < 1) return;
    setImportItems(prev => prev.map(i => 
      i.tempId === tempId ? { ...i, qty, total: qty * i.unitPrice } : i
    ));
  };

  const updateItemPrice = (tempId: string, price: number) => {
    setImportItems(prev => prev.map(i => 
      i.tempId === tempId ? { ...i, unitPrice: price, total: i.qty * price } : i
    ));
  };

  // Save
  const handleSave = async () => {
    if (importItems.length === 0) {
      showToast('Vui lòng thêm ít nhất một thiết bị vào danh sách', 'error');
      return;
    }

    try {
      setSaving(true);
      const roomId = formData.roomId || undefined;

      for (const item of importItems) {
        if (item.qty > 1) {
          const prefix = item.assetCode.replace(/\d+$/g, '') || 'IMP';
          const startMatch = item.assetCode.match(/\d+$/);
          const startNum = startMatch ? parseInt(startMatch[0], 10) : 1;
          await createBulkAssets({
            prefix,
            startNumber: startNum,
            endNumber: startNum + item.qty - 1,
            assetName: item.assetName,
            categoryId: item.categoryId,
            roomId: roomId || undefined,
            status: 'AVAILABLE',
          });
        } else {
          await createAsset({
            assetCode: item.assetCode,
            assetName: item.assetName,
            categoryId: item.categoryId,
            roomId: roomId || undefined,
            status: 'AVAILABLE',
          });
        }
      }

      const totalItems = importItems.reduce((sum, i) => sum + i.qty, 0);
      showToast(`Đã nhập ${totalItems} thiết bị thành công`, 'success');
      navigate(`${basePath}/asset-transactions`);
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Lỗi khi lưu phiếu nhập'), 'error');
    } finally {
      setSaving(false);
    }
  };

  // Save draft (just show success for now)
  const handleSaveDraft = () => {
    showToast('Đã lưu nháp (chức năng đang phát triển)', 'success');
  };

  // Computed
  const totalQty = importItems.reduce((sum, i) => sum + i.qty, 0);
  const totalAmount = importItems.reduce((sum, i) => sum + i.total, 0);
  const vatAmount = Math.round(totalAmount * 0.1);
  const grandTotal = totalAmount + vatAmount;

  const filteredExisting = useMemo(() => {
    return existingAssets.filter(a => {
      if (searchKeyword && !a.assetCode.toLowerCase().includes(searchKeyword.toLowerCase()) && !a.assetName.toLowerCase().includes(searchKeyword.toLowerCase())) return false;
      if (filterCategory && a.categoryCode !== filterCategory) return false;
      return true;
    });
  }, [existingAssets, searchKeyword, filterCategory]);

  const toggleExistingSelection = (id: string) => {
    setSelectedExistingIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        next.add(id);
        if (!existingQty[id]) {
          setExistingQty(q => ({ ...q, [id]: 1 }));
        }
      }
      return next;
    });
  };

  const formatCurrency = (n: number) => n.toLocaleString('vi-VN');
  const receiptNumber = `NN${new Date().getFullYear()}-${String(importItems.length > 0 ? Math.floor(Date.now() / 1000) % 10000 : 0).padStart(4, '0')}`;

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
        title="Nhập thiết bị" 
        breadcrumbs={[
          { label: 'Nghiệp vụ', href: '#' },
          { label: 'Nhập - Xuất thiết bị', href: `${basePath}/asset-transactions` },
          { label: 'Nhập thiết bị' }
        ]}
        actions={
          <Button variant="outline" asChild className="gap-2">
            <Link to={`${basePath}/asset-transactions`}>
              <ArrowLeft size={16} weight="bold" />
              Quay lại
            </Link>
          </Button>
        }
      />

      <Card className="border-border/50">
        {/* Section 1: Receipt Info */}
        <div className="p-6 border-b border-border/50">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-6">1. Thông tin phiếu nhập</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Loại phiếu nhập <span className="text-destructive">*</span>
              </label>
              <Select defaultValue="Nhập mua sắm">
                <option>Nhập mua sắm</option>
                <option>Nhập cấp phát</option>
                <option>Nhập điều chuyển</option>
                <option>Nhập trả lại</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Ngày nhập <span className="text-destructive">*</span>
              </label>
              <Input 
                type="date" 
                value={formData.receiptDate}
                onChange={(e) => setFormData(prev => ({ ...prev, receiptDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Số phiếu nhập <span className="text-destructive">*</span>
              </label>
              <Input type="text" value={receiptNumber} readOnly className="bg-muted font-medium" />
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
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Nơi nhận / Phòng <span className="text-destructive">*</span>
              </label>
              <div className="flex gap-2">
                <Select 
                  value={formData.buildingId}
                  onChange={(e) => handleBuildingChange(e.target.value)}
                  className="flex-1"
                >
                  <option value="">-- Chọn khu nhà --</option>
                  {buildings.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </Select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">&nbsp;</label>
              <Select 
                value={formData.roomId}
                onChange={(e) => setFormData(prev => ({ ...prev, roomId: e.target.value }))}
                disabled={!formData.buildingId}
              >
                <option value="">-- Chọn phòng --</option>
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>{r.roomCode}</option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Nhà cung cấp <span className="text-destructive">*</span>
              </label>
              <Input 
                type="text" 
                placeholder="Nhập tên nhà cung cấp"
                value={formData.supplierName}
                onChange={(e) => setFormData(prev => ({ ...prev, supplierName: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Địa chỉ nhà cung cấp</label>
              <Input 
                type="text" 
                placeholder="Địa chỉ"
                value={formData.supplierAddress}
                onChange={(e) => setFormData(prev => ({ ...prev, supplierAddress: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Số điện thoại</label>
              <Input 
                type="text" 
                placeholder="Số điện thoại"
                value={formData.supplierPhone}
                onChange={(e) => setFormData(prev => ({ ...prev, supplierPhone: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Hợp đồng / Đơn hàng</label>
              <Input 
                type="text" 
                placeholder="Số hợp đồng"
                value={formData.contractNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, contractNumber: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Ngày chứng từ</label>
              <Input 
                type="date" 
                value={formData.contractDate}
                onChange={(e) => setFormData(prev => ({ ...prev, contractDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Số chứng từ</label>
              <Input 
                type="text" 
                placeholder="Số chứng từ"
                value={formData.documentNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, documentNumber: e.target.value }))}
              />
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-foreground mb-1.5">Ghi chú</label>
              <textarea 
                rows={1} 
                value={formData.note}
                onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
                placeholder="Ghi chú..."
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              />
              <span className="absolute bottom-2.5 right-3 text-xs text-muted-foreground">{formData.note.length}/200</span>
            </div>
          </div>
        </div>

        {/* Section 2: Equipment List */}
        <div className="p-6">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">2. Danh sách thiết bị nhập</h3>
          
          <div className="flex flex-wrap gap-4 mb-4">
            <Button variant="outline" className="gap-2" onClick={() => { setIsAddModalOpen(true); setModalTab('new'); }}>
              <Plus size={16} weight="bold" />
              Thêm thiết bị mới
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => { setIsAddModalOpen(true); setModalTab('existing'); }}>
              <ArrowsClockwise size={16} weight="bold" />
              Chọn từ kho
            </Button>
          </div>

          {importItems.length === 0 ? (
            <div className="py-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                <Plus size={28} className="text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Chưa có thiết bị nào trong phiếu nhập</p>
              <p className="text-xs text-muted-foreground mt-1">Nhấn "Thêm thiết bị" để bắt đầu</p>
            </div>
          ) : (
            <div className="overflow-x-auto mb-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16 text-center">STT</TableHead>
                    <TableHead>Mã thiết bị</TableHead>
                    <TableHead>Tên thiết bị</TableHead>
                    <TableHead>Loại thiết bị</TableHead>
                    <TableHead className="text-center">ĐVT</TableHead>
                    <TableHead className="text-center w-28">Số lượng</TableHead>
                    <TableHead className="text-right">Đơn giá (VNĐ)</TableHead>
                    <TableHead className="text-right">Thành tiền (VNĐ)</TableHead>
                    <TableHead className="text-center">Bảo hành</TableHead>
                    <TableHead className="text-center">Ghi chú</TableHead>
                    <TableHead className="text-center w-20">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importItems.map((item, index) => (
                    <TableRow key={item.tempId}>
                      <TableCell className="text-center font-medium text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="font-semibold text-foreground">{item.assetCode}</TableCell>
                      <TableCell className="font-medium">{item.assetName}</TableCell>
                      <TableCell>{item.categoryName}</TableCell>
                      <TableCell className="text-center text-muted-foreground">{item.unit}</TableCell>
                      <TableCell className="text-center">
                        <Input 
                          type="number" 
                          value={item.qty} 
                          onChange={(e) => updateItemQty(item.tempId, parseInt(e.target.value) || 1)}
                          className="text-center h-8 w-20"
                          min="1"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input 
                          type="number" 
                          value={item.unitPrice || ''} 
                          onChange={(e) => updateItemPrice(item.tempId, parseInt(e.target.value) || 0)}
                          className="text-right h-8 w-32"
                          min="0"
                        />
                      </TableCell>
                      <TableCell className="text-right font-bold text-foreground tabular-nums">
                        {formatCurrency(item.total)}
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground tabular-nums">{item.warranty}T</TableCell>
                      <TableCell className="text-center text-muted-foreground max-w-[120px] truncate" title={item.note}>
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
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end pt-4 border-t border-border/50">
            <div className="font-semibold text-sm text-foreground mb-4 md:mb-0">
              Tổng số lượng: <span className="text-primary">{totalQty}</span>
            </div>
            {importItems.length > 0 && (
              <div className="w-full md:w-[320px] space-y-2 text-sm">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span className="font-semibold text-foreground">Tổng tiền hàng:</span>
                  <span className="font-bold text-foreground tabular-nums">{formatCurrency(totalAmount)}</span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground">
                  <span className="font-semibold text-foreground">Thuế VAT (10%):</span>
                  <span className="font-bold text-foreground tabular-nums">{formatCurrency(vatAmount)}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="font-bold text-foreground text-base">Tổng cộng:</span>
                  <span className="font-bold text-primary text-lg tabular-nums">{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            )}
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
              onClick={handleSaveDraft}
            >
              <ArrowsClockwise size={16} weight="bold" />
              Lưu nháp
            </Button>
            <Button 
              className="w-full md:w-auto gap-2" 
              onClick={handleSave}
              disabled={saving || importItems.length === 0}
            >
              {saving ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Check size={16} weight="bold" />
                  Lưu và hoàn tất
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Add Item Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} size="xl">
        <ModalHeader onClose={() => setIsAddModalOpen(false)}>
          <ModalTitle>Thêm thiết bị</ModalTitle>
        </ModalHeader>
        {/* Tabs */}
        <div className="flex border-b border-border/50 px-6">
          <button
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              modalTab === 'new'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setModalTab('new')}
          >
            Thiết bị mới
          </button>
          <button
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              modalTab === 'existing'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setModalTab('existing')}
          >
            Chọn từ kho
          </button>
        </div>

        <ModalBody>
          {modalTab === 'new' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Mã thiết bị <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder="VD: TB00XXX"
                    value={newItem.assetCode}
                    onChange={(e) => setNewItem(prev => ({ ...prev, assetCode: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Tên thiết bị <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder="Tên thiết bị"
                    value={newItem.assetName}
                    onChange={(e) => setNewItem(prev => ({ ...prev, assetName: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Loại thiết bị <span className="text-destructive">*</span>
                  </label>
                  <Select
                    value={newItem.categoryId}
                    onChange={(e) => setNewItem(prev => ({ ...prev, categoryId: e.target.value }))}
                  >
                    <option value="">-- Chọn loại --</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">ĐVT</label>
                  <Input
                    placeholder="Cái"
                    value={newItem.unit}
                    onChange={(e) => setNewItem(prev => ({ ...prev, unit: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Số lượng
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={newItem.qty}
                    onChange={(e) => setNewItem(prev => ({ ...prev, qty: parseInt(e.target.value) || 1 }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Đơn giá (VNĐ)</label>
                  <Input
                    type="number"
                    min="0"
                    value={newItem.unitPrice || ''}
                    onChange={(e) => setNewItem(prev => ({ ...prev, unitPrice: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Bảo hành (tháng)</label>
                  <Input
                    type="number"
                    min="0"
                    value={newItem.warranty}
                    onChange={(e) => setNewItem(prev => ({ ...prev, warranty: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-1.5">Ghi chú</label>
                  <Input
                    placeholder="Ghi chú (nếu có)"
                    value={newItem.note}
                    onChange={(e) => setNewItem(prev => ({ ...prev, note: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Chọn thiết bị có sẵn trong kho để thêm vào phiếu nhập. Những thiết bị này sẽ được cập nhật thông tin vị trí.
              </p>

              {/* Filters */}
              <div className="flex flex-wrap gap-3">
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
                  className="w-[180px]"
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  <option value="">Tất cả loại</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.code}>{c.name}</option>
                  ))}
                </Select>
              </div>

              {/* Existing assets table */}
              <div className="overflow-x-auto max-h-64 overflow-y-auto border border-border/50 rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300"
                          checked={filteredExisting.length > 0 && filteredExisting.every(a => selectedExistingIds.has(a.id))}
                          onChange={() => {
                            if (filteredExisting.every(a => selectedExistingIds.has(a.id))) {
                              setSelectedExistingIds(new Set());
                            } else {
                              setSelectedExistingIds(new Set(filteredExisting.map(a => a.id)));
                              filteredExisting.forEach(a => {
                                if (!existingQty[a.id]) {
                                  setExistingQty(q => ({ ...q, [a.id]: 1 }));
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
                      <TableHead className="text-center w-24">Số lượng</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExisting.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          Không tìm thấy thiết bị
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredExisting.map(a => (
                        <TableRow 
                          key={a.id} 
                          className={`cursor-pointer ${selectedExistingIds.has(a.id) ? 'bg-primary/5' : ''}`}
                          onClick={() => toggleExistingSelection(a.id)}
                        >
                          <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                            <input 
                              type="checkbox" 
                              className="rounded border-gray-300"
                              checked={selectedExistingIds.has(a.id)}
                              onChange={() => toggleExistingSelection(a.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{a.assetCode}</TableCell>
                          <TableCell>{a.assetName}</TableCell>
                          <TableCell>{a.categoryName}</TableCell>
                          <TableCell>{a.roomCode || '-'}</TableCell>
                          <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                            {selectedExistingIds.has(a.id) ? (
                              <Input 
                                type="number" 
                                min="1"
                                value={existingQty[a.id] || 1}
                                onChange={(e) => setExistingQty(q => ({ ...q, [a.id]: parseInt(e.target.value) || 1 }))}
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
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
            Hủy
          </Button>
          <Button 
            onClick={modalTab === 'new' ? handleAddNewItem : handleAddExistingItems}
            disabled={modalTab === 'new' ? (!newItem.assetCode || !newItem.assetName || !newItem.categoryId) : selectedExistingIds.size === 0}
          >
            <Plus size={16} weight="bold" className="mr-1" />
            {modalTab === 'new' ? 'Thêm vào danh sách' : `Thêm ${selectedExistingIds.size} thiết bị`}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
