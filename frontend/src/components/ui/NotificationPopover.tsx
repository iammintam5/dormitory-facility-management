import { useState, useEffect, useRef } from 'react';
import { Bell, Check, Checks, Info } from '@phosphor-icons/react';
import { getNotifications, getUnreadCount, markNotificationRead, markAllNotificationsRead } from '../../services/notifications';
import { AppNotification } from '../../types/notifications';
import { useToast } from '../../toast/toast-context';
import { Link } from 'react-router-dom';

export function NotificationPopover() {
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Initial fetch for unread count
  useEffect(() => {
    fetchUnreadCount();
  }, []);

  // Fetch notifications when opened
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const fetchUnreadCount = async () => {
    try {
      const res = await getUnreadCount();
      setUnreadCount(res.count);
    } catch (e) {
      // Silently fail
    }
  };

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const res = await getNotifications(1, 10);
      setNotifications(res.items);
      // Also sync count
      fetchUnreadCount();
    } catch (e) {
      showToast('Lỗi khi tải thông báo', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkRead = async (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'READ' } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      showToast('Lỗi khi đánh dấu đã đọc', 'error');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, status: 'READ' })));
      setUnreadCount(0);
    } catch (err) {
      showToast('Lỗi khi đánh dấu đã đọc', 'error');
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    const rtf = new Intl.RelativeTimeFormat('vi', { numeric: 'auto' });
    const daysDifference = Math.round((new Date(dateStr).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    if (daysDifference === 0) {
      const hoursDiff = Math.round((new Date(dateStr).getTime() - new Date().getTime()) / (1000 * 60 * 60));
      if (hoursDiff === 0) {
        const minsDiff = Math.round((new Date(dateStr).getTime() - new Date().getTime()) / (1000 * 60));
        return rtf.format(minsDiff, 'minute');
      }
      return rtf.format(hoursDiff, 'hour');
    }
    return rtf.format(daysDifference, 'day');
  };

  const getNotificationLink = (n: AppNotification) => {
    if (n.relatedTable === 'damage_reports' && n.relatedId) {
      return `/manager/damage-reports`; // Simple fallback
    }
    return '#';
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label="Thông báo"
      >
        <Bell size={20} weight="bold" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-[hsl(var(--header-bg))]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 sm:w-96 rounded-xl border border-border/50 bg-card text-foreground shadow-2xl animate-fade-in-down origin-top-right overflow-hidden flex flex-col max-h-[85vh]">
          <div className="flex items-center justify-between border-b border-border/50 px-4 py-3 bg-muted/10 shrink-0">
            <h3 className="font-bold text-sm">Thông báo</h3>
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllRead}
                className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1.5"
              >
                <Checks size={14} weight="bold" />
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1 custom-scrollbar">
            {isLoading && notifications.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Đang tải thông báo...</div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground gap-3">
                <Bell size={32} weight="duotone" className="text-muted-foreground/50" />
                <p className="text-sm font-medium">Không có thông báo nào</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {notifications.map((n) => (
                  <Link
                    key={n.id}
                    to={getNotificationLink(n)}
                    onClick={() => setIsOpen(false)}
                    className={`block p-4 transition-colors hover:bg-muted/50 ${n.status === 'UNREAD' ? 'bg-primary/5' : ''}`}
                  >
                    <div className="flex gap-3">
                      <div className={`mt-0.5 shrink-0 rounded-full p-1.5 ${n.status === 'UNREAD' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        <Info size={16} weight="bold" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm ${n.status === 'UNREAD' ? 'font-bold text-foreground' : 'font-medium text-muted-foreground'}`}>
                            {n.title}
                          </p>
                          {n.status === 'UNREAD' && (
                            <button 
                              onClick={(e) => handleMarkRead(n.id, e)}
                              className="shrink-0 p-1 rounded-md text-primary hover:bg-primary/10 transition-colors"
                              title="Đánh dấu đã đọc"
                              aria-label="Đánh dấu đã đọc"
                            >
                              <Check size={14} weight="bold" />
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {n.content}
                        </p>
                        <p className="text-[11px] font-medium text-muted-foreground/70" title={new Date(n.createdAt).toLocaleString('vi-VN')}>
                          {formatRelativeTime(n.createdAt)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
          
          <div className="p-3 border-t border-border/50 bg-muted/10 text-center shrink-0">
             {/* Future enhancement: View all notifications page */}
             <span className="text-xs font-semibold text-muted-foreground">Hiển thị các thông báo mới nhất</span>
          </div>
        </div>
      )}
    </div>
  );
}
