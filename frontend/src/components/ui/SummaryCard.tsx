import { type ReactNode } from 'react';
import { Card, CardContent } from './Card';

interface SummaryCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon: ReactNode;
  colorClass: string;
}

export function SummaryCard({ label, value, unit, icon, colorClass }: SummaryCardProps) {
  const displayValue = typeof value === 'number' ? value.toLocaleString('vi-VN') : value;

  return (
    <Card className="border-border/50">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border ${colorClass}`}>
          {icon}
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-bold tabular-nums text-foreground">{displayValue}</span>
            {unit && <span className="text-sm font-medium text-muted-foreground">{unit}</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
