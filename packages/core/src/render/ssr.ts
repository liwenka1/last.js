import { renderToPipeableStream } from 'react-dom/server';
import type { ReactElement } from 'react';

export interface RenderOptions {
  onShellReady?: () => void;
  onShellError?: (error: unknown) => void;
  onError?: (error: unknown) => void;
}

export function renderToStream(
  element: ReactElement,
  options: RenderOptions = {}
) {
  return renderToPipeableStream(element, {
    onShellReady: options.onShellReady,
    onShellError: options.onShellError,
    onError: options.onError,
  });
}
