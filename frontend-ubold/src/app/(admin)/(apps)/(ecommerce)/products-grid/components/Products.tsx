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

const Products = ({ productos, error }: ProductsProps) => {
  // Obtener URL de imagen (igual que ProductosGrid que funciona)
  const getImageUrl = (producto: Producto): string | null => {
    const attrs = producto.attributes || {}
    const data = attrs as any
    // Usar el mismo orden que ProductosGrid que funciona
    const portada = data.PORTADA_LIBRO?.data || data.portada_libro?.data || data.portadaLibro?.data
    if (!portada) {
      // Debug: Log para ver qué está pasando
      if (typeof window !== 'undefined' && productos.length > 0) {
        console.log('[Products Grid] No se encontró portada:', {
          productoId: producto.id,
          tieneAttributes: !!producto.attributes,
          keysData: Object.keys(data),
          tienePortadaLibro: !!data.portada_libro,
          tienePORTADA_LIBRO: !!data.PORTADA_LIBRO,
        })
      }
      return null
    }

    const url = portada.attributes?.url || portada.attributes?.URL
    if (!url) {
      console.log('[Products Grid] Portada encontrada pero sin URL:', { portada })
      return null
    }

    // Si la URL ya es completa, retornarla tal cual
    if (url.startsWith('http')) {
      return url
    }

    // Si no, construir la URL completa con la base de Strapi
    const baseUrl = STRAPI_API_URL.replace(/\/$/, '')
    const finalUrl = `${baseUrl}${url.startsWith('/') ? url : `/${url}`}`
    console.log('[Products Grid] URL de imagen construida:', finalUrl)
    return finalUrl
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
      {productos.map((producto, index) => {
        // Los datos pueden venir en attributes o directamente (igual que ProductosGrid)
        const attrs = producto.attributes || {}
        const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (producto as any)
        
        // Debug: Log del primer producto para ver la estructura
        if (index === 0 && typeof window !== 'undefined') {
          console.log('[Products Grid] Primer producto estructura:', {
            producto,
            tieneAttributes: !!producto.attributes,
            keysProducto: Object.keys(producto),
            keysAttrs: producto.attributes ? Object.keys(producto.attributes) : [],
            keysData: Object.keys(data),
            muestraNombre: data.NOMBRE_LIBRO || data.nombre_libro || data.nombreLibro,
            tienePortada: !!data.portada_libro || !!data.PORTADA_LIBRO,
          })
        }
        
        // Buscar nombre con múltiples variaciones (mismo orden que ProductosGrid que funciona)
        const nombre = getField(data, 'NOMBRE_LIBRO', 'nombre_libro', 'nombreLibro', 'NOMBRE', 'nombre', 'name', 'NAME') || 'Sin nombre'
        const isbn = getField(data, 'isbn_libro', 'ISBN_LIBRO', 'isbnLibro', 'ISBN', 'isbn') || ''
        const autor = data.autor_relacion?.data?.attributes?.nombre || data.autor_relacion?.data?.attributes?.NOMBRE || ''
        const editorial = data.editorial?.data?.attributes?.nombre || data.editorial?.data?.attributes?.NOMBRE || ''
        const isPublished = !!attrs.publishedAt
        
        const imageUrl = getImageUrl(producto)
        const stockTotal = getStockTotal(producto)
        const precioMinimo = getPrecioMinimo(producto)

        return (
          <Col className="col" key={producto.id}>
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
                      onError={(e) => {
                        console.error('[Products Grid] Error al cargar imagen:', imageUrl, e)
                      }}
                    />
                  ) : (
                    <div className="text-muted d-flex flex-column align-items-center justify-content-center">
                      <small>Sin imagen</small>
                      {index === 0 && typeof window !== 'undefined' && (
                        <small className="text-danger mt-1">Debug: Ver consola</small>
                      )}
                    </div>
                  )}
                </div>
                <CardTitle className="fs-sm lh-base mb-2">
                  <Link href={`/tienda/productos/${producto.id}`} className="link-reset">
                    {nombre}
                  </Link>
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
