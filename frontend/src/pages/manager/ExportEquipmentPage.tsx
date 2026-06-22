import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/auth-context';
import { 
  ArrowLeft, 
  Plus, 
  MagnifyingGlass, 
  PencilSimple, 
  Trash, 
  DownloadSimple, 
  Printer, 
  Check 
} from '@phosphor-icons/react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { PageHeader } from '../../components/ui/PageHeader';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../components/ui/Table';

const equipmentData = [
  { id: 1, code: 'TB000123', name: 'Quạt treo tường Senko TR1628', type: 'Quạt điện', unit: 'Cái', qty: 5, condition: 'Hoạt động tốt', statusClass: 'bg-emerald-100 text-emerald-700', note: 'Điều chuyển sang phòng B101' },
  { id: 2, code: 'TB000126', name: 'Bóng đèn LED Tròn 12W', type: 'Thiết bị điện', unit: 'Cái', qty: 10, condition: 'Hoạt động tốt', statusClass: 'bg-emerald-100 text-emerald-700', note: '' },
  { id: 3, code: 'TB000131', name: 'Bàn học sinh 1m2', type: 'Nội thất', unit: 'Cái', qty: 2, condition: 'Hư hỏng nhẹ', statusClass: 'bg-amber-100 text-amber-700', note: 'Mặt bàn trầy nhẹ' },
  { id: 4, code: 'TB000145', name: 'Ghế nhựa tựa lưng', type: 'Nội thất', unit: 'Cái', qty: 8, condition: 'Hoạt động tốt', statusClass: 'bg-emerald-100 text-emerald-700', note: '' },
];

export function ExportEquipmentPage() {
  const { user } = useAuth();
  const basePath = user?.role === 'ADMIN' ? '/admin' : '/manager';

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
            <Button className="gap-2">
              <Plus size={16} weight="bold" />
              Tạo phiếu xuất
            </Button>
          </div>
        }
      />

      <Card className="border-border/50">
        <div className="p-6 border-b border-border/50">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-6">1. Thông tin phiếu xuất</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Loại phiếu xuất <span className="text-destructive">*</span>
              </label>
              <Select>
                <option>Xuất điều chuyển</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Ngày xuất <span className="text-destructive">*</span>
              </label>
              <Input type="date" value="2024-05-20" readOnly />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Số phiếu xuất <span className="text-destructive">*</span>
              </label>
              <Input type="text" value="XX2024-0009" readOnly className="bg-muted font-medium" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Người thực hiện <span className="text-destructive">*</span>
              </label>
              <Select>
                <option>Nguyễn Văn A</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Nơi nhận / Nơi giao <span className="text-destructive">*</span>
              </label>
              <Select>
                <option>Từ: Khu A - Phòng A201 &rarr; Đến: Khu B - Phòng B101</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Nhà cung cấp / Đơn vị nhận <span className="text-destructive">*</span>
              </label>
              <div className="flex gap-2">
                <Select className="flex-1">
                  <option>Khu B - Phòng B101</option>
                </Select>
                <Button variant="outline" size="icon" className="shrink-0">
                  <Plus size={16} weight="bold" />
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Lý do xuất <span className="text-destructive">*</span>
              </label>
              <Input type="text" defaultValue="Điều chuyển thiết bị hư hỏng sang phòng khác" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Ngày yêu cầu</label>
              <Input type="date" defaultValue="2024-05-18" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Ngày xuất thiết bị (dự kiến)</label>
              <Input type="date" defaultValue="2024-05-20" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Hợp đồng / Quyết định</label>
              <Input type="text" defaultValue="QĐ-125/2024" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Số điện thoại liên hệ</label>
              <Input type="text" defaultValue="0987 654 321" />
            </div>
            <div className="relative md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1.5">Ghi chú</label>
              <Input type="text" placeholder="Ghi chú thêm (nếu có)" />
              <span className="absolute bottom-2.5 right-3 text-xs text-muted-foreground">0/200</span>
            </div>
          </div>
        </div>

        <div className="p-6">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">2. Danh sách thiết bị xuất</h3>
          
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Input type="text" placeholder="Tìm kiếm thiết bị..." className="pl-9" />
              <MagnifyingGlass size={16} className="absolute left-3 top-2.5 text-muted-foreground" />
            </div>
            <Select className="w-[200px]">
              <option>Chọn loại thiết bị</option>
            </Select>
            <Button variant="outline" className="gap-2">
              <Plus size={16} weight="bold" />
              Thêm thiết bị
            </Button>
          </div>

          <div className="overflow-x-auto mb-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 text-center">STT</TableHead>
                  <TableHead>Mã thiết bị</TableHead>
                  <TableHead>Tên thiết bị</TableHead>
                  <TableHead className="text-center">Loại thiết bị</TableHead>
                  <TableHead className="text-center">ĐVT</TableHead>
                  <TableHead className="text-center w-32">Số lượng</TableHead>
                  <TableHead className="text-center">Tình trạng</TableHead>
                  <TableHead>Ghi chú</TableHead>
                  <TableHead className="text-center w-28">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipmentData.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-center font-medium text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-semibold text-foreground">{item.code}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-center text-muted-foreground">{item.type}</TableCell>
                    <TableCell className="text-center text-muted-foreground">{item.unit}</TableCell>
                    <TableCell className="text-center">
                      <Input type="text" defaultValue={item.qty} className="text-center h-8" />
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold ${item.statusClass}`}>
                        {item.condition}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{item.note}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" title="Sửa">
                          <PencilSimple size={16} className="text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Xóa">
                          <Trash size={16} className="text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start pt-4 border-t border-border/50">
            <div className="font-semibold text-sm text-foreground mb-4 md:mb-0">
              Tổng số lượng: <span className="text-primary">25</span>
            </div>
            <div className="w-full md:w-[400px] relative">
              <label className="block text-sm font-medium text-foreground mb-1.5">Ghi chú chung</label>
              <textarea 
                rows={3} 
                defaultValue="Kiểm tra và ghi nhận đầy đủ tình trạng thiết bị trước khi xuất." 
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              ></textarea>
              <span className="absolute bottom-2 right-3 text-xs text-muted-foreground">34/200</span>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-border/50 bg-muted/30 flex flex-col md:flex-row justify-between items-center gap-4">
          <Button variant="outline" asChild className="w-full md:w-auto">
            <Link to={`${basePath}/asset-transactions`}>
              Hủy bỏ
            </Link>
          </Button>
          <div className="flex items-center gap-2 w-full md:w-auto flex-wrap md:flex-nowrap">
            <Button variant="outline" className="flex-1 md:flex-none gap-2 text-primary hover:text-primary">
              <DownloadSimple size={16} weight="bold" />
              Lưu nháp
            </Button>
            <Button variant="outline" className="flex-1 md:flex-none gap-2 text-primary hover:text-primary">
              <Printer size={16} weight="bold" />
              In phiếu xuất
            </Button>
            <Button className="w-full md:w-auto gap-2">
              <Check size={16} weight="bold" />
              Xác nhận xuất
            </Button>
          </div>
        </div>

      </Card>
    </div>
  );
}
