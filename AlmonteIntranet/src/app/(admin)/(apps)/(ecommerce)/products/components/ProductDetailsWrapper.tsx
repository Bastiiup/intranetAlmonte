'use client'

import { useEffect, useState } from 'react'
import { Container, Row, Col, Alert, Spinner, Button } from 'react-bootstrap'
import { TbArrowLeft } from 'react-icons/tb'

import ProductDetails from '@/app/(admin)/(apps)/(ecommerce)/products/[productId]/components/ProductDetails'
import ProductDisplay from '@/app/(admin)/(apps)/(ecommerce)/products/[productId]/components/ProductDisplay'
import ProductActivityLogs from '@/app/(admin)/(apps)/(ecommerce)/products/[productId]/components/ProductActivityLogs'
import { ProductPricing } from '@/app/(admin)/(apps)/(ecommerce)/products/[productId]/components/ProductPricing'
import { Card, CardBody } from 'react-bootstrap'

interface ProductDetailsWrapperProps {
  productId: string | null
  onBackToList: () => void
}

const ProductDetailsWrapper = ({ productId, onBackToList }: ProductDetailsWrapperProps) => {
  const [producto, setProducto] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!productId) {
      setProducto(null)
      setError(null)
      return
    }

    const fetchProducto = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch(`/api/tienda/productos/${productId}`, {
          cache: 'no-store',
        })
        
        const data = await response.json()
        
        if (data.success && data.data) {
          setProducto(data.data)
        } else {
          setError(data.error || 'Error al obtener producto')
        }
      } catch (err: any) {
        setError(err.message || 'Error al conectar con la API')
      } finally {
        setLoading(false)
      }
    }

    fetchProducto()
  }, [productId])

  const handleUpdate = async () => {
    if (!productId) return
    
    try {
      setLoading(true)
      const response = await fetch(`/api/tienda/productos/${productId}`, {
        cache: 'no-store',
      })
      const data = await response.json()
      if (data.success && data.data) {
        setProducto(data.data)
      }
    } catch (err: any) {
      console.error('Error al refrescar:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateProductoLocal = (updates: any) => {
    setProducto((prev: any) => {
      if (!prev) return prev
      
      if (updates.portada_libro && typeof updates.portada_libro === 'number') {
        const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://strapi.moraleja.cl'
        const nuevaImagen = {
          id: updates.portada_libro,
          url: `/uploads/${updates.portada_libro}`
        }
        
        if (prev.attributes) {
          return {
            ...prev,
            attributes: {
              ...prev.attributes,
              portada_libro: nuevaImagen
            }
          }
        }
        
        return {
          ...prev,
          portada_libro: nuevaImagen
        }
      }
      
      if (prev.attributes) {
        return {
          ...prev,
          attributes: {
            ...prev.attributes,
            ...updates
          }
        }
      }
      
      return {
        ...prev,
        ...updates
      }
    })
  }

  if (!productId) {
    return (
      <div className="text-center p-5">
        <Alert variant="info">
          <h5>Selecciona un producto</h5>
          <p className="mb-0">
            Para ver los detalles de un producto, selecciona uno desde el tab de <strong>Listing</strong> o <strong>Grid</strong>.
          </p>
        </Alert>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-center p-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Cargando producto...</p>
      </div>
    )
  }

  if (error || !producto) {
    return (
      <div>
        <Alert variant="danger">
          <div>
            <strong>Error:</strong> {error || 'Producto no encontrado'}
            <div className="mt-3">
              <Button variant="outline-primary" onClick={onBackToList}>
                <TbArrowLeft className="me-1" />
                Volver a la lista
              </Button>
            </div>
          </div>
        </Alert>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-3">
        <Button variant="outline-secondary" onClick={onBackToList}>
          <TbArrowLeft className="me-1" />
          Volver a la lista
        </Button>
      </div>

      <Row>
        <Col xs={12}>
          <Card>
            <CardBody>
              <Row>
                <ProductDisplay 
                  producto={producto} 
                  onUpdate={handleUpdate}
                  onProductoUpdate={updateProductoLocal}
                />

                <Col xl={8}>
                  <div className="p-4">
                    <ProductDetails 
                      producto={producto} 
                      onUpdate={handleUpdate}
                      onProductoUpdate={updateProductoLocal}
                    />

                    <ProductPricing 
                      producto={producto} 
                      onUpdate={handleUpdate}
                      onProductoUpdate={updateProductoLocal}
                    />

                    <ProductActivityLogs productId={productId} />
                  </div>
                </Col>
              </Row>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default ProductDetailsWrapper

