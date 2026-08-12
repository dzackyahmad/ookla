import type { Kategori, KecamatanProps, Top50Item } from './types';

/**
 * Bentuk tunggal yang dipakai kartu rasionalisasi, dari mana pun asalnya:
 * klik poligon di peta (punya properti feature) atau item daftar prioritas
 * (punya kolom alasan/tren). Popup dan panel karena itu tidak pernah berbeda isi.
 */
export interface CardData {
  kecamatan: string;
  kabupaten: string;
  provinsi: string;
  kategori: Kategori;
  kecepatan_final: number;
  indeks_kesenjangan_final: number;
  tingkat_kepercayaan: number | null;
  populasi: number | null;
  /** Peringkat di daftar prioritas; null kalau kecamatan ini di luar 50 besar. */
  rank: number | null;
  /** Lapis rasionalisasi — hanya tersedia untuk 50 kecamatan prioritas. */
  detail: Top50Item | null;
}

export function buildCardData(props: KecamatanProps | null, item: Top50Item | null): CardData | null {
  if (!props && !item) return null;
  return {
    kecamatan: props?.kecamatan ?? item?.kecamatan ?? '—',
    kabupaten: props?.kabupaten ?? item?.kabupaten ?? '—',
    provinsi: props?.provinsi ?? item?.provinsi ?? '—',
    kategori: (props?.kategori ?? (item?.kategori as Kategori)) ?? 'Cukup',
    kecepatan_final: props?.kecepatan_final ?? item?.kecepatan_final ?? 0,
    indeks_kesenjangan_final: props?.indeks_kesenjangan_final ?? item?.indeks_kesenjangan_final ?? 0,
    tingkat_kepercayaan: props?.tingkat_kepercayaan ?? item?.tingkat_kepercayaan ?? null,
    populasi: props?.populasi ?? item?.populasi ?? null,
    rank: item?.rank ?? null,
    detail: item,
  };
}
