import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router-dom';
import { z } from 'zod';
import { SectionCard } from '../../components/admin/SectionCard';
import { Modal } from '../../components/ui/Modal';
import { ProgressStepper } from '../../components/ui/ProgressStepper';
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

type UpdateFormValues = z.infer<typeof updateSchema>;

type WorkflowActionType = {
  endpoint: string;
  title: string;
  requireAssetStatus?: boolean;
};

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

  const [confirmAction, setConfirmAction] = useState<WorkflowActionType | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [assetStatus, setAssetStatus] = useState<'AVAILABLE' | 'UNDER_MAINTENANCE'>('AVAILABLE');

  const updateForm = useForm<UpdateFormValues>({
    resolver: zodResolver(updateSchema),
    defaultValues: {
      assetId: 1,
      description: '',
      priority: 'MEDIUM',
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
  const canStudentUpdate = isStudent && report?.status === 'SUBMITTED';
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

  const runWorkflow = async () => {
    if (!report || !confirmAction) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await apiClient.post(`/damage-reports/${report.id}/${confirmAction.endpoint}`, {
        note: actionNote,
        ...(confirmAction.requireAssetStatus ? { assetStatus } : {}),
      });
      showToast('Cap nhat trang thai thanh cong.');
      setConfirmAction(null);
      setActionNote('');
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
      <div className="flex h-64 items-center justify-center rounded-2xl bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-500"></div>
          <p className="text-sm font-medium text-slate-500">Dang tai chi tiet phieu bao hong...</p>
        </div>
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

  const isUrgent = report.priority === 'URGENT' || report.priority === 'HIGH';

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          to={`${basePath}/damage-reports`}
          className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Quay lại danh sách
        </Link>
        <div className="flex gap-3">
          <Link
            to={`/print/damage-report/${reportId}`}
            className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            In phiếu
          </Link>
          {isStudent && (
            <Link
              to="/student/damage-reports/new"
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 shadow-sm"
            >
              Tạo phiếu mới
            </Link>
          )}
        </div>
      </div>

      {errorMessage && (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 ring-1 ring-inset ring-rose-200">{errorMessage}</p>
      )}

      {/* Progress Stepper */}
      <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <ProgressStepper currentStatus={report.status} />
      </div>

      {/* Manager Action Callout */}
      {canManagerProcess && ['SUBMITTED', 'REVIEWING'].includes(report.status) && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 p-6 ring-1 ring-amber-200 shadow-sm border-l-4 border-l-amber-500">
          <div>
            <h3 className="text-lg font-bold text-amber-900">Phiếu đang chờ xử lý!</h3>
            <p className="mt-1 text-sm text-amber-700">Vui lòng kiểm tra thông tin và thực hiện điều phối hoặc từ chối phiếu này.</p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            {report.status === 'SUBMITTED' && (
              <>
                <button
                  type="button"
                  onClick={() => setConfirmAction({ endpoint: 'accept', title: 'Tiếp nhận phiếu' })}
                  className="rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-amber-500 flex items-center gap-2"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Tiếp nhận
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmAction({ endpoint: 'reject', title: 'Từ chối phiếu' })}
                  className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-rose-600 shadow-sm ring-1 ring-inset ring-rose-200 transition hover:bg-rose-50 flex items-center gap-2"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Từ chối
                </button>
              </>
            )}
            {report.status === 'REVIEWING' && (
              <>
                <button
                  type="button"
                  onClick={() => setConfirmAction({ endpoint: 'start-processing', title: 'Bắt đầu xử lý / Sửa chữa' })}
                  className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-500 flex items-center gap-2"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Chuyển đi sửa
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
        {/* Left Column: Details */}
        <div className="space-y-6">
          <div className={`relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm ring-1 ${isUrgent ? 'ring-rose-300' : 'ring-slate-200'}`}>
            {/* Background decoration for urgent */}
            {isUrgent && (
              <div className="absolute right-0 top-0 -mr-16 -mt-16 h-32 w-32 rounded-full bg-rose-100 opacity-50 blur-3xl"></div>
            )}
            
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-bold uppercase tracking-widest text-slate-400">
                    {report.reportCode}
                  </p>
                  {isUrgent && (
                    <span className="flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700 animate-pulse">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      KHẨN CẤP
                    </span>
                  )}
                </div>
                <h1 className="mt-2 text-2xl font-black text-slate-900">
                  {report.asset?.assetName ?? 'Tài sản không xác định'}
                </h1>
                <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                  <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span>Phòng {report.room?.roomCode ?? '--'} • Tầng {report.room?.floor?.floorNumber ?? '--'} • Khu {report.room?.floor?.building?.name ?? '--'}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <DamageReportStatusBadge status={report.status} />
                <DamageReportPriorityBadge priority={report.priority} />
              </div>
            </div>

            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-200/50">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Người báo hỏng</p>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                    {report.reporter?.fullName?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{report.reporter?.fullName ?? 'Không rõ'}</p>
                    <p className="text-xs text-slate-500">MSSV: {report.reporter?.userCode ?? '--'}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-200/50">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Thông tin Tài sản</p>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 ring-1 ring-inset ring-indigo-100">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{report.asset?.assetCode ?? '--'}</p>
                    <p className="text-xs text-slate-500">Trạng thái: {report.asset?.status ?? '--'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className={`mt-6 rounded-xl p-5 ${isUrgent ? 'bg-rose-50/50 ring-1 ring-inset ring-rose-100' : 'bg-slate-50 ring-1 ring-inset ring-slate-200/50'}`}>
              <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
                Mô tả chi tiết hư hỏng
              </p>
              <div className="mt-3 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                {report.description}
              </div>
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

          {/* Student Actions */}
          {canStudentUpdate && (
            <SectionCard
              title="Cập nhật Phiếu"
              description="Bạn có thể chỉnh sửa thông tin hoặc hủy bỏ phiếu báo hỏng khi chưa được bộ phận CSVC tiếp nhận."
            >
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditing((current) => !current)}
                    className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 flex items-center gap-2"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    {isEditing ? 'Đóng form sửa' : 'Chỉnh sửa phiếu'}
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setConfirmAction({ endpoint: 'cancel', title: 'Hủy phiếu báo hỏng' })}
                    className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-rose-600 shadow-sm ring-1 ring-inset ring-rose-200 transition hover:bg-rose-50 disabled:opacity-60 flex items-center gap-2"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Hủy phiếu
                  </button>
                </div>

                {isEditing && (
                  <form className="mt-6 space-y-5 rounded-xl border border-slate-200 bg-slate-50 p-5" onSubmit={submitUpdate}>
                    <Field label="Tài sản" error={updateForm.formState.errors.assetId?.message}>
                      <select {...updateForm.register('assetId')} className={inputClassName}>
                        {studentAssets.assets.map((asset) => (
                          <option key={asset.id} value={asset.id}>
                            {asset.assetCode} - {asset.assetName}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Mức độ ưu tiên" error={updateForm.formState.errors.priority?.message}>
                      <select {...updateForm.register('priority')} className={inputClassName}>
                        <option value="LOW">Thấp</option>
                        <option value="MEDIUM">Trung bình</option>
                        <option value="HIGH">Cao</option>
                        <option value="URGENT">Khẩn cấp</option>
                      </select>
                    </Field>
                    <Field label="Mô tả chi tiết" error={updateForm.formState.errors.description?.message}>
                      <textarea
                        {...updateForm.register('description')}
                        className={`${inputClassName} min-h-32`}
                        placeholder="Mô tả chi tiết tình trạng hư hỏng..."
                      />
                    </Field>
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-60"
                      >
                        {isSubmitting ? 'Đang lưu...' : 'Lưu cập nhật'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </SectionCard>
          )}

          {/* Manager Finish Actions */}
          {canManagerProcess && report.status === 'IN_PROGRESS' && (
            <div className="rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50 p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="mt-3 text-lg font-bold text-emerald-900">Hoàn tất sửa chữa</h3>
              <p className="mt-1 text-sm text-emerald-700">Nếu tài sản đã được sửa xong hoặc bộ phận bảo trì đã xử lý xong, hãy đóng phiếu này.</p>
              <button
                type="button"
                onClick={() => setConfirmAction({ endpoint: 'complete', title: 'Hoàn tất quy trình', requireAssetStatus: true })}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-500"
              >
                Hoàn tất phiếu báo hỏng
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Timeline */}
        <div className="space-y-6">
          <SectionCard
            title="Lịch sử xử lý"
            description="Các bước thay đổi trạng thái"
          >
            <DamageReportTimeline logs={report.damageReportLogs ?? []} />
          </SectionCard>
        </div>
      </div>

      {/* Action Modal */}
      <Modal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        title={confirmAction?.title ?? 'Xác nhận'}
        footer={
          <>
            <button
              onClick={() => setConfirmAction(null)}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              onClick={() => void runWorkflow()}
              disabled={isSubmitting}
              className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting && (
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              Xác nhận
            </button>
          </>
        }
      >
        <div className="space-y-5 py-2">
          {confirmAction?.requireAssetStatus && (
            <div className="space-y-2 rounded-lg bg-amber-50 p-4 ring-1 ring-inset ring-amber-200/50">
              <label className="text-sm font-bold text-amber-900">Trạng thái tài sản sau hoàn tất</label>
              <p className="text-xs text-amber-700 mb-2">Cập nhật lại trạng thái tài sản vào kho dữ liệu.</p>
              <select
                value={assetStatus}
                onChange={(e) => setAssetStatus(e.target.value as any)}
                className="w-full rounded-xl border border-amber-200 p-3 text-sm font-medium outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              >
                <option value="AVAILABLE">AVAILABLE (Có thể sử dụng bình thường)</option>
                <option value="UNDER_MAINTENANCE">UNDER_MAINTENANCE (Vẫn đang bảo trì)</option>
              </select>
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Ghi chú (Tùy chọn)</label>
            <textarea
              value={actionNote}
              onChange={(e) => setActionNote(e.target.value)}
              placeholder="Nhập ghi chú hoặc lý do..."
              className="min-h-28 w-full rounded-xl border border-slate-200 p-4 text-sm outline-none transition focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
            />
          </div>
        </div>
      </Modal>
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
      <span className="text-sm font-bold text-slate-700">{label}</span>
      {children}
      {error && <span className="text-xs font-medium text-rose-600">{error}</span>}
    </label>
  );
}

const inputClassName =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-medium outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500';
