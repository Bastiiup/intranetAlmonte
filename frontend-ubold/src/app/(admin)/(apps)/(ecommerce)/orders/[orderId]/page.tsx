import { Col, Container, Row, Alert } from 'react-bootstrap'
import { headers } from 'next/headers'
import type { Metadata } from 'next'

import BillingDetails from '@/app/(admin)/(apps)/(ecommerce)/orders/[orderId]/components/BillingDetails'
import CustomerDetails from '@/app/(admin)/(apps)/(ecommerce)/orders/[orderId]/components/CustomerDetails'
import OrderSummary from '@/app/(admin)/(apps)/(ecommerce)/orders/[orderId]/components/OrderSummary'
import ShippingActivity from '@/app/(admin)/(apps)/(ecommerce)/orders/[orderId]/components/ShippingActivity'
import ShippingAddress from '@/app/(admin)/(apps)/(ecommerce)/orders/[orderId]/components/ShippingAddress'
import PageBreadcrumb from '@/components/PageBreadcrumb'

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ orderId: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { orderId } = await params
  return {
    title: `Pedido #${orderId}`,
  }
}

export default async function Page({ params }: PageProps) {
  const { orderId } = await params
  let pedido: any = null
  let error: string | null = null

  try {
    // Usar API Route como proxy
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseUrl = `${protocol}://${host}`
    
    const response = await fetch(`${baseUrl}/api/woocommerce/orders/${orderId}`, {
      cache: 'no-store',
    })
    
    const data = await response.json()
    
    if (data.success && data.data) {
      pedido = data.data
      console.log('[Order Details Page] Pedido obtenido:', {
        id: pedido.id,
        number: pedido.number,
        status: pedido.status,
      })
    } else {
      error = data.error || 'Error al obtener el pedido'
      console.error('[Order Details Page] Error en respuesta:', data)
    }
  } catch (err: any) {
    error = err.message || 'Error al conectar con la API'
    console.error('[Order Details Page] Error al obtener pedido:', err)
  }

  if (error || !pedido) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Detalles del Pedido" subtitle="Ecommerce" />
        <Alert variant="danger">
          <strong>Error:</strong> {error || 'Pedido no encontrado'}
          <div className="mt-3">
            <a href="/orders" className="text-decoration-none">
              Volver a la lista de pedidos
            </a>
          </div>
        </Alert>
      </Container>
    )
  }

  return (
    <Container fluid>
      <PageBreadcrumb title={`Pedido #${pedido.number || pedido.id}`} subtitle="Ecommerce" />

      <Row className="justify-content-center">
        <Col xxl={12}>
          <Row>
            <Col xl={9}>
              <OrderSummary pedido={pedido} />

              <ShippingActivity pedido={pedido} />
            </Col>
            <Col xl={3}>
              <CustomerDetails pedido={pedido} />

              <ShippingAddress pedido={pedido} />

              <BillingDetails pedido={pedido} />
            </Col>
          </Row>
        </Col>
      </Row>
    </Container>
  )
}
