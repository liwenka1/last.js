'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  type AnchorHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { useRouter } from './hooks.js';

/**
 * Link 组件 Props
 */
export interface LinkProps extends Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  'href'
> {
  /** 目标路径 */
  href: string;
  /** 子元素 */
  children: ReactNode;
  /** 是否预加载，默认 true */
  prefetch?: boolean;
  /** 是否替换历史记录，默认 false */
  replace?: boolean;
  /** 导航后是否滚动到顶部，默认 true */
  scroll?: boolean;
}

/**
 * 判断是否为外部链接
 */
function isExternalUrl(href: string): boolean {
  return (
    /^(https?:)?\/\//.test(href) ||
    href.startsWith('mailto:') ||
    href.startsWith('tel:')
  );
}

/**
 * 判断是否应该使用客户端导航
 */
function shouldUseClientNavigation(
  event: MouseEvent<HTMLAnchorElement>,
  href: string
): boolean {
  // 外部链接使用默认行为
  if (isExternalUrl(href)) return false;

  // 按住修饰键时使用默认行为（新标签页打开等）
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return false;
  }

  // 非左键点击使用默认行为
  if (event.button !== 0) return false;

  // target="_blank" 等使用默认行为
  const target = event.currentTarget.getAttribute('target');
  if (target && target !== '_self') return false;

  return true;
}

/**
 * Link 组件 - 客户端导航链接
 *
 * @example
 * ```tsx
 * import { Link } from 'lastjs/client';
 *
 * // 基础用法
 * <Link href="/about">About</Link>
 *
 * // 禁用预加载
 * <Link href="/blog" prefetch={false}>Blog</Link>
 *
 * // 替换历史记录
 * <Link href="/login" replace>Login</Link>
 *
 * // 不滚动到顶部
 * <Link href="/page2" scroll={false}>Page 2</Link>
 * ```
 */
export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  {
    href,
    children,
    prefetch = true,
    replace = false,
    scroll = true,
    onClick,
    onMouseEnter,
    ...rest
  },
  ref
) {
  const router = useRouter();
  const prefetched = useRef(false);

  // 处理点击事件
  const handleClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      // 先调用用户的 onClick
      onClick?.(event);

      // 如果已经被阻止默认行为，不处理
      if (event.defaultPrevented) return;

      // 判断是否使用客户端导航
      if (shouldUseClientNavigation(event, href)) {
        event.preventDefault();

        // 执行导航
        if (replace) {
          router.replace(href);
        } else {
          router.push(href);
        }

        // 滚动到顶部
        if (scroll) {
          window.scrollTo(0, 0);
        }
      }
    },
    [href, onClick, replace, router, scroll]
  );

  // 鼠标悬停时预加载
  const handleMouseEnter = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      onMouseEnter?.(event);

      if (prefetch && !prefetched.current && !isExternalUrl(href)) {
        prefetched.current = true;
        router.prefetch(href);
      }
    },
    [href, onMouseEnter, prefetch, router]
  );

  // 视口内自动预加载
  useEffect(() => {
    if (!prefetch || prefetched.current || isExternalUrl(href)) return;

    // 使用 IntersectionObserver 检测元素是否进入视口
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !prefetched.current) {
            prefetched.current = true;
            router.prefetch(href);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '200px' } // 提前 200px 开始预加载
    );

    // 获取 DOM 元素
    const element = document.querySelector(`a[href="${href}"]`);
    if (element) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, [href, prefetch, router]);

  return (
    <a
      ref={ref}
      href={href}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      {...rest}
    >
      {children}
    </a>
  );
});

Link.displayName = 'Link';
