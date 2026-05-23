import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DamageReportPrintForm } from '../../components/print/forms/DamageReportPrintForm';
import { usePrint } from '../../hooks/usePrint';
import { apiClient } from '../../lib/axios';
import { getApiErrorMessage } from '../../lib/api-error';
import { DamageReportExportResponse } from '../../types/damage-reports';

export function DamageReportPrintPreviewPage({ backTo }: { backTo?: string } = {}) {
  const { id } = useParams();
  const reportId = Number(id);
  const [report, setReport] = useState<DamageReportExportResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const { print } = usePrint(report ? `${report.reportCode} - QL_BM4` : 'QL_BM4');

  useEffect(() => {
    if (!Number.isFinite(reportId)) {
      return;
    }

    void loadData();
  }, [reportId]);

  const loadData = async () => {
    try {
      const response = await apiClient.get<DamageReportExportResponse>(`/damage-reports/${reportId}/export`);
      setReport(response.data);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Khong the tai du lieu in phieu bao hong.'));
    }
  };

  if (errorMessage) {
    return <div className="mx-auto max-w-3xl rounded-2xl bg-rose-50 p-6 text-sm text-rose-700">{errorMessage}</div>;
  }

  if (!report) {
    return <div className="mx-auto max-w-3xl rounded-2xl bg-slate-50 p-6 text-sm text-slate-600">Dang tai bieu mau in...</div>;
  }

  return (
    <DamageReportPrintForm
      report={report}
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
