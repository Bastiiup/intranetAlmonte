import { Container } from 'react-bootstrap'
import { headers } from 'next/headers'
import type { Metadata } from 'next'

import ClientsListing from '@/app/(admin)/(apps)/(ecommerce)/clientes/components/ClientsListing'
import PageBreadcrumb from '@/components/PageBreadcrumb'

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
    // Esto maneja el token de Strapi solo en el servidor
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseUrl = `${protocol}://${host}`
    
    const response = await fetch(`${baseUrl}/api/tienda/clientes`, {
      cache: 'no-store', // Forzar fetch dinámico
    })
    
    const data = await response.json()
    
    if (data.success && data.data) {
      clientes = Array.isArray(data.data) ? data.data : [data.data]
      console.log('[Clientes Page] Clientes obtenidos:', clientes.length)
      if (clientes.length > 0) {
        console.log('[Clientes Page] Primer cliente:', JSON.stringify(clientes[0], null, 2))
      }
    } else {
      error = data.error || 'Error al obtener clientes'
      console.error('[Clientes Page] Error en respuesta:', data)
    }
  } catch (err: any) {
    error = err.message || 'Error al conectar con la API'
    console.error('[Clientes Page] Error al obtener clientes:', err)
  }
  
  console.log('[Clientes Page] Render - clientes:', clientes.length, 'error:', error)

  return (
    <Container fluid>
      <PageBreadcrumb title="Todos los Clientes" subtitle="Ecommerce" />
      <ClientsListing clientes={clientes} error={error} />
    </Container>
  )
}

