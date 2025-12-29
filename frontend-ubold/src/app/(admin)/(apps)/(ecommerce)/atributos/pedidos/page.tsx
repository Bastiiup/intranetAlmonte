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

// Helper para extraer datos de pedidos de Strapi (soporta múltiples formatos)
const extractPedidoData = (pedido: any): any => {
  // Strapi v5 puede devolver: { id, documentId, attributes: {...} }
  // O: { data: { id, documentId, attributes } }
  const pedidoReal = pedido.data || pedido
  const attrs = pedidoReal.attributes || {}
  
  // Si tiene attributes, usar esos datos, sino usar el objeto directamente
  const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (pedidoReal as any)
  
  // Extraer campos relevantes para estadísticas
  return {
    estado: data.estado || data.status || 'pendiente',
    fecha_pedido: data.fecha_pedido || data.date_created || null,
    createdAt: data.createdAt || pedidoReal.createdAt || null,
    // Mantener estructura original para compatibilidad
    ...pedidoReal,
    attributes: data,
  }
}

export default async function Page() {
  let pedidos: any[] = []
  let error: string | null = null

  try {
    // Usar API Route para obtener pedidos de Strapi
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
      // Normalizar datos de Strapi para estadísticas y lista
      const pedidosRaw = Array.isArray(data.data) ? data.data : [data.data]
      pedidos = pedidosRaw.map(extractPedidoData)
      console.log('[Pedidos Page] Pedidos obtenidos de Strapi:', pedidos.length)
      console.log('[Pedidos Page] Primer pedido (ejemplo):', JSON.stringify(pedidos[0], null, 2))
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

