'use client';

import { useEffect, useMemo, useRef } from 'react';
import KecamatanCard from './KecamatanCard';
import Sparkline from './Sparkline';
import { buildCardData } from '@/lib/card';
import { formatIndeks, formatInt, formatKecepatan } from '@/lib/format';
import { labelPopulasi } from '@/lib/labels';
import type { Kategori, Top50Item, UrutanPrioritas } from '@/lib/types';

const URUTAN: { nilai: UrutanPrioritas; label: string; keterangan: string }[] = [
  {
    nilai: 'indeks',
    label: 'Indeks',
    keterangan: 'Seberapa tertinggal kecamatannya, tanpa memandang berapa orang yang tinggal di sana.',
  },
  {
    nilai: 'populasi',
    label: 'Penduduk',
    keterangan: 'Berapa banyak orang yang terkena dampaknya — kecamatan padat naik ke atas.',
  },
];

export default function RankedList({
  items,
  selectedGid,
  urutan,
  activeCategories,
  onUrutanChange,
  onSelect,
  className = '',
}: {
  items: Top50Item[];
  selectedGid: string | null;
  urutan: UrutanPrioritas;
  activeCategories: Kategori[];
  onUrutanChange: (urutan: UrutanPrioritas) => void;
  onSelect: (item: Top50Item) => void;
  className?: string;
}) {
  // Urutan indeks dipertahankan apa adanya dari berkas prioritas; urutan penduduk
  // hanya menyusun ulang daftar yang sama, tidak pernah menambah kecamatan baru.
  const terurut = useMemo(() => {
    if (urutan === 'indeks') return items;
    return [...items].sort((a, b) => (b.populasi ?? -1) - (a.populasi ?? -1));
  }, [items, urutan]);

  const aktif = URUTAN.find((u) => u.nilai === urutan) ?? URUTAN[0];

  const kategoriTersembunyi = useMemo(() => {
    const dipakai = new Set(items.map((i) => i.kategori as Kategori));
    return [...dipakai].filter((k) => !activeCategories.includes(k));
  }, [items, activeCategories]);

  // Kartu yang baru terbuka bisa berada jauh di bawah area yang terlihat — terutama
  // saat pemilihan datang dari klik poligon di peta, bukan dari daftar.
  const itemTerpilihRef = useRef<HTMLLIElement | null>(null);
  useEffect(() => {
    if (!selectedGid) return;
    itemTerpilihRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedGid, urutan]);

  return (
    <div className={`flex min-h-0 flex-col ${className}`}>
      <div className="border-b border-panel-border px-4 pb-2.5 pt-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-display text-[14px] font-bold">{formatInt(items.length)} kecamatan prioritas</h2>
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <span className="text-[10.5px] text-muted">Urutkan:</span>
          <div className="flex gap-0.5 rounded-md bg-[#F1EEE7] p-[2px]" role="radiogroup" aria-label="Urutan prioritas">
            {URUTAN.map((u) => (
              <button
                key={u.nilai}
                type="button"
                role="radio"
                aria-checked={urutan === u.nilai}
                onClick={() => onUrutanChange(u.nilai)}
                className={`rounded px-2 py-[3px] text-[11px] font-semibold transition-colors ${
                  urutan === u.nilai
                    ? 'bg-white text-ink shadow-[0_1px_2px_rgba(0,0,0,0.08)]'
                    : 'text-muted-strong hover:text-ink'
                }`}
              >
                {u.label}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-1.5 text-[10.5px] leading-[1.45] text-muted">{aktif.keterangan}</p>

        {/* Daftar ini tidak ikut filter kategori peta. Kalau kategorinya sedang
            disembunyikan, klik item akan terbang ke poligon yang tak terlihat —
            jadi keadaannya dijelaskan, bukan dibiarkan membingungkan. */}
        {kategoriTersembunyi.length > 0 && (
          <p className="mt-2 rounded-md border border-[#F0D4D4] bg-[#FBEFEF] px-2 py-1.5 text-[10.5px] leading-[1.45] text-accent-dark">
            Kategori {kategoriTersembunyi.map((k) => `"${k}"`).join(', ')} sedang disembunyikan di peta, jadi kecamatan
            di daftar ini tidak tampak di sana.
          </p>
        )}
      </div>

      <ul className="thin-scroll min-h-0 flex-1 overflow-y-auto">
        {terurut.map((item, i) => {
          const dipilih = item.GID_3 !== null && item.GID_3 === selectedGid;
          const populasi = labelPopulasi(item.populasi);
          const data = buildCardData(null, item);
          return (
            <li
              key={item.GID_3 ?? `${item.rank}-${item.kecamatan}`}
              ref={dipilih ? itemTerpilihRef : undefined}
              className="border-b border-[#F1EFE9]"
            >
              <button
                type="button"
                onClick={() => onSelect(item)}
                aria-expanded={dipilih}
                className={`flex w-full items-start gap-2.5 px-4 py-2.5 text-left transition-colors ${
                  dipilih ? 'bg-[#FBEFEF]' : 'hover:bg-[#FBF8F3]'
                }`}
              >
                <span
                  className={`mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[10.5px] font-bold ${
                    urutan === 'indeks' ? 'bg-accent text-white' : 'bg-[#EDE8DD] text-[#6A6255]'
                  }`}
                >
                  {urutan === 'indeks' ? item.rank : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[12.5px] font-semibold">{item.kecamatan}</b>
                  <span className="block truncate text-[10.5px] text-muted">
                    {item.kabupaten}, {item.provinsi}
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5 font-mono text-[10.5px] text-accent-dark">
                    <span>{formatKecepatan(item.kecepatan_final)}</span>
                    <span className="text-muted">·</span>
                    <span className={populasi.tercatat ? '' : 'italic text-muted'}>
                      {populasi.tercatat ? populasi.teks : 'penduduk tidak tercatat'}
                    </span>
                    {urutan === 'indeks' && (
                      <>
                        <span className="text-muted">·</span>
                        <span className="text-muted">indeks {formatIndeks(item.indeks_kesenjangan_final)}</span>
                      </>
                    )}
                  </span>
                </span>
                {item.tren && item.tren.some((v) => v !== null) && (
                  <Sparkline tren={item.tren} width={52} height={22} compact showStrip={false} className="mt-1.5 shrink-0" />
                )}
              </button>

              {/* Kartu penuh muncul di tempat saat item dipilih — tidak perlu bolak-balik
                  ke popup peta untuk membaca alasannya. */}
              {dipilih && data && (
                <div className="border-t border-[#F1EFE9] bg-white px-4 py-3">
                  <KecamatanCard data={data} variant="panel" />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <p className="hidden border-t border-panel-border px-4 py-2 text-[10.5px] leading-[1.45] text-muted lg:block">
        Daftar ini memakai berkas prioritas v2 apa adanya — kecamatan berdata tipis sengaja tidak diikutkan supaya tidak
        naik ke puncak hanya karena ketidakpastiannya.
      </p>
    </div>
  );
}
