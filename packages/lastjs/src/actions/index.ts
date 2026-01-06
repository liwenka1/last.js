/**
 * Server Actions 支持
 *
 * 提供简化的 Server Actions 实现，兼容 React 19.2+ 的 'use server' 指令
 */

export interface ServerActionMetadata {
  /** Action ID（基于文件路径和函数名生成） */
  id: string;
  /** Action 名称 */
  name: string;
  /** 文件路径 */
  filePath: string;
}

export interface ServerActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * 创建 Server Action 的客户端代理
 *
 * @example
 * ```ts
 * // app/actions.ts
 * 'use server'
 * export async function createTodo(formData: FormData) {
 *   const title = formData.get('title')
 *   // ... 服务端逻辑
 *   return { success: true, id: 1 }
 * }
 *
 * // 客户端使用
 * import { createTodo } from './actions'
 * const result = await createTodo(formData)
 * ```
 */
export function createServerAction<Args extends unknown[], Result>(
  actionId: string,
  actionName: string
): (...args: Args) => Promise<Result> {
  return async (...args: Args): Promise<Result> => {
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
  };
}

/**
 * 序列化参数（处理 FormData 等特殊类型）
 */
function serializeArgs(args: unknown[]): unknown[] {
  return args.map((arg) => {
    if (arg instanceof FormData) {
      // 将 FormData 转换为普通对象
      const obj: Record<string, unknown> = {};
      arg.forEach((value, key) => {
        obj[key] = value;
      });
      return { __type: 'FormData', data: obj };
    }
    return arg;
  });
}

/**
 * 反序列化参数
 */
export function deserializeArgs(args: unknown[]): unknown[] {
  return args.map((arg) => {
    if (
      arg &&
      typeof arg === 'object' &&
      '__type' in arg &&
      arg.__type === 'FormData' &&
      'data' in arg
    ) {
      // 重建 FormData
      const formData = new FormData();
      const data = arg.data as Record<string, unknown>;
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'string') {
          formData.append(key, value);
        }
      }
      return formData;
    }
    return arg;
  });
}
