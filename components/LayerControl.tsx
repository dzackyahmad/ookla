'use client';

import { MODE_META } from '@/lib/palette';
import type { LayerMode } from '@/lib/types';

const MODES: LayerMode[] = ['indeks', 'kepercayaan'];

export default function LayerControl({
  mode,
  onChange,
}: {
  mode: LayerMode;
  onChange: (mode: LayerMode) => void;
}) {
  return (
    <div>
      <div className="field-label" id="layer-control-label">
        Tampilkan warna berdasarkan
      </div>
      <div role="radiogroup" aria-labelledby="layer-control-label" className="flex gap-0.5 rounded-lg bg-[#F1EEE7] p-[3px]">
        {MODES.map((m) => {
          const active = mode === m;
          return (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(m)}
              className={`flex-1 rounded-md px-1 py-[7px] text-center text-[12px] font-semibold transition-colors ${
                active ? 'bg-white text-ink shadow-[0_1px_3px_rgba(0,0,0,0.08)]' : 'text-muted-strong hover:text-ink'
              }`}
            >
              {MODE_META[m].label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
