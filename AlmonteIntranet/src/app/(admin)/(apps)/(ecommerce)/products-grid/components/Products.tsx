import Image from 'next/image'
import Link from 'next/link'
import { Badge, Button, Card, CardBody, CardFooter, CardTitle, Col, Row, Alert } from 'react-bootstrap'
import { TbBasket } from 'react-icons/tb'

import Rating from '@/components/Rating'
import { currency } from '@/helpers'
import { STRAPI_API_URL } from '@/lib/strapi/config'

interface Producto {
  id: number
  attributes?: {
    NOMBRE_LIBRO?: string
    nombre_libro?: string
    ISBN_LIBRO?: string
    isbn_libro?: string
    SUBTITULO_LIBRO?: string
    subtitulo_libro?: string
    portada_libro?: {
      data?: {
        attributes: {
          url: string
        }
      }
    }
    PORTADA_LIBRO?: {
      data?: {
        attributes: {
          url: string
        }
      }
    }
    precios?: {
      data?: Array<{
        attributes: {
          precio?: number
          PRECIO?: number
        }
      }>
    }
    PRECIOS?: {
      data?: Array<{
        attributes: {
          precio?: number
          PRECIO?: number
        }
      }>
    }
    stocks?: {
      data?: Array<{
        attributes: {
          cantidad?: number
          CANTIDAD?: number
        }
      }>
    }
    STOCKS?: {
      data?: Array<{
        attributes: {
          cantidad?: number
          CANTIDAD?: number
        }
      }>
    }
    autor_relacion?: {
      data?: {
        attributes: {
          nombre?: string
          NOMBRE?: string
        }
      }
    }
    editorial?: {
      data?: {
        attributes: {
          nombre?: string
          NOMBRE?: string
        }
      }
    }
    publishedAt?: string | null
  }
}

interface ProductsProps {
  productos: Producto[]
  error: string | null
  onProductSelect?: (productId: string) => void
}

// Helper para obtener un campo con múltiples variaciones de nombre
const getField = (obj: any, ...fieldNames: string[]): any => {
  for (const fieldName of fieldNames) {
    if (obj[fieldName] !== undefined && obj[fieldName] !== null && obj[fieldName] !== '') {
      return obj[fieldName]
    }
  }
  return undefined
}

const Products = ({ productos, error, onProductSelect }: ProductsProps) => {
  // Obtener URL de imagen (manejar datos directos o en attributes)
  const getImageUrl = (producto: Producto): string | null => {
    // Los datos pueden venir directamente (sin attributes) o en attributes
    const attrs = producto.attributes || {}
    const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (producto as any)
    
    // Acceder a portada_libro - puede venir como objeto directo o con .data
    let portada = data.portada_libro || data.PORTADA_LIBRO || data.portadaLibro
    
    // Si portada tiene .data, acceder a eso
    if (portada?.data) {
      portada = portada.data
    }
    
    // Si portada es null o undefined, no hay imagen
    if (!portada || portada === null) {
      return null
    }

    // Obtener la URL - puede estar en attributes o directamente
    const url = portada.attributes?.url || portada.attributes?.URL || portada.url || portada.URL
    if (!url) {
      return null
    }

    // Si la URL ya es completa, retornarla tal cual
    if (url.startsWith('http')) {
      return url
    }

    // Si no, construir la URL completa con la base de Strapi
    const baseUrl = STRAPI_API_URL.replace(/\/$/, '')
    return `${baseUrl}${url.startsWith('/') ? url : `/${url}`}`
  }

  // Calcular stock total
  const getStockTotal = (producto: Producto): number => {
    const attrs = producto.attributes || {}
    const stocks = attrs.STOCKS?.data || attrs.stocks?.data || []
    return stocks.reduce((total: number, stock: any) => {
      const cantidad = stock.attributes?.CANTIDAD || stock.attributes?.cantidad || 0
      return total + (typeof cantidad === 'number' ? cantidad : 0)
    }, 0)
  }

  // Obtener precio mínimo
  const getPrecioMinimo = (producto: Producto): number | null => {
    const attrs = producto.attributes || {}
    const precios = attrs.PRECIOS?.data || attrs.precios?.data || []
    if (precios.length === 0) return null
    
    const preciosNumeros = precios
      .map((p: any) => p.attributes?.PRECIO || p.attributes?.precio)
      .filter((p: any): p is number => typeof p === 'number' && p > 0)
    
    return preciosNumeros.length > 0 ? Math.min(...preciosNumeros) : null
  }

  if (error) {
    return (
      <Alert variant="danger">
        <strong>Error:</strong> {error}
      </Alert>
    )
  }

  if (productos.length === 0) {
    return (
      <Alert variant="info">
        No se encontraron productos en Strapi.
      </Alert>
    )
  }

  return (
    <Row className="row-cols-xxl-4 row-cols-lg-3 row-cols-sm-2 row-col-1 g-2">
      {productos.map((producto) => {
        // Los datos pueden venir en attributes o directamente
        const attrs = producto.attributes || {}
        const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (producto as any)
        
        // Obtener ID del producto (puede ser id numérico o documentId)
        const productId = producto.id || (producto as any).documentId || data.id || data.documentId
        
        // Buscar nombre con múltiples variaciones
        const nombre = getField(data, 'NOMBRE_LIBRO', 'nombre_libro', 'nombreLibro', 'NOMBRE', 'nombre', 'name', 'NAME') || 'Sin nombre'
        const isbn = getField(data, 'isbn_libro', 'ISBN_LIBRO', 'isbnLibro', 'ISBN', 'isbn') || ''
        const autor = data.autor_relacion?.data?.attributes?.nombre || data.autor_relacion?.data?.attributes?.NOMBRE || data.autor_relacion?.nombre || ''
        const editorial = data.editorial?.data?.attributes?.nombre || data.editorial?.data?.attributes?.NOMBRE || data.editorial?.nombre || ''
        const isPublished = !!attrs.publishedAt || !!data.publishedAt
        
        const imageUrl = getImageUrl(producto)
        const stockTotal = getStockTotal(producto)
        const precioMinimo = getPrecioMinimo(producto)

        return (
          <Col className="col" key={productId || producto.id}>
            <Card className="h-100 mb-2">
              {isPublished && (
                <Badge
                  bg="success"
                  className='badge-label fs-base rounded position-absolute top-0 start-0 m-3'>
                  Publicado
                </Badge>
              )}
              <CardBody className="pb-0">
                <div 
                  className="p-3" 
                  style={{ 
                    height: '333px', 
                    position: 'relative',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    background: '#f8f9fa' 
                  }}
                >
                  {imageUrl ? (
                    <Image 
                      src={imageUrl} 
                      alt={nombre} 
                      fill
                      unoptimized
                      style={{
                        objectFit: 'contain',
                        padding: '12px',
                      }}
                      sizes="(max-width: 576px) 100vw, (max-width: 768px) 50vw, (max-width: 992px) 33vw, 25vw"
                    />
                  ) : (
                    <div className="text-muted d-flex flex-column align-items-center justify-content-center">
                      <small>Sin imagen</small>
                    </div>
                  )}
                </div>
                <CardTitle className="fs-sm lh-base mb-2">
                  {onProductSelect && productId ? (
                    <a 
                      href="#" 
                      className="link-reset" 
                      onClick={(e) => {
                        e.preventDefault()
                        onProductSelect(String(productId))
                      }}
                    >
                      {nombre}
                    </a>
                  ) : (
                    <Link href={`/products/${productId}`} className="link-reset">
                      {nombre}
                    </Link>
                  )}
                </CardTitle>
                <div className="mb-2">
                  {autor && <p className="text-muted mb-0 fs-xxs">by: {autor}</p>}
                  {editorial && <p className="text-muted mb-0 fs-xxs">Editorial: {editorial}</p>}
                  {isbn && <p className="text-muted mb-0 fs-xxs">ISBN: {isbn}</p>}
                </div>
                <div>
                  <span className="text-warning">
                    <Rating rating={4} />
                  </span>
                  <span className="ms-1">
                    <Link href="/reviews" className="link-reset fw-semibold">
                      (0)
                    </Link>
                  </span>
                </div>
              </CardBody>

              <CardFooter className="bg-transparent d-flex justify-content-between">
                <div className="d-flex flex-column justify-content-start align-items-start gap-1">
                  {precioMinimo !== null ? (
                    <h5 className="text-success d-flex align-items-center gap-2 mb-0">
                      {currency}{precioMinimo.toFixed(2)}
                    </h5>
                  ) : (
                    <h5 className="text-muted d-flex align-items-center gap-2 mb-0">
                      Sin precio
                    </h5>
                  )}
                  <small className="text-muted">Stock: {stockTotal}</small>
                </div>
                <Button size="sm" variant="primary" className="btn-icon" href="#!">
                  <TbBasket className="fs-lg" />
                </Button>
              </CardFooter>
            </Card>
          </Col>
        )
      })}
    </Row>
  )
}

export default Products
