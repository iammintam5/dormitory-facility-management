import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Skeleton, SkeletonStatCard } from '../components/ui/Skeleton';
import { getApiErrorMessage } from '../lib/api-client';
import { getDashboardSummary, type ManagerDashboardSummary } from '../services/reports';
import { useToast } from '../toast/toast-context';
import { 
  Buildings, 
  Door, 
  Desktop, 
  WarningOctagon,
  Wrench,
  Trash,
  ArrowRight,
  TrendUp,
} from '@phosphor-icons/react';
import { Link } from 'react-router-dom';

export function ManagerDashboardPage() {
  const { showToast } = useToast();
  const [summary, setSummary] = useState<ManagerDashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSummary() {
      try {
        const data = await getDashboardSummary();
        if (data.role === 'MANAGER') {
          setSummary(data);
        }
      } catch (error) {
        showToast(getApiErrorMessage(error, 'Không thể tải dữ liệu dashboard.'), 'error');
      } finally {
        setIsLoading(false);
      }
    }

    void loadSummary();
  }, [showToast]);

  const stats = [
    { label: 'Tổng khu nhà', value: summary?.totalBuildings ?? 0, unit: 'khu', icon: Buildings, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10' },
    { label: 'Tổng số phòng', value: summary?.totalRooms ?? 0, unit: 'phòng', icon: Door, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
    { label: 'Tổng số thiết bị', value: summary?.totalAssets ?? 0, unit: 'thiết bị', icon: Desktop, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-500/10' },
    { label: 'Thiết bị hư hỏng', value: summary?.damagedAssets ?? 0, unit: 'thiết bị', icon: WarningOctagon, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-500/10' },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Bảng điều khiển vận hành
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tổng quan dữ liệu và hoạt động cơ sở vật chất.
          </p>
        </div>

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
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <TrendUp size={14} weight="bold" />
                Trực tiếp
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-3">
              <MetricBox
                label="Đang bảo trì"
                value={summary?.maintenanceProcessing ?? 0}
                icon={Wrench}
                color="text-amber-600 dark:text-amber-400"
                bg="bg-amber-50 dark:bg-amber-500/10"
                isLoading={isLoading}
              />
              <MetricBox
                label="Chờ thanh lý"
                value={summary?.liquidationPending ?? 0}
                icon={Trash}
                color="text-rose-600 dark:text-rose-400"
                bg="bg-rose-50 dark:bg-rose-500/10"
                isLoading={isLoading}
              />
              <MetricBox
                label="Thiết bị hư hỏng"
                value={summary?.damagedAssets ?? 0}
                icon={WarningOctagon}
                color="text-blue-600 dark:text-blue-400"
                bg="bg-blue-50 dark:bg-blue-500/10"
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
              <QuickAction to="/manager/damage-reports" label="Xử lý báo hỏng" icon={WarningOctagon} />
              <QuickAction to="/manager/maintenance" label="Bảo trì thiết bị" icon={Wrench} />
              <QuickAction to="/manager/inventory-checks" label="Kiểm kê thiết bị" icon={Desktop} />
              <QuickAction to="/manager/liquidations" label="Thanh lý thiết bị" icon={Trash} />
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
