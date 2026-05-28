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
  description: z.string().min(10, 'Mo ta toi thieu 10 ky tu.'),
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
          priority: 'MEDIUM',
        });
      }
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Khong the tai danh sach tai san trong phong.'));
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    if (!lookup.room) {
      setErrorMessage('Ban chua duoc gan phong nen chua the tao phieu bao hong.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = await apiClient.post('/damage-reports', {
        assetId: values.assetId,
        roomId: lookup.room.id,
        description: values.description.trim(),
        priority: values.priority,
      });

      showToast('Tao phieu bao hong thanh cong.');
      navigate(`/student/damage-reports/${response.data.id}`);
    } catch (error) {
      const message = getApiErrorMessage(error, 'Khong the tao phieu bao hong.');
      setErrorMessage(message);
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <div className="space-y-6">
      <SectionCard
        title="Tao phieu bao hong"
        description="Sinh vien chi duoc bao hong doi voi tai san thuoc phong dang o."
      >
        {isLoading ? (
          <div className="rounded-2xl bg-slate-50 px-6 py-12 text-center text-sm text-slate-600">
            Dang tai danh sach tai san trong phong...
          </div>
        ) : !lookup.room ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-700">
            Ban chua duoc gan phong. Vui long lien he quan tri de cap nhat thong tin noi tru.
          </div>
        ) : lookup.assets.length === 0 ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-700">
            Phong cua ban hien chua co tai san nao duoc gan. Khong the tao phieu bao hong luc nay.
          </div>
        ) : (
          <form className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]" onSubmit={onSubmit}>
            <div className="rounded-2xl bg-slate-50 p-4">
              <h3 className="text-base font-semibold text-slate-900">Thong tin phong</h3>
              <dl className="mt-4 space-y-3 text-sm text-slate-700">
                <div>
                  <dt className="text-slate-500">Phong</dt>
                  <dd className="font-medium">{lookup.room.roomCode}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Tang</dt>
                  <dd className="font-medium">
                    {lookup.room.floor?.building?.name ?? 'Khu'} / Tang{' '}
                    {lookup.room.floor?.floorNumber ?? '--'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Tai san co the bao hong</dt>
                  <dd className="font-medium">{lookup.assets.length}</dd>
                </div>
              </dl>
            </div>

            <div className="space-y-4">
              <Field label="Tai san" error={errors.assetId?.message}>
                <select {...register('assetId')} className={inputClassName}>
                  {lookup.assets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.assetCode} - {asset.assetName}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Muc do uu tien" error={errors.priority?.message}>
                <select {...register('priority')} className={inputClassName}>
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="URGENT">URGENT</option>
                </select>
              </Field>

              <Field label="Mo ta hu hong" error={errors.description?.message}>
                <textarea
                  {...register('description')}
                  className={`${inputClassName} min-h-36`}
                  placeholder="Mo ta ro hien tuong hu hong, thoi diem xay ra va muc do anh huong."
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
                  {isSubmitting ? 'Dang gui...' : 'Gui phieu bao hong'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/student/damage-reports')}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Xem lich su
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
