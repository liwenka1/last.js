import type { Plugin, RunnableDevEnvironment, UserConfig } from 'vite';
import rsc from '@vitejs/plugin-rsc';
import react from '@vitejs/plugin-react';
import { resolve, join, dirname } from 'pathe';
import { fileURLToPath } from 'node:url';
import { envPlugin } from './plugin-env.js';
import { serverActionsPlugin } from './plugin-server-actions.js';

export interface LastVitePluginOptions {
  appDir?: string;
  rootDir?: string;
}

export const ENVIRONMENT_CLIENT = 'client';
export const ENVIRONMENT_SSR = 'ssr';
export const ENVIRONMENT_RSC = 'rsc';

// 获取 lastjs 包的目录
// 注意：编译后代码在 dist/plugin-*.js，所以 __dirname = dist
const __dirname = dirname(fileURLToPath(import.meta.url));
const lastjsPackageDir = resolve(__dirname, '..'); // dist -> packages/lastjs

export function lastVitePlugin(options: LastVitePluginOptions = {}): Plugin[] {
  console.log('[lastVitePlugin] Initializing...');
  console.log('[lastVitePlugin] __dirname:', __dirname);
  console.log('[lastVitePlugin] lastjsPackageDir:', lastjsPackageDir);
  const { appDir = 'app', rootDir = process.cwd() } = options;
  const resolvedAppDir = resolve(rootDir, appDir);
  console.log('[lastVitePlugin] Options:', { appDir: resolvedAppDir, rootDir });

  return [
    // ✅ 官方 RSC 插件（禁用默认 handler，像 Waku 一样）
    rsc({
      serverHandler: false,
    }),
    // ✅ 使用标准 react 插件
    react(),
    envPlugin({ rootDir }),
    serverActionsPlugin({ appDir: resolvedAppDir }),
    // ✅ Main 插件（配置 environments + configureServer）
    lastjsMainPlugin({ appDir: resolvedAppDir, rootDir, lastjsPackageDir }),
    // ✅ 其他虚拟模块（app-config 等）
    lastjsVirtualModulesPlugin({ appDir: resolvedAppDir, rootDir }),
  ];
}

/**
 * Main plugin - Waku style
 * 配置 environments + configureServer hook
 */
function lastjsMainPlugin(opts: {
  appDir: string;
  rootDir: string;
  lastjsPackageDir: string;
}): Plugin {
  console.log('[lastjsMainPlugin] Creating plugin...');
  console.log('[lastjsMainPlugin] lastjsPackageDir:', opts.lastjsPackageDir);
  
  // 使用完整的 entry 文件
  const rscEntryPath = join(opts.lastjsPackageDir, 'src/rsc/entry.rsc.tsx');
  const ssrEntryPath = join(opts.lastjsPackageDir, 'src/rsc/entry.ssr.tsx');
  const clientEntryPath = join(opts.lastjsPackageDir, 'src/rsc/entry.browser.tsx');
  
  console.log('[lastjsMainPlugin] Entry paths:', { rscEntryPath, ssrEntryPath, clientEntryPath });
  
  return {
    name: 'lastjs:main',
    config(): UserConfig {
      console.log('[lastjsMainPlugin] config() hook called');
      return {
        appType: 'custom',
        // ✅ 使用物理 entry 文件路径（不是虚拟模块！）
        environments: {
          rsc: {
            build: {
              rollupOptions: {
                input: {
                  index: rscEntryPath,
                },
              },
            },
          },
          ssr: {
            build: {
              rollupOptions: {
                input: {
                  index: ssrEntryPath,
                },
              },
            },
          },
          client: {
            build: {
              rollupOptions: {
                input: {
                  index: clientEntryPath,
                },
              },
            },
          },
        },
        ssr: {
          external: ['react', 'react-dom', 'react-dom/server'],
          noExternal: [],
        },
        optimizeDeps: {
          include: ['react', 'react-dom', 'react-dom/client'],
        },
        resolve: { alias: { '@app': opts.appDir } },
      };
    },

    configResolved(config) {
      (config as any).__lastjs = opts;
    },

    /**
     * Waku-style configureServer
     * 使用 environment.runner.import 加载物理 entry
     */
    async configureServer(server) {
      console.log('[Last.js] Configuring server...');
      const environment = server.environments.rsc as RunnableDevEnvironment;
      const entryId = (environment.config.build.rollupOptions.input as any)
        .index;

      console.log('[Last.js] RSC Entry ID:', entryId);

      return () => {
        server.middlewares.use(async (req, res, next) => {
          try {
            console.log('[Last.js] Request:', req.method, req.url);
            // Load the physical entry file
            const mod = await environment.runner.import(entryId);
            console.log('[Last.js] Module loaded:', Object.keys(mod));

            // Call the default export (Request handler)
            if (mod.default) {
              const request = new Request(
                new URL(req.url!, `http://${req.headers.host}`),
                {
                  method: req.method,
                  headers: req.headers as any,
                },
              );
              const response = await mod.default(request);

              res.statusCode = response.status;
              response.headers.forEach((value, key) => {
                res.setHeader(key, value);
              });

              if (response.body) {
                const reader = response.body.getReader();
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  res.write(value);
                }
              }
              res.end();
            } else {
              next(new Error('No default export in RSC entry'));
            }
          } catch (e) {
            console.error('[Last.js] Error:', e);
            next(e);
          }
        });
      };
    },
  };
}

function lastjsVirtualModulesPlugin(opts: {
  appDir: string;
  rootDir: string;
}): Plugin {
  return {
    name: 'lastjs:virtual-modules',
    resolveId(id) {
      if (id === 'virtual:lastjs/app-config')
        return '\0virtual:lastjs/app-config';
      return null;
    },
    load(id) {
      if (id === '\0virtual:lastjs/app-config')
        return (
          'export const appDir = ' +
          JSON.stringify(opts.appDir) +
          ';export const rootDir = ' +
          JSON.stringify(opts.rootDir) +
          ';'
        );
      return null;
    },
  };
}

export default lastVitePlugin;
