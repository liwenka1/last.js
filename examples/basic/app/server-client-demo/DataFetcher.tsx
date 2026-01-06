// Async Server Component - 数据获取组件
// 注意：没有 'use client'，所以这是一个服务端组件

interface Post {
  id: number;
  title: string;
  body: string;
}

// 模拟数据获取（2秒延迟）
async function fetchPosts(): Promise<Post[]> {
  console.log('[Server] DataFetcher: 开始获取数据...');

  // 模拟网络延迟
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 模拟从数据库获取数据
  const posts: Post[] = [
    {
      id: 1,
      title: 'Getting Started with Last.js',
      body: 'Learn how to build modern web applications with Last.js framework.',
    },
    {
      id: 2,
      title: 'Understanding SSR',
      body: 'Server-Side Rendering explained with practical examples.',
    },
    {
      id: 3,
      title: 'Streaming with Suspense',
      body: 'How to use Suspense for better user experience.',
    },
  ];

  console.log('[Server] DataFetcher: 数据获取完成！');
  return posts;
}

/**
 * DataFetcher - Async Server Component
 *
 * 这个组件展示了：
 * 1. 可以直接使用 async/await
 * 2. 数据获取在服务端执行
 * 3. 配合 Suspense 实现流式渲染
 */
export async function DataFetcher() {
  const posts = await fetchPosts();
  const fetchTime = new Date().toLocaleTimeString();

  return (
    <div
      style={{
        padding: '1.5rem',
        background: '#f3e5f5',
        borderRadius: '12px',
        border: '2px solid #9c27b0',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
        }}
      >
        <h3 style={{ margin: 0, color: '#7b1fa2' }}>📚 Posts from Server</h3>
        <span
          style={{
            background: 'rgba(255,255,255,0.8)',
            padding: '0.25rem 0.75rem',
            borderRadius: '20px',
            fontSize: '0.85rem',
          }}
        >
          Fetched at: {fetchTime}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {posts.map((post) => (
          <div
            key={post.id}
            style={{
              padding: '1rem',
              background: 'rgba(255,255,255,0.8)',
              borderRadius: '8px',
            }}
          >
            <h4 style={{ margin: '0 0 0.5rem 0' }}>{post.title}</h4>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>
              {post.body}
            </p>
          </div>
        ))}
      </div>

      <p
        style={{
          margin: '1rem 0 0 0',
          padding: '0.75rem',
          background: 'rgba(0,0,0,0.05)',
          borderRadius: '8px',
          fontSize: '0.85rem',
        }}
      >
        💡 这个组件是 async Server Component。数据在服务端获取，
        然后通过流式传输发送到客户端。查看终端日志可以看到 "[Server]" 输出。
      </p>
    </div>
  );
}
