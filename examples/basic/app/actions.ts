/**
 * Server Actions 示例
 *
 * 'use server' 指令标记此文件中的所有导出函数为 Server Actions
 * 这些函数只在服务端执行，但可以从客户端组件中调用
 */

'use server';

import { defineServerAction } from 'lastjs/client';

/**
 * 创建 Todo（使用 FormData）
 */
export const createTodo = defineServerAction(
  'app/actions.ts:createTodo',
  async (formData: FormData) => {
    // 模拟延迟
    await new Promise((resolve) => setTimeout(resolve, 500));

    const title = formData.get('title') as string;

    if (!title || title.trim().length === 0) {
      throw new Error('标题不能为空');
    }

    // 模拟数据库操作
    const todo = {
      id: Date.now(),
      title: title.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
    };

    console.log('[Server] Created todo:', todo);

    return { success: true, todo };
  }
);

/**
 * 删除 Todo
 */
export const deleteTodo = defineServerAction(
  'app/actions.ts:deleteTodo',
  async (todoId: number) => {
    // 模拟延迟
    await new Promise((resolve) => setTimeout(resolve, 300));

    console.log('[Server] Deleted todo:', todoId);

    return { success: true, deletedId: todoId };
  }
);

/**
 * 切换 Todo 完成状态
 */
export const toggleTodo = defineServerAction(
  'app/actions.ts:toggleTodo',
  async (todoId: number, completed: boolean) => {
    // 模拟延迟
    await new Promise((resolve) => setTimeout(resolve, 300));

    console.log('[Server] Toggled todo:', todoId, 'completed:', completed);

    return { success: true, todoId, completed };
  }
);

/**
 * 获取服务器时间（演示纯数据获取）
 */
export const getServerTime = defineServerAction(
  'app/actions.ts:getServerTime',
  async () => {
    return {
      timestamp: new Date().toISOString(),
      serverName: process.env.SERVER_NAME || 'Last.js Server',
      nodeVersion: process.version,
    };
  }
);
