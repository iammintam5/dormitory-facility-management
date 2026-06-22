import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { Button } from './Button';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  /** Optional custom label override. Defaults to "Hiển thị X đến Y của Z kết quả" */
  label?: string;
}

export function Pagination({ page, totalPages, total, pageSize, onPageChange, label }: PaginationProps) {
  const from = total > 0 ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(page * pageSize, total);
  const displayLabel = label ?? `Hiển thị ${from} đến ${to} của ${total} kết quả`;

  return (
    <div className="flex items-center justify-between border-t border-border/50 bg-muted/30 px-6 py-4">
      <div className="text-sm text-muted-foreground">{displayLabel}</div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="gap-1"
        >
          <CaretLeft size={16} />
          Trước
        </Button>
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground shadow">
          {page}
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="gap-1"
        >
          Sau
          <CaretRight size={16} />
        </Button>
      </div>
    </div>
  );
}
