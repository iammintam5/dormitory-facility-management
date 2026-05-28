import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { apiClient } from '../lib/axios';
import { getApiErrorMessage } from '../lib/api-error';
import { formatDate, formatDateTime } from '../lib/format';
import { DamageReportStudentAssetsResponse, DamageReportsResponse } from '../types/damage-reports';
import { AppNotification, NotificationsResponse } from '../types/notifications';

export function StudentDashboardPage() {
  const [roomData, setRoomData] = useState<DamageReportStudentAssetsResponse | null>(null);
  const [pendingReportsCount, setPendingReportsCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    void loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [roomRes, reportsRes, notifRes] = await Promise.all([
        apiClient.get<DamageReportStudentAssetsResponse>('/damage-reports/my-assets'),
        apiClient.get<DamageReportsResponse>('/damage-reports', { params: { status: 'PENDING', pageSize: 1 } }),
        apiClient.get<NotificationsResponse>('/notifications/my', { params: { pageSize: 5 } })
      ]);

      setRoomData(roomRes.data);
      // Backend returns total items in pagination
      setPendingReportsCount(reportsRes.data.pagination.total || 0);
      setNotifications(notifRes.data.items);
    } catch (e) {
      setError(getApiErrorMessage(e, 'Không thể tải dữ liệu bảng điều khiển.'));
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await apiClient.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'READ' } : n));
    } catch (error) {
      // ignore
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-slate-400 animate-pulse font-medium text-lg flex items-center gap-2">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          Đang kết nối hệ thống...
        </div>
      </div>
    );
  }

  const room = roomData?.room;
  const assetsCount = roomData?.assets.length || 0;

  return (
    <div className="space-y-6 max-w-full mx-auto pb-10">
      {error && (
        <div className="p-4 bg-rose-50 text-rose-700 rounded-xl border border-rose-200">
          {error}
        </div>
      )}

      {/* WELCOME SECTION */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">Xin chào! 👋</h2>
          <p className="text-emerald-50 text-base sm:text-lg max-w-2xl">
            Chào mừng bạn đến với Cổng thông tin nội trú. Tại đây bạn có thể theo dõi tài sản trong phòng, báo cáo hỏng hóc và nhận thông báo từ Ban quản lý.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/student/damage-reports/create" className="px-5 py-2.5 bg-white text-emerald-700 font-semibold rounded-xl hover:bg-emerald-50 transition shadow-sm">
              + Tạo báo hỏng mới
            </Link>
            <Link to="/student/damage-reports" className="px-5 py-2.5 bg-emerald-700/50 text-white border border-emerald-500/30 font-semibold rounded-xl hover:bg-emerald-700/70 transition">
              Lịch sử báo hỏng
            </Link>
          </div>
        </div>
        <div className="absolute top-0 right-0 -translate-y-10 translate-x-10 opacity-10">
          <svg width="300" height="300" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zm0 7.5l-7.5-3.75L12 9.5l7.5-3.75L12 9.5zm0 12.5l-10-5v-6.5l10 5 10-5v6.5l-10 5z"/>
          </svg>
        </div>
      </div>

      {/* CARDS */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Card 1: Phòng hiện tại */}
        <Card className="border-sky-100 shadow-sm hover:shadow-md transition group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-sky-800">Phòng Hiện Tại</CardTitle>
            <div className="w-8 h-8 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center group-hover:bg-sky-100 transition">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">{room ? room.roomCode : 'Chưa xếp phòng'}</div>
            <p className="text-xs text-sky-600 font-medium mt-1 flex items-center gap-1">
              {room ? `Khu ${room.floor.building.name} - Tầng ${room.floor.floorNumber}` : 'Liên hệ BQL để được hướng dẫn'}
            </p>
          </CardContent>
        </Card>
        
        {/* Card 2: Tài sản phòng */}
        <Card className="border-emerald-100 shadow-sm hover:shadow-md transition group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-emerald-800">Tài Sản Được Bàn Giao</CardTitle>
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-100 transition">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-800">{assetsCount}</span>
              <span className="text-sm text-slate-500 font-medium">món</span>
            </div>
            <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
              Bạn chịu trách nhiệm bảo quản
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Báo hỏng của tôi */}
        <Card className="border-amber-100 shadow-sm hover:shadow-md transition group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-amber-800">Báo Hỏng Của Bạn</CardTitle>
            <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-100 transition">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">{pendingReportsCount}</div>
            <p className="text-xs text-amber-600 font-medium mt-1 flex items-center gap-1">
              Phiếu đang chờ BQL xử lý
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* DANH SÁCH TÀI SẢN TRONG PHÒNG */}
        <Card className="shadow-sm border-slate-200 flex flex-col">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-lg">Tài sản trong phòng</CardTitle>
            <CardDescription>Danh sách tài sản bạn đang sử dụng</CardDescription>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto max-h-[400px]">
            {roomData?.assets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <svg className="w-12 h-12 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                <p>Không có tài sản nào được ghi nhận.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {roomData?.assets.map(asset => (
                  <li key={asset.id} className="p-4 hover:bg-slate-50 transition flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-slate-800">{asset.assetName}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Mã: {asset.assetCode} • {asset.category.name}</p>
                    </div>
                    <Badge variant={asset.status === 'IN_USE' ? 'success' : 'warning'}>
                      {asset.status === 'IN_USE' ? 'Bình thường' : 'Có lỗi'}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* THÔNG BÁO TỪ BQL */}
        <Card className="shadow-sm border-slate-200 flex flex-col">
          <CardHeader className="border-b border-slate-100 pb-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Thông báo mới</CardTitle>
              <CardDescription>Cập nhật từ Ban Quản lý</CardDescription>
            </div>
            <Link 
              to="/student/notifications" 
              className="text-sm font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg transition"
            >
              Xem tất cả
            </Link>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto max-h-[400px]">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <svg className="w-12 h-12 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                <p>Bạn không có thông báo mới nào.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {notifications.map(notification => (
                  <li 
                    key={notification.id} 
                    className={`p-4 transition cursor-pointer ${notification.status === 'UNREAD' ? 'bg-sky-50/50 hover:bg-sky-50' : 'hover:bg-slate-50'}`}
                    onClick={() => { if(notification.status === 'UNREAD') void markAsRead(notification.id); }}
                  >
                    <div className="flex gap-3">
                      <div className="mt-1 flex-shrink-0">
                        {notification.status === 'UNREAD' ? (
                          <span className="flex h-3 w-3 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full h-3 w-3 bg-slate-300"></span>
                        )}
                      </div>
                      <div>
                        <h4 className={`text-sm ${notification.status === 'UNREAD' ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                          {notification.title}
                        </h4>
                        <p className={`text-sm mt-1 line-clamp-2 ${notification.status === 'UNREAD' ? 'text-slate-600' : 'text-slate-500'}`}>
                          {notification.content}
                        </p>
                        <p className="text-xs text-slate-400 mt-2 font-medium">
                          {formatDateTime(notification.createdAt)}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
