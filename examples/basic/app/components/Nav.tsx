'use client';

import { Link, usePathname } from 'lastjs/client';

export function Nav() {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' },
    { href: '/blog/hello-world', label: 'Blog' },
  ];

  return (
    <nav>
      {links.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          style={{
            marginRight: '1.5rem',
            textDecoration: 'none',
            color: pathname === href ? '#e00' : '#0070f3',
            fontWeight: pathname === href ? 700 : 500,
          }}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
