'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardBody, Col, Container, Row, Alert, Spinner } from 'react-bootstrap'

import ProductDetails from '@/app/(admin)/(apps)/(ecommerce)/products/[productId]/components/ProductDetails'
import ProductDisplay from '@/app/(admin)/(apps)/(ecommerce)/products/[productId]/components/ProductDisplay'
import ProductReviews from '@/app/(admin)/(apps)/(ecommerce)/products/[productId]/components/ProductReviews'
import { ProductPricing } from '@/app/(admin)/(apps)/(ecommerce)/products/[productId]/components/ProductPricing'
import PageBreadcrumb from '@/components/PageBreadcrumb'

export default function Page() {
  const params = useParams()
  const router = useRouter()
  const [producto, setProducto] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const productId = params.productId as string

  const fetchProducto = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('[Product Details Page] Obteniendo producto:', {
        productId,
        url: `/api/tienda/productos/${productId}`,
      })
      
      const response = await fetch(`/api/tienda/productos/${productId}`, {
        cache: 'no-store',
      })
      
      const data = await response.json()
      
      console.log('[Product Details Page] Respuesta de API:', {
        success: data.success,
        hasData: !!data.data,
        error: data.error,
      })
      
      if (data.success && data.data) {
        setProducto(data.data)
      } else {
        setError(data.error || `Error al obtener producto: ${response.status} ${response.statusText}`)
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Error al conectar con la API'
      setError(errorMessage)
      console.error('[Product Details Page] Error al obtener producto:', {
        productId,
        error: err.message,
        stack: err.stack,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (productId) {
      fetchProducto()
    }
  }, [productId])

  const handleUpdate = () => {
    fetchProducto()
  }

  if (loading) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Product Details" subtitle="Ecommerce" />
        <div className="text-center p-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Cargando producto...</p>
        </div>
      </Container>
    )
  }

  if (error || !producto) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Product Details" subtitle="Ecommerce" />
        <Alert variant="danger">
          <div>
            <strong>Error:</strong> {error || 'Producto no encontrado'}
            <div className="mt-3">
              <h5>¿Qué puedes hacer?</h5>
              <ul>
                <li>
                  <a href="/products/debug" className="text-decoration-none">
                    Ver página de debug para ver qué IDs existen
                  </a>
                </li>
                <li>
                  <a href="/products" className="text-decoration-none">
                    Volver a la lista de productos
                  </a>
                </li>
              </ul>
            </div>
          </div>
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
                <ProductDisplay producto={producto} onUpdate={handleUpdate} />

                <Col xl={8}>
                  <div className="p-4">
                    <ProductDetails producto={producto} />

                    <ProductPricing producto={producto} onUpdate={handleUpdate} />

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
