import React from 'react';

interface FallbackErrorProps {
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

const FallbackError: React.FC<FallbackErrorProps> = ({ error, errorInfo }) => {
  return (
    <div style={{
      fontFamily: 'Arial, sans-serif',
      padding: '20px',
      maxWidth: '800px',
      margin: '0 auto',
      backgroundColor: '#fff',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      marginTop: '50px'
    }}>
      <h1 style={{ color: '#e53935', marginBottom: '20px' }}>Application Error</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ color: '#333', marginBottom: '10px' }}>Something went wrong</h2>
        <p style={{ color: '#666' }}>
          The application encountered an error and couldn't render properly.
          Please try refreshing the page or contact support if the problem persists.
        </p>
      </div>
      
      {error && (
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ color: '#333', marginBottom: '10px' }}>Error Details:</h3>
          <pre style={{
            backgroundColor: '#f5f5f5',
            padding: '15px',
            borderRadius: '4px',
            overflow: 'auto',
            maxHeight: '200px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}>
            {error.message}
          </pre>
        </div>
      )}
      
      {errorInfo && (
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ color: '#333', marginBottom: '10px' }}>Component Stack:</h3>
          <pre style={{
            backgroundColor: '#f5f5f5',
            padding: '15px',
            borderRadius: '4px',
            overflow: 'auto',
            maxHeight: '200px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}>
            {errorInfo.componentStack}
          </pre>
        </div>
      )}
      
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={() => window.location.reload()}
          style={{
            backgroundColor: '#2196f3',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Refresh Page
        </button>
        
        <button
          onClick={() => window.location.href = '/'}
          style={{
            backgroundColor: '#f5f5f5',
            color: '#333',
            border: '1px solid #ddd',
            padding: '10px 20px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Go to Homepage
        </button>
      </div>
    </div>
  );
};

export default FallbackError; 