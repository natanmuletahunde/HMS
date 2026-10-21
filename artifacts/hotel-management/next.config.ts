import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  outputFileTracingRoot: path.resolve(__dirname),
  serverExternalPackages: ["fayda-decoder", "sharp"],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        sharp: false,
      };
      config.resolve.fallback = {
        ...config.resolve.fallback,
        sharp: false,
        "detect-libc": false,
        child_process: false,
        fs: false,
        net: false,
        tls: false,
        module: false,
        path: false,
        os: false,
        crypto: false,
        stream: false,
        buffer: false,
        zlib: false,
        http: false,
        https: false,
        util: false,
      };
    }
    return config;
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
      "@radix-ui/react-toast",
      "@radix-ui/react-avatar",
      "@radix-ui/react-label",
      "@radix-ui/react-progress",
      "@radix-ui/react-separator",
      "@radix-ui/react-slot",
    ],
  },
  async rewrites() {
    const apiInternalUrl = process.env.API_INTERNAL_URL;
    if (!apiInternalUrl) return [];

    return [
      {
        source: "/api/:path*",
        destination: `${apiInternalUrl}/api/:path*`,
      },
    ];
  },
  // Allow Replit proxy origins (including the internal 127.0.0.1 loopback)
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    "*.replit.dev",
    "*.worf.replit.dev",
    "*.replit.app",
    "*.repl.co",
  ],
};

export default nextConfig;
