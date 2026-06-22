import { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
};

export function PageHeader({ title, description, actions, breadcrumbs }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-wide uppercase text-foreground">{title}</h1>
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground font-medium">
            {breadcrumbs.map((crumb, index) => (
              <span key={index} className="flex items-center gap-2">
                {crumb.href ? (
                  <Link to={crumb.href} className="text-primary hover:underline transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">{crumb.label}</span>
                )}
                {index < breadcrumbs.length - 1 && <span className="text-muted-foreground">/</span>}
              </span>
            ))}
          </div>
        ) : (
          description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
