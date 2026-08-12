export const KATEGORI_LIST = [
  'Cukup',
  'Jarang',
  'Sangat Jarang',
  'Tidak Terukur Sama Sekali',
] as const;

export type Kategori = (typeof KATEGORI_LIST)[number];

/**
 * Kategori yang datanya terlalu tipis untuk diklaim pasti tertinggal.
 * Dirender terpisah dari skala warna indeks — ini keputusan metodologis, bukan estetika.
 */
export const KATEGORI_TIDAK_PASTI: Kategori[] = ['Sangat Jarang', 'Tidak Terukur Sama Sekali'];

export const isTidakPasti = (k: Kategori) => KATEGORI_TIDAK_PASTI.includes(k);

export type LayerMode = 'indeks' | 'kepercayaan';

export interface KecamatanProps {
  GID_3: string;
  kecamatan: string;
  kabupaten: string;
  provinsi: string;
  kategori: Kategori;
  kecepatan_final: number;
  tingkat_kepercayaan: number;
  indeks_kesenjangan_final: number;
  /** WorldPop; 0 berarti tidak tercatat, bukan benar-benar kosong penduduk. */
  populasi: number | null;
  /** 0–1, hanya ada pada kecamatan berarsir: kepadatan gerombolan arsir di sekitarnya. */
  arsir_padat?: number;
}

/** Satu entri daftar prioritas, lengkap dengan bahan kartu rasionalisasi berlapis. */
export interface Top50Item {
  rank: number;
  kecamatan: string;
  kabupaten: string;
  provinsi: string;
  kategori: string;
  kecepatan_final: number;
  indeks_kesenjangan_final: number;
  tingkat_kepercayaan: number | null;
  populasi: number | null;

  /** Kalimat siap-tampil dari data asli — jangan diparafrase saat merender. */
  alasan_urgensi: string | null;
  alasan_model: string | null;

  kota_terdekat: string | null;
  jarak_kota_km: number | null;
  rata_rata_provinsi: number | null;
  persen_dibawah_provinsi: number | null;

  /** `kecepatan_min === 0` = rentang terlalu lebar, bukan nol sungguhan. */
  kecepatan_min: number | null;
  kecepatan_max: number | null;

  tetangga_baik_nama: string | null;
  tetangga_baik_kecepatan: number | null;
  tetangga_baik_jarak_km: number | null;

  /** Satu nilai per tahun pada `stats.tahunTren`; null = tahun tanpa pengukuran. */
  tren: (number | null)[] | null;

  GID_3: string | null;
  featureId: number | null;
  center: [number, number] | null;
  bbox: [number, number, number, number] | null;
}

export interface ProvinsiRow {
  provinsi: string;
  jumlah_kecamatan: number;
  /** Kecamatan berkategori "Sangat Jarang" + "Tidak Terukur Sama Sekali". */
  kecamatan_bermasalah: number;
  /** Total penduduk yang tinggal di kecamatan bermasalah tersebut. */
  populasi_terdampak: number;
}

/** Dua cara pandang urgensi di panel prioritas. */
export type UrutanPrioritas = 'indeks' | 'populasi';

/** Permintaan pindah kamera. `nonce` supaya klik item yang sama dua kali tetap memicu flyTo. */
export interface MapFocus {
  gid: string;
  center: [number, number];
  bbox: [number, number, number, number] | null;
  nonce: number;
}

export interface MapStatus {
  loading: boolean;
  /** 0–1, hanya terisi kalau server mengirim content-length. */
  progress: number;
  error: string | null;
}
