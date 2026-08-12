import type { Metadata } from 'next';
import ArticlePage from '@/components/ArticlePage';
import { formatInt, formatPersen } from '@/lib/format';
import { stats } from '@/lib/stats';
import { KATEGORI_LIST } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Metodologi — Peta Kesenjangan Digital Indonesia',
  description: 'Alur kerja, pemilihan granularitas kecamatan, penyusunan indeks kesenjangan, dan sumber data.',
};

export default function MetodologiPage() {
  return (
    <ArticlePage>
      <h2>Alur Kerja</h2>
      <p>
        Data kecepatan internet partisipatif (Ookla Open Data, 2019–2026) ditautkan ke {formatInt(stats.total)} kecamatan
        Indonesia. Empat kovariat wilayah — kepadatan penduduk, topografi, kerapatan jalan, dan intensitas cahaya malam —
        dihimpun untuk menaksir kualitas jaringan di kecamatan yang tidak pernah terukur.
      </p>

      <h2>Kenapa Level Kecamatan?</h2>
      <p>
        Tiga granularitas diuji sebelum memutuskan: level ubin (±610 m) menghasilkan R²=0,01, level blok (±4,9 km)
        R²=0,02, dan level kecamatan R²=0,13–0,19. Kecamatan dipilih bukan sebagai default, melainkan satuan yang teruji
        paling sesuai dengan fitur kovariat yang tersedia.
      </p>

      <h2>Menyusun Indeks</h2>
      <p>
        Indeks kesenjangan dihitung dari perkalian dua komponen: skor kesenjangan kecepatan (dinormalisasi 0–1) dan
        tingkat kepercayaan data (diturunkan dari galat model per kategori kecukupan data). Perkalian — bukan
        penjumlahan — memastikan kecamatan berdata sangat tipis tidak otomatis naik ke puncak daftar prioritas hanya
        karena tidak pasti.
      </p>

      <h2>Kategori Kecukupan Data</h2>
      <p>
        Tiap kecamatan digolongkan menurut banyaknya pengukuran yang tersedia. Penggolongan ini menentukan cara wilayah
        itu diwarnai di peta dan boleh-tidaknya masuk daftar prioritas.
      </p>
      <div className="my-4 overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-[13px]">
          <thead>
            <tr>
              {['Kategori', 'Jumlah kecamatan', 'Perlakuan di peta'].map((h) => (
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
            {KATEGORI_LIST.map((k) => {
              const tidakPasti = stats.kategoriTidakPasti.includes(k);
              return (
                <tr key={k}>
                  <td className="border-b border-panel-border px-2.5 py-2">{k}</td>
                  <td className="border-b border-panel-border px-2.5 py-2 font-mono">
                    {formatInt(stats.perKategori[k])}
                  </td>
                  <td className="border-b border-panel-border px-2.5 py-2">
                    {tidakPasti ? 'Arsir abu-abu, di luar skala indeks' : 'Diwarnai menurut skala indeks'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p>
        Total <b>{formatInt(stats.belumYakin)} kecamatan ({formatPersen(stats.belumYakinPersen)})</b> berada di luar
        kategori &ldquo;Cukup&rdquo;. Angka-angka pada halaman ini dan pada kartu statistik di peta dihitung ulang
        langsung dari berkas geojson setiap kali dashboard dibangun, jadi ikut berubah kalau datanya diperbarui.
      </p>

      <h2>Batas yang Perlu Dibaca Jujur</h2>
      <p>
        Kecepatan untuk kecamatan tanpa pengukuran adalah <b>keluaran model (TabPFN)</b>, bukan hasil pengukuran
        langsung. Untuk {formatInt(stats.tidakTerukur)} kecamatan berkategori &ldquo;Tidak Terukur Sama Sekali&rdquo;,
        seluruh nilai kecepatannya berasal dari model. Popup kecamatan pada kategori tersebut menyertakan peringatan yang
        sama, supaya angka itu tidak terbaca sebagai kepastian di mana pun ia muncul.
      </p>
      <p>
        Batas administrasi disederhanakan pada toleransi 0,01° agar peta tetap ringan; bentuk poligon pada zoom tinggi
        karena itu tidak setepat berkas GADM aslinya, tetapi tidak memengaruhi nilai indeks kecamatan mana pun.
      </p>

      <h2>Sumber Data</h2>
      <p>Ookla Open Data · WorldPop · SRTM (CGIAR) · OpenStreetMap · VIIRS (NOAA) · GADM untuk batas administrasi.</p>
      <p className="mt-4 text-[12.5px] text-muted">
        Disusun oleh Muhammad Fachri, Dzacky Ahmad, dan Arya Rafi Raharjo — GEMASTIK XIX 2026, Divisi III Penambangan
        Data.
      </p>
    </ArticlePage>
  );
}
