import { Col, Container, Row } from 'react-bootstrap'
import { headers, cookies } from 'next/headers'
import type { Metadata } from 'next'

import PageBreadcrumb from '@/components/PageBreadcrumb'
import PedidosListing from './components/PedidosListing'

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
    
    // Obtener cookies del servidor para pasarlas al fetch interno
    const cookieStore = await cookies()
    const cookieString = cookieStore.getAll()
      .map(cookie => `${cookie.name}=${cookie.value}`)
      .join('; ')
    
    // Por defecto incluir pedidos ocultos para mostrarlos todos
    const response = await fetch(`${baseUrl}/api/tienda/pedidos?includeHidden=true`, {
      cache: 'no-store', // Forzar fetch dinámico
      headers: {
        'Cookie': cookieString, // Pasar cookies al fetch interno
      },
    })
    
    const data = await response.json()
    
    if (data.success && data.data) {
      pedidos = Array.isArray(data.data) ? data.data : [data.data]
      console.log('[Pedidos Page] Pedidos obtenidos:', pedidos.length)
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

      <Row>
        <Col cols={12}>
          <PedidosListing pedidos={pedidos} error={error} />
        </Col>
      </Row>
    </Container>
  )
}

