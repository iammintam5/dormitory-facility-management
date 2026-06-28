import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { SkeletonTable } from '../../components/ui/Skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select as UISelect } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { 
  Door, 
  Buildings, 
  Users, 
  CheckCircle, 
  MagnifyingGlass, 
  Armchair, 
  Lightning, 
  Package, 
  Info,
  Wrench,
  Spinner
} from '@phosphor-icons/react';
import { studentsApi } from '../../services/students';
import { Asset } from '../../types/assets';

export function StudentRoomAssetsPage() {
  const navigate = useNavigate();
  const [roomAssets, setRoomAssets] = useState<Asset[]>([]);
  const [roomCode, setRoomCode] = useState('A101');
  const [buildingCode, setBuildingCode] = useState('A');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const roomData = await studentsApi.getMyRoom();
        if (roomData) {
          setRoomCode(roomData.roomCode);
          setBuildingCode(roomData.floor?.building?.code || 'A');
        }
        
        const assets = await studentsApi.getMyRoomAssets();
        setRoomAssets(assets);
      } catch {
        // silent
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6 mx-auto max-w-7xl pb-10">
        <PageHeader 
          title="Thiết bị trong phòng" 
          description="Danh sách tài sản, thiết bị được bàn giao cho phòng."
        />
        <Card className="border-border/50">
          <div className="p-5">
            <SkeletonTable rows={8} cols={6} />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 mx-auto max-w-7xl pb-10">
      <PageHeader 
        title="Thiết bị trong phòng" 
        breadcrumbs={[
          { label: 'Trang chủ', href: '/student/dashboard' },
          { label: 'Thiết bị trong phòng' }
        ]}
      />

      {/* Info Banner */}
      <Card className="border-border/50">
        <CardContent className="p-6 flex flex-wrap gap-8 items-center justify-between divide-x divide-border/50">
          <div className="flex items-center gap-4 px-4 pl-0">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Door size={24} weight="duotone" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Phòng</p>
              <p className="text-2xl font-bold text-foreground">{roomCode}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 px-4">
            <div className="w-12 h-12 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
              <Buildings size={24} weight="duotone" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Khu nhà</p>
              <p className="text-xl font-bold text-foreground">{buildingCode}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 px-4">
            <div className="w-12 h-12 rounded-full bg-cyan-500/10 text-cyan-600 flex items-center justify-center shrink-0">
              <Users size={24} weight="duotone" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Tình trạng phòng</p>
              <div className="mt-1">
                <span className="inline-flex px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold text-[11px]">Hoạt động</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-end">
        <Card className="border-border/50 flex-1">
          <CardContent className="p-4 flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Tìm kiếm thiết bị</label>
              <div className="relative">
                <Input placeholder="Nhập tên hoặc mã thiết bị..." className="pl-9" />
                <MagnifyingGlass size={16} className="absolute left-3 top-2.5 text-muted-foreground" />
              </div>
            </div>
            <div className="w-full md:w-[150px]">
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Tình trạng</label>
              <UISelect>
                <option>Tất cả</option>
                <option>Tốt</option>
                <option>Cần kiểm tra</option>
                <option>Hỏng</option>
              </UISelect>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border/50 bg-muted/30 shrink-0 w-full md:w-[250px]">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Package size={24} weight="duotone" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-0.5">Tổng số thiết bị</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-foreground">{roomAssets.length}</span>
                <span className="text-xs text-muted-foreground">thiết bị</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Table list */}
        <Card className="lg:col-span-3 border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/30 text-muted-foreground border-b border-border/50">
                <tr>
                  <th className="px-6 py-4 font-semibold text-center w-16">STT</th>
                  <th className="px-6 py-4 font-semibold">Mã thiết bị</th>
                  <th className="px-6 py-4 font-semibold">Tên thiết bị</th>
                  <th className="px-6 py-4 font-semibold">Danh mục</th>
                  <th className="px-6 py-4 font-semibold text-center">Năm SD</th>
                  <th className="px-6 py-4 font-semibold text-center">Tình trạng</th>
                  <th className="px-6 py-4 font-semibold">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 text-foreground">
                {roomAssets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-muted-foreground">Không có thiết bị trong phòng</td>
                  </tr>
                ) : roomAssets.map((asset, index) => {
                  const statusColor = 
                    asset.status === 'IN_USE' ? 'bg-emerald-100 text-emerald-700' :
                    asset.status === 'UNDER_MAINTENANCE' ? 'bg-amber-100 text-amber-700' :
                    asset.status === 'DAMAGED' ? 'bg-rose-100 text-rose-700' :
                    'bg-muted text-muted-foreground';
                  const statusLabel = 
                    asset.status === 'IN_USE' ? 'Tốt' :
                    asset.status === 'UNDER_MAINTENANCE' ? 'Đang bảo trì' :
                    asset.status === 'DAMAGED' ? 'Hỏng' :
                    'Sẵn sàng';
                  return (
                    <tr key={asset.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 text-center text-muted-foreground font-medium">{index + 1}</td>
                      <td className="px-6 py-4 font-bold">{asset.assetCode}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">
                            {asset.category?.name === 'Nội thất' || asset.categoryId === 1 ? <Armchair size={16} /> :
                             asset.category?.name === 'Điện' || asset.categoryId === 2 || asset.categoryId === 3 ? <Lightning size={16} /> :
                             <Package size={16} />}
                          </span>
                          <span className="font-semibold">{asset.assetName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{asset.category?.name || '-'}</td>
                      <td className="px-6 py-4 text-center font-bold">{asset.yearInUse || '-'}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-bold text-[11px] ${statusColor}`}>
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{asset.description || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Note side bar */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-border/50">
            <CardHeader className="pb-2 border-b border-border/50">
              <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">CHÚ THÍCH TÌNH TRẠNG</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="flex gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 mt-1 shrink-0"></div>
                <div>
                  <h4 className="font-bold text-foreground text-sm">Tốt</h4>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">Thiết bị hoạt động bình thường</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-600 mt-1 shrink-0"></div>
                <div>
                  <h4 className="font-bold text-foreground text-sm">Đang bảo trì</h4>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">Thiết bị đang được bảo trì/sửa chữa</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-600 mt-1 shrink-0"></div>
                <div>
                  <h4 className="font-bold text-foreground text-sm">Hỏng</h4>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">Thiết bị không hoạt động</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <Info size={20} className="text-primary" weight="fill" />
                <h4 className="font-bold text-primary text-sm uppercase tracking-wider">LƯU Ý</h4>
              </div>
              <p className="text-sm text-foreground font-medium leading-relaxed mb-4">
                Nếu thiết bị có dấu hiệu hỏng hoặc hoạt động không bình thường, vui lòng báo hỏng để được xử lý kịp thời.
              </p>
              <Button onClick={() => navigate('/student/damage-reports')} className="w-full gap-2">
                <Wrench size={16} weight="bold" />
                Báo hỏng ngay
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
