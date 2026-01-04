import type { RouteNode, RouteMatch } from './types.js';

/**
 * 路由匹配器
 */
export class RouteMatcher {
  constructor(private root: RouteNode) {}

  /**
   * 匹配路由
   */
  match(pathname: string): RouteMatch | null {
    const segments = this.normalizePathname(pathname)
      .split('/')
      .filter(Boolean);
    const params: Record<string, string> = {};

    let currentNode = this.root;
    const matchedNodes: RouteNode[] = [currentNode];

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
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
          // Catch-all 参数存储为 / 分隔的字符串
          params[paramName] = segments.slice(i).join('/');
        }
        matchedNodes.push(nextNode);
        break;
      }

      if (!nextNode) {
        return null;
      }

      matchedNodes.push(nextNode);
      currentNode = nextNode;
    }

    // 检查是否有 page.tsx
    if (!currentNode.files.page) {
      return null;
    }

    return {
      node: currentNode,
      params,
    };
  }

  private normalizePathname(pathname: string): string {
    return pathname.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
  }

  private extractParamName(segment: string): string | null {
    // [slug] -> slug
    const match = segment.match(/^\[\.\.\.(.+)\]$|^\[(.+)\]$/);
    return match ? match[1] || match[2] : null;
  }
}
