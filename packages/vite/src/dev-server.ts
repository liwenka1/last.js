import { createServer } from 'vite';
import { lastVitePlugin } from './plugin.js';
import type { ViteDevServer } from 'vite';

export interface ViteDevServerOptions {
  appDir: string;
  port?: number;
  rootDir?: string;
}

export async function startViteDevServer(
  options: ViteDevServerOptions
): Promise<ViteDevServer> {
  const { appDir, port = 3001, rootDir = process.cwd() } = options;

  const server = await createServer({
    root: rootDir,
    plugins: [lastVitePlugin({ appDir })],
    server: {
      port,
      strictPort: true,
      middlewareMode: false, // 独立运行
      hmr: {
        port,
      },
    },
    appType: 'custom',
    clearScreen: false,
  });

  await server.listen();

  return server;
}

