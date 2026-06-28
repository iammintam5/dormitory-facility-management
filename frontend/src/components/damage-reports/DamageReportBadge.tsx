import { Badge } from '../ui/Badge';
import { DamageReportPriority, DamageReportStatus } from '../../types/damage-reports';

export function DamageReportStatusBadge({ status }: { status: DamageReportStatus }) {
  return <Badge status={status} />;
}

export function DamageReportPriorityBadge({ priority }: { priority: DamageReportPriority }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${getPriorityClassName(priority)}`}
    >
      {priority}
    </span>
  );
}

function getPriorityClassName(priority: DamageReportPriority) {
  switch (priority) {
    case 'LOW':
      return 'bg-muted text-foreground';
    case 'MEDIUM':
      return 'bg-sky-100 text-sky-700';
    case 'HIGH':
      return 'bg-amber-100 text-amber-700';
    case 'URGENT':
      return 'bg-rose-100 text-rose-700';
  }
}
