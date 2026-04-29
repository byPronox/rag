/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: process.env.NODE_ENV === 'development',
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['*.vusercontent.net', '*.dev-vm.vusercontent.net'],
    },
  },
};

export default nextConfig;