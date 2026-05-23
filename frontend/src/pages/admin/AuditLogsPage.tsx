import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../../components/admin/EmptyState';
import { PaginationBar } from '../../components/admin/PaginationBar';
import { SectionCard } from '../../components/admin/SectionCard';
import { apiClient } from '../../lib/axios';
import { getApiErrorMessage } from '../../lib/api-error';
import { formatDateTime } from '../../lib/format';
import { AuditLog, AuditLogsResponse } from '../../types/notifications';

export function AuditLogsPage() {
  const [items, setItems] = useState<AuditLog[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [action, setAction] = useState('');
  const [tableName, setTableName] = useState('');
  const [userId, setUserId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [keyword, setKeyword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    void loadLogs(page);
  }, [page, action, tableName, userId, from, to, keyword]);

  async function loadLogs(nextPage = page) {
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
      setErrorMessage(getApiErrorMessage(error, 'Khong the tai audit log.'));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <Link
          to="/admin/dashboard"
          className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Quay lai dashboard
        </Link>
      </div>

      <SectionCard
        title="Audit log"
        description="Theo doi cac thao tac quan trong trong he thong, loc theo user, action, bang du lieu va thoi gian."
      >
        {errorMessage && (
          <p className="mb-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</p>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Action">
            <input className={inputClassName} value={action} onChange={(event) => { setPage(1); setAction(event.target.value); }} />
          </Field>
          <Field label="Bang">
            <input className={inputClassName} value={tableName} onChange={(event) => { setPage(1); setTableName(event.target.value); }} />
          </Field>
          <Field label="User ID">
            <input className={inputClassName} value={userId} onChange={(event) => { setPage(1); setUserId(event.target.value); }} />
          </Field>
          <Field label="Tu ngay">
            <input type="date" className={inputClassName} value={from} onChange={(event) => { setPage(1); setFrom(event.target.value); }} />
          </Field>
          <Field label="Den ngay">
            <input type="date" className={inputClassName} value={to} onChange={(event) => { setPage(1); setTo(event.target.value); }} />
          </Field>
          <Field label="Tu khoa">
            <input className={inputClassName} value={keyword} onChange={(event) => { setPage(1); setKeyword(event.target.value); }} />
          </Field>
        </div>

        <div className="mt-6">
          {isLoading ? (
            <div className="rounded-2xl bg-slate-50 px-6 py-12 text-center text-sm text-slate-600">
              Dang tai audit log...
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              title="Chua co log phu hop"
              description="Thu dieu chinh bo loc de tim cac thao tac can theo doi."
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">Thoi gian</th>
                      <th className="px-4 py-3 font-medium">User</th>
                      <th className="px-4 py-3 font-medium">Action / Bang</th>
                      <th className="px-4 py-3 font-medium">Chi tiet</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 text-slate-700">{formatDateTime(item.createdAt)}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{item.user?.fullName ?? 'System'}</p>
                          <p className="text-xs text-slate-500">{item.user?.userCode ?? '--'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{item.action}</p>
                          <p className="text-xs text-slate-500">
                            {item.tableName} / record #{item.recordId ?? '--'}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-2 text-xs text-slate-600">
                            {item.ipAddress && <p>IP: {item.ipAddress}</p>}
                            {item.oldValue && (
                              <details>
                                <summary className="cursor-pointer font-medium text-slate-700">Old value</summary>
                                <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-slate-50 p-3">{item.oldValue}</pre>
                              </details>
                            )}
                            {item.newValue && (
                              <details>
                                <summary className="cursor-pointer font-medium text-slate-700">New value</summary>
                                <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-slate-50 p-3">{item.newValue}</pre>
                              </details>
                            )}
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
                  onPageChange={(nextPage) => setPage(nextPage)}
                />
              </div>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

const inputClassName =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400';
