"use client";

import Link from "next/link";

export interface BreadcrumbItem {
  label: string;
  href: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export default function Breadcrumbs({ items, className = "" }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex items-center gap-1.5 text-sm">
        <li>
          <Link
            href="/"
            className="font-mono text-xs transition-colors hover:text-[var(--accent)]"
            style={{ color: "var(--text-3)" }}
          >
            Home
          </Link>
        </li>
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1.5">
            <span style={{ color: "var(--text-faint)" }}>/</span>
            {i === items.length - 1 ? (
              <span className="font-mono text-xs" style={{ color: "var(--text)" }}>
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="font-mono text-xs transition-colors hover:text-[var(--accent)]"
                style={{ color: "var(--text-3)" }}
              >
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
