import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useToast } from '../../toast/toast-context';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { getBuildings, getRooms, BuildingRecord, RoomRecord } from '../../services/locations';
import { getAssets, AssetRecord } from '../../services/assets';
import { createHandoverReceipt, createReclaimReceipt, getAssetReceipts, getAssetReceipt, AssetReceiptRecord } from '../../services/asset-receipts';
import { getApiErrorMessage } from '../../lib/api-client';
import { useReactToPrint } from 'react-to-print';
import { FilePdf, MagnifyingGlass, Eye, Printer, ArrowsClockwise } from '@phosphor-icons/react';
import { RowActionsMenu } from '../../components/ui/RowActionsMenu';

import { SkeletonTable } from '../../components/ui/Skeleton';
const receiptTemplates = {
  HANDOVER: {
    code: 'QL_BM1',
    label: 'Mẫu bàn giao CSVC',
    href: '/templates/asset-receipts/QL_BM1_BIEN_BAN_BAN_GIAO_CSVC.pdf',
  },
  RECLAIM: {
    code: 'QL_BM2',
    label: 'Mẫu thu hồi CSVC',
    href: '/templates/asset-receipts/QL_BM2_BIEN_BAN_THU_HOI_CSVC.pdf',
  },
};

export function AssetAllocationPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'handover' | 'reclaim' | 'history'>('handover');
  const [buildings, setBuildings] = useState<BuildingRecord[]>([]);
  const [rooms, setRooms] = useState<RoomRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingRoomAssets, setIsFetchingRoomAssets] = useState(false);

  // History state
  const [historyReceipts, setHistoryReceipts] = useState<AssetReceiptRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Handover state
  const [availableAssets, setAvailableAssets] = useState<AssetRecord[]>([]);
  const [selectedHandoverAssets, setSelectedHandoverAssets] = useState<Set<string>>(new Set());
  const [targetBuildingId, setTargetBuildingId] = useState('');
  const [targetRoomId, setTargetRoomId] = useState('');
  const [handoverNote, setHandoverNote] = useState('');

  // Reclaim state
  const [fromBuildingId, setFromBuildingId] = useState('');
  const [fromRoomId, setFromRoomId] = useState('');
  const [roomAssets, setRoomAssets] = useState<AssetRecord[]>([]);
  const [selectedReclaimAssets, setSelectedReclaimAssets] = useState<Set<string>>(new Set());
  const [reclaimNote, setReclaimNote] = useState('');

  // Print Handover State
  const [printData, setPrintData] = useState<any>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Bien_Ban_Ban_Giao',
  });

  useEffect(() => {
    if (printData) {
      handlePrint();
      setPrintData(null);
    }
  }, [printData]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const handoverCategories = Array.from(new Set(availableAssets.map(a => a.categoryName))).filter(Boolean).sort();
  const reclaimCategories = Array.from(new Set(roomAssets.map(a => a.categoryName))).filter(Boolean).sort();

  const filteredAvailableAssets = availableAssets.filter(a => {
    const matchesSearch = (a.assetCode.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           a.assetName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory ? a.categoryName === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  const filteredRoomAssets = roomAssets.filter(a => {
    const matchesSearch = (a.assetCode.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           a.assetName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory ? a.categoryName === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  const handleSelectAllHandover = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSet = new Set(selectedHandoverAssets);
    if (e.target.checked) {
      filteredAvailableAssets.forEach(a => newSet.add(a.id));
    } else {
      filteredAvailableAssets.forEach(a => newSet.delete(a.id));
    }
    setSelectedHandoverAssets(newSet);
  };

  const handleSelectAllReclaim = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSet = new Set(selectedReclaimAssets);
    if (e.target.checked) {
      filteredRoomAssets.forEach(a => newSet.add(a.id));
    } else {
      filteredRoomAssets.forEach(a => newSet.delete(a.id));
    }
    setSelectedReclaimAssets(newSet);
  };

  const getConditionBadge = (label: string) => {
    if (label === 'Tốt') return <span className="px-2 py-1 bg-success-muted text-success rounded-md text-xs font-medium">{label}</span>;
    if (label === 'Khá') return <span className="px-2 py-1 bg-info-muted text-info rounded-md text-xs font-medium">{label}</span>;
    if (label === 'Kém') return <span className="px-2 py-1 bg-warning-muted text-warning rounded-md text-xs font-medium">{label}</span>;
    return <span className="px-2 py-1 bg-destructive-muted text-destructive rounded-md text-xs font-medium">{label}</span>;
  };

  const getStatusBadge = (label: string) => {
    if (label === 'Rảnh rỗi' || label === 'Đang sử dụng') return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-md text-xs font-medium">{label}</span>;
    if (label === 'Bảo trì') return <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-md text-xs font-medium">{label}</span>;
    return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-md text-xs font-medium">{label}</span>;
  };

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      getBuildings().then(res => setBuildings(res)).catch(console.error),
      loadAvailableAssets()
    ]).finally(() => setIsLoading(false));
  }, []);

  const loadAvailableAssets = async () => {
    try {
      const res = await getAssets({ status: 'AVAILABLE', pageSize: 1000 });
      // Filter out assets that have a roomCode (just to be safe)
      setAvailableAssets(res.items.filter(a => !a.roomCode));
    } catch (error) {
      console.error(error);
    }
  };

  const handleBuildingChange = async (buildingId: string, setRoomFn: (val: string) => void) => {
    setRoomFn('');
    if (!buildingId) {
      setRooms([]);
      return;
    }
    try {
      const res = await getRooms({ buildingId, pageSize: 100 });
      setRooms(res);
    } catch (error) {
      console.error(error);
    }
  };

  const loadRoomAssets = async (roomId: string) => {
    if (!roomId) {
      setRoomAssets([]);
      return;
    }
    setIsFetchingRoomAssets(true);
    try {
      const res = await getAssets({ roomId: parseInt(roomId, 10), pageSize: 1000 });
      setRoomAssets(res.items);
    } catch (error) {
      console.error(error);
    } finally {
      setIsFetchingRoomAssets(false);
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await getAssetReceipts();
      setHistoryReceipts(res.filter(r => r.type === 'HANDOVER' || r.type === 'RECLAIM'));
    } catch (error) {
      console.error(error);
      showToast(getApiErrorMessage(error, 'Không thể tải lịch sử cấp phát'), 'error');
    } finally {
      setLoadingHistory(false);
    }
  };

  const switchTab = (tab: 'handover' | 'reclaim' | 'history') => {
    setActiveTab(tab);
    setRooms([]);
    setSearchQuery('');
    setSelectedCategory('');

    if (tab === 'history') {
      loadHistory();
      return;
    }

    if (tab === 'handover') {
      setFromBuildingId('');
      setFromRoomId('');
      setRoomAssets([]);
      setSelectedReclaimAssets(new Set());
      return;
    }

    setTargetBuildingId('');
    setTargetRoomId('');
    setSelectedHandoverAssets(new Set());
  };

  const handleTriggerPrint = async (receipt: AssetReceiptRecord) => {
    try {
      showToast('Đang tải dữ liệu để in...', 'info');
      const details = await getAssetReceipt(receipt.id);
      const firstItem = details.items?.[0] as any;
      const roomName = firstItem?.asset?.room?.roomCode || firstItem?.room?.roomCode || 'KTX';

      setPrintData({
        type: details.type,
        receiptCode: details.receiptCode,
        date: new Date(details.receiptDate).toLocaleDateString('vi-VN'),
        roomName: roomName,
        assets: details.items?.map((item: any) => ({
          id: item.id,
          assetCode: item.asset?.assetCode || '',
          assetName: item.asset?.assetName || '',
          conditionLabel: item.asset?.condition === 'GOOD' ? 'Tốt' : 'Hỏng',
          statusLabel: item.asset?.statusLabel || '',
        })) || [],
      });
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Lỗi khi tải chi tiết phiếu để in'), 'error');
    }
  };

  const submitHandover = async () => {
    if (!targetRoomId) return showToast('Vui lòng chọn phòng nhận', 'error');
    if (selectedHandoverAssets.size === 0) return showToast('Vui lòng chọn ít nhất 1 thiết bị', 'error');

    try {
      const payload = {
        targetRoomId: parseInt(targetRoomId, 10),
        assetIds: Array.from(selectedHandoverAssets).map(id => parseInt(id, 10)),
        note: handoverNote,
      };
      const receipt = await createHandoverReceipt(payload);
      
      const roomName = rooms.find(r => r.id === targetRoomId)?.roomCode || '';
      const assetsData = availableAssets.filter(a => selectedHandoverAssets.has(a.id));
      
      showToast('Đã lập biên bản cấp phát thành công', 'success');
      
      // Reset form
      setSelectedHandoverAssets(new Set());
      setHandoverNote('');
      loadAvailableAssets();

      // Show Print Modal
      setPrintData({
        type: 'HANDOVER',
        receiptCode: receipt.receiptCode,
        date: new Date().toLocaleDateString('vi-VN'),
        roomName,
        assets: assetsData,
      });

    } catch (error) {
      showToast(getApiErrorMessage(error, 'Lỗi khi cấp phát'), 'error');
    }
  };

  const submitReclaim = async () => {
    if (!fromRoomId) return showToast('Vui lòng chọn phòng thu hồi', 'error');
    if (selectedReclaimAssets.size === 0) return showToast('Vui lòng chọn ít nhất 1 thiết bị', 'error');

    try {
      const payload = {
        fromRoomId: parseInt(fromRoomId, 10),
        assetIds: Array.from(selectedReclaimAssets).map(id => parseInt(id, 10)),
        note: reclaimNote,
      };
      const receipt = await createReclaimReceipt(payload);
      showToast('Đã lập biên bản thu hồi thành công', 'success');
      
      const roomName = rooms.find(r => r.id === fromRoomId)?.roomCode || '';
      const assetsData = roomAssets.filter(a => selectedReclaimAssets.has(a.id));

      // Reset
      setSelectedReclaimAssets(new Set());
      setReclaimNote('');
      loadRoomAssets(fromRoomId);
      loadAvailableAssets(); // update warehouse

      // Show Print Modal
      setPrintData({
        type: 'RECLAIM',
        receiptCode: receipt.receiptCode,
        date: new Date().toLocaleDateString('vi-VN'),
        roomName,
        assets: assetsData,
      });

    } catch (error) {
      showToast(getApiErrorMessage(error, 'Lỗi khi thu hồi'), 'error');
    }
  };

  const toggleSelection = (id: string, set: Set<string>, setter: any) => {
    const newSet = new Set(set);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setter(newSet);
  };

  const printTemplate = printData?.type === 'RECLAIM' ? receiptTemplates.RECLAIM : receiptTemplates.HANDOVER;

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Cấp phát - Thu hồi tài sản" 
        description="Lập biên bản bàn giao và thu hồi tài sản theo phòng KTX"
      />

      <Card className="border-sky-500 bg-sky-600 p-5 text-white shadow-sm dark:border-sky-700 dark:bg-sky-800">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold text-white">Biên bản cấp phát/thu hồi</h3>
          </div>
          <div className="flex flex-row flex-wrap gap-2 sm:justify-end">
            {Object.values(receiptTemplates).map((template) => (
              <Button key={template.code} variant="outline" className="border-white/50 bg-white/10 text-white hover:bg-white/20 hover:text-white" asChild>
                <a href={template.href} target="_blank" rel="noreferrer">
                  <FilePdf className="mr-2 h-4 w-4" />
                  {template.code}
                </a>
              </Button>
            ))}
          </div>
        </div>
      </Card>

      <div className="flex border-b border-border">
        <button
          className={`px-6 py-3 font-medium text-sm transition-colors ${activeTab === 'handover' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          onClick={() => switchTab('handover')}
        >
          Lập biên bản cấp phát
        </button>
        <button
          className={`px-6 py-3 font-medium text-sm transition-colors ${activeTab === 'reclaim' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          onClick={() => switchTab('reclaim')}
        >
          Lập biên bản thu hồi
        </button>
        <button
          className={`px-6 py-3 font-medium text-sm transition-colors ${activeTab === 'history' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          onClick={() => switchTab('history')}
        >
          Lịch sử cấp phát/thu hồi
        </button>
      </div>

      {activeTab === 'handover' && (
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1.5">Khu nhà nhận</label>
              <Select 
                value={targetBuildingId} 
                onChange={(e) => {
                  setTargetBuildingId(e.target.value);
                  setSelectedHandoverAssets(new Set());
                  handleBuildingChange(e.target.value, setTargetRoomId);
                }}
              >
                <option value="">Chọn khu nhà</option>
                {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Phòng nhận</label>
              <Select 
                value={targetRoomId} 
                onChange={(e) => {
                  setTargetRoomId(e.target.value);
                  setSelectedHandoverAssets(new Set());
                }}
              >
                <option value="">Chọn phòng</option>
                {rooms.map(r => <option key={r.id} value={r.id}>{r.roomCode}</option>)}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Ghi chú cấp phát</label>
              <Input value={handoverNote} onChange={(e) => setHandoverNote(e.target.value)} placeholder="VD: Bàn giao đầu năm học / bổ sung thiết bị cho phòng" />
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
            <div>
              <h3 className="font-semibold text-lg">Thiết bị sẵn sàng trong Kho ({filteredAvailableAssets.length}/{availableAssets.length})</h3>
              <p className="text-sm text-muted-foreground">Chọn tài sản trong kho để lập biên bản bàn giao cho phòng đã chọn.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input 
                  className="pl-9 w-64" 
                  placeholder="Tìm mã hoặc tên TB..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="w-48">
                <option value="">Tất cả danh mục</option>
                {handoverCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </Select>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto mb-6">
            {isLoading ? (
              <div className="p-5 bg-card">
                <SkeletonTable rows={5} cols={5} />
              </div>
            ) : (
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-[50px]">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                      checked={filteredAvailableAssets.length > 0 && filteredAvailableAssets.every(a => selectedHandoverAssets.has(a.id))}
                      onChange={handleSelectAllHandover}
                    />
                  </TableHead>
                  <TableHead>Mã TB</TableHead>
                  <TableHead>Tên TB</TableHead>
                  <TableHead>Danh mục</TableHead>
                  <TableHead>Tình trạng</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAvailableAssets.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Không tìm thấy thiết bị phù hợp.</TableCell></TableRow>
                ) : (
                  filteredAvailableAssets.map(asset => (
                    <TableRow key={asset.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => toggleSelection(asset.id, selectedHandoverAssets, setSelectedHandoverAssets)}>
                      <TableCell>
                        <input type="checkbox" checked={selectedHandoverAssets.has(asset.id)} readOnly className="rounded border-gray-300 text-primary focus:ring-primary" />
                      </TableCell>
                      <TableCell className="font-medium">{asset.assetCode}</TableCell>
                      <TableCell>{asset.assetName}</TableCell>
                      <TableCell><span className="px-2 py-1 bg-muted text-muted-foreground rounded-md text-xs font-medium">{asset.categoryName}</span></TableCell>
                      <TableCell>{getConditionBadge(asset.conditionLabel)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            )}
          </div>

          <div className="flex justify-end">
            <Button onClick={submitHandover} disabled={selectedHandoverAssets.size === 0 || !targetRoomId}>
              Lập biên bản cấp phát ({selectedHandoverAssets.size})
            </Button>
          </div>
        </Card>
      )}

      {activeTab === 'reclaim' && (
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1.5">Khu nhà thu hồi</label>
              <Select 
                value={fromBuildingId} 
                onChange={(e) => {
                  setFromBuildingId(e.target.value);
                  setSelectedReclaimAssets(new Set());
                  handleBuildingChange(e.target.value, (val) => {
                    setFromRoomId(val);
                    setRoomAssets([]);
                  });
                }}
              >
                <option value="">Chọn khu nhà</option>
                {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Phòng thu hồi</label>
              <Select 
                value={fromRoomId} 
                onChange={(e) => {
                  setFromRoomId(e.target.value);
                  setSelectedReclaimAssets(new Set());
                  loadRoomAssets(e.target.value);
                }}
              >
                <option value="">Chọn phòng</option>
                {rooms.map(r => <option key={r.id} value={r.id}>{r.roomCode}</option>)}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Ghi chú thu hồi</label>
              <Input value={reclaimNote} onChange={(e) => setReclaimNote(e.target.value)} placeholder="VD: Thu hồi khi trả phòng / hỏng hóc" />
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
            <div>
              <h3 className="font-semibold text-lg">Thiết bị hiện có trong phòng ({filteredRoomAssets.length}/{roomAssets.length})</h3>
              <p className="text-sm text-muted-foreground">Chọn tài sản trong phòng để lập biên bản thu hồi về kho trung tâm.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input 
                  className="pl-9 w-64" 
                  placeholder="Tìm mã hoặc tên TB..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="w-48">
                <option value="">Tất cả danh mục</option>
                {reclaimCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </Select>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto mb-6">
            {isFetchingRoomAssets ? (
              <div className="p-5 bg-card">
                <SkeletonTable rows={5} cols={5} />
              </div>
            ) : (
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-[50px]">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                      checked={filteredRoomAssets.length > 0 && filteredRoomAssets.every(a => selectedReclaimAssets.has(a.id))}
                      onChange={handleSelectAllReclaim}
                    />
                  </TableHead>
                  <TableHead>Mã TB</TableHead>
                  <TableHead>Tên TB</TableHead>
                  <TableHead>Danh mục</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRoomAssets.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Không tìm thấy thiết bị phù hợp trong phòng.</TableCell></TableRow>
                ) : (
                  filteredRoomAssets.map(asset => (
                    <TableRow key={asset.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => toggleSelection(asset.id, selectedReclaimAssets, setSelectedReclaimAssets)}>
                      <TableCell>
                        <input type="checkbox" checked={selectedReclaimAssets.has(asset.id)} readOnly className="rounded border-gray-300 text-primary focus:ring-primary" />
                      </TableCell>
                      <TableCell className="font-medium">{asset.assetCode}</TableCell>
                      <TableCell>{asset.assetName}</TableCell>
                      <TableCell><span className="px-2 py-1 bg-muted text-muted-foreground rounded-md text-xs font-medium">{asset.categoryName}</span></TableCell>
                      <TableCell>{getStatusBadge(asset.statusLabel)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            )}
          </div>

          <div className="flex justify-end">
            <Button onClick={submitReclaim} variant="destructive" disabled={selectedReclaimAssets.size === 0 || !fromRoomId}>
              Lập biên bản thu hồi ({selectedReclaimAssets.size})
            </Button>
          </div>
        </Card>
      )}

      {activeTab === 'history' && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Lịch sử biên bản cấp phát & thu hồi</h3>
            <Button variant="outline" onClick={loadHistory} className="gap-2">
              <ArrowsClockwise size={16} /> Làm mới
            </Button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Mã phiếu</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Ngày lập</TableHead>
                  <TableHead className="text-center">Số thiết bị</TableHead>
                  <TableHead>Phòng</TableHead>
                  <TableHead>Người lập</TableHead>
                  <TableHead>Ghi chú</TableHead>
                  <TableHead className="text-center">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingHistory ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                      Đang tải lịch sử...
                    </TableCell>
                  </TableRow>
                ) : historyReceipts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                      Không tìm thấy biên bản bàn giao/thu hồi nào.
                    </TableCell>
                  </TableRow>
                ) : (
                  historyReceipts.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="pl-6 font-medium text-foreground">{item.receiptCode}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-bold ${item.type === 'HANDOVER' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {item.type === 'HANDOVER' ? 'Bàn giao / Cấp phát' : 'Thu hồi'}
                        </span>
                      </TableCell>
                      <TableCell>{new Date(item.receiptDate).toLocaleDateString('vi-VN')}</TableCell>
                      <TableCell className="text-center font-bold">{item._count?.items ?? item.items?.length ?? 0}</TableCell>
                      <TableCell>{item.items?.[0]?.asset?.room?.roomCode || 'KTX'}</TableCell>
                      <TableCell>{item.creator?.fullName || '-'}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={item.note || ''}>{item.note || '-'}</TableCell>
                      <TableCell className="text-center">
                        <RowActionsMenu
                          ariaLabel={`Thao tác phiếu ${item.receiptCode}`}
                          actions={[
                            { id: 'view-print', label: 'Xem & In', icon: <Eye size={16} />, onClick: () => handleTriggerPrint(item) }
                          ]}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Hidden printable Allocation/Reclaim Receipt */}
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
            <h1 className="text-xl font-bold uppercase text-black text-center">
              {printData?.type === 'RECLAIM' ? 'BIÊN BẢN THU HỒI CƠ SỞ VẬT CHẤT' : 'BIÊN BẢN BÀN GIAO CƠ SỞ VẬT CHẤT'}
            </h1>
            <p className="font-semibold text-xs mt-1 text-black text-center">Số biên bản: {printTemplate.code}/{printData?.receiptCode || '.......'}</p>
          </div>
          
          <div className="mb-6 text-xs space-y-2 text-black text-left">
            <h3 className="font-bold text-sm">1. Thông tin chung</h3>
            <p>- Ngày lập: <span className="font-semibold">{printData?.date || '……/……/……'}</span></p>
            <p>- Phòng/Khu nhà: <span className="font-semibold">{printData?.roomName || '....................................................................................'}</span></p>
            <p>- Bên giao (Ban quản lý KTX): <span className="font-semibold">Kho trung tâm KTX Man Thiện</span></p>
            <p>- Bên nhận (Đại diện phòng/Sinh viên): <span className="font-semibold">Đại diện Sinh viên phòng {printData?.roomName || '.......'}</span></p>
          </div>

          <div className="mb-6 text-xs text-black text-left">
            <h3 className="font-bold text-sm mb-2">2. Nội dung biên bản</h3>
            <p className="mb-2 italic text-black">
              {printData?.type === 'RECLAIM' 
                ? 'Hai bên thống nhất thu hồi các tài sản/cơ sở vật chất sau từ phòng ký túc xá về kho:'
                : 'Hai bên thống nhất bàn giao các tài sản/cơ sở vật chất sau để sử dụng tại phòng ký túc xá:'}
            </p>
            
            <table className="w-full border-collapse border border-black text-xs text-black">
              <thead>
                <tr className="text-center font-bold text-black bg-gray-50">
                  <th className="border border-black p-2 w-12 text-black">STT</th>
                  <th className="border border-black p-2 w-28 text-black">Mã tài sản</th>
                  <th className="border border-black p-2 text-black">Tên tài sản</th>
                  <th className="border border-black p-2 w-16 text-black">Số lượng</th>
                  <th className="border border-black p-2 w-24 text-black">Tình trạng</th>
                  <th className="border border-black p-2 w-28 text-black">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {printData?.assets?.map((a: any, index: number) => (
                  <tr key={a.id} className="text-black">
                    <td className="border border-black p-2 text-center text-black">{index + 1}</td>
                    <td className="border border-black p-2 font-mono text-center text-black">{a.assetCode}</td>
                    <td className="border border-black p-2 text-black text-left">{a.assetName}</td>
                    <td className="border border-black p-2 text-center text-black">1</td>
                    <td className="border border-black p-2 text-center text-black">{a.conditionLabel || 'Tốt'}</td>
                    <td className="border border-black p-2 text-black">{a.note || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mb-6 text-xs text-black text-left">
            <p>- Ghi chú bàn giao: <span className="font-semibold">...............................................................................................................................</span></p>
          </div>

          <div className="mb-6 text-xs text-black text-left">
            <h3 className="font-bold text-sm mb-2">3. Hướng xử lý sau biên bản</h3>
            <div className="flex gap-8 italic">
              <label className="flex items-center gap-1.5"><input type="checkbox" defaultChecked /> Tiếp tục sử dụng</label>
              <label className="flex items-center gap-1.5"><input type="checkbox" /> Đưa vào bảo trì/sửa chữa</label>
              <label className="flex items-center gap-1.5"><input type="checkbox" /> Đề xuất thanh lý</label>
            </div>
          </div>

          <div className="grid grid-cols-2 text-center mt-8 mb-20 text-[11px] font-semibold text-black">
            <div>
              <p className="text-black font-bold">ĐẠI DIỆN BÊN GIAO</p>
              <p className="italic text-[10px] font-normal text-black">(Ký, ghi rõ họ tên)</p>
            </div>
            <div>
              <p className="text-black font-bold">ĐẠI DIỆN BÊN NHẬN</p>
              <p className="italic text-[10px] font-normal text-black">(Ký, ghi rõ họ tên)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
