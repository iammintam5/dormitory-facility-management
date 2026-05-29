import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { InventoryCheckPrintForm } from '../../components/print/forms/InventoryCheckPrintForm';
import { usePrint } from '../../hooks/usePrint';
import { apiClient } from '../../lib/axios';
import { getApiErrorMessage } from '../../lib/api-error';
import { InventoryCheckExportResponse } from '../../types/inventory-checks';

export function InventoryCheckPrintPreviewPage({ backTo }: { backTo?: string } = {}) {
  const { id } = useParams();
  const inventoryCheckId = Number(id);
  const [inventoryCheck, setInventoryCheck] = useState<InventoryCheckExportResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const { print } = usePrint(
    inventoryCheck ? `${inventoryCheck.inventoryCode} - QL_BM3` : 'QL_BM3',
  );

  useEffect(() => {
    if (!Number.isFinite(inventoryCheckId)) {
      return;
    }

    void loadData();
  }, [inventoryCheckId]);

  const loadData = async () => {
    try {
      const response = await apiClient.get<InventoryCheckExportResponse>(
        `/inventory-checks/${inventoryCheckId}/export`,
      );
      setInventoryCheck(response.data);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Không thể tải dữ liệu in phiếu kiểm kê.'));
    }
  };

  if (errorMessage) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl bg-rose-50 p-6 text-sm text-rose-700">
        {errorMessage}
      </div>
    );
  }

  if (!inventoryCheck) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl bg-slate-50 p-6 text-sm text-slate-600">
        Đang tải biểu mẫu in...
      </div>
    );
  }

  return (
    <InventoryCheckPrintForm
      inventoryCheck={inventoryCheck}
      onPrint={print}
      backAction={
        backTo ? (
          <Link
            to={backTo}
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Quay lại
          </Link>
        ) : undefined
      }
    />
  );
}
