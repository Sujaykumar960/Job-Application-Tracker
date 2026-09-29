import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-[#1D2226] dark:text-slate-100">
              Something went wrong
            </h2>
            <p className="text-[#56687A] mt-2 text-sm max-w-md break-words">
              {this.state.message ?? 'An unexpected error occurred while rendering this view.'}
            </p>
          </div>
          <button
            type="button"
            onClick={this.handleReload}
            className="px-4 py-2 rounded-lg bg-[#0A66C2] text-white text-sm font-medium hover:bg-[#0A58A3] transition-colors"
          >
            Reload page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;