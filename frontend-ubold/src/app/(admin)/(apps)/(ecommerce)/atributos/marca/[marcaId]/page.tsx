import { Container } from 'react-bootstrap'
import { headers } from 'next/headers'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import MarcaDetails from './components/MarcaDetails'

export const dynamic = 'force-dynamic'

export default async function Page({ params }: { params: Promise<{ marcaId: string }> }) {
  const { marcaId } = await params
  let marca: any = null
  let error: string | null = null

  try {
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseUrl = `${protocol}://${host}`
    
    const response = await fetch(`${baseUrl}/api/tienda/marca/${marcaId}`, {
      cache: 'no-store',
      credentials: 'include', // Incluir cookies
    })
    
    const data = await response.json()
    
    if (data.success && data.data) {
      marca = data.data
    } else {
      error = data.error || 'Error al obtener la marca'
    }
  } catch (err: any) {
    error = err.message || 'Error al conectar con la API'
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Detalles de la Marca" subtitle="Ecommerce" />
      <MarcaDetails marca={marca} marcaId={marcaId} error={error} />
    </Container>
  )
}



