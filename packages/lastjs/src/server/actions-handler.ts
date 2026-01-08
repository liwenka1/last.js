/**
 * Server Actions Handler
 *
 * 处理来自客户端的 Server Actions 调用
 * 适配 RSC 的 callServer 机制
 */

import type { ViteDevServer } from 'vite';

export interface ActionRequest {
  /** Action ID (格式: filePath:functionName) */
  actionId: string;
  /** 调用参数 */
  args: unknown[];
}

export interface ActionResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

// Action 注册表
const actionsMap = new Map<string, (...args: unknown[]) => Promise<unknown>>();

/**
 * 注册一个 Server Action
 */
export function registerAction(
  actionId: string,
  fn: (...args: unknown[]) => Promise<unknown>
): void {
  actionsMap.set(actionId, fn);
  console.log(`[Server Actions] Registered: ${actionId}`);
}

/**
 * 获取已注册的 Action
 */
export function getAction(
  actionId: string
): ((...args: unknown[]) => Promise<unknown>) | undefined {
  return actionsMap.get(actionId);
}

/**
 * 清空注册表
 */
export function clearActions(): void {
  actionsMap.clear();
}

/**
 * 处理 Server Action 请求
 */
export async function handleServerAction(
  request: ActionRequest,
  vite?: ViteDevServer
): Promise<ActionResponse> {
  const { actionId, args } = request;

  console.log(`[Server Actions] Handling: ${actionId}`);

  try {
    // 解析 actionId
    const [filePath, functionName] = parseActionId(actionId);

    if (!filePath || !functionName) {
      return {
        success: false,
        error: `Invalid action ID: ${actionId}`,
      };
    }

    // 使用 Vite 加载模块（开发模式）
    if (vite) {
      const mod = await vite.ssrLoadModule(filePath);
      const fn = mod[functionName];

      if (typeof fn !== 'function') {
        return {
          success: false,
          error: `Action not found: ${functionName} in ${filePath}`,
        };
      }

      // 执行 action
      const result = await fn(...deserializeArgs(args));

      return {
        success: true,
        data: result,
      };
    }

    // 生产模式：从注册表获取
    const fn = actionsMap.get(actionId);
    if (!fn) {
      return {
        success: false,
        error: `Action not registered: ${actionId}`,
      };
    }

    const result = await fn(...deserializeArgs(args));

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error(`[Server Actions] Error:`, error);

    if (vite && error instanceof Error) {
      vite.ssrFixStacktrace(error);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 解析 Action ID
 * 格式: "relative/path/to/file.ts:functionName"
 */
function parseActionId(actionId: string): [string | null, string | null] {
  const lastColonIndex = actionId.lastIndexOf(':');
  if (lastColonIndex === -1) {
    return [null, null];
  }

  const filePath = actionId.substring(0, lastColonIndex);
  const functionName = actionId.substring(lastColonIndex + 1);

  return [filePath, functionName];
}

/**
 * 反序列化参数
 * 处理 FormData、Date 等特殊类型
 */
function deserializeArgs(args: unknown[]): unknown[] {
  return args.map((arg) => {
    if (!arg || typeof arg !== 'object') {
      return arg;
    }

    const obj = arg as Record<string, unknown>;

    // 处理 FormData
    if (obj.__type === 'FormData' && obj.data) {
      const formData = new FormData();
      const data = obj.data as Record<string, unknown>;
      for (const [key, value] of Object.entries(data)) {
        if (value !== null && value !== undefined) {
          formData.append(key, value as string);
        }
      }
      return formData;
    }

    // 处理 Date
    if (obj.__type === 'Date' && obj.value) {
      return new Date(obj.value as string);
    }

    // 处理 undefined
    if (obj.__undefined === true) {
      return undefined;
    }

    return arg;
  });
}

export default handleServerAction;
