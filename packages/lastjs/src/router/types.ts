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

  /** 页面文件路径 */
  filePath: string;
}

/**
 * 路由模块
 * 从 page.tsx 或 layout.tsx 导入的模块
 */
export interface RouteModule {
  /** 默认导出的组件 */
  default?: ComponentType<Record<string, unknown>>;

  /** 静态 metadata */
  metadata?: Metadata;

  /** 动态 generateMetadata */
  generateMetadata?: (props: {
    params: Record<string, string>;
    searchParams?: Record<string, string | string[]>;
  }) => Promise<Metadata> | Metadata;

  /** 标记页面只能在服务端渲染（包含 async 组件或服务端专属代码） */
  serverOnly?: boolean;
}

/**
 * Metadata 类型
 */
export interface Metadata {
  /** 页面标题 */
  title?:
    | string
    | {
        default: string;
        template?: string;
      };
  /** 页面描述 */
  description?: string;
  /** 关键词 */
  keywords?: string | string[];
  /** 作者 */
  author?: string;
  /** 规范 URL */
  canonical?: string;
  /** 语言 */
  lang?: string;
  /** 视口设置 */
  viewport?: string;
  /** 主题颜色 */
  themeColor?: string;
  /** PWA Manifest */
  manifest?: string;
  /** Open Graph 元数据 */
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
  /** Twitter Card 元数据 */
  twitter?: {
    card?: 'summary' | 'summary_large_image' | 'app' | 'player';
    title?: string;
    description?: string;
    images?: string[];
    creator?: string;
    site?: string;
  };
  /** 搜索引擎爬虫指令 */
  robots?: {
    index?: boolean;
    follow?: boolean;
    [key: string]: boolean | string | undefined;
  };
  /** 图标 */
  icons?: {
    icon?: string | string[];
    shortcut?: string;
    apple?: string | string[];
    other?: Array<{
      rel: string;
      url: string;
      sizes?: string;
      type?: string;
    }>;
  };
  /** 多语言/备用链接 */
  alternates?: {
    canonical?: string;
    languages?: Record<string, string>;
    media?: Record<string, string>;
  };
  /** 网站验证 */
  verification?: {
    google?: string;
    bing?: string;
    yandex?: string;
    other?: Record<string, string>;
  };
}
