export function DashboardStatCard({
  label,
  value,
  hint,
  tone = 'slate',
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'slate' | 'emerald' | 'amber' | 'rose' | 'blue';
}) {
  const toneClasses: Record<NonNullable<typeof tone>, string> = {
    slate: 'bg-slate-50 text-slate-900',
    emerald: 'bg-emerald-50 text-emerald-900',
    amber: 'bg-amber-50 text-amber-900',
    rose: 'bg-rose-50 text-rose-900',
    blue: 'bg-sky-50 text-sky-900',
  };

  return (
    <article className={`rounded-2xl p-4 ${toneClasses[tone]}`}>
      <p className="text-sm font-medium opacity-75">{label}</p>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
      {hint ? <p className="mt-2 text-xs opacity-75">{hint}</p> : null}
    </article>
  );
}
