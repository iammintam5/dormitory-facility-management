import { ReactNode } from 'react';
import { Card } from './Card';

interface MobileDataCardProps {
  title: ReactNode;
  subtitle?: ReactNode;
  statusBadge?: ReactNode;
  children: ReactNode; // The key-value pairs
  actionMenu?: ReactNode; // The 3-dot menu
}

export function MobileDataCard({ title, subtitle, statusBadge, children, actionMenu }: MobileDataCardProps) {
  return (
    <Card className="p-4 border-border/50 space-y-3 relative overflow-hidden transition-all hover:bg-muted/30">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0 pr-8">
          <div className="font-semibold text-foreground truncate">{title}</div>
          {subtitle && <div className="text-sm text-muted-foreground truncate">{subtitle}</div>}
        </div>
        {statusBadge && <div className="flex-shrink-0">{statusBadge}</div>}
      </div>

      <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm mt-3 pt-3 border-t border-border/50">
        {children}
      </div>

      {actionMenu && (
        <div className="absolute top-3 right-3">
          {actionMenu}
        </div>
      )}
    </Card>
  );
}

export function DataLabel({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col min-w-0">
      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className="text-sm font-medium text-foreground truncate mt-0.5">{value}</span>
    </div>
  );
}
