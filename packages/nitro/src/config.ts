import type { NitroConfig } from 'nitropack';
import { join } from 'pathe';

export interface CreateNitroConfigOptions {
  appDir: string;
  dev?: boolean;
  rootDir?: string;
}

export function createNitroConfig(
  options: CreateNitroConfigOptions
): NitroConfig {
  const { appDir, dev = false, rootDir = process.cwd() } = options;

  return {
    rootDir,
    srcDir: join(rootDir, '.lastjs'),
    buildDir: join(rootDir, '.lastjs/nitro'),
    output: {
      dir: join(rootDir, '.output'),
      serverDir: join(rootDir, '.output/server'),
      publicDir: join(rootDir, '.output/public'),
    },
    dev,
    preset: dev ? undefined : 'node-server',

    // 路由处理器 - 返回简单的 HTML，暂时不做 SSR
    handlers: [
      {
        route: '/**',
        handler: join(rootDir, '.lastjs/handler.mjs'),
      },
    ],

    // Rollup 插件配置
    rollupConfig: {
      plugins: [],
    },

    // 公共目录
    publicAssets: [
      {
        baseURL: '/',
        dir: join(rootDir, 'public'),
        maxAge: dev ? 0 : 60 * 60 * 24 * 365, // 1 year in production
      },
    ],

    // 开发服务器配置
    devServer: {
      watch: dev ? [appDir] : [],
    },

    // 外部依赖 - 不内联，使用 node_modules
    externals: {
      inline: [],
    },

    // 别名配置
    alias: {
      '@lastjs/core': join(rootDir, '../../packages/core/dist/index.mjs'),
      '@lastjs/core/router': join(
        rootDir,
        '../../packages/core/dist/router/index.mjs'
      ),
      '@lastjs/core/render': join(
        rootDir,
        '../../packages/core/dist/render/index.mjs'
      ),
    },

    // TypeScript 支持
    typescript: {
      generateTsConfig: false,
    },

    // 日志
    logLevel: dev ? 3 : 2,
  };
}
