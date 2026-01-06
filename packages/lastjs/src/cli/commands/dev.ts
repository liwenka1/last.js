import { join } from 'pathe';
import pc from 'picocolors';
import { createServer as createViteServer } from 'vite';
import { lastVitePlugin } from '../../vite/plugin.js';
import { startDevServer } from '../../server/dev-server.js';

export interface DevCommandOptions {
  port: number;
}

export async function dev(options: DevCommandOptions): Promise<void> {
  const rootDir = process.cwd();
  const appDir = join(rootDir, 'app');

  console.log(pc.cyan('\n🚀 Starting Last.js development server...\n'));
  console.log(pc.magenta('  Mode: SSR with Streaming\n'));

  try {
    // 创建 Vite 开发服务器
    const vite = await createViteServer({
      root: rootDir,
      server: {
        middlewareMode: true,
        hmr: {
          port: options.port + 1,
        },
      },
      plugins: lastVitePlugin(),
      appType: 'custom',
    });

    // 启动 Last.js 开发服务器
    const { server } = await startDevServer({
      appDir,
      port: options.port,
      rootDir,
      vite,
    });

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
      server.close();
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
