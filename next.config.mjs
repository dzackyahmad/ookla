/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        // Data statis tidak pernah berubah antar deploy kecuali data pack diperbarui.
        source: '/data/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=31536000, stale-while-revalidate=86400' },
        ],
      },
    ];
  },
};

export default nextConfig;
