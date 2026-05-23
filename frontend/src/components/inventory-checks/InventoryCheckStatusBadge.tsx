import { InventoryCheckStatus } from '../../types/inventory-checks';

type InventoryCheckStatusBadgeProps = {
  status: InventoryCheckStatus;
};

const statusMap: Record<
  InventoryCheckStatus,
  {
    label: string;
    className: string;
  }
> = {
  DRAFT: {
    label: 'Dang nhap ket qua',
    className: 'bg-amber-50 text-amber-700 border border-amber-200',
  },
  COMPLETED: {
    label: 'Da hoan tat',
    className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  },
};

export function InventoryCheckStatusBadge({ status }: InventoryCheckStatusBadgeProps) {
  const meta = statusMap[status];

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}
