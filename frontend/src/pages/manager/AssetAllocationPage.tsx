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
import { createHandoverReceipt, createReclaimReceipt } from '../../services/asset-receipts';
import { getApiErrorMessage } from '../../lib/api-client';
import { useReactToPrint } from 'react-to-print';
import { FilePdf, MagnifyingGlass } from '@phosphor-icons/react';

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
  const [activeTab, setActiveTab] = useState<'handover' | 'reclaim'>('handover');
  const [buildings, setBuildings] = useState<BuildingRecord[]>([]);
  const [targetRooms, setTargetRooms] = useState<RoomRecord[]>([]);
  const [fromRooms, setFromRooms] = useState<RoomRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingRoomAssets, setIsFetchingRoomAssets] = useState(false);
  
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
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printData, setPrintData] = useState<any>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Bien_Ban_Ban_Giao',
  });

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

  const handleBuildingChange = async (
    buildingId: string,
    setRoomFn: (val: string) => void,
    setRoomsFn: (rooms: RoomRecord[]) => void,
  ) => {
    setRoomFn('');
    if (!buildingId) {
      setRoomsFn([]);
      return;
    }
    try {
      const res = await getRooms({ buildingId, pageSize: 100 });
      setRoomsFn(res);
    } catch (error) {
      console.error(error);
      setRoomsFn([]);
      showToast('Không thể tải danh sách phòng.', 'error');
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

  const switchTab = (tab: 'handover' | 'reclaim') => {
    setActiveTab(tab);
    setSearchQuery('');
    setSelectedCategory('');

    if (tab === 'handover') {
      setFromBuildingId('');
      setFromRoomId('');
      setFromRooms([]);
      setRoomAssets([]);
      setSelectedReclaimAssets(new Set());
      return;
    }

    setTargetBuildingId('');
    setTargetRoomId('');
    setTargetRooms([]);
    setSelectedHandoverAssets(new Set());
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
      
      const roomName = targetRooms.find(r => r.id === targetRoomId)?.roomCode || '';
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
      setShowPrintModal(true);

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
      
      const roomName = fromRooms.find(r => r.id === fromRoomId)?.roomCode || '';
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
      setShowPrintModal(true);

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
                  handleBuildingChange(e.target.value, setTargetRoomId, setTargetRooms);
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
                {targetRooms.map(r => <option key={r.id} value={r.id}>{r.roomCode}</option>)}
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
                  }, setFromRooms);
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
                {fromRooms.map(r => <option key={r.id} value={r.id}>{r.roomCode}</option>)}
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

      <Modal 
        isOpen={showPrintModal} 
        onClose={() => setShowPrintModal(false)} 
        size="lg" 
        title={printData?.type === 'RECLAIM' ? 'In biên bản thu hồi' : 'In biên bản bàn giao'}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowPrintModal(false)}>Đóng</Button>
            <Button variant="outline" asChild>
              <a href={printTemplate.href} target="_blank" rel="noreferrer">
                <FilePdf className="mr-2 h-4 w-4" />
                {printTemplate.code}
              </a>
            </Button>
            <Button onClick={() => handlePrint()}>In biên bản</Button>
          </>
        }
      >
        <div className="bg-white text-black p-8 border" ref={printRef}>
          <div className="mb-6 flex justify-between border-b border-gray-300 pb-4">
            <div>
              <p className="text-sm font-bold">Bộ Khoa học và Công nghệ</p>
              <p className="text-sm font-bold">Học viện Công nghệ Bưu chính Viễn thông</p>
              <p className="text-sm font-bold">Cơ sở tại Thành phố Hồ Chí Minh</p>
            </div>
            <div className="text-right text-xs">
              <p className="font-semibold">Mẫu số: {printTemplate.code}</p>
              <p>Số phiếu: {printData?.receiptCode}</p>
            </div>
          </div>
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h2>
            <p className="font-semibold">Độc lập - Tự do - Hạnh phúc</p>
            <p className="mt-2 italic">---o0o---</p>
            <h1 className="text-2xl font-bold mt-6 uppercase">
              {printData?.type === 'RECLAIM' ? 'BIÊN BẢN THU HỒI TÀI SẢN' : 'BIÊN BẢN BÀN GIAO TÀI SẢN'}
            </h1>
            <p className="mt-2 text-xs italic text-muted-foreground">
              Biên bản được in từ dữ liệu hệ thống. Có thể đối chiếu mẫu PDF {printTemplate.code} khi cần in mẫu trắng.
            </p>
          </div>
          
          <div className="mb-4">
            <p><strong>Ngày lập:</strong> {printData?.date}</p>
            {printData?.type === 'RECLAIM' ? (
              <>
                <p><strong>Bên giao (Sinh viên):</strong> Đại diện phòng {printData?.roomName}</p>
                <p><strong>Bên nhận (Ban QL KTX):</strong> Kho trung tâm</p>
              </>
            ) : (
              <>
                <p><strong>Bên giao (Ban QL KTX):</strong> Kho trung tâm</p>
                <p><strong>Bên nhận (Sinh viên):</strong> Đại diện phòng {printData?.roomName}</p>
              </>
            )}
          </div>

          <p className="mb-2">
            {printData?.type === 'RECLAIM' 
              ? `Chúng tôi tiến hành thu hồi các tài sản sau đây từ phòng ${printData?.roomName} về kho:` 
              : `Chúng tôi tiến hành bàn giao các tài sản sau đây để sử dụng tại phòng ${printData?.roomName}:`}
          </p>
          
          <table className="w-full border-collapse border border-black mb-8 text-sm">
            <thead>
              <tr>
                <th className="border border-black p-2">STT</th>
                <th className="border border-black p-2">Mã TB</th>
                <th className="border border-black p-2">Tên TB</th>
                <th className="border border-black p-2">Số lượng</th>
                <th className="border border-black p-2">Tình trạng</th>
              </tr>
            </thead>
            <tbody>
              {printData?.assets?.map((a: any, index: number) => (
                <tr key={a.id}>
                  <td className="border border-black p-2 text-center">{index + 1}</td>
                  <td className="border border-black p-2">{a.assetCode}</td>
                  <td className="border border-black p-2">{a.assetName}</td>
                  <td className="border border-black p-2 text-center">1</td>
                  <td className="border border-black p-2">{a.conditionLabel || a.statusLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="grid grid-cols-2 text-center mt-12 mb-24">
            <div>
              <p className="font-bold">ĐẠI DIỆN BÊN GIAO</p>
              <p className="italic text-sm">(Ký, ghi rõ họ tên)</p>
            </div>
            <div>
              <p className="font-bold">ĐẠI DIỆN BÊN NHẬN</p>
              <p className="italic text-sm">(Ký, ghi rõ họ tên)</p>
            </div>
          </div>
        </div>
      </Modal>

    </div>
  );
}
