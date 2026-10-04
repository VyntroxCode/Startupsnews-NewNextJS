'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, ClipboardList, LineChart, Search, Sparkles } from 'lucide-react';

const ITEMS = [
  { href: '/dashboard/funding', label: 'Dashboard', icon: BarChart3 },
  { href: '/dashboard/funding/deals', label: 'All Deals', icon: ClipboardList },
  { href: '/dashboard/funding/market', label: 'Market Analysis', icon: LineChart },
  { href: '/dashboard/funding/search', label: 'Search', icon: Search },
  { href: '/dashboard/funding/ai', label: 'AI Assistant', icon: Sparkles, ai: true },
];

/**
 * The preview's sidebar items (.nav-item), laid out as a tab row inside the reader dashboard.
 * On narrow screens it scrolls sideways (scrollbar hidden) and keeps the active item in view.
 */
export default function FundingSubNav() {
  const pathname = usePathname() || '';
  const activeRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [pathname]);

  return (
    <nav
      aria-label="Funding sections"
      className="box-border flex w-full max-w-full gap-1 overflow-x-auto rounded-xl border border-solid border-fi-line bg-fi-surface p-1.5 shadow-fi [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {ITEMS.map(({ href, label, icon: Icon, ai }) => {
        const active = href === '/dashboard/funding' ? pathname === href : pathname.startsWith(href);
        const cls = ai
          ? active
            ? 'bg-linear-to-br from-fi-ai to-fi-ai-dark text-white visited:text-white'
            : 'bg-fi-ai-light text-fi-ai-dark visited:text-fi-ai-dark hover:bg-[#E7DAFA]'
          : active
            ? 'bg-fi-ink text-white visited:text-white'
            : 'bg-transparent text-fi-ink-soft visited:text-fi-ink-soft hover:bg-fi-bg';
        return (
          <Link
            key={href}
            ref={active ? activeRef : undefined}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-[9px] px-2.5 py-2 text-[13px] font-semibold no-underline sm:gap-2.5 sm:py-[9px] sm:text-[13.5px] ${cls}`}
          >
            <Icon size={16} aria-hidden /> {label}
          </Link>
        );
      })}
    </nav>
  );
}
