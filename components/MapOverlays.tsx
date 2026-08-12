'use client';

/** Skeleton saat geojson 4 MB masih dimuat — peta tidak pernah kosong tanpa keterangan. */
export function LoadingOverlay({ progress }: { progress: number }) {
  const persen = Math.round(progress * 100);
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute inset-0 z-[600] flex items-center justify-center bg-[#EAE7DE]/80 backdrop-blur-[2px]"
    >
      <div className="panel-card w-[268px] px-5 py-4 text-center">
        <div className="mx-auto mb-3 h-7 w-7 animate-spin rounded-full border-[3px] border-[#E2DED5] border-t-accent" />
        <div className="font-display text-[13.5px] font-bold">Memuat 6.695 poligon kecamatan</div>
        <p className="mt-1 text-[11.5px] leading-[1.5] text-muted">
          Berkas batas wilayah berukuran besar — sekali dimuat, peta akan mulus dipan dan di-zoom.
        </p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#EDEAE2]">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-200"
            style={{ width: `${Math.max(6, persen)}%` }}
          />
        </div>
        <div className="mt-1.5 font-mono text-[10.5px] text-muted">{persen > 0 ? `${persen}%` : 'menyiapkan…'}</div>
      </div>
    </div>
  );
}

export function ErrorOverlay({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="absolute inset-0 z-[600] flex items-center justify-center bg-[#EAE7DE] px-4">
      <div className="panel-card max-w-[380px] px-5 py-4">
        <div className="font-display text-[14px] font-bold text-accent">Peta gagal dimuat</div>
        <p className="mt-1.5 text-[12.5px] leading-[1.6] text-muted">
          Data batas kecamatan tidak berhasil diambil ({message}). Halaman <b className="text-ink">Bukti</b> dan{' '}
          <b className="text-ink">Metodologi</b> tetap bisa dibuka.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-lg bg-accent px-3.5 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-accent-dark"
        >
          Coba muat ulang
        </button>
      </div>
    </div>
  );
}

/** Semua kategori di-uncheck: peta memang kosong, tapi harus jelas kenapa. */
export function EmptyOverlay() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-1/2 z-[400] flex -translate-y-1/2 justify-center px-4">
      <div className="panel-card px-4 py-3 text-center">
        <div className="text-[12.5px] font-semibold">Tidak ada kategori yang ditampilkan</div>
        <p className="mt-1 text-[11.5px] text-muted">Centang minimal satu kategori kecukupan data untuk melihat peta.</p>
      </div>
    </div>
  );
}
