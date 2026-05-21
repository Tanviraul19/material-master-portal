import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="bg-white border border-red-200 rounded-lg p-8 max-w-lg w-full shadow-md">
            <h2 className="text-xl font-bold text-red-600 mb-2">Something went wrong</h2>
            <pre className="text-xs text-gray-500 bg-gray-50 p-3 rounded overflow-auto max-h-48">
              {this.state.error?.message}
            </pre>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/'; }}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded font-bold text-sm"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
