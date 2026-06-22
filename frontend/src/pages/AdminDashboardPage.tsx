import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getApiErrorMessage } from '../lib/api-client';
import { getDashboardSummary, type AdminDashboardSummary } from '../services/reports';
import { useToast } from '../toast/toast-context';
import { 
  Users, 
  GraduationCap, 
  UserGear, 
  Wrench, 
  Desktop,
  ArrowRight,
  TrendUp,
  Checks,
  WarningCircle,
  ClipboardText,
  Lock,
  UserCircle,
} from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Skeleton, SkeletonStatCard } from '../components/ui/Skeleton';

const recentActions = [
  { label: 'Đồng bộ người dùng và phân quyền', icon: Users, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10' },
  { label: 'Theo dõi kiểm kê, thanh lý và bảo trì', icon: Checks, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
  { label: 'Rà soát báo hỏng phát sinh gần đây', icon: WarningCircle, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10' },
] as const;

export function AdminDashboardPage() {
  const { showToast } = useToast();
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSummary() {
      try {
        const data = await getDashboardSummary();
        if (data.role === 'ADMIN') {
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
    { label: 'Tổng người dùng', value: summary?.totalUsers ?? 0, icon: Users, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10' },
    { label: 'Tổng sinh viên', value: summary?.totalStudents ?? 0, icon: GraduationCap, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
    { label: 'Tổng quản lý', value: summary?.totalManagers ?? 0, icon: UserGear, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-500/10' },
    { label: 'Tổng báo hỏng', value: summary?.totalDamageReports ?? 0, icon: Wrench, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10' },
    { label: 'Tổng thiết bị', value: summary?.totalAssets ?? 0, icon: Desktop, color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-50 dark:bg-cyan-500/10' },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Bảng điều khiển quản trị
          </h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/admin/dashboard" className="transition-colors hover:text-primary">
              Trang chủ
            </Link>
            <span className="text-muted-foreground/40">/</span>
            <span className="text-foreground font-medium">Bảng điều khiển</span>
          </div>
        </div>

        {/* Stats Row */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonStatCard key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {stats.map(({ label, value, icon: Icon, color, bg }) => (
              <Card key={label} className="group relative overflow-hidden">
                <CardContent className="p-5 pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bg}`}>
                      <Icon size={20} weight="duotone" className={color} />
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-muted-foreground">{label}</p>
                      <h3 className="mt-1.5 text-2xl font-bold tabular-nums text-foreground">
                        {value.toLocaleString('vi-VN')}
                      </h3>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 items-start">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border/50 px-6 py-4">
              <CardTitle className="text-base font-semibold text-foreground">
                Tổng quan hệ thống
              </CardTitle>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <TrendUp size={14} weight="bold" />
                {isLoading ? 'Đang tải...' : 'Trực tiếp'}
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
              <HighlightCard
                label="Người dùng đang vận hành"
                value={summary?.totalUsers ?? 0}
                caption="Bao gồm quản trị, quản lý và sinh viên"
                isLoading={isLoading}
              />
              <HighlightCard
                label="Thiết bị đang theo dõi"
                value={summary?.totalAssets ?? 0}
                caption="Tổng tài sản hiện có trong hệ thống"
                isLoading={isLoading}
              />
              <HighlightCard
                label="Sinh viên nội trú"
                value={summary?.totalStudents ?? 0}
                caption="Nguồn dữ liệu lấy từ bảng users"
                isLoading={isLoading}
              />
              <HighlightCard
                label="Phiếu báo hỏng"
                value={summary?.totalDamageReports ?? 0}
                caption="Số lượng yêu cầu báo hỏng đã ghi nhận"
                isLoading={isLoading}
              />
            </CardContent>
          </Card>

          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader className="border-b border-border/50 px-6 py-4">
                <CardTitle className="text-base font-semibold text-foreground">
                  Thao tác nhanh
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-4 pt-5">
                <QuickAction to="/admin/users" label="Quản lý người dùng" icon={Users} />
                <QuickAction to="/admin/audit-logs" label="Nhật ký hệ thống" icon={ClipboardText} />
                <QuickAction to="/admin/profile" label="Thông tin cá nhân" icon={UserCircle} />
                <QuickAction to="/admin/change-password" label="Đổi mật khẩu" icon={Lock} />
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader className="border-b border-border/50 px-6 py-4">
                <CardTitle className="text-base font-semibold text-foreground">
                  Hoạt động gần đây
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-5">
                  {recentActions.map((item) => (
                    <div key={item.label} className="flex items-start gap-3">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${item.bg}`}>
                        <item.icon size={16} weight="bold" className={item.color} />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium leading-snug text-foreground">{item.label}</p>
                        <p className="text-xs text-muted-foreground">
                          Hệ thống tự động đồng bộ.
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <Link
                  to="/admin/audit-logs"
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-muted/50 px-4 py-2.5 text-sm font-medium text-foreground transition-colors duration-150 hover:bg-muted"
                >
                  Xem tất cả nhật ký
                  <ArrowRight size={14} />
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function HighlightCard({
  label,
  value,
  caption,
  isLoading,
}: {
  label: string;
  value: number;
  caption: string;
  isLoading: boolean;
}) {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-border/50 bg-muted/20 p-5 transition-colors duration-150 hover:bg-muted/40">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      {isLoading ? (
        <Skeleton className="mt-3 h-8 w-20" />
      ) : (
        <div className="mt-3 text-3xl font-bold tabular-nums tracking-tight text-foreground">
          {value.toLocaleString('vi-VN')}
        </div>
      )}
      <p className="mt-3 text-xs text-muted-foreground/70">{caption}</p>
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
