/**
 * 客户端 Server Actions Helper
 *
 * 提供简化的客户端调用接口
 */

/**
 * 序列化参数（处理 FormData、Date 等特殊类型）
 */
function serializeArgs(args: unknown[]): unknown[] {
  return args.map((arg) => {
    // 处理 FormData
    if (arg instanceof FormData) {
      const obj: Record<string, unknown> = {};
      arg.forEach((value, key) => {
        obj[key] = value;
      });
      return { __type: 'FormData', data: obj };
    }

    // 处理 Date
    if (arg instanceof Date) {
      return { __type: 'Date', value: arg.toISOString() };
    }

    // 处理 undefined（JSON 不支持 undefined）
    if (arg === undefined) {
      return { __undefined: true };
    }

    // 处理 File（浏览器环境）
    if (
      typeof window !== 'undefined' &&
      arg &&
      typeof arg === 'object' &&
      'name' in arg &&
      'size' in arg &&
      'type' in arg
    ) {
      console.warn('[Server Actions] File upload not yet supported');
      return {
        __type: 'File',
        name: (arg as { name: string }).name,
        size: (arg as { size: number }).size,
        type: (arg as { type: string }).type,
      };
    }

    return arg;
  });
}

/**
 * 创建 Server Action 的客户端代理
 *
 * @param actionId - Action ID（格式: "文件路径:函数名"，如 "app/actions.ts:createTodo"）
 * @param actionName - Action 名称（用于日志）
 *
 * @example
 * ```ts
 * // 手动创建 action（通常不需要，使用下面的 defineServerAction 更方便）
 * const createTodo = createServerAction('app/actions.ts:createTodo', 'createTodo');
 * ```
 */
export function createServerAction<Args extends unknown[], Result>(
  actionId: string,
  actionName: string
): (...args: Args) => Promise<Result> {
  return async (...args: Args): Promise<Result> => {
    try {
      const response = await fetch('/_actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          actionId,
          actionName,
          args: serializeArgs(args),
        }),
      });

      if (!response.ok) {
        throw new Error(`Server Action failed: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Server Action failed');
      }

      return result.data;
    } catch (error) {
      console.error(`[Server Action] ${actionName} failed:`, error);
      throw error;
    }
  };
}

/**
 * 定义 Server Action
 *
 * @param actionId - Action ID (格式: "文件路径:函数名")
 * @param implementation - 服务端实现
 *
 * @example
 * ```ts
 * // app/actions.ts
 * 'use server'
 *
 * import { defineServerAction } from 'lastjs/client';
 *
 * export const createTodo = defineServerAction(
 *   'app/actions.ts:createTodo',
 *   async (formData: FormData) => {
 *     const title = formData.get('title') as string;
 *     // ... 服务端逻辑
 *     return { success: true, id: 1 };
 *   }
 * );
 * ```
 *
 * @deprecated 推荐直接导出 async 函数，框架会自动处理：
 * ```ts
 * 'use server'
 * export async function createTodo(formData: FormData) {
 *   // ... 只要文件有 'use server'，这个函数就会自动注册
 * }
 * ```
 */
export function defineServerAction<Args extends unknown[], Result>(
  actionId: string,
  implementation: (...args: Args) => Promise<Result>
): (...args: Args) => Promise<Result> {
  // 在服务端，直接返回实现
  if (typeof window === 'undefined') {
    return implementation;
  }

  // 在客户端，返回代理
  const actionName = actionId.split(':')[1] || 'unknown';
  return createServerAction(actionId, actionName);
}
