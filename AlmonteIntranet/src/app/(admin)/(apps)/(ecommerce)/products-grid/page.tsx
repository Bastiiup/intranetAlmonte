import { Container } from 'react-bootstrap'
import { headers } from 'next/headers'

import ProductsPage from '@/app/(admin)/(apps)/(ecommerce)/products-grid/components/ProductsPage'
import ProductsGridDebug from '@/app/(admin)/(apps)/(ecommerce)/products-grid/debug'
import PageBreadcrumb from '@/components/PageBreadcrumb'

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic'

export default async function Page() {
  let productos: any[] = []
  let error: string | null = null

  try {
    // Usar API Route como proxy (igual que el chat)
    // Esto maneja el token de Strapi solo en el servidor
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseUrl = `${protocol}://${host}`
    
    const response = await fetch(`${baseUrl}/api/tienda/productos`, {
      cache: 'no-store', // Forzar fetch dinámico
    })
    
    const data = await response.json()
    
    if (data.success && data.data) {
      productos = Array.isArray(data.data) ? data.data : [data.data]
      // Debug: Log en servidor
      console.log('[Products Grid Page] Productos cargados:', productos.length)
      if (productos.length > 0) {
        console.log('[Products Grid Page] Primer producto:', JSON.stringify(productos[0], null, 2))
      }
    } else {
      error = data.error || 'Error al obtener productos'
    }
  } catch (err: any) {
    error = err.message || 'Error al conectar con la API'
    
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error al obtener productos:', err)
    }
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Products Grid" subtitle="Ecommerce" />

      {/* Página de debug - comentar cuando no se necesite */}
      <ProductsGridDebug />

      <ProductsPage productos={productos} error={error} />
    </Container>
  )
}
