'use client';

import { Link } from 'lastjs/client';

export const metadata = {
  title: '404 - Page Not Found',
  description: 'The page you are looking for does not exist.',
};

export default function NotFound() {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '4rem 2rem',
      }}
    >
      <h1
        style={{
          fontSize: '6rem',
          margin: '0',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        404
      </h1>
      <h2
        style={{
          fontSize: '1.5rem',
          color: '#333',
          marginBottom: '1rem',
        }}
      >
        Page Not Found
      </h2>
      <p
        style={{
          color: '#666',
          marginBottom: '2rem',
          maxWidth: '400px',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        Sorry, we couldn&apos;t find the page you&apos;re looking for. It might
        have been moved or doesn&apos;t exist.
      </p>
      <Link
        href="/"
        style={{
          display: 'inline-block',
          padding: '0.75rem 1.5rem',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '8px',
          fontWeight: '500',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
      >
        ← Back to Home
      </Link>
    </div>
  );
}
