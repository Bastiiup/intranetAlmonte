import { Container, Row, Col, Card, CardBody, CardHeader, Alert } from 'react-bootstrap'
import { headers } from 'next/headers'
import type { Metadata } from 'next'
import Link from 'next/link'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import ClienteDetailStats from './components/ClienteDetailStats'
import ClientePedidos from './components/ClientePedidos'
import ClienteInfo from './components/ClienteInfo'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  return {
    title: `Detalle Cliente ${id}`,
  }
}

export default async function ClienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let cliente: any = null
  let pedidos: any[] = []
  let error: string | null = null

  try {
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseUrl = `${protocol}://${host}`

    // Obtener cliente
    const clienteResponse = await fetch(`${baseUrl}/api/woocommerce/customers/${id}`, {
      cache: 'no-store',
    })

    const clienteData = await clienteResponse.json()

    if (clienteData.success && clienteData.data) {
      cliente = clienteData.data
    } else {
      error = clienteData.error || 'Cliente no encontrado'
    }

    // Obtener pedidos del cliente si el cliente existe
    if (cliente && !error) {
      try {
        const pedidosResponse = await fetch(
          `${baseUrl}/api/woocommerce/orders?customer_id=${id}&per_page=100&status=any`,
          {
            cache: 'no-store',
          }
        )

        const pedidosData = await pedidosResponse.json()

        if (pedidosData.success && pedidosData.data) {
          pedidos = Array.isArray(pedidosData.data) ? pedidosData.data : [pedidosData.data]
          // Ordenar por fecha más reciente primero
          pedidos.sort((a: any, b: any) => {
            const dateA = new Date(a.date_created).getTime()
            const dateB = new Date(b.date_created).getTime()
            return dateB - dateA
          })
        }
      } catch (pedidosError: any) {
        console.error('[ClienteDetailPage] Error al obtener pedidos:', pedidosError.message)
        // No fallar si no se pueden obtener pedidos
      }
    }
  } catch (err: any) {
    error = err.message || 'Error al conectar con la API'
    console.error('[ClienteDetailPage] Error:', err)
  }

  if (error || !cliente) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Detalle Cliente" subtitle="Ecommerce" />
        <Row>
          <Col xxl={12}>
            <Alert variant="danger">
              <strong>Error:</strong> {error || 'Cliente no encontrado'}
              <br />
              <Link href="/clientes" className="btn btn-sm btn-primary mt-2">
                Volver a Clientes
              </Link>
            </Alert>
          </Col>
        </Row>
      </Container>
    )
  }

  const clienteNombre = `${cliente.first_name || ''} ${cliente.last_name || ''}`.trim() || cliente.email || 'Sin nombre'

  return (
    <Container fluid>
      <PageBreadcrumb title={`Cliente: ${clienteNombre}`} subtitle="Ecommerce" />

      <Row className="mb-3">
        <Col xxl={12}>
          <Link href="/clientes" className="btn btn-sm btn-outline-secondary mb-3">
            ← Volver a Clientes
          </Link>
        </Col>
      </Row>

      {/* Información del Cliente */}
      <Row className="mb-3">
        <Col xxl={12}>
          <ClienteInfo cliente={cliente} />
        </Col>
      </Row>

      {/* Métricas del Cliente */}
      <Row className="mb-3">
        <Col xxl={12}>
          <ClienteDetailStats cliente={cliente} pedidos={pedidos} />
        </Col>
      </Row>

      {/* Pedidos del Cliente */}
      <Row>
        <Col xxl={12}>
          <ClientePedidos cliente={cliente} pedidos={pedidos} />
        </Col>
      </Row>
    </Container>
  )
}

