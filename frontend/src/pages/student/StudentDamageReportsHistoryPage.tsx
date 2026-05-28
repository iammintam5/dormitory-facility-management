import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../../components/admin/EmptyState';
import { PaginationBar } from '../../components/admin/PaginationBar';
import { SectionCard } from '../../components/admin/SectionCard';
import {
  DamageReportPriorityBadge,
  DamageReportStatusBadge,
} from '../../components/damage-reports/DamageReportBadge';
import { apiClient } from '../../lib/axios';
import { getApiErrorMessage } from '../../lib/api-error';
import { formatDateTime } from '../../lib/format';
import { DamageReport, DamageReportsResponse, DamageReportPriority, DamageReportStatus } from '../../types/damage-reports';

export function StudentDamageReportsHistoryPage() {
  const [reports, setReports] = useState<DamageReport[]>([]);
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    void fetchReports(1);
  }, []);

  const fetchReports = async (nextPage = page) => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await apiClient.get<DamageReportsResponse>('/damage-reports', {
        params: {
          page: nextPage,
          pageSize: 10,
          status: status || undefined,
          priority: priority || undefined,
        },
      });

      setReports(response.data.items);
      setPage(response.data.pagination.page);
      setTotalPages(response.data.pagination.totalPages);
      setTotal(response.data.pagination.total);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Không thể tải lịch sử phiếu báo hỏng.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionCard
        title="Lịch sử báo hỏng"
        description="Theo dõi tất cả phiếu báo hỏng đã gửi và tiến độ xử lý của bộ phận CSVC."
      >
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="grid gap-3 md:grid-cols-2">
            <select value={status} onChange={(event) => setStatus(event.target.value)} className={inputClassName}>
              <option value="">Tất cả trạng thái</option>
              {damageStatuses.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <select value={priority} onChange={(event) => setPriority(event.target.value)} className={inputClassName}>
              <option value="">Tất cả ưu tiên</option>
              {damagePriorities.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void fetchReports(1)}
              className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
            >
              Lọc dữ liệu
            </button>
            <Link
              to="/student/damage-reports/new"
              className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Tạo phiếu mới
            </Link>
          </div>
        </div>

        {errorMessage && (
          <p className="mb-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errorMessage}
          </p>
        )}

        {isLoading ? (
          <div className="rounded-2xl bg-slate-50 px-6 py-12 text-center text-sm text-slate-600">
            Đang tải lịch sử phiếu báo hỏng...
          </div>
        ) : reports.length === 0 ? (
          <EmptyState
            title="Chưa có phiếu báo hỏng nào"
            description="Khi phát hiện sự cố tài sản, bạn có thể tạo phiếu mới để bộ phận CSVC tiếp nhận."
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Phiếu</th>
                    <th className="px-4 py-3 font-medium">Tài sản / Phòng</th>
                    <th className="px-4 py-3 font-medium">Ưu tiên</th>
                    <th className="px-4 py-3 font-medium">Trạng thái</th>
                    <th className="px-4 py-3 font-medium">Cập nhật</th>
                    <th className="px-4 py-3 font-medium">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {reports.map((report) => (
                    <tr key={report.id}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{report.reportCode}</p>
                        <p className="mt-1 text-xs text-slate-500">{report.description}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <p>{report.asset?.assetName ?? '--'}</p>
                        <p className="text-xs text-slate-500">{report.room?.roomCode ?? '--'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <DamageReportPriorityBadge priority={report.priority} />
                      </td>
                      <td className="px-4 py-3">
                        <DamageReportStatusBadge status={report.status} />
                      </td>
                      <td className="px-4 py-3 text-slate-600">{formatDateTime(report.updatedAt ?? report.createdAt)}</td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/student/damage-reports/${report.id}`}
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Xem chi tiết
                        </Link>
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
                onPageChange={(next) => void fetchReports(next)}
              />
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

const tabs: { label: string; values: DamageReportStatus[] | null }[] = [
  { label: 'Tất cả', values: null },
  {
    label: 'Chờ tiếp nhận',
    values: ['SUBMITTED'],
  },
  {
    label: 'Đang xử lý',
    values: ['REVIEWING', 'APPROVED', 'IN_PROGRESS'],
  },
  {
    label: 'Hoàn tất',
    values: ['COMPLETED'],
  },
  {
    label: 'Đã huỷ',
    values: ['REJECTED'],
  },
];

const damagePriorities: DamageReportPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

const inputClassName =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500';

const damageStatuses: DamageReportStatus[] = [
  'SUBMITTED',
  'REVIEWING',
  'APPROVED',
  'REJECTED',
  'IN_PROGRESS',
  'COMPLETED',
];
