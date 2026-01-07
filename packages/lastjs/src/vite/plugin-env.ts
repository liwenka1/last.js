/**
 * Vite Plugin: Environment Variables
 *
 * 处理环境变量：
 * - 加载 .env* 文件
 * - 自动注入 LASTJS_PUBLIC_* 到客户端
 * - 服务端可访问所有环境变量
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'pathe';
import type { Plugin, UserConfig } from 'vite';

export interface EnvPluginOptions {
  /** 项目根目录 */
  rootDir?: string;
  /** 环境变量前缀（默认: LASTJS_PUBLIC_） */
  prefix?: string;
}

/**
 * 解析 .env 文件
 */
function parseEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) {
    return {};
  }

  const content = readFileSync(path, 'utf-8');
  const result: Record<string, string> = {};

  for (const line of content.split('\n')) {
    // 跳过注释和空行
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    // 解析 KEY=VALUE
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();

      // 移除引号
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      result[key] = value;
    }
  }

  return result;
}

/**
 * 加载环境变量
 */
function loadEnvFiles(rootDir: string, mode: string): Record<string, string> {
  const envFiles = ['.env', `.env.local`, `.env.${mode}`, `.env.${mode}.local`];

  let env: Record<string, string> = {};

  // 按优先级加载（后面的覆盖前面的）
  for (const file of envFiles) {
    const filePath = join(rootDir, file);
    const fileEnv = parseEnvFile(filePath);
    env = { ...env, ...fileEnv };
  }

  return env;
}

/**
 * 环境变量插件
 */
export function envPlugin(options: EnvPluginOptions = {}): Plugin {
  const { rootDir = process.cwd(), prefix = 'LASTJS_PUBLIC_' } = options;

  let env: Record<string, string> = {};
  let mode = 'development';

  return {
    name: 'lastjs:env',
    enforce: 'pre',

    config(_config, { mode: configMode }) {
      mode = configMode;

      // 加载环境变量
      env = loadEnvFiles(rootDir, mode);

      // 注入 process.env 到 Node 环境
      for (const [key, value] of Object.entries(env)) {
        if (process.env[key] === undefined) {
          process.env[key] = value;
        }
      }

      // 过滤出需要注入到客户端的变量
      const clientEnv: Record<string, string> = {};
      for (const [key, value] of Object.entries(env)) {
        if (key.startsWith(prefix)) {
          clientEnv[`process.env.${key}`] = JSON.stringify(value);
        }
      }

      // 注入到 Vite config
      const define = {
        ...clientEnv,
        // 添加一些常用的环境变量
        'process.env.NODE_ENV': JSON.stringify(mode),
      };

      return {
        define,
      } as UserConfig;
    },

    configResolved(_resolvedConfig) {
      // 打印加载的环境变量（仅客户端可见的）
      console.log('\n📦 Environment Variables:\n');

      const publicVars = Object.entries(env).filter(([key]) =>
        key.startsWith(prefix)
      );

      if (publicVars.length > 0) {
        console.log('  Client-side (PUBLIC):');
        for (const [key, value] of publicVars) {
          // 隐藏敏感信息
          const displayValue =
            value.length > 20 ? `${value.slice(0, 20)}...` : value;
          console.log(`    ${key}=${displayValue}`);
        }
      }

      const privateVars = Object.entries(env).filter(
        ([key]) => !key.startsWith(prefix)
      );

      if (privateVars.length > 0) {
        console.log('\n  Server-side only:');
        for (const [key] of privateVars) {
          console.log(`    ${key}=***`);
        }
      }

      if (publicVars.length === 0 && privateVars.length === 0) {
        console.log('  No environment variables loaded');
      }

      console.log('\n');
    },
  };
}
