import { useAuth } from '../../auth/auth-context';
import { HandoverPrintPreviewPage } from '../print/HandoverPrintPreviewPage';

export function HandoverPrintPage() {
  const { user } = useAuth();
  const basePath = user?.role === 'ADMIN' ? '/admin' : user?.role === 'QL_CSVC' ? '/manager' : '/student';
  return <HandoverPrintPreviewPage backTo={`${basePath}/handovers`} />;
}
