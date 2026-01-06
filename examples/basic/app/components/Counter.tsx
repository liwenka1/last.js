'use client';

import { useState } from 'react';

/**
 * Counter - 客户端组件示例
 *
 * 使用 'use client' 指令标记为客户端组件
 * 这个组件会被 hydrate 并在客户端运行交互逻辑
 */
export function Counter() {
  const [count, setCount] = useState(0);

  return (
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
        This is a <strong>Client Component</strong> - it uses{' '}
        <code>'use client'</code> directive
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
      <p
        style={{
          margin: '1rem 0 0 0',
          fontSize: '0.85rem',
          opacity: 0.8,
        }}
      >
        💡 Hydration works! Click the buttons to test client-side interactivity.
      </p>
    </div>
  );
}
