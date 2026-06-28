import { useState, useRef, useEffect, useId } from 'react';
import { Link } from 'react-router-dom';
import { User, LockKey, SignOut, Moon, Sun, Desktop } from '@phosphor-icons/react';
import { type AuthUser as UserType } from '../../types/auth';

interface UserDropdownProps {
  user: UserType;
  basePath: string;
  onLogout: () => void;
  isDark: boolean;
  theme: 'light' | 'dark' | 'system';
  toggleDark: () => void;
  subtitle: string;
}

export function UserDropdown({ user, basePath, onLogout, isDark, theme, toggleDark, subtitle }: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        const menu = document.getElementById(menuId);
        const first = menu?.querySelector('a, button:not([disabled])') as HTMLElement | null;
        if (first) first.focus();
      }, 10);
    } else if (dropdownRef.current?.contains(document.activeElement)) {
      triggerRef.current?.focus();
    }
  }, [isOpen, menuId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;
    const menu = document.getElementById(menuId);
    if (!menu) return;
    const focusable = Array.from(menu.querySelectorAll('a, button:not([disabled])')) as HTMLElement[];
    if (focusable.length === 0) return;

    const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = currentIndex < focusable.length - 1 ? currentIndex + 1 : 0;
      focusable[nextIndex]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : focusable.length - 1;
      focusable[prevIndex]?.focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === 'Tab') {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(true);
          }
        }}
        className="flex items-center gap-3 rounded-full hover:bg-white/5 p-1 pr-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label="Menu tài khoản"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-controls={menuId}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/15 text-xs font-bold text-white backdrop-blur-sm">
          {user.profile?.avatarUrl ? (
            <img src={user.profile.avatarUrl} alt={user.fullName} className="h-full w-full object-cover" />
          ) : (
            user.fullName.charAt(0).toUpperCase()
          )}
        </div>
        <div className="hidden flex-col items-start text-left sm:flex">
          <span className="text-xs font-semibold leading-tight text-white">{user.fullName}</span>
          <span className="text-[10px] text-white/60">{subtitle}</span>
        </div>
      </button>

      {isOpen && (
        <div 
          id={menuId}
          role="menu"
          onKeyDown={handleKeyDown}
          className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-border/50 bg-card text-foreground shadow-2xl animate-fade-in-down origin-top-right overflow-hidden flex flex-col"
        >
          <div className="p-4 border-b border-border/50 bg-muted/10">
            <p className="text-sm font-bold truncate">{user.fullName}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email || user.userCode}</p>
          </div>

          <div className="p-2 flex flex-col gap-1">
            <Link 
              to={`${basePath}/profile`}
              onClick={() => setIsOpen(false)}
              role="menuitem"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted focus:bg-muted focus:outline-none"
            >
              <User size={18} weight="duotone" className="text-muted-foreground shrink-0" />
              Hồ sơ cá nhân
            </Link>
            
            <Link 
              to={`${basePath}/change-password`}
              onClick={() => setIsOpen(false)}
              role="menuitem"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted focus:bg-muted focus:outline-none"
            >
              <LockKey size={18} weight="duotone" className="text-muted-foreground shrink-0" />
              Đổi mật khẩu
            </Link>

            <div className="h-px bg-border/50 my-1 mx-2" />

            <button
              onClick={() => {
                toggleDark();
              }}
              role="menuitem"
              className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted focus:bg-muted focus:outline-none"
            >
              <div className="flex items-center gap-3">
                {isDark ? (
                  <Moon size={18} weight="duotone" className="text-muted-foreground shrink-0" />
                ) : (
                  <Sun size={18} weight="duotone" className="text-muted-foreground shrink-0" />
                )}
                Giao diện
              </div>
              <span className="text-xs text-muted-foreground font-semibold bg-muted/50 px-2 py-0.5 rounded">
                {theme === 'system' ? 'Hệ thống' : theme === 'dark' ? 'Tối' : 'Sáng'}
              </span>
            </button>
            
            <div className="h-px bg-border/50 my-1 mx-2" />

            <button
              onClick={() => {
                setIsOpen(false);
                onLogout();
              }}
              role="menuitem"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-500 dark:hover:bg-rose-500/10 focus:bg-rose-50 focus:outline-none dark:focus:bg-rose-500/10"
            >
              <SignOut size={18} weight="duotone" className="shrink-0" />
              Đăng xuất
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
