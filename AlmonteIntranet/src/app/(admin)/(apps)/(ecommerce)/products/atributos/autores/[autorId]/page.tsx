import { Card, CardBody, Col, Container, Row, Alert } from 'react-bootstrap'
import { headers } from 'next/headers'
import type { Metadata } from 'next'

import AutorDetails from '@/app/(admin)/(apps)/(ecommerce)/products/atributos/autores/[autorId]/components/AutorDetails'
import PageBreadcrumb from '@/components/PageBreadcrumb'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{
    autorId: string
  }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return {
    title: 'Editar Autor - Intranet Almonte',
  }
}

export default async function Page({ params }: PageProps) {
  const { autorId } = await params
  let autor: any = null
  let error: string | null = null

  try {
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseUrl = `${protocol}://${host}`
    
    console.log('[Autor Details Page] Obteniendo autor:', {
      autorId,
      baseUrl,
      url: `${baseUrl}/api/tienda/autores/${autorId}`,
    })
    
    const response = await fetch(`${baseUrl}/api/tienda/autores/${autorId}`, {
      cache: 'no-store',
    })
    
    const data = await response.json()
    
    console.log('[Autor Details Page] Respuesta de API:', {
      success: data.success,
      hasData: !!data.data,
      error: data.error,
    })
    
    if (data.success && data.data) {
      autor = data.data
    } else {
      error = data.error || `Error al obtener autor: ${response.status} ${response.statusText}`
    }
  } catch (err: any) {
    error = err.message || 'Error al conectar con la API'
    console.error('[Autor Details Page] Error al obtener autor:', {
      autorId,
      error: err.message,
      stack: err.stack,
    })
  }

  if (error || !autor) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Editar Autor" subtitle="Ecommerce" />
        <Alert variant="danger">
          <div>
            <strong>Error:</strong> {error || 'Autor no encontrado'}
            <div className="mt-3">
              <h5>¿Qué puedes hacer?</h5>
              <ul>
                <li>
                  <a href="/products/atributos/autores" className="text-decoration-none">
                    Volver a la lista de autores
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
      <PageBreadcrumb title="Autor Details" subtitle="Ecommerce" />

      <Row>
        <Col xs={12}>
          <Card>
            <CardBody>
              <Row>
                <Col xl={12}>
                  <div className="p-4">
                    <AutorDetails autor={autor} autorId={autorId} />
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

