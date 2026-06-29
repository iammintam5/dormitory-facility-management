import * as React from 'react';
import { useEffect, useRef, useId } from 'react';
import { X } from '@phosphor-icons/react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';
  className?: string;
  preventCloseOnOverlayClick?: boolean;
  role?: 'dialog' | 'alertdialog';
  'aria-describedby'?: string;
  initialFocusRef?: React.RefObject<HTMLElement>;
}

export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  footer, 
  children, 
  size = 'md', 
  className = '', 
  preventCloseOnOverlayClick = false,
  role = 'dialog',
  'aria-describedby': ariaDescribedBy,
  initialFocusRef,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const initialFocusRefRef = useRef(initialFocusRef);
  
  // Create unique IDs for accessibility
  const internalId = useId();
  const titleId = title ? `modal-title-${internalId}` : undefined;

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    initialFocusRefRef.current = initialFocusRef;
  }, [initialFocusRef]);

  // Close on Escape & Focus Management
  useEffect(() => {
    if (!isOpen) return;
    
    // Store previously focused element
    previouslyFocusedElement.current = document.activeElement as HTMLElement;
    
    // Focus the initial element or dialog when opened
    // Use setTimeout to ensure the DOM is painted
    const focusTimeout = setTimeout(() => {
      if (initialFocusRefRef.current?.current) {
        initialFocusRefRef.current.current.focus();
      } else {
        dialogRef.current?.focus();
      }
    }, 10);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!preventCloseOnOverlayClick) {
          onCloseRef.current();
        }
        return;
      }
      
      // Basic Focus Trap
      if (e.key === 'Tab') {
        const focusableElements = dialogRef.current?.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) as NodeListOf<HTMLElement>;
        
        if (!focusableElements || focusableElements.length === 0) {
          e.preventDefault();
          return;
        }
        
        // Filter out hidden elements
        const visibleFocusable = Array.from(focusableElements).filter(el => {
          return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length) && window.getComputedStyle(el).visibility !== 'hidden';
        });

        if (visibleFocusable.length === 0) return;

        const firstElement = visibleFocusable[0];
        const lastElement = visibleFocusable[visibleFocusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement || document.activeElement === dialogRef.current) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(focusTimeout);
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus
      if (previouslyFocusedElement.current && document.body.contains(previouslyFocusedElement.current)) {
        previouslyFocusedElement.current.focus();
      } else {
        // Fallback if previous element is removed
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
          mainContent.focus();
        }
      }
    };
  }, [isOpen, preventCloseOnOverlayClick]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;  
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = originalStyle; };
    }
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
        onClick={() => !preventCloseOnOverlayClick && onClose()}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={ariaDescribedBy}
        tabIndex={-1}
        className={`relative z-50 w-full ${sizeClasses[size]} rounded-xl border border-border/50 bg-card shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-scale-in outline-none focus-visible:ring-2 focus-visible:ring-primary ${className}`}
      >
        {title && (
          <ModalHeader onClose={preventCloseOnOverlayClick ? undefined : onClose}>
            <ModalTitle id={titleId}>{title}</ModalTitle>
          </ModalHeader>
        )}
        {title || footer ? (
          <ModalBody>
            {React.Children.map(children, (child) => {
              if (React.isValidElement(child)) {
                return React.cloneElement(child as React.ReactElement<{ onClose?: () => void }>, { onClose });
              }
              return child;
            })}
          </ModalBody>
        ) : (
          React.Children.map(children, (child) => {
            if (React.isValidElement(child)) {
              return React.cloneElement(child as React.ReactElement<{ onClose?: () => void }>, { onClose });
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
          aria-label="Đóng hộp thoại"
          className="text-muted-foreground hover:text-foreground hover:bg-muted p-1.5 rounded-lg transition-all duration-150 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <X size={18} weight="bold" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export function ModalTitle({ children, className = '', id }: { children: React.ReactNode, className?: string, id?: string }) {
  return (
    <h2 id={id} className={`text-lg font-semibold text-foreground ${className}`}>
      {children}
    </h2>
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
