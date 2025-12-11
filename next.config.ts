import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // basePath: "/TTS-Mimosa-App",
  output: "export",
  reactStrictMode: true,

  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "www.pngmart.com" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "static.inaturalist.org" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "blogger.googleusercontent.com" },
    ],
  },

  reactCompiler: true,

  webpack: (config) => {
    // Correção necessária para sql.js
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
    };

    return config;
  },
};

export default nextConfig;
