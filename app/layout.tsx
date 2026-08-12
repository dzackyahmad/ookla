import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Mono, Inter, Space_Grotesk } from 'next/font/google';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import './globals.css';

const display = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

const sans = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
  display: 'swap',
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
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
