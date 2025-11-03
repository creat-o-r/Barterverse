'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to our server error logging endpoint
    fetch('/api/logs/server-errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'nextjs-framework',
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
          code: error.digest,
        },
      }),
    }).catch((err) => {
      console.error('Failed to log error:', err);
    });

    // Also log to console
    console.error('Global error caught:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>Something went wrong!</h2>
          <p style={{ color: '#666', marginTop: '1rem' }}>
            {error.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: '2rem',
              padding: '0.5rem 1rem',
              background: '#7EA9CC',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
