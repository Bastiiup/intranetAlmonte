import { Col, Container, Row } from 'react-bootstrap'
import { headers } from 'next/headers'
import type { Metadata } from 'next'

import OrdersStats from '@/app/(admin)/(apps)/(ecommerce)/orders/components/OrdersStats'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import OrdersList from '@/app/(admin)/(apps)/(ecommerce)/orders/components/OrdersList'

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Pedidos',
}

export default async function Page() {
  let pedidos: any[] = []
  let error: string | null = null

  try {
    // Usar API Route como proxy - mapear pedidos de Strapi al formato de WooCommerce para OrdersList
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
      const strapiPedidos = Array.isArray(data.data) ? data.data : [data.data]
      
      // Mapear pedidos de Strapi al formato de WooCommerce que espera OrdersList
      pedidos = strapiPedidos.map((pedido: any) => {
        const attrs = pedido.attributes || {}
        const pedidoData = (attrs && Object.keys(attrs).length > 0) ? attrs : pedido
        
        // Obtener documentId o id de Strapi (necesario para la URL)
        const documentId = pedido.documentId || pedido.id || pedidoData.documentId || pedidoData.id
        
        // Mapear estado de Strapi (inglés) a formato WooCommerce
        const estado = pedidoData.estado || 'pending'
        
        // Priorizar numero_pedido, luego wooId, y finalmente documentId como último recurso
        const numeroPedido = pedidoData.numero_pedido || pedidoData.wooId || null
        const displayId = numeroPedido ? String(numeroPedido) : documentId
        
        return {
          id: documentId, // Usar documentId de Strapi para el link (necesario para la API)
          number: numeroPedido ? String(numeroPedido) : documentId,
          displayId: displayId, // ID para mostrar en la tabla (priorizar numero_pedido o wooId)
          date_created: pedidoData.fecha_pedido || new Date().toISOString(),
          status: estado, // Estados en inglés: pending, processing, completed, cancelled, etc.
          total: String(pedidoData.total || 0),
          billing: pedidoData.billing || {
            first_name: pedidoData.cliente?.nombre || '',
            last_name: '',
            email: pedidoData.cliente?.email || '',
          },
          payment_method: pedidoData.metodo_pago || '',
          payment_method_title: pedidoData.metodo_pago_titulo || '',
          date_paid: estado === 'completed' ? pedidoData.fecha_pedido : null,
          line_items: pedidoData.items || [],
          _strapiDocumentId: documentId, // Guardar documentId para referencia
          ...pedidoData.rawWooData, // Incluir datos originales de WooCommerce si existen
        }
      })
      
      console.log('[Pedidos Page] Pedidos obtenidos y mapeados:', pedidos.length)
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
        <Col cols={12}>
          <OrdersList pedidos={pedidos} error={error} basePath="/atributos/pedidos" />
        </Col>
      </Row>
    </Container>
  )
}

