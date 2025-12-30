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
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'strapi.moraleja.cl',
        pathname: '/uploads/**',
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
    ],
    silenceDeprecations: ['legacy-js-api'],
  },
  // Optimizaciones experimentales
  experimental: {
    optimizePackageImports: ['@tanstack/react-table', 'react-bootstrap', 'date-fns'],
  },
  // Headers para permitir Stream Chat (necesita unsafe-eval)
  async headers() {
    return [
      {
        source: '/chat',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.getstream.io https://*.stream-io-api.com",
              "style-src 'self' 'unsafe-inline' https://*.getstream.io",
              "img-src 'self' data: blob: https: http:",
              "font-src 'self' data: https:",
              "connect-src 'self' https://*.getstream.io https://*.stream-io-api.com wss://*.getstream.io ws://*.getstream.io wss://*.stream-io-api.com ws://*.stream-io-api.com",
              "frame-src 'self' https://*.getstream.io",
            ].join('; '),
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.getstream.io https://*.stream-io-api.com",
              "style-src 'self' 'unsafe-inline' https://*.getstream.io",
              "img-src 'self' data: blob: https: http:",
              "font-src 'self' data: https:",
              "connect-src 'self' https://*.getstream.io https://*.stream-io-api.com wss://*.getstream.io ws://*.getstream.io wss://*.stream-io-api.com ws://*.stream-io-api.com",
              "frame-src 'self' https://*.getstream.io",
            ].join('; '),
          },
        ],
      },
    ]
  },
};

export default nextConfig;
