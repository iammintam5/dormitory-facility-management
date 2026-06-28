import { useState, useEffect, useCallback } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { PageTransition } from '../components/ui/PageTransition';
import { useAuth } from '../auth/auth-context';
import { type UserRole } from '../types/auth';
import { getDashboardSummary } from '../services/reports';
import {
  List,
  X,
  SignOut,
  Moon,
  Sun,
  House,
  Buildings,
  Door,
  UsersThree,
  ListBullets,
  Package,
  WarningOctagon,
  Wrench,
  ArrowsLeftRight,
  Handshake,
  User,
  LockKey,
  ShieldCheck,
  Scroll,
  Star,
  GraduationCap,
  ClockCounterClockwise,
} from '@phosphor-icons/react';

type NavItem = {
  path: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
};

type NavGroup = {
  title?: string;
  items: NavItem[];
};

function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      if (stored === 'dark') return true;
      if (stored === 'light') return false;
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggle = useCallback(() => setIsDark((prev) => !prev), []);

  return { isDark, toggle };
}

export function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggle: toggleDark } = useDarkMode();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const [pendingDamageCount, setPendingDamageCount] = useState(0);

  useEffect(() => {
    getDashboardSummary().then(data => {
      if ('pendingDamageReports' in data && typeof data.pendingDamageReports === 'number') {
        setPendingDamageCount(data.pendingDamageReports);
      }
    }).catch(() => {});
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    document.body.style.overflow = isMobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobileOpen]);

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const basePath = getBasePath(user.role);
  const navGroups = getNavGroups(user.role, pendingDamageCount);

  const sidebarContent = (
    <nav className="flex-1 space-y-1 px-3 py-4 text-[13px] font-medium">
      {navGroups.map((group, groupIndex) => (
        <div key={groupIndex} className="mb-4">
          {group.title ? (
            <h4 className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {group.title}
            </h4>
          ) : null}
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={`${basePath}/${item.path}`}
                  end={item.path === 'asset-transactions'}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-150 ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`
                  }
                >
                  <Icon size={18} weight="duotone" className="shrink-0" />
                  <span className="truncate">{item.label}</span>
                  {item.badge ? (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                      {item.badge}
                    </span>
                  ) : null}
                </NavLink>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen w-full flex-col bg-background font-sans text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 flex h-[60px] shrink-0 items-center justify-between border-b border-white/10 bg-[hsl(var(--header-bg))] px-4 text-white shadow-header print:hidden dark:border-border">
        <div className="flex items-center gap-3">
          {/* Mobile hamburger */}
          <button
            onClick={() => setIsMobileOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white sm:hidden"
            aria-label="Mở menu"
          >
            <List size={22} weight="bold" />
          </button>

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm">
              <img src="/Logo_PTIT_University_khong_khung.png" alt="PTIT" className="h-8 w-8 object-contain" />
            </div>
            <div className="hidden flex-col md:flex">
              <span className="max-w-[620px] text-[9px] font-bold uppercase leading-tight tracking-[0.08em] text-[#f0b1b1]">
                HỌC VIỆN CÔNG NGHỆ BƯU CHÍNH VIỄN THÔNG CƠ SỞ TẠI THÀNH PHỐ HỒ CHÍ MINH
              </span>
              <span className="text-xs font-bold uppercase tracking-wide">
                QUẢN LÝ CƠ SỞ VẬT CHẤT KÝ TÚC XÁ
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Dark mode toggle */}
          <button
            onClick={toggleDark}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            aria-label={isDark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
          >
            {isDark ? <Sun size={18} weight="bold" /> : <Moon size={18} weight="bold" />}
          </button>

          {/* User info */}
          <div className="hidden items-center gap-3 sm:flex">
            <div className="flex flex-col items-end text-right">
              <span className="text-xs font-semibold leading-tight">{user.fullName}</span>
              <span className="text-[10px] text-white/60">{getHeaderSubtitle(user.role)}</span>
            </div>
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-white/15 text-xs font-bold text-white backdrop-blur-sm">
              {user.profile?.avatarUrl ? (
                <img src={user.profile.avatarUrl} alt={user.fullName} className="h-full w-full object-cover" />
              ) : (
                user.fullName.charAt(0).toUpperCase()
              )}
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={() => void handleLogout()}
            className="flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-medium text-white/80 transition-all hover:bg-white/10 hover:text-white"
          >
            <SignOut size={16} weight="bold" />
            <span className="hidden sm:inline">Đăng xuất</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="custom-scrollbar hidden w-60 shrink-0 overflow-y-auto border-r border-sidebar-border bg-sidebar-bg sm:flex sm:flex-col print:hidden">
          {sidebarContent}
        </aside>

        {/* Mobile Sidebar Overlay */}
        {isMobileOpen && (
          <div className="fixed inset-0 z-50 sm:hidden">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
              onClick={() => setIsMobileOpen(false)}
            />
            {/* Sidebar panel */}
            <aside className="absolute inset-y-0 left-0 w-72 bg-sidebar-bg shadow-2xl animate-slide-in-right custom-scrollbar overflow-y-auto">
              <div className="flex h-[60px] items-center justify-between border-b border-sidebar-border px-4">
                <div className="flex items-center gap-2">
                  <img src="/Logo_PTIT_University_khong_khung.png" alt="PTIT" className="h-8 w-8 object-contain" />
                  <span className="text-sm font-bold text-foreground">Menu</span>
                </div>
                <button
                  onClick={() => setIsMobileOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X size={18} weight="bold" />
                </button>
              </div>
              {sidebarContent}
            </aside>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-background p-4 md:p-6 lg:p-8">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>
    </div>
  );
}

function getBasePath(role: UserRole) {
  switch (role) {
    case 'ADMIN':
      return '/admin';
    case 'MANAGER':
      return '/manager';
    case 'STUDENT':
      return '/student';
  }
}

function getNavGroups(role: UserRole, pendingDamageCount: number = 0): NavGroup[] {
  if (role === 'ADMIN') {
    return [
      {
        title: 'Tổng quan',
        items: [
          { path: 'dashboard', label: 'Bảng điều khiển', icon: House },
        ],
      },
      {
        title: 'Quản trị hệ thống',
        items: [
          { path: 'users', label: 'Tài khoản người dùng', icon: UsersThree },
          { path: 'audit-logs', label: 'Nhật ký hệ thống', icon: Scroll },
        ],
      },
      {
        title: 'Tài khoản',
        items: [
          { path: 'profile', label: 'Hồ sơ cá nhân', icon: User },
          { path: 'change-password', label: 'Đổi mật khẩu', icon: LockKey },
        ],
      },
    ];
  }

  if (role === 'MANAGER') {
    return [
      {
        title: 'Tổng quan',
        items: [
          { path: 'dashboard', label: 'Bảng điều khiển', icon: House },
        ],
      },
      {
        title: 'Danh mục',
        items: [
          { path: 'locations', label: 'Khu nhà', icon: Buildings },
          { path: 'rooms', label: 'Phòng ở', icon: Door },
          { path: 'room-students', label: 'Sinh viên theo phòng', icon: GraduationCap },
          { path: 'asset-categories', label: 'Danh mục thiết bị', icon: ListBullets },
          { path: 'assets', label: 'Thiết bị', icon: Package },
        ],
      },
      {
        title: 'Nghiệp vụ',
        items: [
          { path: 'damage-reports', label: 'Phiếu báo hỏng', badge: pendingDamageCount, icon: WarningOctagon },
          { path: 'maintenance', label: 'Bảo trì và sửa chữa', icon: Wrench },
          { path: 'asset-transactions', label: 'Nhập/Xuất', icon: ArrowsLeftRight },
          { path: 'asset-transactions/allocation', label: 'Cấp phát - Thu hồi', icon: Handshake },
        ],
      },
      {
        title: 'Tài khoản',
        items: [
          { path: 'profile', label: 'Hồ sơ cá nhân', icon: User },
          { path: 'change-password', label: 'Đổi mật khẩu', icon: LockKey },
        ],
      },
    ];
  }

  return [
    {
      title: 'Tổng quan',
      items: [
        { path: 'dashboard', label: 'Trang chủ', icon: House },
      ],
    },
    {
      title: 'Dịch vụ',
      items: [
        { path: 'room', label: 'Phòng của tôi', icon: Door },
        { path: 'room-assets', label: 'Thiết bị trong phòng', icon: Star },
        { path: 'damage-reports', label: 'Lịch sử báo hỏng', icon: ClockCounterClockwise },
      ],
    },
    {
      title: 'Tài khoản',
      items: [
        { path: 'profile', label: 'Hồ sơ cá nhân', icon: User },
        { path: 'change-password', label: 'Đổi mật khẩu', icon: LockKey },
      ],
    },
  ];
}

function getHeaderSubtitle(role: UserRole) {
  switch (role) {
    case 'ADMIN':
      return 'Quản trị viên';
    case 'MANAGER':
      return 'Quản lý cơ sở vật chất';
    case 'STUDENT':
      return 'Sinh viên';
  }
}
