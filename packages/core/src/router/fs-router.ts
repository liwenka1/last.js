import { readdir } from 'fs/promises';
import { join } from 'pathe';
import type { RouteNode, RouteType, RouteMatch } from './types.js';
import { RouteMatcher } from './matcher.js';

export class FileSystemRouter {
  private root: RouteNode;
  private matcher: RouteMatcher | null = null;

  constructor(private appDir: string) {
    // 初始化根节点
    this.root = this.createNode('', '/', 'static');
  }

  /**
   * 扫描 app 目录
   */
  async scan(): Promise<void> {
    await this.scanDirectory(this.appDir, this.root);
    this.matcher = new RouteMatcher(this.root);
  }

  /**
   * 匹配路由
   */
  match(pathname: string): RouteMatch | null {
    if (!this.matcher) {
      throw new Error('Router not scanned. Call scan() first.');
    }
    return this.matcher.match(pathname);
  }

  /**
   * 获取所有路由
   */
  getRoutes(): RouteNode[] {
    const routes: RouteNode[] = [];
    this.collectRoutes(this.root, routes);
    return routes;
  }

  private async scanDirectory(
    dir: string,
    parentNode: RouteNode
  ): Promise<void> {
    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          // 处理目录（路由段）
          const segment = entry.name;

          // 跳过私有文件夹和特殊文件夹
          if (segment.startsWith('_') || segment.startsWith('.')) {
            continue;
          }

          // 确定路由类型
          const type = this.getRouteType(segment);
          const path =
            parentNode.path === '/'
              ? `/${segment}`
              : `${parentNode.path}/${segment}`;

          // 创建或获取子节点
          let childNode = this.getOrCreateChildNode(
            parentNode,
            segment,
            path,
            type
          );

          // 递归扫描子目录
          await this.scanDirectory(fullPath, childNode);
        } else {
          // 处理特殊文件
          this.processSpecialFile(entry.name, fullPath, parentNode);
        }
      }
    } catch (error) {
      // 目录不存在或无法读取
      console.warn(`Failed to scan directory: ${dir}`, error);
    }
  }

  private processSpecialFile(
    filename: string,
    filePath: string,
    node: RouteNode
  ): void {
    const match = filename.match(
      /^(page|layout|loading|error|not-found)\.(tsx|jsx|ts|js)$/
    );

    if (match) {
      const fileType = match[1];

      switch (fileType) {
        case 'page':
          node.files.page = filePath;
          break;
        case 'layout':
          node.files.layout = filePath;
          break;
        case 'loading':
          node.files.loading = filePath;
          break;
        case 'error':
          node.files.error = filePath;
          break;
        case 'not-found':
          node.files.notFound = filePath;
          break;
      }
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

  private collectRoutes(node: RouteNode, routes: RouteNode[]): void {
    if (node.files.page) {
      routes.push(node);
    }

    node.children.forEach((child) => this.collectRoutes(child, routes));

    if (node.dynamicChild) {
      this.collectRoutes(node.dynamicChild, routes);
    }

    if (node.catchAllChild) {
      this.collectRoutes(node.catchAllChild, routes);
    }
  }
}
