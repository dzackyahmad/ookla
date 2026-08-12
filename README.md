# Peta Kesenjangan Digital Indonesia

Dashboard Next.js (App Router + TypeScript + Tailwind) yang menampilkan **peta choropleth 6.695 kecamatan** Indonesia menurut indeks kesenjangan digital, dibangun di atas MapLibre GL JS (WebGL) dengan poligon administrasi penuh — bukan titik pusat.

Dibangun dari data pack riset GEMASTIK XIX 2026 (Divisi III — Penambangan Data): Muhammad Fachri · Dzacky Ahmad · Arya Rafi Raharjo.

---

## Menjalankan

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # build produksi (wajib lolos sebelum deploy)
npm start        # menjalankan hasil build
```

`npm run dev` dan `npm run build` selalu menjalankan `scripts/prepare-data.mjs` lebih dulu, jadi aset data tidak perlu dibuat manual.

## Deploy ke Vercel

```bash
vercel deploy        # preview
vercel deploy --prod
```

Tanpa konfigurasi tambahan: `vercel.json` sudah mengatur build command dan cache header untuk `/data/*`. Basemap CARTO Positron tidak memerlukan API key, jadi tidak ada environment variable yang harus diisi.

Setelah deploy, verifikasi `https://<domain>/data/dashboard_data_ringan.geojson` mengembalikan `200` — peta bergantung penuh pada berkas statis ini.

---

## Alur data

Berkas di `dashboard_data_pack/` dan `dashboard_extra_data/` adalah **sumber kebenaran dan tidak pernah diubah**. Setiap build, `scripts/prepare-data.mjs` mengolahnya menjadi:

| Keluaran | Isi |
|---|---|
| `public/data/dashboard_data_ringan.geojson` | 6.695 poligon + populasi per kecamatan + kepadatan arsir; koordinat dibulatkan 5 desimal → **6,72 MB → 4,32 MB** (≈0,9 MB setelah gzip) |
| `lib/generated/top50.json` | 50 kecamatan prioritas: alasan urgensi, alasan model, pembanding provinsi/kota, rentang kepercayaan, tetangga baik, tren 2019–2026, centroid, bbox |
| `lib/generated/provinsi.json` | 34 provinsi, terurut dari populasi terdampak tertinggi |
| `lib/generated/stats.json` | jumlah per kategori, persentase, bbox dataset, titik henti skala warna, total populasi |

**Penautan data pendukung** (semuanya diverifikasi saat build):

- `populasi_per_kecamatan.csv` → digabung ke **seluruh 6.695 kecamatan** lewat `GID_3` (cocok 6.695/6.695), bukan hanya 50 prioritas.
- `top50_super_final.csv` → memperkaya daftar prioritas. Build **sengaja gagal** kalau himpunan 50-nya berbeda dari `daftar_kecamatan_tertinggal_top50_v2.csv` atau memuat kategori selain "Cukup" — pagar supaya kolom baru tidak diam-diam mengubah siapa yang masuk daftar.
- `tren_tahunan_top50.csv` → 50/50 cocok; nilai kosong dipertahankan sebagai lubang, tidak diinterpolasi.
- `ringkasan_per_provinsi.csv` → 34/34 nama provinsi cocok dengan geojson. Dicek ulang: `kecamatan_bermasalah` persis sama dengan jumlah kecamatan berkategori "Sangat Jarang" + "Tidak Terukur", dan `populasi_terdampak` sama dengan total penduduk kecamatan itu (cocok di 34/34 provinsi) — definisi itulah yang ditulis di kaki tabel.

Dua folder keluaran itu tidak di-commit (lihat `.gitignore`) — selalu dihasilkan ulang saat build, termasuk di Vercel.

**Tidak ada angka statistik yang di-hardcode.** Kartu "120 / 6.030 / 9,9%", jumlah per kategori, rentang legenda, dan framing awal peta semuanya dibaca dari `stats.json`. Kalau data pack diperbarui, angka-angka itu ikut berubah sendiri.

Penautan CSV top-50 ke poligon dilakukan lewat `kecamatan|kabupaten|provinsi` yang dinormalisasi; saat ini **50/50 entri menemukan pasangannya**, dan build akan memberi peringatan kalau ada yang gagal.

---

## Keputusan yang tidak boleh dibalik tanpa alasan

Tiga hal berikut adalah kejujuran metodologis penelitian, bukan pilihan estetika:

1. **Kategori "Sangat Jarang" dan "Tidak Terukur Sama Sekali" dirender terpisah** — abu-abu dengan pola arsir diagonal (`fill-pattern`) di luar skala warna indeks, pada kedua mode pewarnaan. Datanya terlalu tipis untuk diklaim pasti tertinggal.
2. **Daftar prioritas memakai `daftar_kecamatan_tertinggal_top50_v2.csv` apa adanya** — tidak pernah dihitung ulang dari geojson. Berkas itu sudah disaring ke kategori "Cukup" untuk memperbaiki bias yang membuat kecamatan tidak pasti naik ke puncak.
3. **Kecepatan hasil model dinyatakan sebagai model** — disebut di footer setiap halaman, di halaman Metodologi, dan di dalam popup kecamatan berkategori tidak pasti.

Empat keputusan tampilan lain yang perlu diketahui:

1. Nilai `indeks_kesenjangan_final` berkerumun rapat (kuartil 0,492–0,560 dari rentang 0–0,74), sehingga skala warna linear membuat hampir seluruh peta menjadi satu warna. Titik henti warna karena itu **mengikuti kuantil sebaran nyata** (p5/p25/p50/p75/p95, dihitung saat build); label nilainya diletakkan tepat di posisinya sepanjang gradient bar, jadi kerapatannya ikut terlihat.
2. `tingkat_kepercayaan` hanya punya tiga nilai (0,748 · 0,272 · 0), satu per kategori. Layer ini diwarnai sebagai **kelas diskret**, bukan gradien — legenda tidak menjanjikan gradasi yang tidak ada di data.
3. **`kecepatan_min = 0` tidak pernah ditulis sebagai "0 kbps"** (31 dari 50 kecamatan prioritas mengalaminya). Angka itu berarti rentang ketidakpastian model terlalu lebar, bukan kecepatan nol, jadi ditampilkan sebagai "Rentang terlalu lebar untuk diperkirakan". Aturan yang sama berlaku untuk 145 kecamatan yang WorldPop catat 0 jiwa → "Populasi tidak tercatat". Keduanya dipusatkan di `lib/labels.ts` supaya popup dan panel tidak pernah berbeda.
4. **Sparkline tren bukan sumber angka utama.** `kecepatan_final` adalah agregat lintas tahun, sementara deret tahunannya sangat fluktuatif (Sula Besi Barat: 797 → 14.889 → 1.314 → 644 kbps) dan 34 dari 50 kecamatan punya nilai tahun terakhir di atas angka agregatnya. Sparkline karena itu diberi caption eksplisit, dan ruas yang melompati tahun tanpa pengukuran digambar putus-putus — bukan garis penuh yang mengarang data.

**Palet warna** diperiksa dengan validator ordinal (`ΔL` antar langkah, monotonisitas terang). Versi sebelumnya punya hijau `#CBE0BE` dan kuning `#F2D26B` pada terang yang nyaris sama (ΔL 0,011) — dua kuintil tengah tidak terbedakan di grayscale maupun bagi pembaca buta warna. Langkah disetel ulang ke jarak merata (ΔL ≥ 0,08) tanpa keluar dari keluarga krem–hijau–kuning–oranye–merah yang sudah disetujui. Ramp multi-hue dipertahankan sebagai pengecualian *semantic heat*, yang sah selama ada legenda skala.

---

## Struktur

```
app/
  layout.tsx            shell: font, header, footer
  page.tsx              tab Peta
  bukti/page.tsx        tab Bukti (statis)
  metodologi/page.tsx   tab Metodologi (statis)
  error.tsx             error boundary tingkat rute
components/
  MapDashboard.tsx      state peta + tata letak panel (client)
  MapView.tsx           seluruh logika MapLibre, dynamic import ssr:false
  MapOverlays.tsx       skeleton pemuatan, pesan galat, keadaan kosong
  KecamatanCard.tsx     kartu rasionalisasi 7 lapis (dipakai popup DAN panel)
  Sparkline.tsx         tren tahunan, tahan lubang data
  HowToRead.tsx         panduan "Cara membaca peta ini" + tur contoh
  ProvinceTable.tsx     tabel beban per provinsi
  RankedList.tsx        daftar prioritas + urutan indeks/penduduk
  LayerControl.tsx  CategoryFilter.tsx  Legend.tsx  StatCards.tsx  Header.tsx  Footer.tsx
lib/
  palette.ts            skala warna + expression MapLibre
  labels.ts             aturan tampilan untuk nilai yang menyesatkan kalau ditulis apa adanya
  card.ts               bentuk data tunggal untuk kartu (peta & panel)
  stats.ts  types.ts  format.ts
  generated/            dihasilkan saat build
scripts/prepare-data.mjs
dashboard_data_pack/    sumber, read-only
dashboard_extra_data/   sumber data pendukung, read-only
```

## Catatan teknis

- **MapLibre, bukan Leaflet.** 6.695 poligon dirender WebGL; pan/zoom tetap mulus. `MapView` di-`dynamic import` dengan `ssr: false` karena MapLibre butuh `window`.
- **Filter kategori** memakai `map.setFilter` (expression), bukan fetch ulang data. Mengganti mode warna memakai `setPaintProperty` dengan kedipan opacity singkat, karena MapLibre tidak menganimasikan transisi warna data-driven.
- **Hover dan sorotan** memakai `feature-state`, bukan filter per gerakan mouse — jauh lebih murah pada dataset sebesar ini.
- **Popup dipasang di titik klik**, bukan centroid, supaya tetap akurat untuk kecamatan sangat kecil (banyak di Jawa) pada zoom berapa pun. Klik dari daftar prioritas memakai `fitBounds` ke bbox kecamatan.
- **Pemuatan** memakai streaming reader dengan indikator persentase; ukuran asli diambil dari `stats.json` karena `content-length` berisi ukuran terkompresi di produksi.
- **Pembersihan**: `map.remove()`, `AbortController`, dan `ResizeObserver.disconnect()` dijalankan di cleanup `useEffect`, jadi berpindah tab tidak meninggalkan memory leak.
- **Popup memakai komponen React yang sama** dengan panel (`createRoot` + `setDOMContent`), bukan string HTML terpisah — jadi aturan label tidak bisa menyimpang di salah satu tempat. React root dilepas di luar siklus render agar tidak memicu warning.
- **Garis batas dijaga 0,35–0,5 px sampai zoom terendah** supaya kepulauan kecil (Maluku, NTT, Kepulauan Selayar) tidak menyatu jadi satu gumpalan warna.
- **Opacity arsir menurun mengikuti kepadatan gerombolan** (`arsir_padat`, dihitung saat build dari jumlah tetangga berarsir dalam radius 1,5°), jadi Papua pedalaman dan Kalimantan Utara tidak menenggelamkan kecamatan berdata cukup di sekitarnya — sementara arsir yang berdiri sendiri tetap tegas.
- **Kasus tepi yang diuji**: semua kategori di-uncheck (peta kosong + keterangan, dan daftar prioritas memberi tahu bahwa kategorinya sedang disembunyikan), toggle indeks↔kepercayaan (legenda ikut berganti bentuk, bukan cuma warna), klik pulau sangat kecil, resize jendela saat peta sedang dipan, dan gagal muat geojson (kartu galat + tombol muat ulang).
