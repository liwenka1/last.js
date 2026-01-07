/**
 * Server Actions Registry
 *
 * 在服务器启动时扫描所有 'use server' 文件，
 * 构建白名单，防止任意函数被远程调用。
 */

import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'pathe';
import type { ViteDevServer } from 'vite';

/**
 * Server Action 函数类型
 */
export type ServerActionFn = (...args: unknown[]) => Promise<unknown>;

export interface ActionInfo {
  /** 函数引用 */
  fn: ServerActionFn;
  /** 文件路径 */
  filePath: string;
  /** 函数名 */
  functionName: string;
  /** Action ID (用于客户端调用) */
  id: string;
}

/**
 * Actions 注册表
 */
export class ActionsRegistry {
  private actions = new Map<string, ActionInfo>();

  /**
   * 获取注册的 action
   */
  get(actionId: string): ActionInfo | undefined {
    return this.actions.get(actionId);
  }

  /**
   * 获取所有注册的 actions
   */
  getAll(): Map<string, ActionInfo> {
    return this.actions;
  }

  /**
   * 注册一个 action
   */
  register(info: ActionInfo): void {
    this.actions.set(info.id, info);
  }

  /**
   * 清空注册表（用于 HMR）
   */
  clear(): void {
    this.actions.clear();
  }

  /**
   * 扫描并注册所有 Server Actions
   */
  async scanAndRegister(appDir: string, vite: ViteDevServer): Promise<void> {
    console.log('\n🔍 Scanning Server Actions...');

    // 清空旧的注册表
    this.clear();

    // 递归扫描所有文件
    const files = await this.scanDirectory(appDir, appDir);

    let actionCount = 0;

    for (const filePath of files) {
      // 只处理 .ts, .tsx, .js, .jsx 文件
      if (!/\.(tsx?|jsx?)$/.test(filePath)) {
        continue;
      }

      try {
        // 读取文件内容，快速检查是否包含 'use server'
        const content = await readFile(filePath, 'utf-8');

        if (!this.hasUseServerDirective(content)) {
          continue;
        }

        // 使用 Vite 加载模块（支持 TypeScript、HMR）
        const mod = await vite.ssrLoadModule(filePath);

        // 调试：显示所有导出
        const relativePath = relative(appDir, filePath);
        console.log(`  📄 ${relativePath}`);
        console.log(`     Exports:`, Object.keys(mod));

        // 注册所有导出的函数
        for (const [exportName, exportValue] of Object.entries(mod)) {
          // 调试：显示每个导出的类型
          console.log(
            `     - ${exportName}: ${typeof exportValue}`,
            typeof exportValue === 'function'
              ? `(fn.name: ${(exportValue as ServerActionFn).name || 'anonymous'})`
              : ''
          );

          // 跳过 default export 和非函数导出
          if (exportName === 'default' || typeof exportValue !== 'function') {
            continue;
          }

          // 跳过一些特殊的导出（metadata 等）
          if (this.isSpecialExport(exportName)) {
            console.log(`     ⊘ ${exportName}: skipped (special export)`);
            continue;
          }

          // 生成 action ID
          const actionId = `${relativePath}:${exportName}`;

          // 注册 action
          this.register({
            fn: exportValue as ServerActionFn,
            filePath,
            functionName: exportName,
            id: actionId,
          });

          actionCount++;
          console.log(`     ✅ Registered: ${actionId}`);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        console.warn(`  ⚠ Failed to load ${filePath}:`, errorMessage);
      }
    }

    if (actionCount === 0) {
      console.log('  No Server Actions found');
    } else {
      console.log(`\n✅ Registered ${actionCount} Server Actions\n`);
    }
  }

  /**
   * 递归扫描目录，返回所有文件路径
   */
  private async scanDirectory(dir: string, baseDir: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        // 跳过隐藏文件和 node_modules
        if (entry.name.startsWith('.') || entry.name === 'node_modules') {
          continue;
        }

        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          // 递归扫描子目录
          const subFiles = await this.scanDirectory(fullPath, baseDir);
          files.push(...subFiles);
        } else {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.warn(`Failed to scan directory ${dir}:`, error);
    }

    return files;
  }

  /**
   * 检查文件内容是否包含 'use server' 指令
   */
  private hasUseServerDirective(content: string): boolean {
    // 检查文件顶部是否有 'use server'
    // 支持单引号、双引号、反引号
    const lines = content.split('\n').slice(0, 10); // 只检查前 10 行

    for (const line of lines) {
      const trimmed = line.trim();

      // 跳过注释和空行（包括注释结束符）
      if (
        !trimmed ||
        trimmed.startsWith('//') ||
        trimmed.startsWith('/*') ||
        trimmed === '*/' ||
        trimmed.startsWith('*')
      ) {
        continue;
      }

      // 检查是否是 'use server' 指令
      if (
        trimmed === "'use server'" ||
        trimmed === '"use server"' ||
        trimmed === '`use server`' ||
        trimmed === "'use server';" ||
        trimmed === '"use server";' ||
        trimmed === '`use server`;'
      ) {
        return true;
      }

      // 如果遇到其他代码，停止检查
      // 'use server' 必须在文件顶部
      if (
        trimmed &&
        !trimmed.startsWith('import') &&
        !trimmed.startsWith('//')
      ) {
        break;
      }
    }

    return false;
  }

  /**
   * 检查是否是特殊的导出（不应该作为 action）
   */
  private isSpecialExport(exportName: string): boolean {
    const specialExports = [
      'metadata',
      'generateMetadata',
      'generateStaticParams',
      'dynamic',
      'revalidate',
      'fetchCache',
      'runtime',
      'preferredRegion',
    ];

    return specialExports.includes(exportName);
  }
}

/**
 * 全局注册表实例
 */
export const actionsRegistry = new ActionsRegistry();
