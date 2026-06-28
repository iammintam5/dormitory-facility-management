import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CaretRight, House } from '@phosphor-icons/react';

export type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
};

export function PageHeader({ title, description, actions, breadcrumbs }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex-1 min-w-0">
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="mb-2 flex items-center text-xs font-medium text-muted-foreground sm:text-sm" aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {breadcrumbs.map((crumb, index) => {
                const isLast = index === breadcrumbs.length - 1;
                const isFirst = index === 0;

                return (
                  <li key={index} className="flex items-center gap-1.5 sm:gap-2">
                    {crumb.href && !isLast ? (
                      <Link 
                        to={crumb.href} 
                        className="flex items-center gap-1.5 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                      >
                        {isFirst && <House size={14} weight="duotone" />}
                        <span className="truncate max-w-[120px] sm:max-w-[200px]">{crumb.label}</span>
                      </Link>
                    ) : (
                      <span className={`flex items-center gap-1.5 truncate max-w-[150px] sm:max-w-[250px] ${isLast ? 'text-foreground font-semibold' : ''}`} aria-current={isLast ? 'page' : undefined}>
                        {isFirst && <House size={14} weight="duotone" className={isLast ? "text-primary" : ""} />}
                        {crumb.label}
                      </span>
                    )}
                    
                    {!isLast && (
                      <CaretRight size={12} weight="bold" className="text-muted-foreground/50 shrink-0" />
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        )}

        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl truncate">
          {title}
        </h1>
        
        {description && (
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex shrink-0 items-center gap-2 sm:mt-0 mt-2">
          {actions}
        </div>
      )}
    </div>
  );
}
