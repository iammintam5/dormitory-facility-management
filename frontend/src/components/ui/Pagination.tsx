import { CaretLeft, CaretRight, DotsThree } from '@phosphor-icons/react';
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
  if (total === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const displayLabel = label ?? `Hiển thị ${from} đến ${to} của ${total} kết quả`;

  // Generate page numbers
  const getPages = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (page <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (page >= totalPages - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = page - 1; i <= page + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/50 bg-muted/10 px-4 py-3 sm:px-6 sm:py-4">
      <div className="text-xs sm:text-sm text-muted-foreground font-medium">{displayLabel}</div>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="h-8 px-2 sm:px-3 text-xs sm:text-sm shadow-sm"
          title="Trang trước"
        >
          <CaretLeft size={16} weight="bold" />
          <span className="hidden sm:inline ml-1">Trước</span>
        </Button>
        
        <div className="flex items-center gap-1">
          {getPages().map((p, index) => {
            if (p === '...') {
              return (
                <div key={`dots-${index}`} className="flex h-8 w-6 items-center justify-center text-muted-foreground">
                  <DotsThree size={16} weight="bold" />
                </div>
              );
            }
            const isCurrent = p === page;
            return (
              <Button
                key={`page-${p}`}
                variant={isCurrent ? 'default' : 'outline'}
                size="sm"
                onClick={() => onPageChange(p as number)}
                className={`h-8 min-w-[2rem] px-2 text-xs sm:text-sm shadow-sm transition-all ${
                  isCurrent ? 'ring-2 ring-primary/20 ring-offset-1 ring-offset-background' : 'hover:bg-muted'
                }`}
              >
                {p}
              </Button>
            );
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="h-8 px-2 sm:px-3 text-xs sm:text-sm shadow-sm"
          title="Trang sau"
        >
          <span className="hidden sm:inline mr-1">Sau</span>
          <CaretRight size={16} weight="bold" />
        </Button>
      </div>
    </div>
  );
}
