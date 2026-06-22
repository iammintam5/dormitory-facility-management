import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/auth-context';
import { 
  ArrowLineRight, 
  ArrowLineLeft, 
  MagnifyingGlass, 
  Eye, 
  CaretLeft,
  CaretRight,
} from '@phosphor-icons/react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../components/ui/Table';

const transactionData = [
  { id: 1, code: 'NN2024-0009', type: 'Nhập', date: '20/05/2024', items: 80, supplier: 'Cty TNHH Thiết bị Hòa Phát', note: 'Nhập bổ sung Tb các phòng khu A,B', time: '09:30', status: 'Hoàn thành' },
  { id: 2, code: 'XX2024-0009', type: 'Xuất', date: '20/05/2024', items: 25, supplier: 'Phòng B101', note: 'Điều chuyển thiết bị hư hỏng', time: '10:45', status: 'Chờ duyệt' },
  { id: 3, code: 'NN2024-0008', type: 'Nhập', date: '15/05/2024', items: 45, supplier: 'Cty CP Điện tử Sáng Việt', note: 'Nhập bóng đèn LED và ổ cắm', time: '14:20', status: 'Hoàn thành' },
  { id: 4, code: 'XX2024-0008', type: 'Xuất', date: '12/05/2024', items: 12, supplier: 'Kho CSVC', note: 'Xuất thanh lý thiết bị hết hạn sử dụng', time: '08:00', status: 'Đã duyệt' },
  { id: 5, code: 'NN2024-0007', type: 'Nhập', date: '10/05/2024', items: 100, supplier: 'Cty TNHH Nội thất Hòa Bình', note: 'Nhập bàn ghế mới cho khu C', time: '11:15', status: 'Hoàn thành' },
  { id: 6, code: 'XX2024-0007', type: 'Xuất', date: '08/05/2024', items: 8, supplier: 'Phòng A201', note: 'Xuất trả thiết bị hỏng', time: '15:30', status: 'Hủy' },
  { id: 7, code: 'NN2024-0006', type: 'Nhập', date: '05/05/2024', items: 30, supplier: 'Cty CP Đầu tư Phát triển D&L', note: 'Nhập quạt treo tường phòng mới', time: '09:00', status: 'Hoàn thành' },
  { id: 8, code: 'XX2024-0006', type: 'Xuất', date: '02/05/2024', items: 15, supplier: 'Kho CSVC', note: 'Điều chuyển bàn ghế', time: '13:45', status: 'Hoàn thành' },
  { id: 9, code: 'NN2024-0005', type: 'Nhập', date: '28/04/2024', items: 60, supplier: 'Cty TNHH Thiết bị Hòa Phát', note: 'Nhập bình nóng lạnh', time: '10:00', status: 'Đã duyệt' },
  { id: 10, code: 'XX2024-0005', type: 'Xuất', date: '25/04/2024', items: 20, supplier: 'Phòng C301', note: 'Cấp phát thiết bị phòng mới', time: '14:00', status: 'Hoàn thành' },
];

const statusClass: Record<string, string> = {
  'Hoàn thành': 'text-emerald-600 bg-emerald-50',
  'Chờ duyệt': 'text-amber-600 bg-amber-50',
  'Đã duyệt': 'text-blue-600 bg-blue-50',
  'Hủy': 'text-rose-600 bg-rose-50',
};

export function EquipmentTransactionsPage() {
  const { user } = useAuth();
  const basePath = user?.role === 'ADMIN' ? '/admin' : '/manager';

  const summary = {
    total: transactionData.length,
    import: transactionData.filter((t) => t.type === 'Nhập').length,
    export: transactionData.filter((t) => t.type === 'Xuất').length,
    completed: transactionData.filter((t) => t.status === 'Hoàn thành').length,
  };

  return (
    <div className="space-y-6 mx-auto max-w-7xl pb-10">
      <PageHeader 
        title="Nhập - Xuất thiết bị" 
        breadcrumbs={[
          { label: 'Nghiệp vụ', href: '#' },
          { label: 'Nhập - Xuất thiết bị' }
        ]}
        actions={
          <div className="flex items-center gap-3">
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
              <Input placeholder="Tìm theo mã phiếu..." className="pl-9" />
              <MagnifyingGlass size={16} className="absolute left-3 top-2.5 text-muted-foreground" />
            </div>
          </div>
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
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ghi chú</TableHead>
                <TableHead className="text-center">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactionData.map((item) => {
                const isImport = item.type === 'Nhập';
                return (
                  <TableRow key={item.id}>
                    <TableCell className="pl-6 font-medium text-foreground">{item.code}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-bold ${isImport ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'}`}>
                        {isImport ? <ArrowLineLeft size={12} weight="bold" /> : <ArrowLineRight size={12} weight="bold" />}
                        {item.type}
                      </span>
                    </TableCell>
                    <TableCell className="tabular-nums">{item.date}</TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">{item.time}</TableCell>
                    <TableCell className="text-center font-bold tabular-nums">{item.items}</TableCell>
                    <TableCell className="max-w-[200px] truncate" title={item.supplier}>
                      {item.supplier}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex rounded px-2.5 py-0.5 text-[11px] font-bold ${statusClass[item.status] || 'bg-muted text-muted-foreground'}`}>
                        {item.status}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate text-muted-foreground" title={item.note}>
                      {item.note}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="icon" title="Xem chi tiết">
                        <Eye size={16} className="text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between border-t border-border/50 bg-muted/30 px-6 py-4">
          <div className="text-sm text-muted-foreground">
            Hiển thị 1 đến {transactionData.length} của {transactionData.length} phiếu
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
    </div>
  );
}
