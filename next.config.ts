
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '1drv.ms',
        port: '',
        pathname: '/**',
      }
    ],
  },
  env: {
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    NEXT_PUBLIC_DEV_USER_ID: process.env.NEXT_PUBLIC_DEV_USER_ID,
    // Local LLM configuration
    NEXT_PUBLIC_LLM_MODE: process.env.NEXT_PUBLIC_LLM_MODE,
    LOCAL_LLM_BASE_URL: process.env.LOCAL_LLM_BASE_URL,
    LOCAL_LLM_MODEL_NAME: process.env.LOCAL_LLM_MODEL_NAME,
    // AI Pricing configuration
    PRIMARY_AI_INPUT_COST: process.env.PRIMARY_AI_INPUT_COST,
    PRIMARY_AI_OUTPUT_COST: process.env.PRIMARY_AI_OUTPUT_COST,
    SAFETY_AI_INPUT_COST: process.env.SAFETY_AI_INPUT_COST,
    SAFETY_AI_OUTPUT_COST: process.env.SAFETY_AI_OUTPUT_COST,
  }
};

export default nextConfig;
