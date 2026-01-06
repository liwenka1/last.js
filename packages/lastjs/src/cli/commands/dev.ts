import { join } from 'pathe';
import pc from 'picocolors';
import { createServer as createViteServer } from 'vite';
import rsc from '@vitejs/plugin-rsc';
import react from '@vitejs/plugin-react';
import {
  createRscVirtualPlugin,
  VIRTUAL_RSC_ENTRY,
  VIRTUAL_SSR_ENTRY,
  VIRTUAL_BROWSER_ENTRY,
} from '../../rsc/virtual-entries.js';

export interface DevCommandOptions {
  port: number;
}

export async function dev(options: DevCommandOptions): Promise<void> {
  const rootDir = process.cwd();
  const appDir = join(rootDir, 'app');

  console.log(pc.cyan('\n🚀 Starting Last.js development server...\n'));
  console.log(pc.magenta('  Mode: React Server Components (RSC)\n'));

  try {
    // 创建 Vite 服务器（带 RSC 支持）
    const vite = await createViteServer({
      root: rootDir,
      server: {
        port: options.port,
      },
      plugins: [
        // RSC 虚拟入口插件
        createRscVirtualPlugin(),
        // @vitejs/plugin-rsc
        rsc(),
        // React 插件（用于客户端组件 HMR）
        react(),
      ],
      // RSC 需要的三个环境配置
      environments: {
        // RSC 环境 - 使用 react-server 条件加载模块
        rsc: {
          build: {
            rollupOptions: {
              input: {
                index: VIRTUAL_RSC_ENTRY,
              },
            },
          },
        },
        // SSR 环境 - 不使用 react-server 条件
        ssr: {
          build: {
            rollupOptions: {
              input: {
                index: VIRTUAL_SSR_ENTRY,
              },
            },
          },
        },
        // Client 环境 - 浏览器端
        client: {
          build: {
            rollupOptions: {
              input: {
                index: VIRTUAL_BROWSER_ENTRY,
              },
            },
          },
        },
      },
    });

    // 启动 Vite 开发服务器
    await vite.listen();

    console.log(
      pc.green(
        `✓ Server ready on ${pc.bold(`http://localhost:${options.port}`)}`
      )
    );
    console.log(pc.dim(`  App directory: ${appDir}\n`));

    // 监听进程退出
    const cleanup = async () => {
      console.log(pc.yellow('\n\n⏳ Shutting down...'));
      await vite.close();
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  } catch (error) {
    console.error(pc.red('\n✗ Failed to start development server:\n'));
    console.error(error);
    process.exit(1);
  }
}
