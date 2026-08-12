import { formatInt, formatKecepatan } from './format';

/**
 * Aturan tampilan untuk nilai yang secara teknis benar tapi menyesatkan kalau
 * ditulis apa adanya. Dipusatkan di sini supaya popup peta, panel prioritas, dan
 * halaman statis tidak pernah berbeda dalam menampilkan kasus yang sama.
 */

/**
 * WorldPop mencatat 0 jiwa untuk 145 kecamatan. "0 jiwa" terbaca seperti bug,
 * padahal artinya tidak ada penduduk yang terdeteksi pada raster populasi.
 */
export function labelPopulasi(populasi: number | null | undefined): { teks: string; tercatat: boolean } {
  if (populasi === null || populasi === undefined) return { teks: 'Populasi tidak tersedia', tercatat: false };
  if (populasi === 0) return { teks: 'Populasi tidak tercatat', tercatat: false };
  return { teks: `${formatInt(populasi)} jiwa`, tercatat: true };
}

/**
 * Batas bawah rentang kepercayaan sering jatuh ke 0 karena ketidakpastian model
 * memang selebar itu — 31 dari 50 kecamatan prioritas mengalaminya. Menulis
 * "0 kbps" terbaca seperti kesalahan data, jadi kasus itu diberi label kualitatif.
 */
export function labelRentangKecepatan(
  min: number | null | undefined,
  max: number | null | undefined
): { teks: string; terlaluLebar: boolean } {
  if (max === null || max === undefined) return { teks: 'Rentang tidak tersedia', terlaluLebar: false };
  if (min === null || min === undefined || min === 0) {
    return { teks: `Rentang terlalu lebar untuk diperkirakan (hingga ${formatKecepatan(max)})`, terlaluLebar: true };
  }
  return { teks: `${formatKecepatan(min)} – ${formatKecepatan(max)}`, terlaluLebar: false };
}

/** Versi ringkas untuk baris daftar yang sempit. */
export function labelRentangPendek(min: number | null | undefined, max: number | null | undefined): string {
  if (max === null || max === undefined) return '—';
  if (min === null || min === undefined || min === 0) return `≤ ${formatKecepatan(max)} · sangat tidak pasti`;
  return `${formatKecepatan(min)} – ${formatKecepatan(max)}`;
}

export function labelJarakKota(kota: string | null, km: number | null): string | null {
  if (!kota || km === null) return null;
  return `${formatInt(km)} km dari ${kota}`;
}

export function labelDibawahProvinsi(persen: number | null, rataRata: number | null): string | null {
  if (persen === null) return null;
  const dasar = rataRata !== null ? ` (rata-rata provinsi ${formatKecepatan(rataRata)})` : '';
  return `${formatInt(persen)}% di bawah rata-rata provinsinya${dasar}`;
}
