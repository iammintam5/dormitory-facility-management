import { useState, useEffect, useRef, useId } from 'react';
import { Bell, Check, Checks, Info } from '@phosphor-icons/react';
import { getNotifications, getUnreadCount, markNotificationRead, markAllNotificationsRead } from '../../services/notifications';
import { AppNotification } from '../../types/notifications';
import { useToast } from '../../toast/toast-context';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/auth-context';

export function NotificationPopover() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

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

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        const menu = document.getElementById(menuId);
        const first = menu?.querySelector('a, button:not([disabled])') as HTMLElement | null;
        if (first) first.focus();
      }, 10);
    } else if (popoverRef.current?.contains(document.activeElement)) {
      triggerRef.current?.focus();
    }
  }, [isOpen, menuId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;
    const menu = document.getElementById(menuId);
    if (!menu) return;
    const focusable = Array.from(menu.querySelectorAll('a, button:not([disabled])')) as HTMLElement[];
    if (focusable.length === 0) return;

    const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = currentIndex < focusable.length - 1 ? currentIndex + 1 : 0;
      focusable[nextIndex]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : focusable.length - 1;
      focusable[prevIndex]?.focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === 'Tab') {
      setIsOpen(false);
    }
  };

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
    setIsError(false);
    try {
      const res = await getNotifications(1, 10);
      setNotifications(res.items);
      // Also sync count
      fetchUnreadCount();
    } catch (e) {
      setIsError(true);
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

  const resolveNotificationRoute = (n: AppNotification) => {
    if (!user) return '#';
    const role = user.role;
    
    // Default routes if specific mapping isn't found
    const basePath = role === 'ADMIN' ? '/admin' : role === 'MANAGER' ? '/manager' : '/student';
    
    if (n.relatedTable === 'damage_reports') {
      return `${basePath}/damage-reports${n.relatedId ? `?highlight=${n.relatedId}` : ''}`;
    }
    if (n.relatedTable === 'maintenance_records' && role === 'MANAGER') {
      return `/manager/maintenance${n.relatedId ? `?highlight=${n.relatedId}` : ''}`;
    }
    if (n.relatedTable === 'liquidation_records' && role === 'MANAGER') {
      return `/manager/liquidation-records${n.relatedId ? `?highlight=${n.relatedId}` : ''}`;
    }
    if (n.relatedTable === 'room_assignments' && role === 'STUDENT') {
      return `/student/room`;
    }
    if (n.relatedTable === 'assets' && role === 'STUDENT') {
      return `/student/room-assets${n.relatedId ? `?highlight=${n.relatedId}` : ''}`;
    }
    if (role === 'ADMIN') {
      return n.relatedTable === 'users' ? '/admin/users' : '/admin/system-logs';
    }
    
    return basePath;
  };

  const handleNotificationClick = (e: React.MouseEvent, n: AppNotification) => {
    e.preventDefault();
    setIsOpen(false);
    if (n.status === 'UNREAD') {
      handleMarkRead(n.id, e as unknown as React.MouseEvent).then(() => {
        navigate(resolveNotificationRoute(n));
      });
    } else {
      navigate(resolveNotificationRoute(n));
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(true);
          }
        }}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label="Thông báo"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-controls={menuId}
      >
        <Bell size={20} weight="bold" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-[hsl(var(--header-bg))]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div 
          id={menuId}
          role="menu"
          onKeyDown={handleKeyDown}
          className="absolute right-0 top-full z-50 mt-2 w-80 sm:w-96 rounded-xl border border-border/50 bg-card text-foreground shadow-2xl animate-fade-in-down origin-top-right overflow-hidden flex flex-col max-h-[85vh]"
        >
          <div className="flex items-center justify-between border-b border-border/50 px-4 py-3 bg-muted/10 shrink-0">
            <h3 className="font-bold text-sm">Thông báo</h3>
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllRead}
                role="menuitem"
                className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
              >
                <Checks size={14} weight="bold" />
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1 custom-scrollbar">
            {isLoading && notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 gap-3 text-muted-foreground">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                <p className="text-sm font-medium">Đang tải thông báo...</p>
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-destructive gap-3">
                <Info size={32} weight="duotone" className="text-destructive/80" />
                <p className="text-sm font-medium">Không thể tải thông báo</p>
                <p className="text-xs text-muted-foreground">Vui lòng kiểm tra kết nối và thử lại.</p>
                <button 
                  onClick={fetchNotifications}
                  className="mt-2 text-xs font-semibold px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Thử lại
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground gap-3">
                <Bell size={32} weight="duotone" className="text-muted-foreground/50" />
                <p className="text-sm font-medium">Không có thông báo nào</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    role="menuitem"
                    tabIndex={0}
                    onClick={(e) => handleNotificationClick(e, n)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleNotificationClick(e as unknown as React.MouseEvent, n);
                      }
                    }}
                    className={`block p-4 transition-colors hover:bg-muted/50 focus:bg-muted/50 focus:outline-none cursor-pointer ${n.status === 'UNREAD' ? 'bg-primary/5' : ''}`}
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
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkRead(n.id, e);
                              }}
                              className="shrink-0 p-1 rounded-md text-primary hover:bg-primary/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                              title={`Đánh dấu thông báo "${n.title}" là đã đọc`}
                              aria-label={`Đánh dấu thông báo "${n.title}" là đã đọc`}
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
                  </div>
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
