import { Container } from 'react-bootstrap'
import { headers } from 'next/headers'
import type { Metadata } from 'next'

import PageBreadcrumb from '@/components/PageBreadcrumb'
import CategoriesTabs from './components/CategoriesTabs'

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Categorías',
}

export default async function Page() {
  let categorias: any[] = []
  let error: string | null = null

  try {
    // Usar API Route como proxy (igual que productos)
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseUrl = `${protocol}://${host}`
    
    const response = await fetch(`${baseUrl}/api/tienda/categorias`, {
      cache: 'no-store', // Forzar fetch dinámico
    })
    
    const data = await response.json()
    
    if (data.success && data.data) {
      categorias = Array.isArray(data.data) ? data.data : [data.data]
      console.log('[Categorias Page] Categorías obtenidas:', categorias.length)
    } else {
      error = data.error || 'Error al obtener categorías'
      console.error('[Categorias Page] Error en respuesta:', data)
    }
  } catch (err: any) {
    error = err.message || 'Error al conectar con la API'
    console.error('[Categorias Page] Error al obtener categorías:', err)
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Categorías" subtitle="Ecommerce" />
      <CategoriesTabs categorias={categorias} error={error} />
    </Container>
  )
}

