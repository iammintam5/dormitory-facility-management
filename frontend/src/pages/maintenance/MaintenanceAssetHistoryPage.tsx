import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { SectionCard } from '../../components/admin/SectionCard';
import { useAuth } from '../../auth/auth-context';
import { getMaintenanceHistory } from '../../services/maintenance';
import { formatDateOnly, formatDateTime } from '../../lib/date';
import { MaintenanceRecord } from '../../types/maintenance';

export function MaintenanceAssetHistoryPage() {
  const { assetId } = useParams();
  const numericAssetId = Number(assetId);
  const { user } = useAuth();
  const basePath = user?.role === 'ADMIN' ? '/admin' : '/manager';
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!Number.isFinite(numericAssetId)) return;
    void loadHistory();
  }, [numericAssetId]);

  async function loadHistory() {
    setIsLoading(true);
    setErrorMessage('');

    try {
      setRecords(await getMaintenanceHistory(numericAssetId));
    } catch {
      setErrorMessage('Không thể tải lịch sử bảo trì của tài sản.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <Link
          to={`${basePath}/maintenance`}
          className="rounded-xl border border-border px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-muted/30"
        >
          Quay lại bảo trì
        </Link>
      </div>

      <SectionCard
        title="Lịch sử bảo trì tài sản"
        description="Theo dõi các lần bảo trì, kết quả và phiếu in liên quan của từng tài sản."
      >
        {errorMessage && (
          <p className="mb-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</p>
        )}

        {isLoading ? (
          <div className="rounded-2xl bg-muted/30 px-6 py-12 text-center text-sm text-muted-foreground">
            Đang tải lịch sử bảo trì...
          </div>
        ) : records.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center text-sm text-muted-foreground">
            Chưa có lịch sử bảo trì cho tài sản này.
          </div>
        ) : (
          <div className="space-y-4">
            {records.map((record) => (
              <article key={record.id} className="rounded-2xl border border-border bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">{record.maintenanceCode}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {record.asset.assetCode} - {record.asset.assetName}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDateOnly(record.maintenanceDate)} | {record.performedByUser.fullName}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-muted/50 px-3 py-1 text-xs font-semibold text-foreground">
                      {record.resultStatus}
                    </span>
                    <Link
                      to={`${basePath}/maintenance/records/${record.id}/print`}
                      className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/30"
                    >
                      In phiếu
                    </Link>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <InfoLine label="Loại phiếu" value="Sửa chữa" />
                  <InfoLine label="Lần cập nhật" value={formatDateTime(record.updatedAt ?? record.createdAt)} />
                  <InfoLine label="Ngày bảo trì tiếp theo" value={formatDateOnly(record.nextMaintenanceDate)} />
                </div>
                <div className="mt-4 rounded-2xl bg-muted/30 p-4 text-sm text-foreground">
                  <p className="font-medium text-foreground">Nội dung</p>
                  <p className="mt-2 leading-6">{record.content}</p>
                  {record.note && <p className="mt-3 text-muted-foreground">Ghi chú: {record.note}</p>}
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/30 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
