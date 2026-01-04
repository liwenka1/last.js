import { join } from 'pathe';
import pc from 'picocolors';
import { startNitroDevServer } from '@lastjs/nitro';
import { createServer as createViteServer } from 'vite';
import react from '@vitejs/plugin-react';

export interface DevCommandOptions {
  port: number;
}

export async function dev(options: DevCommandOptions): Promise<void> {
  const rootDir = process.cwd();
  const appDir = join(rootDir, 'app');

  console.log(pc.cyan('\n🚀 Starting Last.js development server...\n'));

  try {
    // 1. 创建 Vite 服务器（SSR 模式，中间件模式）
    const vite = await createViteServer({
      root: rootDir,
      server: { middlewareMode: true },
      appType: 'custom',
      plugins: [react()],
      ssr: {
        // 将 React 相关包设为外部依赖，让 Node.js 直接加载
        // 避免 Vite SSR 模块运行器处理 CJS 模块的问题
        external: ['react', 'react-dom', 'react-dom/server'],
        noExternal: [],
      },
      optimizeDeps: {
        include: ['react', 'react-dom'],
      },
    });

    // 2. 启动开发服务器，传入 Vite 实例
    const { server, close } = await startNitroDevServer({
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
    process.on('SIGINT', async () => {
      console.log(pc.yellow('\n\n⏳ Shutting down...'));
      await vite.close();
      await close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await vite.close();
      await close();
      process.exit(0);
    });
  } catch (error) {
    console.error(pc.red('\n✗ Failed to start development server:\n'));
    console.error(error);
    process.exit(1);
  }
}
