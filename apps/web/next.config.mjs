/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
  devIndicators: false,
  transpilePackages: ['@gtcs/shared'],
};

export default nextConfig;
