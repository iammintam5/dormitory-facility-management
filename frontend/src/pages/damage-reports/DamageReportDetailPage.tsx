import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router-dom';
import { z } from 'zod';
import { SectionCard } from '../../components/admin/SectionCard';
import {
  DamageReportPriorityBadge,
  DamageReportStatusBadge,
} from '../../components/damage-reports/DamageReportBadge';
import { DamageReportTimeline } from '../../components/damage-reports/DamageReportTimeline';
import { useAuth } from '../../auth/auth-context';
import { apiClient } from '../../lib/axios';
import { getApiErrorMessage } from '../../lib/api-error';
import { formatDateTime } from '../../lib/format';
import { useToast } from '../../toast/toast-context';
import { DamageReport, DamageReportStudentAssetsResponse } from '../../types/damage-reports';

const updateSchema = z.object({
  assetId: z.coerce.number().int().positive(),
  description: z.string().min(10, 'Mo ta toi thieu 10 ky tu.'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
});

const workflowSchema = z.object({
  note: z.string().optional(),
  assetStatus: z.enum(['AVAILABLE', 'UNDER_MAINTENANCE']).optional(),
});

type UpdateFormValues = z.infer<typeof updateSchema>;
type WorkflowFormValues = z.infer<typeof workflowSchema>;

export function DamageReportDetailPage() {
  const { id } = useParams();
  const reportId = Number(id);
  const { user } = useAuth();
  const { showToast } = useToast();
  const [report, setReport] = useState<DamageReport | null>(null);
  const [studentAssets, setStudentAssets] = useState<DamageReportStudentAssetsResponse>({
    room: null,
    assets: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const updateForm = useForm<UpdateFormValues>({
    resolver: zodResolver(updateSchema),
    defaultValues: {
      assetId: 1,
      description: '',
      priority: 'MEDIUM',
    },
  });

  const workflowForm = useForm<WorkflowFormValues>({
    resolver: zodResolver(workflowSchema),
    defaultValues: {
      note: '',
      assetStatus: 'AVAILABLE',
    },
  });

  useEffect(() => {
    if (!Number.isFinite(reportId)) {
      return;
    }

    void loadData();
  }, [reportId]);

  const basePath = user?.role === 'ADMIN' ? '/admin' : user?.role === 'QL_CSVC' ? '/manager' : '/student';
  const isStudent = user?.role === 'STUDENT';
  const canStudentUpdate = isStudent && report?.status === 'PENDING';
  const canManagerProcess = ['ADMIN', 'QL_CSVC'].includes(user?.role ?? '');

  async function loadData() {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const [reportResponse, studentAssetsResponse] = await Promise.all([
        apiClient.get<DamageReport>(`/damage-reports/${reportId}`),
        isStudent
          ? apiClient.get<DamageReportStudentAssetsResponse>('/damage-reports/my-assets')
          : Promise.resolve({ data: { room: null, assets: [] } }),
      ]);

      setReport(reportResponse.data);
      setStudentAssets(studentAssetsResponse.data);
      updateForm.reset({
        assetId: reportResponse.data.assetId,
        description: reportResponse.data.description,
        priority: reportResponse.data.priority,
      });
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Khong the tai chi tiet phieu bao hong.'));
    } finally {
      setIsLoading(false);
    }
  }

  const submitUpdate = updateForm.handleSubmit(async (values) => {
    if (!report) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await apiClient.patch(`/damage-reports/${report.id}`, {
        assetId: values.assetId,
        roomId: report.roomId,
        description: values.description.trim(),
        priority: values.priority,
      });
      showToast('Cap nhat phieu bao hong thanh cong.');
      setIsEditing(false);
      await loadData();
    } catch (error) {
      const message = getApiErrorMessage(error, 'Khong the cap nhat phieu bao hong.');
      setErrorMessage(message);
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  });

  const runWorkflow = async (endpoint: string, body: Record<string, unknown>) => {
    if (!report) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await apiClient.post(`/damage-reports/${report.id}/${endpoint}`, body);
      showToast('Cap nhat trang thai thanh cong.');
      workflowForm.reset({
        note: '',
        assetStatus: 'AVAILABLE',
      });
      await loadData();
    } catch (error) {
      const message = getApiErrorMessage(error, 'Khong the cap nhat trang thai.');
      setErrorMessage(message);
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-slate-50 px-6 py-12 text-center text-sm text-slate-600">
        Dang tai chi tiet phieu bao hong...
      </div>
    );
  }

  if (!report) {
    return (
      <div className="rounded-2xl bg-rose-50 px-6 py-12 text-center text-sm text-rose-700">
        {errorMessage || 'Khong tim thay phieu bao hong.'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <Link
          to={`${basePath}/damage-reports`}
          className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Quay lai danh sach
        </Link>
        <Link
          to={`/print/damage-report/${reportId}`}
          className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Preview in
        </Link>
        {isStudent && (
          <Link
            to="/student/damage-reports/new"
            className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Tao phieu moi
          </Link>
        )}
      </div>

      {errorMessage && (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</p>
      )}

      <SectionCard
        title="Chi tiet phieu bao hong"
        description="Theo doi thong tin phieu, tien do xu ly va timeline xu ly tai san."
      >
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {report.reportCode}
                  </p>
                  <h2 className="mt-2 text-xl font-bold text-slate-900">
                    {report.asset?.assetName ?? 'Tai san'}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Phong {report.room?.roomCode ?? '--'} / {report.room?.floor?.block?.name ?? 'Khu'} / Tang{' '}
                    {report.room?.floor?.floorNumber ?? '--'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <DamageReportStatusBadge status={report.status} />
                  <DamageReportPriorityBadge priority={report.priority} />
                </div>
              </div>

              <dl className="mt-5 grid gap-4 md:grid-cols-2">
                <InfoItem label="Nguoi bao hong" value={`${report.reporter?.fullName ?? '--'} (${report.reporter?.userCode ?? '--'})`} />
                <InfoItem label="Tai san" value={`${report.asset?.assetCode ?? '--'} - ${report.asset?.assetName ?? '--'}`} />
                <InfoItem label="Ngay tao" value={formatDateTime(report.createdAt)} />
                <InfoItem label="Cap nhat gan nhat" value={formatDateTime(report.updatedAt ?? report.createdAt)} />
              </dl>

              <div className="mt-5 rounded-2xl bg-white p-4">
                <p className="text-sm font-medium text-slate-700">Mo ta hu hong</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{report.description}</p>
              </div>
            </div>

            <SectionCard
              title="Timeline xu ly"
              description="Tat ca buoc thay doi trang thai deu duoc ghi lai de theo doi lich su xu ly."
            >
              <DamageReportTimeline logs={report.damageReportLogs ?? []} />
            </SectionCard>
          </div>

          <div className="space-y-6">
            {canStudentUpdate && (
              <SectionCard
                title="Thao tac sinh vien"
                description="Sinh vien chi duoc sua hoac huy phieu khi trang thai con PENDING."
              >
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => setIsEditing((current) => !current)}
                      className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      {isEditing ? 'Dong form sua' : 'Sua phieu'}
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => void runWorkflow('cancel', { note: 'Sinh vien huy phieu khi chua xu ly.' })}
                      className="rounded-xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
                    >
                      Huy phieu
                    </button>
                  </div>

                  {isEditing && (
                    <form className="space-y-4" onSubmit={submitUpdate}>
                      <Field label="Tai san" error={updateForm.formState.errors.assetId?.message}>
                        <select {...updateForm.register('assetId')} className={inputClassName}>
                          {studentAssets.assets.map((asset) => (
                            <option key={asset.id} value={asset.id}>
                              {asset.assetCode} - {asset.assetName}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Uu tien" error={updateForm.formState.errors.priority?.message}>
                        <select {...updateForm.register('priority')} className={inputClassName}>
                          <option value="LOW">LOW</option>
                          <option value="MEDIUM">MEDIUM</option>
                          <option value="HIGH">HIGH</option>
                          <option value="URGENT">URGENT</option>
                        </select>
                      </Field>
                      <Field label="Mo ta" error={updateForm.formState.errors.description?.message}>
                        <textarea
                          {...updateForm.register('description')}
                          className={`${inputClassName} min-h-32`}
                        />
                      </Field>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
                      >
                        {isSubmitting ? 'Dang luu...' : 'Luu thay doi'}
                      </button>
                    </form>
                  )}
                </div>
              </SectionCard>
            )}

            {canManagerProcess && (
              <SectionCard
                title="Workflow xu ly"
                description="Bo phan CSVC cap nhat trang thai theo tung buoc va gui thong bao cho sinh vien."
              >
                <div className="space-y-4">
                  <Field label="Ghi chu workflow">
                    <textarea
                      {...workflowForm.register('note')}
                      className={`${inputClassName} min-h-28`}
                      placeholder="Them ghi chu cho buoc xu ly hien tai."
                    />
                  </Field>

                  {report.status === 'PROCESSING' && (
                    <Field label="Trang thai tai san sau khi hoan tat">
                      <select {...workflowForm.register('assetStatus')} className={inputClassName}>
                        <option value="AVAILABLE">AVAILABLE</option>
                        <option value="UNDER_MAINTENANCE">UNDER_MAINTENANCE</option>
                      </select>
                    </Field>
                  )}

                  <div className="flex flex-wrap gap-3">
                    {report.status === 'PENDING' && (
                      <>
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => void runWorkflow('accept', { note: workflowForm.getValues('note') })}
                          className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
                        >
                          Tiep nhan
                        </button>
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => void runWorkflow('reject', { note: workflowForm.getValues('note') })}
                          className="rounded-xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
                        >
                          Tu choi
                        </button>
                      </>
                    )}

                    {report.status === 'RECEIVED' && (
                      <>
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() =>
                            void runWorkflow('start-processing', { note: workflowForm.getValues('note') })
                          }
                          className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
                        >
                          Chuyen xu ly
                        </button>
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => void runWorkflow('reject', { note: workflowForm.getValues('note') })}
                          className="rounded-xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
                        >
                          Tu choi
                        </button>
                      </>
                    )}

                    {report.status === 'PROCESSING' && (
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() =>
                          void runWorkflow('complete', {
                            note: workflowForm.getValues('note'),
                            assetStatus: workflowForm.getValues('assetStatus'),
                          })
                        }
                        className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
                      >
                        Hoan tat xu ly
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

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </label>
  );
}

const inputClassName =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500';
