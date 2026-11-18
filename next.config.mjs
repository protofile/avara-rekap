/** @type {import('next').NextConfig} */
const nextConfig = {
  // Self-contained build (.next/standalone) that runs with `node server.js`,
  // so the cPanel server does not need to run `next build` itself.
  output: "standalone",
  experimental: {
    serverComponentsExternalPackages: ["mysql2"],
  },
};

export default nextConfig;
