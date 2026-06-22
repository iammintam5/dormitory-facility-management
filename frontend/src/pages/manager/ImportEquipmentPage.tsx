import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/auth-context';
import { 
  ArrowLeft, 
  Plus, 
  MagnifyingGlass, 
  PencilSimple, 
  Trash, 
  DownloadSimple, 
  Check 
} from '@phosphor-icons/react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { PageHeader } from '../../components/ui/PageHeader';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../components/ui/Table';

const equipmentData = [
  { id: 1, code: 'TB000123', name: 'Quạt treo tường Senko TR1628', type: 'Quạt điện', unit: 'Cái', qty: 10, price: '450.000', total: '4.500.000', warranty: 12, note: '-' },
  { id: 2, code: 'TB000124', name: 'Bình nóng lạnh Ariston 20L', type: 'Bình nóng lạnh', unit: 'Cái', qty: 5, price: '2.150.000', total: '10.750.000', warranty: 24, note: '-' },
  { id: 3, code: 'TB000125', name: 'Ổ cắm điện Lioa 3D32N', type: 'Ổ cắm điện', unit: 'Cái', qty: 20, price: '85.000', total: '1.700.000', warranty: 12, note: '-' },
  { id: 4, code: 'TB000126', name: 'Bóng đèn LED Tròn 12W', type: 'Thiết bị điện', unit: 'Cái', qty: 30, price: '35.000', total: '1.050.000', warranty: 6, note: '-' },
  { id: 5, code: 'TB000127', name: 'Thùng rác nhựa 20L', type: 'Thiết bị khác', unit: 'Cái', qty: 15, price: '120.000', total: '1.800.000', warranty: 12, note: '-' },
];

export function ImportEquipmentPage() {
  const { user } = useAuth();
  const basePath = user?.role === 'ADMIN' ? '/admin' : '/manager';

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
        <div className="p-6 border-b border-border/50">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-6">1. Thông tin phiếu nhập</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Loại phiếu nhập <span className="text-destructive">*</span>
              </label>
              <Select>
                <option>Nhập mua sắm</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Ngày nhập <span className="text-destructive">*</span>
              </label>
              <Input type="date" value="2024-05-20" readOnly />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Số phiếu nhập <span className="text-destructive">*</span>
              </label>
              <Input type="text" value="NN2024-0009" readOnly className="bg-muted font-medium" />
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
                <option>Kho CSVC</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Nhà cung cấp <span className="text-destructive">*</span>
              </label>
              <div className="flex gap-2">
                <Select className="flex-1">
                  <option>Công ty TNHH Thiết bị Hòa Phát</option>
                </Select>
                <Button variant="outline" size="icon" className="shrink-0">
                  <Plus size={16} weight="bold" />
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1.5">Địa chỉ nhà cung cấp</label>
              <Input type="text" value="Số 25, Ngõ 1 Cầu Giấy, Phường Dịch Vọng, Quận Cầu Giấy, Hà Nội" readOnly className="bg-muted" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Số điện thoại</label>
              <Input type="text" value="024 3 123 4567" readOnly className="bg-muted" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Hợp đồng / Đơn hàng</label>
              <Input type="text" defaultValue="HD2024-015" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Ngày chứng từ</label>
              <Input type="date" defaultValue="2024-05-18" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Số chứng từ (HĐ/ĐH)</label>
              <Input type="text" defaultValue="HD2024-015" />
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-foreground mb-1.5">Ghi chú</label>
              <textarea 
                rows={1} 
                defaultValue="Nhập bổ sung thiết bị cho các phòng khu A và khu B." 
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              ></textarea>
              <span className="absolute bottom-2.5 right-3 text-xs text-muted-foreground">62/200</span>
            </div>
          </div>
        </div>

        <div className="p-6">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">2. Danh sách thiết bị nhập</h3>
          
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
                  <TableHead>Loại thiết bị</TableHead>
                  <TableHead className="text-center">ĐVT</TableHead>
                  <TableHead className="text-center w-28">Số lượng</TableHead>
                  <TableHead className="text-right">Đơn giá (VNĐ)</TableHead>
                  <TableHead className="text-right">Thành tiền (VNĐ)</TableHead>
                  <TableHead className="text-center">Bảo hành</TableHead>
                  <TableHead className="text-center">Ghi chú</TableHead>
                  <TableHead className="text-center w-28">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipmentData.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-center font-medium text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-semibold text-foreground">{item.code}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.type}</TableCell>
                    <TableCell className="text-center text-muted-foreground">{item.unit}</TableCell>
                    <TableCell className="text-center">
                      <Input type="text" defaultValue={item.qty} className="text-center h-8" />
                    </TableCell>
                    <TableCell className="text-right font-medium">{item.price}</TableCell>
                    <TableCell className="text-right font-bold text-foreground">{item.total}</TableCell>
                    <TableCell className="text-center text-muted-foreground tabular-nums">{item.warranty}T</TableCell>
                    <TableCell className="text-center text-muted-foreground">{item.note}</TableCell>
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

          <div className="flex flex-col md:flex-row justify-between items-start md:items-end pt-4 border-t border-border/50">
            <div className="font-semibold text-sm text-foreground mb-4 md:mb-0">
              Tổng số lượng: <span className="text-primary">80</span>
            </div>
            <div className="w-full md:w-[320px] space-y-2 text-sm">
              <div className="flex justify-between items-center text-muted-foreground">
                <span className="font-semibold text-foreground">Tổng tiền hàng:</span>
                <span className="font-bold text-foreground">19.800.000</span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span className="font-semibold text-foreground">Thuế VAT (10%):</span>
                <span className="font-bold text-foreground">1.980.000</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="font-bold text-foreground text-base">Tổng cộng:</span>
                <span className="font-bold text-primary text-lg">21.780.000</span>
              </div>
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
            <Button className="w-full md:w-auto gap-2">
              <Check size={16} weight="bold" />
              Lưu và hoàn tất
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
