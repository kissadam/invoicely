/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["puppeteer", "@prisma/client", "prisma"],
  experimental: {
    serverComponentsExternalPackages: ["puppeteer", "@prisma/client", "prisma"],
  },
};

export default nextConfig;