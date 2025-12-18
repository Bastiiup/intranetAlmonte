import { Col, Container, Row } from 'react-bootstrap'
import { headers } from 'next/headers'
import type { Metadata } from 'next'

import OrdersStats from '@/app/(admin)/(apps)/(ecommerce)/orders/components/OrdersStats'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import OrdersList from './components/OrdersList'

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Pedidos',
}

export default async function Page() {
  let pedidos: any[] = []
  let error: string | null = null

  try {
    // Usar API Route como proxy (igual que productos)
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseUrl = `${protocol}://${host}`
    
    const response = await fetch(`${baseUrl}/api/woocommerce/orders?per_page=100&status=any`, {
      cache: 'no-store', // Forzar fetch dinámico
    })
    
    const data = await response.json()
    
    if (data.success && data.data) {
      pedidos = Array.isArray(data.data) ? data.data : [data.data]
      console.log('[Orders Page] Pedidos obtenidos:', pedidos.length)
    } else {
      error = data.error || 'Error al obtener pedidos'
      console.error('[Orders Page] Error en respuesta:', data)
    }
  } catch (err: any) {
    error = err.message || 'Error al conectar con la API'
    console.error('[Orders Page] Error al obtener pedidos:', err)
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Pedidos" subtitle="Ecommerce" />

      <OrdersStats pedidos={pedidos} />

      <Row>
        <Col cols={12}>
          <OrdersList pedidos={pedidos} error={error} />
        </Col>
      </Row>
    </Container>
  )
}
