import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { HandoverPrintForm } from '../../components/print/forms/HandoverPrintForm';
import { usePrint } from '../../hooks/usePrint';
import { apiClient } from '../../lib/axios';
import { getApiErrorMessage } from '../../lib/api-error';
import { HandoverExportResponse } from '../../types/handovers';

export function HandoverPrintPreviewPage({ backTo }: { backTo?: string } = {}) {
  const { id } = useParams();
  const handoverId = Number(id);
  const [handover, setHandover] = useState<HandoverExportResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const { print } = usePrint(handover ? `${handover.handoverCode} - QL_BM1` : 'QL_BM1');

  useEffect(() => {
    if (!Number.isFinite(handoverId)) {
      return;
    }

    void loadData();
  }, [handoverId]);

  const loadData = async () => {
    try {
      const response = await apiClient.get<HandoverExportResponse>(`/handovers/${handoverId}/export`);
      setHandover(response.data);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Khong the tai du lieu in bien ban.'));
    }
  };

  if (errorMessage) {
    return <div className="mx-auto max-w-3xl rounded-2xl bg-rose-50 p-6 text-sm text-rose-700">{errorMessage}</div>;
  }

  if (!handover) {
    return <div className="mx-auto max-w-3xl rounded-2xl bg-slate-50 p-6 text-sm text-slate-600">Dang tai bieu mau in...</div>;
  }

  return (
    <HandoverPrintForm
      handover={handover}
      onPrint={print}
      backAction={
        backTo ? (
          <Link
            to={backTo}
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Quay lai
          </Link>
        ) : undefined
      }
    />
  );
}
