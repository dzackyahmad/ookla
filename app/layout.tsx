import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import './globals.css';

/**
 * Font di-host sendiri, bukan diambil `next/font/google` saat build.
 *
 * Alasannya bukan preferensi: build bersih pernah gagal karena Google menjawab 404
 * untuk berkas woff2 Space Grotesk yang diminta Next (URL-nya sudah dirotasi di sisi
 * Google). Build lokal tetap lolos karena fontnya sudah ter-cache di `.next`, jadi
 * kegagalannya baru muncul di lingkungan bersih seperti Vercel. Dengan berkas ada di
 * repo, build tidak lagi bergantung pada jaringan dan hasilnya bisa diulang.
 *
 * Berkasnya subset latin (96 KB total) — cukup untuk teks Indonesia. Beberapa simbol
 * (Δ ≤ ▾ ◍) memang di luar subset, sama seperti sebelumnya, dan jatuh ke font sistem.
 */
const display = localFont({
  src: './fonts/space-grotesk-latin-var.woff2',
  weight: '500 700',
  style: 'normal',
  variable: '--font-display',
  display: 'swap',
  fallback: ['ui-sans-serif', 'system-ui', 'sans-serif'],
});

const sans = localFont({
  src: './fonts/inter-latin-var.woff2',
  weight: '100 900',
  style: 'normal',
  variable: '--font-sans',
  display: 'swap',
  fallback: ['ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
});

const mono = localFont({
  src: [
    { path: './fonts/ibm-plex-mono-latin-400.woff2', weight: '400', style: 'normal' },
    { path: './fonts/ibm-plex-mono-latin-500.woff2', weight: '500', style: 'normal' },
  ],
  variable: '--font-mono',
  display: 'swap',
  fallback: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
});

export const metadata: Metadata = {
  title: 'Peta Kesenjangan Digital Indonesia',
  description:
    'Peta choropleth 6.695 kecamatan Indonesia menurut indeks kesenjangan digital — GEMASTIK XIX 2026, Divisi Penambangan Data.',
};

export const viewport: Viewport = {
  themeColor: '#9E1B32',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        <div className="flex h-[100dvh] flex-col">
          <div className="h-1 shrink-0 bg-accent" />
          <Header />
          <main className="relative flex-1 overflow-hidden">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
