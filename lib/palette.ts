import type { ExpressionSpecification } from 'maplibre-gl';
import { stats } from './stats';
import { KATEGORI_TIDAK_PASTI, type Kategori, type LayerMode } from './types';

/**
 * Skala indeks kesenjangan: krem -> hijau muda -> kuning -> oranye -> merah tua.
 * Diturunkan dari prototipe yang sudah disetujui, digeser sedikit supaya kontrasnya
 * lebih tegas saat dipakai sebagai fill poligon (bukan titik kecil).
 */
// Langkah disetel ulang pada jarak terang yang merata (validator dataviz: ΔL >= 0,06 di
// tiap pasangan). Versi sebelumnya punya hijau dan kuning pada terang yang nyaris sama
// (ΔL 0,011), jadi dua kuintil di tengah tidak terbedakan di grayscale maupun bagi
// pembaca buta warna.
export const INDEKS_SCALE = ['#F4EEDE', '#C5DDB5', '#DAB33A', '#D16D23', '#7A1526'] as const;

/** Skala tingkat kepercayaan: sengaja beda keluarga warna supaya tidak tertukar dengan indeks. */
export const KEPERCAYAAN_SCALE = ['#E7EFED', '#A9CFC8', '#6BAAA1', '#3D8C83', '#1A4B47'] as const;

/** Warna kecamatan yang datanya terlalu tipis — di luar skala warna mana pun. */
export const WARNA_TIDAK_PASTI = '#A8A29E';

export const WARNA_KATEGORI: Record<Kategori, string> = {
  Cukup: '#3A7D5C',
  Jarang: '#E8A33D',
  'Sangat Jarang': '#C1442B',
  'Tidak Terukur Sama Sekali': WARNA_TIDAK_PASTI,
};

export const LABEL_KATEGORI_PENDEK: Record<Kategori, string> = {
  Cukup: 'Cukup',
  Jarang: 'Jarang',
  'Sangat Jarang': 'Sangat Jarang',
  'Tidak Terukur Sama Sekali': 'Tidak Terukur',
};

/** Titik henti skala indeks — kuantil sebaran nyata, dihitung saat build. */
export const INDEKS_STOPS = stats.indeksSkala;

/**
 * Kelas tingkat kepercayaan yang benar-benar muncul di layer berwarna.
 * Kelas milik kategori berarsir tidak ikut, karena wilayah itu tidak diwarnai skala ini.
 */
export interface KelasKepercayaan {
  nilai: number;
  jumlah: number;
  kategori: string[];
  warna: string;
}

export const KEPERCAYAAN_KELAS: KelasKepercayaan[] = stats.kepercayaanKelas
  .filter((k) => k.kategori.some((kat) => !KATEGORI_TIDAK_PASTI.includes(kat as Kategori)))
  .map((k, i, arr) => {
    // Kelas paling terpercaya dapat warna paling gelap.
    const posisi = arr.length === 1 ? 1 : 1 - i / (arr.length - 1);
    const idx = Math.round(1 + posisi * (KEPERCAYAAN_SCALE.length - 2));
    return { ...k, warna: KEPERCAYAAN_SCALE[idx] };
  });

export const MODE_META: Record<LayerMode, { label: string; judul: string; catatan: string }> = {
  indeks: {
    label: 'Indeks Kesenjangan',
    judul: 'Indeks Kesenjangan',
    catatan: 'Makin gelap kemerahan, makin besar kesenjangan digitalnya.',
  },
  kepercayaan: {
    label: 'Tingkat Kepercayaan',
    judul: 'Tingkat Kepercayaan',
    catatan:
      'Makin gelap kehijauan, makin bisa dipercaya angka kecamatan itu. Nilainya diturunkan dari galat model per kategori, jadi bertingkat — bukan gradasi halus.',
  },
};

/** Gradien CSS untuk legenda, selalu sinkron dengan skala peta. */
export const gradientCss = (scale: readonly string[]) => `linear-gradient(90deg, ${scale.join(', ')})`;

/** Expression `fill-color` untuk kecamatan berdata memadai, sesuai mode aktif. */
export function fillColorExpression(mode: LayerMode): ExpressionSpecification {
  if (mode === 'indeks') {
    const stops = INDEKS_SCALE.flatMap((color, i) => [INDEKS_STOPS[i], color]);
    return [
      'interpolate',
      ['linear'],
      ['coalesce', ['get', 'indeks_kesenjangan_final'], INDEKS_STOPS[0]],
      ...stops,
    ] as unknown as ExpressionSpecification;
  }

  // Kelas diskret: `step` dari nilai terendah ke tertinggi.
  const naik = [...KEPERCAYAAN_KELAS].sort((a, b) => a.nilai - b.nilai);
  const rest = naik.slice(1).flatMap((k) => [k.nilai, k.warna]);
  return [
    'step',
    ['coalesce', ['get', 'tingkat_kepercayaan'], 0],
    naik[0]?.warna ?? WARNA_TIDAK_PASTI,
    ...rest,
  ] as unknown as ExpressionSpecification;
}

const inList = (values: readonly string[]): ExpressionSpecification =>
  ['in', ['get', 'kategori'], ['literal', values]] as unknown as ExpressionSpecification;

/** Filter dasar tiap layer + filter kategori dari panel kontrol, digabung jadi satu expression. */
export function layerFilter(kind: 'pasti' | 'tidak-pasti', activeCategories: Kategori[]): ExpressionSpecification {
  const base = kind === 'tidak-pasti' ? KATEGORI_TIDAK_PASTI : (['Cukup', 'Jarang'] as Kategori[]);
  const allowed = base.filter((k) => activeCategories.includes(k));
  // Daftar kosong -> `in` mengembalikan false untuk semua feature (peta kosong, bukan error).
  return inList(allowed);
}

export const semuaKategoriFilter = (activeCategories: Kategori[]): ExpressionSpecification =>
  inList(activeCategories);
