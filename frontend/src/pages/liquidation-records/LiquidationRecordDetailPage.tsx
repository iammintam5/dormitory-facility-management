import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { SectionCard } from '../../components/admin/SectionCard';
import { useAuth } from '../../auth/auth-context';
import { apiClient } from '../../lib/axios';
import { getApiErrorMessage } from '../../lib/api-error';
import { formatDate, formatDateTime } from '../../lib/format';
import { useToast } from '../../toast/toast-context';
import { LiquidationRecord, LiquidationStatus } from '../../types/liquidation-records';

export function LiquidationRecordDetailPage() {
  const { id } = useParams();
  const recordId = Number(id);
  const { user } = useAuth();
  const { showToast } = useToast();
  const basePath = user?.role === 'ADMIN' ? '/admin' : '/manager';
  const [record, setRecord] = useState<LiquidationRecord | null>(null);
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!Number.isFinite(recordId)) {
      return;
    }

    void loadRecord();
  }, [recordId]);

  const isAdmin = user?.role === 'ADMIN';
  const canSubmitApproval = ['DRAFT', 'REJECTED'].includes(record?.status ?? '');
  const canApprove = isAdmin && record?.status === 'PENDING_APPROVAL';
  const canComplete = isAdmin && record?.status === 'APPROVED';
  const canCancel =
    ['ADMIN', 'QL_CSVC'].includes(user?.role ?? '') &&
    !['COMPLETED', 'CANCELLED'].includes(record?.status ?? '');

  async function loadRecord() {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await apiClient.get<LiquidationRecord>(`/liquidation-records/${recordId}`);
      setRecord(response.data);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Không thể tải chi tiết biên bản thanh lý.'));
    } finally {
      setIsLoading(false);
    }
  }

  async function runWorkflow(endpoint: string) {
    if (!record) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await apiClient.post(`/liquidation-records/${record.id}/${endpoint}`, {
        note: note.trim() || undefined,
      });
      showToast('Cập nhật workflow thành công.');
      setNote('');
      await loadRecord();
    } catch (error) {
      const message = getApiErrorMessage(error, 'Không thể cập nhật workflow thanh lý.');
      setErrorMessage(message);
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-slate-50 px-6 py-12 text-center text-sm text-slate-600">
        Đang tải chi tiết biên bản thanh lý...
      </div>
    );
  }

  if (!record) {
    return (
      <div className="rounded-2xl bg-rose-50 px-6 py-12 text-center text-sm text-rose-700">
        {errorMessage || 'Không tìm thấy biên bản thanh lý.'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <Link
          to={`${basePath}/liquidation-records`}
          className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Quay lại danh sách
        </Link>
        <Link
          to={`${basePath}/liquidation-records/${record.id}/print`}
          className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          In biểu mẫu
        </Link>
      </div>

      {errorMessage && (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</p>
      )}

      <SectionCard
        title="Chi tiết biên bản thanh lý"
        description="Theo dõi thông tin tài sản, lý do thanh lý và xử lý workflow duyệt."
      >
        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {record.liquidationCode}
                  </p>
                  <h2 className="mt-2 text-xl font-bold text-slate-900">
                    {record.asset.assetName}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {record.asset.assetCode} / {record.asset.room?.roomCode ?? '--'} /{' '}
                    {record.asset.category.name}
                  </p>
                </div>
                <StatusBadge status={record.status} />
              </div>

              <dl className="mt-5 grid gap-4 md:grid-cols-2">
                <InfoItem
                  label="Người lập"
                  value={`${record.createdByUser.fullName} (${record.createdByUser.userCode})`}
                />
                <InfoItem label="Ngày lập" value={formatDate(record.liquidationDate)} />
                <InfoItem label="Cập nhật gần nhất" value={formatDateTime(record.updatedAt ?? record.createdAt)} />
                <InfoItem
                  label="Giá trị còn lại"
                  value={record.estimatedRemainingValue ? String(record.estimatedRemainingValue) : '--'}
                />
              </dl>

              <div className="mt-5 grid gap-4">
                <Block label="Tình trạng tài sản">{record.assetCondition}</Block>
                <Block label="Lý do thanh lý">{record.reason}</Block>
                <Block label="Ghi chú">{record.note || '--'}</Block>
              </div>
            </div>
          </div>

          <SectionCard
            title="Workflow thanh lý"
            description="QL_CSVC gửi duyệt, quản trị phê duyệt và hoàn tất thanh lý tài sản."
          >
            <div className="space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Ghi chú workflow</span>
                <textarea
                  className={`${inputClassName} min-h-28`}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Thêm ghi chú cho bước xử lý hiện tại."
                />
              </label>

              <div className="flex flex-wrap gap-3">
                {canSubmitApproval && (
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => void runWorkflow('submit-approval')}
                    className="rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-400 disabled:opacity-60"
                  >
                    Gửi duyệt
                  </button>
                )}

                {canApprove && (
                  <>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => void runWorkflow('approve')}
                      className="rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:opacity-60"
                    >
                      Phê duyệt
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => void runWorkflow('reject')}
                      className="rounded-xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
                    >
                      Từ chối
                    </button>
                  </>
                )}

                {canComplete && (
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => void runWorkflow('complete')}
                    className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
                  >
                    Hoàn tất thanh lý
                  </button>
                )}

                {canCancel && (
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => void runWorkflow('cancel')}
                    className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                  >
                    Hủy biên bản
                  </button>
                )}
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                <p>
                  Tài sản sẽ chuyển sang <strong>PENDING_LIQUIDATION</strong> khi lập biên bản, và chuyển sang{' '}
                  <strong>LIQUIDATED</strong> khi hoàn tất.
                </p>
              </div>
            </div>
          </SectionCard>
        </div>
      </SectionCard>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white px-4 py-3">
      <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-4">
      <p className="text-sm font-medium text-slate-700">{label}</p>
      <p className="mt-2 text-sm leading-6 text-slate-700">{children}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: LiquidationStatus }) {
  const className =
    status === 'COMPLETED'
      ? 'bg-emerald-50 text-emerald-700'
      : status === 'REJECTED' || status === 'CANCELLED'
        ? 'bg-rose-50 text-rose-700'
        : status === 'APPROVED'
          ? 'bg-sky-50 text-sky-700'
          : status === 'PENDING_APPROVAL'
            ? 'bg-amber-50 text-amber-700'
            : 'bg-slate-100 text-slate-700';

  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}>{status}</span>;
}

const inputClassName =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400';
