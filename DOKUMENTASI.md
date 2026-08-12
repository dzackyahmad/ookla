# Dokumentasi Pengerjaan — Dashboard Peta Kesenjangan Digital Indonesia

Catatan lengkap proses pembangunan dashboard: apa yang dikerjakan, kenapa keputusannya diambil, apa yang ditemukan saat pengujian, dan apa yang masih terbuka.

**Proyek:** GEMASTIK XIX 2026, Divisi III — Penambangan Data
**Tim:** Muhammad Fachri · Dzacky Ahmad · Arya Rafi Raharjo
**Status:** build produksi lolos, seluruh skenario uji hijau, siap `vercel deploy`

---

## 1. Ringkasan

Dashboard Next.js yang menampilkan peta choropleth **6.695 kecamatan** Indonesia menurut indeks kesenjangan digital, dengan poligon administrasi penuh di atas MapLibre GL JS (WebGL) — bukan titik pusat seperti prototipe awal.

Pengerjaan berlangsung dalam dua iterasi:

| Iterasi | Cakupan | Hasil |
|---|---|---|
| **v1** | Membangun ulang prototipe HTML jadi Next.js App Router: poligon penuh, panel kontrol, daftar prioritas, dua halaman statis | 4 rute statis, peta siap 1,7–2,7 detik |
| **v2** | Integrasi 4 berkas data baru, kartu rasionalisasi 7 lapis, tabel provinsi, panduan awam, perbaikan skala warna & keterbacaan peta | +6 komponen, +3 modul lib, 3.099 baris kode sumber |

Angka pokok yang dilaporkan dashboard, semuanya dihitung ulang saat build:

- 6.695 kecamatan · 34 provinsi
- 6.030 berdata cukup · 377 jarang · 168 sangat jarang · 120 tidak pernah terukur
- 665 kecamatan (9,9%) di luar kategori "Cukup"
- 283.373.739 jiwa total · 2.399.941 jiwa tinggal di kecamatan berdata sangat tipis

---

## 2. Stack dan alasan pemilihannya

| Komponen | Pilihan | Alasan |
|---|---|---|
| Framework | Next.js 16.3 (App Router) | Rute statis penuh, siap Vercel tanpa konfigurasi |
| Bahasa | TypeScript 5.9 | Skema data punya banyak kolom nullable — tipe menangkap kesalahan yang tidak terlihat saat merender |
| Peta | MapLibre GL JS 5.24 | 6.695 poligon dirender WebGL; Leaflet (SVG/Canvas) patah-patah di jumlah segini |
| Styling | Tailwind 3.4 | Konsisten dengan token warna prototipe yang sudah disetujui |
| Basemap | CARTO Positron | Gratis, tanpa API key, sesuai kredit prototipe |
| Parsing CSV | papaparse (build-time saja) | Tidak ikut ke bundel klien |

**React 19.1 + MapLibre**: komponen peta di-`dynamic import` dengan `ssr: false` karena MapLibre menyentuh `window` saat modul dimuat. Tanpa ini, build produksi gagal saat prerender — dan kegagalannya baru muncul di `next build`, bukan di dev server.

Payload klien: **1,6 MB JS statis total** (chunk terbesar 1.015 KB adalah MapLibre), plus geojson **4,43 MB → 968 KB setelah gzip**.

---

## 3. Alur data

### 3.1 Prinsip

Berkas di `dashboard_data_pack/` dan `dashboard_extra_data/` **tidak pernah diubah**. Semua pengolahan terjadi di `scripts/prepare-data.mjs` (479 baris), yang berjalan otomatis sebelum `dev` dan `build`.

```
dashboard_data_pack/data/
  dashboard_data_ringan.geojson          6.695 poligon + properti
  daftar_kecamatan_tertinggal_top50_v2.csv   daftar prioritas resmi
dashboard_extra_data/
  populasi_per_kecamatan.csv             6.695 baris
  top50_super_final.csv                  50 baris × 19 kolom
  tren_tahunan_top50.csv                 50 baris × 8 tahun
  ringkasan_per_provinsi.csv             34 baris
                    │
                    ▼  scripts/prepare-data.mjs
public/data/dashboard_data_ringan.geojson    4,43 MB (dari 6,72 MB)
lib/generated/top50.json                     47 KB
lib/generated/provinsi.json                  3,4 KB
lib/generated/stats.json                     1,3 KB
```

Dua folder keluaran tidak di-commit — selalu dihasilkan ulang, termasuk di Vercel.

### 3.2 Verifikasi join (dijalankan tiap build)

| Tautan | Kunci | Hasil |
|---|---|---|
| populasi → seluruh kecamatan | `GID_3` | **6.695/6.695** |
| top50_super_final → poligon | `GID_3`, fallback nama | **50/50** |
| tren tahunan → daftar prioritas | `GID_3` | **50/50** |
| ringkasan provinsi → nama provinsi geojson | nama | **34/34** |

### 3.3 Pagar metodologis di pipeline

Build **sengaja digagalkan** (`process.exit(1)`) kalau:

1. `top50_super_final.csv` memuat kecamatan di luar himpunan `top50_v2.csv`
2. jumlah barisnya berbeda dari v2
3. ada baris berkategori selain `"Cukup"`

Alasannya: berkas v2 sudah disaring untuk memperbaiki bias yang membuat kecamatan tidak pasti naik ke puncak daftar. Berkas baru boleh **memperkaya kolom**, tidak boleh mengubah **siapa** yang masuk daftar. Tanpa pagar ini, pergantian berkas sumber bisa diam-diam mengembalikan bias yang sudah diperbaiki.

### 3.4 Optimasi ukuran

Koordinat dibulatkan ke 5 desimal (±1 m). Poligon sumber sudah disederhanakan pada toleransi 0,01° (±1,1 km), jadi presisi 15 desimal aslinya murni pemborosan: **6,72 MB → 4,43 MB**, tanpa perubahan bentuk yang terlihat. Titik kembar hasil pembulatan dibuang, dan ring tetap dijaga tertutup.

### 3.5 Nilai turunan yang dihitung saat build

| Nilai | Dipakai untuk |
|---|---|
| `indeksSkala` (5 kuantil) | titik henti skala warna |
| `kepercayaanKelas` | legenda kelas diskret |
| `bbox` dataset | framing awal peta |
| `arsir_padat` per kecamatan | opacity arsir adaptif |
| `geojsonBytes` | indikator progres pemuatan |
| `provinsiTeratas` | sorotan 3 provinsi teratas |

**Tidak ada angka statistik yang ditulis tangan** di komponen mana pun.

---

## 4. Temuan data yang mengubah desain

Empat temuan dari analisis data sebelum menulis kode, masing-masing mengubah keputusan tampilan:

### 4.1 Indeks berkerumun rapat

Kuartil `indeks_kesenjangan_final` untuk kecamatan berwarna: **p25 = 0,492 · p50 = 0,528 · p75 = 0,560** dari rentang 0–0,74.

Skala warna linear membuat hampir seluruh peta jadi satu blok oranye — terbukti di render pertama. **Solusi:** titik henti mengikuti kuantil sebaran nyata (p5/p25/p50/p75/p95 = 0,262 · 0,492 · 0,528 · 0,560 · 0,621), dan nilainya ditulis apa adanya di legenda.

### 4.2 Tingkat kepercayaan hanya punya tiga nilai

`tingkat_kepercayaan` bukan variabel kontinu: **0,748** (Cukup) · **0,272** (Jarang) · **0** (Sangat Jarang + Tidak Terukur).

Gradien akan menjanjikan gradasi yang tidak ada. **Solusi:** layer ini diwarnai sebagai kelas diskret (`step` expression), legendanya berupa swatch berlabel nilai + jumlah kecamatan.

### 4.3 `kecepatan_min = 0` pada 31 dari 50 kecamatan prioritas

Bukan kecepatan nol — rentang ketidakpastian model memang selebar itu. Menulis "0 kbps" terbaca seperti bug.

**Solusi:** aturan label dipusatkan di `lib/labels.ts` → `"Rentang terlalu lebar untuk diperkirakan (hingga 4,71 Mbps)"`. Aturan sejenis untuk 145 kecamatan yang WorldPop catat 0 jiwa → `"Populasi tidak tercatat"`.

### 4.4 Tren tahunan bukan sumber angka utama

`kecepatan_final` adalah **agregat lintas tahun**, bukan tahun terakhir. Deretnya sangat fluktuatif:

```
Sula Besi Barat:  ·  797   ·  14.889  1.314   644   ·   ·      (kbps)
Segun:            ·   ·    ·   2.903   ·     ·    653   161
```

**34 dari 50** kecamatan punya nilai tahun terakhir di atas angka agregatnya (rasio median 1,24×; maksimum 3,65×). Tanpa penanda, sparkline terbaca sebagai kontradiksi terhadap angka besar di atasnya.

**Solusi:** caption eksplisit di bawah sparkline, dan ruas yang melompati tahun kosong digambar **putus-putus** — bukan garis penuh yang mengarang pengukuran.

---

## 5. Keputusan visualisasi data

Dikerjakan mengikuti prosedur skill `dataviz`: pilih bentuk → tetapkan warna menurut tugasnya → **validasi dengan skrip, bukan dikira-kira** → spesifikasi mark → interaksi → aksesibilitas → render dan lihat hasilnya.

### 5.1 Perbaikan skala warna

Validator ordinal menemukan cacat nyata pada palet lama:

```
[PASS] Lightness monotone
[FAIL] Adjacent ΔL     steps too close: [["#CBE0BE","#F2D26B",0.011]]
```

Hijau `#CBE0BE` (L=0,882) dan kuning `#F2D26B` (L=0,871) praktis sama terangnya — **dua kuintil tengah tidak terbedakan** di grayscale, cetak hitam-putih, maupun bagi pembaca buta warna. Cacat ini jadi fatal begitu legenda memakai 5 kotak solid bersebelahan.

Langkah disetel ulang pada jarak terang merata, tetap di keluarga krem–hijau–kuning–oranye–merah yang sudah disetujui:

| Peran | Lama | Baru | ΔL |
|---|---|---|---|
| krem | `#F4EFE0` | `#F4EEDE` | — |
| hijau muda | `#CBE0BE` | `#C5DDB5` | 0,080 |
| kuning | `#F2D26B` | `#DAB33A` | 0,088 ← dulu **0,011** |
| oranye | `#DE8639` | `#D16D23` | 0,141 |
| merah tua | `#7A1526` | `#7A1526` | 0,259 |

Dua FAIL yang tersisa adalah pengecualian terdokumentasi, bukan cacat:

- **Multi-hue (spread 115°)** — sah sebagai *semantic heat* selama disertai legenda skala, dan palet ini sudah disetujui pengguna dengan instruksi jangan didesain ulang.
- **Kontras ujung terang vs permukaan putih (1,13:1)** — diukur terhadap latar putih; di peta latarnya basemap abu-abu dan tiap poligon punya garis batas. Untuk swatch legenda di panel putih, mitigasinya hairline ring `ring-1 ring-black/10`.

### 5.2 Sparkline tahan lubang data

Datanya bolong: **28 dari 50** kecamatan punya tahun kosong di tengah deret; satu kecamatan (Batangkawa) cuma punya 1 titik.

| Aturan | Implementasi |
|---|---|
| Tidak mengarang data | ruas melompati tahun kosong → garis putus-putus, opacity 0,55 |
| Channel kedua di luar warna | strip ketersediaan: 1 kotak per tahun, terisi vs berongga |
| Penanda periode terkini | titik akhir warna aksen, titik lain abu-abu |
| Titik tetap terbaca | cincin putih 1,2–1,6 px di tiap titik |
| Aksesibilitas | `role="img"` + `aria-label` berisi seluruh nilai dan daftar tahun kosong; `<title>` per titik |
| Satu deret → tanpa kotak legenda | caption yang menyebut apa yang diplot |

Versi compact di baris daftar (52×22 px) mematikan strip ketersediaan — terlalu kecil untuk terbaca, jadi hanya menambah kebisingan.

### 5.3 Legenda kuantil

Tiga bacaan yang saling melengkapi:

1. **Gradient bar** dengan label nilai **tepat di posisinya** — jarak antar label memperlihatkan betapa berdempetnya nilai indeks sebenarnya. Karena empat nilai teratas hampir menempel, labelnya diselang-seling ke dua baris dengan garis penghubung; posisinya tetap jujur, bacanya tetap mungkin.
2. **Lima kotak kuintil** berlabel "20% terendah … tengah … 20% tertinggi" untuk dipindai sekilas.
3. **Kalimat awam** menggantikan istilah teknis: *"Warna dibagi berdasarkan peringkat kecamatan, bukan nilai mentah — supaya perbedaan tetap terlihat meski sebagian besar kecamatan nilainya berdekatan."*

Saat toggle ke Tingkat Kepercayaan, **seluruh bentuk legenda berganti** (gradien → daftar kelas), bukan cuma warna petanya.

---

## 6. Peta

### 6.1 Susunan layer

Semua disisipkan di bawah layer label basemap supaya nama kota tetap terbaca.

| Layer | Tipe | Isi |
|---|---|---|
| `kec-fill` | fill | kategori Cukup + Jarang, warna data-driven menurut mode |
| `kec-uncertain-fill` | fill | abu-abu solid opacity 0,3 |
| `kec-uncertain-hatch` | fill | pola arsir diagonal, opacity adaptif |
| `kec-line` | line | garis batas semua kecamatan |
| `kec-hover` | line | sorotan hover via `feature-state` |
| `kec-selected` | line | sorotan pilihan via `feature-state` |

### 6.2 Keterbacaan kepulauan kecil

Maluku, NTT, dan Kepulauan Selayar terdiri dari banyak kecamatan sangat kecil yang menyatu jadi satu gumpalan warna kalau garis batasnya menghilang di zoom nasional.

```js
'line-width':   ['interpolate', ['linear'], ['zoom'], 3, 0.35, 5, 0.5, 7, 0.7, 10, 1]
'line-opacity': ['interpolate', ['linear'], ['zoom'], 3, 0.42, 5, 0.5, 7, 0.5, 10, 0.55]
```

Garis dijaga 0,35–0,5 px **sampai zoom terendah**, bukan menghilang seperti sebelumnya (0,15 px @ opacity 0,18).

### 6.3 Opacity arsir adaptif

Di Papua pedalaman dan Kalimantan Utara, kecamatan berarsir menggerombol sampai polanya menenggelamkan kecamatan berdata cukup di sekitarnya. Menurunkan opacity secara merata akan melemahkan juga arsir yang berdiri sendiri — padahal justru itu yang perlu tegas.

**Solusi:** `arsir_padat` (0–1) dihitung saat build dari jumlah tetangga berarsir dalam radius 1,5° (±165 km), lalu dipakai sebagai sumbu interpolasi:

```js
'fill-opacity': ['interpolate', ['linear'], ['coalesce', ['get','arsir_padat'], 0],
                 0, 0.78,   0.35, 0.6,   1, 0.42]
```

Arsir soliter tetap 0,78; gerombolan terpadat turun ke 0,42.

### 6.4 Framing awal

`fitBounds` ke bbox nyata dataset dengan padding sadar-panel (316 px kiri / 332 px kanan di desktop), animasi 1.400 ms, hormat `prefers-reduced-motion`. Kamera awal sengaja lebih jauh (zoom 3) supaya gerakannya terasa "mendarat" ke Indonesia.

### 6.5 Performa

| Teknik | Kenapa |
|---|---|
| Filter kategori via `map.setFilter` | tidak fetch ulang 4,4 MB data |
| Hover/sorotan via `feature-state` | `setFilter` per gerakan mouse akan mengevaluasi ulang 6.695 feature |
| Ganti mode via `setPaintProperty` | tidak membangun ulang layer |
| Rotasi dinonaktifkan | hemat GPU, hindari gestur trackpad tak sengaja |
| `ResizeObserver` → `map.resize()` | MapLibre tidak melakukannya sendiri |

Transisi warna data-driven tidak dianimasikan MapLibre, jadi pergantian mode dibuat halus lewat "kedipan" opacity singkat (180 ms) yang menyembunyikan pergantian warna.

---

## 7. Kartu rasionalisasi 7 lapis

Komponen inti v2: `components/KecamatanCard.tsx`.

| Lapis | Isi | Bobot visual |
|---|---|---|
| 1 | Nama + kabupaten/provinsi + jumlah penduduk | `font-display` 16,5 px bold, ink penuh |
| 2 | Kecepatan unduh + rentang kepercayaan | mono 15 px, ink penuh |
| 3 | `alasan_urgensi` — kondisi wilayah | 12,5 px, `#39424E`, leading 1,65 |
| 4 | `alasan_model` — faktor dominan | kotak terpisah + chip "menurut model", 11,5 px muted |
| 5 | % di bawah rata-rata provinsi + jarak kota terdekat | 11,5 px, penanda kecil |
| 6 | Kontras tetangga berdata baik | 11,5 px |
| 7 | Sparkline tren + caption | 10–10,5 px, paling teknis |
| — | Indeks + tingkat kepercayaan | penutup 10,5 px muted |

Hierarki dibawa **ukuran font, warna, dan jarak yang menurun konsisten** — tidak ada lapis yang tampil dengan bobot sama.

### 7.1 Satu komponen, dua tempat

Kartu yang sama dirender di popup peta **dan** panel prioritas. Popup MapLibre menerima DOM, jadi komponen React di-mount ke node lepas:

```tsx
const node = document.createElement('div');
const root = createRoot(node);
root.render(<KecamatanCard data={data} variant="popup" />);
popup.setDOMContent(node);
```

React root dibongkar di luar siklus render (`setTimeout(… , 0)`) supaya tidak memicu warning unmount-saat-render. Konsekuensinya: aturan label (`kecepatan_min = 0`, populasi tidak tercatat) **tidak bisa menyimpang** antara popup dan panel, karena keduanya menjalankan kode yang sama.

### 7.2 Degradasi anggun

Kecamatan di luar 50 prioritas tidak punya kolom alasan/tren. Kartunya menampilkan lapis 1–2 + indeks + kepercayaan, lalu satu baris keterangan: *"Rincian rasionalisasi tersedia untuk 50 kecamatan prioritas."* — bukan lapis kosong tanpa penjelasan.

### 7.3 `alasan_model` yang berulang

Hanya ada 3 kalimat unik untuk 50 kecamatan (aktivitas ekonomi / populasi rendah / akses jalan). Ini valid — satu faktor memang dominan secara nasional — dan ditampilkan apa adanya, tanpa diparafrase agar terlihat bervariasi.

---

## 8. Panel dan navigasi

### 8.1 Panel kanan bertab

Karena isinya bertambah (ranking + provinsi + sparkline + kartu), panel kanan jadi dua tab alih-alih menumpuk vertikal tanpa batas:

- **Prioritas** — 50 kecamatan, dengan pilihan urutan
- **Per Provinsi** — 34 provinsi, terurut populasi terdampak, 3 teratas disorot

### 8.2 Dua cara pandang urgensi

Urutan **Indeks** ↔ **Penduduk** menyusun ulang daftar yang sama (tidak pernah menambah kecamatan). Perbedaannya nyata:

| Kecamatan | Peringkat indeks | Peringkat penduduk | Penduduk |
|---|---|---|---|
| Aru Selatan | #28 | **#1** | 65.645 |
| Bokondini | #3 | #2 | 43.643 |
| Tambelan | #50 | #5 | 32.513 |

### 8.3 Tabel provinsi

Semantik kolom diverifikasi ulang terhadap geojson sebelum dilabeli — **cocok 34/34**:

- `kecamatan_bermasalah` = kecamatan berkategori "Sangat Jarang" + "Tidak Terukur Sama Sekali"
- `populasi_terdampak` = total penduduk kecamatan tersebut

Definisi itu dicetak di kaki tabel, jadi pembaca tidak perlu menebak. Papua mendominasi: 1.882.616 dari 2.399.941 jiwa (78%).

### 8.4 Panduan "Cara membaca peta ini"

Panel collapsible dengan lima penjelasan bahasa awam (apa itu indeks · kenapa ada area berarsir · kenapa sebagian kecepatan perkiraan · beda urutan indeks vs penduduk · contoh terpandu), ditutup tombol yang **benar-benar menuntun**: memindah tab, menyetel urutan, terbang ke poligon Segun, dan membuka kartunya. Bisa ditutup dengan Esc.

---

## 9. Aksesibilitas

| Aspek | Implementasi |
|---|---|
| Kontras teks | seluruh teks ≥ AA; `text-muted` di atas krem `#F1EEE7` hanya 4,17:1 → diganti token `muted-strong` (5,15:1) |
| Keyboard | semua kontrol berupa elemen interaktif asli; fokus terlihat lewat `:focus-visible` |
| Peran ARIA | `radiogroup` untuk mode & urutan, `tablist` untuk tab panel, `role="img"` + label pada sparkline |
| Live region | overlay pemuatan `role="status"`, galat `role="alert"` |
| Gerak | animasi dimatikan pada `prefers-reduced-motion` |
| Identitas non-warna | strip ketersediaan sparkline, pola arsir, label kelas — tidak ada informasi yang hanya dibawa warna |

---

## 10. Bug nyata yang ditemukan lewat pengujian browser

Semuanya ditemukan dengan menjalankan aplikasi di Chrome dan melihat hasilnya, bukan dari membaca kode.

| # | Gejala | Akar masalah | Perbaikan |
|---|---|---|---|
| 1 | Peta kosong, panel normal | `maplibre-gl.css` memaksa `.maplibregl-map { position: relative }`, menimpa `absolute inset-0`; tinggi container jadi 0 | pembungkus absolut + container `h-full w-full` |
| 2 | Indonesia terpotong di ponsel | `minZoom: 3` menjepit hasil `fitBounds`; rentang 46° bujur butuh zoom < 3 di layar 390 px | `minZoom: 2` |
| 3 | Kontrol zoom/atribusi tertimpa panel kiri | panel setinggi 627 px, blok kontrol mulai di 702 px | `lg:max-h-[calc(100%-11rem)]` + pemangkasan teks legenda |
| 4 | Peta jadi satu blok oranye | skala linear pada sebaran yang berkerumun | titik henti kuantil |
| 5 | Dua kuintil tengah tak terbedakan | ΔL hijau→kuning hanya 0,011 | langkah palet disetel ulang |
| 6 | Teks tab non-aktif 4,17:1 (di bawah AA) | `text-muted` di atas latar krem | token `muted-strong` |
| 7 | Kartu tampil ganda di popup dan panel | pemilihan dari daftar membuka keduanya | popup tidak dibuka saat memilih dari daftar |
| 8 | Label legenda bertumpuk jadi `0,4920,5280,5600,621` | posisi jujur pada nilai yang memang berdempetan | selang-seling dua baris + garis penghubung |

Dua "temuan" lain ternyata **artefak skrip uji, bukan bug aplikasi**, dan dicatat supaya tidak salah dikejar lagi:

- `getByRole('alert')` juga cocok dengan route announcer bawaan Next.js
- `locator.click({position})` memakai koordinat relatif kanvas (kanvas mulai di y = 74,5), sehingga klik uji mendarat di laut

---

## 11. Hasil pengujian

Dijalankan dengan Playwright + Chrome pada build produksi.

| Skenario | Hasil |
|---|---|
| Peta siap dimuat | 1,7–2,7 detik |
| Klik poligon → popup kartu penuh | ✅ |
| Pilih dari daftar → kartu di panel, tanpa popup ganda | ✅ |
| Klik ulang menutup kartu | ✅ |
| Urutan indeks ↔ penduduk | ✅ (Aru Selatan naik ke #1) |
| Tab Per Provinsi | ✅ 34 baris |
| Semua kategori dimatikan | ✅ overlay keterangan + daftar prioritas memberi tahu kategorinya disembunyikan |
| Toggle indeks ↔ kepercayaan | ✅ legenda ikut berganti bentuk |
| Esc menutup panduan | ✅ |
| Gagal muat geojson (503) | ✅ kartu galat + tombol muat ulang berhasil pulih |
| 3× bolak-balik antar tab | ✅ tetap 1 kanvas, tidak ada kebocoran |
| Buka/tutup popup 3× di mode dev | ✅ tidak ada root React tersisa |
| Resize jendela saat peta sedang dipan | ✅ |
| Ponsel 390×800 | ✅ bottom sheet, tab, kartu, panduan |
| StrictMode double-mount (dev) | ✅ |
| Konsol & pageerror | **nol di semua skenario** |

---

## 12. Struktur berkas

```
app/
  layout.tsx  page.tsx  error.tsx  globals.css  icon.svg
  bukti/page.tsx  metodologi/page.tsx
components/
  MapDashboard.tsx    231  state peta + tata letak panel
  MapView.tsx         506  seluruh logika MapLibre
  KecamatanCard.tsx   173  kartu 7 lapis (popup + panel)
  RankedList.tsx      171  daftar prioritas + urutan
  Sparkline.tsx       158  tren tahunan tahan lubang
  HowToRead.tsx       157  panduan awam + tur contoh
  Legend.tsx          156  legenda dua bentuk
  ProvinceTable.tsx    99  beban per provinsi
  MapOverlays.tsx      61  skeleton / galat / kosong
  Header · Footer · LayerControl · CategoryFilter · StatCards · ArticlePage
lib/
  palette.ts   111  skala warna + expression MapLibre
  types.ts      98  skema data
  labels.ts     51  aturan tampilan nilai menyesatkan
  stats.ts      40  ringkasan hasil build
  card.ts       37  bentuk data tunggal untuk kartu
  format.ts     15  format angka Indonesia
  generated/        stats.json · top50.json · provinsi.json
scripts/prepare-data.mjs   479
```

Total **3.099 baris** kode sumber.

---

## 13. Deploy

```bash
npm install
npm run build      # menjalankan prepare-data lebih dulu
vercel deploy --prod
```

`vercel.json` sudah mengatur build command dan cache header `/data/*` (`s-maxage=31536000`). Basemap CARTO tidak butuh API key — tidak ada environment variable yang harus diisi.

**Verifikasi setelah deploy:** `https://<domain>/data/dashboard_data_ringan.geojson` harus mengembalikan `200`. Peta bergantung penuh pada berkas statis itu.

---

## 14. Batasan yang diketahui

Hal-hal yang sengaja dibiarkan, beserta alasannya:

1. **GeoJSON dimuat penuh (968 KB gzip).** Cukup untuk versi ini. Kalau perangkat kelas bawah jadi target, langkah berikutnya konversi ke vector tiles (tippecanoe → PMTiles) supaya pemuatan per-viewport.
2. **Berpindah tab memuat ulang peta.** Halaman Bukti/Metodologi adalah rute terpisah, jadi `map.remove()` berjalan dan geojson di-fetch ulang saat kembali (dilayani dari cache browser). Ditukar dengan kebersihan memori — tidak ada instance peta yang menggantung.
3. **Rincian rasionalisasi hanya untuk 50 kecamatan.** Batas datanya, bukan batas UI — kartu sudah siap menerima kolom yang sama untuk kecamatan lain kalau datanya tersedia.
4. **Ujung terang skala warna berkontras rendah di atas putih.** Dimitigasi hairline ring pada swatch legenda; di peta latarnya basemap abu-abu bergaris batas.
5. **`AGENTS.md` dan `CLAUDE.md` di root** dihasilkan otomatis oleh `next dev` (konvensi Next 16), bukan bagian dari proyek.

## 15. Saran langkah berikutnya

| Prioritas | Usulan |
|---|---|
| Tinggi | Uji di perangkat Android kelas menengah sungguhan — WebGL 6.695 poligon adalah bagian paling berisiko |
| Sedang | Tautan permanen per kecamatan (`?kec=GID_3`) agar temuan bisa dibagikan |
| Sedang | Ekspor kartu prioritas ke PDF/PNG untuk lampiran presentasi |
| Rendah | Vector tiles kalau target perangkat diperluas |
| Rendah | Mode gelap — token warna sudah terpusat, tinggal langkah gelapnya divalidasi ulang |
