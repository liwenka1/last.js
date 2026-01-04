'use client';

import { useState } from 'react';

export default function HomePage() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>Welcome to Last.js 🚀</h1>
      <p>A minimal Next.js alternative with App Router and SSR</p>

      {/* 交互式计数器 - 测试 Hydration */}
      <div
        style={{
          margin: '2rem 0',
          padding: '1.5rem',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '12px',
          color: 'white',
        }}
      >
        <h2 style={{ margin: '0 0 1rem 0' }}>🎉 Interactive Counter</h2>
        <p style={{ margin: '0 0 1rem 0', opacity: 0.9 }}>
          This counter demonstrates client-side hydration is working!
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => setCount(count - 1)}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '1.25rem',
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            -
          </button>
          <span
            style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              minWidth: '3rem',
              textAlign: 'center',
            }}
          >
            {count}
          </span>
          <button
            onClick={() => setCount(count + 1)}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '1.25rem',
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            +
          </button>
        </div>
      </div>

      <h2>Features</h2>
      <ul>
        <li>✅ File-system based App Router</li>
        <li>✅ Server-Side Rendering (SSR)</li>
        <li>✅ Client-side Hydration</li>
        <li>✅ React 19 Support</li>
        <li>✅ Dynamic Routes [slug]</li>
        <li>✅ Layout Nesting</li>
        <li>✅ TypeScript Support</li>
        <li>✅ Powered by Vite</li>
      </ul>

      <h2>Quick Start</h2>
      <pre
        style={{ background: '#f5f5f5', padding: '1rem', borderRadius: '4px' }}
      >
        {`# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start`}
      </pre>
    </div>
  );
}
