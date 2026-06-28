import { formatDateTime } from '../../lib/date';
import { DamageReportLog } from '../../types/damage-reports';

export function DamageReportTimeline({ logs }: { logs: DamageReportLog[] }) {
  return (
    <div className="space-y-4">
      {logs.map((log) => (
        <div key={log.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <span className="mt-1 h-3 w-3 rounded-full bg-emerald-500" />
            <span className="mt-2 h-full w-px bg-muted last:hidden" />
          </div>
          <div className="flex-1 rounded-2xl border border-border bg-muted/30 p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">{log.action}</p>
                <p className="mt-1 text-sm text-foreground">
                  {log.oldStatus ? `${log.oldStatus} -> ${log.newStatus ?? '--'}` : log.newStatus ?? '--'}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</p>
            </div>
            <p className="mt-3 text-sm text-foreground">{log.note || 'Không có ghi chú bổ sung.'}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Thực hiện bởi {log.createdByUser.fullName} ({log.createdByUser.userCode})
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
