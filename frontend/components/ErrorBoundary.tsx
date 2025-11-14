import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if it's a user rejection error
    const errorMessage = error?.message?.toLowerCase() || '';
    const isUserRejection = errorMessage.includes('rejected') || 
                            errorMessage.includes('user') ||
                            errorMessage.includes('denied') ||
                            errorMessage.includes('cancelled') ||
                            errorMessage.includes('cancel');
    
    // If it's a user rejection, don't show the error boundary
    if (isUserRejection) {
      return { hasError: false, error: null };
    }
    
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Check if it's a user rejection - if so, suppress it
    const errorMessage = error?.message?.toLowerCase() || '';
    const isUserRejection = errorMessage.includes('rejected') || 
                            errorMessage.includes('user') ||
                            errorMessage.includes('denied') ||
                            errorMessage.includes('cancelled') ||
                            errorMessage.includes('cancel');
    
    if (isUserRejection) {
      // Reset error state for user rejections
      this.setState({ hasError: false, error: null });
      console.log('User rejected transaction - error suppressed');
      return;
    }
    
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center bg-zinc-900 text-white p-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
            <p className="text-zinc-400 mb-4">{this.state.error?.message || 'An unexpected error occurred'}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;



