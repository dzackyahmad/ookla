'use client';

import { LABEL_KATEGORI_PENDEK, WARNA_KATEGORI } from '@/lib/palette';
import { formatInt } from '@/lib/format';
import { stats } from '@/lib/stats';
import { KATEGORI_LIST, type Kategori } from '@/lib/types';

export default function CategoryFilter({
  active,
  onToggle,
}: {
  active: Kategori[];
  onToggle: (kategori: Kategori, checked: boolean) => void;
}) {
  return (
    <fieldset className="border-0 p-0">
      <legend className="field-label">Kategori kecukupan data</legend>
      {KATEGORI_LIST.map((kategori) => (
        <label key={kategori} className="flex cursor-pointer items-center gap-2.5 py-1 text-[13px]">
          <input
            type="checkbox"
            checked={active.includes(kategori)}
            onChange={(e) => onToggle(kategori, e.target.checked)}
            className="h-[15px] w-[15px] cursor-pointer accent-accent"
          />
          <span className="h-[9px] w-[9px] shrink-0 rounded-full" style={{ background: WARNA_KATEGORI[kategori] }} />
          <span>{LABEL_KATEGORI_PENDEK[kategori]}</span>
          <span className="ml-auto font-mono text-[11.5px] text-muted">{formatInt(stats.perKategori[kategori])}</span>
        </label>
      ))}
    </fieldset>
  );
}
