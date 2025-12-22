import { Card, CardBody, Col, Container, Row, Alert } from 'react-bootstrap'
import { headers } from 'next/headers'
import type { Metadata } from 'next'

import ClienteDetails from '@/app/(admin)/(apps)/(ecommerce)/clientes/[clienteId]/components/ClienteDetails'
import PageBreadcrumb from '@/components/PageBreadcrumb'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{
    clienteId: string
  }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return {
    title: 'Editar Cliente - Intranet Almonte',
  }
}

export default async function Page({ params }: PageProps) {
  const { clienteId } = await params
  let cliente: any = null
  let error: string | null = null

  try {
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseUrl = `${protocol}://${host}`
    
    console.log('[Cliente Details Page] Obteniendo cliente:', {
      clienteId,
      baseUrl,
      url: `${baseUrl}/api/tienda/clientes/${clienteId}`,
    })
    
    const response = await fetch(`${baseUrl}/api/tienda/clientes/${clienteId}`, {
      cache: 'no-store',
    })
    
    const data = await response.json()
    
    console.log('[Cliente Details Page] Respuesta de API:', {
      success: data.success,
      hasData: !!data.data,
      error: data.error,
    })
    
    if (data.success && data.data) {
      cliente = data.data
    } else {
      error = data.error || `Error al obtener cliente: ${response.status} ${response.statusText}`
    }
  } catch (err: any) {
    error = err.message || 'Error al conectar con la API'
    console.error('[Cliente Details Page] Error al obtener cliente:', {
      clienteId,
      error: err.message,
      stack: err.stack,
    })
  }

  if (error || !cliente) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Editar Cliente" subtitle="Ecommerce" />
        <Alert variant="danger">
          <div>
            <strong>Error:</strong> {error || 'Cliente no encontrado'}
            <div className="mt-3">
              <h5>¿Qué puedes hacer?</h5>
              <ul>
                <li>
                  <a href="/clientes" className="text-decoration-none">
                    Volver a la lista de clientes
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
      <PageBreadcrumb title="Editar Cliente" subtitle="Ecommerce" />

      <Row>
        <Col xs={12}>
          <Card>
            <CardBody>
              <Row>
                <Col xl={12}>
                  <div className="p-4">
                    <ClienteDetails cliente={cliente} clienteId={clienteId} />
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

