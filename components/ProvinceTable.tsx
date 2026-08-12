'use client';

import provinsiRaw from '@/lib/generated/provinsi.json';
import { formatInt } from '@/lib/format';
import { stats } from '@/lib/stats';
import type { ProvinsiRow } from '@/lib/types';

const PROVINSI = provinsiRaw as ProvinsiRow[];

/**
 * Ringkasan per provinsi, terurut dari populasi terdampak tertinggi.
 *
 * "Kecamatan bermasalah" di berkas sumber persis sama dengan kecamatan berkategori
 * "Sangat Jarang" + "Tidak Terukur Sama Sekali" (dicek ulang saat build, cocok di
 * 34/34 provinsi), dan "populasi terdampak" adalah jumlah penduduk kecamatan itu.
 * Definisi itu ditulis apa adanya di bawah tabel supaya angkanya tidak salah dibaca.
 */
export default function ProvinceTable({ className = '' }: { className?: string }) {
  const maks = PROVINSI[0]?.populasi_terdampak ?? 1;

  return (
    <div className={`flex min-h-0 flex-col ${className}`}>
      <div className="border-b border-panel-border px-4 pb-2.5 pt-3">
        <h2 className="font-display text-[14px] font-bold">Beban per provinsi</h2>
        <p className="mt-0.5 text-[11px] leading-[1.45] text-muted">
          {formatInt(stats.populasiTerdampakTotal)} jiwa di {formatInt(stats.kecamatanBermasalahTotal)} kecamatan
          berdata sangat tipis, di {formatInt(stats.provinsiCount)} provinsi
        </p>
      </div>

      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-[11.5px]">
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="border-b border-panel-border">
              <th scope="col" className="px-4 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted">
                Provinsi
              </th>
              <th scope="col" className="px-1 py-1.5 text-right text-[10px] font-semibold uppercase tracking-wide text-muted">
                Kec.
              </th>
              <th scope="col" className="px-1 py-1.5 text-right text-[10px] font-semibold uppercase tracking-wide text-muted">
                Bermsl.
              </th>
              <th scope="col" className="px-4 py-1.5 text-right text-[10px] font-semibold uppercase tracking-wide text-muted">
                Jiwa
              </th>
            </tr>
          </thead>
          <tbody>
            {PROVINSI.map((row, i) => {
              const teratas = i < 3;
              return (
                <tr key={row.provinsi} className={`border-b border-[#F1EFE9] ${teratas ? 'bg-[#FBEFEF]' : ''}`}>
                  <th scope="row" className="max-w-[124px] px-4 py-1.5 text-left font-normal" title={row.provinsi}>
                    <span className="flex items-center gap-1.5">
                      {teratas && (
                        <span className="flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full bg-accent font-mono text-[9px] font-bold text-white">
                          {i + 1}
                        </span>
                      )}
                      <span className={`truncate ${teratas ? 'font-semibold text-accent-dark' : 'text-ink'}`}>
                        {row.provinsi}
                      </span>
                    </span>
                    {/* Batang proporsi: panjang = beban relatif terhadap provinsi tertinggi. */}
                    <span className="mt-1 block h-[3px] w-full overflow-hidden rounded-full bg-[#F1EEE7]">
                      <span
                        className={`block h-full rounded-full ${teratas ? 'bg-accent' : 'bg-[#C7BFAE]'}`}
                        style={{ width: `${Math.max(2, (row.populasi_terdampak / maks) * 100)}%` }}
                      />
                    </span>
                  </th>
                  <td className="px-1 py-1.5 text-right font-mono tabular-nums text-muted">
                    {formatInt(row.jumlah_kecamatan)}
                  </td>
                  <td className="px-1 py-1.5 text-right font-mono tabular-nums text-ink">
                    {formatInt(row.kecamatan_bermasalah)}
                  </td>
                  <td
                    className={`px-4 py-1.5 text-right font-mono tabular-nums ${
                      teratas ? 'font-semibold text-accent-dark' : 'text-ink'
                    }`}
                  >
                    {formatInt(row.populasi_terdampak)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="border-t border-panel-border px-4 py-2 text-[10.5px] leading-[1.45] text-muted">
        <b className="text-ink">Bermsl.</b> = kecamatan berkategori &ldquo;Sangat Jarang&rdquo; atau &ldquo;Tidak
        Terukur&rdquo;. <b className="text-ink">Jiwa</b> = penduduk yang tinggal di kecamatan tersebut.
      </p>
    </div>
  );
}
