/**
 * NotFoundError - 用于触发 404 页面的特殊错误
 */
export class NotFoundError extends Error {
  public readonly digest = 'NEXT_NOT_FOUND';

  constructor() {
    super('NEXT_NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

/**
 * 触发 404 页面渲染
 * 可在页面组件中调用，当数据不存在时显示 not-found 页面
 *
 * @example
 * ```tsx
 * import { notFound } from 'lastjs/navigation';
 *
 * export default async function Page({ params }) {
 *   const post = await getPost(params.slug);
 *   if (!post) {
 *     notFound();
 *   }
 *   return <div>{post.title}</div>;
 * }
 * ```
 */
export function notFound(): never {
  throw new NotFoundError();
}

/**
 * 检查错误是否为 NotFoundError
 */
export function isNotFoundError(error: unknown): error is NotFoundError {
  return (
    error instanceof NotFoundError ||
    (error instanceof Error && error.message === 'NEXT_NOT_FOUND')
  );
}
