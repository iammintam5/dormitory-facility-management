import { Badge } from '../ui/Badge';
import { InventoryCheckStatus } from '../../types/inventory-checks';

type InventoryCheckStatusBadgeProps = {
  status: InventoryCheckStatus;
};

export function InventoryCheckStatusBadge({ status }: InventoryCheckStatusBadgeProps) {
  return <Badge status={status} />;
}
