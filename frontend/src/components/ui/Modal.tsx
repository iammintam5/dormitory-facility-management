import * as React from 'react';
import { useEffect, useRef } from 'react';
import { X } from '@phosphor-icons/react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';
}

export function Modal({ isOpen, onClose, title, footer, children, size = 'md' }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    full: 'max-w-[90vw]',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 print:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        className={`relative z-50 w-full ${sizeClasses[size]} rounded-xl border border-border/50 bg-card shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-scale-in`}
      >
        {title && (
          <ModalHeader onClose={onClose}>
            <ModalTitle>{title}</ModalTitle>
          </ModalHeader>
        )}
        {title || footer ? (
          <ModalBody>
            {React.Children.map(children, (child) => {
              if (React.isValidElement(child)) {
                // @ts-ignore
                return React.cloneElement(child, { onClose });
              }
              return child;
            })}
          </ModalBody>
        ) : (
          React.Children.map(children, (child) => {
            if (React.isValidElement(child)) {
              // @ts-ignore
              return React.cloneElement(child, { onClose });
            }
            return child;
          })
        )}
        {footer && <ModalFooter>{footer}</ModalFooter>}
      </div>
    </div>
  );
}

export function ModalHeader({ children, className = '', onClose }: { children: React.ReactNode, className?: string, onClose?: () => void }) {
  return (
    <div className={`px-6 py-4 border-b border-border/50 flex items-center justify-between shrink-0 ${className}`}>
      {children}
      {onClose && (
        <button 
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground hover:bg-muted p-1.5 rounded-lg transition-all duration-150 active:scale-95"
        >
          <X size={18} weight="bold" />
        </button>
      )}
    </div>
  );
}

export function ModalTitle({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return (
    <h3 className={`text-base font-semibold text-foreground ${className}`}>
      {children}
    </h3>
  );
}

export function ModalBody({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`p-6 overflow-y-auto flex-1 custom-scrollbar ${className}`}>
      {children}
    </div>
  );
}

export function ModalFooter({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`px-6 py-4 border-t border-border/50 flex items-center justify-end gap-3 bg-muted/20 shrink-0 ${className}`}>
      {children}
    </div>
  );
}
