import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/admin/EmptyState';
import { PaginationBar } from '../components/admin/PaginationBar';
import { SectionCard } from '../components/admin/SectionCard';
import { useAuth } from '../auth/auth-context';
import { apiClient } from '../lib/axios';
import { getApiErrorMessage } from '../lib/api-error';
import { formatDateTime } from '../lib/format';
import { useToast } from '../toast/toast-context';
import { AppNotification, NotificationsResponse } from '../types/notifications';

export function NotificationsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const basePath =
    user?.role === 'ADMIN' ? '/admin' : user?.role === 'QL_CSVC' ? '/manager' : '/student';

  useEffect(() => {
    void loadNotifications(page);
  }, [page]);

  async function loadNotifications(nextPage = page) {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await apiClient.get<NotificationsResponse>('/notifications/my', {
        params: {
          page: nextPage,
          pageSize: 12,
        },
      });

      setItems(response.data.items);
      setPage(response.data.pagination.page);
      setTotalPages(response.data.pagination.totalPages);
      setTotal(response.data.pagination.total);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Khong the tai danh sach thong bao.'));
    } finally {
      setIsLoading(false);
    }
  }

  async function markRead(id: number) {
    try {
      await apiClient.patch(`/notifications/${id}/read`);
      setItems((current) =>
        current.map((item) =>
          item.id === id ? { ...item, status: 'READ', readAt: item.readAt ?? new Date().toISOString() } : item,
        ),
      );
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Khong the danh dau da doc.'), 'error');
    }
  }

  async function markAllRead() {
    try {
      await apiClient.patch('/notifications/read-all');
      setItems((current) =>
        current.map((item) => ({
          ...item,
          status: 'READ',
          readAt: item.readAt ?? new Date().toISOString(),
        })),
      );
      showToast('Da danh dau tat ca thong bao la da doc.');
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Khong the cap nhat tat ca thong bao.'), 'error');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <Link
          to={`${basePath}/dashboard`}
          className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Quay lai dashboard
        </Link>
        <button
          type="button"
          onClick={() => void markAllRead()}
          className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          Danh dau tat ca da doc
        </button>
      </div>

      <SectionCard
        title="Tat ca thong bao"
        description="Theo doi cac cap nhat moi nhat lien quan den bao hong, ban giao, bao tri va nghiep vu he thong."
      >
        {errorMessage && (
          <p className="mb-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</p>
        )}

        {isLoading ? (
          <div className="rounded-2xl bg-slate-50 px-6 py-12 text-center text-sm text-slate-600">
            Dang tai thong bao...
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="Chua co thong bao"
            description="Thong bao moi se duoc hien thi tai day de anh theo doi nhanh."
          />
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <article
                key={item.id}
                className={`rounded-2xl border p-4 transition ${
                  item.status === 'UNREAD'
                    ? 'border-emerald-200 bg-emerald-50/60'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900">{item.title}</p>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          item.status === 'UNREAD'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {item.status === 'UNREAD' ? 'Chua doc' : 'Da doc'}
                      </span>
                    </div>
                    <p className="text-sm leading-6 text-slate-700">{item.content}</p>
                    <p className="text-xs text-slate-500">{formatDateTime(item.createdAt)}</p>
                  </div>

                  {item.status === 'UNREAD' && (
                    <button
                      type="button"
                      onClick={() => void markRead(item.id)}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Danh dau da doc
                    </button>
                  )}
                </div>
              </article>
            ))}

            <PaginationBar
              page={page}
              totalPages={totalPages}
              total={total}
              onPageChange={(nextPage) => setPage(nextPage)}
            />
          </div>
        )}
      </SectionCard>
    </div>
  );
}
