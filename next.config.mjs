/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["puppeteer", "puppeteer-core", "@sparticuz/chromium", "@prisma/client", "prisma"],
  },
  outputFileTracingExcludes: {
    "*": [
      "node_modules/puppeteer/**/*",
      "node_modules/puppeteer-core/**/*",
      "node_modules/@sparticuz/chromium/**/*",
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), "puppeteer", "puppeteer-core", "@sparticuz/chromium"];
    }
    return config;
  },
};

export default nextConfig;