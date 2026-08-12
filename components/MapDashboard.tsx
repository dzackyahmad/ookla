'use client';

import dynamic from 'next/dynamic';
import { useCallback, useMemo, useState } from 'react';
import CategoryFilter from './CategoryFilter';
import HowToRead from './HowToRead';
import LayerControl from './LayerControl';
import Legend from './Legend';
import ProvinceTable from './ProvinceTable';
import RankedList from './RankedList';
import StatCards from './StatCards';
import { EmptyOverlay, ErrorOverlay, LoadingOverlay } from './MapOverlays';
import top50Raw from '@/lib/generated/top50.json';
import {
  KATEGORI_LIST,
  type Kategori,
  type KecamatanProps,
  type LayerMode,
  type MapFocus,
  type MapStatus,
  type Top50Item,
  type UrutanPrioritas,
} from '@/lib/types';

// MapLibre menyentuh `window` saat modul dimuat — wajib client-only, kalau tidak
// build produksi Next.js gagal saat prerender.
const MapView = dynamic(() => import('./MapView'), { ssr: false });

const TOP50 = top50Raw as unknown as Top50Item[];

type PanelTab = 'prioritas' | 'provinsi';

const PANEL_TABS: { nilai: PanelTab; label: string }[] = [
  { nilai: 'prioritas', label: 'Prioritas' },
  { nilai: 'provinsi', label: 'Per Provinsi' },
];

export default function MapDashboard() {
  const [mode, setMode] = useState<LayerMode>('indeks');
  const [activeCategories, setActiveCategories] = useState<Kategori[]>([...KATEGORI_LIST]);
  const [selectedGid, setSelectedGid] = useState<string | null>(null);
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [status, setStatus] = useState<MapStatus>({ loading: true, progress: 0, error: null });
  const [mapKey, setMapKey] = useState(0);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [panelTab, setPanelTab] = useState<PanelTab>('prioritas');
  const [urutan, setUrutan] = useState<UrutanPrioritas>('indeks');

  const handleToggleCategory = useCallback((kategori: Kategori, checked: boolean) => {
    setActiveCategories((prev) =>
      checked ? [...prev, kategori] : prev.filter((k) => k !== kategori)
    );
  }, []);

  const handleSelectFromMap = useCallback((props: KecamatanProps | null) => {
    setSelectedGid(props?.GID_3 ?? null);
  }, []);

  const handleSelectFromList = useCallback(
    (item: Top50Item) => {
      if (!item.GID_3 || !item.center) return;
      // Klik ulang pada item yang sedang terbuka = menutupnya, sekaligus melepas
      // sorotan dan popup di peta.
      if (item.GID_3 === selectedGid) {
        setSelectedGid(null);
        return;
      }
      setSelectedGid(item.GID_3);
      setFocus((prev) => ({
        gid: item.GID_3 as string,
        center: item.center as [number, number],
        bbox: item.bbox,
        // nonce membuat klik pada item yang sama tetap memicu flyTo ulang
        nonce: (prev?.nonce ?? 0) + 1,
      }));
    },
    [selectedGid]
  );

  /** Dipakai panduan "Cara Membaca": menuntun langsung ke satu kecamatan contoh. */
  const handleSorotContoh = useCallback(
    (gid: string) => {
      const item = TOP50.find((t) => t.GID_3 === gid);
      if (!item?.center) return;
      setPanelTab('prioritas');
      setUrutan('indeks');
      setSelectedGid(item.GID_3);
      setFocus((prev) => ({
        gid: gid,
        center: item.center as [number, number],
        bbox: item.bbox,
        nonce: (prev?.nonce ?? 0) + 1,
      }));
      setListOpen(false);
      setControlsOpen(false);
    },
    []
  );

  const handleRetry = useCallback(() => {
    setStatus({ loading: true, progress: 0, error: null });
    setSelectedGid(null);
    setFocus(null);
    // Remount MapView: instance lama sudah dibersihkan lewat cleanup useEffect-nya.
    setMapKey((k) => k + 1);
  }, []);

  const kosong = activeCategories.length === 0;
  const controls = useMemo(
    () => (
      <>
        <div className="border-b border-panel-border px-4 py-3">
          <LayerControl mode={mode} onChange={setMode} />
        </div>
        <div className="border-b border-panel-border px-4 py-3">
          <CategoryFilter active={activeCategories} onToggle={handleToggleCategory} />
        </div>
        <div className="px-4 py-3">
          <Legend mode={mode} />
        </div>
      </>
    ),
    [mode, activeCategories, handleToggleCategory]
  );

  return (
    <>
      <MapView
        key={mapKey}
        mode={mode}
        activeCategories={activeCategories}
        selectedGid={selectedGid}
        focus={focus}
        onSelect={handleSelectFromMap}
        onStatusChange={setStatus}
      />

      {status.loading && !status.error && <LoadingOverlay progress={status.progress} />}
      {status.error && <ErrorOverlay message={status.error} onRetry={handleRetry} />}
      {!status.loading && !status.error && kosong && <EmptyOverlay />}

      {/* Baris tombol mengambang: di layar sempit memuat pembuka kedua panel, di layar
          lebar hanya menyisakan panduan — digeser ke kanan panel kontrol agar tidak menimpa. */}
      <div className="pointer-events-none absolute left-3 top-3 z-[520] flex flex-wrap items-start gap-2 lg:left-[320px] lg:top-4">
        <button
          type="button"
          onClick={() => {
            setControlsOpen((v) => !v);
            setListOpen(false);
          }}
          aria-expanded={controlsOpen}
          className="pointer-events-auto rounded-lg border border-panel-border bg-white px-3 py-2 text-[12px] font-semibold shadow-card lg:hidden"
        >
          {controlsOpen ? 'Tutup kontrol' : 'Kontrol peta'}
        </button>
        <button
          type="button"
          onClick={() => {
            setListOpen((v) => !v);
            setControlsOpen(false);
          }}
          aria-expanded={listOpen}
          className="pointer-events-auto rounded-lg border border-panel-border bg-white px-3 py-2 text-[12px] font-semibold shadow-card lg:hidden"
        >
          {listOpen ? 'Tutup daftar' : 'Daftar prioritas'}
        </button>
        <div className="pointer-events-none flex flex-col items-start">
          <HowToRead onSorotContoh={handleSorotContoh} />
        </div>
      </div>

      <aside
        aria-label="Kontrol peta"
        className={`thin-scroll absolute z-[510] max-h-[calc(100%-5rem)] overflow-y-auto rounded-xl border border-panel-border bg-panel shadow-panel ${
          controlsOpen ? 'block' : 'hidden lg:block'
        } left-3 right-3 top-16 sm:right-auto sm:w-[300px] lg:left-4 lg:top-4 lg:w-[288px] lg:max-h-[calc(100%-11rem)]`}
      >
        {controls}
      </aside>

      <div
        aria-label="Ringkasan dan daftar prioritas"
        className={`absolute z-[510] flex flex-col gap-2.5 ${
          listOpen ? 'flex' : 'hidden lg:flex'
        } bottom-3 left-3 right-3 max-h-[80%] lg:bottom-4 lg:left-auto lg:right-4 lg:top-4 lg:max-h-[calc(100%-2rem)] lg:w-[304px]`}
      >
        <StatCards />

        <div className="panel-card flex min-h-0 flex-1 flex-col overflow-hidden">
          <div
            role="tablist"
            aria-label="Panel data"
            className="flex shrink-0 gap-0.5 border-b border-panel-border bg-[#F8F6F1] p-[3px]"
          >
            {PANEL_TABS.map((t) => (
              <button
                key={t.nilai}
                type="button"
                role="tab"
                aria-selected={panelTab === t.nilai}
                onClick={() => setPanelTab(t.nilai)}
                className={`flex-1 rounded-md px-2 py-[6px] text-[12px] font-semibold transition-colors ${
                  panelTab === t.nilai
                    ? 'bg-white text-ink shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                    : 'text-muted-strong hover:text-ink'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {panelTab === 'prioritas' ? (
            <RankedList
              items={TOP50}
              selectedGid={selectedGid}
              urutan={urutan}
              activeCategories={activeCategories}
              onUrutanChange={setUrutan}
              onSelect={handleSelectFromList}
              className="min-h-[160px]"
            />
          ) : (
            <ProvinceTable className="min-h-[160px]" />
          )}
        </div>
      </div>
    </>
  );
}
