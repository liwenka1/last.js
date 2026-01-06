// Server Component - 展示 async 组件和流式渲染

import { Suspense } from 'react';

export const metadata = {
  title: 'Async 组件演示 - Last.js',
  description: '展示 async 组件和 Suspense 流式渲染',
};

// 标记此页面包含 async 子组件，需要完整页面加载
export const serverOnly = true;

// 模拟服务端数据获取
async function fetchServerData(delay: number, name: string): Promise<string> {
  console.log(`[Server] ${name}: 开始获取数据...`);
  await new Promise((resolve) => setTimeout(resolve, delay));
  const time = new Date().toLocaleTimeString();
  console.log(`[Server] ${name}: 数据获取完成！`);
  return `${name} - 服务器时间: ${time}`;
}

// Async Server Component - 2秒延迟
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
      <strong>✅ Async Component 数据</strong>
      <p style={{ margin: '0.5rem 0 0 0' }}>{data}</p>
      <small style={{ color: '#666' }}>
        这个组件在服务端执行 async/await，然后流式发送到客户端
      </small>
    </div>
  );
}

// Async Server Component - 3秒延迟
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
      <strong>✅ Async Component 数据</strong>
      <p style={{ margin: '0.5rem 0 0 0' }}>{data}</p>
      <small style={{ color: '#666' }}>
        数据在服务端获取，HTML 通过流式传输逐步发送
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
      <span className="loading-spinner">⏳</span>
      <span>{label}</span>
      <style>{`
        .loading-spinner {
          animation: pulse 1s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

// 主页面组件
export default function SlowPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1>⏱️ Async 组件演示</h1>

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
          🎉 SSR + Streaming
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
        <h3 style={{ margin: '0 0 0.5rem 0' }}>💡 工作原理</h3>
        <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
          <li>
            <strong>Async 组件</strong> - 可以直接在组件中使用 async/await
          </li>
          <li>
            <strong>服务端执行</strong> - 数据获取在服务端完成
          </li>
          <li>
            <strong>流式渲染</strong> - 页面 shell 立即显示，数据逐步填充
          </li>
          <li>
            <strong>Suspense 边界</strong> - 每个 Suspense 定义一个流式单元
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
          <li>查看终端日志 - 会看到 "[Server]" 日志输出</li>
          <li>打开浏览器 Network 面板 - HTML 文档会逐步增大</li>
          <li>观察页面 - shell 先显示，数据块逐个出现</li>
          <li>刷新页面 - 每次都会重新执行服务端数据获取</li>
        </ol>
      </div>
    </div>
  );
}
