export function PrintOverlay({ isPrinting }: { isPrinting: boolean }) {
  if (!isPrinting) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/80 backdrop-blur-sm print:hidden">
      <div className="flex flex-col items-center gap-4 rounded-2xl bg-white px-10 py-8 shadow-2xl">
        <svg
          className="h-10 w-10 animate-spin text-primary"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <p className="text-base font-semibold text-foreground">
          Đang in...
        </p>
        <p className="text-sm text-muted-foreground">
          Vui lòng chọn máy in và nhấn In trong hộp thoại của trình duyệt.
        </p>
      </div>
    </div>
  );
}
