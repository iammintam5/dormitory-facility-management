import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, LockKey, SignOut, Moon, Sun, Desktop } from '@phosphor-icons/react';
import { type AuthUser as UserType } from '../../types/auth';

interface UserDropdownProps {
  user: UserType;
  basePath: string;
  onLogout: () => void;
  isDark: boolean;
  toggleDark: () => void;
  subtitle: string;
}

export function UserDropdown({ user, basePath, onLogout, isDark, toggleDark, subtitle }: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 rounded-full hover:bg-white/5 p-1 pr-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label="Menu tài khoản"
        aria-expanded={isOpen}
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
        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-border/50 bg-card text-foreground shadow-2xl animate-fade-in-down origin-top-right overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border/50 bg-muted/10">
            <p className="text-sm font-bold truncate">{user.fullName}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email || user.userCode}</p>
          </div>

          <div className="p-2 flex flex-col gap-1">
            <Link 
              to={`${basePath}/profile`}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
            >
              <User size={18} weight="duotone" className="text-muted-foreground shrink-0" />
              Hồ sơ cá nhân
            </Link>
            
            <Link 
              to={`${basePath}/change-password`}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
            >
              <LockKey size={18} weight="duotone" className="text-muted-foreground shrink-0" />
              Đổi mật khẩu
            </Link>

            <div className="h-px bg-border/50 my-1 mx-2" />

            <button
              onClick={() => {
                toggleDark();
              }}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
            >
              <div className="flex items-center gap-3">
                {isDark ? (
                  <Sun size={18} weight="duotone" className="text-muted-foreground shrink-0" />
                ) : (
                  <Moon size={18} weight="duotone" className="text-muted-foreground shrink-0" />
                )}
                Giao diện
              </div>
              <span className="text-xs text-muted-foreground font-semibold bg-muted/50 px-2 py-0.5 rounded">
                {isDark ? 'Tối' : 'Sáng'}
              </span>
            </button>
            
            <div className="h-px bg-border/50 my-1 mx-2" />

            <button
              onClick={() => {
                setIsOpen(false);
                onLogout();
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-500 dark:hover:bg-rose-500/10"
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
