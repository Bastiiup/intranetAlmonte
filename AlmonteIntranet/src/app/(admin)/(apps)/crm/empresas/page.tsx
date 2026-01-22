import { Container } from 'react-bootstrap'
import { Metadata } from 'next'
import { headers } from 'next/headers'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import EmpresasListing from './components/EmpresasListing'

export const metadata: Metadata = {
  title: 'Empresas - CRM',
}

export default async function Page() {
  let empresas: any[] = []
  let error: string | null = null

  try {
    // Usar API Route como proxy
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseUrl = `${protocol}://${host}`
    
    const response = await fetch(`${baseUrl}/api/crm/empresas`, {
      cache: 'no-store', // Forzar fetch dinámico
    })
    
    const data = await response.json()
    
    if (data.success && data.data) {
      empresas = Array.isArray(data.data) ? data.data : [data.data]
      console.log('[Empresas Page] Empresas obtenidas:', empresas.length)
    } else {
      error = data.error || 'Error al obtener empresas'
      console.error('[Empresas Page] Error en respuesta:', data)
    }
  } catch (err: any) {
    error = err.message || 'Error al conectar con la API'
    console.error('[Empresas Page] Error al obtener empresas:', err)
  }

  return (
    <Container fluid>
      <PageBreadcrumb 
        title="Empresas" 
        subtitle="CRM" 
        infoText="Las Empresas son organizaciones con las que trabajas. Aquí puedes gestionar información completa de cada empresa: datos de contacto, ubicación, contactos asociados, y datos de facturación. Las empresas pueden estar relacionadas con oportunidades de venta y pedidos."
      />
      <EmpresasListing empresas={empresas} error={error} />
    </Container>
  )
}





