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
      setErrorMessage(getApiErrorMessage(error, 'Khong the tai chi tiet bien ban.'));
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
      showToast('Cap nhat bien ban thanh cong.');
      await loadHandover();
    } catch (error) {
      const message = getApiErrorMessage(error, 'Khong the cap nhat bien ban.');
      setErrorMessage(message);
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-slate-50 px-6 py-12 text-center text-sm text-slate-600">
        Dang tai chi tiet bien ban...
      </div>
    );
  }

  if (!handover) {
    return (
      <div className="rounded-2xl bg-rose-50 px-6 py-12 text-center text-sm text-rose-700">
        {errorMessage || 'Khong tim thay bien ban ban giao.'}
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
          Quay lai danh sach
        </Link>
        {isManager && (
          <Link
            to={`${basePath}/handovers/${handover.id}/print`}
            className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            In / Xuat bieu mau
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
                    Bien ban ban giao tai san phong {handover.room.roomCode}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Lap boi {handover.createdByUser?.fullName ?? '--'} | Ngay lap {formatDate(handover.handoverDate)}
                  </p>
                </div>
                <HandoverStatusBadge status={handover.status} />
              </div>

              <dl className="mt-5 grid gap-4 md:grid-cols-2">
                <InfoItem label="Sinh vien" value={`${handover.student.fullName} (${handover.student.userCode})`} />
                <InfoItem label="Phong" value={`${handover.room.roomCode} - ${handover.room.floor.block.name} / Tang ${handover.room.floor.floorNumber}`} />
                <InfoItem label="Ngay tao" value={formatDateTime(handover.createdAt)} />
                <InfoItem label="Lan cap nhat cuoi" value={formatDateTime(handover.updatedAt ?? handover.createdAt)} />
              </dl>

              <div className="mt-5 rounded-2xl bg-white p-4">
                <p className="text-sm font-medium text-slate-700">Ghi chu chung</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{handover.note || 'Khong co ghi chu.'}</p>
              </div>
            </div>

            <SectionCard
              title="Danh sach tai san ban giao"
              description="Thong tin tung tai san, so luong va tinh trang tai thoi diem ban giao."
            >
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-left text-slate-600">
                      <tr>
                        <th className="px-4 py-3 font-medium">Tai san</th>
                        <th className="px-4 py-3 font-medium">So luong</th>
                        <th className="px-4 py-3 font-medium">Tinh trang khi ban giao</th>
                        <th className="px-4 py-3 font-medium">Ghi chu</th>
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
                title={isStudent ? 'Xac nhan bien ban' : 'Workflow bien ban'}
                description={
                  isStudent
                    ? 'Sinh vien xem ky thong tin truoc khi xac nhan bien ban ban giao.'
                    : 'Quan ly gui xac nhan, huy bien ban hoac ghi nhan tra tai san.'
                }
              >
                <div className="space-y-4">
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-700">Ghi chu</span>
                    <textarea
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      className={`${inputClassName} min-h-28`}
                      placeholder="Them ghi chu cho bien ban neu can."
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
                        Gui cho sinh vien xac nhan
                      </button>
                    )}

                    {isStudent && handover.status === 'WAITING_CONFIRMATION' && (
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => void runWorkflow('confirm')}
                        className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
                      >
                        Xac nhan bien ban
                      </button>
                    )}

                    {isManager && handover.status === 'CONFIRMED' && (
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => void runWorkflow('mark-returned')}
                        className="rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:opacity-60"
                      >
                        Ghi nhan tra tai san
                      </button>
                    )}

                    {isManager && ['DRAFT', 'WAITING_CONFIRMATION'].includes(handover.status) && (
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => void runWorkflow('cancel')}
                        className="rounded-xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
                      >
                        Huy bien ban
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
