import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';
import { UserRole } from '../types/auth';

type RoleRouteProps = {
  allowedRoles: UserRole[];
};

export function RoleRoute({ allowedRoles }: RoleRouteProps) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  return <Outlet />;
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
