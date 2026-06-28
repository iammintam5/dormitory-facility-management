import { Spinner } from '@phosphor-icons/react';

export function PageLoader({ text = "Đang tải dữ liệu..." }: { text?: string }) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center bg-background">
      <Spinner className="h-8 w-8 animate-spin text-primary mb-4" />
      <p className="text-sm font-medium text-muted-foreground">{text}</p>
    </div>
  );
}

export function SectionLoader({ text = "Đang tải..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center rounded-lg border border-border/50 bg-muted/20 min-h-[200px]">
      <Spinner className="h-6 w-6 animate-spin text-primary mb-3" />
      <p className="text-xs font-medium text-muted-foreground">{text}</p>
    </div>
  );
}

export function LoadingOverlay({ text = "Đang xử lý..." }: { text?: string }) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm rounded-lg" aria-live="polite">
      <div className="bg-card shadow-lg border border-border p-4 rounded-xl flex items-center gap-3">
        <Spinner className="h-5 w-5 animate-spin text-primary" />
        <span className="text-sm font-medium text-foreground">{text}</span>
      </div>
    </div>
  );
}
