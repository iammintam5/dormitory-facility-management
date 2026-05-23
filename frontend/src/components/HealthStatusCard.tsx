import { useEffect, useState } from 'react';
import { apiClient } from '../lib/axios';

type HealthResponse = {
  status: string;
};

type RequestState = 'idle' | 'loading' | 'success' | 'error';

export function HealthStatusCard() {
  const [requestState, setRequestState] = useState<RequestState>('idle');
  const [healthStatus, setHealthStatus] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const controller = new AbortController();

    const fetchHealth = async () => {
      setRequestState('loading');
      setErrorMessage('');

      try {
        const response = await apiClient.get<HealthResponse>('/health', {
          signal: controller.signal,
        });

        setHealthStatus(response.data.status);
        setRequestState('success');
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setRequestState('error');
        setErrorMessage('Khong the ket noi toi backend. Hay kiem tra server va bien moi truong.');
      }
    };

    void fetchHealth();

    return () => controller.abort();
  }, []);

  const badgeClassName =
    requestState === 'success'
      ? 'bg-emerald-100 text-emerald-700'
      : requestState === 'error'
        ? 'bg-rose-100 text-rose-700'
        : 'bg-amber-100 text-amber-700';

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Trang thai ket noi</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">
            {requestState === 'loading' && 'Dang kiem tra...'}
            {requestState === 'success' && 'Backend da san sang'}
            {requestState === 'error' && 'Ket noi that bai'}
            {requestState === 'idle' && 'Chua kiem tra'}
          </h2>
        </div>

        <span className={`inline-flex w-fit rounded-full px-3 py-1 text-sm font-semibold ${badgeClassName}`}>
          {requestState === 'success' ? healthStatus : requestState}
        </span>
      </div>

      <div className="mt-4 rounded-lg bg-white p-4 text-sm text-slate-600">
        {requestState === 'success' && (
          <p>
            Frontend goi thanh cong API health check. Backend tra ve:
            <code className="ml-2 rounded bg-slate-100 px-2 py-1">{`{ status: "${healthStatus}" }`}</code>
          </p>
        )}

        {requestState === 'error' && <p>{errorMessage}</p>}

        {(requestState === 'idle' || requestState === 'loading') && (
          <p>Frontend dang thuc hien request toi backend qua Axios.</p>
        )}
      </div>
    </div>
  );
}
