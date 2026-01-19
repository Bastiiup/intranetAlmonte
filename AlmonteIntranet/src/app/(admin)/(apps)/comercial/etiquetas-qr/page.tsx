import { Container } from 'react-bootstrap'
import { headers } from 'next/headers'
import type { Metadata } from 'next'

import EtiquetasQRListing from '@/app/(admin)/(apps)/comercial/etiquetas-qr/components/EtiquetasQRListing'
import PageBreadcrumb from '@/components/PageBreadcrumb'

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Etiquetas QR',
}

export default async function Page() {
  let pdfs: any[] = []
  let error: string | null = null

  try {
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseUrl = `${protocol}://${host}`

    const response = await fetch(`${baseUrl}/api/comercial/etiquetas-qr`, {
      cache: 'no-store',
    })

    const data = await response.json()

    if (data.success && data.data) {
      pdfs = Array.isArray(data.data) ? data.data : [data.data]
    } else {
      error = data.error || 'Error al obtener PDFs'
    }
  } catch (err: any) {
    error = err.message || 'Error al conectar con la API'
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Etiquetas QR" subtitle="Comercial" />
      <EtiquetasQRListing pdfs={pdfs} error={error} />
    </Container>
  )
}
