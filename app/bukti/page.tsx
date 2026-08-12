import type { Metadata } from 'next';
import ArticlePage from '@/components/ArticlePage';
import { formatInt } from '@/lib/format';
import { stats } from '@/lib/stats';

export const metadata: Metadata = {
  title: 'Bukti — Peta Kesenjangan Digital Indonesia',
  description: 'Perbandingan lima model penaksir kecepatan internet dan grafik kepercayaan per kategori kecukupan data.',
};

const MODEL_ROWS = [
  { model: 'Interpolasi (tetangga terdekat)', mae: '5.898', rmse: '7.667', r2: '-0,337' },
  { model: 'Baseline rata-rata provinsi', mae: '4.758', rmse: '6.661', r2: '-0,009' },
  { model: 'Kovariat — Random Forest', mae: '4.471', rmse: '6.191', r2: '0,128' },
  { model: 'Gabungan', mae: '4.853', rmse: '6.436', r2: '0,058' },
  { model: 'Kovariat — TabPFN', mae: '4.410', rmse: '5.983', r2: '0,186', highlight: true },
];

const GALAT = [
  { nilai: '15.794', label: 'galat (kbps) — Sangat Jarang' },
  { nilai: '11.504', label: 'galat (kbps) — Jarang' },
  { nilai: '3.987', label: 'galat (kbps) — Cukup' },
];

export default function BuktiPage() {
  return (
    <ArticlePage>
      <h2>Bukti — Perbandingan Model</h2>
      <p>
        Lima model diadu pada dua skenario pengujian yang meniru kondisi wilayah terisolasi. Model kovariat berbasis
        TabPFN unggul di semua metrik saat seluruh provinsi disembunyikan penuh dari model — kondisi yang paling
        mendekati wilayah yang benar-benar belum pernah terukur.
      </p>

      <div className="my-4 overflow-x-auto">
        <table className="w-full min-w-[440px] border-collapse text-[13px]">
          <thead>
            <tr>
              {['Model', 'MAE (kbps)', 'RMSE (kbps)', 'R²'].map((h) => (
                <th
                  key={h}
                  scope="col"
                  className="border-b border-panel-border px-2.5 py-2 text-left text-[11.5px] font-semibold uppercase tracking-[0.03em] text-muted"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODEL_ROWS.map((row) => (
              <tr key={row.model} className={row.highlight ? 'font-semibold text-accent' : ''}>
                <td className="border-b border-panel-border px-2.5 py-2">{row.model}</td>
                <td className="border-b border-panel-border px-2.5 py-2 font-mono">{row.mae}</td>
                <td className="border-b border-panel-border px-2.5 py-2 font-mono">{row.rmse}</td>
                <td className="border-b border-panel-border px-2.5 py-2 font-mono">{row.r2}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[12px] text-muted">
        TabPFN dipakai sebagai model final — nilainya yang mengisi kolom kecepatan untuk kecamatan tanpa pengukuran
        langsung.
      </p>

      <h2>Grafik Kepercayaan</h2>
      <p>
        Galat model diukur ulang per kategori kecukupan data. Polanya konsisten: makin sedikit data, makin besar
        kemungkinan tebakan meleset — bukti bahwa model tahu batas keandalannya sendiri. Inilah dasar kolom{' '}
        <b>tingkat kepercayaan</b> yang bisa dilihat sebagai layer tersendiri di peta.
      </p>
      <div className="my-5 flex flex-wrap gap-3.5">
        {GALAT.map((g) => (
          <div key={g.label} className="min-w-[150px] flex-1 rounded-[10px] border border-panel-border bg-white px-[18px] py-3.5">
            <div className="font-display text-[24px] font-bold text-accent">{g.nilai}</div>
            <div className="mt-1 text-[12px] text-muted">{g.label}</div>
          </div>
        ))}
      </div>

      <h2>Kejujuran Metodologis</h2>
      <p>
        Validasi lintas waktu (melatih dari satu tahun, menguji ke tahun berikutnya) menunjukkan selisih yang{' '}
        <b>tidak signifikan secara statistik</b> (p=0,385) karena sampelnya kecil — hal ini dilaporkan apa adanya, bukan
        disembunyikan. Klaim utama penelitian ini bersandar pada uji lintas wilayah dan grafik kepercayaan, yang keduanya
        signifikan dengan sampel besar.
      </p>
      <p>
        Konsekuensinya terlihat langsung di peta: dari {formatInt(stats.total)} kecamatan,{' '}
        <b>{formatInt(stats.belumYakin)}</b> di antaranya tidak masuk kategori &ldquo;Cukup&rdquo;, dan{' '}
        <b>{formatInt(stats.tidakTerukur)}</b> tidak pernah terukur sama sekali. Kecamatan berkategori{' '}
        <b>Sangat Jarang</b> dan <b>Tidak Terukur Sama Sekali</b> dirender dengan arsir abu-abu di luar skala warna
        indeks, dan tidak diikutkan dalam daftar prioritas.
      </p>
    </ArticlePage>
  );
}
