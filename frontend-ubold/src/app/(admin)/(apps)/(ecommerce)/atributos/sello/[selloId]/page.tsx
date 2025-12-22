import { Container } from 'react-bootstrap'
import { headers } from 'next/headers'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import SelloDetails from './components/SelloDetails'

export const dynamic = 'force-dynamic'

export default async function Page({ params }: { params: Promise<{ selloId: string }> }) {
  const { selloId } = await params
  let sello: any = null
  let error: string | null = null

  try {
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseUrl = `${protocol}://${host}`
    
    const response = await fetch(`${baseUrl}/api/tienda/sello/${selloId}`, {
      cache: 'no-store',
      credentials: 'include', // Incluir cookies
    })
    
    const data = await response.json()
    
    if (data.success && data.data) {
      sello = data.data
    } else {
      error = data.error || 'Error al obtener el sello'
    }
  } catch (err: any) {
    error = err.message || 'Error al conectar con la API'
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Detalles del Sello" subtitle="Ecommerce" />
      <SelloDetails sello={sello} selloId={selloId} error={error} />
    </Container>
  )
}



