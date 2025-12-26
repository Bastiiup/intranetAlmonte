import { Container, Row, Col } from 'react-bootstrap'
import { headers } from 'next/headers'
import type { Metadata } from 'next'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import EtiquetaDetails from './components/EtiquetaDetails'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Detalles de Etiqueta - Intranet Almonte',
}

export default async function Page({ params }: { params: Promise<{ etiquetaId: string }> }) {
  const { etiquetaId } = await params
  let etiqueta: any = null
  let error: string | null = null

  try {
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseUrl = `${protocol}://${host}`
    
    const response = await fetch(`${baseUrl}/api/tienda/etiquetas/${etiquetaId}`, {
      cache: 'no-store',
    })
    
    const data = await response.json()
    
    if (data.success && data.data) {
      etiqueta = data.data
    } else {
      error = data.error || 'Error al obtener la etiqueta'
    }
  } catch (err: any) {
    error = err.message || 'Error al conectar con la API'
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Detalles de Etiqueta" subtitle="Ecommerce" />
      <Row>
        <Col xxl={10} xl={12}>
          <EtiquetaDetails etiqueta={etiqueta} etiquetaId={etiquetaId} error={error} />
        </Col>
      </Row>
    </Container>
  )
}

