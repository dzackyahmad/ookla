import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        page: '#F6F4EF',
        accent: '#9E1B32',
        'accent-dark': '#6E1423',
        ink: '#1B2430',
        muted: '#6B7280',
        // Untuk teks di atas latar krem kontrol tersegmen (#F1EEE7): `muted` hanya 4,17:1
        // di sana, di bawah ambang AA.
        'muted-strong': '#5C6472',
        panel: '#FFFFFF',
        'panel-border': '#E2DED5',
        uncertain: '#A8A29E',
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        sans: ['var(--font-sans)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      boxShadow: {
        panel: '0 4px 18px rgba(20,20,20,0.10)',
        card: '0 3px 12px rgba(20,20,20,0.08)',
      },
    },
  },
  plugins: [],
};

export default config;
