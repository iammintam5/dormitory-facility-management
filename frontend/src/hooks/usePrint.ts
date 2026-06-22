import { useCallback, useEffect, useState } from 'react';

export function usePrint(title?: string) {
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    if (!title) return;

    const previousTitle = document.title;
    document.title = title;

    const handleBeforePrint = () => setIsPrinting(true);
    const handleAfterPrint = () => setIsPrinting(false);

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      document.title = previousTitle;
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [title]);

  const print = useCallback(() => {
    window.print();
  }, []);

  return { print, isPrinting };
}
