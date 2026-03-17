/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Allow external images from Supabase storage and Unsplash
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pvnsirpfofxklqgxwdiz.supabase.co",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
    // High quality image optimization
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
