import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MIRA.APP',
  description: 'Plataforma educativa MIRA',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}

