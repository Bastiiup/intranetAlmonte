import { Container } from 'react-bootstrap'
import { headers } from 'next/headers'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import ObraDetails from './components/ObraDetails'

export const dynamic = 'force-dynamic'

export default async function Page({ params }: { params: Promise<{ obraId: string }> }) {
  const { obraId } = await params
  let obra: any = null
  let error: string | null = null

  try {
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseUrl = `${protocol}://${host}`
    
    const response = await fetch(`${baseUrl}/api/tienda/obras/${obraId}`, {
      cache: 'no-store',
    })
    
    const data = await response.json()
    
    if (data.success && data.data) {
      obra = data.data
    } else {
      error = data.error || 'Error al obtener la obra'
    }
  } catch (err: any) {
    error = err.message || 'Error al conectar con la API'
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Detalles de la Obra" subtitle="Ecommerce" />
      <ObraDetails obra={obra} obraId={obraId} error={error} />
    </Container>
  )
}



