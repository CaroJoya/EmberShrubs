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
};

export default nextConfig;