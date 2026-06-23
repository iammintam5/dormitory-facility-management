import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/auth-context';
import { InventoryCheckPrintForm } from '../../components/print/forms/InventoryCheckPrintForm';
import { PrintOverlay } from '../../components/print/PrintOverlay';
import { usePrint } from '../../hooks/usePrint';
import { getInventoryCheckExport } from '../../services/inventory-checks';
import { InventoryCheckExportResponse } from '../../types/inventory-checks';

export function InventoryCheckPrintPreviewPage({ backTo }: { backTo?: string } = {}) {
  const { user } = useAuth();
  const { id } = useParams();
  const inventoryCheckId = Number(id);
  const [inventoryCheck, setInventoryCheck] = useState<InventoryCheckExportResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const { print, isPrinting } = usePrint(inventoryCheck ? `${inventoryCheck.inventoryCode} - QL_BM3` : 'QL_BM3');
  const resolvedBackTo = backTo ?? getInventoryCheckBackTo(user?.role);

  useEffect(() => {
    if (!Number.isFinite(inventoryCheckId)) return;
    void loadData();
  }, [inventoryCheckId]);

  async function loadData() {
    const response = await getInventoryCheckExport(inventoryCheckId);
    if (!response) {
      setErrorMessage('Không thể tải dữ liệu in phiếu kiểm kê.');
      return;
    }
    setInventoryCheck(response);
  }

  if (errorMessage) {
    return <div className="mx-auto max-w-3xl rounded-2xl bg-rose-50 p-6 text-sm text-rose-700">{errorMessage}</div>;
  }

  if (!inventoryCheck) {
    return <div className="mx-auto max-w-3xl rounded-2xl bg-slate-50 p-6 text-sm text-slate-600">Đang tải biểu mẫu in...</div>;
  }

  return (
    <>
      <PrintOverlay isPrinting={isPrinting} />
      <InventoryCheckPrintForm
      inventoryCheck={inventoryCheck}
      onPrint={print}
        backAction={
        resolvedBackTo ? (
          <Link
            to={resolvedBackTo}
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Quay lại
          </Link>
        ) : undefined
        }
    />
    </>
  );
}

function getInventoryCheckBackTo(role?: string) {
  if (role === 'ADMIN') return '/admin/inventory-checks';
  if (role === 'MANAGER') return '/manager/inventory-checks';
  return undefined;
}
