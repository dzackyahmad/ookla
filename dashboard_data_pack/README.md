# Data Pack — Dashboard Peta Kesenjangan Digital Indonesia

Paket ini berisi data siap pakai untuk membangun dashboard Next.js, dirancang agar bisa langsung dibaca dan dipahami oleh Claude Code.

---

## Isi Folder

```
data/
  dashboard_data_ringan.geojson   -> 6.695 kecamatan, poligon + properti (7 MB)
  daftar_kecamatan_tertinggal_top50_v2.csv -> 50 kecamatan prioritas
reference_preview.html            -> Prototipe HTML yang SUDAH DISETUJUI user (lihat di browser dulu)
```

**Penting:** `reference_preview.html` adalah acuan gaya visual yang sudah dicoba dan disukai user (palet warna, layout, interaksi). Buka file itu dulu di browser sebelum mulai coding — tiru strukturnya, jangan didesain ulang dari nol, tapi tingkatkan kualitasnya (poligon asli, bukan titik pusat).

---

## Skema Data — `dashboard_data_ringan.geojson`

FeatureCollection, tiap feature = satu kecamatan (Polygon/MultiPolygon).

| Properti | Tipe | Isi |
|---|---|---|
| `GID_3` | string | ID unik kecamatan (dari GADM) |
| `kecamatan` | string | Nama kecamatan |
| `kabupaten` | string | Nama kabupaten/kota |
| `provinsi` | string | Nama provinsi |
| `kategori` | string | `"Cukup"` \| `"Jarang"` \| `"Sangat Jarang"` \| `"Tidak Terukur Sama Sekali"` |
| `kecepatan_final` | number | Kecepatan unduh (kbps) — asli kalau ada, atau tebakan model TabPFN kalau kecamatan tidak pernah terukur |
| `tingkat_kepercayaan` | number | 0–1, seberapa bisa dipercaya data kecamatan itu (dari galat model per kategori) |
| `indeks_kesenjangan_final` | number | 0–0.74, indeks final = skor_kesenjangan × tingkat_kepercayaan. **Semakin tinggi = semakin tertinggal.** |

**Jumlah per kategori:** Cukup 6.030 · Jarang 377 · Sangat Jarang 168 · Tidak Terukur Sama Sekali 120.

## Skema Data — `daftar_kecamatan_tertinggal_top50_v2.csv`

50 kecamatan dengan `indeks_kesenjangan_final` tertinggi, **disaring hanya dari kategori "Cukup"** (supaya daftar prioritas ini berbasis data yang benar-benar teruji, bukan kecamatan yang cuma tidak pasti). Kolom: `kecamatan, kabupaten, provinsi, kategori_v2, kecepatan_final, tingkat_kepercayaan, indeks_kesenjangan_final`.

---

## Prinsip Desain yang Wajib Dipertahankan

Ini bukan cuma soal tampilan — beberapa keputusan di bawah adalah kejujuran metodologis penelitian, jangan dihilangkan saat membangun ulang:

1. **Kecamatan kategori "Tidak Terukur Sama Sekali" dan "Sangat Jarang" harus divisualisasikan beda** dari kecamatan "Cukup" (misalnya warna abu-abu / pola garis / opacity lebih rendah) — JANGAN diwarnai dengan skala indeks yang sama seolah-olah datanya sama terpercaya.
2. **Daftar "kecamatan tertinggal" HANYA dari file top50 v2** (yang sudah disaring kategori Cukup). Jangan generate ulang daftar top-N langsung dari `indeks_kesenjangan_final` seluruh dataset tanpa filter kategori — itu akan memunculkan bias yang sudah diperbaiki sebelumnya (kecamatan tidak pasti naik ke puncak daftar).
3. Sebutkan di suatu tempat (footer/tooltip/halaman metodologi) bahwa **kecepatan untuk kecamatan tanpa pengukuran adalah keluaran model (TabPFN), bukan pengukuran langsung.**

---

## Referensi Teknis dari Riset (untuk halaman "Bukti"/"Metodologi" kalau dibangun ulang)

**Perbandingan model** (skenario provinsi disembunyikan total):
| Model | MAE (kbps) | RMSE | R² |
|---|---|---|---|
| Interpolasi (tetangga terdekat) | 5.898 | 7.667 | -0,337 |
| Baseline rata-rata provinsi | 4.758 | 6.661 | -0,009 |
| Kovariat — Random Forest | 4.471 | 6.191 | 0,128 |
| Gabungan | 4.853 | 6.436 | 0,058 |
| **Kovariat — TabPFN (dipakai final)** | **4.410** | **5.983** | **0,186** |

**Grafik kepercayaan** (galat model per kategori kecukupan data):
Sangat Jarang: 15.794 kbps · Jarang: 11.504 kbps · Cukup: 3.987 kbps

**Granularitas yang diuji** (kenapa level kecamatan dipilih):
Ubin (~610m) R²=0,01 · Blok (~4,9km) R²=0,02 · Kecamatan R²=0,13–0,19

**Sumber data:** Ookla Open Data, WorldPop, SRTM (CGIAR), OpenStreetMap, VIIRS (NOAA), GADM.
**Tim:** Muhammad Fachri · Dzacky Ahmad · Arya Rafi Raharjo — GEMASTIK XIX 2026, Divisi III Penambangan Data.

---

## Saran Teknis untuk Claude Code

- Poligon di geojson ini sudah disederhanakan (`simplify` toleransi 0.01°) dan cukup ringan (7MB) untuk dimuat sebagai file statis di `public/data/` pada Next.js — gunakan `fetch()` sisi klien atau `getStaticProps` untuk memuatnya.
- Untuk render peta dengan poligon penuh (bukan titik seperti di prototipe), gunakan **react-leaflet** atau **MapLibre GL** dengan `GeoJSON` layer, `style` function yang membaca `indeks_kesenjangan_final` untuk fill color, dan kategori untuk membedakan hatch/opacity kecamatan tak terukur.
- Kalau 7MB masih terasa berat untuk render browser, pertimbangkan lazy-load per-viewport atau konversi ke vector tiles (mis. tippecanoe → PMTiles) sebagai peningkatan berikutnya — tapi untuk versi pertama, file statis langsung sudah cukup jalan.
