'use client';

import { useState, useEffect } from 'react';

interface InteractiveCardProps {
  initialCount: number;
  serverTime: string;
}

/**
 * InteractiveCard - 客户端交互组件
 *
 * 这个组件展示了：
 * 1. 使用 'use client' 标记为客户端组件
 * 2. 可以使用 useState 管理状态
 * 3. 可以使用 useEffect 访问浏览器 API
 * 4. 可以接收来自服务端组件的 props
 */
export function InteractiveCard({
  initialCount,
  serverTime,
}: InteractiveCardProps) {
  const [count, setCount] = useState(initialCount);
  const [clientTime, setClientTime] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  // useEffect 只在客户端执行
  useEffect(() => {
    setIsClient(true);
    setClientTime(new Date().toISOString());

    // 访问浏览器 API
    console.log('[Client] InteractiveCard mounted');
    console.log('[Client] localStorage available:', !!window.localStorage);
  }, []);

  return (
    <div
      style={{
        padding: '1.5rem',
        background: '#e3f2fd',
        borderRadius: '12px',
        border: '2px solid #2196f3',
      }}
    >
      <h3 style={{ margin: '0 0 1rem 0', color: '#1565c0' }}>
        🎮 Interactive Card
      </h3>

      {/* 计数器 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '1rem',
        }}
      >
        <button
          onClick={() => setCount((c) => c - 1)}
          style={{
            padding: '0.5rem 1rem',
            fontSize: '1.25rem',
            background: '#2196f3',
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
          onClick={() => setCount((c) => c + 1)}
          style={{
            padding: '0.5rem 1rem',
            fontSize: '1.25rem',
            background: '#2196f3',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            cursor: 'pointer',
          }}
        >
          +
        </button>
      </div>

      {/* 时间对比 */}
      <div
        style={{
          padding: '1rem',
          background: 'rgba(255,255,255,0.8)',
          borderRadius: '8px',
          fontSize: '0.9rem',
        }}
      >
        <p style={{ margin: '0 0 0.5rem 0' }} suppressHydrationWarning>
          <strong>Server Time (from props):</strong>
          <br />
          <code suppressHydrationWarning>{serverTime}</code>
        </p>
        <p style={{ margin: 0 }}>
          <strong>Client Time (from useEffect):</strong>
          <br />
          <code>{clientTime || 'Loading...'}</code>
        </p>
      </div>

      {/* Hydration 状态 */}
      <div
        style={{
          marginTop: '1rem',
          padding: '0.75rem',
          background: isClient ? '#e8f5e9' : '#fff3e0',
          borderRadius: '8px',
          fontSize: '0.85rem',
        }}
      >
        {isClient ? (
          <span>✅ Hydrated! 客户端交互已启用</span>
        ) : (
          <span>⏳ SSR 渲染中...</span>
        )}
      </div>
    </div>
  );
}
