import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LiquidationRecordPrintForm } from '../../components/print/forms/LiquidationRecordPrintForm';
import { usePrint } from '../../hooks/usePrint';
import { apiClient } from '../../lib/axios';
import { getApiErrorMessage } from '../../lib/api-error';
import { LiquidationRecordExportResponse } from '../../types/liquidation-records';

export function LiquidationRecordPrintPreviewPage({ backTo }: { backTo?: string } = {}) {
  const { id } = useParams();
  const recordId = Number(id);
  const [record, setRecord] = useState<LiquidationRecordExportResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const { print } = usePrint(record ? `${record.liquidationCode} - QL_BM5` : 'QL_BM5');

  useEffect(() => {
    if (!Number.isFinite(recordId)) {
      return;
    }

    void loadRecord();
  }, [recordId]);

  async function loadRecord() {
    try {
      const response = await apiClient.get<LiquidationRecordExportResponse>(
        `/liquidation-records/${recordId}/export`,
      );
      setRecord(response.data);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Không thể tải biểu mẫu thanh lý.'));
    }
  }

  if (errorMessage) {
    return (
      <div className="rounded-2xl bg-rose-50 px-6 py-12 text-center text-sm text-rose-700">
        {errorMessage}
      </div>
    );
  }

  if (!record) {
    return (
      <div className="rounded-2xl bg-slate-50 px-6 py-12 text-center text-sm text-slate-600">
        Đang tải biểu mẫu thanh lý...
      </div>
    );
  }

  return (
    <LiquidationRecordPrintForm
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
