import { useAuth } from '../../auth/auth-context';
import { InventoryCheckPrintPreviewPage } from '../print/InventoryCheckPrintPreviewPage';

export function InventoryCheckPrintPage() {
  const { user } = useAuth();
  const basePath = user?.role === 'ADMIN' ? '/admin' : '/manager';
  return <InventoryCheckPrintPreviewPage backTo={`${basePath}/inventory-checks`} />;
}
