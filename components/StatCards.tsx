import { formatInt, formatPersen } from '@/lib/format';
import { stats } from '@/lib/stats';

/** Semua angka berasal dari lib/generated/stats.json — dihitung ulang dari geojson tiap build. */
const CARDS = [
  { value: formatInt(stats.tidakTerukur), label: 'kecamatan belum pernah terukur', warn: true },
  { value: formatInt(stats.dataTerpercaya), label: 'kecamatan data terpercaya', warn: false },
  { value: formatPersen(stats.belumYakinPersen), label: 'belum dapat dinilai yakin', warn: true },
];

export default function StatCards() {
  return (
    <div className="flex gap-2.5">
      {CARDS.map((card) => (
        <div key={card.label} className="flex-1 rounded-[11px] border border-panel-border bg-panel px-2.5 py-[11px] text-center shadow-card">
          <div className={`font-display text-[19px] font-bold leading-[1.1] ${card.warn ? 'text-accent' : 'text-ink'}`}>
            {card.value}
          </div>
          <div className="mt-1.5 text-[10px] leading-[1.35] text-muted">{card.label}</div>
        </div>
      ))}
    </div>
  );
}
