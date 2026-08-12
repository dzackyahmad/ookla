import Sparkline from './Sparkline';
import type { CardData } from '@/lib/card';
import { formatIndeks, formatInt, formatKecepatan } from '@/lib/format';
import { labelDibawahProvinsi, labelJarakKota, labelPopulasi, labelRentangKecepatan } from '@/lib/labels';
import { WARNA_KATEGORI } from '@/lib/palette';
import { isTidakPasti } from '@/lib/types';
import { stats } from '@/lib/stats';

/**
 * Kartu rasionalisasi berlapis — tujuh lapis, dari yang paling menggugah ke
 * paling teknis. Hierarkinya dibawa ukuran font, warna, dan jarak yang menurun
 * konsisten; tidak ada lapis yang tampil dengan bobot sama.
 *
 *   1 nama + lokasi + penduduk   font terbesar, ink penuh
 *   2 kecepatan + rentang        angka mono, masih ink penuh
 *   3 alasan_urgensi             kalimat kondisi wilayah
 *   4 alasan_model               kotak terpisah, ditandai "menurut model"
 *   5 pembanding provinsi/kota   baris kecil
 *   6 kontras tetangga baik      baris kecil
 *   7 sparkline tren             paling kecil, paling teknis
 *
 * Kecamatan di luar 50 prioritas hanya punya lapis 1-2; sisanya diganti satu
 * baris keterangan, bukan dibiarkan kosong.
 */

const Layer = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`border-t border-[#F0EDE6] pt-2.5 ${className}`}>{children}</div>
);

export default function KecamatanCard({ data, variant = 'panel' }: { data: CardData; variant?: 'panel' | 'popup' }) {
  const d = data.detail;
  const tidakPasti = isTidakPasti(data.kategori);
  const populasi = labelPopulasi(data.populasi);
  const rentang = d ? labelRentangKecepatan(d.kecepatan_min, d.kecepatan_max) : null;
  const bandingProvinsi = d ? labelDibawahProvinsi(d.persen_dibawah_provinsi, d.rata_rata_provinsi) : null;
  const jarakKota = d ? labelJarakKota(d.kota_terdekat, d.jarak_kota_km) : null;
  const lebar = variant === 'popup' ? 'w-[286px]' : 'w-full';

  return (
    <div className={`${lebar} space-y-2.5`}>
      {/* --- Lapis 1: identitas + penduduk ---------------------------------- */}
      <div>
        <div className="flex items-start gap-2">
          {data.rank !== null && (
            <span className="mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-accent font-mono text-[11px] font-bold text-white">
              {data.rank}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-[16.5px] font-bold leading-tight text-ink">{data.kecamatan}</h3>
            <p className="mt-0.5 text-[11.5px] text-muted">
              {data.kabupaten}, {data.provinsi}
            </p>
          </div>
          <span
            className="mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-white"
            style={{ background: WARNA_KATEGORI[data.kategori] }}
          >
            {data.kategori}
          </span>
        </div>
        <p className={`mt-1.5 text-[12.5px] font-semibold ${populasi.tercatat ? 'text-ink' : 'italic text-muted'}`}>
          {populasi.teks}
        </p>
      </div>

      {/* --- Lapis 2: kecepatan + rentang kepercayaan ------------------------ */}
      <Layer>
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[11px] text-muted">Kecepatan unduh</span>
          <span className="font-mono text-[15px] font-semibold text-ink">{formatKecepatan(data.kecepatan_final)}</span>
        </div>
        {rentang && (
          <p className={`mt-1 text-[11px] leading-[1.5] ${rentang.terlaluLebar ? 'text-accent-dark' : 'text-muted'}`}>
            Rentang kepercayaan: {rentang.teks}
          </p>
        )}
      </Layer>

      {/* --- Lapis 3: kondisi wilayah ---------------------------------------- */}
      {d?.alasan_urgensi && (
        <Layer>
          <p className="text-[12.5px] leading-[1.65] text-[#39424E]">{d.alasan_urgensi}</p>
        </Layer>
      )}

      {/* --- Lapis 4: faktor dominan menurut model --------------------------- */}
      {d?.alasan_model && (
        <Layer>
          <div className="rounded-lg border border-[#E6E1D6] bg-[#F8F6F1] px-2.5 py-2">
            <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-[#EDE8DD] px-1.5 py-[1px] text-[9px] font-semibold uppercase tracking-wide text-[#6A6255]">
              <svg width="9" height="9" viewBox="0 0 12 12" aria-hidden="true" fill="currentColor">
                <path d="M6 1.2 1.4 3.6v3.1c0 2 1.9 3.5 4.6 4.1 2.7-.6 4.6-2.1 4.6-4.1V3.6L6 1.2Zm0 1.5 3.3 1.7v2.3c0 1.3-1.2 2.4-3.3 2.9-2.1-.5-3.3-1.6-3.3-2.9V4.4L6 2.7Z" />
              </svg>
              menurut model
            </span>
            <p className="text-[11.5px] leading-[1.6] text-[#5C6472]">{d.alasan_model}</p>
          </div>
        </Layer>
      )}

      {/* --- Lapis 5: pembanding lokal -------------------------------------- */}
      {(bandingProvinsi || jarakKota) && (
        <Layer className="space-y-1">
          {bandingProvinsi && (
            <p className="text-[11.5px] leading-[1.5] text-[#39424E]">
              <span className="mr-1 text-accent">▾</span>
              {bandingProvinsi}
            </p>
          )}
          {jarakKota && (
            <p className="text-[11.5px] leading-[1.5] text-muted">
              <span className="mr-1">◍</span>
              {jarakKota}
            </p>
          )}
        </Layer>
      )}

      {/* --- Lapis 6: kontras dengan tetangga berdata baik ------------------- */}
      {d?.tetangga_baik_nama && d.tetangga_baik_kecepatan !== null && d.tetangga_baik_jarak_km !== null && (
        <Layer>
          <p className="text-[11.5px] leading-[1.55] text-[#39424E]">
            Hanya <b className="font-semibold">{formatInt(d.tetangga_baik_jarak_km)} km</b> dari sini, kecamatan{' '}
            <b className="font-semibold">{d.tetangga_baik_nama}</b> sudah mencapai{' '}
            <b className="font-mono font-semibold text-accent-dark">{formatKecepatan(d.tetangga_baik_kecepatan)}</b>.
          </p>
        </Layer>
      )}

      {/* --- Lapis 7: tren tahunan ------------------------------------------ */}
      {d?.tren && d.tren.some((v) => v !== null) && (
        <Layer>
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <span className="text-[10.5px] font-semibold text-muted">
              Pengukuran per tahun {stats.tahunTren[0]}–{stats.tahunTren[stats.tahunTren.length - 1]}
            </span>
          </div>
          <Sparkline tren={d.tren} width={variant === 'popup' ? 262 : 244} height={40} />
          <p className="mt-1 text-[10px] leading-[1.45] text-muted">
            Kotak berongga = tahun tanpa pengukuran; ruas putus-putus melompati tahun itu. Nilai tahunan berfluktuasi
            tajam dan berbeda dari angka gabungan di atas.
          </p>
        </Layer>
      )}

      {/* --- Penutup teknis -------------------------------------------------- */}
      <Layer className="flex items-baseline justify-between gap-3 text-[10.5px] text-muted">
        <span>Indeks kesenjangan</span>
        <span className="font-mono text-ink">{formatIndeks(data.indeks_kesenjangan_final)}</span>
      </Layer>
      {data.tingkat_kepercayaan !== null && (
        <div className="flex items-baseline justify-between gap-3 text-[10.5px] text-muted">
          <span>Tingkat kepercayaan</span>
          <span className="font-mono text-ink">{formatIndeks(data.tingkat_kepercayaan)}</span>
        </div>
      )}

      {tidakPasti && (
        <p className="rounded-lg border border-[#F0D4D4] bg-[#FBEFEF] px-2.5 py-2 text-[10.5px] leading-[1.5] text-accent-dark">
          Pengukuran di kecamatan ini terlalu tipis. Angka kecepatannya berasal dari model (TabPFN), bukan pengukuran
          langsung — jangan dibaca sebagai kepastian.
        </p>
      )}
      {!d && !tidakPasti && (
        <p className="text-[10.5px] leading-[1.5] text-muted">
          Rincian rasionalisasi (kondisi wilayah, faktor model, pembanding, tren) tersedia untuk{' '}
          {formatInt(stats.top50Count)} kecamatan prioritas.
        </p>
      )}
    </div>
  );
}
