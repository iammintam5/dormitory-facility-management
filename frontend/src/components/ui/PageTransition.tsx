import { type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

interface PageTransitionProps {
  children: ReactNode;
}

/**
 * Wraps page content with a fade-in-up + scale-in animation that
 * re-triggers on every route change by keying on location.key.
 */
export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();

  return (
    <div
      key={location.key}
      className="animate-fade-in-up motion-reduce:animate-none"
    >
      {children}
    </div>
  );
}
