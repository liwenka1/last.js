'use client';

import { useEffect } from 'react';

interface ErrorProps {
  error: Error;
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // 可以在这里记录错误到错误报告服务
    console.error('Error caught by error boundary:', error);
  }, [error]);

  return (
    <div
      style={{
        textAlign: 'center',
        padding: '4rem 2rem',
      }}
    >
      <h1
        style={{
          fontSize: '3rem',
          margin: '0',
          color: '#e53935',
        }}
      >
        ⚠️ Something went wrong!
      </h1>
      <p
        style={{
          color: '#666',
          marginTop: '1rem',
          marginBottom: '2rem',
          maxWidth: '500px',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        An error occurred while rendering this page. You can try again or go
        back to the home page.
      </p>

      <div
        style={{
          background: '#ffebee',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '2rem',
          maxWidth: '600px',
          marginLeft: 'auto',
          marginRight: 'auto',
          textAlign: 'left',
        }}
      >
        <p style={{ margin: 0, color: '#c62828', fontFamily: 'monospace' }}>
          {error.message}
        </p>
      </div>

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <button
          onClick={reset}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#e53935',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontWeight: '500',
            cursor: 'pointer',
            fontSize: '1rem',
          }}
        >
          Try again
        </button>
        <a
          href="/"
          style={{
            padding: '0.75rem 1.5rem',
            background: '#f5f5f5',
            color: '#333',
            textDecoration: 'none',
            borderRadius: '8px',
            fontWeight: '500',
          }}
        >
          Go to Home
        </a>
      </div>
    </div>
  );
}
