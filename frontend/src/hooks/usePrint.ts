import { useEffect } from 'react';

export function usePrint(title?: string) {
  useEffect(() => {
    if (!title) {
      return undefined;
    }

    const previousTitle = document.title;
    document.title = title;

    return () => {
      document.title = previousTitle;
    };
  }, [title]);

  return {
    print: () => window.print(),
  };
}
