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
        <div className="min-h-screen bg-gradient-to-br from-rose-50 to-red-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
            <div className="mb-6 flex justify-center">
              <svg
                className="w-16 h-16 text-rose-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Đã xảy ra lỗi
            </h1>
            <p className="text-muted-foreground mb-6">
              Xin lỗi, hệ thống gặp sự cố. Vui lòng thử lại hoặc liên hệ với quản trị viên.
            </p>
            {this.state.error && (
              <div className="mb-6 bg-rose-50 rounded-lg p-3 text-left max-h-40 overflow-y-auto">
                <p className="text-xs font-mono text-rose-700 break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}
            <div className="flex flex-col gap-3">
              <button
                onClick={() => window.location.href = '/'}
                className="w-full px-4 py-3 bg-card text-white font-semibold rounded-xl hover:bg-slate-700 transition"
              >
                Về trang chủ
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full px-4 py-3 border border-border text-foreground font-semibold rounded-xl hover:bg-muted/30 transition"
              >
                Tải lại trang
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
