import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  transpilePackages: ["@gorth/primitive"],

  devIndicators: false,
};

export default nextConfig;
