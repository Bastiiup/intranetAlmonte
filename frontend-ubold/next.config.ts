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
  // IMPORTANTE: Este CSP debe incluir 'unsafe-eval' para que Stream Chat funcione
  async headers() {
    const cspValue = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.getstream.io https://*.stream-io-api.com https://getstream.io",
      "style-src 'self' 'unsafe-inline' https://*.getstream.io",
      "img-src 'self' data: blob: https: http:",
      "font-src 'self' data: https:",
      "connect-src 'self' https://*.getstream.io https://*.stream-io-api.com https://getstream.io wss://*.getstream.io ws://*.getstream.io wss://*.stream-io-api.com ws://*.stream-io-api.com wss://chat.stream-io-api.com",
      "frame-src 'self' https://*.getstream.io",
      "worker-src 'self' blob:",
      "child-src 'self' blob:",
    ].join('; ')

    return [
      {
        // Aplicar a todas las rutas para asegurar que funcione
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspValue,
          },
          // También agregar como header adicional para mayor compatibilidad
          {
            key: 'X-Content-Security-Policy',
            value: cspValue,
          },
        ],
      },
    ]
  },
};

export default nextConfig;
