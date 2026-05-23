import { useAuth } from '../../auth/auth-context';
import { MaintenanceRecordPrintPreviewPage } from '../print/MaintenanceRecordPrintPreviewPage';

export function MaintenanceRecordPrintPage() {
  const { user } = useAuth();
  const basePath = user?.role === 'ADMIN' ? '/admin' : '/manager';
  return <MaintenanceRecordPrintPreviewPage backTo={`${basePath}/maintenance`} />;
}
