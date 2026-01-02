import { Col, Container, Row } from 'react-bootstrap'
import { headers } from 'next/headers'
import type { Metadata } from 'next'

import PageBreadcrumb from '@/components/PageBreadcrumb'
import CustomersCard from '@/app/(admin)/(apps)/(ecommerce)/customers/components/CustomersCard'

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Todos los Clientes',
}

export default async function Page() {
  let clientes: any[] = []
  let error: string | null = null

  try {
    // Usar API Route como proxy (igual que productos)
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseUrl = `${protocol}://${host}`
    
    const response = await fetch(`${baseUrl}/api/woocommerce/customers?per_page=100`, {
      cache: 'no-store', // Forzar fetch dinámico
    })
    
    const data = await response.json()
    
    if (data.success && data.data) {
      clientes = Array.isArray(data.data) ? data.data : [data.data]
      console.log('[Clientes Page] Clientes obtenidos:', clientes.length)
    } else {
      error = data.error || 'Error al obtener clientes'
      console.error('[Clientes Page] Error en respuesta:', data)
    }
  } catch (err: any) {
    error = err.message || 'Error al conectar con la API'
    console.error('[Clientes Page] Error al obtener clientes:', err)
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Todos los Clientes" subtitle="Ecommerce" />

      <Row className="justify-content-center">
        <Col xxl={12}>
          <CustomersCard clientes={clientes} error={error} />
        </Col>
      </Row>
    </Container>
  )
}

