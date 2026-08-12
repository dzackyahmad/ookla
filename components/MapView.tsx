'use client';

import { useCallback, useEffect, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import maplibregl, { type FilterSpecification, type Map as MapLibreMap, type MapGeoJSONFeature } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import KecamatanCard from './KecamatanCard';
import { WARNA_TIDAK_PASTI, fillColorExpression, layerFilter, semuaKategoriFilter } from '@/lib/palette';
import { buildCardData } from '@/lib/card';
import { stats } from '@/lib/stats';
import top50Raw from '@/lib/generated/top50.json';
import type { Kategori, KecamatanProps, LayerMode, MapFocus, MapStatus, Top50Item } from '@/lib/types';

const SOURCE_ID = 'kecamatan';
const GEOJSON_URL = '/data/dashboard_data_ringan.geojson';
const BASEMAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
const HATCH_IMAGE_ID = 'hatch-tidak-pasti';

const L = {
  fill: 'kec-fill',
  uncertainFill: 'kec-uncertain-fill',
  uncertainHatch: 'kec-uncertain-hatch',
  line: 'kec-line',
  hover: 'kec-hover',
  selected: 'kec-selected',
} as const;

const FILL_OPACITY = 0.85;
const INDONESIA_CENTER: [number, number] = [118, -2.2];
/** Sabang sampai Merauke — bbox nyata dataset, dihitung saat build. */
const INDONESIA_BOUNDS: [[number, number], [number, number]] = [
  [stats.bbox[0], stats.bbox[1]],
  [stats.bbox[2], stats.bbox[3]],
];

interface Props {
  mode: LayerMode;
  activeCategories: Kategori[];
  selectedGid: string | null;
  focus: MapFocus | null;
  onSelect: (props: KecamatanProps | null) => void;
  onStatusChange: (status: MapStatus) => void;
}

/** Pola arsir diagonal untuk kecamatan yang datanya terlalu tipis — dibuat sekali di klien. */
function createHatchImage(size = 8) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.strokeStyle = 'rgba(94, 90, 84, 0.9)';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  for (const offset of [-size, 0, size]) {
    ctx.moveTo(offset, size);
    ctx.lineTo(offset + size, 0);
  }
  ctx.stroke();
  const { data, width, height } = ctx.getImageData(0, 0, size, size);
  return { width, height, data: new Uint8Array(data) };
}

/** Rincian prioritas dicari per GID_3 supaya popup memakai kartu yang sama dengan panel. */
const TOP50_BY_GID = new Map((top50Raw as unknown as Top50Item[]).map((t) => [t.GID_3, t]));

export default function MapView({ mode, activeCategories, selectedGid, focus, onSelect, onStatusChange }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const popupRootRef = useRef<Root | null>(null);
  const readyRef = useRef(false);
  const hoveredIdRef = useRef<number | null>(null);
  const selectedIdRef = useRef<number | null>(null);
  const byGidRef = useRef<Map<string, { id: number; props: KecamatanProps }>>(new Map());
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Callback disimpan di ref supaya efek inisialisasi peta tidak ikut re-run saat parent re-render.
  const onSelectRef = useRef(onSelect);
  const onStatusRef = useRef(onStatusChange);
  onSelectRef.current = onSelect;
  onStatusRef.current = onStatusChange;

  const setFeatureFlag = useCallback((id: number | null, key: 'hover' | 'selected', value: boolean) => {
    const map = mapRef.current;
    if (!map || id === null || !readyRef.current) return;
    map.setFeatureState({ source: SOURCE_ID, id }, { [key]: value });
  }, []);

  /** Membongkar React root milik popup di luar siklus render supaya tidak memicu warning. */
  const lepasPopup = useCallback(() => {
    popupRef.current?.remove();
    popupRef.current = null;
    const root = popupRootRef.current;
    popupRootRef.current = null;
    if (root) setTimeout(() => root.unmount(), 0);
  }, []);

  const openPopup = useCallback(
    (lngLat: [number, number], props: KecamatanProps) => {
      const map = mapRef.current;
      if (!map) return;
      lepasPopup();

      // Popup diisi komponen React yang sama dengan panel prioritas, bukan string HTML
      // terpisah — supaya aturan tampilan (populasi 0, rentang terlalu lebar) tidak
      // pernah menyimpang antara dua tempat.
      const node = document.createElement('div');
      const root = createRoot(node);
      const data = buildCardData(props, TOP50_BY_GID.get(props.GID_3) ?? null);
      if (data) root.render(<KecamatanCard data={data} variant="popup" />);
      popupRootRef.current = root;

      popupRef.current = new maplibregl.Popup({
        closeButton: true,
        closeOnClick: false,
        maxWidth: '320px',
        offset: 12,
        className: 'kartu-popup',
      })
        .setLngLat(lngLat)
        .setDOMContent(node)
        .addTo(map);

      popupRef.current.on('close', () => {
        popupRef.current = null;
        const r = popupRootRef.current;
        popupRootRef.current = null;
        if (r) setTimeout(() => r.unmount(), 0);
      });
    },
    [lepasPopup]
  );

  // ---------------------------------------------------------------- init
  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    const abort = new AbortController();

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASEMAP_STYLE,
      center: INDONESIA_CENTER,
      // Mulai sedikit lebih jauh dari framing akhir supaya zoom-to-bounds terasa
      // "mendarat" ke Indonesia, bukan sekadar bergeser.
      zoom: 3,
      // Sabang–Merauke membentang 46° bujur; di layar ponsel butuh zoom < 3 agar muat utuh.
      minZoom: 2,
      maxZoom: 12,
      attributionControl: false,
      // Poligon sebanyak ini tidak perlu ikut miring/berputar — hemat GPU dan menghindari
      // gestur tak sengaja di trackpad/mobile.
      pitchWithRotate: false,
      dragRotate: false,
      touchZoomRotate: true,
    });
    mapRef.current = map;
    map.touchZoomRotate.disableRotation();
    // Semua kontrol di kiri-bawah: sudut kanan tertutup panel daftar prioritas di desktop.
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-left');
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 90, unit: 'metric' }), 'bottom-left');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');

    onStatusRef.current({ loading: true, progress: 0, error: null });

    async function loadData(): Promise<GeoJSON.FeatureCollection> {
      const res = await fetch(GEOJSON_URL, { signal: abort.signal });
      if (!res.ok) throw new Error(`server menjawab ${res.status}`);

      // Kalau respons dikompresi (Vercel selalu gzip/brotli), content-length berisi ukuran
      // terkompresi sedangkan stream yang dibaca sudah terdekompresi — pakai ukuran asli
      // hasil build supaya persentasenya tidak melompat ke 99% seketika.
      const headerLength = res.headers.get('content-encoding') ? 0 : Number(res.headers.get('content-length')) || 0;
      const total = headerLength || stats.geojsonBytes || 0;
      if (!res.body || !total) {
        onStatusRef.current({ loading: true, progress: 0, error: null });
        return (await res.json()) as GeoJSON.FeatureCollection;
      }

      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          received += value.length;
          if (!cancelled) {
            onStatusRef.current({ loading: true, progress: Math.min(0.99, received / total), error: null });
          }
        }
      }
      const buffer = new Uint8Array(received);
      let offset = 0;
      for (const chunk of chunks) {
        buffer.set(chunk, offset);
        offset += chunk.length;
      }
      return JSON.parse(new TextDecoder().decode(buffer)) as GeoJSON.FeatureCollection;
    }

    const setup = async () => {
      try {
        // Basemap dan data dimuat paralel — keduanya harus siap sebelum layer dipasang.
        const [data] = await Promise.all([
          loadData(),
          new Promise<void>((resolve, reject) => {
            if (map.isStyleLoaded()) return resolve();
            map.once('load', () => resolve());
            map.once('error', (e) => reject(new Error(e.error?.message ?? 'basemap gagal dimuat')));
          }),
        ]);
        if (cancelled || !mapRef.current) return;

        const lookup = new Map<string, { id: number; props: KecamatanProps }>();
        data.features.forEach((f, i) => {
          const props = f.properties as unknown as KecamatanProps;
          const id = typeof f.id === 'number' ? f.id : i;
          lookup.set(props.GID_3, { id, props });
        });
        byGidRef.current = lookup;

        const hatch = createHatchImage();
        if (hatch && !map.hasImage(HATCH_IMAGE_ID)) {
          map.addImage(HATCH_IMAGE_ID, hatch, { pixelRatio: 2 });
        }

        map.addSource(SOURCE_ID, { type: 'geojson', data });

        // Sisipkan di bawah layer label basemap supaya nama kota tetap terbaca.
        const firstSymbol = map.getStyle().layers?.find((l) => l.type === 'symbol')?.id;

        map.addLayer(
          {
            id: L.fill,
            type: 'fill',
            source: SOURCE_ID,
            filter: layerFilter('pasti', activeCategories) as FilterSpecification,
            paint: {
              'fill-color': fillColorExpression(mode),
              'fill-opacity': FILL_OPACITY,
              'fill-opacity-transition': { duration: 180, delay: 0 },
              'fill-color-transition': { duration: 240, delay: 0 },
            },
          },
          firstSymbol
        );

        map.addLayer(
          {
            id: L.uncertainFill,
            type: 'fill',
            source: SOURCE_ID,
            filter: layerFilter('tidak-pasti', activeCategories) as FilterSpecification,
            paint: { 'fill-color': WARNA_TIDAK_PASTI, 'fill-opacity': 0.3 },
          },
          firstSymbol
        );

        map.addLayer(
          {
            id: L.uncertainHatch,
            type: 'fill',
            source: SOURCE_ID,
            filter: layerFilter('tidak-pasti', activeCategories) as FilterSpecification,
            paint: {
              'fill-pattern': HATCH_IMAGE_ID,
              // Di gerombolan arsir terpadat (Papua pedalaman, Kalimantan Utara) polanya
              // menenggelamkan kecamatan berdata cukup di sekitarnya. `arsir_padat`
              // dihitung saat build, jadi pelemahannya hanya kena di gerombolan itu —
              // arsir yang berdiri sendiri tetap tegas.
              'fill-opacity': [
                'interpolate',
                ['linear'],
                ['coalesce', ['get', 'arsir_padat'], 0],
                0,
                0.78,
                0.35,
                0.6,
                1,
                0.42,
              ],
            },
          },
          firstSymbol
        );

        map.addLayer(
          {
            id: L.line,
            type: 'line',
            source: SOURCE_ID,
            filter: semuaKategoriFilter(activeCategories) as FilterSpecification,
            paint: {
              'line-color': '#6F6A60',
              // Kepulauan Maluku, NTT, dan Kepulauan Selayar terdiri dari banyak kecamatan
              // sangat kecil yang menyatu jadi satu gumpalan warna kalau garis batasnya
              // menghilang di zoom nasional — garis dijaga tetap terlihat (0,35-0,5px)
              // sampai zoom terendah.
              'line-width': ['interpolate', ['linear'], ['zoom'], 3, 0.35, 5, 0.5, 7, 0.7, 10, 1],
              'line-opacity': ['interpolate', ['linear'], ['zoom'], 3, 0.42, 5, 0.5, 7, 0.5, 10, 0.55],
            },
          },
          firstSymbol
        );

        map.addLayer(
          {
            id: L.hover,
            type: 'line',
            source: SOURCE_ID,
            filter: semuaKategoriFilter(activeCategories) as FilterSpecification,
            paint: {
              'line-color': '#1B2430',
              'line-width': 1.4,
              'line-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.9, 0],
            },
          },
          firstSymbol
        );

        map.addLayer(
          {
            id: L.selected,
            type: 'line',
            source: SOURCE_ID,
            paint: {
              'line-color': '#9E1B32',
              'line-width': 2.4,
              'line-opacity': ['case', ['boolean', ['feature-state', 'selected'], false], 1, 0],
            },
          },
          firstSymbol
        );

        const interactive = [L.fill, L.uncertainFill, L.uncertainHatch];

        const handleClick = (e: maplibregl.MapMouseEvent & { features?: MapGeoJSONFeature[] }) => {
          const feature = e.features?.[0];
          if (!feature) return;
          const props = feature.properties as unknown as KecamatanProps;
          onSelectRef.current(props);
          // Popup dipasang di titik klik, bukan centroid — tetap akurat untuk kecamatan
          // sangat kecil (banyak di Jawa) pada zoom berapa pun.
          openPopup([e.lngLat.lng, e.lngLat.lat], props);
        };

        const handleMove = (e: maplibregl.MapMouseEvent & { features?: MapGeoJSONFeature[] }) => {
          const id = e.features?.[0]?.id;
          if (typeof id !== 'number' || id === hoveredIdRef.current) return;
          setFeatureFlag(hoveredIdRef.current, 'hover', false);
          hoveredIdRef.current = id;
          setFeatureFlag(id, 'hover', true);
          map.getCanvas().style.cursor = 'pointer';
        };

        const handleLeave = () => {
          setFeatureFlag(hoveredIdRef.current, 'hover', false);
          hoveredIdRef.current = null;
          map.getCanvas().style.cursor = '';
        };

        interactive.forEach((layer) => {
          map.on('click', layer, handleClick);
          map.on('mousemove', layer, handleMove);
          map.on('mouseleave', layer, handleLeave);
        });

        // Framing awal menyisakan ruang untuk panel mengambang supaya Aceh dan Papua
        // tidak tertutup panel di layar lebar. Gerakannya dianimasikan supaya pembaca
        // melihat peta "mendarat" ke Indonesia, bukan tiba-tiba sudah di posisi akhir —
        // kecuali kalau sistem meminta pengurangan animasi.
        const lebarPanel = window.matchMedia('(min-width: 1024px)').matches;
        const kurangiGerak = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        readyRef.current = true;
        onStatusRef.current({ loading: false, progress: 1, error: null });

        // Animasi dijalankan setelah skeleton dilepas supaya gerakannya benar-benar terlihat.
        map.fitBounds(INDONESIA_BOUNDS, {
          padding: { top: 24, bottom: 24, left: lebarPanel ? 316 : 20, right: lebarPanel ? 332 : 20 },
          duration: kurangiGerak ? 0 : 1400,
          essential: true,
        });
      } catch (err) {
        if (cancelled || (err instanceof DOMException && err.name === 'AbortError')) return;
        const message = err instanceof Error ? err.message : 'terjadi kesalahan tak terduga';
        onStatusRef.current({ loading: false, progress: 0, error: message });
      }
    };

    void setup();

    // Peta harus ikut menyesuaikan saat panel dibuka/ditutup atau jendela di-resize
    // (termasuk saat peta sedang dipan) — MapLibre tidak melakukannya sendiri.
    const observer = new ResizeObserver(() => mapRef.current?.resize());
    observer.observe(containerRef.current);

    return () => {
      cancelled = true;
      abort.abort();
      observer.disconnect();
      if (transitionTimer.current) clearTimeout(transitionTimer.current);
      popupRef.current?.remove();
      popupRef.current = null;
      const popupRoot = popupRootRef.current;
      popupRootRef.current = null;
      if (popupRoot) setTimeout(() => popupRoot.unmount(), 0);
      readyRef.current = false;
      hoveredIdRef.current = null;
      selectedIdRef.current = null;
      byGidRef.current = new Map();
      map.remove();
      mapRef.current = null;
    };
    // Efek ini sengaja hanya berjalan sekali; nilai awal mode/kategori dipakai untuk
    // membuat layer, perubahan berikutnya ditangani efek-efek di bawah.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------------------------------------------------- ganti mode pewarnaan
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current || !map.getLayer(L.fill)) return;
    // Transisi warna data-driven tidak dianimasikan MapLibre, jadi warnanya diganti
    // di tengah "kedipan" opacity singkat supaya pergantian terasa halus.
    map.setPaintProperty(L.fill, 'fill-opacity', 0.2);
    if (transitionTimer.current) clearTimeout(transitionTimer.current);
    transitionTimer.current = setTimeout(() => {
      const m = mapRef.current;
      if (!m || !readyRef.current || !m.getLayer(L.fill)) return;
      m.setPaintProperty(L.fill, 'fill-color', fillColorExpression(mode));
      m.setPaintProperty(L.fill, 'fill-opacity', FILL_OPACITY);
    }, 180);
  }, [mode]);

  // ------------------------------------------------- filter kategori
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current || !map.getLayer(L.fill)) return;
    map.setFilter(L.fill, layerFilter('pasti', activeCategories) as FilterSpecification);
    map.setFilter(L.uncertainFill, layerFilter('tidak-pasti', activeCategories) as FilterSpecification);
    map.setFilter(L.uncertainHatch, layerFilter('tidak-pasti', activeCategories) as FilterSpecification);
    map.setFilter(L.line, semuaKategoriFilter(activeCategories) as FilterSpecification);
    map.setFilter(L.hover, semuaKategoriFilter(activeCategories) as FilterSpecification);

    // Popup yang menunjuk kecamatan yang baru saja disembunyikan akan menyesatkan.
    const selected = selectedGid ? byGidRef.current.get(selectedGid) : null;
    if (selected && !activeCategories.includes(selected.props.kategori)) {
      lepasPopup();
    }
  }, [activeCategories, selectedGid, lepasPopup]);

  // ------------------------------------------------- sorot kecamatan terpilih
  useEffect(() => {
    if (!readyRef.current) return;
    const next = selectedGid ? byGidRef.current.get(selectedGid)?.id ?? null : null;
    if (next === selectedIdRef.current) return;
    setFeatureFlag(selectedIdRef.current, 'selected', false);
    selectedIdRef.current = next;
    setFeatureFlag(next, 'selected', true);
    if (!selectedGid) lepasPopup();
  }, [selectedGid, setFeatureFlag, lepasPopup]);

  // ------------------------------------------------- pindah kamera dari daftar prioritas
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focus || !readyRef.current) return;
    const entry = byGidRef.current.get(focus.gid);

    const canvas = map.getCanvas();
    const pad = Math.max(20, Math.min(70, Math.min(canvas.clientWidth, canvas.clientHeight) / 6));

    if (focus.bbox) {
      const [minX, minY, maxX, maxY] = focus.bbox;
      map.fitBounds(
        [
          [minX, minY],
          [maxX, maxY],
        ],
        { padding: pad, maxZoom: 9.5, duration: 900 }
      );
    } else {
      map.flyTo({ center: focus.center, zoom: 8.5, duration: 900 });
    }

    // Sengaja tanpa popup: pemilihan dari daftar prioritas sudah membuka kartu penuh
    // di panel, jadi popup peta hanya akan menduplikasi isi yang sama sambil menutupi
    // poligon yang baru saja disorot. Peta cukup memberi sorotan garis merah.
    void entry;
  }, [focus]);

  // Pembungkus yang memegang posisi absolut: maplibre-gl.css memaksa `.maplibregl-map`
  // menjadi `position: relative`, jadi container peta sendiri harus diukur dengan h/w penuh.
  return (
    <div className="absolute inset-0">
      <div
        ref={containerRef}
        className="h-full w-full bg-[#EAE7DE]"
        role="application"
        aria-label="Peta kesenjangan digital Indonesia — geser untuk menjelajah, klik kecamatan untuk melihat rinciannya"
      />
    </div>
  );
}
