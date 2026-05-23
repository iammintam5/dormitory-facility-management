import { DamageReportPriority, DamageReportStatus } from '../../types/damage-reports';

export function DamageReportStatusBadge({ status }: { status: DamageReportStatus }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClassName(status)}`}
    >
      {status}
    </span>
  );
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

function getStatusClassName(status: DamageReportStatus) {
  switch (status) {
    case 'PENDING':
      return 'bg-amber-100 text-amber-700';
    case 'RECEIVED':
      return 'bg-sky-100 text-sky-700';
    case 'PROCESSING':
      return 'bg-indigo-100 text-indigo-700';
    case 'COMPLETED':
      return 'bg-emerald-100 text-emerald-700';
    case 'REJECTED':
      return 'bg-rose-100 text-rose-700';
    case 'CANCELLED':
      return 'bg-slate-200 text-slate-700';
  }
}

function getPriorityClassName(priority: DamageReportPriority) {
  switch (priority) {
    case 'LOW':
      return 'bg-slate-200 text-slate-700';
    case 'MEDIUM':
      return 'bg-sky-100 text-sky-700';
    case 'HIGH':
      return 'bg-amber-100 text-amber-700';
    case 'URGENT':
      return 'bg-rose-100 text-rose-700';
  }
}
