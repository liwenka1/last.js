import { readdir } from 'node:fs/promises';
import { join } from 'pathe';
import type { RouteNode, RouteType, RouteMatch } from './types.js';

/**
 * 文件系统路由器
 * 扫描 app 目录，构建路由树，匹配请求路径
 */
export class FileSystemRouter {
  private root: RouteNode;

  constructor(private appDir: string) {
    this.root = this.createNode('', '/', 'static');
  }

  /**
   * 扫描 app 目录
   */
  async scan(): Promise<void> {
    await this.scanDirectory(this.appDir, this.root);
  }

  /**
   * 匹配路由
   */
  match(pathname: string): RouteMatch | null {
    const segments = this.normalizePath(pathname).split('/').filter(Boolean);

    const params: Record<string, string> = {};
    let currentNode = this.root;

    // 逐段匹配
    for (const segment of segments) {
      let nextNode: RouteNode | undefined;

      // 1. 尝试静态匹配
      nextNode = currentNode.children.get(segment);

      // 2. 尝试动态匹配 [slug]
      if (!nextNode && currentNode.dynamicChild) {
        nextNode = currentNode.dynamicChild;
        const paramName = this.extractParamName(nextNode.segment);
        if (paramName) {
          params[paramName] = segment;
        }
      }

      // 3. 尝试 catch-all 匹配 [...slug]
      if (!nextNode && currentNode.catchAllChild) {
        nextNode = currentNode.catchAllChild;
        const paramName = this.extractParamName(nextNode.segment);
        if (paramName) {
          // 收集剩余所有段
          const remainingIndex = segments.indexOf(segment);
          params[paramName] = segments.slice(remainingIndex).join('/');
        }
        currentNode = nextNode;
        break;
      }

      if (!nextNode) {
        return null;
      }

      currentNode = nextNode;
    }

    // 检查是否有 page 文件
    if (!currentNode.files.page) {
      return null;
    }

    return {
      node: currentNode,
      params,
      filePath: currentNode.files.page,
    };
  }

  /**
   * 获取从根到当前节点的所有 layout 路径
   */
  getLayoutChain(node: RouteNode): string[] {
    const layouts: string[] = [];
    let current: RouteNode | undefined = node;

    // 从当前节点向上收集所有 layout
    while (current) {
      if (current.files.layout) {
        layouts.unshift(current.files.layout);
      }
      current = current.parent;
    }

    return layouts;
  }

  /**
   * 获取 not-found 组件路径（从根节点获取）
   */
  getNotFoundPath(): string | undefined {
    return this.root.files.notFound;
  }

  /**
   * 获取根 layout 路径
   */
  getRootLayoutPath(): string | undefined {
    return this.root.files.layout;
  }

  /**
   * 获取最近的 loading 组件路径（从当前节点向上查找）
   */
  getLoadingPath(node: RouteNode): string | undefined {
    let current: RouteNode | undefined = node;

    while (current) {
      if (current.files.loading) {
        return current.files.loading;
      }
      current = current.parent;
    }

    return undefined;
  }

  /**
   * 获取所有路由
   */
  getRoutes(): Array<{ path: string; filePath: string }> {
    const routes: Array<{ path: string; filePath: string }> = [];
    this.collectRoutes(this.root, routes);
    return routes;
  }

  private collectRoutes(
    node: RouteNode,
    routes: Array<{ path: string; filePath: string }>
  ): void {
    if (node.files.page) {
      routes.push({
        path: node.path,
        filePath: node.files.page,
      });
    }

    // 遍历静态子节点
    node.children.forEach((child) => {
      this.collectRoutes(child, routes);
    });

    // 遍历动态子节点
    if (node.dynamicChild) {
      this.collectRoutes(node.dynamicChild, routes);
    }

    // 遍历 catch-all 子节点
    if (node.catchAllChild) {
      this.collectRoutes(node.catchAllChild, routes);
    }
  }

  private async scanDirectory(
    dir: string,
    parentNode: RouteNode
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
          const newPath =
            parentNode.path === '/'
              ? `/${segment}`
              : `${parentNode.path}/${segment}`;

          // 创建或获取子节点
          const childNode = this.getOrCreateChildNode(
            parentNode,
            segment,
            newPath,
            type
          );

          // 递归扫描
          await this.scanDirectory(fullPath, childNode);
        } else if (entry.name === 'page.tsx' || entry.name === 'page.jsx') {
          parentNode.files.page = fullPath;
        } else if (entry.name === 'layout.tsx' || entry.name === 'layout.jsx') {
          parentNode.files.layout = fullPath;
        } else if (
          entry.name === 'loading.tsx' ||
          entry.name === 'loading.jsx'
        ) {
          parentNode.files.loading = fullPath;
        } else if (entry.name === 'error.tsx' || entry.name === 'error.jsx') {
          parentNode.files.error = fullPath;
        } else if (
          entry.name === 'not-found.tsx' ||
          entry.name === 'not-found.jsx'
        ) {
          parentNode.files.notFound = fullPath;
        }
      }
    } catch (error) {
      console.warn(`Failed to scan directory: ${dir}`, error);
    }
  }

  private getOrCreateChildNode(
    parent: RouteNode,
    segment: string,
    path: string,
    type: RouteType
  ): RouteNode {
    if (type === 'catch-all') {
      if (!parent.catchAllChild) {
        parent.catchAllChild = this.createNode(segment, path, type, parent);
      }
      return parent.catchAllChild;
    }

    if (type === 'dynamic') {
      if (!parent.dynamicChild) {
        parent.dynamicChild = this.createNode(segment, path, type, parent);
      }
      return parent.dynamicChild;
    }

    // 静态路由
    let child = parent.children.get(segment);
    if (!child) {
      child = this.createNode(segment, path, type, parent);
      parent.children.set(segment, child);
    }
    return child;
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

  private extractParamName(segment: string): string | null {
    // [...slug] -> slug
    // [slug] -> slug
    const match = segment.match(/^\[\.\.\.(.+)\]$|^\[(.+)\]$/);
    return match ? match[1] || match[2] : null;
  }

  private normalizePath(pathname: string): string {
    return pathname.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
  }
}
