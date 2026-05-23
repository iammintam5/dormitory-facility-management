import { NavLink } from 'react-router-dom';
import { UserRole } from '../../types/auth';

type AdminNavProps = {
  role: UserRole;
};

export function AdminNav({ role }: AdminNavProps) {
  const links =
    role === 'ADMIN'
      ? [
          { to: '/admin/dashboard', label: 'Dashboard' },
          { to: '/admin/users', label: 'Nguoi dung' },
          { to: '/admin/locations', label: 'Khu / Tang / Phong' },
          { to: '/admin/asset-categories', label: 'Loai tai san' },
          { to: '/admin/assets', label: 'Tai san' },
          { to: '/admin/maintenance', label: 'Bao tri' },
          { to: '/admin/liquidation-records', label: 'Thanh ly' },
          { to: '/admin/inventory-checks', label: 'Kiem ke' },
          { to: '/admin/damage-reports', label: 'Bao hong' },
          { to: '/admin/handovers', label: 'Ban giao' },
          { to: '/admin/audit-logs', label: 'Audit log' },
        ]
      : role === 'QL_CSVC'
        ? [
            { to: '/manager/dashboard', label: 'Dashboard' },
            { to: '/manager/locations', label: 'Khu / Tang / Phong' },
            { to: '/manager/asset-categories', label: 'Loai tai san' },
            { to: '/manager/assets', label: 'Tai san' },
            { to: '/manager/maintenance', label: 'Bao tri' },
            { to: '/manager/liquidation-records', label: 'Thanh ly' },
            { to: '/manager/inventory-checks', label: 'Kiem ke' },
            { to: '/manager/damage-reports', label: 'Bao hong' },
            { to: '/manager/handovers', label: 'Ban giao' },
          ]
        : [
            { to: '/student/dashboard', label: 'Dashboard' },
            { to: '/student/damage-reports', label: 'Lich su bao hong' },
            { to: '/student/damage-reports/new', label: 'Tao phieu moi' },
            { to: '/student/handovers', label: 'Ban giao cho xac nhan' },
          ];

  return (
    <nav className="mb-6 flex flex-wrap gap-2">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          className={({ isActive }) =>
            `rounded-full px-4 py-2 text-sm font-medium transition ${
              isActive
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`
          }
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}
