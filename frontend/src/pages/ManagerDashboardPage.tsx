import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Skeleton, SkeletonStatCard } from '../components/ui/Skeleton';
import { getApiErrorMessage } from '../lib/api-client';
import { getDashboardSummary, type ManagerDashboardSummary } from '../services/reports';
import { useToast } from '../toast/toast-context';
import { PageError, NetworkError, ForbiddenState } from '../components/ui/ErrorStates';
import axios from 'axios';
import { 
  Buildings, 
  Door, 
  Desktop, 
  WarningOctagon,
  Wrench,
  Trash,
  ArrowRight,
  TrendUp,
  ClockCounterClockwise,
} from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader';

export function ManagerDashboardPage() {
  const { showToast } = useToast();
  const [summary, setSummary] = useState<ManagerDashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorState, setErrorState] = useState<{ type: 'network' | 'forbidden' | 'server' | null; message: string }>({ type: null, message: '' });

  useEffect(() => {
    async function loadSummary() {
      try {
        const data = await getDashboardSummary();
        if (data.role === 'MANAGER') {
          setSummary(data);
        }
      } catch (error) {
        if (axios.isAxiosError(error) && !error.response) {
          setErrorState({ type: 'network', message: 'Không thể kết nối đến máy chủ.' });
        } else if (axios.isAxiosError(error) && error.response?.status === 403) {
          setErrorState({ type: 'forbidden', message: 'Bạn không có quyền xem thông tin này.' });
        } else {
          setErrorState({ type: 'server', message: getApiErrorMessage(error, 'Không thể tải dữ liệu dashboard.') });
        }
      } finally {
        setIsLoading(false);
      }
    }

    const load = () => {
      setIsLoading(true);
      setErrorState({ type: null, message: '' });
      void loadSummary();
    };

    load();
  }, [showToast]);

  const stats = [
    { label: 'Tổng khu nhà', value: summary?.totalBuildings ?? 0, unit: 'khu', icon: Buildings, color: 'text-info', bg: 'bg-info-muted' },
    { label: 'Tổng số phòng', value: summary?.totalRooms ?? 0, unit: 'phòng', icon: Door, color: 'text-success', bg: 'bg-success-muted' },
    { label: 'Tổng số thiết bị', value: summary?.totalAssets ?? 0, unit: 'thiết bị', icon: Desktop, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Thiết bị hư hỏng', value: summary?.damagedAssets ?? 0, unit: 'thiết bị', icon: WarningOctagon, color: 'text-destructive', bg: 'bg-destructive-muted' },
  ] as const;

  if (errorState.type === 'network') {
    return <NetworkError onRetry={() => window.location.reload()} />;
  }

  if (errorState.type === 'forbidden') {
    return <ForbiddenState description={errorState.message} />;
  }

  if (errorState.type === 'server') {
    return <PageError description={errorState.message} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader 
          title="Bảng điều khiển vận hành"
          description="Tổng quan dữ liệu và hoạt động cơ sở vật chất."
          breadcrumbs={[
            { label: 'Trang chủ', href: '/manager/dashboard' },
            { label: 'Bảng điều khiển' }
          ]}
        />

        {/* Stats Row */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonStatCard key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map(({ label, value, unit, icon: Icon, color, bg }) => (
              <Card key={label} className="group relative overflow-hidden">
                <CardContent className="p-5 pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${bg}`}>
                      <Icon size={22} weight="duotone" className={color} />
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-muted-foreground">{label}</p>
                      <div className="mt-1.5 flex items-baseline justify-end gap-1.5">
                        <span className="text-2xl font-bold tabular-nums text-foreground">
                          {value.toLocaleString('vi-VN')}
                        </span>
                        <span className="text-[11px] font-medium text-muted-foreground">{unit}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 items-start">
          {/* Operating Status */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border/50 px-6 py-4">
              <CardTitle className="text-base font-semibold text-foreground">
                Tình hình vận hành
              </CardTitle>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-success">
                <TrendUp size={14} weight="bold" />
                Trực tiếp
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-3">
              <MetricBox
                label="Đang bảo trì"
                value={summary?.maintenanceProcessing ?? 0}
                icon={Wrench}
                color="text-warning"
                bg="bg-warning-muted"
                isLoading={isLoading}
              />
              <MetricBox
                label="Chờ thanh lý"
                value={summary?.liquidationPending ?? 0}
                icon={Trash}
                color="text-destructive"
                bg="bg-destructive-muted"
                isLoading={isLoading}
              />
              <MetricBox
                label="Thiết bị hư hỏng"
                value={summary?.damagedAssets ?? 0}
                icon={WarningOctagon}
                color="text-info"
                bg="bg-info-muted"
                isLoading={isLoading}
              />
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="border-b border-border/50 px-6 py-4">
              <CardTitle className="text-base font-semibold text-foreground">
                Thao tác nhanh
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-4 pt-5">
              <QuickAction to="/manager/damage-reports" label="Phiếu báo hỏng" icon={Wrench} />
              <QuickAction to="/manager/maintenance" label="Lịch bảo trì" icon={ClockCounterClockwise} />
              <QuickAction to="/manager/asset-transactions/export" label="Thanh lý / Xuất" icon={Trash} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MetricBox({ 
  label, 
  value, 
  icon: Icon, 
  color, 
  bg,
  isLoading,
}: { 
  label: string; 
  value: number; 
  icon: React.ElementType; 
  color: string;
  bg: string;
  isLoading: boolean;
}) {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-border/50 bg-muted/20 p-5 transition-colors duration-150 hover:bg-muted/40">
      <div className="flex items-center gap-2.5">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${bg}`}>
          <Icon size={16} className={color} weight="duotone" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
      </div>
      {isLoading ? (
        <Skeleton className="mt-4 h-8 w-16" />
      ) : (
        <div className={`mt-4 text-3xl font-bold tabular-nums tracking-tight ${color}`}>
          {value.toLocaleString('vi-VN')}
        </div>
      )}
    </div>
  );
}

function QuickAction({ to, label, icon: Icon }: { to: string; label: string; icon: React.ElementType }) {
  return (
    <Link
      to={to}
      className="group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors duration-150 hover:bg-muted"
    >
      <div className="flex items-center gap-3">
        <Icon size={18} weight="duotone" className="text-muted-foreground group-hover:text-primary" />
        <span>{label}</span>
      </div>
      <ArrowRight size={14} className="text-muted-foreground/50 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  );
}
