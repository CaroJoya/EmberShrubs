// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['lh3.googleusercontent.com', 'firebasestorage.googleapis.com'],
  },
  env: {
    NEXT_PUBLIC_APP_NAME: 'EmberShrubs',
  },
  // ✅ Tell Next.js these modules are server-only
  serverExternalPackages: ['firebase-admin'],
  // ✅ Webpack config to handle node modules
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't resolve 'fs', 'net', etc. on client
      config.resolve.fallback = {
        fs: false,
        net: false,
        tls: false,
        http2: false,
        dns: false,
        child_process: false,
        'node:fs': false,
        'node:net': false,
        'node:tls': false,
        'node:http2': false,
        'node:dns': false,
        'node:child_process': false,
        'node:buffer': false,
        'node:crypto': false,
        'node:events': false,
        'node:https': false,
        'node:url': false,
        'node:stream': false,
        'node:zlib': false,
        'node:path': false,
        'node:os': false,
      };
    }
    return config;
  },
};

export default nextConfig;