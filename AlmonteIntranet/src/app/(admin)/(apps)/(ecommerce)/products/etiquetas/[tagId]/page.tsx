import { Card, CardBody, Col, Container, Row, Alert } from 'react-bootstrap'
import { headers } from 'next/headers'
import type { Metadata } from 'next'

import TagDetails from '@/app/(admin)/(apps)/(ecommerce)/products/etiquetas/[tagId]/components/TagDetails'
import PageBreadcrumb from '@/components/PageBreadcrumb'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{
    tagId: string
  }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return {
    title: 'Editar Etiqueta',
  }
}

export default async function Page({ params }: PageProps) {
  const { tagId } = await params
  let etiqueta: any = null
  let error: string | null = null

  try {
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseUrl = `${protocol}://${host}`
    
    console.log('[Tag Details Page] Obteniendo etiqueta:', {
      tagId,
      baseUrl,
      url: `${baseUrl}/api/tienda/etiquetas/${tagId}`,
    })
    
    const response = await fetch(`${baseUrl}/api/tienda/etiquetas/${tagId}`, {
      cache: 'no-store',
    })
    
    const data = await response.json()
    
    console.log('[Tag Details Page] Respuesta de API:', {
      success: data.success,
      hasData: !!data.data,
      error: data.error,
    })
    
    if (data.success && data.data) {
      etiqueta = data.data
    } else {
      error = data.error || `Error al obtener etiqueta: ${response.status} ${response.statusText}`
    }
  } catch (err: any) {
    error = err.message || 'Error al conectar con la API'
    console.error('[Tag Details Page] Error al obtener etiqueta:', {
      tagId,
      error: err.message,
      stack: err.stack,
    })
  }

  if (error || !etiqueta) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Editar Etiqueta" subtitle="Ecommerce" />
        <Alert variant="danger">
          <div>
            <strong>Error:</strong> {error || 'Etiqueta no encontrada'}
            <div className="mt-3">
              <h5>¿Qué puedes hacer?</h5>
              <ul>
                <li>
                  <a href="/products/etiquetas" className="text-decoration-none">
                    Volver a la lista de etiquetas
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </Alert>
      </Container>
    )
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Tag Details" subtitle="Ecommerce" />

      <Row>
        <Col xs={12}>
          <Card>
            <CardBody>
              <Row>
                <Col xl={12}>
                  <div className="p-4">
                    <TagDetails etiqueta={etiqueta} />
                  </div>
                </Col>
              </Row>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </Container>
  )
}

