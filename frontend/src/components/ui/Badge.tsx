import * as React from 'react';

export type BadgeTone = 'slate' | 'amber' | 'emerald' | 'sky' | 'indigo' | 'rose' | 'teal' | 'violet';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info';
  /** Workflow status key for automatic label/tone/icon mapping */
  status?: string;
  /** Override the label from the status mapping */
  label?: string;
  /** Override the default tone for workflow status badges */
  tone?: BadgeTone;
  /** Optional icon element */
  icon?: React.ReactNode;
}

type WorkflowStatusMeta = {
  label: string;
  tone: BadgeTone;
  icon?: React.ReactNode;
};

const toneClassNames: Record<BadgeTone, string> = {
  slate: 'border-slate-200 bg-slate-100 text-slate-700',
  amber: 'border-amber-200 bg-amber-100 text-amber-700',
  emerald: 'border-emerald-200 bg-emerald-100 text-emerald-700',
  sky: 'border-sky-200 bg-sky-100 text-sky-700',
  indigo: 'border-indigo-200 bg-indigo-100 text-indigo-700',
  rose: 'border-rose-200 bg-rose-100 text-rose-700',
  teal: 'border-teal-200 bg-teal-100 text-teal-700',
  violet: 'border-violet-200 bg-violet-100 text-violet-700',
};

const statusMetaMap: Record<string, WorkflowStatusMeta> = {
  DRAFT: { label: 'Bản nháp', tone: 'slate', icon: <DocumentIcon /> },
  SUBMITTED: { label: 'Mới gửi', tone: 'amber', icon: <ClockIcon /> },
  REVIEWING: { label: 'Đang xem', tone: 'sky' },
  WAITING_CONFIRMATION: { label: 'Chờ xác nhận', tone: 'amber', icon: <ClockIcon /> },
  PENDING: { label: 'Chờ xử lý', tone: 'amber', icon: <ClockIcon /> },
  PENDING_APPROVAL: { label: 'Chờ duyệt', tone: 'amber', icon: <ClockIcon /> },
  APPROVED: { label: 'Đã duyệt', tone: 'emerald', icon: <CheckIcon /> },
  CONFIRMED: { label: 'Đã xác nhận', tone: 'emerald', icon: <CheckIcon /> },
  IN_PROGRESS: { label: 'Đang xử lý', tone: 'indigo' },
  COMPLETED: { label: 'Hoàn tất', tone: 'emerald', icon: <CheckIcon /> },
  RETURNED: { label: 'Đã thu hồi', tone: 'violet' },
  REJECTED: { label: 'Từ chối', tone: 'rose' },
  CANCELLED: { label: 'Đã hủy', tone: 'slate' },
};

function Badge({ className = '', variant = 'default', status, label, tone, icon, ...props }: BadgeProps) {
  const baseStyles =
    'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2';

  // Workflow status mode
  if (status) {
    const meta = statusMetaMap[status] ?? { label: status, tone: 'slate' as const };
    const resolvedTone = tone ?? meta.tone;

    return (
      <div className={`${baseStyles} gap-1.5 ${toneClassNames[resolvedTone]} ${className}`} {...props}>
        {icon ?? meta.icon}
        <span>{label ?? meta.label}</span>
      </div>
    );
  }

  // Normal variant mode (original behavior)
  const variants = {
    default: 'border-transparent bg-primary text-primary-foreground',
    secondary: 'border-transparent bg-secondary text-secondary-foreground',
    destructive: 'border-transparent bg-destructive text-destructive-foreground',
    outline: 'text-foreground',
    success: 'border-transparent bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
    warning: 'border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
    info: 'border-transparent bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
  };

  const variantStyles = variants[variant] || variants.default;

  return <div className={`${baseStyles} ${variantStyles} ${className}`} {...props} />;
}

export { Badge };

// ===== Inline SVG icons for workflow statuses =====

function DocumentIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m-3-12H8a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V10l-6-6z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}
