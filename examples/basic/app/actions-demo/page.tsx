'use client';

import { useState, useTransition } from 'react';
import { createTodo, deleteTodo, toggleTodo, getServerTime } from '../actions';

// 显式声明这不是 server-only 页面
export const serverOnly = false;

interface Todo {
  id: number;
  title: string;
  completed: boolean;
  createdAt: string;
}

interface ServerTime {
  timestamp: string;
  serverName: string;
  nodeVersion: string;
}

export default function ActionsDemo() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [serverTime, setServerTime] = useState<ServerTime | null>(null);
  const [isPending, startTransition] = useTransition();

  // 处理表单提交
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        const result = await createTodo(formData);
        setTodos([...todos, result.todo]);
        (e.target as HTMLFormElement).reset();
      } catch (error) {
        alert(error instanceof Error ? error.message : '创建失败');
      }
    });
  }

  // 处理删除
  async function handleDelete(id: number) {
    startTransition(async () => {
      try {
        await deleteTodo(id);
        setTodos(todos.filter((t) => t.id !== id));
      } catch (_error) {
        alert('删除失败');
      }
    });
  }

  // 处理切换完成状态
  async function handleToggle(id: number, completed: boolean) {
    startTransition(async () => {
      try {
        await toggleTodo(id, !completed);
        setTodos(
          todos.map((t) => (t.id === id ? { ...t, completed: !completed } : t))
        );
      } catch (_error) {
        alert('更新失败');
      }
    });
  }

  // 获取服务器时间
  async function handleGetServerTime() {
    startTransition(async () => {
      try {
        const time = await getServerTime();
        setServerTime(time);
      } catch (_error) {
        alert('获取服务器时间失败');
      }
    });
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1>🎬 Server Actions 演示</h1>

      <div
        style={{
          padding: '1.5rem',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '12px',
          color: 'white',
          marginBottom: '2rem',
        }}
      >
        <h2 style={{ margin: '0 0 0.5rem 0' }}>React 19.2 Server Actions</h2>
        <p style={{ margin: 0, opacity: 0.9 }}>
          Server Actions 允许你从客户端组件直接调用服务端函数， 无需手动创建 API
          路由！
        </p>
      </div>

      {/* Todo Form */}
      <div
        style={{
          padding: '1.5rem',
          background: '#f8f9fa',
          borderRadius: '12px',
          marginBottom: '2rem',
        }}
      >
        <h3 style={{ marginTop: 0 }}>➕ 创建 Todo</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              name="title"
              placeholder="输入 Todo 标题..."
              disabled={isPending}
              style={{
                flex: 1,
                padding: '0.75rem',
                borderRadius: '8px',
                border: '2px solid #ddd',
                fontSize: '1rem',
              }}
              required
            />
            <button
              type="submit"
              disabled={isPending}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: isPending ? 'not-allowed' : 'pointer',
                fontSize: '1rem',
                opacity: isPending ? 0.6 : 1,
              }}
            >
              {isPending ? '创建中...' : '创建'}
            </button>
          </div>
        </form>
      </div>

      {/* Todo List */}
      <div
        style={{
          padding: '1.5rem',
          background: '#fff',
          borderRadius: '12px',
          border: '2px solid #eee',
          marginBottom: '2rem',
        }}
      >
        <h3 style={{ marginTop: 0 }}>📝 Todo 列表</h3>
        {todos.length === 0 ? (
          <p style={{ color: '#999', textAlign: 'center' }}>
            还没有 Todo，试试创建一个吧！
          </p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {todos.map((todo) => (
              <li
                key={todo.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1rem',
                  background: '#f8f9fa',
                  borderRadius: '8px',
                  marginBottom: '0.5rem',
                }}
              >
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => handleToggle(todo.id, todo.completed)}
                  disabled={isPending}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
                <span
                  style={{
                    flex: 1,
                    textDecoration: todo.completed ? 'line-through' : 'none',
                    color: todo.completed ? '#999' : '#333',
                  }}
                >
                  {todo.title}
                </span>
                <button
                  onClick={() => handleDelete(todo.id)}
                  disabled={isPending}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: isPending ? 'not-allowed' : 'pointer',
                    opacity: isPending ? 0.6 : 1,
                  }}
                >
                  删除
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Server Time */}
      <div
        style={{
          padding: '1.5rem',
          background: '#e3f2fd',
          borderRadius: '12px',
          border: '2px solid #2196f3',
          marginBottom: '2rem',
        }}
      >
        <h3 style={{ marginTop: 0 }}>🕐 服务器时间</h3>
        <button
          onClick={handleGetServerTime}
          disabled={isPending}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#2196f3',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: isPending ? 'not-allowed' : 'pointer',
            opacity: isPending ? 0.6 : 1,
            marginBottom: '1rem',
          }}
        >
          {isPending ? '获取中...' : '获取服务器时间'}
        </button>

        {serverTime && (
          <div
            style={{
              padding: '1rem',
              background: 'white',
              borderRadius: '8px',
            }}
          >
            <p style={{ margin: '0 0 0.5rem 0' }}>
              <strong>时间:</strong>{' '}
              {new Date(serverTime.timestamp).toLocaleString('zh-CN')}
            </p>
            <p style={{ margin: '0 0 0.5rem 0' }}>
              <strong>服务器:</strong> {serverTime.serverName}
            </p>
            <p style={{ margin: 0 }}>
              <strong>Node 版本:</strong> {serverTime.nodeVersion}
            </p>
          </div>
        )}
      </div>

      {/* Features */}
      <div
        style={{
          padding: '1.5rem',
          background: '#f0f4c3',
          borderRadius: '12px',
          border: '2px solid #cddc39',
        }}
      >
        <h3 style={{ marginTop: 0 }}>✨ Server Actions 特性</h3>
        <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
          <li>✅ 无需手动创建 API 路由</li>
          <li>✅ 类型安全的服务端函数调用</li>
          <li>✅ 支持 FormData、普通参数等</li>
          <li>✅ 自动处理序列化/反序列化</li>
          <li>✅ 与 React 19.2 的 useTransition 完美集成</li>
          <li>✅ 服务端专属代码（process、数据库等）</li>
        </ul>
      </div>
    </div>
  );
}
