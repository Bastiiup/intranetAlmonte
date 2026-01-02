import { Card, CardBody, Col, Container, Row, Alert } from 'react-bootstrap'
import { headers } from 'next/headers'
import type { Metadata } from 'next'

import ColeccionDetails from '@/app/(admin)/(apps)/(ecommerce)/products/atributos/colecciones/[coleccionId]/components/ColeccionDetails'
import PageBreadcrumb from '@/components/PageBreadcrumb'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{
    coleccionId: string
  }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return {
    title: 'Editar Colección - Intranet Almonte',
  }
}

export default async function Page({ params }: PageProps) {
  const { coleccionId } = await params
  let coleccion: any = null
  let error: string | null = null

  try {
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseUrl = `${protocol}://${host}`
    
    console.log('[Colección Details Page] Obteniendo colección:', {
      coleccionId,
      baseUrl,
      url: `${baseUrl}/api/tienda/colecciones/${coleccionId}`,
    })
    
    const response = await fetch(`${baseUrl}/api/tienda/colecciones/${coleccionId}`, {
      cache: 'no-store',
    })
    
    const data = await response.json()
    
    console.log('[Colección Details Page] Respuesta de API:', {
      success: data.success,
      hasData: !!data.data,
      error: data.error,
    })
    
    if (data.success && data.data) {
      coleccion = data.data
    } else {
      error = data.error || `Error al obtener colección: ${response.status} ${response.statusText}`
    }
  } catch (err: any) {
    error = err.message || 'Error al conectar con la API'
    console.error('[Colección Details Page] Error al obtener colección:', {
      coleccionId,
      error: err.message,
      stack: err.stack,
    })
  }

  if (error || !coleccion) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Editar Colección" subtitle="Ecommerce" />
        <Alert variant="danger">
          <div>
            <strong>Error:</strong> {error || 'Colección no encontrada'}
            <div className="mt-3">
              <h5>¿Qué puedes hacer?</h5>
              <ul>
                <li>
                  <a href="/products/atributos/colecciones" className="text-decoration-none">
                    Volver a la lista de colecciones
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
      <PageBreadcrumb title="Colección Details" subtitle="Ecommerce" />

      <Row>
        <Col xs={12}>
          <Card>
            <CardBody>
              <Row>
                <Col xl={12}>
                  <div className="p-4">
                    <ColeccionDetails coleccion={coleccion} coleccionId={coleccionId} />
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

