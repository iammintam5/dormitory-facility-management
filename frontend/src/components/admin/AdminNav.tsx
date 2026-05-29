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
          { to: '/admin/users', label: 'Người dung' },
          { to: '/admin/locations', label: 'Khu / Tầng / Phòng' },
          { to: '/admin/asset-categories', label: 'Loại tài sản' },
          { to: '/admin/assets', label: 'Tài sản' },
          { to: '/admin/maintenance', label: 'Bảo trì' },
          { to: '/admin/liquidation-records', label: 'Thanh lý' },
          { to: '/admin/inventory-checks', label: 'Kiểm kê' },
          { to: '/admin/damage-reports', label: 'Báo hỏng' },
          { to: '/admin/handovers', label: 'Bàn giao' },
          { to: '/admin/audit-logs', label: 'Audit log' },
        ]
      : role === 'QL_CSVC'
        ? [
            { to: '/manager/dashboard', label: 'Dashboard' },
            { to: '/manager/locations', label: 'Khu / Tầng / Phòng' },
            { to: '/manager/asset-categories', label: 'Loại tài sản' },
            { to: '/manager/assets', label: 'Tài sản' },
            { to: '/manager/maintenance', label: 'Bảo trì' },
            { to: '/manager/liquidation-records', label: 'Thanh lý' },
            { to: '/manager/inventory-checks', label: 'Kiểm kê' },
            { to: '/manager/damage-reports', label: 'Báo hỏng' },
            { to: '/manager/handovers', label: 'Bàn giao' },
          ]
        : [
            { to: '/student/dashboard', label: 'Dashboard' },
            { to: '/student/damage-reports', label: 'Lịch sử báo hỏng' },
            { to: '/student/damage-reports/new', label: 'Tạo phiếu mới' },
            { to: '/student/handovers', label: 'Bàn giao cho xác nhận' },
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
