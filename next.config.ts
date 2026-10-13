import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Evitar output standalone en Vercel para prevenir error ENOENT en next-server.js.nft.json
  ...(process.env.BUILD_STANDALONE === "true" ? { output: "standalone" } : {}),
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
