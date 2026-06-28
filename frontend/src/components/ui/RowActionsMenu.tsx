import { ReactNode, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { DotsThree } from '@phosphor-icons/react';
import { Button } from './Button';

export interface ActionItem {
  id: string;
  label: string;
  icon?: ReactNode;
  variant?: 'default' | 'destructive';
  onClick: () => void;
  disabled?: boolean;
}

interface RowActionsMenuProps {
  actions: ActionItem[];
  ariaLabel?: string;
}

export function RowActionsMenu({ actions, ariaLabel = 'Menu thao tác' }: RowActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current && !menuRef.current.contains(event.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function updatePosition() {
      if (isOpen && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const menuWidth = 192; // w-48 is 12rem = 192px
        const approximateMenuHeight = actions.length * 36 + 16; // rough estimate
        
        let top = rect.bottom + window.scrollY + 4;
        let left = rect.right + window.scrollX - menuWidth;

        // If it overflows the bottom of the viewport, open upwards
        if (rect.bottom + approximateMenuHeight > window.innerHeight) {
          top = rect.top + window.scrollY - approximateMenuHeight - 4;
        }

        setCoords({ top, left });
      }
    }

    if (isOpen) {
      updatePosition();
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true); // Use capture phase to listen to scroll inside table
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, actions.length]);

  if (!actions || actions.length === 0) return null;

  return (
    <>
      <Button 
        ref={buttonRef}
        variant="ghost" 
        size="icon" 
        onClick={() => setIsOpen(!isOpen)} 
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:ring-1 focus-visible:ring-primary"
      >
        <DotsThree size={20} weight="bold" />
      </Button>

      {isOpen && createPortal(
        <div 
          ref={menuRef}
          className="absolute z-[9999] w-48 rounded-md bg-popover shadow-md border border-border py-1 focus:outline-none"
          style={{ top: coords.top, left: coords.left }}
        >
          {actions.map((action, index) => {
            if (action.variant === 'destructive') {
              return (
                <div key={action.id}>
                  {index > 0 && <div className="h-px bg-border my-1 mx-2" />}
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      action.onClick();
                    }}
                    disabled={action.disabled}
                    className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 text-destructive hover:bg-destructive-muted disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:bg-destructive-muted"
                  >
                    {action.icon}
                    {action.label}
                  </button>
                </div>
              );
            }

            return (
              <button
                key={action.id}
                onClick={() => {
                  setIsOpen(false);
                  action.onClick();
                }}
                disabled={action.disabled}
                className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:bg-muted"
              >
                {action.icon}
                {action.label}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
}
