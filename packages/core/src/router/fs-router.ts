import { readdir } from 'fs/promises';
import { join } from 'pathe';

interface SimpleRoute {
  path: string;
  filePath: string;
  params: string[];
  isDynamic: boolean;
}

export class FileSystemRouter {
  private routes: SimpleRoute[] = [];

  constructor(private appDir: string) {}

  async scan(): Promise<SimpleRoute[]> {
    this.routes = [];
    await this.scanDirectory(this.appDir);
    return this.routes.sort((a, b) => {
      // 静态路由优先于动态路由
      if (a.isDynamic && !b.isDynamic) return 1;
      if (!a.isDynamic && b.isDynamic) return -1;
      return b.path.length - a.path.length;
    });
  }

  private async scanDirectory(dir: string, basePath = ''): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        const segment = entry.name;
        const newPath = basePath + '/' + segment;
        await this.scanDirectory(fullPath, newPath);
      } else if (entry.name === 'page.tsx' || entry.name === 'page.jsx') {
        const routePath = basePath || '/';
        const params = this.extractParams(routePath);

        this.routes.push({
          path: this.normalizeRoutePath(routePath),
          filePath: fullPath,
          params,
          isDynamic: params.length > 0,
        });
      }
    }
  }

  private extractParams(path: string): string[] {
    const params: string[] = [];
    const segments = path.split('/').filter(Boolean);

    for (const segment of segments) {
      if (segment.startsWith('[') && segment.endsWith(']')) {
        const param = segment.slice(1, -1);
        params.push(param.startsWith('...') ? param.slice(3) : param);
      }
    }

    return params;
  }

  private normalizeRoutePath(path: string): string {
    return (
      path
        .split('/')
        .map((segment) => {
          if (segment.startsWith('[...') && segment.endsWith(']')) {
            return '*';
          }
          if (segment.startsWith('[') && segment.endsWith(']')) {
            return ':' + segment.slice(1, -1);
          }
          return segment;
        })
        .join('/') || '/'
    );
  }

  match(
    pathname: string
  ): { route: SimpleRoute; params: Record<string, string> } | null {
    for (const route of this.routes) {
      const params = this.matchRoute(route.path, pathname);
      if (params !== null) {
        return { route, params };
      }
    }
    return null;
  }

  private matchRoute(
    routePath: string,
    pathname: string
  ): Record<string, string> | null {
    const routeSegments = routePath.split('/').filter(Boolean);
    const pathSegments = pathname.split('/').filter(Boolean);

    if (routePath === '/' && pathname === '/') {
      return {};
    }

    const params: Record<string, string> = {};

    for (let i = 0; i < routeSegments.length; i++) {
      const routeSegment = routeSegments[i];

      if (routeSegment === '*') {
        params[
          this.routes.find((r) => r.path === routePath)?.params[0] || 'slug'
        ] = pathSegments.slice(i).join('/');
        return params;
      }

      if (routeSegment.startsWith(':')) {
        params[routeSegment.slice(1)] = pathSegments[i];
      } else if (routeSegment !== pathSegments[i]) {
        return null;
      }
    }

    return routeSegments.length === pathSegments.length ? params : null;
  }
}
