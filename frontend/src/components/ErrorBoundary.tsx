import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
          <h1 className="mb-4 text-3xl font-bold text-foreground">Hệ thống gặp sự cố</h1>
          <p className="mb-8 max-w-md text-muted-foreground">
            Một lỗi không mong muốn đã xảy ra. Bạn có thể tải lại trang hoặc quay về bảng điều khiển để tiếp tục.
          </p>
          {import.meta.env.DEV && this.state.error && (
             <div className="mb-6 bg-rose-500/10 rounded-lg p-3 text-left max-h-40 overflow-y-auto">
               <p className="text-xs font-mono text-rose-500 break-all">
                 {this.state.error.message}
               </p>
             </div>
          )}
          <div className="flex gap-4">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-md hover:bg-primary/90 transition"
            >
              Tải lại trang
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="px-4 py-2 border border-input text-foreground font-semibold rounded-md hover:bg-accent hover:text-accent-foreground transition"
            >
              Về bảng điều khiển
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
