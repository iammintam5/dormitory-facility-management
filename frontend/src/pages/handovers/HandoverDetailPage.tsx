import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { SectionCard } from '../../components/admin/SectionCard';
import { HandoverStatusBadge } from '../../components/handovers/HandoverStatusBadge';
import { useAuth } from '../../auth/auth-context';
import { apiClient } from '../../lib/axios';
import { getApiErrorMessage } from '../../lib/api-error';
import { formatDate, formatDateTime } from '../../lib/format';
import { useToast } from '../../toast/toast-context';
import { Handover } from '../../types/handovers';

export function HandoverDetailPage() {
  const { id } = useParams();
  const handoverId = Number(id);
  const { user } = useAuth();
  const { showToast } = useToast();
  const [handover, setHandover] = useState<Handover | null>(null);
  const [note, setNote] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const basePath = user?.role === 'ADMIN' ? '/admin' : user?.role === 'QL_CSVC' ? '/manager' : '/student';
  const isManager = ['ADMIN', 'QL_CSVC'].includes(user?.role ?? '');
  const isStudent = user?.role === 'STUDENT';

  useEffect(() => {
    if (!Number.isFinite(handoverId)) {
      return;
    }

    void loadHandover();
  }, [handoverId]);

  const loadHandover = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await apiClient.get<Handover>(`/handovers/${handoverId}`);
      setHandover(response.data);
      setNote(response.data.note ?? '');
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Không thể tải chi tiết biên bản.'));
    } finally {
      setIsLoading(false);
    }
  };

  const runWorkflow = async (endpoint: string) => {
    if (!handover) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await apiClient.post(`/handovers/${handover.id}/${endpoint}`, {
        note: note.trim() || undefined,
      });
      showToast('Cập nhật biên bản thành công.');
      await loadHandover();
    } catch (error) {
      const message = getApiErrorMessage(error, 'Không thể cập nhật biên bản.');
      setErrorMessage(message);
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-slate-50 px-6 py-12 text-center text-sm text-slate-600">
        Đang tải chi tiết biên bản...
      </div>
    );
  }

  if (!handover) {
    return (
      <div className="rounded-2xl bg-rose-50 px-6 py-12 text-center text-sm text-rose-700">
        {errorMessage || 'Không tìm thấy biên bản bàn giao.'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <Link
          to={`${basePath}/handovers`}
          className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Quay lại danh sách
        </Link>
        {isManager && (
          <Link
            to={`${basePath}/handovers/${handover.id}/print`}
            className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            In / Xuất biểu mẫu
          </Link>
        )}
      </div>

      {errorMessage && (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</p>
      )}

      <SectionCard
        title="Chi tiet bien ban ban giao"
        description="Xem danh sach tai san duoc ban giao, thong tin phong va thao tac xac nhan."
      >
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {handover.handoverCode}
                  </p>
                  <h2 className="mt-2 text-xl font-bold text-slate-900">
                    Biên bản bàn giao tài sản phòng {handover.room.roomCode}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Lập bởi {handover.createdByUser?.fullName ?? '--'} | Ngày lập {formatDate(handover.handoverDate)}
                  </p>
                </div>
                <HandoverStatusBadge status={handover.status} />
              </div>

              <dl className="mt-5 grid gap-4 md:grid-cols-2">
                <InfoItem label="Sinh viên" value={`${handover.student.fullName} (${handover.student.userCode})`} />
                <InfoItem label="Phòng" value={`${handover.room.roomCode} - ${handover.room.floor.block.name} / ầng ${handover.room.floor.floorNumber}`} />
                <InfoItem label="Ngày tạo" value={formatDateTime(handover.createdAt)} />
                <InfoItem label="Lần cập nhật cuối" value={formatDateTime(handover.updatedAt ?? handover.createdAt)} />
              </dl>

              <div className="mt-5 rounded-2xl bg-white p-4">
                <p className="text-sm font-medium text-slate-700">Ghi chú chung</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{handover.note || 'Không có ghi chú.'}</p>
              </div>
            </div>

            <SectionCard
              title="Danh sách tài sản bàn giao"
              description="Thông tin từng tài sản, số lượng và tình trạng tại thời điểm bàn giao."
            >
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-left text-slate-600">
                      <tr>
                        <th className="px-4 py-3 font-medium">Tài sản</th>
                        <th className="px-4 py-3 font-medium">Số lượng</th>
                        <th className="px-4 py-3 font-medium">Tình trạng khi bàn giao</th>
                        <th className="px-4 py-3 font-medium">Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {handover.handoverItems.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-900">{item.asset.assetName}</p>
                            <p className="text-xs text-slate-500">{item.asset.assetCode}</p>
                          </td>
                          <td className="px-4 py-3 text-slate-700">{item.quantity}</td>
                          <td className="px-4 py-3 text-slate-700">{item.conditionAtHandover}</td>
                          <td className="px-4 py-3 text-slate-700">{item.note || '--'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </SectionCard>
          </div>

          <div className="space-y-6">
            {(isManager || isStudent) && (
              <SectionCard
                title={isStudent ? 'Xác nhận biên bản' : 'Workflow biên bản'}
                description={
                  isStudent
                    ? 'Sinh viên xem kỹ thông tin trước khi xác nhận biên bản bàn giao.'
                    : 'Quản lý gửi xác nhận, hủy biên bản hoặc ghi nhận trả tài sản.'
                }
              >
                <div className="space-y-4">
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-700">Ghi chú</span>
                    <textarea
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      className={`${inputClassName} min-h-28`}
                      placeholder="Thêm ghi chú cho biên bản nếu cần."
                    />
                  </label>

                  <div className="flex flex-wrap gap-3">
                    {isManager && handover.status === 'DRAFT' && (
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => void runWorkflow('send-confirmation')}
                        className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
                      >
                        Gửi cho sinh viên xác nhận
                      </button>
                    )}

                    {isStudent && handover.status === 'WAITING_CONFIRMATION' && (
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => void runWorkflow('confirm')}
                        className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
                      >
                        Xác nhận biên bản
                      </button>
                    )}

                    {isManager && handover.status === 'CONFIRMED' && (
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => void runWorkflow('mark-returned')}
                        className="rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:opacity-60"
                      >
                        Ghi nhận trả tài sản
                      </button>
                    )}

                    {isManager && ['DRAFT', 'WAITING_CONFIRMATION'].includes(handover.status) && (
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => void runWorkflow('cancel')}
                        className="rounded-xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
                      >
                        Hủy biên bản
                      </button>
                    )}
                  </div>
                </div>
              </SectionCard>
            )}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-4">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="mt-2 text-sm font-medium text-slate-800">{value}</dd>
    </div>
  );
}

const inputClassName =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500';
