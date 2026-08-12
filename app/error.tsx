'use client';

/** Jaring pengaman terakhir: error render tak terduga tidak boleh jadi halaman putih. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-page px-4">
      <div className="panel-card max-w-[420px] px-5 py-4">
        <h2 className="font-display text-[15px] font-bold text-accent">Ada yang bermasalah di halaman ini</h2>
        <p className="mt-1.5 text-[12.5px] leading-[1.6] text-muted">
          {error.message || 'Terjadi kesalahan tak terduga saat menampilkan dashboard.'}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-3 rounded-lg bg-accent px-3.5 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-accent-dark"
        >
          Muat ulang bagian ini
        </button>
      </div>
    </div>
  );
}
