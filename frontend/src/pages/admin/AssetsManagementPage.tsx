import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { EmptyState } from '../../components/admin/EmptyState';
import { PaginationBar } from '../../components/admin/PaginationBar';
import { SectionCard } from '../../components/admin/SectionCard';
import { apiClient } from '../../lib/axios';
import { formatDateTime } from '../../lib/format';
import { Asset, AssetCategory, AssetsResponse } from '../../types/assets';
import { Room } from '../../types/locations';

const assetSchema = z.object({
  categoryId: z.coerce.number().int().positive(),
  roomId: z.union([z.coerce.number().int().positive(), z.literal('')]).optional(),
  assetCode: z.string().min(1, 'Vui long nhap ma tai san.'),
  assetName: z.string().min(1, 'Vui long nhap ten tai san.'),
  status: z.enum([
    'AVAILABLE',
    'IN_USE',
    'UNDER_MAINTENANCE',
    'DAMAGED',
    'PENDING_LIQUIDATION',
    'LIQUIDATED',
  ]),
  yearInUse: z.union([z.coerce.number().int().min(1900), z.literal('')]).optional(),
  description: z.string().optional(),
});

type AssetFormValues = z.infer<typeof assetSchema>;

const defaultValues: AssetFormValues = {
  categoryId: 1,
  roomId: '',
  assetCode: '',
  assetName: '',
  status: 'AVAILABLE',
  yearInUse: '',
  description: '',
};

export function AssetsManagementPage() {
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [keyword, setKeyword] = useState('');
  const [categoryIdFilter, setCategoryIdFilter] = useState('');
  const [roomIdFilter, setRoomIdFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AssetFormValues>({
    resolver: zodResolver(assetSchema),
    defaultValues,
  });

  useEffect(() => {
    void Promise.all([fetchLookups(), fetchAssets(1)]);
  }, []);

  const fetchLookups = async () => {
    const [categoriesResponse, roomsResponse] = await Promise.all([
      apiClient.get<AssetCategory[]>('/asset-categories'),
      apiClient.get<Room[]>('/locations/rooms'),
    ]);

    setCategories(categoriesResponse.data);
    setRooms(roomsResponse.data);

    if (categoriesResponse.data[0]) {
      reset((current) => ({
        ...current,
        categoryId: categoriesResponse.data[0].id,
      }));
    }
  };

  const fetchAssets = async (nextPage = page) => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await apiClient.get<AssetsResponse>('/assets', {
        params: {
          page: nextPage,
          pageSize,
          keyword: keyword || undefined,
          categoryId: categoryIdFilter || undefined,
          roomId: roomIdFilter || undefined,
          status: statusFilter || undefined,
        },
      });

      setAssets(response.data.items);
      setPage(response.data.pagination.page);
      setTotalPages(response.data.pagination.totalPages);
      setTotal(response.data.pagination.total);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Khong the tai danh sach tai san.'));
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
        categoryId: Number(values.categoryId),
        roomId: values.roomId === '' || values.roomId === undefined ? null : Number(values.roomId),
        assetCode: values.assetCode.trim(),
        assetName: values.assetName.trim(),
        status: values.status,
        yearInUse:
          values.yearInUse === '' || values.yearInUse === undefined ? null : Number(values.yearInUse),
        description: values.description?.trim() || undefined,
      };

      if (selectedAsset) {
        await apiClient.patch(`/assets/${selectedAsset.id}`, payload);
        setFeedback('Cap nhat tai san thanh cong.');
      } else {
        await apiClient.post('/assets', payload);
        setFeedback('Tao tai san thanh cong.');
      }

      setSelectedAsset(null);
      reset(defaultValues);
      await fetchAssets(selectedAsset ? page : 1);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Khong the luu tai san.'));
    } finally {
      setIsSaving(false);
    }
  });

  const handleEdit = (asset: Asset) => {
    setSelectedAsset(asset);
    setFeedback('');
    setErrorMessage('');
    reset({
      categoryId: asset.categoryId,
      roomId: asset.roomId ?? '',
      assetCode: asset.assetCode,
      assetName: asset.assetName,
      status: asset.status,
      yearInUse: asset.yearInUse ?? '',
      description: asset.description ?? '',
    });
  };

  const handleDelete = async (assetId: number) => {
    setFeedback('');
    setErrorMessage('');

    try {
      await apiClient.delete(`/assets/${assetId}`);
      setFeedback('Xoa tai san thanh cong.');
      await fetchAssets(page);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Khong the xoa tai san.'));
    }
  };

  const handleStatusChange = async (assetId: number, status: Asset['status']) => {
    setFeedback('');
    setErrorMessage('');

    try {
      await apiClient.patch(`/assets/${assetId}/status`, { status });
      setFeedback('Cap nhat trang thai tai san thanh cong.');
      await fetchAssets(page);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Khong the cap nhat trang thai tai san.'));
    }
  };

  return (
    <div className="space-y-6">
      <SectionCard
        title="Quan ly tai san"
        description="Theo doi tai san theo phong, loai va trang thai su dung."
      >
        <div className="grid gap-6 xl:grid-cols-[1fr_1.7fr]">
          <form className="space-y-4 rounded-2xl bg-slate-50 p-4" onSubmit={onSubmit}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                {selectedAsset ? 'Cap nhat tai san' : 'Tao tai san moi'}
              </h3>
              {selectedAsset && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAsset(null);
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

            <Field label="Loai tai san" error={errors.categoryId?.message}>
              <select {...register('categoryId')} className={inputClassName}>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.code} - {category.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Phong" error={errors.roomId?.message as string | undefined}>
              <select {...register('roomId')} className={inputClassName}>
                <option value="">Khong gan phong</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.roomCode}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Ma tai san" error={errors.assetCode?.message}>
              <input {...register('assetCode')} className={inputClassName} />
            </Field>

            <Field label="Ten tai san" error={errors.assetName?.message}>
              <input {...register('assetName')} className={inputClassName} />
            </Field>

            <Field label="Trang thai" error={errors.status?.message}>
              <select {...register('status')} className={inputClassName}>
                <option value="AVAILABLE">AVAILABLE</option>
                <option value="IN_USE">IN_USE</option>
                <option value="UNDER_MAINTENANCE">UNDER_MAINTENANCE</option>
                <option value="DAMAGED">DAMAGED</option>
                <option value="PENDING_LIQUIDATION">PENDING_LIQUIDATION</option>
                <option value="LIQUIDATED">LIQUIDATED</option>
              </select>
            </Field>

            <Field label="Nam dua vao su dung" error={errors.yearInUse?.message as string | undefined}>
              <input type="number" {...register('yearInUse')} className={inputClassName} />
            </Field>

            <Field label="Mo ta" error={errors.description?.message}>
              <textarea {...register('description')} className={`${inputClassName} min-h-24`} />
            </Field>

            {feedback && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{feedback}</p>}
            {errorMessage && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</p>}

            <button
              type="submit"
              disabled={isSaving}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
            >
              {isSaving ? 'Dang luu...' : selectedAsset ? 'Cap nhat tai san' : 'Tao tai san'}
            </button>
          </form>

          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-5">
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                className={inputClassName}
                placeholder="Tim theo ma, ten..."
              />
              <select
                value={categoryIdFilter}
                onChange={(event) => setCategoryIdFilter(event.target.value)}
                className={inputClassName}
              >
                <option value="">Tat ca loai</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.code}
                  </option>
                ))}
              </select>
              <select value={roomIdFilter} onChange={(event) => setRoomIdFilter(event.target.value)} className={inputClassName}>
                <option value="">Tat ca phong</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.roomCode}
                  </option>
                ))}
              </select>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={inputClassName}>
                <option value="">Tat ca trang thai</option>
                <option value="AVAILABLE">AVAILABLE</option>
                <option value="IN_USE">IN_USE</option>
                <option value="UNDER_MAINTENANCE">UNDER_MAINTENANCE</option>
                <option value="DAMAGED">DAMAGED</option>
                <option value="PENDING_LIQUIDATION">PENDING_LIQUIDATION</option>
                <option value="LIQUIDATED">LIQUIDATED</option>
              </select>
              <button
                type="button"
                onClick={() => void fetchAssets(1)}
                className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
              >
                Loc du lieu
              </button>
            </div>

            {isLoading ? (
              <div className="rounded-2xl bg-slate-50 px-6 py-12 text-center text-sm text-slate-600">
                Dang tai danh sach tai san...
              </div>
            ) : assets.length === 0 ? (
              <EmptyState
                title="Chua co tai san phu hop"
                description="Thu thay doi bo loc hoac tao tai san moi o khung ben trai."
              />
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-left text-slate-600">
                      <tr>
                        <th className="px-4 py-3 font-medium">Tai san</th>
                        <th className="px-4 py-3 font-medium">Loai / Phong</th>
                        <th className="px-4 py-3 font-medium">Trang thai</th>
                        <th className="px-4 py-3 font-medium">Cap nhat</th>
                        <th className="px-4 py-3 font-medium">Thao tac</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {assets.map((asset) => (
                        <tr key={asset.id}>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-900">{asset.assetName}</p>
                            <p className="text-slate-600">{asset.assetCode}</p>
                            <p className="mt-1 text-xs text-slate-500">{asset.description || '--'}</p>
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            <p>{asset.category?.name ?? '--'}</p>
                            <p className="text-xs text-slate-500">{asset.room?.roomCode ?? 'Khong gan phong'}</p>
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={asset.status}
                              onChange={(event) =>
                                void handleStatusChange(asset.id, event.target.value as Asset['status'])
                              }
                              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700"
                            >
                              <option value="AVAILABLE">AVAILABLE</option>
                              <option value="IN_USE">IN_USE</option>
                              <option value="UNDER_MAINTENANCE">UNDER_MAINTENANCE</option>
                              <option value="DAMAGED">DAMAGED</option>
                              <option value="PENDING_LIQUIDATION">PENDING_LIQUIDATION</option>
                              <option value="LIQUIDATED">LIQUIDATED</option>
                            </select>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{formatDateTime(asset.updatedAt)}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => handleEdit(asset)}
                                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                              >
                                Sua
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDelete(asset.id)}
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

                <div className="px-4">
                  <PaginationBar
                    page={page}
                    totalPages={totalPages}
                    total={total}
                    onPageChange={(next) => void fetchAssets(next)}
                  />
                </div>
              </div>
            )}
          </div>
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
