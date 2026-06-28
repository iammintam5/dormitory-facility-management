import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../components/ui/Table';
import { SkeletonTable } from '../../components/ui/Skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select as UISelect } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { MobileDataCard, DataLabel } from '../../components/ui/MobileDataCard';
import { FilterBar } from '../../components/ui/FilterBar';
import { SearchInput } from '../../components/ui/SearchInput';
import { Pagination } from '../../components/ui/Pagination';
import { useDebounce } from '../../hooks/useDebounce';
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
  const [keyword, setKeyword] = useState('');
  const debouncedKeyword = useDebounce(keyword, 400);
  const [statusFilter, setStatusFilter] = useState('');
  
  const [page, setPage] = useState(1);
  const pageSize = 10;

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

  const filteredAssets = roomAssets.filter(asset => {
    const matchesSearch = !debouncedKeyword || asset.assetName.toLowerCase().includes(debouncedKeyword.toLowerCase()) || asset.assetCode.toLowerCase().includes(debouncedKeyword.toLowerCase());
    const matchesStatus = !statusFilter || asset.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  useEffect(() => {
    setPage(1);
  }, [debouncedKeyword, statusFilter]);

  const totalPages = Math.ceil(filteredAssets.length / pageSize) || 1;
  const paginatedAssets = filteredAssets.slice((page - 1) * pageSize, page * pageSize);

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
          <div className="flex items-center gap-4 px-4 pr-0">
            <div className="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
              <Package size={24} weight="duotone" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Tổng số thiết bị</p>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl font-bold text-foreground">{filteredAssets.length}</span>
                <span className="text-xs text-muted-foreground font-medium">thiết bị</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="mb-6">
        <FilterBar
          searchNode={
            <SearchInput
              value={keyword}
              onChange={setKeyword}
              placeholder="Nhập tên hoặc mã thiết bị..."
              aria-label="Tìm kiếm thiết bị"
            />
          }
          filterNode={
            <UISelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Lọc theo tình trạng">
              <option value="">Tất cả tình trạng</option>
              <option value="IN_USE">Tốt</option>
              <option value="UNDER_MAINTENANCE">Đang bảo trì</option>
              <option value="DAMAGED">Hỏng</option>
            </UISelect>
          }
          appliedFilterCount={statusFilter ? 1 : 0}
          onResetFilters={() => setStatusFilter('')}
          filterChips={
            statusFilter ? [{
              id: 'status',
              label: `Tình trạng: ${statusFilter === 'IN_USE' ? 'Tốt' : statusFilter === 'UNDER_MAINTENANCE' ? 'Đang bảo trì' : 'Hỏng'}`,
              onRemove: () => setStatusFilter('')
            }] : []
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Table list */}
        <div className="lg:col-span-3">
            <Table aria-label="Danh sách thiết bị trong phòng">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 text-center">STT</TableHead>
                  <TableHead>Mã thiết bị</TableHead>
                  <TableHead>Tên thiết bị</TableHead>
                  <TableHead>Danh mục</TableHead>
                  <TableHead className="text-center">Năm SD</TableHead>
                  <TableHead className="text-center">Tình trạng</TableHead>
                  <TableHead>Ghi chú</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedAssets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Không có thiết bị trong phòng</TableCell>
                  </TableRow>
                ) : paginatedAssets.map((asset, index) => {
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
                    <TableRow key={asset.id}>
                      <TableCell className="text-center text-muted-foreground font-medium">{(page - 1) * pageSize + index + 1}</TableCell>
                      <TableCell className="font-bold">{asset.assetCode}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">
                            {asset.category?.name === 'Nội thất' || asset.categoryId === 1 ? <Armchair size={16} /> :
                             asset.category?.name === 'Điện' || asset.categoryId === 2 || asset.categoryId === 3 ? <Lightning size={16} /> :
                             <Package size={16} />}
                          </span>
                          <span className="font-semibold">{asset.assetName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{asset.category?.name || '-'}</TableCell>
                      <TableCell className="text-center font-bold">{asset.yearInUse || '-'}</TableCell>
                      <TableCell className="text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-bold text-[11px] ${statusColor}`}>
                          {statusLabel}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{asset.description || '-'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          <div className="lg:hidden flex flex-col gap-3 p-3">
            {paginatedAssets.map((asset) => {
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
                <MobileDataCard
                  key={asset.id}
                  title={asset.assetCode}
                  subtitle={asset.assetName}
                  statusBadge={
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-bold text-[11px] ${statusColor}`}>
                      {statusLabel}
                    </span>
                  }
                >
                  <DataLabel label="Danh mục" value={asset.category?.name || '-'} />
                  <DataLabel label="Năm SD" value={asset.yearInUse?.toString() || '-'} />
                  <DataLabel label="Ghi chú" value={asset.description || '-'} />
                </MobileDataCard>
              );
            })}
          </div>
          
          {totalPages > 1 && (
            <div className="p-4 border-t border-border/50 bg-card rounded-b-xl">
              <Pagination
                page={page}
                totalPages={totalPages}
                total={filteredAssets.length}
                pageSize={pageSize}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>

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
