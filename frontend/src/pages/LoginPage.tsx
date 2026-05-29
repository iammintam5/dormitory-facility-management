import axios from 'axios';
import { FormEvent, useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';
import { UserRole } from '../types/auth';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isBootstrapping, login, user } = useAuth();
  const [userCode, setUserCode] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fallbackPath = useMemo(() => {
    if (!user) {
      return '/login';
    }

    return getDashboardPath(user.role);
  }, [user]);

  if (!isBootstrapping && isAuthenticated && user) {
    return <Navigate to={fallbackPath} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const loggedInUser = await login({ userCode, password });
      const nextPath =
        (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ??
        getDashboardPath(loggedInUser.role);

      navigate(nextPath, { replace: true });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setErrorMessage(error.response?.data?.message ?? 'Đăng nhập thất bại.');
      } else {
        setErrorMessage('Đăng nhập thất bại.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl shadow-slate-200/70">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-600">
            Dormitory Facility Management
          </p>
          <h1 className="text-3xl font-bold text-slate-900">Đăng nhập hệ thống</h1>
          <p className="text-sm leading-6 text-slate-600">
            Sử dụng mã người dùng và mật khẩu để truy cập khu vực phù hợp với vai trò của bạn.
          </p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Mã người dùng</span>
            <input
              value={userCode}
              onChange={(event) => setUserCode(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-500"
              placeholder="VD: ADMIN001"
              disabled={isSubmitting}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Mật khẩu</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-500"
              placeholder="Nhập mật khẩu"
              disabled={isSubmitting}
            />
          </label>

          {errorMessage && (
            <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !userCode.trim() || !password.trim()}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
          <p className="font-semibold text-slate-900">Tài khoản seed mẫu</p>
          <p className="mt-2">ADMIN: `ADMIN001` / `admin123`</p>
          <p>QL CSVC: `QLCSVC001` / `qlcsvc123`</p>
          <p>STUDENT: `SV001` / `student123`</p>
        </div>
      </section>
    </main>
  );
}

function getDashboardPath(role: UserRole) {
  switch (role) {
    case 'ADMIN':
      return '/admin/dashboard';
    case 'QL_CSVC':
      return '/manager/dashboard';
    case 'STUDENT':
      return '/student/dashboard';
  }
}
