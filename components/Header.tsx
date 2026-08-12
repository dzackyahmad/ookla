'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/', label: 'Peta' },
  { href: '/bukti', label: 'Bukti' },
  { href: '/metodologi', label: 'Metodologi' },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-panel-border bg-white px-4 py-3 sm:px-6">
      <div className="flex items-center gap-3">
        <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[9px] bg-accent font-display text-[17px] font-bold text-white">
          K
        </div>
        <div>
          <h1 className="font-display text-[15px] font-bold -tracking-[0.01em] sm:text-[16.5px]">
            Peta Kesenjangan Digital Indonesia
          </h1>
          <p className="mt-0.5 hidden text-[12.5px] text-muted sm:block">
            Kecamatan mana yang paling butuh internet terjangkau?
          </p>
        </div>
      </div>

      <nav aria-label="Bagian dashboard" className="flex gap-0.5 rounded-[9px] bg-[#F1EEE7] p-[3px]">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={`rounded-[7px] px-4 py-[7px] text-[13px] font-semibold transition-colors ${
                active ? 'bg-white text-ink shadow-[0_1px_3px_rgba(0,0,0,0.08)]' : 'text-muted-strong hover:text-ink'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
