import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // reactStrictMode: false,
  output: 'standalone', // Optimiza para producción en Railway
  // Optimizaciones de compilación
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  // Optimizaciones de build
  // SWC es el minificador por defecto en Next.js 16+ (swcMinify fue removido)
  poweredByHeader: false,
  compress: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'strapi.moraleja.cl',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'staging.escolar.cl',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'escolar.cl',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.escolar.cl',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'staging.moraleja.cl',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'moraleja.cl',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.moraleja.cl',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.wp.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.wordpress.com',
        pathname: '/**',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard',
        permanent: false,
      },
    ];
  },
  sassOptions: {
    includePaths: [
      './src/assets/scss',
      './node_modules/bootstrap/scss',
      './node_modules',
    ],
    silenceDeprecations: ['legacy-js-api'],
  },
  // Optimizaciones experimentales
  experimental: {
    optimizePackageImports: [
      '@tanstack/react-table', 
      'react-bootstrap', 
      'date-fns',
      'react-icons',
      'lodash',
      'bootstrap',
    ],
  },
  // Typed routes (movido fuera de experimental en Next.js 16)
  typedRoutes: false,
  // Configuración de webpack para resolver problemas con pdfjs-dist y canvas
  webpack: (config, { isServer }) => {
    // Ignorar el módulo 'canvas' en el cliente (solo se necesita en el servidor)
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
      };
    }
    // Ignorar canvas también en el servidor para evitar problemas de build
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };
    return config;
  },
  // Configuración de Turbopack para silenciar warning en desarrollo local
  // En producción (Railway) se usa webpack, así que esto no afecta el build
  turbopack: {},
  // Headers CSP únicos para Stream Chat (necesita unsafe-eval)
  // IMPORTANTE: Solo debe haber un CSP, configurado aquí en next.config.ts
  async headers() {
    const cspValue = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.getstream.io https://*.stream-io-api.com",
      "connect-src 'self' https://*.getstream.io https://*.stream-io-api.com wss://*.getstream.io wss://*.stream-io-api.com wss://chat.stream-io-api.com",
      "img-src 'self' data: blob: https: http: https://*.getstream.io https://ui-avatars.com https://strapi.moraleja.cl",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "worker-src 'self' blob:",
      "frame-src 'self' https://*.getstream.io"
    ].join('; ')

    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspValue
          }
        ],
      },
    ]
  },
};

export default nextConfig;
