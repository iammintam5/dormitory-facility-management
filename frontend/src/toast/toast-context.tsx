import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { CheckCircle, XCircle, WarningCircle, Info, Spinner } from '@phosphor-icons/react';

type ToastTone = 'success' | 'error' | 'warning' | 'info' | 'loading';

type ToastItem = {
  id: number;
  message: string;
  tone: ToastTone;
};

type ToastContextValue = {
  showToast: (message: string, tone?: ToastTone) => void;
  removeToast: (id: number) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextIdRef = useRef(1);

  const removeToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string, tone: ToastTone = 'success') => {
    const id = nextIdRef.current++;
    setToasts((current) => [...current, { id, message, tone }]);

    if (tone !== 'loading') {
      window.setTimeout(() => {
        removeToast(id);
      }, 4000);
    }
  }, [removeToast]);

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast,
      removeToast,
    }),
    [showToast, removeToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div 
        aria-live="polite" 
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-3 sm:bottom-6 sm:right-6"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.tone === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-lg border px-4 py-3 shadow-lg animate-fade-in-up bg-card text-foreground transition-all dark:bg-zinc-900 ${
              toast.tone === 'success' ? 'border-emerald-500/30' :
              toast.tone === 'error' ? 'border-rose-500/30' :
              toast.tone === 'warning' ? 'border-amber-500/30' :
              'border-border'
            }`}
          >
            {toast.tone === 'success' && <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" weight="fill" />}
            {toast.tone === 'error' && <XCircle className="h-5 w-5 text-rose-500 shrink-0" weight="fill" />}
            {toast.tone === 'warning' && <WarningCircle className="h-5 w-5 text-amber-500 shrink-0" weight="fill" />}
            {toast.tone === 'info' && <Info className="h-5 w-5 text-blue-500 shrink-0" weight="fill" />}
            {toast.tone === 'loading' && <Spinner className="h-5 w-5 text-muted-foreground shrink-0 animate-spin" />}
            <p className="text-sm font-medium leading-relaxed">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              aria-label="Đóng thông báo"
              className="ml-auto rounded-md p-1 text-muted-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary shrink-0"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within ToastProvider.');
  }

  return context;
}
