/**
 * Menyiapkan aset data statis untuk dashboard.
 *
 * Sumber (read-only, tidak pernah dimodifikasi):
 *   dashboard_data_pack/data/dashboard_data_ringan.geojson
 *   dashboard_data_pack/data/daftar_kecamatan_tertinggal_top50_v2.csv
 *
 * Keluaran:
 *   public/data/dashboard_data_ringan.geojson  -> koordinat dibulatkan (jauh lebih ringan)
 *   lib/generated/top50.json                   -> daftar prioritas + bbox/centroid untuk flyTo
 *   lib/generated/stats.json                   -> ringkasan statistik, dihitung ulang tiap build
 *
 * Dijalankan otomatis lewat `npm run dev` / `npm run build`, jadi angka kartu statistik
 * selalu ikut berubah kalau data pack diperbarui (tidak ada angka yang di-hardcode).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Papa from 'papaparse';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = path.join(ROOT, 'dashboard_data_pack', 'data');
const OUT_PUBLIC = path.join(ROOT, 'public', 'data');
const OUT_LIB = path.join(ROOT, 'lib', 'generated');

const SRC_GEOJSON = path.join(SRC_DIR, 'dashboard_data_ringan.geojson');
const SRC_CSV = path.join(SRC_DIR, 'daftar_kecamatan_tertinggal_top50_v2.csv');

/** Data pendukung tambahan (populasi, alasan, tren, ringkasan provinsi). */
const SRC_EXTRA = path.join(ROOT, 'dashboard_extra_data');
const SRC_POPULASI = path.join(SRC_EXTRA, 'populasi_per_kecamatan.csv');
const SRC_TOP50_SUPER = path.join(SRC_EXTRA, 'top50_super_final.csv');
const SRC_TREN = path.join(SRC_EXTRA, 'tren_tahunan_top50.csv');
const SRC_PROVINSI = path.join(SRC_EXTRA, 'ringkasan_per_provinsi.csv');

export const TAHUN_TREN = [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];

/** Poligon sumber sudah disederhanakan pada toleransi 0.01° (~1,1 km),
 *  jadi 5 desimal (~1 m) tidak menghilangkan detail apa pun. */
const COORD_PRECISION = 5;

const KATEGORI_URUT = ['Cukup', 'Jarang', 'Sangat Jarang', 'Tidak Terukur Sama Sekali'];
/** Kategori yang datanya terlalu tipis untuk diklaim pasti — divisualkan terpisah dari skala indeks. */
const KATEGORI_TIDAK_PASTI = ['Sangat Jarang', 'Tidak Terukur Sama Sekali'];

function fail(message) {
  console.error(`\n[prepare-data] GAGAL: ${message}\n`);
  process.exit(1);
}

function round(n) {
  return Number(n.toFixed(COORD_PRECISION));
}

/** Bulatkan ring dan buang titik kembar berurutan yang muncul akibat pembulatan. */
function roundRing(ring) {
  const out = [];
  for (const pt of ring) {
    const p = [round(pt[0]), round(pt[1])];
    const prev = out[out.length - 1];
    if (prev && prev[0] === p[0] && prev[1] === p[1]) continue;
    out.push(p);
  }
  // Ring poligon harus tertutup; jangan sampai rusak karena dedupe.
  if (out.length >= 3) {
    const first = out[0];
    const last = out[out.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) out.push([first[0], first[1]]);
  }
  return out.length >= 4 ? out : ring.map((pt) => [round(pt[0]), round(pt[1])]);
}

function roundGeometry(geometry) {
  if (!geometry) return geometry;
  if (geometry.type === 'Polygon') {
    return { type: 'Polygon', coordinates: geometry.coordinates.map(roundRing) };
  }
  if (geometry.type === 'MultiPolygon') {
    return {
      type: 'MultiPolygon',
      coordinates: geometry.coordinates.map((poly) => poly.map(roundRing)),
    };
  }
  return geometry;
}

/** Semua ring luar dari sebuah geometry (ring pertama tiap poligon). */
function outerRings(geometry) {
  if (!geometry) return [];
  if (geometry.type === 'Polygon') return [geometry.coordinates[0]].filter(Boolean);
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.map((p) => p[0]).filter(Boolean);
  return [];
}

function ringArea(ring) {
  let area = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    area += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
  }
  return Math.abs(area / 2);
}

/** Titik wakil untuk popup: centroid ring terbesar (bukan bbox center, supaya tetap di darat). */
function representativePoint(geometry) {
  const rings = outerRings(geometry);
  if (rings.length === 0) return null;
  let best = rings[0];
  let bestArea = ringArea(rings[0]);
  for (const ring of rings.slice(1)) {
    const a = ringArea(ring);
    if (a > bestArea) {
      best = ring;
      bestArea = a;
    }
  }
  let twiceArea = 0;
  let x = 0;
  let y = 0;
  for (let i = 0, j = best.length - 1; i < best.length; j = i++) {
    const f = best[j][0] * best[i][1] - best[i][0] * best[j][1];
    twiceArea += f;
    x += (best[j][0] + best[i][0]) * f;
    y += (best[j][1] + best[i][1]) * f;
  }
  if (Math.abs(twiceArea) < 1e-12) {
    // Poligon degenerate (sangat kecil) — pakai rata-rata titik.
    const sum = best.reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1]], [0, 0]);
    return [sum[0] / best.length, sum[1] / best.length];
  }
  const f = twiceArea * 3;
  return [x / f, y / f];
}

function bboxOf(geometry) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const ring of outerRings(geometry)) {
    for (const [lng, lat] of ring) {
      if (lng < minX) minX = lng;
      if (lat < minY) minY = lat;
      if (lng > maxX) maxX = lng;
      if (lat > maxY) maxY = lat;
    }
  }
  return Number.isFinite(minX) ? [minX, minY, maxX, maxY].map(round) : null;
}

const norm = (s) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

// ---------------------------------------------------------------- geojson

for (const p of [SRC_GEOJSON, SRC_CSV, SRC_POPULASI, SRC_TOP50_SUPER, SRC_TREN, SRC_PROVINSI]) {
  if (!fs.existsSync(p)) fail(`file sumber tidak ditemukan: ${p}`);
}

/** Baca CSV berheader jadi array objek, gagal keras kalau formatnya rusak. */
function readCsv(file) {
  const parsed = Papa.parse(fs.readFileSync(file, 'utf8').trim(), {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });
  if (parsed.errors.length) fail(`${path.basename(file)} gagal diparsing: ${parsed.errors[0].message}`);
  if (parsed.data.length === 0) fail(`${path.basename(file)} kosong`);
  return parsed.data;
}

// Populasi ditautkan ke SEMUA kecamatan lewat GID_3, bukan hanya 50 prioritas.
const populasiByGid = new Map(
  readCsv(SRC_POPULASI).map((r) => [r.GID_3, Math.round(Number(r.populasi))])
);

const srcRaw = fs.readFileSync(SRC_GEOJSON, 'utf8');
const src = JSON.parse(srcRaw);
if (src.type !== 'FeatureCollection' || !Array.isArray(src.features)) {
  fail('geojson sumber bukan FeatureCollection yang valid');
}

const perKategori = Object.fromEntries(KATEGORI_URUT.map((k) => [k, 0]));
let indeksMin = Infinity;
let indeksMax = -Infinity;
let kepercayaanMin = Infinity;
let kepercayaanMax = -Infinity;
let populasiTotal = 0;
let tanpaPopulasi = 0;
const byKey = new Map();
const byGid = new Map();

const features = src.features.map((f, i) => {
  const p = f.properties ?? {};
  const kategori = p.kategori;
  if (!(kategori in perKategori)) {
    fail(`kategori tak dikenal "${kategori}" pada feature #${i} (${p.GID_3})`);
  }
  perKategori[kategori] += 1;

  const indeks = Number(p.indeks_kesenjangan_final);
  const trust = Number(p.tingkat_kepercayaan);
  if (Number.isFinite(indeks)) {
    indeksMin = Math.min(indeksMin, indeks);
    indeksMax = Math.max(indeksMax, indeks);
  }
  if (Number.isFinite(trust)) {
    kepercayaanMin = Math.min(kepercayaanMin, trust);
    kepercayaanMax = Math.max(kepercayaanMax, trust);
  }

  // WorldPop memberi 0 untuk sebagian kecamatan; disimpan apa adanya dan
  // ditampilkan sebagai "tidak tercatat", bukan angka "0 jiwa" yang menyesatkan.
  const populasi = populasiByGid.get(p.GID_3);
  if (populasi === undefined) tanpaPopulasi += 1;
  else populasiTotal += populasi;

  const geometry = roundGeometry(f.geometry);
  const out = {
    type: 'Feature',
    // id numerik dipakai MapLibre feature-state (hover/selected) tanpa re-render sumber.
    id: i,
    properties: {
      GID_3: p.GID_3,
      kecamatan: p.kecamatan,
      kabupaten: p.kabupaten,
      provinsi: p.provinsi,
      kategori,
      kecepatan_final: Number(Number(p.kecepatan_final).toFixed(1)),
      tingkat_kepercayaan: Number(trust.toFixed(4)),
      indeks_kesenjangan_final: Number(indeks.toFixed(4)),
      populasi: populasi ?? null,
    },
    geometry,
  };

  byKey.set(`${norm(p.kecamatan)}|${norm(p.kabupaten)}|${norm(p.provinsi)}`, { index: i, feature: out });
  byGid.set(p.GID_3, { index: i, feature: out });
  return out;
});

if (tanpaPopulasi > 0) {
  console.warn(`[prepare-data] peringatan: ${tanpaPopulasi} kecamatan tidak menemukan data populasi`);
}

const outGeojson = { type: 'FeatureCollection', features };

/** Bbox seluruh dataset — dipakai peta untuk framing awal, ikut menyesuaikan kalau data berubah. */
const bboxSemua = features.reduce(
  (acc, f) => {
    const b = bboxOf(f.geometry);
    if (!b) return acc;
    return [Math.min(acc[0], b[0]), Math.min(acc[1], b[1]), Math.max(acc[2], b[2]), Math.max(acc[3], b[3])];
  },
  [Infinity, Infinity, -Infinity, -Infinity]
).map(round);

// ------------------------------------------------- kepadatan area berarsir

/**
 * Di Papua pedalaman dan Kalimantan Utara, kecamatan berarsir menggerombol sampai
 * polanya menenggelamkan kecamatan berdata cukup di sekitarnya. Kepadatan tetangga
 * dihitung sekali di sini, lalu dipakai peta untuk menurunkan opacity arsir di
 * gerombolan terpadat — bukan menurunkannya rata di seluruh Indonesia.
 */
const RADIUS_PADAT = 1.5; // derajat (~165 km di khatulistiwa)
const berarsir = features
  .filter((f) => KATEGORI_TIDAK_PASTI.includes(f.properties.kategori))
  .map((f) => ({ f, c: representativePoint(f.geometry) }))
  .filter((x) => x.c);

let tetanggaMaks = 0;
const jumlahTetangga = berarsir.map(({ c }) => {
  let n = 0;
  for (const other of berarsir) {
    if (other.c === c) continue;
    if (Math.hypot(other.c[0] - c[0], other.c[1] - c[1]) <= RADIUS_PADAT) n += 1;
  }
  if (n > tetanggaMaks) tetanggaMaks = n;
  return n;
});
berarsir.forEach(({ f }, i) => {
  f.properties.arsir_padat = tetanggaMaks > 0 ? Number((jumlahTetangga[i] / tetanggaMaks).toFixed(3)) : 0;
});

// ---------------------------------------------------------------- top 50

const v2Rows = readCsv(SRC_CSV);
const superRows = readCsv(SRC_TOP50_SUPER);
const trenByGid = new Map(readCsv(SRC_TREN).map((r) => [r.GID_3, r]));

/**
 * Pagar metodologis: daftar prioritas harus tetap persis himpunan yang sudah disaring
 * ke kategori "Cukup" di v2. top50_super_final hanya boleh memperkaya kolomnya, tidak
 * boleh mengubah siapa yang masuk daftar — kalau berubah, build sengaja digagalkan.
 */
if (superRows.length !== v2Rows.length) {
  fail(`top50_super_final punya ${superRows.length} baris, v2 punya ${v2Rows.length} — daftar prioritas berubah`);
}
const kunci = (r) => `${norm(r.kecamatan)}|${norm(r.kabupaten)}|${norm(r.provinsi)}`;
const v2Keys = new Set(v2Rows.map(kunci));
const bedaHimpunan = superRows.filter((r) => !v2Keys.has(kunci(r))).map((r) => r.kecamatan);
if (bedaHimpunan.length) {
  fail(`top50_super_final memuat kecamatan di luar daftar v2: ${bedaHimpunan.join(', ')}`);
}
const bukanCukup = superRows.filter((r) => r.kategori_v2 !== 'Cukup').map((r) => r.kecamatan);
if (bukanCukup.length) {
  fail(`daftar prioritas memuat kategori selain "Cukup": ${bukanCukup.join(', ')}`);
}

let tanpaGeometry = 0;
let tanpaTren = 0;
const top50 = superRows.map((row, i) => {
  const match = byGid.get(row.GID_3) ?? byKey.get(kunci(row));
  if (!match) tanpaGeometry += 1;
  const geometry = match?.feature.geometry;
  const trenRow = trenByGid.get(row.GID_3);
  if (!trenRow) tanpaTren += 1;

  return {
    rank: i + 1,
    kecamatan: row.kecamatan,
    kabupaten: row.kabupaten,
    provinsi: row.provinsi,
    kategori: row.kategori_v2,
    kecepatan_final: Number(Number(row.kecepatan_final).toFixed(1)),
    indeks_kesenjangan_final: Number(Number(row.indeks_kesenjangan_final).toFixed(4)),
    tingkat_kepercayaan: match?.feature.properties.tingkat_kepercayaan ?? null,
    populasi: populasiByGid.get(row.GID_3) ?? null,

    // Kalimat siap-tampil dari data asli — disalin apa adanya, tidak diparafrase.
    alasan_urgensi: row.alasan_urgensi ?? null,
    alasan_model: row.alasan_model ?? null,

    kota_terdekat: row.kota_terdekat ?? null,
    jarak_kota_km: Number.isFinite(row.jarak_kota_km) ? row.jarak_kota_km : null,
    rata_rata_provinsi: Number.isFinite(row.rata_rata_provinsi) ? Math.round(row.rata_rata_provinsi) : null,
    persen_dibawah_provinsi: Number.isFinite(row.persen_dibawah_provinsi) ? row.persen_dibawah_provinsi : null,

    // Rentang kepercayaan. Batas bawah 0 berarti "rentangnya terlalu lebar", bukan
    // benar-benar nol — penanganannya di lapisan tampilan (lihat lib/labels.ts).
    kecepatan_min: Number.isFinite(row.kecepatan_min) ? row.kecepatan_min : null,
    kecepatan_max: Number.isFinite(row.kecepatan_max) ? row.kecepatan_max : null,

    tetangga_baik_nama: row.tetangga_baik_nama ?? null,
    tetangga_baik_kecepatan: Number.isFinite(row.tetangga_baik_kecepatan) ? row.tetangga_baik_kecepatan : null,
    tetangga_baik_jarak_km: Number.isFinite(row.tetangga_baik_jarak_km) ? row.tetangga_baik_jarak_km : null,

    // Deret per tahun; null = tahun tanpa pengukuran, dipertahankan sebagai lubang.
    tren: trenRow ? TAHUN_TREN.map((y) => (Number.isFinite(trenRow[`kbps_${y}`]) ? trenRow[`kbps_${y}`] : null)) : null,

    GID_3: match?.feature.properties.GID_3 ?? row.GID_3 ?? null,
    featureId: match?.index ?? null,
    center: geometry ? representativePoint(geometry)?.map(round) ?? null : null,
    bbox: geometry ? bboxOf(geometry) : null,
  };
});

if (top50.length === 0) fail('daftar top50 kosong');
if (tanpaGeometry > 0) {
  console.warn(`[prepare-data] peringatan: ${tanpaGeometry}/${top50.length} entri top50 tidak menemukan poligon pasangannya`);
}
if (tanpaTren > 0) {
  console.warn(`[prepare-data] peringatan: ${tanpaTren}/${top50.length} entri top50 tidak punya data tren tahunan`);
}

// ---------------------------------------------------------------- provinsi

const provinsiGeo = new Set(features.map((f) => f.properties.provinsi));
const provinsi = readCsv(SRC_PROVINSI)
  .map((r) => ({
    provinsi: r.provinsi,
    jumlah_kecamatan: Number(r.jumlah_kecamatan),
    kecamatan_bermasalah: Number(r.kecamatan_bermasalah),
    populasi_terdampak: Number(r.populasi_terdampak),
  }))
  .sort((a, b) => b.populasi_terdampak - a.populasi_terdampak);

const provinsiAsing = provinsi.filter((r) => !provinsiGeo.has(r.provinsi)).map((r) => r.provinsi);
if (provinsiAsing.length) {
  console.warn(`[prepare-data] peringatan: provinsi tidak dikenal di geojson: ${provinsiAsing.join(', ')}`);
}

// ---------------------------------------------------------------- statistik

const total = features.length;

/**
 * Nilai indeks sangat berkerumun (kuartil 0,49–0,56), jadi skala warna linear 0–0,74
 * membuat hampir seluruh peta jadi satu warna. Titik henti diambil dari kuantil sebaran
 * nyata supaya perbedaan antar kecamatan benar-benar terlihat; nilai tiap titik henti
 * ditampilkan apa adanya di legenda.
 *
 * Hanya kecamatan yang memang diwarnai skala indeks (kategori "Cukup" dan "Jarang")
 * yang ikut dihitung — yang berarsir tidak diwarnai skala ini.
 */
const nilaiIndeksTerwarnai = features
  .filter((f) => !KATEGORI_TIDAK_PASTI.includes(f.properties.kategori))
  .map((f) => f.properties.indeks_kesenjangan_final)
  .sort((a, b) => a - b);

const kuantil = (p) => nilaiIndeksTerwarnai[Math.floor((nilaiIndeksTerwarnai.length - 1) * p)];
const indeksBreaks = [0.05, 0.25, 0.5, 0.75, 0.95].map((p) => Number(kuantil(p).toFixed(4)));
// Titik henti wajib menaik; kalau sebaran terlalu seragam, jatuhkan ke pembagian linear.
const breaksNaik = indeksBreaks.every((v, i) => i === 0 || v > indeksBreaks[i - 1]);
const indeksSkala = breaksNaik
  ? indeksBreaks
  : [0, 0.25, 0.5, 0.75, 1].map((t) => Number((indeksMin + (indeksMax - indeksMin) * t).toFixed(4)));

/**
 * Tingkat kepercayaan diturunkan dari galat model per kategori, jadi nilainya diskret
 * (satu nilai per kategori). Dipetakan sebagai kelas, bukan gradien — supaya legenda
 * tidak menjanjikan gradasi yang sebenarnya tidak ada di data.
 */
const kelasMap = new Map();
for (const f of features) {
  const nilai = f.properties.tingkat_kepercayaan;
  const entry = kelasMap.get(nilai) ?? { nilai, jumlah: 0, kategori: [] };
  entry.jumlah += 1;
  if (!entry.kategori.includes(f.properties.kategori)) entry.kategori.push(f.properties.kategori);
  kelasMap.set(nilai, entry);
}
const kepercayaanKelas = [...kelasMap.values()].sort((a, b) => b.nilai - a.nilai);
const stats = {
  total,
  perKategori,
  // "belum dapat dinilai yakin" = semua kecamatan di luar kategori "Cukup"
  belumYakin: total - perKategori['Cukup'],
  belumYakinPersen: Number((((total - perKategori['Cukup']) / total) * 100).toFixed(1)),
  tidakTerukur: perKategori['Tidak Terukur Sama Sekali'],
  dataTerpercaya: perKategori['Cukup'],
  bbox: bboxSemua,
  indeks: { min: Number(indeksMin.toFixed(4)), max: Number(indeksMax.toFixed(4)) },
  indeksSkala,
  kepercayaan: { min: Number(kepercayaanMin.toFixed(4)), max: Number(kepercayaanMax.toFixed(4)) },
  kepercayaanKelas,
  top50Count: top50.length,
  kategoriTidakPasti: KATEGORI_TIDAK_PASTI,

  // --- data pendukung baru ---
  populasiTotal,
  /** Kecamatan yang WorldPop catat 0 jiwa — ditampilkan "tidak tercatat", bukan "0 jiwa". */
  tanpaCatatanPopulasi: features.filter((f) => f.properties.populasi === 0).length,
  tahunTren: TAHUN_TREN,
  provinsiCount: provinsi.length,
  populasiTerdampakTotal: provinsi.reduce((a, r) => a + r.populasi_terdampak, 0),
  kecamatanBermasalahTotal: provinsi.reduce((a, r) => a + r.kecamatan_bermasalah, 0),
  /** Tiga provinsi dengan populasi terdampak tertinggi — disorot di tabel provinsi. */
  provinsiTeratas: provinsi.slice(0, 3).map((r) => r.provinsi),
};

// ---------------------------------------------------------------- tulis

fs.mkdirSync(OUT_PUBLIC, { recursive: true });
fs.mkdirSync(OUT_LIB, { recursive: true });

const geojsonPath = path.join(OUT_PUBLIC, 'dashboard_data_ringan.geojson');
fs.writeFileSync(geojsonPath, JSON.stringify(outGeojson));
// Dipakai indikator progres di klien: kalau respons di-gzip, content-length berisi ukuran
// terkompresi sementara stream yang dibaca sudah terdekompresi — jadi angka ini yang benar.
stats.geojsonBytes = fs.statSync(geojsonPath).size;
// top50 ikut masuk bundel (hanya ~15 KB) supaya daftar prioritas tampil tanpa fetch kedua.
fs.writeFileSync(path.join(OUT_LIB, 'top50.json'), `${JSON.stringify(top50, null, 0)}\n`);
fs.writeFileSync(path.join(OUT_LIB, 'provinsi.json'), `${JSON.stringify(provinsi, null, 0)}\n`);
fs.writeFileSync(path.join(OUT_LIB, 'stats.json'), `${JSON.stringify(stats, null, 2)}\n`);

const srcMb = (Buffer.byteLength(srcRaw) / 1024 / 1024).toFixed(2);
const outMb = (fs.statSync(path.join(OUT_PUBLIC, 'dashboard_data_ringan.geojson')).size / 1024 / 1024).toFixed(2);
const denganTren = top50.filter((t) => t.tren?.some((v) => v !== null)).length;
console.log(
  `[prepare-data] ${total} kecamatan · geojson ${srcMb} MB -> ${outMb} MB · ` +
    `belum yakin ${stats.belumYakin} (${stats.belumYakinPersen}%)\n` +
    `[prepare-data] populasi ${populasiTotal.toLocaleString('id-ID')} jiwa (${stats.tanpaCatatanPopulasi} kecamatan tercatat 0) · ` +
    `top50 ${top50.length} entri (${denganTren} punya tren) · ${provinsi.length} provinsi · ` +
    `${stats.populasiTerdampakTotal.toLocaleString('id-ID')} jiwa terdampak`
);
