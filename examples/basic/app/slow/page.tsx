// 这是一个 Server Component（没有 'use client'）
// 可以使用 async/await 直接获取数据！

import { Suspense } from 'react';

export const metadata = {
  title: 'RSC 演示 - Last.js',
  description: '真正的 React Server Components 演示',
};

// 模拟服务端数据获取
async function fetchServerData(delay: number, name: string): Promise<string> {
  console.log(`[Server] ${name}: 开始获取数据...`);
  await new Promise((resolve) => setTimeout(resolve, delay));
  const time = new Date().toLocaleTimeString();
  console.log(`[Server] ${name}: 数据获取完成！`);
  return `${name} - 服务器时间: ${time}`;
}

// 异步 Server Component - 2秒延迟
async function SlowData1() {
  const data = await fetchServerData(2000, '数据块1');
  return (
    <div
      style={{
        padding: '1rem',
        background: '#e8f5e9',
        borderRadius: '8px',
        marginBottom: '0.5rem',
        border: '2px solid #4caf50',
      }}
    >
      <strong>✅ Server Component 数据</strong>
      <p style={{ margin: '0.5rem 0 0 0' }}>{data}</p>
      <small style={{ color: '#666' }}>
        这个组件在服务端执行 async/await，客户端不会重新执行！
      </small>
    </div>
  );
}

// 异步 Server Component - 3秒延迟
async function SlowData2() {
  const data = await fetchServerData(3000, '数据块2');
  return (
    <div
      style={{
        padding: '1rem',
        background: '#e3f2fd',
        borderRadius: '8px',
        marginBottom: '0.5rem',
        border: '2px solid #2196f3',
      }}
    >
      <strong>✅ Server Component 数据</strong>
      <p style={{ margin: '0.5rem 0 0 0' }}>{data}</p>
      <small style={{ color: '#666' }}>
        这个数据只在服务端获取，不会暴露给客户端 JavaScript
      </small>
    </div>
  );
}

// Loading 骨架屏
function LoadingSkeleton({ label }: { label: string }) {
  return (
    <div
      style={{
        padding: '1rem',
        background: '#fff3e0',
        borderRadius: '8px',
        marginBottom: '0.5rem',
        border: '2px dashed #ff9800',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
      }}
    >
      <span style={{ animation: 'pulse 1s infinite' }}>⏳</span>
      <span>{label}</span>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

// 主页面组件 - 也是 Server Component
export default function SlowPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1>🚀 React Server Components 演示</h1>

      <div
        style={{
          padding: '1rem',
          background: '#f3e5f5',
          borderRadius: '8px',
          marginBottom: '2rem',
          border: '2px solid #9c27b0',
        }}
      >
        <h2 style={{ margin: '0 0 0.5rem 0', color: '#7b1fa2' }}>
          🎉 这是真正的 RSC！
        </h2>
        <p style={{ margin: 0 }}>
          <strong>这段文字立即显示</strong>，因为它是页面的 "shell"。
          <br />
          下面的数据块使用 <code>async/await</code> 在服务端获取，
          <br />
          并通过 <strong>流式渲染</strong> 逐步发送到浏览器。
        </p>
      </div>

      <h2>📦 数据块 1（2秒延迟）</h2>
      <Suspense fallback={<LoadingSkeleton label="服务端正在获取数据 1..." />}>
        <SlowData1 />
      </Suspense>

      <h2>📦 数据块 2（3秒延迟）</h2>
      <Suspense fallback={<LoadingSkeleton label="服务端正在获取数据 2..." />}>
        <SlowData2 />
      </Suspense>

      <div
        style={{
          marginTop: '2rem',
          padding: '1rem',
          background: '#e8f5e9',
          borderRadius: '8px',
        }}
      >
        <h3 style={{ margin: '0 0 0.5rem 0' }}>💡 RSC 的优势</h3>
        <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
          <li>
            <strong>async 组件</strong> - 可以直接在组件中使用 async/await
          </li>
          <li>
            <strong>服务端执行</strong> - 数据获取在服务端完成，不暴露给客户端
          </li>
          <li>
            <strong>流式渲染</strong> - 页面 shell 立即显示，数据逐步填充
          </li>
          <li>
            <strong>零客户端 JS</strong> - Server Component
            的代码不会发送到客户端
          </li>
          <li>
            <strong>无 Hydration 重复执行</strong> - 客户端不会重新执行 async
            组件
          </li>
        </ul>
      </div>

      <div
        style={{
          marginTop: '1rem',
          padding: '1rem',
          background: '#fff9c4',
          borderRadius: '8px',
        }}
      >
        <h3 style={{ margin: '0 0 0.5rem 0' }}>🔍 如何验证？</h3>
        <ol style={{ margin: 0, paddingLeft: '1.5rem' }}>
          <li>查看终端日志 - 只有服务端输出 "[Server]" 日志</li>
          <li>打开浏览器控制台 - 不会看到 "[Server]" 日志</li>
          <li>刷新页面 - 每次都会看到服务端重新获取数据</li>
          <li>查看 Network - HTML 文档会逐步增大（流式传输）</li>
        </ol>
      </div>
    </div>
  );
}
