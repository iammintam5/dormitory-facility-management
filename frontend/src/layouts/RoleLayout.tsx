import { Outlet } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';
import { AdminNav } from '../components/admin/AdminNav';
import { NotificationBell } from '../components/notifications/NotificationBell';

type RoleLayoutProps = {
  title: string;
  subtitle: string;
};

export function RoleLayout({ title, subtitle }: RoleLayoutProps) {
  const { logout, user } = useAuth();
  const basePath =
    user?.role === 'ADMIN' ? '/admin' : user?.role === 'QL_CSVC' ? '/manager' : '/student';

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <section className="mx-auto max-w-5xl rounded-3xl bg-white p-6 shadow-xl shadow-slate-200/70">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-600">
              Dormitory Facility Management
            </p>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
              <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
            </div>
          </div>

          <div className="flex flex-col items-stretch gap-3 sm:items-end">
            <NotificationBell basePath={basePath} />
            <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">{user?.fullName}</p>
              <p>{user?.userCode}</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                {user?.role}
              </p>
              <button
                type="button"
                onClick={logout}
                className="mt-3 rounded-lg bg-slate-900 px-3 py-2 text-white transition hover:bg-slate-700"
              >
                Dang xuat
              </button>
            </div>
          </div>
        </header>

        <div className="mt-6">
          {user && <AdminNav role={user.role} />}
          <Outlet />
        </div>
      </section>
    </main>
  );
}
