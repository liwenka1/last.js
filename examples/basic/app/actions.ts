/**
 * Server Actions 示例
 *
 * 'use server' 指令标记此文件中的所有导出函数为 Server Actions
 * 这些函数只在服务端执行，但可以从客户端组件中调用
 *
 * Next.js 风格：直接导出 async 函数，框架自动处理转换
 */

'use server';

// 模拟数据库
const todos: Array<{
  id: number;
  title: string;
  completed: boolean;
  createdAt: string;
}> = [];

/**
 * 创建 Todo（使用 FormData）
 */
export async function createTodo(formData: FormData) {
  const title = formData.get('title') as string;

  if (!title) {
    throw new Error('Title is required');
  }

  // 模拟延迟
  await new Promise((resolve) => setTimeout(resolve, 500));

  const todo = {
    id: Date.now(),
    title,
    completed: false,
    createdAt: new Date().toISOString(),
  };

  todos.push(todo);

  console.log('[Server] Created todo:', todo);

  return { success: true, todo };
}

/**
 * 删除 Todo
 */
export async function deleteTodo(todoId: number) {
  // 模拟延迟
  await new Promise((resolve) => setTimeout(resolve, 300));

  const index = todos.findIndex((t) => t.id === todoId);
  if (index !== -1) {
    todos.splice(index, 1);
    console.log('[Server] Deleted todo:', todoId);
    return { success: true };
  }

  return { success: false, error: 'Todo not found' };
}

/**
 * 切换 Todo 完成状态
 */
export async function toggleTodo(todoId: number, completed: boolean) {
  // 模拟延迟
  await new Promise((resolve) => setTimeout(resolve, 300));

  const todo = todos.find((t) => t.id === todoId);
  if (todo) {
    todo.completed = completed;
    console.log('[Server] Toggled todo:', todoId, 'completed:', completed);
    return { success: true, todo };
  }

  return { success: false, error: 'Todo not found' };
}

/**
 * 获取服务器时间（展示非 FormData 参数）
 */
export async function getServerTime() {
  // 模拟延迟
  await new Promise((resolve) => setTimeout(resolve, 200));

  return {
    timestamp: new Date().toISOString(),
    serverName: 'Last.js Server',
    nodeVersion: process.version,
  };
}
