import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';
import { Button } from '../components/ui/Button';

export function NotFoundPage() {
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
      <h1 className="mb-4 text-6xl font-bold text-foreground">404</h1>
      <h2 className="mb-2 text-2xl font-semibold text-foreground">Không tìm thấy trang</h2>
      <p className="mb-8 max-w-md text-muted-foreground">
        Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
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
