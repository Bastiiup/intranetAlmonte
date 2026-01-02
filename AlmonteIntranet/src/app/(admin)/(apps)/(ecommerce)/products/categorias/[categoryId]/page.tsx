import { Card, CardBody, Col, Container, Row, Alert } from 'react-bootstrap'
import { headers } from 'next/headers'
import type { Metadata } from 'next'

import CategoryDetails from '@/app/(admin)/(apps)/(ecommerce)/products/categorias/[categoryId]/components/CategoryDetails'
import PageBreadcrumb from '@/components/PageBreadcrumb'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{
    categoryId: string
  }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return {
    title: 'Editar Categoría',
  }
}

export default async function Page({ params }: PageProps) {
  const { categoryId } = await params
  let categoria: any = null
  let error: string | null = null

  try {
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseUrl = `${protocol}://${host}`
    
    console.log('[Category Details Page] Obteniendo categoría:', {
      categoryId,
      baseUrl,
      url: `${baseUrl}/api/tienda/categorias/${categoryId}`,
    })
    
    const response = await fetch(`${baseUrl}/api/tienda/categorias/${categoryId}`, {
      cache: 'no-store',
    })
    
    const data = await response.json()
    
    console.log('[Category Details Page] Respuesta de API:', {
      success: data.success,
      hasData: !!data.data,
      error: data.error,
    })
    
    if (data.success && data.data) {
      categoria = data.data
    } else {
      error = data.error || `Error al obtener categoría: ${response.status} ${response.statusText}`
    }
  } catch (err: any) {
    error = err.message || 'Error al conectar con la API'
    console.error('[Category Details Page] Error al obtener categoría:', {
      categoryId,
      error: err.message,
      stack: err.stack,
    })
  }

  if (error || !categoria) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Editar Categoría" subtitle="Ecommerce" />
        <Alert variant="danger">
          <div>
            <strong>Error:</strong> {error || 'Categoría no encontrada'}
            <div className="mt-3">
              <h5>¿Qué puedes hacer?</h5>
              <ul>
                <li>
                  <a href="/products/categorias" className="text-decoration-none">
                    Volver a la lista de categorías
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
      <PageBreadcrumb title="Category Details" subtitle="Ecommerce" />

      <Row>
        <Col xs={12}>
          <Card>
            <CardBody>
              <Row>
                <Col xl={12}>
                  <div className="p-4">
                    <CategoryDetails categoria={categoria} categoryId={categoryId} />
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

