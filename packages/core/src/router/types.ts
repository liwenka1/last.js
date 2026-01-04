/**
 * 路由类型定义
 */

import type { ComponentType } from 'react';

/**
 * 路由节点类型
 */
export type RouteType = 'static' | 'dynamic' | 'catch-all';

/**
 * 路由节点
 * 表示文件系统中的一个路由段
 */
export interface RouteNode {
  /** 路由段名称（如 'blog', '[slug]', '[...slug]'） */
  segment: string;

  /** 完整路径（如 '/blog', '/blog/[slug]'） */
  path: string;

  /** 路由类型 */
  type: RouteType;

  /** 特殊文件路径 */
  files: {
    /** page.tsx - 页面组件 */
    page?: string;
    /** layout.tsx - 布局组件 */
    layout?: string;
    /** loading.tsx - 加载状态组件 */
    loading?: string;
    /** error.tsx - 错误处理组件 */
    error?: string;
    /** not-found.tsx - 404 页面 */
    notFound?: string;
  };

  /** 子路由节点 */
  children: Map<string, RouteNode>;

  /** 动态路由子节点 [slug] */
  dynamicChild?: RouteNode;

  /** Catch-all 路由子节点 [...slug] */
  catchAllChild?: RouteNode;

  /** 父节点引用 */
  parent?: RouteNode;
}

/**
 * 路由匹配结果
 */
export interface RouteMatch {
  /** 匹配的路由节点 */
  node: RouteNode;

  /** 路由参数 */
  params: Record<string, string>;

  /** 从根到当前节点的路径 */
  segments: RouteSegment[];
}

/**
 * 路由段
 * 表示路由匹配过程中的一个段
 */
export interface RouteSegment {
  /** 路由节点 */
  node: RouteNode;

  /** 该段的参数 */
  params: Record<string, string>;
}

/**
 * 路由模块
 * 从 page.tsx 或 layout.tsx 导入的模块
 */
export interface RouteModule {
  /** 默认导出的组件 */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default?: ComponentType<any>;

  /** 静态 metadata */
  metadata?: Metadata;

  /** 动态 generateMetadata */
  generateMetadata?: (props: {
    params: Record<string, string>;
    searchParams?: Record<string, string | string[]>;
  }) => Promise<Metadata> | Metadata;

  /** 路由段配置 */
  dynamic?: 'auto' | 'force-dynamic' | 'force-static' | 'error';
  revalidate?: number | false;
  runtime?: 'nodejs' | 'edge';
}

/**
 * Metadata 类型
 */
export interface Metadata {
  title?:
    | string
    | {
        default: string;
        template?: string;
      };
  description?: string;
  keywords?: string | string[];
  openGraph?: {
    title?: string;
    description?: string;
    url?: string;
    siteName?: string;
    images?: Array<{
      url: string;
      width?: number;
      height?: number;
      alt?: string;
    }>;
    locale?: string;
    type?: string;
  };
  twitter?: {
    card?: 'summary' | 'summary_large_image' | 'app' | 'player';
    title?: string;
    description?: string;
    images?: string[];
    creator?: string;
  };
  robots?: {
    index?: boolean;
    follow?: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
  icons?: {
    icon?: string;
    shortcut?: string;
    apple?: string;
  };
}

/**
 * 解析后的 Metadata
 */
export interface ResolvedMetadata extends Metadata {
  title?: string;
}
