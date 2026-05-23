import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { EmptyState } from '../../components/admin/EmptyState';
import { SectionCard } from '../../components/admin/SectionCard';
import { apiClient } from '../../lib/axios';
import { AssetCategory } from '../../types/assets';

const categorySchema = z.object({
  code: z.string().min(1, 'Vui long nhap ma loai tai san.'),
  name: z.string().min(1, 'Vui long nhap ten loai tai san.'),
  description: z.string().optional(),
  maintenanceCycleMonths: z
    .union([z.coerce.number().int().positive(), z.literal(''), z.undefined()])
    .optional(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

const defaultValues: CategoryFormValues = {
  code: '',
  name: '',
  description: '',
  maintenanceCycleMonths: '',
};

export function AssetCategoriesManagementPage() {
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues,
  });

  useEffect(() => {
    void fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await apiClient.get<AssetCategory[]>('/asset-categories');
      setCategories(response.data);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Khong the tai danh sach loai tai san.'));
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    setIsSaving(true);
    setFeedback('');
    setErrorMessage('');

    try {
      const payload = {
        code: values.code.trim(),
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
        maintenanceCycleMonths:
          values.maintenanceCycleMonths === '' || values.maintenanceCycleMonths === undefined
            ? undefined
            : Number(values.maintenanceCycleMonths),
      };

      if (selectedCategory) {
        await apiClient.patch(`/asset-categories/${selectedCategory.id}`, payload);
        setFeedback('Cap nhat loai tai san thanh cong.');
      } else {
        await apiClient.post('/asset-categories', payload);
        setFeedback('Tao loai tai san thanh cong.');
      }

      setSelectedCategory(null);
      reset(defaultValues);
      await fetchCategories();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Khong the luu loai tai san.'));
    } finally {
      setIsSaving(false);
    }
  });

  const handleEdit = (category: AssetCategory) => {
    setSelectedCategory(category);
    setFeedback('');
    setErrorMessage('');
    reset({
      code: category.code,
      name: category.name,
      description: category.description ?? '',
      maintenanceCycleMonths: category.maintenanceCycleMonths ?? '',
    });
  };

  const handleDelete = async (categoryId: number) => {
    setFeedback('');
    setErrorMessage('');

    try {
      await apiClient.delete(`/asset-categories/${categoryId}`);
      setFeedback('Xoa loai tai san thanh cong.');
      await fetchCategories();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Khong the xoa loai tai san.'));
    }
  };

  return (
    <div className="space-y-6">
      <SectionCard
        title="Quan ly loai tai san"
        description="Quan ly danh muc loai tai san va chu ky bao tri mac dinh."
      >
        <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          <form className="space-y-4 rounded-2xl bg-slate-50 p-4" onSubmit={onSubmit}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                {selectedCategory ? 'Cap nhat loai tai san' : 'Tao loai tai san moi'}
              </h3>
              {selectedCategory && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory(null);
                    reset(defaultValues);
                    setFeedback('');
                    setErrorMessage('');
                  }}
                  className="text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  Bo chon
                </button>
              )}
            </div>

            <Field label="Ma loai" error={errors.code?.message}>
              <input {...register('code')} className={inputClassName} />
            </Field>

            <Field label="Ten loai" error={errors.name?.message}>
              <input {...register('name')} className={inputClassName} />
            </Field>

            <Field label="Mo ta" error={errors.description?.message}>
              <textarea {...register('description')} className={`${inputClassName} min-h-24`} />
            </Field>

            <Field
              label="Chu ky bao tri (thang)"
              error={errors.maintenanceCycleMonths?.message as string | undefined}
            >
              <input type="number" {...register('maintenanceCycleMonths')} className={inputClassName} />
            </Field>

            {feedback && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{feedback}</p>}
            {errorMessage && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</p>}

            <button
              type="submit"
              disabled={isSaving}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
            >
              {isSaving ? 'Dang luu...' : selectedCategory ? 'Cap nhat' : 'Tao loai tai san'}
            </button>
          </form>

          {isLoading ? (
            <div className="rounded-2xl bg-slate-50 px-6 py-12 text-center text-sm text-slate-600">
              Dang tai loai tai san...
            </div>
          ) : categories.length === 0 ? (
            <EmptyState
              title="Chua co loai tai san nao"
              description="Hay tao loai tai san dau tien o khung ben trai."
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">Loai tai san</th>
                      <th className="px-4 py-3 font-medium">Chu ky bao tri</th>
                      <th className="px-4 py-3 font-medium">Thao tac</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {categories.map((category) => (
                      <tr key={category.id}>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900">{category.name}</p>
                          <p className="text-slate-600">{category.code}</p>
                          <p className="mt-1 text-xs text-slate-500">{category.description || '--'}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {category.maintenanceCycleMonths ? `${category.maintenanceCycleMonths} thang` : 'Khong co'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(category)}
                              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                              Sua
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDelete(category.id)}
                              className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50"
                            >
                              Xoa
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
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

function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) {
      return message.join(', ');
    }
    if (typeof message === 'string') {
      return message;
    }
  }

  return fallback;
}

const inputClassName =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500';
