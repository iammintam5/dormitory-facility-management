import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';
import { getApiErrorMessage } from '../lib/api-client';
import { getDashboardSummary, type StudentDashboardSummary } from '../services/reports';
import { useToast } from '../toast/toast-context';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { 
  Door, 
  Desktop, 
  WarningOctagon, 
  Database,
  Info,
  UserCircle,
  ClockCounterClockwise,
  ArrowRight,
  HandWaving,
  PlusCircle,
} from '@phosphor-icons/react';

export function StudentDashboardPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [summary, setSummary] = useState<StudentDashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSummary() {
      try {
        const data = await getDashboardSummary();
        if (data.role === 'STUDENT') {
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

  const roomCode = summary?.currentRoom?.roomCode ?? '--';
  const buildingName = summary?.currentRoom?.buildingName ?? '--';
  const floorLabel = summary?.currentRoom?.floorNumber ? `Tầng ${summary.currentRoom.floorNumber}` : '--';

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Trang chủ Sinh viên
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Hero Section */}
          <Card className="lg:col-span-5 bg-primary text-primary-foreground border-none shadow-lg relative overflow-hidden">
            <CardContent className="p-6 relative z-10">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <HandWaving size={24} weight="duotone" className="text-primary-foreground/80" />
                  <h2 className="text-xl font-bold tracking-tight">
                    Xin chào, {user?.fullName || 'Sinh viên'}!
                  </h2>
                </div>
                <div className="space-y-3 text-sm font-medium">
                  <InfoLine label="Mã sinh viên" value={user?.studentCode ?? user?.userCode ?? '--'} isLoading={false} />
                  <InfoLine label="Phòng hiện tại" value={roomCode} isLoading={isLoading} />
                  <InfoLine label="Khu nhà" value={buildingName} isLoading={isLoading} />
                  <InfoLine label="Tầng" value={floorLabel} isLoading={isLoading} />
                </div>
              </div>
            </CardContent>
            {/* Decorative background elements */}
            <div className="absolute -bottom-20 -right-20 w-56 h-56 bg-white/8 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -top-16 -left-16 w-40 h-40 bg-white/5 rounded-full blur-2xl pointer-events-none" />
          </Card>

          {/* Stats Section */}
          <div className="lg:col-span-7 grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Phòng hiện tại" value={roomCode} caption={buildingName} icon={Door} color="text-blue-600 dark:text-blue-400" bg="bg-blue-50 dark:bg-blue-500/10" isLoading={isLoading} />
            <StatCard
              label="Thiết bị trong phòng"
              value={isLoading ? '--' : String(summary?.assetCount ?? 0)}
              caption="thiết bị"
              icon={Desktop}
              color="text-violet-600 dark:text-violet-400"
              bg="bg-violet-50 dark:bg-violet-500/10"
              isLoading={isLoading}
            />
            <StatCard
              label="Báo hỏng đang xử lý"
              value={isLoading ? '--' : String(summary?.damageReportProcessing ?? 0)}
              caption="phiếu"
              icon={WarningOctagon}
              color="text-amber-600 dark:text-amber-400"
              bg="bg-amber-50 dark:bg-amber-500/10"
              isLoading={isLoading}
            />
            <StatCard label="Trạng thái phòng" value={isLoading ? '...' : roomCode} caption={isLoading ? '' : floorLabel} icon={Database} color="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-50 dark:bg-emerald-500/10" isLoading={isLoading} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <Card className="lg:col-span-2">
            <CardHeader className="border-b border-border/50 px-6 py-4">
              <CardTitle className="text-base font-semibold text-foreground">
                Tóm tắt nội trú
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-6">
              <SummaryBox label="Phòng hiện tại" value={roomCode} isLoading={isLoading} />
              <SummaryBox label="Khu nhà" value={buildingName} isLoading={isLoading} />
              <SummaryBox label="Tầng" value={floorLabel} isLoading={isLoading} />
              <SummaryBox
                label="Phiếu báo hỏng đang xử lý"
                value={isLoading ? '--' : String(summary?.damageReportProcessing ?? 0)}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-border/50 px-6 py-4">
              <CardTitle className="text-base font-semibold text-foreground">
                Thao tác nhanh
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-4 pt-5">
              <QuickLink to="/student/damage-reports" label="Gửi báo hỏng" icon={PlusCircle} />
              <QuickLink to="/student/damage-reports" label="Lịch sử báo hỏng" icon={ClockCounterClockwise} />
              <QuickLink to="/student/room-assets" label="Thiết bị phòng" icon={Desktop} />
              <QuickLink to="/student/room" label="Thông tin phòng" icon={Info} />
              <QuickLink to="/student/profile" label="Hồ sơ cá nhân" icon={UserCircle} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoLine({ label, value, isLoading }: { label: string; value: string; isLoading: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-white/10 pb-2.5 last:border-0 last:pb-0">
      <span className="opacity-70 text-[13px]">{label}</span>
      {isLoading ? (
        <Skeleton className="h-4 w-16 bg-white/20" />
      ) : (
        <span className="font-semibold text-[13px]">{value}</span>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  caption,
  icon: Icon,
  color,
  bg,
  isLoading,
}: {
  label: string;
  value: string;
  caption: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  isLoading: boolean;
}) {
  return (
    <Card className="flex flex-col items-center justify-center px-5 pt-6 pb-5 text-center">
      <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${bg}`}>
        <Icon size={22} weight="duotone" className={color} />
      </div>
      <p className="mb-1 text-[11px] font-medium text-muted-foreground">{label}</p>
      {isLoading ? (
        <Skeleton className="h-7 w-10 mx-auto" />
      ) : (
        <p className="text-xl font-bold tabular-nums text-foreground">{value}</p>
      )}
      <p className="mt-1 text-[10px] text-muted-foreground/70">{caption}</p>
    </Card>
  );
}

function SummaryBox({ label, value, isLoading }: { label: string; value: string; isLoading: boolean }) {
  return (
    <div className="rounded-xl border border-border/50 bg-muted/20 p-4 transition-colors duration-150 hover:bg-muted/40">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {isLoading ? (
        <Skeleton className="mt-2 h-6 w-16" />
      ) : (
        <p className="mt-2 text-lg font-bold tabular-nums text-foreground">{value}</p>
      )}
    </div>
  );
}

function QuickLink({
  to,
  label,
  icon: Icon,
}: {
  to: string;
  label: string;
  icon: React.ElementType;
}) {
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
