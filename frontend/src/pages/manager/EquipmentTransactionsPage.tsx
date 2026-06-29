import { useEffect, useMemo, useState, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/auth-context';
import { useToast } from '../../toast/toast-context';
import {
  ArrowLineRight,
  ArrowLineLeft,
  MagnifyingGlass,
  Eye,
  CaretLeft,
  CaretRight,
  FilePdf,
  ArrowsClockwise,
  Printer,
} from '@phosphor-icons/react';
import { RowActionsMenu } from '../../components/ui/RowActionsMenu';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { PageHeader } from '../../components/ui/PageHeader';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../components/ui/Table';
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter } from '../../components/ui/Modal';
import { AssetReceiptRecord, getAssetReceipt, getAssetReceipts } from '../../services/asset-receipts';
import { getApiErrorMessage } from '../../lib/api-client';

const transactionTemplates = {
  IMPORT: {
    code: 'PNK',
    label: 'Phiếu nhập kho',
    href: '/templates/asset-receipts/PHIEU_NHAP_KHO_CSVC.pdf',
  },
  EXPORT: {
    code: 'PXK',
    label: 'Phiếu xuất kho',
    href: '/templates/asset-receipts/PHIEU_XUAT_KHO_CSVC.pdf',
  },
};

const typeLabel: Record<'IMPORT' | 'EXPORT', string> = {
  IMPORT: 'Nhập',
  EXPORT: 'Xuất',
};

const statusClass = 'text-emerald-600 bg-emerald-50';

function isImportExport(receipt: AssetReceiptRecord): receipt is AssetReceiptRecord & { type: 'IMPORT' | 'EXPORT' } {
  return receipt.type === 'IMPORT' || receipt.type === 'EXPORT';
}

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('vi-VN');
}

function formatTime(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function formatCurrency(value?: number | string | null) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) return '-';
  return amount.toLocaleString('vi-VN');
}

function getItemCount(receipt: AssetReceiptRecord) {
  return receipt._count?.items ?? receipt.items?.length ?? 0;
}

function getPartnerLabel(receipt: AssetReceiptRecord) {
  return receipt.type === 'IMPORT' ? 'Nhà cung cấp' : 'Đơn vị nhận';
}

function getPartnerValue(receipt: AssetReceiptRecord) {
  return receipt.supplierName || '-';
}

export function EquipmentTransactionsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const basePath = user?.role === 'ADMIN' ? '/admin' : '/manager';

  const [receipts, setReceipts] = useState<AssetReceiptRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<AssetReceiptRecord | null>(null);
  const [detailReceipt, setDetailReceipt] = useState<AssetReceiptRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [printReceipt, setPrintReceipt] = useState<AssetReceiptRecord | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });

  const handleTriggerPrint = async (receipt: AssetReceiptRecord) => {
    try {
      showToast('Đang tải dữ liệu để in...', 'info');
      const details = await getAssetReceipt(receipt.id);
      setPrintReceipt(details);
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Lỗi khi tải chi tiết phiếu để in'), 'error');
    }
  };

  useEffect(() => {
    if (printReceipt) {
      handlePrint();
      setPrintReceipt(null);
    }
  }, [printReceipt]);

  const loadReceipts = async () => {
    try {
      setLoading(true);
      const data = await getAssetReceipts({ types: 'IMPORT,EXPORT' });
      setReceipts(data.filter(isImportExport));
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Không thể tải lịch sử nhập/xuất'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReceipts();
  }, []);

  const filteredReceipts = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    const from = dateFrom ? new Date(dateFrom) : null;
    const to = dateTo ? new Date(`${dateTo}T23:59:59`) : null;

    return receipts.filter((receipt) => {
      if (!isImportExport(receipt)) return false;
      if (typeFilter && receipt.type !== typeFilter) return false;

      const receiptDate = new Date(receipt.receiptDate);
      if (from && receiptDate < from) return false;
      if (to && receiptDate > to) return false;

      if (!normalizedKeyword) return true;
      const haystack = [
        receipt.receiptCode,
        typeLabel[receipt.type],
        receipt.supplierName,
        receipt.supplierPhone,
        receipt.contractNumber,
        receipt.documentNumber,
        receipt.note,
        receipt.creator?.fullName,
      ].filter(Boolean).join(' ').toLowerCase();

      return haystack.includes(normalizedKeyword);
    });
  }, [receipts, keyword, typeFilter, dateFrom, dateTo]);

  const summary = {
    total: receipts.length,
    import: receipts.filter((receipt) => receipt.type === 'IMPORT').length,
    export: receipts.filter((receipt) => receipt.type === 'EXPORT').length,
    completed: receipts.length,
  };

  const openDetail = async (receipt: AssetReceiptRecord) => {
    setSelectedReceipt(receipt);
    setDetailReceipt(null);
    setDetailLoading(true);

    try {
      const detail = await getAssetReceipt(receipt.id);
      setDetailReceipt(detail);
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Không thể tải chi tiết phiếu'), 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedReceipt(null);
    setDetailReceipt(null);
    setDetailLoading(false);
  };

  const activeReceipt = detailReceipt || selectedReceipt;
  const activeTemplate = activeReceipt && isImportExport(activeReceipt)
    ? transactionTemplates[activeReceipt.type]
    : transactionTemplates.IMPORT;

  return (
    <div className="space-y-6 mx-auto max-w-7xl pb-10">
      <PageHeader
        title="Nhập/Xuất thiết bị"
        breadcrumbs={[
          { label: 'Nghiệp vụ', href: '#' },
          { label: 'Nhập/Xuất thiết bị' }
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild variant="outline" className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
              <Link to={`${basePath}/asset-transactions/import`}>
                <ArrowLineLeft size={16} weight="bold" />
                Nhập thiết bị
              </Link>
            </Button>
            <Button asChild variant="outline" className="gap-2 border-sky-200 text-sky-700 hover:bg-sky-50">
              <Link to={`${basePath}/asset-transactions/export`}>
                <ArrowLineRight size={16} weight="bold" />
                Xuất thiết bị
              </Link>
            </Button>
          </div>
        }
      />

      <Card className="border-sky-500 bg-sky-600 p-5 text-white shadow-sm dark:border-sky-700 dark:bg-sky-800">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-semibold text-white">Mẫu phiếu nhập/xuất</h3>
          <div className="flex flex-row flex-wrap gap-2 sm:justify-end">
            {Object.values(transactionTemplates).map((template) => (
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground">Tổng phiếu</p>
            <p className="text-2xl font-bold tabular-nums text-foreground mt-1">{summary.total}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground">Phiếu nhập</p>
            <p className="text-2xl font-bold tabular-nums text-emerald-600 mt-1">{summary.import}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground">Phiếu xuất</p>
            <p className="text-2xl font-bold tabular-nums text-sky-600 mt-1">{summary.export}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground">Hoàn thành</p>
            <p className="text-2xl font-bold tabular-nums text-emerald-600 mt-1">{summary.completed}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-5 flex flex-wrap items-end gap-4">
          <div className="w-full md:w-[280px]">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Từ khóa</label>
            <div className="relative">
              <Input
                placeholder="Tìm mã phiếu, đối tác, ghi chú..."
                className="pl-9"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
              />
              <MagnifyingGlass size={16} className="absolute left-3 top-2.5 text-muted-foreground" />
            </div>
          </div>
          <div className="w-full sm:w-[180px]">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Loại phiếu</label>
            <Select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
              <option value="">Tất cả</option>
              <option value="IMPORT">Phiếu nhập</option>
              <option value="EXPORT">Phiếu xuất</option>
            </Select>
          </div>
          <div className="w-full sm:w-[170px]">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Từ ngày</label>
            <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          </div>
          <div className="w-full sm:w-[170px]">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Đến ngày</label>
            <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </div>
          <Button variant="outline" className="gap-2" onClick={loadReceipts} disabled={loading}>
            <ArrowsClockwise size={16} weight="bold" />
            Làm mới
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Mã phiếu</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Ngày</TableHead>
                <TableHead>Giờ</TableHead>
                <TableHead className="text-center">Số thiết bị</TableHead>
                <TableHead>Đối tác / Nơi nhận</TableHead>
                <TableHead>Người thực hiện</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ghi chú</TableHead>
                <TableHead className="text-center">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                    Đang tải lịch sử nhập/xuất...
                  </TableCell>
                </TableRow>
              ) : filteredReceipts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                    Không tìm thấy phiếu nhập/xuất phù hợp.
                  </TableCell>
                </TableRow>
              ) : (
                filteredReceipts.map((item) => {
                  if (!isImportExport(item)) return null;
                  const isImport = item.type === 'IMPORT';
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="pl-6 font-medium text-foreground">{item.receiptCode}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-bold ${isImport ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'}`}>
                          {isImport ? <ArrowLineLeft size={12} weight="bold" /> : <ArrowLineRight size={12} weight="bold" />}
                          {typeLabel[item.type]}
                        </span>
                      </TableCell>
                      <TableCell className="tabular-nums">{formatDate(item.receiptDate)}</TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">{formatTime(item.createdAt)}</TableCell>
                      <TableCell className="text-center font-bold tabular-nums">{getItemCount(item)}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={getPartnerValue(item)}>
                        {getPartnerValue(item)}
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate" title={item.creator?.fullName || '-'}>
                        {item.creator?.fullName || '-'}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex rounded px-2.5 py-0.5 text-[11px] font-bold ${statusClass}`}>
                          Hoàn thành
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate text-muted-foreground" title={item.note || ''}>
                        {item.note || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <RowActionsMenu
                          ariaLabel={`Thao tác phiếu ${item.receiptCode}`}
                          actions={[
                            { id: 'view', label: 'Xem chi tiết', icon: <Eye size={16} />, onClick: () => openDetail(item) },
                            { id: 'print', label: 'In phiếu PDF', icon: <Printer size={16} />, onClick: () => handleTriggerPrint(item) }
                          ]}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between border-t border-border/50 bg-muted/30 px-6 py-4">
          <div className="text-sm text-muted-foreground">
            Hiển thị {filteredReceipts.length === 0 ? 0 : 1} đến {filteredReceipts.length} của {filteredReceipts.length} phiếu
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled className="gap-1">
              <CaretLeft size={16} /> Trước
            </Button>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground shadow">1</div>
            <Button variant="outline" size="sm" disabled className="gap-1">
              Sau <CaretRight size={16} />
            </Button>
          </div>
        </div>
      </Card>

      <Modal isOpen={!!selectedReceipt} onClose={closeDetail} size="3xl">
        <ModalHeader onClose={closeDetail}>
          <ModalTitle>
            Chi tiết phiếu {activeReceipt && isImportExport(activeReceipt) ? typeLabel[activeReceipt.type].toLowerCase() : ''}
          </ModalTitle>
        </ModalHeader>
        <ModalBody>
          {detailLoading || !activeReceipt ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Đang tải chi tiết phiếu...</div>
          ) : (
            <div className="space-y-6 pt-4">
              <div className="grid grid-cols-1 gap-4 rounded-lg border border-border/50 bg-muted/20 p-4 text-sm md:grid-cols-3">
                <div>
                  <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Mã phiếu</p>
                  <p className="text-base font-bold text-primary">{activeReceipt.receiptCode}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Loại phiếu</p>
                  <p className="font-semibold text-foreground">{isImportExport(activeReceipt) ? typeLabel[activeReceipt.type] : activeReceipt.type}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Trạng thái</p>
                  <span className={`inline-flex rounded px-2.5 py-0.5 text-[11px] font-bold ${statusClass}`}>Hoàn thành</span>
                </div>
                <div>
                  <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Thời gian</p>
                  <p className="font-semibold text-foreground">{formatTime(activeReceipt.createdAt)} - {formatDate(activeReceipt.receiptDate)}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">{getPartnerLabel(activeReceipt)}</p>
                  <p className="font-semibold text-foreground">{getPartnerValue(activeReceipt)}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Người thực hiện</p>
                  <p className="font-semibold text-foreground">{activeReceipt.creator?.fullName || '-'}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Tổng giá trị</p>
                  <p className="font-semibold text-foreground">{formatCurrency(activeReceipt.totalAmount)}</p>
                </div>
                <div className="md:col-span-3">
                  <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Ghi chú</p>
                  <p className="font-medium text-foreground">{activeReceipt.note || 'Không có ghi chú'}</p>
                </div>
              </div>

              <div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b pb-2">
                  <h4 className="font-bold text-foreground">Danh sách thiết bị ({getItemCount(activeReceipt)})</h4>
                  <Button variant="outline" size="sm" className="gap-2" asChild>
                    <a href={activeTemplate.href} target="_blank" rel="noreferrer">
                      <FilePdf size={16} />
                      {activeTemplate.code}
                    </a>
                  </Button>
                </div>
                <div className="max-h-[320px] overflow-y-auto rounded-md border border-border/60">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-muted/70">
                      <TableRow>
                        <TableHead className="w-16 text-center">STT</TableHead>
                        <TableHead>Mã tài sản</TableHead>
                        <TableHead>Tên tài sản</TableHead>
                        <TableHead>Loại</TableHead>
                        <TableHead className="text-center">SL</TableHead>
                        <TableHead className="text-right">Đơn giá</TableHead>
                        <TableHead>Ghi chú</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeReceipt.items?.length ? (
                        activeReceipt.items.map((item, index) => (
                          <TableRow key={item.id}>
                            <TableCell className="text-center font-medium text-muted-foreground">{index + 1}</TableCell>
                            <TableCell className="font-semibold">{item.asset?.assetCode || '-'}</TableCell>
                            <TableCell>{item.asset?.assetName || '-'}</TableCell>
                            <TableCell>{item.asset?.category?.name || item.asset?.categoryName || '-'}</TableCell>
                            <TableCell className="text-center tabular-nums">{item.quantity || 1}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatCurrency(item.unitPrice)}</TableCell>
                            <TableCell className="max-w-[180px] truncate text-muted-foreground" title={item.note || ''}>{item.note || '-'}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                            Chưa có dữ liệu chi tiết thiết bị.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" asChild>
            <a href={activeTemplate.href} target="_blank" rel="noreferrer">
              <FilePdf className="mr-2 h-4 w-4" />
              Mở mẫu {activeTemplate.code}
            </a>
          </Button>
          <Button onClick={closeDetail}>Đóng</Button>
        </ModalFooter>
      </Modal>

      {/* Hidden printable Import/Export Receipt */}
      <div className="hidden">
        <div className="bg-white text-black p-12" ref={printRef} style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'Times New Roman' }}>
          <style>{`
            @page {
              size: A4;
              margin: 15mm 20mm;
            }
          `}</style>
          {printReceipt && (
            <>
              {printReceipt.type === 'IMPORT' ? (
                <>
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
                    <h1 className="text-xl font-bold uppercase text-black text-center text-black">PHIẾU NHẬP KHO CƠ SỞ VẬT CHẤT</h1>
                    <p className="font-semibold text-xs mt-1 text-black text-center text-black">Số phiếu: PNK/{printReceipt.receiptCode}</p>
                  </div>
                  
                  <div className="mb-6 text-xs space-y-2 text-black text-left">
                    <h3 className="font-bold text-sm">1. Thông tin phiếu</h3>
                    <p>- Ngày lập: <span className="font-semibold">{printReceipt.receiptDate ? new Date(printReceipt.receiptDate).toLocaleDateString('vi-VN') : new Date().toLocaleDateString('vi-VN')}</span></p>
                    <p>- Người thực hiện: <span className="font-semibold">{printReceipt.creator?.fullName || '--'}</span></p>
                    <p>- Nhà cung cấp/nguồn nhập: <span className="font-semibold">{printReceipt.supplierName || 'Tự do'}</span></p>
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
                        {printReceipt.items?.map((item, index) => (
                          <tr key={item.id} className="text-black">
                            <td className="border border-black p-2 text-center text-black">{index + 1}</td>
                            <td className="border border-black p-2 font-mono text-center text-black">{item.asset?.assetCode || '-'}</td>
                            <td className="border border-black p-2 text-black text-left">{item.asset?.assetName || '-'}</td>
                            <td className="border border-black p-2 text-center text-black">Cái</td>
                            <td className="border border-black p-2 text-center text-black">{item.quantity || 1}</td>
                            <td className="border border-black p-2 text-right text-black">{(item.unitPrice || 0).toLocaleString('vi-VN')} đ</td>
                            <td className="border border-black p-2 text-black">{item.note || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mb-6 text-xs text-black space-y-1 pl-1 text-left">
                    <p>- Tổng số lượng: <span className="font-semibold">{printReceipt.items?.reduce((sum, i) => sum + (i.quantity || 1), 0)}</span></p>
                    <p>- Tổng giá trị: <span className="font-semibold">{(printReceipt.totalAmount || 0).toLocaleString('vi-VN')} đ</span></p>
                    <p>- Ghi chú nhập kho: <span className="font-semibold">{printReceipt.note || '--'}</span></p>
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
                </>
              ) : (
                <>
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
                    <h1 className="text-xl font-bold uppercase text-black text-center text-black">PHIẾU XUẤT KHO CƠ SỞ VẬT CHẤT</h1>
                    <p className="font-semibold text-xs mt-1 text-black text-center text-black">Số phiếu: PXK/{printReceipt.receiptCode}</p>
                  </div>
                  
                  <div className="mb-6 text-xs space-y-2 text-black text-left">
                    <h3 className="font-bold text-sm">1. Thông tin phiếu</h3>
                    <p>- Ngày lập: <span className="font-semibold">{printReceipt.receiptDate ? new Date(printReceipt.receiptDate).toLocaleDateString('vi-VN') : new Date().toLocaleDateString('vi-VN')}</span></p>
                    <p>- Người thực hiện: <span className="font-semibold">{printReceipt.creator?.fullName || '--'}</span></p>
                    <p>- Đơn vị nhận/lý do xuất: <span className="font-semibold">Phòng/Phân ban / {printReceipt.note || '--'}</span></p>
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
                        {printReceipt.items?.map((item, index) => (
                          <tr key={item.id} className="text-black">
                            <td className="border border-black p-2 text-center text-black">{index + 1}</td>
                            <td className="border border-black p-2 font-mono text-center text-black">{item.asset?.assetCode || '-'}</td>
                            <td className="border border-black p-2 text-black text-left">{item.asset?.assetName || '-'}</td>
                            <td className="border border-black p-2 text-center text-black">Cái</td>
                            <td className="border border-black p-2 text-center text-black">{item.quantity || 1}</td>
                            <td className="border border-black p-2 text-right text-black">--</td>
                            <td className="border border-black p-2 text-black">
                              {item.note || (item.asset?.status === 'PENDING_LIQUIDATION' ? 'Chờ thanh lý' : 
                               item.asset?.condition === 'GOOD' ? 'Tốt' : 'Hư hỏng')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mb-6 text-xs text-black space-y-1 pl-1 text-left">
                    <p>- Tổng số lượng: <span className="font-semibold">{printReceipt.items?.reduce((sum, i) => sum + (i.quantity || 1), 0)}</span></p>
                    <p>- Tổng giá trị: <span className="font-semibold">--</span></p>
                    <p>- Ghi chú xuất kho: <span className="font-semibold">{printReceipt.note || '--'}</span></p>
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
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
