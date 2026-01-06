/**
 * Server Actions 处理器
 *
 * 处理客户端的 Server Actions 调用
 */

import type { ViteDevServer } from 'vite';
import { deserializeArgs } from '../actions/index.js';

export interface ActionsHandlerOptions {
  /** app 目录路径 */
  appDir: string;
  /** Vite 开发服务器实例 */
  vite: ViteDevServer;
}

export interface ActionRequest {
  actionId: string;
  actionName: string;
  args: unknown[];
}

/**
 * 处理 Server Action 请求
 */
export async function handleServerAction(
  request: ActionRequest,
  options: ActionsHandlerOptions
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const { actionId, args } = request;
  const { vite } = options;

  try {
    // 从 actionId 中提取文件路径
    // actionId 格式: app/actions.ts:createTodo
    const [filePath, funcName] = actionId.split(':');

    if (!filePath || !funcName) {
      return {
        success: false,
        error: 'Invalid action ID format',
      };
    }

    // 加载 actions 模块
    const mod = await vite.ssrLoadModule(filePath);

    // 检查是否标记为 'use server'
    // 注意：在实际实现中，应该通过构建工具检查 'use server' 指令
    // 这里为了简化，我们假设 app/actions 目录下的文件都是 server actions

    const actionFunc = mod[funcName];

    if (typeof actionFunc !== 'function') {
      return {
        success: false,
        error: `Action ${funcName} not found in ${filePath}`,
      };
    }

    // 反序列化参数
    const deserializedArgs = deserializeArgs(args);

    // 执行 action
    const result = await actionFunc(...deserializedArgs);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('[Server Actions] Error:', error);

    // 使用 Vite 的错误堆栈修复
    if (error instanceof Error) {
      vite.ssrFixStacktrace(error);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
