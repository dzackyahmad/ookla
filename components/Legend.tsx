'use client';

import {
  INDEKS_SCALE,
  INDEKS_STOPS,
  KEPERCAYAAN_KELAS,
  MODE_META,
  WARNA_TIDAK_PASTI,
  gradientCss,
} from '@/lib/palette';
import { formatIndeks, formatInt, formatPersen } from '@/lib/format';
import { stats } from '@/lib/stats';
import { KATEGORI_TIDAK_PASTI, type Kategori, type LayerMode } from '@/lib/types';

/** Jumlah kecamatan berarsir — beda dari `belumYakin`, yang juga mencakup kategori "Jarang". */
const jumlahBerarsir = KATEGORI_TIDAK_PASTI.reduce((acc, k) => acc + stats.perKategori[k as Kategori], 0);

const LABEL_KUINTIL = ['20% terendah', '20% berikutnya', '20% tengah', '20% berikutnya', '20% tertinggi'];

/**
 * Skala indeks punya dua bacaan yang saling melengkapi:
 *
 *   1. Gradient bar dengan label yang diletakkan TEPAT di posisi nilainya — jadi
 *      jarak antar label memperlihatkan betapa berdempetnya nilai indeks yang
 *      sebenarnya (0,492 · 0,528 · 0,560 hampir menempel).
 *   2. Lima kotak solid berlabel peringkat, untuk dipindai sekilas tanpa membaca angka.
 */
function LegendaIndeks() {
  const min = INDEKS_STOPS[0];
  const max = INDEKS_STOPS[INDEKS_STOPS.length - 1];
  const span = max - min || 1;
  const posisi = (v: number) => ((v - min) / span) * 100;

  return (
    <>
      <div
        className="h-[10px] rounded-[5px] ring-1 ring-inset ring-black/10"
        style={{ background: gradientCss(INDEKS_SCALE) }}
        role="presentation"
      />

      {/* Label duduk tepat di posisi nilainya, bukan dibagi rata — jaraknya yang rapat
          memang isi ceritanya. Karena empat nilai teratas hampir menempel, labelnya
          diselang-seling ke dua baris dengan garis penghubung, bukan ditarik menjauh
          dari titiknya. */}
      <div className="relative mt-[3px] h-[30px]">
        {INDEKS_STOPS.map((v, i) => {
          const p = posisi(v);
          const barisKedua = i % 2 === 1;
          const align =
            i === 0 ? 'translateX(0)' : i === INDEKS_STOPS.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)';
          return (
            <span
              key={v}
              className="absolute top-0 flex flex-col items-center"
              style={{ left: `${p}%`, transform: align }}
            >
              <span
                className="w-px bg-[#C7BFAE]"
                style={{ height: barisKedua ? 16 : 4 }}
                aria-hidden="true"
              />
              <span className="mt-[2px] font-mono text-[9.5px] leading-none text-muted">{formatIndeks(v)}</span>
            </span>
          );
        })}
      </div>

      <ul className="mt-1 flex gap-[3px]" aria-label="Lima kelompok peringkat kecamatan">
        {INDEKS_SCALE.map((warna, i) => (
          <li key={warna} className="flex-1">
            <span
              className="block h-[14px] rounded-[3px] ring-1 ring-inset ring-black/10"
              style={{ background: warna }}
              title={LABEL_KUINTIL[i]}
            />
          </li>
        ))}
      </ul>
      <div className="mt-1 flex justify-between text-[9.5px] leading-none text-muted">
        <span>20% terendah</span>
        <span>tengah</span>
        <span>20% tertinggi</span>
      </div>

      <p className="mt-2 text-[10.5px] leading-[1.5] text-muted">
        Warna dibagi berdasarkan <b className="text-ink">peringkat kecamatan</b>, bukan nilai mentah — supaya perbedaan
        tetap terlihat meski sebagian besar kecamatan nilainya berdekatan. Rentang penuh data:{' '}
        {formatIndeks(stats.indeks.min)}–{formatIndeks(stats.indeks.max)}.
      </p>
    </>
  );
}

/** Kepercayaan hanya punya beberapa nilai diskret — ditampilkan sebagai kelas, bukan gradien. */
function LegendaKepercayaan() {
  return (
    <>
      <ul className="space-y-1.5">
        {KEPERCAYAAN_KELAS.map((kelas) => (
          <li key={kelas.nilai} className="flex items-center gap-2.5 text-[11.5px]">
            <span
              className="h-[13px] w-[22px] shrink-0 rounded-[3px] ring-1 ring-inset ring-black/10"
              style={{ background: kelas.warna }}
            />
            <span className="font-mono text-[11px]">{formatIndeks(kelas.nilai)}</span>
            <span className="truncate text-muted">{kelas.kategori.join(', ')}</span>
            <span className="ml-auto font-mono text-[10.5px] text-muted">{formatInt(kelas.jumlah)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[10.5px] leading-[1.5] text-muted">
        Hanya ada dua nilai kepercayaan pada kecamatan berwarna, jadi ini <b className="text-ink">kelas</b>, bukan
        gradasi — legendanya tidak menjanjikan tingkatan yang tidak ada di datanya.
      </p>
    </>
  );
}

export default function Legend({ mode }: { mode: LayerMode }) {
  const meta = MODE_META[mode];

  return (
    <div>
      <div className="mb-1.5 flex items-baseline gap-1.5">
        <span className="text-[12.5px] font-bold">{meta.judul}</span>
        <span className="text-[10px] text-muted">{mode === 'indeks' ? 'skala peringkat' : 'kelas'}</span>
      </div>

      {/* Seluruh isi legenda ikut berganti saat mode ditoggle, bukan cuma warnanya. */}
      {mode === 'indeks' ? <LegendaIndeks /> : <LegendaKepercayaan />}

      <p className="mt-2 text-[11.5px] leading-[1.55] text-muted">{meta.catatan}</p>

      <div className="mt-2 flex items-start gap-2.5">
        <span
          className="mt-0.5 h-[14px] w-[22px] shrink-0 rounded-[3px] border border-[#8C877D]"
          style={{
            background: `repeating-linear-gradient(-45deg, ${WARNA_TIDAK_PASTI}, ${WARNA_TIDAK_PASTI} 2px, rgba(168,162,158,0.28) 2px, rgba(168,162,158,0.28) 5px)`,
          }}
        />
        <span className="text-[11.5px] leading-[1.5] text-muted">
          Arsir abu-abu ({formatInt(jumlahBerarsir)} kecamatan): <b className="text-ink">Sangat Jarang</b> &amp;{' '}
          <b className="text-ink">Tidak Terukur</b>, di luar skala warna.
        </span>
      </div>

      <div className="mt-2 rounded-lg border border-[#F0D4D4] bg-[#FBEFEF] px-[11px] py-[9px] text-[11.5px] leading-[1.5] text-accent-dark">
        <b>
          {formatInt(stats.belumYakin)} kecamatan ({formatPersen(stats.belumYakinPersen)})
        </b>{' '}
        di luar kategori &ldquo;Cukup&rdquo; — ditandai keraguan lebih tinggi, bukan diklaim pasti tertinggal.
      </div>
    </div>
  );
}
