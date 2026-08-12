const integerId = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });
const decimalId = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const decimal3Id = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

export const formatInt = (n: number) => integerId.format(n);
export const formatDecimal = (n: number) => decimalId.format(n);
export const formatIndeks = (n: number) => decimal3Id.format(n);
export const formatPersen = (n: number) => `${decimalId.format(n).replace(/,00$/, '')}%`;

/** Kecepatan disimpan dalam kbps; tampilkan Mbps kalau sudah cukup besar supaya mudah dibaca. */
export function formatKecepatan(kbps: number) {
  if (!Number.isFinite(kbps)) return '—';
  if (kbps >= 1000) return `${decimalId.format(kbps / 1000)} Mbps`;
  return `${integerId.format(kbps)} kbps`;
}
