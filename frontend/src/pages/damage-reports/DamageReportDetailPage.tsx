import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router-dom';
import { z } from 'zod';
import { SectionCard } from '../../components/admin/SectionCard';
import { DamageReportPriorityBadge, DamageReportStatusBadge } from '../../components/damage-reports/DamageReportBadge';
import { DamageReportTimeline } from '../../components/damage-reports/DamageReportTimeline';
import { Field } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { ProgressStepper } from '../../components/ui/ProgressStepper';
import { useAuth } from '../../auth/auth-context';
import { getDamageReportById, updateDamageReport, acceptDamageReport, rejectDamageReport, startProcessingReport, completeReport, cancelReport } from '../../services/damage-reports';
import { getAssets } from '../../services/assets';
import { formatDateTime } from '../../lib/date';
import { useToast } from '../../toast/toast-context';
import { DamageReport, DamageReportStudentAssetsResponse } from '../../types/damage-reports';

const updateSchema = z.object({
  assetId: z.coerce.number().int().positive(),
  description: z.string().min(10, 'Mô tả tối thiểu 10 ký tự.'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
});

type UpdateFormValues = z.infer<typeof updateSchema>;
type WorkflowActionType = { endpoint: string; title: string; requireAssetStatus?: boolean };

export function DamageReportDetailPage() {
  const { id } = useParams();
  const reportId = Number(id);
  const { user } = useAuth();
  const { showToast } = useToast();
  const [report, setReport] = useState<DamageReport | null>(null);
  const [studentAssets, setStudentAssets] = useState<DamageReportStudentAssetsResponse>({ room: null, assets: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState<WorkflowActionType | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [assetStatus, setAssetStatus] = useState<'AVAILABLE' | 'UNDER_MAINTENANCE'>('AVAILABLE');

  const form = useForm<UpdateFormValues>({
    resolver: zodResolver(updateSchema),
    defaultValues: { assetId: 1, description: '', priority: 'MEDIUM' },
  });

  const basePath = user?.role === 'ADMIN' ? '/admin' : user?.role === 'MANAGER' ? '/manager' : '/student';
  const isStudent = user?.role === 'STUDENT';
  const canStudentUpdate = isStudent && report?.status === 'SUBMITTED';
  const canManagerProcess = ['MANAGER'].includes(user?.role ?? '');

  useEffect(() => {
    if (!Number.isFinite(reportId)) return;
    void loadData();
  }, [reportId, isStudent]);

  async function loadData() {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const reportResponse = await getDamageReportById(reportId);
      setReport(reportResponse);
      if (isStudent) {
        const assetData = await getAssets({ pageSize: 100 });
        setStudentAssets({
          room: null,
          assets: assetData.items.map((a: any) => ({
            id: parseInt(a.id),
            categoryId: 1,
            assetCode: a.assetCode,
            assetName: a.assetName,
            status: a.status,
            description: a.description,
            yearInUse: null,
            createdAt: a.createdAt
          }))
        });
      }
      form.reset({
        assetId: reportResponse.assetId,
        description: reportResponse.description,
        priority: reportResponse.priority as any,
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể tải chi tiết phiếu báo hỏng.');
    } finally {
      setIsLoading(false);
    }
  }

  const submitUpdate = form.handleSubmit(async (values) => {
    if (!report) return;
    setIsSubmitting(true);
    try {
      await updateDamageReport(report.id, {
        assetId: values.assetId,
        description: values.description,
        priority: values.priority,
      });
      showToast('Đã cập nhật phiếu báo hỏng.');
      setIsEditing(false);
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể cập nhật phiếu báo hỏng.';
      setErrorMessage(message);
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  });

  async function runWorkflow() {
    if (!report || !confirmAction) return;
    setIsSubmitting(true);
    try {
      const workflowMap: Record<string, (id: number) => Promise<any>> = {
        'accept': acceptDamageReport,
        'reject': rejectDamageReport,
        'start-processing': startProcessingReport,
        'complete': completeReport,
        'cancel': cancelReport,
      };
      const fn = workflowMap[confirmAction.endpoint];
      if (fn) await fn(report.id);
      showToast('Đã cập nhật trạng thái phiếu.');
      setConfirmAction(null);
      setActionNote('');
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể cập nhật trạng thái.';
      setErrorMessage(message);
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) return <div className="flex h-64 items-center justify-center rounded-2xl bg-slate-50 text-sm text-slate-600">Đang tải chi tiết phiếu báo hỏng...</div>;
  if (!report) return <div className="rounded-2xl bg-rose-50 px-6 py-12 text-center text-sm text-rose-700">{errorMessage || 'Không tìm thấy phiếu báo hỏng.'}</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link to={`${basePath}/damage-reports`} className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 hover:bg-slate-50">
          Quay lại danh sách
        </Link>
        <div className="flex gap-3">
          <Link to={`/print/damage-report/${reportId}`} className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 hover:bg-slate-50">
            In phiếu
          </Link>
          {isStudent && <Link to="/student/damage-reports" className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 shadow-sm">Quay về lịch sử</Link>}
        </div>
      </div>

      {errorMessage && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{errorMessage}</p>}

      <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <ProgressStepper currentStatus={report.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-widest text-slate-400">{report.reportCode}</p>
                <h1 className="mt-2 text-2xl font-black text-slate-900">{report.asset?.assetName ?? 'Tài sản không xác định'}</h1>
                <p className="mt-2 text-sm text-slate-600">
                  Phòng {report.room?.roomCode ?? '--'} • {report.room?.floor?.building?.name ?? '--'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <DamageReportStatusBadge status={report.status} />
                <DamageReportPriorityBadge priority={report.priority} />
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <InfoBox label="Người báo hỏng" value={`${report.reporter?.fullName ?? '--'} (${report.reporter?.userCode ?? '--'})`} />
              <InfoBox label="Tài sản" value={`${report.asset?.assetCode ?? '--'} • ${report.asset?.status ?? '--'}`} />
            </div>

            <div className="mt-6 rounded-xl bg-slate-50 p-5 ring-1 ring-inset ring-slate-200/50">
              <p className="text-sm font-bold text-slate-700">Mô tả chi tiết hư hỏng</p>
              <div className="mt-3 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">{report.description}</div>
              <div className="mt-4 flex items-center gap-4 border-t border-slate-200 pt-4">
                <div>
                  <p className="text-xs text-slate-500">Ngày tạo phiếu</p>
                  <p className="mt-0.5 text-xs font-semibold text-slate-700">{formatDateTime(report.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Cập nhật gần nhất</p>
                  <p className="mt-0.5 text-xs font-semibold text-slate-700">{formatDateTime(report.updatedAt ?? report.createdAt)}</p>
                </div>
              </div>
            </div>
          </div>

          {canStudentUpdate && (
            <SectionCard title="Cập nhật phiếu" description="Sinh viên có thể chỉnh sửa hoặc hủy phiếu khi chưa được CSVC tiếp nhận.">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={() => setIsEditing((current) => !current)} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800">
                    {isEditing ? 'Đóng form sửa' : 'Chỉnh sửa phiếu'}
                  </button>
                  <button type="button" disabled={isSubmitting} onClick={() => setConfirmAction({ endpoint: 'cancel', title: 'Hủy phiếu báo hỏng' })} className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-rose-600 ring-1 ring-inset ring-rose-200 hover:bg-rose-50 disabled:opacity-60">
                    Hủy phiếu
                  </button>
                </div>

                {isEditing && (
                  <form className="space-y-5 rounded-xl border border-slate-200 bg-slate-50 p-5" onSubmit={submitUpdate}>
                    <Field label="Tài sản" error={form.formState.errors.assetId?.message}>
                      <select {...form.register('assetId')} className={inputClassName}>
                        {studentAssets.assets.map((asset) => (
                          <option key={asset.id} value={asset.id}>
                            {asset.assetCode} - {asset.assetName}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Mức độ ưu tiên" error={form.formState.errors.priority?.message}>
                      <select {...form.register('priority')} className={inputClassName}>
                        <option value="LOW">Thấp</option>
                        <option value="MEDIUM">Trung bình</option>
                        <option value="HIGH">Cao</option>
                        <option value="URGENT">Khẩn cấp</option>
                      </select>
                    </Field>
                    <Field label="Mô tả chi tiết" error={form.formState.errors.description?.message}>
                      <textarea {...form.register('description')} className={`${inputClassName} min-h-32`} />
                    </Field>
                    <button type="submit" disabled={isSubmitting} className="w-full rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-60">
                      {isSubmitting ? 'Đang lưu...' : 'Lưu cập nhật'}
                    </button>
                  </form>
                )}
              </div>
            </SectionCard>
          )}

          {canManagerProcess && ['SUBMITTED', 'REVIEWING', 'IN_PROGRESS'].includes(report.status) && (
            <SectionCard title="Xử lý phiếu" description="Các thao tác mô phỏng quy trình xử lý dành cho quản lý và admin.">
              <div className="flex flex-wrap gap-3">
                {report.status === 'SUBMITTED' && (
                  <>
                    <button type="button" onClick={() => setConfirmAction({ endpoint: 'accept', title: 'Tiếp nhận phiếu' })} className="rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-500">Tiếp nhận</button>
                    <button type="button" onClick={() => setConfirmAction({ endpoint: 'reject', title: 'Từ chối phiếu' })} className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-rose-600 ring-1 ring-inset ring-rose-200 hover:bg-rose-50">Từ chối</button>
                  </>
                )}
                {report.status === 'REVIEWING' && (
                  <button type="button" onClick={() => setConfirmAction({ endpoint: 'start-processing', title: 'Bắt đầu xử lý' })} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-500">Chuyển đi sửa</button>
                )}
                {report.status === 'IN_PROGRESS' && (
                  <button type="button" onClick={() => setConfirmAction({ endpoint: 'complete', title: 'Hoàn tất quy trình', requireAssetStatus: true })} className="rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-sky-500">Hoàn tất phiếu</button>
                )}
              </div>
            </SectionCard>
          )}
        </div>

        <SectionCard title="Lịch sử xử lý" description="Các bước thay đổi trạng thái của phiếu báo hỏng.">
          <DamageReportTimeline logs={report.damageReportLogs ?? []} />
        </SectionCard>
      </div>

      <Modal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        title={confirmAction?.title ?? 'Xác nhận'}
        footer={
          <>
            <button onClick={() => setConfirmAction(null)} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Hủy</button>
            <button onClick={() => void runWorkflow()} disabled={isSubmitting} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50">Xác nhận</button>
          </>
        }
      >
        <div className="space-y-5 py-2">
          {confirmAction?.requireAssetStatus && (
            <div className="space-y-2 rounded-lg bg-amber-50 p-4 ring-1 ring-inset ring-amber-200/50">
              <label className="text-sm font-bold text-amber-900">Trạng thái tài sản sau hoàn tất</label>
              <select value={assetStatus} onChange={(event) => setAssetStatus(event.target.value as 'AVAILABLE' | 'UNDER_MAINTENANCE')} className="w-full rounded-xl border border-amber-200 p-3 text-sm font-medium outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500">
                <option value="AVAILABLE">AVAILABLE</option>
                <option value="UNDER_MAINTENANCE">UNDER_MAINTENANCE</option>
              </select>
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Ghi chú</label>
            <textarea value={actionNote} onChange={(event) => setActionNote(event.target.value)} className="min-h-28 w-full rounded-xl border border-slate-200 p-4 text-sm outline-none transition focus:border-slate-500 focus:ring-1 focus:ring-slate-500" />
          </div>
        </div>
      </Modal>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-200/50">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-3 font-semibold text-slate-900">{value}</p>
    </div>
  );
}

const inputClassName =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-medium outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500';
