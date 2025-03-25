/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Removed deprecated serverComponents option
  },
  images: {
    domains: ["files.cdn.printful.com"],
  },
};

module.exports = nextConfig;
