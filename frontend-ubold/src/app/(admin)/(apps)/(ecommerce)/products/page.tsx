import { Container } from 'react-bootstrap'
import { headers, cookies } from 'next/headers'

import ProductsListing from '@/app/(admin)/(apps)/(ecommerce)/products/components/ProductsListing'
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
    
    // Obtener cookies del servidor para pasarlas al fetch interno
    const cookieStore = await cookies()
    const cookieString = cookieStore.getAll()
      .map(cookie => `${cookie.name}=${cookie.value}`)
      .join('; ')
    
    const response = await fetch(`${baseUrl}/api/tienda/productos`, {
      cache: 'no-store', // Forzar fetch dinámico
      headers: {
        'Cookie': cookieString, // Pasar cookies al fetch interno
      },
    })
    
    const data = await response.json()
    
    if (data.success && data.data) {
      productos = Array.isArray(data.data) ? data.data : [data.data]
      console.log('[Products Page] Productos obtenidos:', productos.length)
      if (productos.length > 0) {
        console.log('[Products Page] Primer producto:', JSON.stringify(productos[0], null, 2))
      }
    } else {
      error = data.error || 'Error al obtener productos'
      console.error('[Products Page] Error en respuesta:', data)
    }
  } catch (err: any) {
    error = err.message || 'Error al conectar con la API'
    console.error('[Products Page] Error al obtener productos:', err)
  }
  
  console.log('[Products Page] Render - productos:', productos.length, 'error:', error)

  return (
    <Container fluid>
      <PageBreadcrumb title="Products" subtitle="Ecommerce" />
      <ProductsListing productos={productos} error={error} />
    </Container>
  )
}
