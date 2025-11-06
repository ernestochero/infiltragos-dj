/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['nodemailer', 'qrcode'],
  },
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
