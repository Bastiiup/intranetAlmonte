import { Container, Alert, Card, CardBody, Col, Row } from 'react-bootstrap'
import { headers } from 'next/headers'
import type { Metadata } from 'next'

import PageBreadcrumb from '@/components/PageBreadcrumb'
import ColegioDetails from './components/ColegioDetails'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{
    colegioId: string
  }>
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Editar Establecimiento - MIRA',
  }
}

export default async function Page({ params }: PageProps) {
  const { colegioId } = await params

  let colegio: any = null
  let error: string | null = null

  try {
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseUrl = `${protocol}://${host}`

    const response = await fetch(`${baseUrl}/api/mira/colegios/${encodeURIComponent(colegioId)}`, {
      cache: 'no-store',
    })

    const data = await response.json()

    if (data.success && data.data) {
      colegio = data.data
    } else {
      error = data.error || `Error al obtener establecimiento: ${response.status} ${response.statusText}`
    }
  } catch (err: any) {
    error = err.message || 'Error al conectar con la API'
  }

  if (error || !colegio) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Editar Establecimiento" subtitle="MIRA" />
        <Alert variant="danger">
          <div>
            <strong>Error:</strong> {error || 'Establecimiento no encontrado'}
            <div className="mt-3">
              <h5>¿Qué puedes hacer?</h5>
              <ul>
                <li>
                  <a href="/mira/colegios" className="text-decoration-none">
                    Volver al listado de establecimientos
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
      <PageBreadcrumb title="Editar Establecimiento" subtitle="MIRA" />
      <Row>
        <Col xs={12}>
          <Card>
            <CardBody>
              <Row>
                <Col xl={12}>
                  <div className="p-2 p-md-4">
                    <ColegioDetails colegio={colegio} colegioId={colegioId} />
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

