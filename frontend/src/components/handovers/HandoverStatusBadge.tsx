import { HandoverStatus } from '../../types/handovers';

export function HandoverStatusBadge({ status }: { status: HandoverStatus }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getClassName(status)}`}>
      {status}
    </span>
  );
}

function getClassName(status: HandoverStatus) {
  switch (status) {
    case 'DRAFT':
      return 'bg-slate-200 text-slate-700';
    case 'WAITING_CONFIRMATION':
      return 'bg-amber-100 text-amber-700';
    case 'CONFIRMED':
      return 'bg-emerald-100 text-emerald-700';
    case 'RETURNED':
      return 'bg-sky-100 text-sky-700';
    case 'CANCELLED':
      return 'bg-rose-100 text-rose-700';
  }
}
