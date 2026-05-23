import { useAuth } from '../../auth/auth-context';
import { LiquidationRecordPrintPreviewPage } from '../print/LiquidationRecordPrintPreviewPage';

export function LiquidationRecordPrintPage() {
  const { user } = useAuth();
  const basePath = user?.role === 'ADMIN' ? '/admin' : '/manager';
  return <LiquidationRecordPrintPreviewPage backTo={`${basePath}/liquidation-records`} />;
}
