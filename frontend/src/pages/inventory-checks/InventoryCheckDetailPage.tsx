import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { SectionCard } from '../../components/admin/SectionCard';
import { InventoryCheckStatusBadge } from '../../components/inventory-checks/InventoryCheckStatusBadge';
import { useAuth } from '../../auth/auth-context';
import { apiClient } from '../../lib/axios';
import { getApiErrorMessage } from '../../lib/api-error';
import { formatDate, formatDateTime } from '../../lib/format';
import { useToast } from '../../toast/toast-context';
import { InventoryCheck } from '../../types/inventory-checks';

type ItemDraftState = Record<
  number,
  {
    actualQuantity: number;
    actualCondition: string;
    note: string;
  }
>;

export function InventoryCheckDetailPage() {
  const { id } = useParams();
  const inventoryCheckId = Number(id);
  const { user } = useAuth();
  const { showToast } = useToast();
  const basePath = user?.role === 'ADMIN' ? '/admin' : '/manager';
  const [inventoryCheck, setInventoryCheck] = useState<InventoryCheck | null>(null);
  const [draftItems, setDraftItems] = useState<ItemDraftState>({});
  const [generalNote, setGeneralNote] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(inventoryCheckId)) {
      return;
    }

    void loadInventoryCheck();
  }, [inventoryCheckId]);

  const rows = useMemo(() => {
    if (!inventoryCheck) {
      return [];
    }

    return inventoryCheck.inventoryCheckItems.map((item) => {
      const draft = draftItems[item.id];
      const actualQuantity = draft?.actualQuantity ?? item.actualQuantity;
      const actualCondition = draft?.actualCondition ?? item.actualCondition ?? '';
      const note = draft?.note ?? item.note ?? '';
      const difference = actualQuantity - item.systemQuantity;

      return {
        item,
        actualQuantity,
        actualCondition,
        note,
        difference,
      };
    });
  }, [draftItems, inventoryCheck]);

  const loadInventoryCheck = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await apiClient.get<InventoryCheck>(`/inventory-checks/${inventoryCheckId}`);
      setInventoryCheck(response.data);
      setGeneralNote(response.data.generalNote ?? '');
      setDraftItems(
        Object.fromEntries(
          response.data.inventoryCheckItems.map((item) => [
            item.id,
            {
              actualQuantity: item.actualQuantity,
              actualCondition: item.actualCondition ?? '',
              note: item.note ?? '',
            },
          ]),
        ),
      );
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Khong the tai chi tiet phieu kiem ke.'));
    } finally {
      setIsLoading(false);
    }
  };

  const updateDraft = (
    itemId: number,
    field: 'actualQuantity' | 'actualCondition' | 'note',
    value: string | number,
  ) => {
    setDraftItems((current) => ({
      ...current,
      [itemId]: {
        actualQuantity: current[itemId]?.actualQuantity ?? 0,
        actualCondition: current[itemId]?.actualCondition ?? '',
        note: current[itemId]?.note ?? '',
        ...current[itemId],
        [field]: value,
      },
    }));
  };

  const saveResults = async () => {
    if (!inventoryCheck) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await apiClient.patch(`/inventory-checks/${inventoryCheck.id}/results`, {
        generalNote: generalNote.trim() || undefined,
        items: rows.map((row) => ({
          itemId: row.item.id,
          actualQuantity: row.actualQuantity,
          actualCondition: row.actualCondition.trim() || undefined,
          note: row.note.trim() || undefined,
        })),
      });

      showToast('Da luu ket qua kiem ke.');
      await loadInventoryCheck();
    } catch (error) {
      const message = getApiErrorMessage(error, 'Khong the luu ket qua kiem ke.');
      setErrorMessage(message);
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const completeInventoryCheck = async () => {
    if (!inventoryCheck) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await apiClient.post(`/inventory-checks/${inventoryCheck.id}/complete`, {
        generalNote: generalNote.trim() || undefined,
      });
      showToast('Da hoan tat phieu kiem ke.');
      await loadInventoryCheck();
    } catch (error) {
      const message = getApiErrorMessage(error, 'Khong the hoan tat phieu kiem ke.');
      setErrorMessage(message);
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-slate-50 px-6 py-12 text-center text-sm text-slate-600">
        Dang tai chi tiet phieu kiem ke...
      </div>
    );
  }

  if (!inventoryCheck) {
    return (
      <div className="rounded-2xl bg-rose-50 px-6 py-12 text-center text-sm text-rose-700">
        {errorMessage || 'Khong tim thay phieu kiem ke.'}
      </div>
    );
  }

  const isDraft = inventoryCheck.status === 'DRAFT';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <Link
          to={`${basePath}/inventory-checks`}
          className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Quay lai danh sach
        </Link>
        <Link
          to={`${basePath}/inventory-checks/${inventoryCheck.id}/print`}
          className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          In / Xuat bieu mau
        </Link>
      </div>

      {errorMessage && (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</p>
      )}

      <SectionCard
        title="Chi tiet phieu kiem ke"
        description="Nhap so luong thuc te, tinh trang tai san va doi chieu chenh lech ngay tren bang."
      >
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {inventoryCheck.inventoryCode}
                  </p>
                  <h2 className="mt-2 text-xl font-bold text-slate-900">
                    Phieu kiem ke phong {inventoryCheck.room?.roomCode ?? '--'}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Kiem ke ngay {formatDate(inventoryCheck.checkDate)} | Nguoi lap{' '}
                    {inventoryCheck.checkedByUser.fullName}
                  </p>
                </div>
                <InventoryCheckStatusBadge status={inventoryCheck.status} />
              </div>

              <dl className="mt-5 grid gap-4 md:grid-cols-2">
                <InfoItem
                  label="Phong"
                  value={
                    inventoryCheck.room
                      ? `${inventoryCheck.room.roomCode} - ${inventoryCheck.room.floor?.block?.name ?? '--'}`
                      : '--'
                  }
                />
                <InfoItem
                  label="Nguoi kiem ke"
                  value={`${inventoryCheck.checkedByUser.fullName} (${inventoryCheck.checkedByUser.userCode})`}
                />
                <InfoItem label="Ngay tao" value={formatDateTime(inventoryCheck.createdAt)} />
                <InfoItem
                  label="Hoan tat luc"
                  value={formatDateTime(inventoryCheck.completedAt ?? inventoryCheck.updatedAt)}
                />
              </dl>
            </div>

            <SectionCard
              title="Ghi chu chung"
              description="Cap nhat nhan xet tong quan cua dot kiem ke."
            >
              <textarea
                value={generalNote}
                onChange={(event) => setGeneralNote(event.target.value)}
                disabled={!isDraft || isSubmitting}
                className={`${inputClassName} min-h-32 disabled:bg-slate-100`}
                placeholder="Them nhan xet tong quan cua phieu kiem ke neu can."
              />

              {isDraft && (
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void saveResults()}
                    disabled={isSubmitting}
                    className="rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-400 disabled:opacity-60"
                  >
                    Luu ket qua
                  </button>
                  <button
                    type="button"
                    onClick={() => void completeInventoryCheck()}
                    disabled={isSubmitting}
                    className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
                  >
                    Hoan tat kiem ke
                  </button>
                </div>
              )}
            </SectionCard>
          </div>

          <SectionCard
            title="Bang ket qua kiem ke"
            description="Item co chenh lech hoac tinh trang xau se duoc highlight de de theo doi."
          >
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">Tai san</th>
                      <th className="px-4 py-3 font-medium">So luong HT</th>
                      <th className="px-4 py-3 font-medium">So luong TT</th>
                      <th className="px-4 py-3 font-medium">Chenh lech</th>
                      <th className="px-4 py-3 font-medium">Tinh trang</th>
                      <th className="px-4 py-3 font-medium">Ghi chu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {rows.map((row) => {
                      const highlight = row.difference !== 0 || isPoorCondition(row.actualCondition);

                      return (
                        <tr key={row.item.id} className={highlight ? 'bg-amber-50/50' : ''}>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-900">{row.item.asset.assetName}</p>
                            <p className="text-xs text-slate-500">{row.item.asset.assetCode}</p>
                          </td>
                          <td className="px-4 py-3 text-slate-700">{row.item.systemQuantity}</td>
                          <td className="px-4 py-3">
                            {isDraft ? (
                              <input
                                type="number"
                                min={0}
                                value={row.actualQuantity}
                                onChange={(event) =>
                                  updateDraft(
                                    row.item.id,
                                    'actualQuantity',
                                    Number(event.target.value || 0),
                                  )
                                }
                                className="w-24 rounded-lg border border-slate-200 px-3 py-2 outline-none transition focus:border-emerald-500"
                              />
                            ) : (
                              <span>{row.actualQuantity}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                row.difference === 0
                                  ? 'bg-slate-100 text-slate-600'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {row.difference > 0 ? `+${row.difference}` : row.difference}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {isDraft ? (
                              <input
                                value={row.actualCondition}
                                onChange={(event) =>
                                  updateDraft(row.item.id, 'actualCondition', event.target.value)
                                }
                                className={`${inputClassName} min-w-44`}
                                placeholder="VD: Tot, Hong, Xuong cap..."
                              />
                            ) : (
                              <span
                                className={isPoorCondition(row.actualCondition) ? 'font-medium text-amber-800' : 'text-slate-700'}
                              >
                                {row.actualCondition || '--'}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {isDraft ? (
                              <input
                                value={row.note}
                                onChange={(event) => updateDraft(row.item.id, 'note', event.target.value)}
                                className={`${inputClassName} min-w-52`}
                                placeholder="Ghi chu item"
                              />
                            ) : (
                              <span className="text-slate-700">{row.note || '--'}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </SectionCard>
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

function isPoorCondition(value?: string | null) {
  if (!value) {
    return false;
  }

  const normalized = value.toLowerCase();
  return ['hong', 'xau', 'xuong cap', 'kem', 'mat'].some((keyword) =>
    normalized.includes(keyword),
  );
}

const inputClassName =
  'rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500';
