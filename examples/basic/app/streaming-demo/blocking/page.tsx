// 阻塞渲染演示页面
// 这个页面会等待所有数据加载完成后才显示（模拟传统 SSR）

import { Link } from 'lastjs/client';

export const metadata = {
  title: '阻塞渲染演示 - Last.js',
  description: '体验没有流式渲染时的白屏等待',
};

// ========== 模拟数据获取（与流式版本相同）==========

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
  console.log(
    `[Server-Blocking] 数据 ${id}: 开始获取... (需要 ${delay / 1000}秒)`
  );

  await new Promise((resolve) => setTimeout(resolve, delay));

  const endTime = Date.now();
  console.log(
    `[Server-Blocking] 数据 ${id}: 获取完成！耗时 ${endTime - startTime}ms`
  );

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

// ========== 主页面（阻塞式）==========
// 关键区别：这里直接 await 所有数据，不使用 Suspense
// 所以整个页面会等待所有数据加载完成后才开始渲染

export default async function BlockingDemoPage() {
  const pageStartTime = new Date().toLocaleTimeString();
  console.log(`[Server-Blocking] 页面开始渲染: ${pageStartTime}`);

  // 🔴 关键：所有数据都要等待完成才能渲染页面
  // 这会导致用户看到白屏直到所有数据加载完成
  const [data1, data2, data3, data4] = await Promise.all([
    fetchData(1, 1000), // 1秒
    fetchData(2, 2000), // 2秒
    fetchData(3, 3000), // 3秒
    fetchData(4, 4000), // 4秒
  ]);

  const pageEndTime = new Date().toLocaleTimeString();
  console.log(`[Server-Blocking] 页面渲染完成: ${pageEndTime}`);

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 1rem' }}>
      {/* 页面标题 */}
      <div
        style={{
          textAlign: 'center',
          marginBottom: '2rem',
          padding: '2rem',
          background: 'linear-gradient(135deg, #f44336 0%, #e91e63 100%)',
          borderRadius: '16px',
          color: 'white',
        }}
      >
        <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem' }}>
          🚫 阻塞渲染演示
        </h1>
        <p style={{ margin: 0, opacity: 0.9 }}>
          页面开始时间: <strong>{pageStartTime}</strong>
        </p>
        <p style={{ margin: '0.25rem 0 0 0', opacity: 0.9 }}>
          页面完成时间: <strong>{pageEndTime}</strong>
        </p>
        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', opacity: 0.8 }}>
          👆 你刚才经历了 ~4秒 的白屏等待！
        </p>
      </div>

      {/* 问题说明 */}
      <div
        style={{
          padding: '1.5rem',
          background: '#ffebee',
          borderRadius: '12px',
          border: '2px solid #f44336',
          marginBottom: '2rem',
        }}
      >
        <h3 style={{ margin: '0 0 0.5rem 0', color: '#c62828' }}>
          ❌ 阻塞渲染的问题
        </h3>
        <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
          <li>
            <strong>白屏等待</strong> -
            用户必须等待所有数据加载完成才能看到任何内容
          </li>
          <li>
            <strong>感知慢</strong> -
            即使数据1只需要1秒，用户也要等4秒才能看到它
          </li>
          <li>
            <strong>体验差</strong> -
            用户不知道页面是否在加载，可能会认为页面卡死
          </li>
          <li>
            <strong>SEO 影响</strong> - 搜索引擎爬虫可能超时放弃
          </li>
        </ul>
      </div>

      {/* 数据块区域 */}
      <h2 style={{ marginBottom: '1rem' }}>📦 数据块（全部同时出现）</h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1rem',
        }}
      >
        <div>
          <DataCard data={data1} color="#e8f5e9" />
          <DataCard data={data2} color="#e3f2fd" />
        </div>

        <div>
          <DataCard data={data3} color="#fff3e0" />
          <DataCard data={data4} color="#fce4ec" />
        </div>
      </div>

      {/* 代码对比 */}
      <div
        style={{
          marginTop: '2rem',
          padding: '1.5rem',
          background: '#f5f5f5',
          borderRadius: '12px',
        }}
      >
        <h3 style={{ margin: '0 0 1rem 0' }}>📝 代码差异</h3>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1rem',
          }}
        >
          <div
            style={{
              background: '#ffebee',
              padding: '1rem',
              borderRadius: '8px',
              fontFamily: 'monospace',
              fontSize: '0.85rem',
            }}
          >
            <strong style={{ color: '#c62828' }}>
              ❌ 阻塞渲染（当前页面）
            </strong>
            <pre style={{ margin: '0.5rem 0 0 0', whiteSpace: 'pre-wrap' }}>
              {`// 等待所有数据
const [d1, d2, d3, d4] = 
  await Promise.all([...]);

// 然后才渲染
return <div>...</div>;`}
            </pre>
          </div>

          <div
            style={{
              background: '#e8f5e9',
              padding: '1rem',
              borderRadius: '8px',
              fontFamily: 'monospace',
              fontSize: '0.85rem',
            }}
          >
            <strong style={{ color: '#2e7d32' }}>✅ 流式渲染</strong>
            <pre style={{ margin: '0.5rem 0 0 0', whiteSpace: 'pre-wrap' }}>
              {`// 立即返回 shell
return (
  <div>
    <Suspense fallback={...}>
      <AsyncData />
    </Suspense>
  </div>
);`}
            </pre>
          </div>
        </div>
      </div>

      {/* 导航 */}
      <div
        style={{
          marginTop: '2rem',
          textAlign: 'center',
          padding: '1rem',
          background: '#e8f5e9',
          borderRadius: '12px',
        }}
      >
        <Link
          href="/streaming-demo"
          style={{
            display: 'inline-block',
            padding: '0.75rem 1.5rem',
            background: '#4caf50',
            color: 'white',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 'bold',
          }}
        >
          👈 返回流式渲染版本
        </Link>
        <p
          style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#666' }}
        >
          对比感受流式渲染带来的体验提升
        </p>
      </div>
    </div>
  );
}
