'use client';

import { Link } from 'lastjs/client';

interface PageProps {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: PageProps) {
  return {
    title: `${params.slug} - Blog`,
    description: `Read about ${params.slug}`,
  };
}

export default function BlogPost({ params }: PageProps) {
  const { slug } = params;

  // 模拟博客数据
  const posts: Record<
    string,
    { title: string; content: string; date: string }
  > = {
    'hello-world': {
      title: 'Hello World',
      content:
        'Welcome to my first blog post! This demonstrates dynamic routing in Last.js.',
      date: '2024-01-04',
    },
    'getting-started': {
      title: 'Getting Started with Last.js',
      content:
        'Learn how to build your first application with Last.js framework.',
      date: '2024-01-05',
    },
  };

  const post = posts[slug] || {
    title: 'Post Not Found',
    content: `The blog post "${slug}" doesn't exist yet.`,
    date: new Date().toISOString().split('T')[0],
  };

  return (
    <article>
      <h1>{post.title}</h1>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        Published on {post.date}
      </p>
      <div style={{ marginTop: '2rem', lineHeight: '1.6' }}>
        <p>{post.content}</p>
      </div>

      <hr style={{ margin: '2rem 0' }} />

      <h2>Dynamic Route Demo</h2>
      <p>
        This page uses dynamic routing with the pattern:{' '}
        <code>/blog/[slug]</code>
      </p>
      <p>
        Current slug: <strong>{slug}</strong>
      </p>

      <h3>Try these URLs:</h3>
      <ul>
        <li>
          <Link href="/blog/hello-world">/blog/hello-world</Link>
        </li>
        <li>
          <Link href="/blog/getting-started">/blog/getting-started</Link>
        </li>
        <li>
          <Link href="/blog/any-slug-works">/blog/any-slug-works</Link>
        </li>
      </ul>
    </article>
  );
}
