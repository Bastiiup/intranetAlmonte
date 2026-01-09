import { Container } from 'react-bootstrap'
import { headers } from 'next/headers'
import type { Metadata } from 'next'

import PersonasListing from './components/PersonasListing'
import PageBreadcrumb from '@/components/PageBreadcrumb'

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Personas - CRM',
}

export default async function Page() {
  let personas: any[] = []
  let error: string | null = null

  try {
    // Usar API Route como proxy
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseUrl = `${protocol}://${host}`
    
    const response = await fetch(`${baseUrl}/api/crm/personas`, {
      cache: 'no-store', // Forzar fetch dinámico
    })
    
    const data = await response.json()
    
    if (data.success && data.data) {
      personas = Array.isArray(data.data) ? data.data : [data.data]
      console.log('[Personas Page] Personas obtenidas:', personas.length)
    } else {
      error = data.error || 'Error al obtener personas'
      console.error('[Personas Page] Error en respuesta:', data)
    }
  } catch (err: any) {
    error = err.message || 'Error al conectar con la API'
    console.error('[Personas Page] Error al obtener personas:', err)
  }

  return (
    <Container fluid>
      <PageBreadcrumb 
        title="Personas" 
        subtitle="CRM" 
        infoText="Las Personas son contactos individuales que pueden estar asociados a colegios o ser independientes. Aquí puedes gestionar información personal, datos de contacto, y relaciones con colegios. Las personas pueden ser contactos clave, representantes comerciales, o cualquier individuo relevante para tu negocio."
      />
      <PersonasListing personas={personas} error={error} />
    </Container>
  )
}

