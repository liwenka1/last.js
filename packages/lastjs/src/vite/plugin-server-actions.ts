/**
 * Vite Plugin: Server Actions Transform
 *
 * 在编译时自动转换 Server Actions：
 * - 找到所有带 'use server' 的文件
 * - 将 export async function 转换为客户端代理
 * - 服务端保持原样
 */

import { parse } from '@babel/parser';
import traverseDefault, { type NodePath } from '@babel/traverse';
import generateDefault from '@babel/generator';
import * as t from '@babel/types';
import { relative } from 'pathe';
import type { Plugin } from 'vite';

// ESM 兼容性处理
const traverse =
  (traverseDefault as unknown as { default: typeof traverseDefault }).default ||
  traverseDefault;
const generate =
  (generateDefault as unknown as { default: typeof generateDefault }).default ||
  generateDefault;

export interface ServerActionsPluginOptions {
  appDir: string;
}

/**
 * 检查文件是否包含 'use server' 指令
 */
function hasUseServerDirective(code: string): boolean {
  const lines = code.split('\n').slice(0, 15); // 检查前 15 行

  for (const line of lines) {
    const trimmed = line.trim();

    // 跳过注释和空行
    if (
      !trimmed ||
      trimmed.startsWith('//') ||
      trimmed.startsWith('/*') ||
      trimmed === '*/' ||
      trimmed.startsWith('*')
    ) {
      continue;
    }

    // 检查 'use server' 指令
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
    if (trimmed && !trimmed.startsWith('import')) {
      break;
    }
  }

  return false;
}

/**
 * Server Actions Transform Plugin
 */
export function serverActionsPlugin(
  options: ServerActionsPluginOptions
): Plugin {
  const { appDir } = options;

  return {
    name: 'lastjs:server-actions',
    enforce: 'pre',

    transform(code: string, id: string, transformOptions) {
      // 只处理 TS/TSX 文件
      if (!id.match(/\.(ts|tsx)$/)) {
        return null;
      }

      // 检查是否有 'use server' 指令
      if (!hasUseServerDirective(code)) {
        return null;
      }

      const isSsr = transformOptions?.ssr;
      const relativePath = relative(appDir, id).replace(/\\/g, '/');

      // 服务端：保持原样（实际的函数实现）
      if (isSsr) {
        return null;
      }

      // 客户端：转换为代理函数
      try {
        // 1. Parse 代码
        const ast = parse(code, {
          sourceType: 'module',
          plugins: ['typescript', 'jsx'],
        });

        let hasTransformed = false;
        const imports = new Set<string>();

        // 2. Traverse 并转换
        traverse(ast, {
          ExportNamedDeclaration(path: NodePath<t.ExportNamedDeclaration>) {
            const declaration = path.node.declaration;

            // 只处理导出的 async 函数声明
            if (
              !declaration ||
              !t.isFunctionDeclaration(declaration) ||
              !declaration.async ||
              !declaration.id?.name
            ) {
              return;
            }

            const functionName = declaration.id.name;
            const actionId = `${relativePath}:${functionName}`;

            // 转换为: export const functionName = createServerAction('actionId', 'functionName');
            const newDeclaration = t.variableDeclaration('const', [
              t.variableDeclarator(
                t.identifier(functionName),
                t.callExpression(t.identifier('createServerAction'), [
                  t.stringLiteral(actionId),
                  t.stringLiteral(functionName),
                ])
              ),
            ]);

            // 替换节点
            path.replaceWith(t.exportNamedDeclaration(newDeclaration, []));

            hasTransformed = true;
            imports.add('createServerAction');

            console.log(`  [Client] Transformed: ${actionId}`);
          },
        });

        // 如果有转换，添加 import
        if (hasTransformed) {
          // 添加 import { createServerAction } from 'lastjs/client'
          const importDeclaration = t.importDeclaration(
            [
              t.importSpecifier(
                t.identifier('createServerAction'),
                t.identifier('createServerAction')
              ),
            ],
            t.stringLiteral('lastjs/client')
          );

          ast.program.body.unshift(importDeclaration);
        }

        // 3. Generate 代码
        const output = generate(ast, {
          sourceMaps: true,
          sourceFileName: id,
        });

        return {
          code: output.code,
          map: output.map,
        };
      } catch (error) {
        console.error(`[Server Actions] Transform failed for ${id}:`, error);
        throw error;
      }
    },
  };
}
