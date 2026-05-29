import { Button } from '../ui/Button';

type PaginationBarProps = {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
};

export function PaginationBar({
  page,
  totalPages,
  total,
  onPageChange,
}: PaginationBarProps) {
  if (total === 0) return null;

  return (
    <div className="flex flex-col gap-4 border-t border-slate-200 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">Tổng bản ghi: <span className="font-medium text-foreground">{total}</span></p>
      <div className="flex items-center gap-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          Trước
        </Button>
        <span className="text-sm font-medium text-slate-700">
          Trang {page} / {totalPages || 1}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          Sau
        </Button>
      </div>
    </div>
  );
}
