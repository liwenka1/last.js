/**
 * Server Actions 处理器
 *
 * 处理客户端的 Server Actions 调用
 * 使用白名单机制，只允许调用已注册的 actions
 */

import type { ViteDevServer } from 'vite';
import { actionsRegistry } from './actions-registry.js';

export interface ActionRequest {
  actionId: string;
  actionName: string;
  args: unknown[];
}

export interface ActionResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * 序列化参数的类型定义
 */
interface SerializedFormData {
  __type: 'FormData';
  data: Record<string, unknown>;
}

interface SerializedDate {
  __type: 'Date';
  value: string;
}

interface SerializedUndefined {
  __undefined: true;
}

/**
 * 反序列化参数
 * 处理 FormData、Date 等特殊类型
 */
function deserializeArgs(args: unknown[]): unknown[] {
  return args.map((arg) => {
    // 处理 FormData
    if (
      arg &&
      typeof arg === 'object' &&
      '__type' in arg &&
      arg.__type === 'FormData'
    ) {
      const serialized = arg as SerializedFormData;
      const formData = new FormData();
      const data = serialized.data;

      for (const [key, value] of Object.entries(data)) {
        if (value !== null && value !== undefined) {
          formData.append(key, value as string);
        }
      }

      return formData;
    }

    // 处理 Date
    if (
      arg &&
      typeof arg === 'object' &&
      '__type' in arg &&
      arg.__type === 'Date'
    ) {
      const serialized = arg as SerializedDate;
      return new Date(serialized.value);
    }

    // 处理 undefined（JSON 不支持 undefined）
    if (arg && typeof arg === 'object' && '__undefined' in arg) {
      const serialized = arg as SerializedUndefined;
      if (serialized.__undefined === true) {
        return undefined;
      }
    }

    return arg;
  });
}

/**
 * 处理 Server Action 请求
 */
export async function handleServerAction(
  request: ActionRequest,
  vite?: ViteDevServer
): Promise<ActionResponse> {
  const { actionId, args } = request;

  try {
    // 从白名单获取 action
    const actionInfo = actionsRegistry.get(actionId);

    if (!actionInfo) {
      console.error(`[Server Actions] Action not found: ${actionId}`);
      console.error(
        'Available actions:',
        Array.from(actionsRegistry.getAll().keys())
      );

      return {
        success: false,
        error: `Action not found: ${actionId}. Make sure the file has 'use server' directive at the top.`,
      };
    }

    // 反序列化参数
    const deserializedArgs = deserializeArgs(args);

    // 执行 action
    console.log(`[Server Actions] Executing: ${actionId}`);
    const result = await actionInfo.fn(...deserializedArgs);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error(`[Server Actions] Error in ${actionId}:`, error);

    // 使用 Vite 的错误堆栈修复（开发环境）
    if (vite && error instanceof Error) {
      vite.ssrFixStacktrace(error);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
