import * as React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ isOpen, onClose, title, children, footer, size = 'md' }: ModalProps) {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />
      <div className={`relative z-50 w-full ${sizeClasses[size]} rounded-lg bg-background shadow-lg flex flex-col max-h-[90vh] sm:my-8`}>
        {title && (
          <div className="shrink-0 px-6 py-4 border-b border-slate-200 text-lg font-semibold leading-none tracking-tight">
            {title}
          </div>
        )}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {children}
        </div>
        {footer && <div className="shrink-0 border-t border-slate-200 px-6 py-4 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
