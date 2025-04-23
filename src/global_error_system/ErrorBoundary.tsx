import React, { Component } from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: any;
}

// Error display component
const ErrorDisplay = ({ error }: { error: any }) => (
  <div style={{ 
    margin: '2rem', 
    padding: '1rem', 
    border: '2px solid #dc3545',
    borderRadius: '0.5rem',
    backgroundColor: '#f8d7da'
  }}>
    <h2 style={{ color: '#dc3545' }}>React Error</h2>
    <p>{error?.message || 'Unknown error'}</p>
    {error?.stack && (
      <pre style={{ 
        backgroundColor: '#f8f9fa', 
        padding: '1rem',
        maxHeight: '300px',
        overflow: 'auto'
      }}>
        {error.stack}
      </pre>
    )}
    <button 
      onClick={() => window.location.reload()} 
      style={{
        backgroundColor: '#0d6efd',
        color: 'white',
        border: 'none',
        borderRadius: '0.25rem',
        padding: '0.375rem 0.75rem',
        marginTop: '1rem'
      }}
    >
      Reload Page
    </button>
  </div>
);

class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('React error boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorDisplay error={this.state.error} />;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;