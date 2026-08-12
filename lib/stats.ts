import generated from './generated/stats.json';
import type { Kategori } from './types';

/**
 * Ringkasan dataset — dihitung ulang dari geojson tiap kali `npm run build` berjalan
 * (lihat scripts/prepare-data.mjs). Tidak ada angka yang ditulis tangan di sini,
 * jadi kartu statistik ikut berubah otomatis kalau data pack diperbarui.
 */
export interface DashboardStats {
  total: number;
  perKategori: Record<Kategori, number>;
  belumYakin: number;
  belumYakinPersen: number;
  tidakTerukur: number;
  dataTerpercaya: number;
  /** [minLng, minLat, maxLng, maxLat] seluruh kecamatan. */
  bbox: [number, number, number, number];
  indeks: { min: number; max: number };
  /** Lima titik henti skala warna indeks (kuantil sebaran nyata). */
  indeksSkala: number[];
  kepercayaan: { min: number; max: number };
  /** Nilai kepercayaan yang benar-benar ada di data, beserta jumlah dan kategorinya. */
  kepercayaanKelas: { nilai: number; jumlah: number; kategori: string[] }[];
  top50Count: number;
  kategoriTidakPasti: string[];
  /** Ukuran geojson hasil olahan (byte, sebelum kompresi transport). */
  geojsonBytes: number;

  populasiTotal: number;
  /** Kecamatan yang WorldPop catat 0 jiwa — ditampilkan "tidak tercatat". */
  tanpaCatatanPopulasi: number;
  tahunTren: number[];
  provinsiCount: number;
  /** Jiwa yang tinggal di kecamatan berkategori "Sangat Jarang"/"Tidak Terukur". */
  populasiTerdampakTotal: number;
  kecamatanBermasalahTotal: number;
  provinsiTeratas: string[];
}

export const stats: DashboardStats = generated as DashboardStats;
