import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../lib/axios';
import { getApiErrorMessage } from '../../lib/api-error';
import { formatDateTime } from '../../lib/format';
import { useToast } from '../../toast/toast-context';
import { AppNotification, NotificationsResponse, UnreadCountResponse } from '../../types/notifications';

type NotificationBellProps = {
  basePath: string;
};

export function NotificationBell({ basePath }: NotificationBellProps) {
  const { showToast } = useToast();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    void loadUnreadCount();
  }, []);

  async function loadUnreadCount() {
    try {
      const response = await apiClient.get<UnreadCountResponse>('/notifications/unread-count');
      setUnreadCount(response.data.count);
    } catch {
      // Silent fail on header badge to avoid blocking the page shell.
    }
  }

  async function loadNotifications() {
    setIsLoading(true);

    try {
      const response = await apiClient.get<NotificationsResponse>('/notifications/my', {
        params: {
          page: 1,
          pageSize: 6,
        },
      });
      setItems(response.data.items);
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Khong the tai thong bao.'), 'error');
    } finally {
      setIsLoading(false);
    }
  }

  async function toggleOpen() {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);

    if (nextOpen) {
      await Promise.all([loadNotifications(), loadUnreadCount()]);
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
      setUnreadCount((current) => Math.max(0, current - 1));
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
      setUnreadCount(0);
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Khong the cap nhat thong bao.'), 'error');
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => void toggleOpen()}
        className="relative rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        Thong bao
        {unreadCount > 0 && (
          <span className="absolute -right-2 -top-2 inline-flex min-w-6 items-center justify-center rounded-full bg-rose-500 px-2 py-1 text-[10px] font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-20 mt-3 w-[min(92vw,28rem)] rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-200/80">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <p className="font-semibold text-slate-900">Thong bao</p>
              <p className="text-xs text-slate-500">Cap nhat moi nhat cua tai khoan</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Doc het
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Dong
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {isLoading ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
                Dang tai thong bao...
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
                Chua co thong bao nao.
              </div>
            ) : (
              items.map((item) => (
                <article
                  key={item.id}
                  className={`rounded-2xl border p-3 ${
                    item.status === 'UNREAD'
                      ? 'border-emerald-200 bg-emerald-50/60'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-medium text-slate-900">{item.title}</p>
                      <p className="text-sm leading-5 text-slate-700">{item.content}</p>
                      <p className="text-xs text-slate-500">{formatDateTime(item.createdAt)}</p>
                    </div>

                    {item.status === 'UNREAD' && (
                      <button
                        type="button"
                        onClick={() => void markRead(item.id)}
                        className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Da doc
                      </button>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>

          <div className="mt-4 border-t border-slate-200 pt-3 text-right">
            <Link
              to={`${basePath}/notifications`}
              onClick={() => setIsOpen(false)}
              className="text-sm font-semibold text-emerald-700 hover:text-emerald-600"
            >
              Xem tat ca thong bao
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
