import { ReactNode } from 'react';

type SectionCardProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function SectionCard({ title, description, actions, children, className = '' }: SectionCardProps) {
  return (
    <section className={`h-fit self-start rounded-2xl border border-border bg-white p-5 shadow-sm ${className}`}>
      <div className="flex flex-col gap-3 border-b border-border pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </div>

      <div className="mt-5">{children}</div>
    </section>
  );
}
