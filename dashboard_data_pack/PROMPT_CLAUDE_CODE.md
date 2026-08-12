# Prompt untuk Claude Code — Bangun Dashboard Peta Kesenjangan Digital (Next.js)

Baca `README.md` dan buka `reference_preview.html` di browser lebih dulu sebelum menulis kode apa pun. Prototipe itu sudah disetujui secara visual — pertahankan gaya, warna, dan interaksinya, tapi bangun ulang dengan fondasi yang jauh lebih mapan: peta poligon penuh (bukan titik pusat), performa stabil di seluruh 6.695 kecamatan, dan struktur proyek yang siap production di Vercel.

## Tujuan

Dashboard Next.js (App Router, TypeScript) yang menampilkan peta choropleth interaktif Indonesia — satu poligon per kecamatan, diwarnai menurut `indeks_kesenjangan_final` — lengkap dengan panel kontrol, daftar prioritas, dan dua halaman pendukung (Bukti, Metodologi). Siap `vercel deploy` tanpa konfigurasi tambahan.

## Kenapa perlu mapan, bukan sekadar jalan

Prototipe HTML yang saya lampirkan pakai titik pusat kecamatan karena keterbatasan environment saat itu. Versi ini harus render **poligon asli** dari `data/dashboard_data_ringan.geojson` (6.695 feature, ~7MB) dengan lancar — pan/zoom tidak patah-patah, popup akurat mengikuti bentuk wilayah, dan tidak crash di perangkat menengah maupun mobile.

## Stack yang disarankan

- **Next.js 14+ App Router, TypeScript, Tailwind CSS**
- **MapLibre GL JS** (bukan Leaflet) untuk layer peta utama — render berbasis WebGL jauh lebih stabil untuk poligon sebanyak ini dibanding SVG/Canvas Leaflet. Gunakan `maplibre-gl` langsung atau `react-map-gl` sebagai wrapper.
- Basemap: style CARTO Positron gratis tanpa API key (`https://basemaps.cartocdn.com/gl/positron-gl-style/style.json`), sesuai kredit di prototipe lama.
- **Wajib**: komponen peta di-`dynamic import` dengan `ssr: false` — MapLibre butuh akses `window`, akan gagal di server-side render Next.js kalau tidak.

## Struktur data → styling peta

Baca skema kolom di `README.md`. Terapkan sebagai MapLibre style expression pada layer `fill`:

- `indeks_kesenjangan_final` (0–0.74) → `interpolate` linear ke skala warna krem→hijau muda→kuning→oranye→merah tua (turunkan 5 stop warna dari prototipe, jangan disamakan persis dengan AirGap).
- Kecamatan berkategori `"Sangat Jarang"` atau `"Tidak Terukur Sama Sekali"` → render **terpisah dari skala warna indeks**: abu-abu solid atau pola diagonal (`fill-pattern` dengan hatch SVG), opacity lebih rendah. Ini bukan pilihan estetika — ini kejujuran metodologis penelitian (data terlalu tipis untuk diklaim pasti tertinggal), jangan dihilangkan.
- Garis batas kecamatan (`line` layer) tipis, warna netral, opacity rendah supaya tidak menenggelamkan warna fill saat zoom out.

## Fitur wajib (sesuai prototipe, tingkatkan robustnya)

1. **Toggle layer**: Indeks Kesenjangan ↔ Tingkat Kepercayaan — ganti `fill-color` expression saat toggle, dengan transisi halus (`fill-color-transition`).
2. **Filter kategori** (checkbox 4 kategori) — filter lewat MapLibre `filter` expression pada layer, bukan re-fetch data.
3. **Klik kecamatan** → popup: nama kecamatan/kabupaten/provinsi, kecepatan, kategori, indeks. Popup harus tetap akurat meski kecamatan sangat kecil (banyak terjadi di Jawa) — uji dengan zoom rendah dan tinggi.
4. **Panel kanan**: 50 kecamatan tertinggal dari `data/daftar_kecamatan_tertinggal_top50_v2.csv` — **pakai file ini apa adanya, jangan hitung ulang top-N dari geojson tanpa filter kategori** (lihat catatan bias di README). Klik item → `map.flyTo()` + buka popup kecamatan itu.
5. **Kartu statistik** atas: 120 kecamatan tak terukur, 6.030 kecamatan data terpercaya, 9,9% belum dapat dinilai yakin (hitung otomatis dari geojson saat build, jangan hardcode manual supaya tetap benar kalau datanya diperbarui nanti).
6. **Tab Peta / Bukti / Metodologi** — dua tab terakhir halaman statis, isi dari tabel metrik model dan penjelasan metodologi yang ada di README.

## Kualitas teknis yang wajib dicek sebelum selesai

- **Loading state**: geojson 7MB butuh waktu memuat — tampilkan skeleton/spinner, jangan biarkan peta kosong tanpa keterangan.
- **Error boundary**: kalau fetch geojson gagal, tampilkan pesan jelas, bukan halaman putih.
- **Cleanup**: `map.remove()` di `useEffect` cleanup supaya tidak memory leak saat navigasi antar tab/halaman.
- **Responsif**: di layar sempit, panel kanan (daftar prioritas) boleh disembunyikan atau jadi bottom sheet — jangan menimpa peta.
- **Aksesibilitas dasar**: kontras warna teks di atas panel putih tetap AA, tombol filter/toggle bisa dioperasikan keyboard.
- **Uji kasus tepi**: semua kategori di-uncheck (peta boleh kosong, tapi jangan error), klik kecamatan di pulau sangat kecil, resize window saat peta sedang pan.

## Struktur file yang disarankan

```
app/
  page.tsx                 -> shell: header, tabs, layout panel
  bukti/page.tsx            -> atau section dalam satu halaman, sesuai preferensi
  metodologi/page.tsx
components/
  MapView.tsx               -> dynamic-imported, no SSR, seluruh logic MapLibre
  LayerControl.tsx
  CategoryFilter.tsx
  StatCards.tsx
  RankedList.tsx
  Legend.tsx
lib/
  stats.ts                  -> hitung ringkasan kategori dari geojson saat build/load
public/
  data/
    dashboard_data_ringan.geojson
    daftar_kecamatan_tertinggal_top50_v2.csv
```

## Langkah kerja yang disarankan

1. Inisialisasi proyek, pasang dependensi (`maplibre-gl`, `papaparse` untuk baca CSV di klien atau parse saat build).
2. Bangun `MapView.tsx` dulu sampai poligon tampil dengan warna statis — validasi render sebelum menambah interaktivitas.
3. Tambahkan style expression data-driven (indeks, kategori).
4. Bangun panel kiri/kanan, sambungkan ke state peta.
5. Bangun dua tab statis.
6. Uji build produksi (`next build`) lokal sebelum deploy — MapLibre + SSR sering baru ketahuan bermasalah di build production, bukan di dev server.
7. Deploy ke Vercel, verifikasi geojson termuat dari `/data/` di lingkungan production (bukan cuma localhost).

Kerjakan bertahap, tunjukkan progress tiap tahap besar sebelum lanjut ke tahap berikutnya.
