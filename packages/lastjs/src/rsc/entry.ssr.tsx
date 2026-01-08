// SSR Entry - 基于官方 demo
import { createFromReadableStream } from '@vitejs/plugin-rsc/ssr';
import React from 'react';
import { renderToReadableStream } from 'react-dom/server.edge';
import { injectRSCPayload } from 'rsc-html-stream/server';

export interface RenderHTMLOptions {
  nonce?: string;
}

export async function renderHTML(
  rscStream: ReadableStream<Uint8Array>,
  options?: RenderHTMLOptions,
): Promise<{ stream: ReadableStream<Uint8Array>; status?: number }> {
  // 将 RSC stream 分成两个：一个用于 SSR，一个用于浏览器 hydration
  const [rscStream1, rscStream2] = rscStream.tee();

  // 反序列化 RSC stream 为 React VDOM
  let payload: Promise<any> | undefined;
  function SsrRoot() {
    // 反序列化必须在 ReactDOMServer 上下文中启动
    // 才能让 ReactDomServer preinit/preloading 工作
    payload ??= createFromReadableStream(rscStream1);
    return React.use(payload);
  }

  // 获取客户端启动脚本
  const bootstrapScriptContent =
    await import.meta.viteRsc.loadBootstrapScriptContent('index');
  
  let htmlStream: ReadableStream<Uint8Array>;
  let status: number | undefined;
  
  try {
    htmlStream = await renderToReadableStream(<SsrRoot />, {
      bootstrapScriptContent,
      nonce: options?.nonce,
    });
  } catch (e) {
    // 降级到渲染空壳，在浏览器上运行纯 CSR
    // 可以重放服务器组件错误并触发 error boundary
    status = 500;
    htmlStream = await renderToReadableStream(
      <html>
        <body>
          <noscript>Internal Server Error: SSR failed</noscript>
        </body>
      </html>,
      {
        bootstrapScriptContent: `self.__NO_HYDRATE=1;${bootstrapScriptContent}`,
        nonce: options?.nonce,
      },
    );
  }

  // 将初始 RSC stream 注入到 HTML stream 中
  // 作为 <script>...FLIGHT_DATA...</script>
  const responseStream = htmlStream.pipeThrough(
    injectRSCPayload(rscStream2, {
      nonce: options?.nonce,
    }),
  );

  return { stream: responseStream, status };
}
