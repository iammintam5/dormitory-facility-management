import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useToast } from '../../toast/toast-context';
import { EmptyState } from '../../components/admin/EmptyState';
import { PaginationBar } from '../../components/admin/PaginationBar';
import { SectionCard } from '../../components/admin/SectionCard';
import { apiClient } from '../../lib/axios';
import { formatDateTime } from '../../lib/format';
import { Asset, AssetCategory, AssetsResponse, AssetHistory } from '../../types/assets';
import { Room } from '../../types/locations';
import { useDebounce } from '../../hooks/use-debounce';

const assetSchema = z.object({
  categoryId: z.coerce.number().int().positive(),
  roomId: z.union([z.coerce.number().int().positive(), z.literal('')]).optional(),
  assetCode: z.string().min(1, 'Vui lòng nhập mã tài sản.'),
  assetName: z.string().min(1, 'Vui lòng nhập tên tài sản.'),
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

const bulkSchema = z.object({
  categoryId: z.union([z.coerce.number().int().positive(), z.literal('')]).refine((val) => val !== '', { message: 'Vui lòng chọn loại tài sản.' }),
  roomId: z.union([z.coerce.number().int().positive(), z.literal('')]).optional(),
  prefix: z.string().min(1, 'Vui lòng nhập tiền tố.'),
  assetName: z.string().min(1, 'Vui lòng nhập tên tài sản chung.'),
  startNumber: z.coerce.number().int().positive().min(1),
  endNumber: z.coerce.number().int().positive().min(1),
  yearInUse: z.union([z.coerce.number().int().min(1900), z.literal('')]).optional(),
  description: z.string().optional(),
}).refine(data => data.endNumber >= data.startNumber, {
  message: "Số kết thúc phải lớn hoặc bằng số bắt đầu",
  path: ["endNumber"]
}).refine(data => data.endNumber - data.startNumber <= 100, {
  message: "Chỉ được tạo tối đa 100 tài sản mỗi lần",
  path: ["endNumber"]
});

type BulkFormValues = z.infer<typeof bulkSchema>;

const defaultBulkValues: any = {
  categoryId: '',
  roomId: '',
  prefix: '',
  assetName: '',
  startNumber: 1,
  endNumber: 10,
  yearInUse: '',
  description: '',
};

const ASSET_STATUS_OPTIONS = [
  { value: 'AVAILABLE', label: 'Sẵn sàng' },
  { value: 'IN_USE', label: 'Đang sử dụng' },
  { value: 'UNDER_MAINTENANCE', label: 'Đang bảo trì' },
  { value: 'DAMAGED', label: 'Hư hỏng' },
  { value: 'PENDING_LIQUIDATION', label: 'Chờ thanh lý' },
  { value: 'LIQUIDATED', label: 'Đã thanh lý' },
];

export function AssetsManagementPage() {
  const { showToast } = useToast();
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
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [assetHistories, setAssetHistories] = useState<AssetHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Bulk Action States
  const [selectedAssetIds, setSelectedAssetIds] = useState<number[]>([]);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const [isBulkStatusModalOpen, setIsBulkStatusModalOpen] = useState(false);
  const [isBulkRoomModalOpen, setIsBulkRoomModalOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<Asset['status']>('AVAILABLE');
  const [bulkRoomId, setBulkRoomId] = useState<number | ''>('');

  const debouncedKeyword = useDebounce(keyword, 500);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AssetFormValues>({
    resolver: zodResolver(assetSchema),
    defaultValues,
  });

  const bulkForm = useForm<BulkFormValues>({
    resolver: zodResolver(bulkSchema),
    defaultValues: defaultBulkValues,
  });

  useEffect(() => {
    void Promise.all([fetchLookups()]);
    // fetchAssets(1) will be triggered by the filter useEffect below
  }, []);

  useEffect(() => {
    void fetchAssets(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedKeyword, categoryIdFilter, roomIdFilter, statusFilter]);

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
      setSelectedAssetIds([]); // Clear selection when page/filter changes
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Không thể tải danh sách tài sản.'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    setIsSaving(true);

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
        showToast('Cập nhật tài sản thành công.', 'success');
      } else {
        await apiClient.post('/assets', payload);
        showToast('Tạo tài sản thành công.', 'success');
      }

      setSelectedAsset(null);
      reset(defaultValues);
      setIsCreateModalOpen(false);
      await fetchAssets(selectedAsset ? page : 1);
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Không thể lưu tài sản.'), 'error');
    } finally {
      setIsSaving(false);
    }
  });

  const onBulkSubmit = bulkForm.handleSubmit(async (values) => {
    setIsGenerating(true);
    try {
      const payload = {
        categoryId: Number(values.categoryId),
        roomId: values.roomId === '' || values.roomId === undefined ? null : Number(values.roomId),
        prefix: values.prefix.trim(),
        assetName: values.assetName.trim(),
        startNumber: Number(values.startNumber),
        endNumber: Number(values.endNumber),
        yearInUse: values.yearInUse === '' || values.yearInUse === undefined ? null : Number(values.yearInUse),
        description: values.description?.trim() || undefined,
      };

      const res = await apiClient.post<{ count: number }>('/assets/bulk', payload, {
        timeout: 60000,
      });
      showToast(`Đã tạo thành công ${res.data.count} tài sản.`, 'success');
      bulkForm.reset(defaultBulkValues);
      setIsBulkModalOpen(false);
      await fetchAssets(1);
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Không thể tạo hàng loạt tài sản.'), 'error');
    } finally {
      setIsGenerating(false);
    }
  });

  const handleEdit = (asset: Asset) => {
    setSelectedAsset(asset);
    reset({
      categoryId: asset.categoryId,
      roomId: asset.roomId ?? '',
      assetCode: asset.assetCode,
      assetName: asset.assetName,
      status: asset.status,
      yearInUse: asset.yearInUse ?? '',
      description: asset.description ?? '',
    });
    setIsCreateModalOpen(true);
  };

  const handleDelete = async (assetId: number) => {
    try {
      await apiClient.delete(`/assets/${assetId}`);
      showToast('Xóa tài sản thành công.', 'success');
      await fetchAssets(page);
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Không thể xóa tài sản.'), 'error');
    }
  };

  const handleStatusChange = async (assetId: number, status: Asset['status']) => {
    try {
      await apiClient.patch(`/assets/${assetId}/status`, { status });
      showToast('Cập nhật trạng thái tài sản thành công.', 'success');
      await fetchAssets(page);
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Không thể cập nhật trạng thái tài sản.'), 'error');
    }
  };

  const handleViewHistory = async (asset: Asset) => {
    setSelectedAsset(asset);
    setHistoryModalOpen(true);
    setHistoryLoading(true);
    try {
      const res = await apiClient.get<AssetHistory[]>(`/assets/${asset.id}/history`);
      setAssetHistories(res.data);
    } catch (error) {
      showToast('Không thể tải lịch sử tài sản.', 'error');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedAssetIds(assets.map(a => a.id));
    } else {
      setSelectedAssetIds([]);
    }
  };

  const handleSelectOne = (id: number) => {
    setSelectedAssetIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    try {
      const res = await apiClient.delete<{ count: number, message: string }>('/assets/bulk', {
        data: { assetIds: selectedAssetIds }
      });
      showToast(res.data.message, 'success');
      setIsBulkDeleteConfirmOpen(false);
      await fetchAssets(page);
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Không thể xóa tài sản hàng loạt. Vui lòng kiểm tra các ràng buộc.'), 'error');
    }
  };

  const handleBulkStatus = async () => {
    try {
      const res = await apiClient.patch<{ count: number, message: string }>('/assets/bulk/status', {
        assetIds: selectedAssetIds,
        status: bulkStatus
      });
      showToast(res.data.message, 'success');
      setIsBulkStatusModalOpen(false);
      await fetchAssets(page);
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Không thể cập nhật trạng thái hàng loạt.'), 'error');
    }
  };

  const handleBulkRoom = async () => {
    try {
      const res = await apiClient.patch<{ count: number, message: string }>('/assets/bulk/room', {
        assetIds: selectedAssetIds,
        roomId: bulkRoomId === '' ? null : Number(bulkRoomId)
      });
      showToast(res.data.message, 'success');
      setIsBulkRoomModalOpen(false);
      await fetchAssets(page);
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Không thể chuyển phòng hàng loạt.'), 'error');
    }
  };

  return (
    <div className="space-y-6">
      <SectionCard
        title="Quản lý Tài sản"
        description="Theo dõi tài sản theo phòng, loại và trạng thái sử dụng."
      >
        <div className="space-y-4">
          <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
            {/* Filters */}
            <div className="flex-1 flex gap-3 flex-wrap xl:flex-nowrap w-full">
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                className={`${inputClassName} flex-1 min-w-[150px]`}
                placeholder="Tìm theo mã, tên..."
              />
              <select
                value={categoryIdFilter}
                onChange={(event) => setCategoryIdFilter(event.target.value)}
                className={`${inputClassName} w-[140px]`}
              >
                <option value="">Tất cả loại</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.code}
                  </option>
                ))}
              </select>
              <select value={roomIdFilter} onChange={(event) => setRoomIdFilter(event.target.value)} className={`${inputClassName} w-[140px]`}>
                <option value="">Tất cả phòng</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.roomCode}
                  </option>
                ))}
              </select>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={`${inputClassName} w-[160px]`}>
                <option value="">Tất cả trạng thái</option>
                {ASSET_STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              
              {(keyword || categoryIdFilter || roomIdFilter || statusFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setKeyword('');
                    setCategoryIdFilter('');
                    setRoomIdFilter('');
                    setStatusFilter('');
                  }}
                  className="rounded-xl bg-slate-100 px-3 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-200 shrink-0"
                  title="Xóa bộ lọc"
                >
                  ✕ Bỏ lọc
                </button>
              )}
            </div>
            
            {/* Action buttons */}
            <div className="flex gap-2 w-full md:w-auto shrink-0">
              <button
                onClick={() => { setSelectedAsset(null); reset(defaultValues); setIsCreateModalOpen(true); }}
                className="flex-1 md:flex-none rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
              >
                + Tạo tài sản
              </button>
              <button
                onClick={() => { setIsBulkModalOpen(true); bulkForm.reset(defaultBulkValues); }}
                className="flex-1 md:flex-none rounded-xl bg-emerald-100 px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-200"
              >
                + Tạo hàng loạt
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="rounded-2xl bg-slate-50 px-6 py-12 text-center text-sm text-slate-600">
              Đang tải danh sách tài sản...
            </div>
          ) : assets.length === 0 ? (
            <EmptyState
              title="Chưa có tài sản phù hợp"
              description="Thử thay đổi bộ lọc hoặc tạo tài sản mới."
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="px-4 py-3 w-12 text-center">
                        <input 
                          type="checkbox" 
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          checked={assets.length > 0 && selectedAssetIds.length === assets.length}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th className="px-4 py-3 font-medium">Mã tài sản</th>
                      <th className="px-4 py-3 font-medium">Tên tài sản</th>
                      <th className="px-4 py-3 font-medium">Loại / Phòng</th>
                      <th className="px-4 py-3 font-medium">Năm SD</th>
                      <th className="px-4 py-3 font-medium">Trạng thái</th>
                      <th className="px-4 py-3 font-medium text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {assets.map((asset) => (
                      <tr key={asset.id} className={`transition-colors ${selectedAssetIds.includes(asset.id) ? 'bg-emerald-50/50' : 'hover:bg-slate-50/50'}`}>
                        <td className="px-4 py-3 text-center">
                          <input 
                            type="checkbox" 
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            checked={selectedAssetIds.includes(asset.id)}
                            onChange={() => handleSelectOne(asset.id)}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-slate-900">{asset.assetCode}</span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{asset.assetName}</p>
                          <p className="mt-0.5 text-xs text-slate-500 line-clamp-1" title={asset.description || ''}>{asset.description || '--'}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          <p>{asset.category?.name ?? '--'}</p>
                          <p className="text-xs text-slate-500">{asset.room?.roomCode ?? 'Không gán phòng'}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {asset.yearInUse || '--'}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={asset.status}
                            onChange={(event) =>
                              void handleStatusChange(asset.id, event.target.value as Asset['status'])
                            }
                            className={`rounded-lg border px-3 py-2 text-xs font-semibold outline-none ${
                              asset.status === 'AVAILABLE' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
                              asset.status === 'IN_USE' ? 'border-blue-200 bg-blue-50 text-blue-700' :
                              asset.status === 'UNDER_MAINTENANCE' ? 'border-amber-200 bg-amber-50 text-amber-700' :
                              asset.status === 'DAMAGED' ? 'border-rose-200 bg-rose-50 text-rose-700' :
                              asset.status === 'PENDING_LIQUIDATION' ? 'border-orange-200 bg-orange-50 text-orange-700' :
                              'border-slate-200 bg-slate-50 text-slate-700'
                            }`}
                          >
                            {ASSET_STATUS_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(asset)}
                              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                              Sửa
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleViewHistory(asset)}
                              className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                            >
                              Lịch sử
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDelete(asset.id)}
                              className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50"
                            >
                              Xóa
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
      </SectionCard>

      {/* Create / Edit Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <h3 className="text-lg font-semibold text-slate-900">
                {selectedAsset ? 'Cập nhật tài sản' : 'Tạo tài sản mới'}
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-500 text-xl font-bold"
              >
                ✕
              </button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              <form id="asset-form" className="space-y-4" onSubmit={onSubmit}>
                <Field label="Loại tài sản" error={errors.categoryId?.message}>
                  <select {...register('categoryId')} className={inputClassName}>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.code} - {category.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Phòng" error={errors.roomId?.message as string | undefined}>
                  <select {...register('roomId')} className={inputClassName}>
                    <option value="">Không gán phòng</option>
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.roomCode}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Mã tài sản" error={errors.assetCode?.message}>
                  <input {...register('assetCode')} className={inputClassName} />
                </Field>

                <Field label="Tên tài sản" error={errors.assetName?.message}>
                  <input {...register('assetName')} className={inputClassName} />
                </Field>

                <Field label="Trạng thái" error={errors.status?.message}>
                  <select {...register('status')} className={inputClassName}>
                    {ASSET_STATUS_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Năm đưa vào sử dụng" error={errors.yearInUse?.message as string | undefined}>
                  <input type="number" {...register('yearInUse')} className={inputClassName} />
                </Field>

                <Field label="Mô tả" error={errors.description?.message}>
                  <textarea {...register('description')} className={`${inputClassName} min-h-24`} />
                </Field>
              </form>
            </div>
            <div className="border-t border-slate-200 p-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
              >
                Hủy
              </button>
              <button
                type="submit"
                form="asset-form"
                disabled={isSaving}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
              >
                {isSaving ? 'Đang lưu...' : 'Lưu lại'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Create Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <h3 className="text-lg font-semibold text-slate-900">
                Tạo hàng loạt tài sản
              </h3>
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="text-slate-400 hover:text-slate-500 text-xl font-bold"
              >
                ✕
              </button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              <form id="bulk-asset-form" className="space-y-4" onSubmit={onBulkSubmit}>
                <Field label="Loại tài sản" error={bulkForm.formState.errors.categoryId?.message}>
                  <select {...bulkForm.register('categoryId')} className={inputClassName}>
                    <option value="">-- Chọn loại tài sản --</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.code} - {category.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Phòng (tuỳ chọn)" error={bulkForm.formState.errors.roomId?.message as string | undefined}>
                  <select {...bulkForm.register('roomId')} className={inputClassName}>
                    <option value="">Không gán phòng</option>
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.roomCode}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Tên chung cho tài sản" error={bulkForm.formState.errors.assetName?.message}>
                  <input {...bulkForm.register('assetName')} className={inputClassName} placeholder="Ví dụ: Giường sắt" />
                </Field>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-3 sm:col-span-1">
                    <Field label="Tiền tố mã" error={bulkForm.formState.errors.prefix?.message}>
                      <input {...bulkForm.register('prefix')} className={inputClassName} placeholder="Ví dụ: G-" />
                    </Field>
                  </div>
                  <div className="col-span-3 sm:col-span-1">
                    <Field label="Từ số" error={bulkForm.formState.errors.startNumber?.message}>
                      <input type="number" {...bulkForm.register('startNumber')} className={inputClassName} />
                    </Field>
                  </div>
                  <div className="col-span-3 sm:col-span-1">
                    <Field label="Đến số" error={bulkForm.formState.errors.endNumber?.message}>
                      <input type="number" {...bulkForm.register('endNumber')} className={inputClassName} />
                    </Field>
                  </div>
                </div>

                <Field label="Năm đưa vào sử dụng" error={bulkForm.formState.errors.yearInUse?.message as string | undefined}>
                  <input type="number" {...bulkForm.register('yearInUse')} className={inputClassName} />
                </Field>
              </form>
            </div>
            <div className="border-t border-slate-200 p-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(false)}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
              >
                Hủy
              </button>
              <button
                type="submit"
                form="bulk-asset-form"
                disabled={isGenerating}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
              >
                {isGenerating ? 'Đang tạo...' : 'Tạo hàng loạt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <h3 className="text-lg font-semibold text-slate-900">
                Lịch sử luân chuyển - {selectedAsset?.assetName} ({selectedAsset?.assetCode})
              </h3>
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-500 text-xl font-bold"
              >
                ✕
              </button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              {historyLoading ? (
                <div className="py-8 text-center text-sm text-slate-500">Đang tải lịch sử...</div>
              ) : assetHistories.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-500">Chưa có lịch sử luân chuyển.</div>
              ) : (
                <div className="space-y-4">
                  {assetHistories.map((h, i) => (
                    <div key={h.id} className="relative flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="h-3 w-3 rounded-full bg-emerald-500 mt-1.5" />
                        {i !== assetHistories.length - 1 && <div className="w-0.5 flex-1 bg-slate-200 my-1" />}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-slate-900">{h.action}</p>
                          <span className="text-xs text-slate-500">{formatDateTime(h.createdAt)}</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-600">{h.note}</p>
                        
                        {(h.oldStatus !== h.newStatus) && (
                          <div className="mt-2 flex items-center gap-2 text-xs">
                            <span className="text-slate-500">Trạng thái:</span>
                            <span className="line-through text-slate-400">{ASSET_STATUS_OPTIONS.find(o => o.value === h.oldStatus)?.label || h.oldStatus || '--'}</span>
                            <span className="text-slate-400">→</span>
                            <span className="font-medium text-slate-700">{ASSET_STATUS_OPTIONS.find(o => o.value === h.newStatus)?.label || h.newStatus}</span>
                          </div>
                        )}
                        
                        {(h.oldRoomId !== h.newRoomId) && (
                          <div className="mt-1 flex items-center gap-2 text-xs">
                            <span className="text-slate-500">Phòng:</span>
                            <span className="line-through text-slate-400">{h.oldRoomCode || 'Không gán'}</span>
                            <span className="text-slate-400">→</span>
                            <span className="font-medium text-slate-700">{h.newRoomCode || 'Không gán'}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="border-t border-slate-200 p-4 flex justify-end">
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirm Modal */}
      {isBulkDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl flex flex-col overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-bold text-rose-600 mb-2">Xác nhận xóa tài sản</h3>
              <p className="text-slate-600 text-sm">
                Bạn có chắc chắn muốn xóa <strong>{selectedAssetIds.length}</strong> tài sản đã chọn? Hành động này không thể hoàn tác. Các tài sản đã phát sinh nghiệp vụ (bàn giao, báo hỏng...) sẽ không thể bị xóa.
              </p>
            </div>
            <div className="border-t border-slate-200 p-4 flex justify-end gap-3 bg-slate-50">
              <button
                onClick={() => setIsBulkDeleteConfirmOpen(false)}
                className="rounded-xl bg-white border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                onClick={() => void handleBulkDelete()}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500"
              >
                Đồng ý xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Status Modal */}
      {isBulkStatusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl flex flex-col overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Đổi trạng thái ({selectedAssetIds.length} tài sản)</h3>
              <select 
                value={bulkStatus} 
                onChange={e => setBulkStatus(e.target.value as Asset['status'])}
                className={inputClassName}
              >
                {ASSET_STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="border-t border-slate-200 p-4 flex justify-end gap-3 bg-slate-50">
              <button onClick={() => setIsBulkStatusModalOpen(false)} className="rounded-xl bg-white border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Hủy</button>
              <button onClick={() => void handleBulkStatus()} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500">Cập nhật</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Room Modal */}
      {isBulkRoomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl flex flex-col overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Chuyển phòng ({selectedAssetIds.length} tài sản)</h3>
              <select 
                value={bulkRoomId} 
                onChange={e => setBulkRoomId(e.target.value ? Number(e.target.value) : '')}
                className={inputClassName}
              >
                <option value="">Không gán phòng</option>
                {rooms.map(room => (
                  <option key={room.id} value={room.id}>{room.roomCode}</option>
                ))}
              </select>
            </div>
            <div className="border-t border-slate-200 p-4 flex justify-end gap-3 bg-slate-50">
              <button onClick={() => setIsBulkRoomModalOpen(false)} className="rounded-xl bg-white border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Hủy</button>
              <button onClick={() => void handleBulkRoom()} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500">Cập nhật</button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Bar */}
      {selectedAssetIds.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 rounded-2xl bg-slate-900 px-6 py-4 shadow-2xl text-white animate-in slide-in-from-bottom-8 fade-in duration-300">
          <div className="flex items-center gap-2 pr-4 border-r border-slate-700">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">
              {selectedAssetIds.length}
            </span>
            <span className="text-sm font-medium whitespace-nowrap">Đã chọn</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setIsBulkStatusModalOpen(true)} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium hover:bg-slate-700 transition whitespace-nowrap">Đổi trạng thái</button>
            <button onClick={() => setIsBulkRoomModalOpen(true)} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium hover:bg-slate-700 transition whitespace-nowrap">Chuyển phòng</button>
            <button onClick={() => setIsBulkDeleteConfirmOpen(true)} className="rounded-lg bg-rose-500/20 text-rose-300 px-4 py-2 text-sm font-medium hover:bg-rose-500/30 transition whitespace-nowrap">Xóa</button>
          </div>
          <button onClick={() => setSelectedAssetIds([])} className="ml-2 text-slate-400 hover:text-white transition whitespace-nowrap">✕ Bỏ chọn</button>
        </div>
      )}
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
