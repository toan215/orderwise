/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@orderwise/shared'],
  async rewrites() {
    // Dev proxy: avoid CORS in dev by proxying /api to the Nest API (port 4010).
    return [{ source: '/api/:path*', destination: `${process.env.API_URL ?? 'http://localhost:4010'}/api/:path*` }];
  },
};

export default nextConfig;
