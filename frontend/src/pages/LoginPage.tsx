import { FormEvent, useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';
import { UserRole } from '../types/auth';
import { useToast } from '../toast/toast-context';

import { Eye, EyeSlash, Buildings, ArrowRight } from '@phosphor-icons/react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isBootstrapping, login, user } = useAuth();
  const { showToast } = useToast();

  const [userCode, setUserCode] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const fallbackPath = useMemo(() => {
    if (!user) return '/login';
    return getDashboardPath(user.role);
  }, [user]);

  if (!isBootstrapping && isAuthenticated && user) {
    return <Navigate to={fallbackPath} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const loggedInUser = await login({ userCode, password });
      const nextPath =
        (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ??
        getDashboardPath(loggedInUser.role);

      showToast('Đăng nhập thành công.', 'success');
      navigate(nextPath, { replace: true });
    } catch {
      showToast('Đăng nhập thất bại. Vui lòng kiểm tra lại.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-[100dvh] w-full flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-[1080px] bg-card rounded-2xl shadow-2xl flex flex-col lg:flex-row overflow-hidden border border-border/40 animate-fade-in">
        {/* Left Panel */}
        <section className="hidden lg:flex w-[52%] relative flex-col justify-between p-10 text-white bg-primary">
          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.12),transparent_40%),radial-gradient(circle_at_80%_90%,rgba(255,255,255,0.08),transparent_35%)]" />
          
          <div className="relative z-10 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-8">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm">
                  <Buildings size={20} weight="duotone" />
                </div>
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">
                  Ký túc xá sinh viên
                </span>
              </div>

              <h1 className="text-3xl font-bold leading-tight text-white">
                Hệ thống quản lý
                <br />
                cơ sở vật chất
              </h1>
              <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/70">
                Quản lý tài sản, phòng ở, sinh viên, báo hỏng và bảo trì một cách thông minh và hiệu quả.
              </p>
            </div>

            <div className="space-y-3">
              {[
                'Theo dõi báo hỏng, bàn giao, kiểm kê và bảo trì.',
                'Dữ liệu mẫu cho cả Admin, Quản lý và Sinh viên.',
                'Giao diện hiện đại, tối ưu cho mọi thiết bị.',
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/5 p-3.5 backdrop-blur-sm">
                  <ArrowRight size={14} weight="bold" className="mt-0.5 shrink-0 text-white/50" />
                  <p className="text-[13px] leading-relaxed text-white/80">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Right Panel - Form */}
        <section className="relative w-full bg-card p-8 md:p-12 flex flex-col justify-center lg:w-[48%]">
          <div className="w-full max-w-[380px] mx-auto">
            <div className="text-center mb-8">
              <div className="w-14 h-14 mx-auto bg-primary/8 text-primary rounded-xl flex items-center justify-center mb-5">
                <Buildings size={28} weight="duotone" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-1.5">Đăng nhập hệ thống</h2>
              <p className="text-muted-foreground text-sm">Vui lòng đăng nhập để tiếp tục.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Mã người dùng</label>
                <Input
                  value={userCode}
                  onChange={(event) => setUserCode(event.target.value)}
                  placeholder="Nhập mã người dùng"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Mật khẩu</label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Nhập mật khẩu"
                    disabled={isSubmitting}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeSlash size={18} weight="regular" />
                    ) : (
                      <Eye size={18} weight="regular" />
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-1">
                <Button
                  type="submit"
                  disabled={isSubmitting || !userCode.trim() || !password.trim()}
                  className="w-full h-11 text-sm font-semibold shadow-md"
                >
                  {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
                </Button>
              </div>
            </form>

            <div className="mt-8 rounded-xl border border-border/50 bg-muted/30 p-4">
              <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Tài khoản dùng thử
              </p>
              <div className="space-y-2 text-sm">
                {[
                  { role: 'Admin', creds: 'admin / admin' },
                  { role: 'Quản lý', creds: 'manager / manager' },
                  { role: 'Sinh viên', creds: 'student / student' },
                ].map(({ role, creds }) => (
                  <div key={role} className="flex justify-between items-center bg-background rounded-lg px-3 py-2 border border-border/40">
                    <span className="font-medium text-foreground text-[13px]">{role}</span>
                    <code className="bg-muted px-2 py-0.5 rounded text-[11px] font-mono text-muted-foreground">{creds}</code>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function getDashboardPath(role: UserRole) {
  switch (role) {
    case 'ADMIN':
      return '/admin/dashboard';
    case 'MANAGER':
      return '/manager/dashboard';
    case 'STUDENT':
      return '/student/dashboard';
  }
}
