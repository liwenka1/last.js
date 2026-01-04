import pc from 'picocolors';

export interface StartCommandOptions {
  port: number;
}

export async function start(_options: StartCommandOptions): Promise<void> {
  console.log(pc.cyan('🚀 Starting Last.js production server...\n'));

  // TODO: 实现生产服务器
  console.log(pc.yellow('⚠️  Start command not implemented yet'));
  console.log(
    pc.dim('   Run `lastjs build` first, then start the production server\n')
  );
}

