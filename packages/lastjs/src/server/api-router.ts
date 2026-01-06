/**
 * API 文件系统路由器
 *
 * 目录结构:
 *   app/api/hello/route.ts        -> /api/hello
 *   app/api/users/route.ts        -> /api/users
 *   app/api/users/[id]/route.ts   -> /api/users/:id
 *   app/api/posts/[...slug]/route.ts -> /api/posts/*
 *
 * 文件导出:
 *   export async function GET(request) { ... }
 *   export async function POST(request) { ... }
 */

import { readdir } from 'node:fs/promises';
import { join } from 'pathe';
import { existsSync } from 'node:fs';

export interface ApiRoute {
  /** 路由路径模式，如 /api/users/:id */
  pattern: string;
  /** 正则表达式用于匹配 */
  regex: RegExp;
  /** 参数名列表 */
  params: string[];
  /** 文件绝对路径 */
  filePath: string;
  /** HTTP 方法，undefined 表示匹配所有方法 */
  method?: string;
}

export interface ApiRouteMatch {
  route: ApiRoute;
  params: Record<string, string>;
}

/**
 * API 文件系统路由器
 */
export class ApiRouter {
  private routes: ApiRoute[] = [];
  private serverDir: string;

  constructor(serverDir: string) {
    this.serverDir = serverDir;
  }

  /**
   * 扫描 server/api 目录
   */
  async scan(): Promise<void> {
    const apiDir = join(this.serverDir, 'api');

    if (!existsSync(apiDir)) {
      // 没有 api 目录，跳过
      return;
    }

    this.routes = [];
    await this.scanDirectory(apiDir, '/api');

    // 按优先级排序：
    // 1. 静态路由优先于动态路由
    // 2. 更具体的路由优先于通配符路由
    this.routes.sort((a, b) => {
      // 计算动态段数量
      const aDynamic = (a.pattern.match(/:/g) || []).length;
      const bDynamic = (b.pattern.match(/:/g) || []).length;

      // 检查是否有通配符
      const aWildcard = a.pattern.includes('*');
      const bWildcard = b.pattern.includes('*');

      // 通配符路由优先级最低
      if (aWildcard && !bWildcard) return 1;
      if (!aWildcard && bWildcard) return -1;

      // 动态段越少优先级越高
      if (aDynamic !== bDynamic) {
        return aDynamic - bDynamic;
      }

      // 路径越长优先级越高（更具体）
      return b.pattern.length - a.pattern.length;
    });
  }

  /**
   * 递归扫描目录
   */
  private async scanDirectory(dir: string, basePath: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        // 递归扫描子目录
        const segment = this.parseSegment(entry.name);
        await this.scanDirectory(fullPath, `${basePath}/${segment}`);
      } else if (entry.isFile() && entry.name.match(/^route\.(ts|js|mjs)$/)) {
        // 只处理 route.ts/js/mjs 文件
        const route = this.parseApiFile(fullPath, basePath);
        if (route) {
          this.routes.push(route);
        }
      }
    }
  }

  /**
   * 解析目录/文件名中的动态段
   * [id] -> :id
   * [...slug] -> *
   */
  private parseSegment(name: string): string {
    // Catch-all: [...slug]
    if (name.startsWith('[...') && name.endsWith(']')) {
      return '*';
    }
    // Dynamic: [id]
    if (name.startsWith('[') && name.endsWith(']')) {
      return `:${name.slice(1, -1)}`;
    }
    return name;
  }

  /**
   * 解析 API 文件
   * route.ts 文件的路由路径由目录结构决定
   */
  private parseApiFile(filePath: string, basePath: string): ApiRoute | null {
    // route.ts 文件的路由就是它所在目录的路径
    let pattern = basePath;

    // 规范化路径
    pattern = pattern.replace(/\/+/g, '/');
    if (pattern.endsWith('/') && pattern !== '/') {
      pattern = pattern.slice(0, -1);
    }

    // 构建正则表达式
    const { regex, params } = this.buildRegex(pattern);

    return {
      pattern,
      regex,
      params,
      filePath,
      method: undefined,
    };
  }

  /**
   * 构建匹配正则表达式
   */
  private buildRegex(pattern: string): { regex: RegExp; params: string[] } {
    const params: string[] = [];

    const regexStr = pattern
      // 转义特殊字符
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      // 处理通配符 *
      .replace(/\\\*/g, '(?<_catchall>.*)')
      // 处理动态参数 :name
      .replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, name) => {
        params.push(name);
        return `(?<${name}>[^/]+)`;
      });

    // 添加 catch-all 参数
    if (pattern.includes('*')) {
      params.push('_catchall');
    }

    return {
      regex: new RegExp(`^${regexStr}$`),
      params,
    };
  }

  /**
   * 匹配请求路径和方法
   */
  match(pathname: string, method: string): ApiRouteMatch | null {
    for (const route of this.routes) {
      // 检查 HTTP 方法
      if (route.method && route.method !== method.toUpperCase()) {
        continue;
      }

      // 检查路径
      const match = route.regex.exec(pathname);
      if (match) {
        const params: Record<string, string> = {};

        // 提取参数
        for (const param of route.params) {
          if (match.groups && match.groups[param] !== undefined) {
            params[param === '_catchall' ? 'slug' : param] =
              match.groups[param];
          }
        }

        return { route, params };
      }
    }

    return null;
  }

  /**
   * 获取所有路由（用于调试）
   */
  getRoutes(): ApiRoute[] {
    return [...this.routes];
  }
}
