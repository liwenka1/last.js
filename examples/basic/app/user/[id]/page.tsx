import { notFound } from 'lastjs';

interface PageProps {
  params: {
    id: string;
  };
}

// 模拟用户数据
const users: Record<string, { name: string; email: string }> = {
  '1': { name: 'Alice', email: 'alice@example.com' },
  '2': { name: 'Bob', email: 'bob@example.com' },
  '3': { name: 'Charlie', email: 'charlie@example.com' },
};

export const metadata = {
  title: 'User Profile',
  description: 'View user profile',
};

export default function UserPage({ params }: PageProps) {
  const user = users[params.id];

  // 如果用户不存在，触发 404
  if (!user) {
    notFound();
  }

  return (
    <div>
      <h1>User Profile</h1>
      <div
        style={{
          padding: '1.5rem',
          background: '#f5f5f5',
          borderRadius: '8px',
          marginTop: '1rem',
        }}
      >
        <p>
          <strong>ID:</strong> {params.id}
        </p>
        <p>
          <strong>Name:</strong> {user.name}
        </p>
        <p>
          <strong>Email:</strong> {user.email}
        </p>
      </div>

      <h2 style={{ marginTop: '2rem' }}>Try these URLs:</h2>
      <ul>
        <li>
          <a href="/user/1">/user/1</a> - Alice (exists)
        </li>
        <li>
          <a href="/user/2">/user/2</a> - Bob (exists)
        </li>
        <li>
          <a href="/user/3">/user/3</a> - Charlie (exists)
        </li>
        <li>
          <a href="/user/999">/user/999</a> - Not found (triggers 404)
        </li>
      </ul>
    </div>
  );
}
