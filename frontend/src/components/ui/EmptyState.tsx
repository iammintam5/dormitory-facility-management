import { ReactNode } from 'react';
import { Archive, Funnel, MagnifyingGlass } from '@phosphor-icons/react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  onClearFilters?: () => void;
  compact?: boolean;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  onClearFilters,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${
        compact ? 'p-6' : 'min-h-[300px] p-8'
      } rounded-lg border border-dashed border-border bg-muted/30`}
    >
      <div className={`text-muted-foreground/50 ${compact ? 'mb-3' : 'mb-4'}`}>
        {icon || <Archive size={compact ? 32 : 48} weight="duotone" />}
      </div>
      
      <h3 className={`${compact ? 'text-sm' : 'text-lg'} font-semibold text-foreground mb-1`}>
        {title}
      </h3>
      
      {description && (
        <p className={`text-muted-foreground ${compact ? 'text-xs' : 'text-sm'} max-w-sm mb-5`}>
          {description}
        </p>
      )}

      <div className="flex gap-3 mt-2">
        {onClearFilters && (
          <Button variant="outline" size={compact ? 'sm' : 'default'} onClick={onClearFilters}>
            Xóa bộ lọc
          </Button>
        )}
        {actionLabel && onAction && (
          <Button size={compact ? 'sm' : 'default'} onClick={onAction}>
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

export function SearchEmptyState({ onClearFilters, compact }: Pick<EmptyStateProps, 'onClearFilters' | 'compact'>) {
  return (
    <EmptyState
      icon={<MagnifyingGlass size={compact ? 32 : 48} weight="duotone" />}
      title="Không tìm thấy kết quả"
      description="Hãy thử thay đổi từ khóa hoặc xóa bộ lọc để xem thêm dữ liệu."
      onClearFilters={onClearFilters}
      compact={compact}
    />
  );
}

export function FilterEmptyState({ onClearFilters, compact }: Pick<EmptyStateProps, 'onClearFilters' | 'compact'>) {
  return (
    <EmptyState
      icon={<Funnel size={compact ? 32 : 48} weight="duotone" />}
      title="Không có kết quả phù hợp"
      description="Không có dữ liệu nào khớp với các bộ lọc hiện tại."
      onClearFilters={onClearFilters}
      compact={compact}
    />
  );
}
