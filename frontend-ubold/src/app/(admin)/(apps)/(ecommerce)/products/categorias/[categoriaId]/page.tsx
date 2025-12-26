import { Container, Row, Col } from 'react-bootstrap'
import { headers } from 'next/headers'
import type { Metadata } from 'next'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import CategoriaDetails from './components/CategoriaDetails'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Detalles de Categoría - Intranet Almonte',
}

export default async function Page({ params }: { params: Promise<{ categoriaId: string }> }) {
  const { categoriaId } = await params
  let categoria: any = null
  let error: string | null = null

  try {
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseUrl = `${protocol}://${host}`
    
    const response = await fetch(`${baseUrl}/api/tienda/categorias/${categoriaId}`, {
      cache: 'no-store',
    })
    
    const data = await response.json()
    
    if (data.success && data.data) {
      categoria = data.data
    } else {
      error = data.error || 'Error al obtener la categoría'
    }
  } catch (err: any) {
    error = err.message || 'Error al conectar con la API'
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Detalles de Categoría" subtitle="Ecommerce" />
      <Row>
        <Col xxl={10} xl={12}>
          <CategoriaDetails categoria={categoria} categoriaId={categoriaId} error={error} />
        </Col>
      </Row>
    </Container>
  )
}

