/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: "/printful",
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "files.cdn.printful.com",
      },
    ],
  },
};

module.exports = nextConfig;
