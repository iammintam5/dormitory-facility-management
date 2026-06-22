import { ReactNode } from 'react';

type FieldProps = {
  label: string;
  error?: string;
  children: ReactNode;
  className?: string;
};

export function Field({ label, error, children, className = '' }: FieldProps) {
  return (
    <label className={`block space-y-1.5 ${className}`}>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </label>
  );
}
