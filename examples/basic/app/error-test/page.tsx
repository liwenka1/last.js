'use client';

import { useState } from 'react';

export const metadata = {
  title: 'Error Test - Last.js',
  description: 'A page to test error boundary',
};

export default function ErrorTestPage() {
  const [shouldError, setShouldError] = useState(false);

  if (shouldError) {
    throw new Error('This is a test error thrown by the page component!');
  }

  return (
    <div>
      <h1>Error Boundary Test</h1>
      <p>
        Click the button below to trigger an error and see the error boundary in
        action.
      </p>

      <div
        style={{
          padding: '1.5rem',
          background: '#fff3e0',
          borderRadius: '8px',
          marginTop: '1rem',
        }}
      >
        <p style={{ margin: '0 0 1rem 0', color: '#e65100' }}>
          ⚠️ Warning: Clicking this button will throw an error!
        </p>
        <button
          onClick={() => setShouldError(true)}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#ff5722',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontWeight: '500',
            cursor: 'pointer',
            fontSize: '1rem',
          }}
        >
          Trigger Error
        </button>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h2>How it works:</h2>
        <ol>
          <li>Click the &quot;Trigger Error&quot; button</li>
          <li>The page will throw an error</li>
          <li>
            The ErrorBoundary will catch it and show the error.tsx component
          </li>
          <li>Click &quot;Try again&quot; to reset and try again</li>
        </ol>
      </div>
    </div>
  );
}
