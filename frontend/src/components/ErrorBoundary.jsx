import React from 'react';
import * as Sentry from '@sentry/react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[Error Boundary caught rendering crash]:', error, errorInfo);
    
    // Capture in Sentry if initialized
    if (import.meta.env.VITE_SENTRY_DSN) {
      Sentry.captureException(error, { extra: errorInfo });
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl border border-slate-100 shadow-xl p-8 text-center space-y-6">
            <div className="inline-block p-4 bg-red-50 text-red-600 rounded-full">
              <AlertTriangle size={36} />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">
                Something went wrong
              </h2>
              <p className="text-sm text-slate-500 max-w-xs mx-auto">
                An unexpected rendering error occurred. We have logged the issue and are looking into it.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button
                onClick={this.handleReload}
                className="btn-primary py-2.5 px-5 flex items-center justify-center space-x-2 text-xs font-bold shadow-md hover:shadow-lg transition-all"
              >
                <RefreshCw size={14} />
                <span>Reload Page</span>
              </button>
              
              <button
                onClick={this.handleGoHome}
                className="py-2.5 px-5 rounded-xl border border-slate-200 text-slate-650 hover:bg-slate-50 transition-colors flex items-center justify-center space-x-2 text-xs font-bold"
              >
                <Home size={14} />
                <span>Back to Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
