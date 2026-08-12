import { formatInt } from '@/lib/format';
import { stats } from '@/lib/stats';

/**
 * Sparkline tren kecepatan tahunan — satu deret, jadi tanpa kotak legenda:
 * captionnya yang menyebut apa yang diplot.
 *
 * Datanya bolong-bolong (28 dari 50 kecamatan punya tahun kosong di tengah deret),
 * jadi ada dua aturan yang dipegang:
 *   1. Ruas yang melompati tahun kosong digambar putus-putus, bukan garis penuh —
 *      garis penuh akan mengarang pengukuran yang tidak pernah ada.
 *   2. Di bawah plot ada strip ketersediaan: satu kotak per tahun, terisi kalau
 *      terukur dan berongga kalau tidak. Itu channel kedua di luar warna.
 */

const WARNA_GARIS = '#8A8F98';
const WARNA_TERBARU = '#9E1B32';
const WARNA_KOSONG = '#CFCABE';

interface Props {
  /** Satu nilai per tahun pada stats.tahunTren; null = tahun tanpa pengukuran. */
  tren: (number | null)[];
  width?: number;
  height?: number;
  /** Titik akhir lebih besar di kartu, lebih kecil di baris daftar yang padat. */
  compact?: boolean;
  /** Strip ketersediaan per tahun; dimatikan di baris daftar karena terlalu kecil untuk terbaca. */
  showStrip?: boolean;
  className?: string;
}

export default function Sparkline({
  tren,
  width = 132,
  height = 38,
  compact = false,
  showStrip = true,
  className = '',
}: Props) {
  const tahun = stats.tahunTren;
  const titikTerukur = tren
    .map((nilai, i) => ({ nilai, i }))
    .filter((t): t is { nilai: number; i: number } => typeof t.nilai === 'number');

  if (titikTerukur.length === 0) {
    return (
      <div className={`text-[10.5px] text-muted ${className}`}>Tidak ada pengukuran tahunan untuk kecamatan ini.</div>
    );
  }

  const stripH = showStrip ? 5 : 0;
  const stripGap = showStrip ? 4 : 0;
  const plotH = height - stripH - stripGap;
  const padX = compact ? 3 : 4;
  const padY = compact ? 4 : 5;

  const nilai = titikTerukur.map((t) => t.nilai);
  const min = Math.min(...nilai);
  const max = Math.max(...nilai);
  const span = max - min;

  const x = (i: number) => padX + (tren.length === 1 ? 0 : (i / (tren.length - 1)) * (width - padX * 2));
  const y = (v: number) => (span === 0 ? plotH / 2 : plotH - padY - ((v - min) / span) * (plotH - padY * 2));

  // Ruas menyambung dipisahkan dari ruas yang melompati tahun kosong.
  const ruasPenuh: string[] = [];
  const ruasLompat: string[] = [];
  for (let k = 0; k < titikTerukur.length - 1; k++) {
    const a = titikTerukur[k];
    const b = titikTerukur[k + 1];
    const d = `M ${x(a.i)} ${y(a.nilai)} L ${x(b.i)} ${y(b.nilai)}`;
    (b.i - a.i === 1 ? ruasPenuh : ruasLompat).push(d);
  }

  const terakhir = titikTerukur[titikTerukur.length - 1];
  const rTitik = compact ? 2.4 : 3.4;

  const ringkasan = titikTerukur.map((t) => `${tahun[t.i]}: ${formatInt(t.nilai)} kbps`).join(', ');
  const tahunKosong = tren.map((v, i) => (v === null ? tahun[i] : null)).filter(Boolean);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role="img"
      aria-label={`Kecepatan terukur per tahun — ${ringkasan}${
        tahunKosong.length ? `. Tanpa pengukuran: ${tahunKosong.join(', ')}` : ''
      }`}
    >
      {ruasLompat.map((d, i) => (
        <path
          key={`lompat-${i}`}
          d={d}
          fill="none"
          stroke={WARNA_GARIS}
          strokeWidth={compact ? 1.4 : 1.8}
          strokeDasharray="2.5 2.5"
          strokeLinecap="round"
          opacity={0.55}
        />
      ))}
      {ruasPenuh.map((d, i) => (
        <path
          key={`penuh-${i}`}
          d={d}
          fill="none"
          stroke={WARNA_GARIS}
          strokeWidth={compact ? 1.6 : 2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}

      {titikTerukur.map((t) => {
        const akhir = t.i === terakhir.i;
        return (
          <circle
            key={t.i}
            cx={x(t.i)}
            cy={y(t.nilai)}
            r={akhir ? rTitik : rTitik * 0.62}
            fill={akhir ? WARNA_TERBARU : WARNA_GARIS}
            // Cincin sewarna permukaan menjaga titik tetap terbaca saat menimpa garis.
            stroke="#FFFFFF"
            strokeWidth={akhir ? 1.6 : 1.2}
          >
            <title>{`${tahun[t.i]}: ${formatInt(t.nilai)} kbps`}</title>
          </circle>
        );
      })}

      {/* Strip ketersediaan data per tahun */}
      {showStrip && tren.map((v, i) => {
        const w = (width - padX * 2) / tren.length - 1.5;
        const cx = padX + (i * (width - padX * 2)) / tren.length;
        const terukur = typeof v === 'number';
        return (
          <rect
            key={`strip-${i}`}
            x={cx}
            y={height - stripH}
            width={Math.max(2, w)}
            height={stripH}
            rx={1.2}
            fill={terukur ? WARNA_GARIS : 'none'}
            stroke={terukur ? 'none' : WARNA_KOSONG}
            strokeWidth={1}
            opacity={terukur ? 0.8 : 1}
          >
            <title>{terukur ? `${tahun[i]}: ${formatInt(v as number)} kbps` : `${tahun[i]}: tidak ada pengukuran`}</title>
          </rect>
        );
      })}
    </svg>
  );
}
