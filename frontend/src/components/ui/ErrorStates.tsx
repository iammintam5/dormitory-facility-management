import { WarningCircle, WifiHigh, Prohibit, MagnifyingGlass, ArrowsClockwise, ArrowLeft } from '@phosphor-icons/react';
import { Button } from './Button';
import { useNavigate } from 'react-router-dom';

export function PageError({ title = "Không thể tải trang", description = "Đã xảy ra lỗi trong quá trình tải dữ liệu. Vui lòng thử lại.", onRetry, onBack }: { title?: string, description?: string, onRetry?: () => void, onBack?: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center bg-background rounded-lg border border-border">
      <WarningCircle className="h-16 w-16 text-destructive mb-4" weight="duotone" />
      <h3 className="text-2xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-md">{description}</p>
      <div className="flex gap-4">
        {onBack ? (
          <Button variant="outline" onClick={onBack} className="gap-2">
            <ArrowLeft weight="bold" /> Quay lại
          </Button>
        ) : (
          <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft weight="bold" /> Quay lại
          </Button>
        )}
        {onRetry && (
          <Button onClick={onRetry} className="gap-2">
            <ArrowsClockwise weight="bold" /> Thử lại
          </Button>
        )}
      </div>
    </div>
  );
}

export function SectionError({ title = "Không thể tải dữ liệu", onRetry }: { title?: string, onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center border border-dashed border-border rounded-lg bg-muted/30">
      <WarningCircle className="h-8 w-8 text-destructive/80 mb-2" weight="duotone" />
      <p className="text-sm font-medium text-foreground mb-4">{title}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
          <ArrowsClockwise weight="bold" /> Thử lại
        </Button>
      )}
    </div>
  );
}

export function NetworkError({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center p-6 text-center">
      <WifiHigh className="h-16 w-16 text-muted-foreground/50 mb-4" weight="duotone" />
      <h3 className="text-xl font-semibold text-foreground mb-2">Không thể kết nối đến hệ thống</h3>
      <p className="text-muted-foreground mb-6 max-w-md">Vui lòng kiểm tra kết nối mạng của bạn hoặc thử lại sau.</p>
      {onRetry && (
        <Button onClick={onRetry} className="gap-2">
          <ArrowsClockwise weight="bold" /> Thử lại
        </Button>
      )}
    </div>
  );
}

export function ForbiddenState({ description = "Tài khoản của bạn không được phép xem thông tin này." }: { description?: string }) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center p-6 text-center">
      <Prohibit className="h-16 w-16 text-destructive/80 mb-4" weight="duotone" />
      <h3 className="text-xl font-semibold text-foreground mb-2">Bạn không có quyền truy cập</h3>
      <p className="text-muted-foreground max-w-md">{description}</p>
    </div>
  );
}

export function NotFoundState({ title = "Không tìm thấy dữ liệu", description = "Dữ liệu bạn yêu cầu không tồn tại hoặc đã bị xóa." }: { title?: string, description?: string }) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center p-6 text-center">
      <MagnifyingGlass className="h-16 w-16 text-muted-foreground/50 mb-4" weight="duotone" />
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-md">{description}</p>
    </div>
  );
}
