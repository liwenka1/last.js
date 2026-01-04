import type { NitroConfig } from 'nitropack';
import { defineNitroConfig } from 'nitropack/config';

export interface LastNitroOptions {
  appDir: string;
  port?: number;
  dev?: boolean;
}

export function createNitroConfig(options: LastNitroOptions): NitroConfig {
  const { appDir, dev = false } = options;

  return defineNitroConfig({
    srcDir: appDir,
    devServer: {
      watch: dev ? [appDir] : [],
    },
    handlers: [
      {
        route: '/**',
        handler: './server/handler',
      },
    ],
    devHandlers: [],
    preset: 'node-server',
    serveStatic: true,
    publicAssets: [
      {
        baseURL: '/_next',
        dir: '.last/client',
      },
    ],
  });
}

