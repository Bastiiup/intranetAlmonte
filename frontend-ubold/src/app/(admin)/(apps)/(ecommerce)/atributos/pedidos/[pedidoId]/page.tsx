import { Col, Container, Row, Alert } from 'react-bootstrap'
import { headers } from 'next/headers'
import type { Metadata } from 'next'

import BillingDetails from '@/app/(admin)/(apps)/(ecommerce)/orders/[orderId]/components/BillingDetails'
import CustomerDetails from '@/app/(admin)/(apps)/(ecommerce)/orders/[orderId]/components/CustomerDetails'
import OrderSummary from '@/app/(admin)/(apps)/(ecommerce)/orders/[orderId]/components/OrderSummary'
import ShippingActivity from '@/app/(admin)/(apps)/(ecommerce)/orders/[orderId]/components/ShippingActivity'
import ShippingAddress from '@/app/(admin)/(apps)/(ecommerce)/orders/[orderId]/components/ShippingAddress'
import ShipitInfo from '@/app/(admin)/(apps)/(ecommerce)/orders/[orderId]/components/ShipitInfo'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import OrderStatusEditor from './components/OrderStatusEditor'

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ pedidoId: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { pedidoId } = await params
  return {
    title: `Pedido #${pedidoId}`,
  }
}

export default async function Page({ params }: PageProps) {
  const { pedidoId } = await params
  let pedido: any = null
  let strapiPedido: any = null
  let error: string | null = null

  try {
    // Usar API Route como proxy
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseUrl = `${protocol}://${host}`
    
    const response = await fetch(`${baseUrl}/api/tienda/pedidos/${pedidoId}`, {
      cache: 'no-store',
    })
    
    const data = await response.json()
    
    if (data.success && data.data) {
      strapiPedido = data.data
      
      // Mapear pedido de Strapi al formato WooCommerce que esperan los componentes
      const attrs = strapiPedido.attributes || {}
      const pedidoData = (attrs && Object.keys(attrs).length > 0) ? attrs : strapiPedido
      
      // Mapear estado de Strapi (inglés) a formato WooCommerce
      const estado = pedidoData.estado || 'pending'
      
      // Mapear items
      const lineItems = (pedidoData.items || []).map((item: any) => ({
        id: item.item_id || item.id,
        product_id: item.producto_id || item.product_id,
        name: item.nombre || item.name || 'Producto sin nombre',
        quantity: item.cantidad || item.quantity || 1,
        price: String(item.precio_unitario || item.price || 0),
        total: String(item.total || 0),
        sku: item.sku || '',
      }))
      
      pedido = {
        id: pedidoData.wooId || pedidoData.numero_pedido || pedidoId,
        number: pedidoData.numero_pedido || pedidoData.wooId || pedidoId,
        date_created: pedidoData.fecha_pedido || new Date().toISOString(),
        date_paid: estado === 'completed' ? pedidoData.fecha_pedido : null,
        date_completed: estado === 'completed' ? pedidoData.fecha_pedido : null,
        status: estado, // Estados en inglés: pending, processing, completed, cancelled, etc.
        total: String(pedidoData.total || 0),
        subtotal: String(pedidoData.subtotal || 0),
        total_tax: String(pedidoData.impuestos || 0),
        shipping_total: String(pedidoData.envio || 0),
        discount_total: String(pedidoData.descuento || 0),
        currency: pedidoData.moneda || 'CLP',
        billing: pedidoData.billing || {
          first_name: pedidoData.cliente?.nombre?.split(' ')[0] || '',
          last_name: pedidoData.cliente?.nombre?.split(' ').slice(1).join(' ') || '',
          email: pedidoData.cliente?.email || '',
          phone: pedidoData.cliente?.telefono || '',
          address_1: '',
          city: '',
          state: '',
          postcode: '',
          country: 'CL',
        },
        shipping: pedidoData.shipping || pedidoData.billing || {},
        payment_method: pedidoData.metodo_pago || '',
        payment_method_title: pedidoData.metodo_pago_titulo || pedidoData.metodo_pago || '',
        customer_id: pedidoData.cliente?.id || pedidoData.cliente?.documentId || null,
        customer_note: pedidoData.nota_cliente || '',
        line_items: lineItems,
        transaction_id: pedidoData.transaction_id || null,
        // Incluir datos originales de Strapi para el editor de estado
        _strapiData: {
          id: strapiPedido.id || strapiPedido.documentId,
          documentId: strapiPedido.documentId || strapiPedido.id,
          estado: estado,
          numero_pedido: pedidoData.numero_pedido,
        },
        ...pedidoData.rawWooData, // Incluir datos originales de WooCommerce si existen
      }
      
      console.log('[Pedido Details Page] Pedido obtenido y mapeado:', {
        id: pedido.id,
        number: pedido.number,
        status: pedido.status,
      })
    } else {
      error = data.error || 'Error al obtener el pedido'
      console.error('[Pedido Details Page] Error en respuesta:', data)
    }
  } catch (err: any) {
    error = err.message || 'Error al conectar con la API'
    console.error('[Pedido Details Page] Error al obtener pedido:', err)
  }

  if (error || !pedido) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Detalles del Pedido" subtitle="Ecommerce" />
        <Alert variant="danger">
          <strong>Error:</strong> {error || 'Pedido no encontrado'}
          <div className="mt-3">
            <a href="/atributos/pedidos" className="text-decoration-none">
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

      {/* Editor de Estado - Siempre mostrar para permitir cambios */}
      <Row className="mb-3">
        <Col>
          <OrderStatusEditor 
            pedidoId={
              pedido._strapiData?.documentId || 
              pedido._strapiData?.id || 
              strapiPedido?.documentId || 
              strapiPedido?.id || 
              (strapiPedido?.attributes && (strapiPedido.attributes.documentId || strapiPedido.attributes.id)) ||
              pedidoId
            }
            currentStatus={pedido.status || pedido._strapiData?.estado || 'pending'}
          />
        </Col>
      </Row>

      <Row className="justify-content-center">
        <Col xxl={12}>
          <Row>
            <Col xl={9}>
              <OrderSummary pedido={pedido} />

              <ShippingActivity pedido={pedido} />
            </Col>
            <Col xl={3}>
              <CustomerDetails pedido={pedido} />

              <ShipitInfo pedido={pedido} />

              <ShippingAddress pedido={pedido} />

              <BillingDetails pedido={pedido} />
            </Col>
          </Row>
        </Col>
      </Row>
    </Container>
  )
}

