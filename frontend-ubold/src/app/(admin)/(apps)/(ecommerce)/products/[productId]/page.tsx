import { Card, CardBody, Col, Container, Row, Alert } from 'react-bootstrap'
import { headers } from 'next/headers'

import ProductDetails from '@/app/(admin)/(apps)/(ecommerce)/products/[productId]/components/ProductDetails'
import ProductDisplay from '@/app/(admin)/(apps)/(ecommerce)/products/[productId]/components/ProductDisplay'
import ProductReviews from '@/app/(admin)/(apps)/(ecommerce)/products/[productId]/components/ProductReviews'
import PageBreadcrumb from '@/components/PageBreadcrumb'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: {
    productId: string
  }
}

export default async function Page({ params }: PageProps) {
  const { productId } = params
  let producto: any = null
  let error: string | null = null

  try {
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseUrl = `${protocol}://${host}`
    
    const response = await fetch(`${baseUrl}/api/tienda/productos/${productId}`, {
      cache: 'no-store',
    })
    
    const data = await response.json()
    
    if (data.success && data.data) {
      producto = data.data
    } else {
      error = data.error || 'Error al obtener producto'
    }
  } catch (err: any) {
    error = err.message || 'Error al conectar con la API'
    console.error('Error al obtener producto:', err)
  }

  if (error || !producto) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Product Details" subtitle="Ecommerce" />
        <Alert variant="danger">
          <strong>Error:</strong> {error || 'Producto no encontrado'}
        </Alert>
      </Container>
    )
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Product Details" subtitle="Ecommerce" />

      <Row>
        <Col xs={12}>
          <Card>
            <CardBody>
              <Row>
                <ProductDisplay producto={producto} />

                <Col xl={8}>
                  <div className="p-4">
                    <ProductDetails producto={producto} />

                    <ProductReviews producto={producto} />
                  </div>
                </Col>
              </Row>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </Container>
  )
}
