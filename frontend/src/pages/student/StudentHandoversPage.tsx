import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../../components/admin/EmptyState';
import { SectionCard } from '../../components/admin/SectionCard';
import { HandoverStatusBadge } from '../../components/handovers/HandoverStatusBadge';
import { apiClient } from '../../lib/axios';
import { getApiErrorMessage } from '../../lib/api-error';
import { formatDate, formatDateTime } from '../../lib/format';
import { Handover, HandoversResponse } from '../../types/handovers';

export function StudentHandoversPage() {
  const [items, setItems] = useState<Handover[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    void loadHandovers();
  }, []);

  const loadHandovers = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await apiClient.get<HandoversResponse>('/handovers', {
        params: {
          status: 'WAITING_CONFIRMATION',
          page: 1,
          pageSize: 20,
        },
      });
      setItems(response.data.items);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Khong the tai bien ban cho xac nhan.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionCard
        title="Bien ban cho xac nhan"
        description="Sinh vien xem va xac nhan bien ban ban giao tai san do bo phan CSVC gui den."
      >
        {errorMessage && (
          <p className="mb-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</p>
        )}

        {isLoading ? (
          <div className="rounded-2xl bg-slate-50 px-6 py-12 text-center text-sm text-slate-600">
            Dang tai bien ban cho xac nhan...
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="Khong co bien ban nao dang cho xac nhan"
            description="Khi co bien ban moi, ban se thay danh sach tai day de xem va xac nhan."
          />
        ) : (
          <div className="space-y-4">
            {items.map((handover) => (
              <article key={handover.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {handover.handoverCode}
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-slate-900">
                      Phong {handover.room.roomCode} - {handover.student.fullName}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Ngay lap: {formatDate(handover.handoverDate)} | Cap nhat: {formatDateTime(handover.updatedAt ?? handover.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <HandoverStatusBadge status={handover.status} />
                    <Link
                      to={`/student/handovers/${handover.id}`}
                      className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                    >
                      Xem va xac nhan
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
