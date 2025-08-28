/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: '/', destination: '/dj', permanent: true },
      { source: '/queue', destination: '/dj', permanent: true },
    ];
  },
};

export default nextConfig;
