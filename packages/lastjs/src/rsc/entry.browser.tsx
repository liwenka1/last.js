// Browser Entry - 基于官方 demo
import {
  createFromReadableStream,
  createFromFetch,
  setServerCallback,
  createTemporaryReferenceSet,
  encodeReply,
} from '@vitejs/plugin-rsc/browser';
import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { rscStream } from 'rsc-html-stream/client';

let setPayload: (v: any) => void;

async function main() {
  // 从初始 HTML 中反序列化 RSC stream
  const initialPayload = await createFromReadableStream(rscStream);

  // 浏览器根组件，将 RSC payload 作为状态渲染
  function BrowserRoot(): React.ReactNode {
    const [payload, setPayload_] = React.useState<any>(initialPayload);

    React.useEffect(() => {
      setPayload = (v) => React.startTransition(() => setPayload_(v));
    }, [setPayload_]);

    // 在客户端导航时重新获取/渲染
    React.useEffect(() => {
      return listenNavigation(() => fetchRscPayload());
    }, []);

    return payload;
  }

  // 重新获取 RSC 并触发重新渲染
  async function fetchRscPayload() {
    const renderRequest = createRscRenderRequest(window.location.href);
    const payload = await createFromFetch(fetch(renderRequest));
    setPayload(payload);
  }

  // 注册一个处理器，React 会在 hydration 后调用它来处理 server function 请求
  setServerCallback(async (id, args) => {
    const temporaryReferences = createTemporaryReferenceSet();
    const renderRequest = createRscRenderRequest(window.location.href, {
      id,
      body: await encodeReply(args, { temporaryReferences }),
    });
    const payload = await createFromFetch(fetch(renderRequest), {
      temporaryReferences,
    });
    setPayload(payload);
    return payload;
  });

  // Hydration
  const browserRoot = <BrowserRoot />;
  if ('__NO_HYDRATE' in globalThis) {
    createRoot(document).render(browserRoot);
  } else {
    hydrateRoot(document, browserRoot);
  }

  // 实现 server HMR，在服务器代码更改时触发重新获取/渲染
  if ((import.meta as any).hot) {
    (import.meta as any).hot.on('rsc:update', () => {
      fetchRscPayload();
    });
  }
}

// 创建 RSC 渲染请求
function createRscRenderRequest(
  url: string,
  action?: { id: string; body: string | FormData },
): Request {
  const urlObj = new URL(url, window.location.origin);
  urlObj.searchParams.set('_rsc', '1');

  if (action) {
    return new Request(urlObj.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': typeof action.body === 'string'
          ? 'text/plain'
          : 'multipart/form-data',
        'x-action-id': action.id,
      },
      body: action.body,
    });
  }

  return new Request(urlObj.toString(), {
    headers: {
      Accept: 'text/x-component',
    },
  });
}

// 设置事件拦截以实现客户端导航
function listenNavigation(onNavigation: () => void) {
  window.addEventListener('popstate', onNavigation);

  const oldPushState = window.history.pushState;
  window.history.pushState = function (...args) {
    const res = oldPushState.apply(this, args);
    onNavigation();
    return res;
  };

  const oldReplaceState = window.history.replaceState;
  window.history.replaceState = function (...args) {
    const res = oldReplaceState.apply(this, args);
    onNavigation();
    return res;
  };

  function onClick(e: MouseEvent) {
    const link = (e.target as Element).closest('a');
    if (
      link &&
      link instanceof HTMLAnchorElement &&
      link.href &&
      (!link.target || link.target === '_self') &&
      link.origin === location.origin &&
      !link.hasAttribute('download') &&
      e.button === 0 && // 仅左键点击
      !e.metaKey && // 在新标签页中打开 (mac)
      !e.ctrlKey && // 在新标签页中打开 (windows)
      !e.altKey && // 下载
      !e.shiftKey &&
      !e.defaultPrevented
    ) {
      e.preventDefault();
      history.pushState(null, '', link.href);
    }
  }
  document.addEventListener('click', onClick);

  return () => {
    document.removeEventListener('click', onClick);
    window.removeEventListener('popstate', onNavigation);
    window.history.pushState = oldPushState;
    window.history.replaceState = oldReplaceState;
  };
}

main();

