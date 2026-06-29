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
import { createAsset, createBulkAssets, getAssets, AssetRecord } from '../../services/assets';
import { createImportReceipt } from '../../services/asset-receipts';
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
    note: '',
  });

  // Add item modal - New tab
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
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
        const [cats, blds] = await Promise.all([
          getAssetCategories(),
          getBuildings(),
        ]);
        setCategories(cats || []);
        setBuildings(blds || []);
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

  // Building/Room selection removed - imports always go to warehouse

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
      
      const payload = {
        ...formData,
        totalAmount: importItems.reduce((sum, i) => sum + i.total, 0),
        items: importItems.map(i => ({
          assetCode: i.assetCode,
          assetName: i.assetName,
          categoryId: i.categoryId,
          qty: i.qty,
          unitPrice: i.unitPrice,
          warranty: i.warranty,
          note: i.note,
        }))
      };

      const res = await createImportReceipt(payload);

      const totalItems = importItems.reduce((sum, i) => sum + i.qty, 0);
      showToast(`Đã nhập ${totalItems} thiết bị thành công`, 'success');
      setCreatedReceiptCode(res.receiptCode);
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Lỗi khi lưu phiếu nhập'), 'error');
    } finally {
      setSaving(false);
    }
  };

  // Save draft (just show success for now)


  // Computed
  const totalQty = importItems.reduce((sum, i) => sum + i.qty, 0);
  const totalAmount = importItems.reduce((sum, i) => sum + i.total, 0);
  const vatAmount = Math.round(totalAmount * 0.1);
  const grandTotal = totalAmount + vatAmount;

  const formatCurrency = (n: number) => n.toLocaleString('vi-VN');
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
          { label: 'Nhập/Xuất thiết bị', href: `${basePath}/asset-transactions` },
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
        {/* Section 1: Receipt Info */}
        <div className="p-6 border-b border-border/50">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-6">1. Thông tin phiếu nhập</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Loại phiếu nhập <span className="text-destructive">*</span>
              </label>
              <Select defaultValue="Mua sắm mới">
                <option>Mua sắm mới</option>
                <option>Trường cấp phát / Tài trợ</option>

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
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                Số phiếu nhập
              </label>
              <div className="font-semibold text-sm text-muted-foreground mt-2">Tự sinh khi lưu phiếu</div>
            </div>
          </div>

          <div className="mb-6 rounded-md border border-success-border bg-success-muted px-4 py-3 text-sm text-success">
            Phiếu nhập sẽ tạo tài sản mới trong kho trung tâm. Trước khi lưu có thể thêm, xoá hoặc chỉnh số lượng/đơn giá; sau khi lưu, phiếu được khóa để bảo toàn lịch sử.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-2">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Người thực hiện <span className="text-destructive">*</span>
              </label>
              <Input type="text" value={user?.fullName || ''} readOnly className="bg-muted" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Nhà cung cấp <span className="text-destructive">*</span>
              </label>
              <Input 
                type="text" 
                placeholder="VD: Công ty TNHH Nội thất Hòa Phát"
                value={formData.supplierName}
                onChange={(e) => setFormData(prev => ({ ...prev, supplierName: e.target.value }))}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground italic mb-6">* Lưu ý: Toàn bộ thiết bị nhập mới sẽ được tự động đưa vào <b>Kho trung tâm</b> chờ cấp phát.</p>

          <div className="grid grid-cols-1 gap-6">
            <div className="relative">
              <label className="block text-sm font-medium text-foreground mb-1.5">Ghi chú đợt nhập hàng</label>
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
            <Button variant="outline" className="gap-2" onClick={() => setIsAddModalOpen(true)}>
              <Plus size={16} weight="bold" />
              Thêm thiết bị mới
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
              className="w-full md:w-auto gap-2" 
              onClick={handleSave}
              disabled={importItems.length === 0}
              isLoading={saving}
            >
              <Check size={16} weight="bold" />
              {saving ? 'Đang lưu...' : 'Lưu và hoàn tất'}
            </Button>
          </div>
        </div>
      </Card>
        </>
      )}

      {/* Add Item Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} size="xl">
        <ModalHeader onClose={() => setIsAddModalOpen(false)}>
          <ModalTitle>Thêm thiết bị</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Loại thiết bị <span className="text-destructive">*</span>
                </label>
                <Select
                  value={newItem.categoryId}
                  onChange={(e) => {
                    const catId = e.target.value;
                    const cat = categories.find(c => c.id === catId);
                    setNewItem(prev => {
                      const prevCat = categories.find(c => c.id === prev.categoryId);
                      const isNameUnchanged = !prev.assetName || prev.assetName === prevCat?.name;
                      const isCodeUnchanged = !prev.assetCode || prev.assetCode === (prevCat ? `${prevCat.code}-001` : '');
                      
                      return {
                        ...prev, 
                        categoryId: catId,
                        assetName: isNameUnchanged ? (cat?.name || '') : prev.assetName,
                        unit: cat?.unit || prev.unit || 'Cái',
                        assetCode: isCodeUnchanged ? (cat ? `${cat.code}-001` : '') : prev.assetCode
                      };
                    });
                  }}
                >
                  <option value="">-- Chọn loại --</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </div>
              <div className="md:col-span-2">
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
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Mã thiết bị (khởi điểm) <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="VD: TB00XXX"
                  value={newItem.assetCode}
                  onChange={(e) => setNewItem(prev => ({ ...prev, assetCode: e.target.value }))}
                />
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
                <label className="block text-sm font-medium text-foreground mb-1.5">Số lượng</label>
                <Input
                  type="number"
                  min="1"
                  value={newItem.qty}
                  onChange={(e) => setNewItem(prev => ({ ...prev, qty: parseInt(e.target.value) || 1 }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Đơn giá (VNĐ)</label>
                <Input
                  type="number"
                  min="0"
                  value={newItem.unitPrice || ''}
                  onChange={(e) => setNewItem(prev => ({ ...prev, unitPrice: parseInt(e.target.value) || 0 }))}
                />
              </div>
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
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
            Hủy
          </Button>
          <Button 
            onClick={handleAddNewItem}
          >
            <Plus size={16} weight="bold" className="mr-1" />
            Thêm vào danh sách
          </Button>
        </ModalFooter>
      </Modal>

      {/* Hidden printable Import Receipt */}
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
            <h1 className="text-xl font-bold uppercase text-black text-center">PHIẾU NHẬP KHO CƠ SỞ VẬT CHẤT</h1>
            <p className="font-semibold text-xs mt-1 text-black text-center">Số phiếu: PNK/{createdReceiptCode}</p>
          </div>
          
          <div className="mb-6 text-xs space-y-2 text-black text-left">
            <h3 className="font-bold text-sm">1. Thông tin phiếu</h3>
            <p>- Ngày lập: <span className="font-semibold">{formData.receiptDate ? new Date(formData.receiptDate).toLocaleDateString('vi-VN') : new Date().toLocaleDateString('vi-VN')}</span></p>
            <p>- Người thực hiện: <span className="font-semibold">{user?.fullName || '--'}</span></p>
            <p>- Nhà cung cấp/nguồn nhập: <span className="font-semibold">{formData.supplierName || 'Tự do'}</span></p>
            <p>- Số chứng từ/Hợp đồng: <span className="font-semibold">--</span></p>
          </div>

          <div className="mb-6 text-xs text-black text-left">
            <h3 className="font-bold text-sm mb-2">2. Danh sách thiết bị</h3>
            <p className="mb-2 italic text-black">Thiết bị được nhập vào kho trung tâm để quản lý, theo dõi và chờ cấp phát:</p>
            
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
                {importItems.map((item, index) => (
                  <tr key={item.tempId} className="text-black">
                    <td className="border border-black p-2 text-center text-black">{index + 1}</td>
                    <td className="border border-black p-2 font-mono text-center text-black">{item.assetCode}</td>
                    <td className="border border-black p-2 text-black text-left">{item.assetName}</td>
                    <td className="border border-black p-2 text-center text-black">Cái</td>
                    <td className="border border-black p-2 text-center text-black">{item.qty}</td>
                    <td className="border border-black p-2 text-right text-black">{item.unitPrice.toLocaleString('vi-VN')} đ</td>
                    <td className="border border-black p-2 text-black">{item.note || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mb-6 text-xs text-black space-y-1 pl-1 text-left">
            <p>- Tổng số lượng: <span className="font-semibold">{importItems.reduce((sum, i) => sum + i.qty, 0)}</span></p>
            <p>- Tổng giá trị: <span className="font-semibold">{importItems.reduce((sum, i) => sum + i.total, 0).toLocaleString('vi-VN')} đ</span></p>
            <p>- Ghi chú nhập kho: <span className="font-semibold">{formData.note || '--'}</span></p>
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
