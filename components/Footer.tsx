export default function Footer() {
  return (
    <footer className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-panel-border bg-white px-4 py-2 text-[11px] leading-[1.5] text-muted sm:px-6">
      <div>
        Sumber data: <b className="text-ink">Ookla</b> · <b className="text-ink">WorldPop</b> ·{' '}
        <b className="text-ink">SRTM</b> · <b className="text-ink">OpenStreetMap</b> · <b className="text-ink">VIIRS</b>.
        Estimasi kecepatan untuk kecamatan tanpa pengukuran adalah keluaran model (TabPFN), bukan hasil pengukuran
        langsung.
      </div>
      {/* Kredit peta tetap tampil di kanvas lewat kontrol atribusi MapLibre, jadi baris ini
          boleh disembunyikan di layar sempit agar peta dapat ruang lebih banyak. */}
      <div className="hidden sm:block">
        MapLibre GL · © OpenStreetMap · © CARTO &nbsp;|&nbsp; Disusun oleh: Muhammad Fachri · Dzacky Ahmad · Arya Rafi
        Raharjo
      </div>
    </footer>
  );
}
