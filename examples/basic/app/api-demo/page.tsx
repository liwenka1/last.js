'use client';

import { useState, useEffect } from 'react';

export default function ApiDemoPage() {
  // 在客户端设置页面标题
  useEffect(() => {
    document.title = 'API 演示 - Last.js';
  }, []);
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState('1');
  const [postData, setPostData] = useState('{"message":"Hello"}');

  const fetchApi = async (url: string, options?: RequestInit) => {
    setLoading(true);
    setResponse(null);
    try {
      const res = await fetch(url, options);
      const data = await res.json();
      setResponse({
        status: res.status,
        data,
      });
    } catch (error) {
      setResponse({
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <h1>🔌 API 路由演示</h1>

      <div
        style={{
          padding: '1.5rem',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '12px',
          color: 'white',
          marginBottom: '2rem',
        }}
      >
        <h2 style={{ margin: '0 0 0.5rem 0' }}>API 路由系统</h2>
        <p style={{ margin: 0, opacity: 0.9 }}>
          类似 Next.js 的文件系统 API 路由，放在 <code>app/api/</code> 目录下
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        {/* GET /api/hello */}
        <div
          style={{
            padding: '1.5rem',
            background: '#e8f5e9',
            borderRadius: '12px',
            border: '2px solid #4caf50',
          }}
        >
          <h3 style={{ margin: '0 0 1rem 0', color: '#2e7d32' }}>
            GET /api/hello
          </h3>
          <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
            简单的 Hello World API
          </p>
          <button
            onClick={() => fetchApi('/api/hello')}
            disabled={loading}
            style={{
              padding: '0.5rem 1rem',
              background: '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              width: '100%',
            }}
          >
            {loading ? '加载中...' : '调用 API'}
          </button>
        </div>

        {/* GET /api/users */}
        <div
          style={{
            padding: '1.5rem',
            background: '#e3f2fd',
            borderRadius: '12px',
            border: '2px solid #2196f3',
          }}
        >
          <h3 style={{ margin: '0 0 1rem 0', color: '#1565c0' }}>
            GET /api/users
          </h3>
          <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
            获取用户列表（支持 ?limit=2 参数）
          </p>
          <button
            onClick={() => fetchApi('/api/users?limit=2')}
            disabled={loading}
            style={{
              padding: '0.5rem 1rem',
              background: '#2196f3',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              width: '100%',
            }}
          >
            {loading ? '加载中...' : '调用 API'}
          </button>
        </div>

        {/* GET /api/users/[id] */}
        <div
          style={{
            padding: '1.5rem',
            background: '#fff3e0',
            borderRadius: '12px',
            border: '2px solid #ff9800',
          }}
        >
          <h3 style={{ margin: '0 0 1rem 0', color: '#e65100' }}>
            GET /api/users/:id
          </h3>
          <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
            获取单个用户（动态路由）
          </p>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="User ID"
            style={{
              width: '100%',
              padding: '0.5rem',
              marginBottom: '0.5rem',
              borderRadius: '6px',
              border: '1px solid #ccc',
              boxSizing: 'border-box',
            }}
          />
          <button
            onClick={() => fetchApi(`/api/users/${userId}`)}
            disabled={loading}
            style={{
              padding: '0.5rem 1rem',
              background: '#ff9800',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              width: '100%',
            }}
          >
            {loading ? '加载中...' : '调用 API'}
          </button>
        </div>

        {/* POST /api/echo */}
        <div
          style={{
            padding: '1.5rem',
            background: '#f3e5f5',
            borderRadius: '12px',
            border: '2px solid #9c27b0',
          }}
        >
          <h3 style={{ margin: '0 0 1rem 0', color: '#6a1b9a' }}>
            POST /api/echo
          </h3>
          <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
            Echo API（POST 请求）
          </p>
          <textarea
            value={postData}
            onChange={(e) => setPostData(e.target.value)}
            placeholder='{"message":"Hello"}'
            rows={3}
            style={{
              width: '100%',
              padding: '0.5rem',
              marginBottom: '0.5rem',
              borderRadius: '6px',
              border: '1px solid #ccc',
              boxSizing: 'border-box',
              fontFamily: 'monospace',
              fontSize: '0.85rem',
            }}
          />
          <button
            onClick={() =>
              fetchApi('/api/echo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: postData,
              })
            }
            disabled={loading}
            style={{
              padding: '0.5rem 1rem',
              background: '#9c27b0',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              width: '100%',
            }}
          >
            {loading ? '加载中...' : '调用 API'}
          </button>
        </div>
      </div>

      {/* Response Display */}
      {response && (
        <div
          style={{
            padding: '1.5rem',
            background: '#263238',
            borderRadius: '12px',
            color: '#aed581',
          }}
        >
          <h3 style={{ margin: '0 0 1rem 0', color: '#81c784' }}>
            📥 API 响应
          </h3>
          <pre
            style={{
              margin: 0,
              padding: '1rem',
              background: '#1e272e',
              borderRadius: '8px',
              overflow: 'auto',
              fontSize: '0.9rem',
            }}
          >
            {JSON.stringify(response, null, 2)}
          </pre>
        </div>
      )}

      <div
        style={{
          padding: '1.5rem',
          background: '#e8f5e9',
          borderRadius: '12px',
          border: '1px solid #4caf50',
          marginTop: '2rem',
        }}
      >
        <h3 style={{ margin: '0 0 1rem 0', color: '#2e7d32' }}>
          📖 API 路由文件
        </h3>
        <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.9rem' }}>
          <li>
            <code>app/api/hello/route.ts</code> → <code>/api/hello</code>
          </li>
          <li>
            <code>app/api/users/route.ts</code> → <code>/api/users</code>
          </li>
          <li>
            <code>app/api/users/[id]/route.ts</code> →{' '}
            <code>/api/users/:id</code>
          </li>
          <li>
            <code>app/api/echo/route.ts</code> → <code>POST /api/echo</code>
          </li>
        </ul>
      </div>
    </div>
  );
}
