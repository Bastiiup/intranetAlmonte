import { Container } from 'react-bootstrap'
import { headers } from 'next/headers'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import SerieColeccionDetails from './components/SerieColeccionDetails'

export const dynamic = 'force-dynamic'

export default async function Page({ params }: { params: Promise<{ serieColeccionId: string }> }) {
  const { serieColeccionId } = await params
  let serieColeccion: any = null
  let error: string | null = null

  try {
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseUrl = `${protocol}://${host}`
    
    const response = await fetch(`${baseUrl}/api/tienda/serie-coleccion/${serieColeccionId}`, {
      cache: 'no-store',
    })
    
    const data = await response.json()
    
    if (data.success && data.data) {
      serieColeccion = data.data
    } else {
      error = data.error || 'Error al obtener la serie/colección'
    }
  } catch (err: any) {
    error = err.message || 'Error al conectar con la API'
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Detalles de Serie/Colección" subtitle="Ecommerce" />
      <SerieColeccionDetails serieColeccion={serieColeccion} serieColeccionId={serieColeccionId} error={error} />
    </Container>
  )
}

