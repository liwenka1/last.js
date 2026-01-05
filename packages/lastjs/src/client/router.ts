/**
 * 客户端路由管理器
 * 负责处理页面导航和组件加载
 */

import type { ComponentType, ReactNode } from 'react';

/**
 * 页面组件类型
 */
export type PageComponent = ComponentType<Record<string, unknown>>;

/**
 * 布局组件类型
 */
export type LayoutComponent = ComponentType<{ children: ReactNode }>;

/**
 * 路由模块
 */
export interface RouteModule {
  default: PageComponent | LayoutComponent;
  metadata?: Record<string, unknown>;
}

/**
 * 导航结果
 */
export interface NavigationResult {
  /** 页面组件 */
  Page: PageComponent;
  /** 布局组件列表（从外到内） */
  layouts: LayoutComponent[];
  /** 页面 props */
  props: Record<string, unknown>;
  /** 路由参数 */
  params: Record<string, string>;
}

/**
 * 模块缓存
 */
const moduleCache = new Map<string, RouteModule>();

/**
 * 加载模块
 */
async function loadModule(path: string): Promise<RouteModule> {
  // 检查缓存
  const cached = moduleCache.get(path);
  if (cached) return cached;

  try {
    // 动态导入模块
    const mod = await import(/* @vite-ignore */ path);
    moduleCache.set(path, mod);
    return mod;
  } catch (error) {
    console.error(`[Last.js] Failed to load module: ${path}`, error);
    throw error;
  }
}

/**
 * 预加载模块
 */
export async function prefetchModule(path: string): Promise<void> {
  if (moduleCache.has(path)) return;

  try {
    await loadModule(path);
  } catch {
    // 预加载失败不影响主流程
  }
}

/**
 * 解析路径中的参数
 * 例如：/blog/hello-world 匹配 /blog/[slug] -> { slug: 'hello-world' }
 */
export function parseParams(
  pathname: string,
  pattern: string
): Record<string, string> | null {
  const params: Record<string, string> = {};

  const pathnameSegments = pathname.split('/').filter(Boolean);
  const patternSegments = pattern.split('/').filter(Boolean);

  // 检查是否有 catch-all 段
  const hasCatchAll = patternSegments.some((seg) => seg.startsWith('[...'));

  // 如果没有 catch-all，段数必须匹配
  if (!hasCatchAll && pathnameSegments.length !== patternSegments.length) {
    return null;
  }

  for (let i = 0; i < patternSegments.length; i++) {
    const patternSeg = patternSegments[i];
    const pathnameSeg = pathnameSegments[i];

    // Catch-all 段 [...slug]
    if (patternSeg.startsWith('[...') && patternSeg.endsWith(']')) {
      const paramName = patternSeg.slice(4, -1);
      // 获取剩余所有段
      params[paramName] = pathnameSegments.slice(i).join('/');
      return params;
    }

    // 动态段 [slug]
    if (patternSeg.startsWith('[') && patternSeg.endsWith(']')) {
      const paramName = patternSeg.slice(1, -1);
      if (!pathnameSeg) return null;
      params[paramName] = pathnameSeg;
      continue;
    }

    // 静态段必须完全匹配
    if (patternSeg !== pathnameSeg) {
      return null;
    }
  }

  return params;
}

/**
 * 客户端路由器类
 */
export class ClientRouter {
  private routes: Map<
    string,
    { pagePath: string; layoutPaths: string[]; pattern: string }
  > = new Map();

  /**
   * 注册路由
   */
  registerRoute(
    pattern: string,
    pagePath: string,
    layoutPaths: string[]
  ): void {
    this.routes.set(pattern, { pagePath, layoutPaths, pattern });
  }

  /**
   * 匹配路由
   */
  match(pathname: string): {
    pagePath: string;
    layoutPaths: string[];
    params: Record<string, string>;
  } | null {
    for (const [, route] of this.routes) {
      const params = parseParams(pathname, route.pattern);
      if (params !== null) {
        return {
          pagePath: route.pagePath,
          layoutPaths: route.layoutPaths,
          params,
        };
      }
    }
    return null;
  }

  /**
   * 导航到指定路径
   */
  async navigate(pathname: string): Promise<NavigationResult | null> {
    const match = this.match(pathname);
    if (!match) return null;

    try {
      // 并行加载所有模块
      const [pageModule, ...layoutModules] = await Promise.all([
        loadModule(match.pagePath),
        ...match.layoutPaths.map((path) => loadModule(path)),
      ]);

      const Page = pageModule.default as PageComponent;
      const layouts = layoutModules.map(
        (mod) => mod.default as LayoutComponent
      );

      return {
        Page,
        layouts,
        props: { params: match.params },
        params: match.params,
      };
    } catch (error) {
      console.error('[Last.js] Navigation failed:', error);
      return null;
    }
  }

  /**
   * 预加载路由
   */
  async prefetch(pathname: string): Promise<void> {
    const match = this.match(pathname);
    if (!match) return;

    // 并行预加载所有模块
    await Promise.all([
      prefetchModule(match.pagePath),
      ...match.layoutPaths.map((path) => prefetchModule(path)),
    ]);
  }
}

/**
 * 全局客户端路由器实例
 */
export const clientRouter = new ClientRouter();
