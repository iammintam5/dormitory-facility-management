import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { PaginationBar } from '../../components/admin/PaginationBar';
import { Modal } from '../../components/ui/Modal';
import { apiClient } from '../../lib/axios';
import { getApiErrorMessage } from '../../lib/api-error';
import { formatDateTime } from '../../lib/format';
import { AuditLog, AuditLogsResponse } from '../../types/notifications';

const COMMON_ACTIONS = [
  { value: '', label: '-- Tất cả hành động --' },
  { value: 'login', label: 'Đăng nhập (login)' },
  { value: 'login_failed', label: 'Đăng nhập lỗi (login_failed)' },
  { value: 'create', label: 'Tạo mới (create)' },
  { value: 'update', label: 'Cập nhật (update)' },
  { value: 'delete', label: 'Xóa (delete)' },
  { value: 'assign', label: 'Gán/Bàn giao (assign)' },
  { value: 'unassign', label: 'Hủy gán (unassign)' },
  { value: 'approve', label: 'Phê duyệt (approve)' },
  { value: 'reject', label: 'Từ chối (reject)' },
  { value: 'complete', label: 'Hoàn thành (complete)' },
];

const COMMON_TABLES = [
  { value: '', label: '-- Tất cả bảng --' },
  { value: 'auth', label: 'Xác thực (auth)' },
  { value: 'users', label: 'Người dùng (users)' },
  { value: 'assets', label: 'Tài sản (assets)' },
  { value: 'rooms', label: 'Phòng (rooms)' },
  { value: 'buildings', label: 'Khu nhà (buildings)' },
  { value: 'damage_reports', label: 'Báo hỏng (damage_reports)' },
  { value: 'inventory_checks', label: 'Kiểm kê (inventory_checks)' },
  { value: 'maintenance_records', label: 'Bảo trì (maintenance_records)' },
  { value: 'liquidation_records', label: 'Thanh lý (liquidation_records)' },
  { value: 'room_students', label: 'Gán phòng (room_students)' },
];

function getActionBadgeVariant(action: string): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' {
  const normalized = action.toLowerCase();
  if (normalized.includes('create') || normalized.includes('assign') || normalized.includes('add') || normalized.includes('approve') || normalized.includes('complete')) return 'success';
  if (normalized.includes('update') || normalized.includes('edit') || normalized.includes('modify')) return 'secondary';
  if (normalized.includes('delete') || normalized.includes('remove') || normalized.includes('fail') || normalized.includes('reject')) return 'destructive';
  if (normalized.includes('warning') || normalized.includes('alert')) return 'warning';
  return 'default';
}

function getInitials(name: string) {
  if (!name) return '?';
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function JsonViewer({ data }: { data: string }) {
  try {
    const parsed = JSON.parse(data);
    return (
      <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-900 p-4 text-xs leading-relaxed text-emerald-400 overflow-x-auto shadow-inner border border-slate-800">
        {JSON.stringify(parsed, null, 2)}
      </pre>
    );
  } catch (e) {
    return (
      <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-100 p-4 text-xs text-slate-700 overflow-x-auto border border-slate-200">
        {data}
      </pre>
    );
  }
}

export function AuditLogsPage() {
  const [items, setItems] = useState<AuditLog[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Filters
  const [action, setAction] = useState('');
  const [tableName, setTableName] = useState('');
  const [userId, setUserId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [keyword, setKeyword] = useState('');
  
  // Modal Payload State
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadLogs = useCallback(async (nextPage: number) => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await apiClient.get<AuditLogsResponse>('/audit-logs', {
        params: {
          page: nextPage,
          pageSize: 20,
          action: action.trim() || undefined,
          tableName: tableName.trim() || undefined,
          userId: userId.trim() || undefined,
          from: from || undefined,
          to: to || undefined,
          keyword: keyword.trim() || undefined,
        },
      });

      setItems(response.data.items);
      setPage(response.data.pagination.page);
      setTotalPages(response.data.pagination.totalPages);
      setTotal(response.data.pagination.total);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Không thể tải lịch sử hệ thống.'));
    } finally {
      setIsLoading(false);
    }
  }, [action, tableName, userId, from, to, keyword]);

  useEffect(() => {
    void loadLogs(page);
  }, [page, loadLogs]);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    void loadLogs(1);
  };

  const clearFilters = () => {
    setAction('');
    setTableName('');
    setUserId('');
    setFrom('');
    setTo('');
    setKeyword('');
    setPage(1);
  };

  return (
    <div className="space-y-6 max-w-full mx-auto pb-10">
      
      {/* HEADER & FILTERS */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-900 p-6 text-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">Nhật ký Hệ thống (Audit Logs)</h2>
              <p className="text-slate-400 text-sm mt-1">Giám sát mọi thao tác và truy vết sự cố trong hệ thống</p>
            </div>
          </div>
        </div>

        <CardContent className="p-6 pt-6 bg-slate-50 border-b border-slate-200">
          <form onSubmit={handleFilterSubmit}>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 mb-5">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Hành động</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  </div>
                  <select 
                    className="w-full rounded-lg border-slate-300 bg-white pl-9 pr-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:ring-emerald-500" 
                    value={action} onChange={(e) => setAction(e.target.value)} 
                  >
                    {COMMON_ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Bảng dữ liệu</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
                  </div>
                  <select 
                    className="w-full rounded-lg border-slate-300 bg-white pl-9 pr-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:ring-emerald-500" 
                    value={tableName} onChange={(e) => setTableName(e.target.value)} 
                  >
                    {COMMON_TABLES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">User ID</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  </div>
                  <input 
                    type="text" 
                    placeholder="Nhập ID người dùng" 
                    className="w-full rounded-lg border-slate-300 bg-white pl-9 pr-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:ring-emerald-500" 
                    value={userId} onChange={(e) => setUserId(e.target.value)} 
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Từ khóa (JSON)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </div>
                  <input 
                    type="text" 
                    placeholder="Tìm trong dữ liệu" 
                    className="w-full rounded-lg border-slate-300 bg-white pl-9 pr-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:ring-emerald-500" 
                    value={keyword} onChange={(e) => setKeyword(e.target.value)} 
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Từ ngày</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                  <input 
                    type="date" 
                    className="w-full rounded-lg border-slate-300 bg-white pl-9 pr-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:ring-emerald-500" 
                    value={from} onChange={(e) => setFrom(e.target.value)} 
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Đến ngày</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                  <input 
                    type="date" 
                    className="w-full rounded-lg border-slate-300 bg-white pl-9 pr-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:ring-emerald-500" 
                    value={to} onChange={(e) => setTo(e.target.value)} 
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 mt-2">
              <button 
                type="button" 
                onClick={clearFilters}
                className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 transition"
              >
                Xóa lọc
              </button>
              <button 
                type="submit" 
                className="px-5 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-lg shadow-sm hover:bg-emerald-700 transition"
              >
                Áp dụng bộ lọc
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ERROR MESSAGE */}
      {errorMessage && (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 border border-rose-200 shadow-sm flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {errorMessage}
        </div>
      )}

      {/* TABLE */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 space-y-4">
            <svg className="w-8 h-8 animate-spin text-emerald-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <span className="font-medium">Đang tải dữ liệu lịch sử...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 space-y-3">
            <svg className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
            <span className="font-medium text-lg">Không tìm thấy bản ghi nào</span>
            <span className="text-sm">Hãy thử thay đổi tiêu chí tìm kiếm ở trên</span>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="w-[15%] font-semibold">Thời gian</TableHead>
                    <TableHead className="w-[30%] font-semibold">Người dùng</TableHead>
                    <TableHead className="w-[40%] font-semibold">Hành động / Bảng</TableHead>
                    <TableHead className="w-[15%] font-semibold text-right">Chi tiết Payload</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <TableRow key={item.id} className="hover:bg-slate-50/50 transition">
                      <TableCell className="align-middle whitespace-nowrap">
                        <div className="font-semibold text-slate-800">{item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : '--'}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{item.createdAt ? new Date(item.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '--'}</div>
                      </TableCell>
                      
                      <TableCell className="align-middle">
                        {item.user ? (
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex flex-shrink-0 items-center justify-center font-bold text-sm shadow-sm border border-emerald-200">
                              {getInitials(item.user.fullName)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800">{item.user.fullName}</p>
                              <p className="text-xs text-slate-500 font-medium mt-0.5">{item.user.userCode} • ID: {item.user.id}</p>
                              {item.ipAddress && (
                                <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                                  {item.ipAddress}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-sm font-semibold border border-slate-200 shadow-sm">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" /></svg>
                            Hệ thống
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="align-middle">
                        <div className="space-y-1.5">
                          <Badge variant={getActionBadgeVariant(item.action)} className="uppercase text-[10px] px-2 py-0.5 tracking-wider font-bold">
                            {item.action}
                          </Badge>
                          <div className="text-sm font-semibold text-slate-800 flex flex-wrap items-center gap-1.5 mt-1">
                            <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
                            <span className="truncate">{item.tableName}</span>
                            {item.recordId && (
                              <span className="text-xs text-slate-500 font-mono font-normal ml-0.5">
                                (ID: <span className="font-bold text-slate-700">#{item.recordId}</span>)
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="align-middle text-right">
                        {(!item.oldValue && !item.newValue) ? (
                          <span className="text-sm italic text-slate-400 mr-2">Không có dữ liệu</span>
                        ) : (
                          <button 
                            onClick={() => setSelectedLog(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-emerald-200 bg-white text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg text-sm font-semibold transition"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            Xem chi tiết
                          </button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="text-sm text-slate-500 font-medium">
                Tổng cộng <span className="font-bold text-slate-800">{total}</span> bản ghi
              </div>
              <PaginationBar
                page={page}
                totalPages={totalPages}
                total={total}
                onPageChange={(nextPage) => setPage(nextPage)}
              />
            </div>
          </>
        )}
      </Card>

      {/* PAYLOAD DETAILS MODAL */}
      <Modal 
        isOpen={selectedLog !== null} 
        onClose={() => setSelectedLog(null)} 
        title="Chi tiết Payload (JSON)"
      >
        {selectedLog && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4 text-sm bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-500">Hành động:</span>{' '}
                <Badge variant={getActionBadgeVariant(selectedLog.action)} className="uppercase text-[10px] ml-1">{selectedLog.action}</Badge>
              </div>
              <div>
                <span className="text-slate-500">Bảng:</span> <span className="font-medium text-slate-800">{selectedLog.tableName}</span>
              </div>
              {selectedLog.recordId && (
                <div>
                  <span className="text-slate-500">Record ID:</span> <span className="font-medium text-slate-800">#{selectedLog.recordId}</span>
                </div>
              )}
            </div>

            {selectedLog.oldValue && (
              <div>
                <h4 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                  Dữ liệu cũ (Old Value)
                </h4>
                <JsonViewer data={selectedLog.oldValue} />
              </div>
            )}
            
            {selectedLog.newValue && (
              <div className="mt-4">
                <h4 className="text-sm font-bold text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  Dữ liệu mới (New Value)
                </h4>
                <JsonViewer data={selectedLog.newValue} />
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-slate-100 mt-6">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition"
                onClick={() => setSelectedLog(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
