'use client';

import { Link, usePathname } from 'lastjs/client';

export function Nav() {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Home', exact: true },
    { href: '/about', label: 'About', exact: true },
    { href: '/blog/hello-world', label: 'Blog', exact: false }, // 匹配所有 /blog/* 路径
  ];

  // 判断链接是否激活
  const isActive = (href: string, exact: boolean) => {
    if (exact) {
      return pathname === href;
    }
    // 前缀匹配：提取基础路径 (e.g., /blog/hello-world -> /blog)
    const basePath = href.split('/').slice(0, 2).join('/');
    return pathname === href || pathname.startsWith(basePath + '/');
  };

  return (
    <nav>
      {links.map(({ href, label, exact }) => {
        const active = isActive(href, exact);
        return (
          <Link
            key={href}
            href={href}
            style={{
              marginRight: '1.5rem',
              textDecoration: 'none',
              color: active ? '#e00' : '#0070f3',
              fontWeight: active ? 700 : 500,
            }}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
