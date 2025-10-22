/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'bucket-infiltragos.s3.us-east-1.amazonaws.com',
      },
    ],
  },
};

export default nextConfig;
