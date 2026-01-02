import { Container } from 'react-bootstrap'
import { headers } from 'next/headers'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import CuponDetails from './components/CuponDetails'

export const dynamic = 'force-dynamic'

export default async function Page({ params }: { params: Promise<{ cuponId: string }> }) {
  const { cuponId } = await params
  let cupon: any = null
  let error: string | null = null

  try {
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseUrl = `${protocol}://${host}`
    
    const response = await fetch(`${baseUrl}/api/tienda/cupones/${cuponId}`, {
      cache: 'no-store',
    })
    
    const data = await response.json()
    
    if (data.success && data.data) {
      cupon = data.data
    } else {
      error = data.error || 'Error al obtener el cupón'
    }
  } catch (err: any) {
    error = err.message || 'Error al conectar con la API'
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Detalles del Cupón" subtitle="Ecommerce" />
      <CuponDetails cupon={cupon} cuponId={cuponId} error={error} />
    </Container>
  )
}
