import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { SectionCard } from '../../components/admin/SectionCard';
import { apiClient } from '../../lib/axios';
import { getApiErrorMessage } from '../../lib/api-error';
import { useToast } from '../../toast/toast-context';
import { DamageReportStudentAssetsResponse } from '../../types/damage-reports';

const createSchema = z.object({
  assetId: z.coerce.number().int().positive(),
  description: z.string().min(10, 'Mô tả tối thiểu 10 ký tự.'),
  location: z.string().min(3, 'Vị trí tối thiểu 3 ký tự.'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
});

type CreateFormValues = z.infer<typeof createSchema>;

export function StudentCreateDamageReportPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [lookup, setLookup] = useState<DamageReportStudentAssetsResponse>({
    room: null,
    assets: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      assetId: 1,
      description: '',
      location: '',
      priority: 'MEDIUM',
    },
  });

  useEffect(() => {
    void loadLookup();
  }, []);

  const loadLookup = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await apiClient.get<DamageReportStudentAssetsResponse>(
        '/damage-reports/my-assets',
      );
      setLookup(response.data);

      if (response.data.assets[0]) {
        reset({
          assetId: response.data.assets[0].id,
          description: '',
          location: '',
          priority: 'MEDIUM',
        });
      }
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Không thể tải danh sách tài sản trong phòng.'));
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    if (!lookup.room) {
      setErrorMessage('Bạn chưa được gán phòng nên chưa thể tạo phiếu báo hỏng.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = await apiClient.post('/damage-reports', {
        assetId: values.assetId,
        roomId: lookup.room.id,
        description: values.description.trim(),
        location: values.location.trim(),
        priority: values.priority,
      });

      showToast('Tạo phiếu báo hỏng thành công.');
      navigate(`/student/damage-reports/${response.data.id}`);
    } catch (error) {
      const message = getApiErrorMessage(error, 'Không thể tạo phiếu báo hỏng.');
      setErrorMessage(message);
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <div className="space-y-6">
      <SectionCard
        title="Tạo phiếu báo hỏng"
        description="Sinh viên chỉ được báo hỏng đối với tài sản thuộc phòng đang ở."
      >
        {isLoading ? (
          <div className="rounded-2xl bg-slate-50 px-6 py-12 text-center text-sm text-slate-600">
            Đang tải danh sách tài sản trong phòng...
          </div>
        ) : !lookup.room ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-700">
            Bạn chưa được gán phòng. Vui lòng liên hệ quản trị để cập nhật thông tin nội trú.
          </div>
        ) : lookup.assets.length === 0 ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-700">
            Phòng của bạn hiện chưa có tài sản nào được gán. Không thể tạo phiếu báo hỏng lúc này.
          </div>
        ) : (
          <form className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]" onSubmit={onSubmit}>
            <div className="rounded-2xl bg-slate-50 p-4">
              <h3 className="text-base font-semibold text-slate-900">Thông tin phòng</h3>
              <dl className="mt-4 space-y-3 text-sm text-slate-700">
                <div>
                  <dt className="text-slate-500">Phòng</dt>
                  <dd className="font-medium">{lookup.room.roomCode}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Tầng</dt>
                  <dd className="font-medium">
                    {lookup.room.floor?.building?.name ?? 'Khu'} / Tầng{' '}
                    {lookup.room.floor?.floorNumber ?? '--'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Tài sản có thể báo hỏng</dt>
                  <dd className="font-medium">{lookup.assets.length}</dd>
                </div>
              </dl>
            </div>

            <div className="space-y-4">
              <Field label="Tài sản" error={errors.assetId?.message}>
                <select {...register('assetId')} className={inputClassName}>
                  {lookup.assets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.assetCode} - {asset.assetName}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Mức độ ưu tiên" error={errors.priority?.message}>
                <select {...register('priority')} className={inputClassName}>
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="URGENT">URGENT</option>
                </select>
              </Field>

              <Field label="Vị trí" error={errors.location?.message}>
                <input
                  {...register('location')}
                  type="text"
                  className={inputClassName}
                  placeholder="Ví dụ: Góc tường phía tây, mặt bàn, cánh cửa..."
                />
              </Field>

              <Field label="Mô tả hư hỏng" error={errors.description?.message}>
                <textarea
                  {...register('description')}
                  className={`${inputClassName} min-h-36`}
                  placeholder="Mô tả rõ hiện tượng hư hỏng, thời điểm xảy ra và mức độ ảnh hưởng."
                />
              </Field>

              {errorMessage && (
                <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {errorMessage}
                </p>
              )}

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
                >
                  {isSubmitting ? 'Đang gửi...' : 'Gửi phiếu báo hỏng'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/student/damage-reports')}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Xem lịch sử
                </button>
              </div>
            </div>
          </form>
        )}
      </SectionCard>
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
