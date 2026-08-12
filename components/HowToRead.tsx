'use client';

import { useEffect, useRef, useState } from 'react';
import { formatInt } from '@/lib/format';
import { stats } from '@/lib/stats';

/** Kecamatan contoh yang dituntun langkah demi langkah di panduan. */
const CONTOH_GID = 'IDN.22.8.19_1'; // Segun, Sorong, Papua Barat

const LANGKAH = [
  'Namanya, kabupatennya, dan berapa orang yang tinggal di sana.',
  'Kecepatan unduhnya — plus rentang kepercayaan, yang di sini terlalu lebar untuk diperkirakan.',
  'Kondisi wilayahnya: akses jalan dan aktivitas ekonomi yang minim.',
  'Faktor yang paling menekan kecepatan menurut model — ditandai supaya jelas ini kesimpulan statistik.',
  'Pembanding: berapa persen di bawah rata-rata provinsinya, dan sejauh apa dari kota terdekat.',
  'Kontras: tetangga yang jauh lebih cepat, hanya puluhan kilometer dari sana.',
  'Tren tahunannya, lengkap dengan tahun-tahun yang tidak pernah terukur.',
];

export default function HowToRead({ onSorotContoh }: { onSorotContoh: (gid: string) => void }) {
  const [terbuka, setTerbuka] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Esc menutup panduan; panduan menutupi sebagian peta jadi harus mudah dilepas.
  useEffect(() => {
    if (!terbuka) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTerbuka(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [terbuka]);

  return (
    <>
      <button
        type="button"
        onClick={() => setTerbuka((v) => !v)}
        aria-expanded={terbuka}
        aria-controls="panduan-membaca"
        className="pointer-events-auto flex items-center gap-1.5 rounded-lg border border-panel-border bg-white px-3 py-2 text-[12px] font-semibold text-ink shadow-card transition-colors hover:bg-[#FBF8F3]"
      >
        <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="8" cy="8" r="6.4" />
          <path d="M6.4 6.2a1.7 1.7 0 1 1 2.3 1.6c-.5.2-.7.6-.7 1.1v.3" strokeLinecap="round" />
          <circle cx="8" cy="11.4" r=".75" fill="currentColor" stroke="none" />
        </svg>
        {terbuka ? (
          'Tutup panduan'
        ) : (
          <>
            <span className="hidden sm:inline">Cara membaca peta ini</span>
            <span className="sm:hidden">Panduan</span>
          </>
        )}
      </button>

      {terbuka && (
        <div
          id="panduan-membaca"
          ref={panelRef}
          role="region"
          aria-label="Cara membaca peta ini"
          className="thin-scroll pointer-events-auto mt-2 max-h-[min(72vh,560px)] w-[min(360px,calc(100vw-1.5rem))] overflow-y-auto rounded-xl border border-panel-border bg-panel p-4 shadow-panel"
        >
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-display text-[15px] font-bold">Cara membaca peta ini</h2>
            <button
              type="button"
              onClick={() => setTerbuka(false)}
              className="-mr-1 -mt-1 rounded p-1 text-muted transition-colors hover:text-accent"
              aria-label="Tutup panduan"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                <path d="M3 3l8 8M11 3l-8 8" />
              </svg>
            </button>
          </div>

          <dl className="mt-3 space-y-3.5">
            <div>
              <dt className="text-[12.5px] font-semibold text-ink">Apa itu &ldquo;indeks kesenjangan&rdquo;?</dt>
              <dd className="mt-1 text-[12px] leading-[1.6] text-[#39424E]">
                Ukuran seberapa jauh internet di satu kecamatan tertinggal dibanding daerah lain. Makin tinggi angkanya,
                makin besar ketertinggalannya.
              </dd>
            </div>

            <div>
              <dt className="text-[12.5px] font-semibold text-ink">Kenapa ada area bergaris abu-abu?</dt>
              <dd className="mt-1 text-[12px] leading-[1.6] text-[#39424E]">
                Di {formatInt(stats.perKategori['Sangat Jarang'] + stats.perKategori['Tidak Terukur Sama Sekali'])}{' '}
                kecamatan itu, pengukurannya terlalu sedikit untuk kami simpulkan dengan yakin. Kami memilih bilang
                &ldquo;tidak yakin&rdquo; secara terbuka, bukan menyembunyikan masalahnya — dan bukan pula mengklaim
                mereka pasti tertinggal.
              </dd>
            </div>

            <div>
              <dt className="text-[12.5px] font-semibold text-ink">
                Kenapa sebagian kecepatan &ldquo;perkiraan&rdquo;, bukan &ldquo;terukur&rdquo;?
              </dt>
              <dd className="mt-1 text-[12px] leading-[1.6] text-[#39424E]">
                {formatInt(stats.tidakTerukur)} kecamatan tidak pernah punya satu pun hasil tes kecepatan. Untuk wilayah
                itu, komputer menebak angkanya dari ciri-ciri daerah sekitar — kepadatan penduduk, jalan, dan cahaya
                malam. Tebakan yang beralasan, tapi tetap tebakan.
              </dd>
            </div>

            <div>
              <dt className="text-[12.5px] font-semibold text-ink">
                Bedanya urutan &ldquo;Indeks&rdquo; dan &ldquo;Penduduk&rdquo;?
              </dt>
              <dd className="mt-1 text-[12px] leading-[1.6] text-[#39424E]">
                Dua cara pandang urgensi. <b>Indeks</b> menaruh kecamatan yang paling parah di atas, walau penduduknya
                sedikit. <b>Penduduk</b> menaruh yang paling banyak orangnya di atas, karena satu perbaikan di sana
                menyentuh lebih banyak jiwa. Keduanya benar — tergantung apa yang sedang Anda putuskan.
              </dd>
            </div>

            <div>
              <dt className="text-[12.5px] font-semibold text-ink">Coba satu contoh</dt>
              <dd className="mt-1 text-[12px] leading-[1.6] text-[#39424E]">
                Klik tombol di bawah untuk membuka <b>Segun</b> di Papua Barat, kecamatan peringkat 1. Kartunya akan
                terbuka di panel kanan dengan tujuh lapis informasi, dari atas ke bawah:
                <ol className="mt-2 space-y-1 pl-0">
                  {LANGKAH.map((teks, i) => (
                    <li key={i} className="flex gap-2 text-[11.5px] leading-[1.5]">
                      <span className="mt-[1px] flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full bg-[#EDE8DD] font-mono text-[9px] font-bold text-[#6A6255]">
                        {i + 1}
                      </span>
                      <span>{teks}</span>
                    </li>
                  ))}
                </ol>
                <span className="mt-2 block">
                  Ketujuhnya menjawab satu pertanyaan: kenapa kecamatan ini layak diprioritaskan.
                </span>
              </dd>
            </div>
          </dl>

          <button
            type="button"
            onClick={() => {
              onSorotContoh(CONTOH_GID);
              setTerbuka(false);
            }}
            className="mt-3.5 w-full rounded-lg bg-accent px-3.5 py-2.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-accent-dark"
          >
            Tuntun saya ke Segun, Papua Barat
          </button>
        </div>
      )}
    </>
  );
}
