import { Col, Container, Row } from 'react-bootstrap'
import { headers } from 'next/headers'
import type { Metadata } from 'next'

import OrdersStats from '@/app/(admin)/(apps)/(ecommerce)/orders/components/OrdersStats'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import PedidosListing from '@/app/(admin)/(apps)/(ecommerce)/atributos/pedidos/components/PedidosListing'

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Pedidos',
}

export default async function Page() {
  let pedidos: any[] = []
  let error: string | null = null

  try {
    // Usar API Route para obtener pedidos de Strapi - PedidosListing maneja el mapeo
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseUrl = `${protocol}://${host}`
    
    // Por defecto incluir pedidos ocultos para mostrarlos todos
    const response = await fetch(`${baseUrl}/api/tienda/pedidos?includeHidden=true`, {
      cache: 'no-store', // Forzar fetch dinámico
    })
    
    const data = await response.json()
    
    if (data.success && data.data) {
      // PedidosListing espera los datos de Strapi directamente, no necesita mapeo
      pedidos = Array.isArray(data.data) ? data.data : [data.data]
      console.log('[Pedidos Page] Pedidos obtenidos de Strapi:', pedidos.length)
    } else {
      error = data.error || 'Error al obtener pedidos'
      console.error('[Pedidos Page] Error en respuesta:', data)
    }
  } catch (err: any) {
    error = err.message || 'Error al conectar con la API'
    console.error('[Pedidos Page] Error al obtener pedidos:', err)
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Pedidos" subtitle="Ecommerce" />

      <OrdersStats pedidos={pedidos} />

      <Row>
        <Col xs={12}>
          <PedidosListing pedidos={pedidos} error={error} />
        </Col>
      </Row>
    </Container>
  )
}

