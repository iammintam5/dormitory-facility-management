import { ReactNode } from 'react';
import { Button } from './Button';
import { X, Funnel } from '@phosphor-icons/react';

interface FilterChipProps {
  label: string;
  onRemove: () => void;
}

export function FilterChip({ label, onRemove }: FilterChipProps) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-foreground border border-border">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
        aria-label={`Xóa bộ lọc ${label}`}
      >
        <X size={12} weight="bold" />
      </button>
    </span>
  );
}

interface FilterBarProps {
  searchNode?: ReactNode;
  filterNode?: ReactNode; // Desktop filters
  actionNode?: ReactNode; // Like Create button
  mobileFilterTrigger?: ReactNode; // Trigger to open Mobile Filter Drawer
  appliedFilterCount?: number;
  onResetFilters?: () => void;
  filterChips?: { id: string; label: string; onRemove: () => void }[];
}

export function FilterBar({
  searchNode,
  filterNode,
  actionNode,
  mobileFilterTrigger,
  appliedFilterCount = 0,
  onResetFilters,
  filterChips = [],
}: FilterBarProps) {
  return (
    <div className="space-y-4 mb-6">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex-1 w-full flex items-center gap-3">
          {searchNode && <div className="flex-1 sm:max-w-xs md:max-w-sm">{searchNode}</div>}
          
          <div className="hidden md:flex items-center gap-3">
            {filterNode}
          </div>

          <div className="md:hidden flex items-center gap-2">
            {mobileFilterTrigger || (
              <Button variant="outline" size="icon" aria-label={`Bộ lọc (${appliedFilterCount})`}>
                <div className="relative">
                  <Funnel size={16} weight="bold" />
                  {appliedFilterCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      {appliedFilterCount}
                    </span>
                  )}
                </div>
              </Button>
            )}
          </div>
        </div>
        
        {actionNode && (
          <div className="flex-shrink-0 w-full sm:w-auto mt-1 sm:mt-0">
            {actionNode}
          </div>
        )}
      </div>

      {filterChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground mr-1">Đang lọc:</span>
          {filterChips.map(chip => (
            <FilterChip key={chip.id} label={chip.label} onRemove={chip.onRemove} />
          ))}
          {onResetFilters && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onResetFilters} 
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground gap-1.5"
            >
              Xóa tất cả
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
