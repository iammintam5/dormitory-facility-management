import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MaintenanceRecordPrintForm } from '../../components/print/forms/MaintenanceRecordPrintForm';
import { usePrint } from '../../hooks/usePrint';
import { apiClient } from '../../lib/axios';
import { getApiErrorMessage } from '../../lib/api-error';
import { MaintenanceRecordExportResponse } from '../../types/maintenance';

export function MaintenanceRecordPrintPreviewPage({ backTo }: { backTo?: string } = {}) {
  const { id } = useParams();
  const recordId = Number(id);
  const [record, setRecord] = useState<MaintenanceRecordExportResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const { print } = usePrint(record ? `${record.maintenanceCode} - QL_BM7` : 'QL_BM7');

  useEffect(() => {
    if (!Number.isFinite(recordId)) {
      return;
    }

    void loadData();
  }, [recordId]);

  const loadData = async () => {
    try {
      const response = await apiClient.get<MaintenanceRecordExportResponse>(
        `/maintenance/records/${recordId}/export`,
      );
      setRecord(response.data);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Không thể tải dữ liệu in phiếu bảo trì.'));
    }
  };

  if (errorMessage) {
    return <div className="mx-auto max-w-3xl rounded-2xl bg-rose-50 p-6 text-sm text-rose-700">{errorMessage}</div>;
  }

  if (!record) {
    return <div className="mx-auto max-w-3xl rounded-2xl bg-slate-50 p-6 text-sm text-slate-600">Đang tải phiếu in...</div>;
  }

  return (
    <MaintenanceRecordPrintForm
      record={record}
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
