// 流式渲染演示页面
// 展示 Suspense 如何实现流式 HTML 响应

import { Suspense } from 'react';
import { Link } from 'lastjs/client';

export const metadata = {
  title: '流式渲染演示 - Last.js',
  description: '直观感受流式渲染的效果',
};

// ========== 模拟数据获取 ==========

async function fetchData(
  id: number,
  delay: number
): Promise<{
  id: number;
  title: string;
  content: string;
  loadTime: string;
}> {
  const startTime = Date.now();
  console.log(`[Server] 数据 ${id}: 开始获取... (需要 ${delay / 1000}秒)`);

  await new Promise((resolve) => setTimeout(resolve, delay));

  const endTime = Date.now();
  console.log(`[Server] 数据 ${id}: 获取完成！耗时 ${endTime - startTime}ms`);

  return {
    id,
    title: `数据块 ${id}`,
    content: `这是从服务器获取的数据，模拟了 ${delay / 1000} 秒的网络延迟。`,
    loadTime: new Date().toLocaleTimeString(),
  };
}

// ========== 数据展示组件 ==========

function DataCard({
  data,
  color,
}: {
  data: { id: number; title: string; content: string; loadTime: string };
  color: string;
}) {
  return (
    <div
      style={{
        padding: '1.5rem',
        background: color,
        borderRadius: '12px',
        marginBottom: '1rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h3 style={{ margin: 0, fontSize: '1.25rem' }}>✅ {data.title}</h3>
        <span
          style={{
            background: 'rgba(255,255,255,0.8)',
            padding: '0.25rem 0.75rem',
            borderRadius: '20px',
            fontSize: '0.85rem',
            fontWeight: 'bold',
          }}
        >
          {data.loadTime}
        </span>
      </div>
      <p style={{ margin: '0.75rem 0 0 0', opacity: 0.8 }}>{data.content}</p>
    </div>
  );
}

// ========== Async 数据组件 ==========

async function AsyncDataBlock1() {
  const data = await fetchData(1, 1000); // 1秒
  return <DataCard data={data} color="#e8f5e9" />;
}

async function AsyncDataBlock2() {
  const data = await fetchData(2, 2000); // 2秒
  return <DataCard data={data} color="#e3f2fd" />;
}

async function AsyncDataBlock3() {
  const data = await fetchData(3, 3000); // 3秒
  return <DataCard data={data} color="#fff3e0" />;
}

async function AsyncDataBlock4() {
  const data = await fetchData(4, 4000); // 4秒
  return <DataCard data={data} color="#fce4ec" />;
}

// ========== Loading 组件 ==========

function LoadingSkeleton({ id, delay }: { id: number; delay: number }) {
  return (
    <div
      style={{
        padding: '1.5rem',
        background:
          'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
        borderRadius: '12px',
        marginBottom: '1rem',
        border: '2px dashed #ccc',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h3 style={{ margin: 0, color: '#999' }}>⏳ 加载数据块 {id}...</h3>
        <span
          style={{
            background: '#fff',
            padding: '0.25rem 0.75rem',
            borderRadius: '20px',
            fontSize: '0.85rem',
            color: '#999',
          }}
        >
          ~{delay}秒
        </span>
      </div>
      <p style={{ margin: '0.75rem 0 0 0', color: '#bbb' }}>
        服务器正在获取数据...
      </p>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

// ========== 主页面 ==========

export default function StreamingDemoPage() {
  const pageLoadTime = new Date().toLocaleTimeString();

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 1rem' }}>
      {/* 页面标题 - 立即显示 */}
      <div
        style={{
          textAlign: 'center',
          marginBottom: '2rem',
          padding: '2rem',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '16px',
          color: 'white',
        }}
      >
        <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem' }}>
          🌊 流式渲染演示
        </h1>
        <p style={{ margin: 0, opacity: 0.9 }}>
          页面 Shell 加载时间: <strong>{pageLoadTime}</strong>
        </p>
        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', opacity: 0.8 }}>
          👆 这段文字立即显示，下面的数据块会逐个流式加载
        </p>
      </div>

      {/* 对比说明 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <div
          style={{
            padding: '1rem',
            background: '#e8f5e9',
            borderRadius: '12px',
            border: '2px solid #4caf50',
          }}
        >
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#2e7d32' }}>
            ✅ 流式渲染（当前页面）
          </h3>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.9rem' }}>
            <li>页面框架立即显示</li>
            <li>数据块按完成顺序逐个出现</li>
            <li>用户可以先看到部分内容</li>
            <li>更好的用户体验</li>
          </ul>
        </div>

        <div
          style={{
            padding: '1rem',
            background: '#ffebee',
            borderRadius: '12px',
            border: '2px solid #f44336',
          }}
        >
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#c62828' }}>
            ❌ 传统阻塞渲染
          </h3>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.9rem' }}>
            <li>整个页面等待所有数据</li>
            <li>用户看到白屏直到全部完成</li>
            <li>总等待时间 = 最慢的数据</li>
            <li>
              <Link
                href="/streaming-demo/blocking"
                style={{ color: '#c62828' }}
              >
                👉 点击体验阻塞渲染
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* 数据块区域 */}
      <h2 style={{ marginBottom: '1rem' }}>📦 数据块（观察加载顺序）</h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1rem',
        }}
      >
        <div>
          <Suspense fallback={<LoadingSkeleton id={1} delay={1} />}>
            <AsyncDataBlock1 />
          </Suspense>

          <Suspense fallback={<LoadingSkeleton id={2} delay={2} />}>
            <AsyncDataBlock2 />
          </Suspense>
        </div>

        <div>
          <Suspense fallback={<LoadingSkeleton id={3} delay={3} />}>
            <AsyncDataBlock3 />
          </Suspense>

          <Suspense fallback={<LoadingSkeleton id={4} delay={4} />}>
            <AsyncDataBlock4 />
          </Suspense>
        </div>
      </div>

      {/* 时间线说明 */}
      <div
        style={{
          marginTop: '2rem',
          padding: '1.5rem',
          background: '#f5f5f5',
          borderRadius: '12px',
        }}
      >
        <h3 style={{ margin: '0 0 1rem 0' }}>⏱️ 时间线</h3>

        <div style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <strong>流式渲染：</strong>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                marginTop: '0.5rem',
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  background: '#4caf50',
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '4px',
                }}
              >
                Shell 0s
              </span>
              <span>→</span>
              <span
                style={{
                  background: '#e8f5e9',
                  padding: '2px 8px',
                  borderRadius: '4px',
                }}
              >
                块1 1s
              </span>
              <span>→</span>
              <span
                style={{
                  background: '#e3f2fd',
                  padding: '2px 8px',
                  borderRadius: '4px',
                }}
              >
                块2 2s
              </span>
              <span>→</span>
              <span
                style={{
                  background: '#fff3e0',
                  padding: '2px 8px',
                  borderRadius: '4px',
                }}
              >
                块3 3s
              </span>
              <span>→</span>
              <span
                style={{
                  background: '#fce4ec',
                  padding: '2px 8px',
                  borderRadius: '4px',
                }}
              >
                块4 4s
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 导航 */}
      <div
        style={{
          marginTop: '2rem',
          textAlign: 'center',
          padding: '1rem',
          background: '#e3f2fd',
          borderRadius: '12px',
        }}
      >
        <Link
          href="/streaming-demo/blocking"
          style={{
            display: 'inline-block',
            padding: '0.75rem 1.5rem',
            background: '#f44336',
            color: 'white',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 'bold',
          }}
        >
          👉 体验阻塞渲染对比
        </Link>
        <p
          style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#666' }}
        >
          点击上面的按钮，感受没有流式渲染时的白屏等待
        </p>
      </div>
    </div>
  );
}
