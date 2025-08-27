/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: '/', destination: '/dj', permanent: true },
      { source: '/queue', destination: '/dj', permanent: true },
      { source: '/admin', destination: '/dj/admin', permanent: true },
      { source: '/login', destination: '/dj/login', permanent: true },
    ];
  },
};

export default nextConfig;
