import { readdir } from 'node:fs/promises';
import { join } from 'pathe';
import type { RouteNode, RouteType, RouteMatch } from './types.js';

/**
 * 文件系统路由器
 * 扫描 app 目录，构建路由树，匹配请求路径
 */
export class FileSystemRouter {
  private root: RouteNode;
  private routes: Map<string, string> = new Map();
  private dynamicRoutes: Array<{
    pattern: RegExp;
    paramNames: string[];
    filePath: string;
    node: RouteNode;
  }> = [];

  constructor(private appDir: string) {
    this.root = this.createNode('', '/', 'static');
  }

  /**
   * 扫描 app 目录
   */
  async scan(): Promise<void> {
    this.routes.clear();
    this.dynamicRoutes = [];
    await this.scanDirectory(this.appDir, this.root, '');
  }

  /**
   * 匹配路由
   */
  match(pathname: string): RouteMatch | null {
    const normalizedPath = this.normalizePath(pathname);

    // 1. 先尝试静态路由匹配
    const staticMatch = this.routes.get(normalizedPath);
    if (staticMatch) {
      return {
        node: this.root,
        params: {},
        filePath: staticMatch,
      };
    }

    // 2. 再尝试动态路由匹配
    for (const route of this.dynamicRoutes) {
      const match = normalizedPath.match(route.pattern);
      if (match) {
        const params: Record<string, string> = {};
        route.paramNames.forEach((name, i) => {
          params[name] = match[i + 1];
        });
        return {
          node: route.node,
          params,
          filePath: route.filePath,
        };
      }
    }

    return null;
  }

  /**
   * 获取所有路由
   */
  getRoutes(): Array<{ path: string; filePath: string }> {
    const routes: Array<{ path: string; filePath: string }> = [];

    // 静态路由
    this.routes.forEach((filePath, path) => {
      routes.push({ path, filePath });
    });

    // 动态路由
    this.dynamicRoutes.forEach((route) => {
      routes.push({
        path: route.pattern.source,
        filePath: route.filePath,
      });
    });

    return routes;
  }

  private async scanDirectory(
    dir: string,
    parentNode: RouteNode,
    basePath: string
  ): Promise<void> {
    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        // 跳过私有文件夹和隐藏文件
        if (entry.name.startsWith('_') || entry.name.startsWith('.')) {
          continue;
        }

        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          const segment = entry.name;
          const type = this.getRouteType(segment);

          // 构建路径
          let newBasePath: string;
          if (type === 'dynamic') {
            // [slug] -> :slug
            const paramName = segment.slice(1, -1);
            newBasePath = `${basePath}/:${paramName}`;
          } else if (type === 'catch-all') {
            // [...slug] -> *slug
            const paramName = segment.slice(4, -1);
            newBasePath = `${basePath}/*${paramName}`;
          } else {
            newBasePath = `${basePath}/${segment}`;
          }

          // 创建子节点
          const childNode = this.createNode(segment, newBasePath, type, parentNode);

          // 递归扫描
          await this.scanDirectory(fullPath, childNode, newBasePath);
        } else if (entry.name === 'page.tsx' || entry.name === 'page.jsx') {
          // 找到页面文件
          const routePath = basePath || '/';

          if (routePath.includes(':') || routePath.includes('*')) {
            // 动态路由
            const paramNames: string[] = [];
            const patternStr = routePath
              .replace(/:([^/]+)/g, (_, name) => {
                paramNames.push(name);
                return '([^/]+)';
              })
              .replace(/\*([^/]+)/g, (_, name) => {
                paramNames.push(name);
                return '(.+)';
              });

            this.dynamicRoutes.push({
              pattern: new RegExp(`^${patternStr}$`),
              paramNames,
              filePath: fullPath,
              node: parentNode,
            });
          } else {
            // 静态路由
            this.routes.set(routePath, fullPath);
          }

          // 记录到节点
          parentNode.files.page = fullPath;
        } else if (entry.name === 'layout.tsx' || entry.name === 'layout.jsx') {
          parentNode.files.layout = fullPath;
        } else if (entry.name === 'loading.tsx' || entry.name === 'loading.jsx') {
          parentNode.files.loading = fullPath;
        } else if (entry.name === 'error.tsx' || entry.name === 'error.jsx') {
          parentNode.files.error = fullPath;
        } else if (entry.name === 'not-found.tsx' || entry.name === 'not-found.jsx') {
          parentNode.files.notFound = fullPath;
        }
      }
    } catch (error) {
      console.warn(`Failed to scan directory: ${dir}`, error);
    }
  }

  private createNode(
    segment: string,
    path: string,
    type: RouteType,
    parent?: RouteNode
  ): RouteNode {
    return {
      segment,
      path,
      type,
      files: {},
      children: new Map(),
      parent,
    };
  }

  private getRouteType(segment: string): RouteType {
    if (segment.startsWith('[...') && segment.endsWith(']')) {
      return 'catch-all';
    }
    if (segment.startsWith('[') && segment.endsWith(']')) {
      return 'dynamic';
    }
    return 'static';
  }

  private normalizePath(pathname: string): string {
    return pathname.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
  }
}

