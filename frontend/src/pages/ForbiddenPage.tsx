import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';
import { Button } from '../components/ui/Button';

export function ForbiddenPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const getDashboardPath = () => {
    if (!user) return '/login';
    switch (user.role) {
      case 'ADMIN': return '/admin/dashboard';
      case 'MANAGER': return '/manager/dashboard';
      case 'STUDENT': return '/student/dashboard';
      default: return '/login';
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
      <h1 className="mb-4 text-6xl font-bold text-rose-500">403</h1>
      <h2 className="mb-2 text-2xl font-semibold text-foreground">Bạn không có quyền truy cập</h2>
      <p className="mb-8 max-w-md text-muted-foreground">
        Tài khoản hiện tại không được phép sử dụng chức năng này.
        Hãy quay lại trang trước hoặc trở về bảng điều khiển.
      </p>
      <div className="flex gap-4">
        <Button variant="outline" onClick={() => navigate(-1)}>
          Quay lại trang trước
        </Button>
        <Button asChild>
          <Link to={getDashboardPath()}>
            {user ? 'Về bảng điều khiển' : 'Về trang đăng nhập'}
          </Link>
        </Button>
      </div>
    </div>
  );
}
