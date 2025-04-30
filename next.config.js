/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  basePath: "/cosmic",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "files.cdn.printful.com",
      },
    ],
  },
  // Add webpack configuration to handle crypto module in edge runtime
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Replace crypto with empty module for client-side
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
