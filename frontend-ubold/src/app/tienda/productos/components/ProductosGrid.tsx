'use client'

import { useState, useMemo } from 'react'
import { Card, CardBody, Badge, Button, InputGroup, Form, Row, Col, Spinner, Alert } from 'react-bootstrap'
import { LuSearch, LuPencil, LuEye, LuImage } from 'react-icons/lu'
import Image from 'next/image'
import Link from 'next/link'
import { STRAPI_API_URL } from '@/lib/strapi/config'

interface Producto {
  id: number
  attributes?: {
    // Campos principales (en mayúsculas como vienen de Strapi)
    ISBN_LIBRO?: string
    NOMBRE_LIBRO?: string
    SUBTITULO_LIBRO?: string
    DESCRIPCION?: string
    NUMERO_EDICION?: number
    AGNO_EDICION?: number
    IDIOMA?: string
    TIPO_LIBRO?: string
    ESTADO_EDICION?: string
    COMPLETO?: boolean
    // También soportar minúsculas por compatibilidad
    isbn_libro?: string
    nombre_libro?: string
    subtitulo_libro?: string
    descripcion?: string
    numero_edicion?: number
    agno_edicion?: number
    idioma?: string
    tipo_libro?: string
    estado_edicion?: string
    completo?: boolean
    
    // Imágenes
    portada_libro?: {
      data?: {
        id: number
        attributes: {
          url: string
          alternativeText?: string
          width?: number
          height?: number
        }
      }
    }
    imagenes_interior?: {
      data?: Array<{
        id: number
        attributes: {
          url: string
          alternativeText?: string
        }
      }>
    }
    
    // Relaciones (populadas)
    obra?: {
      data?: {
        id: number
        attributes: {
          nombre?: string
        }
      }
    }
    autor_relacion?: {
      data?: {
        id: number
        attributes: {
          nombre?: string
        }
      }
    }
    editorial?: {
      data?: {
        id: number
        attributes: {
          nombre?: string
        }
      }
    }
    precios?: {
      data?: Array<{
        id: number
        attributes: {
          precio?: number
          moneda?: string
        }
      }>
    }
    stocks?: {
      data?: Array<{
        id: number
        attributes: {
          cantidad?: number
        }
      }>
    }
    
    // Campos de sistema
    publishedAt?: string | null
    createdAt?: string
    updatedAt?: string
  }
}

interface ProductosGridProps {
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

export default function ProductosGrid({ productos, error }: ProductosGridProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterEstado, setFilterEstado] = useState<'all' | 'published' | 'draft'>('all')

  // Filtrar productos
  const filteredProductos = useMemo(() => {
    return productos.filter((producto) => {
      // Los datos pueden venir directamente o en attributes
      const attrs = producto.attributes || {}
      const data = attrs as any // Usar 'as any' para evitar problemas de tipos con campos dinámicos
      const nombre = (getField(data, 'NOMBRE_LIBRO', 'nombre_libro', 'nombreLibro') || '').toLowerCase()
      const isbn = (getField(data, 'ISBN_LIBRO', 'isbn_libro', 'isbnLibro') || '').toLowerCase()
      const subtitulo = (getField(data, 'SUBTITULO_LIBRO', 'subtitulo_libro', 'subtituloLibro') || '').toLowerCase()
      const descripcion = (getField(data, 'DESCRIPCION', 'descripcion') || '').toLowerCase()
      const autor = (data.autor_relacion?.data?.attributes?.nombre || data.autor_relacion?.data?.attributes?.NOMBRE || '').toLowerCase()
      const editorial = (data.editorial?.data?.attributes?.nombre || data.editorial?.data?.attributes?.NOMBRE || '').toLowerCase()
      const searchLower = searchTerm.toLowerCase()

      // Filtro de búsqueda (buscar en múltiples campos)
      const matchesSearch =
        !searchTerm ||
        nombre.includes(searchLower) ||
        isbn.includes(searchLower) ||
        subtitulo.includes(searchLower) ||
        descripcion.includes(searchLower) ||
        autor.includes(searchLower) ||
        editorial.includes(searchLower)

      // Filtro de estado
      const isPublished = !!attrs.publishedAt
      const matchesEstado =
        filterEstado === 'all' ||
        (filterEstado === 'published' && isPublished) ||
        (filterEstado === 'draft' && !isPublished)

      return matchesSearch && matchesEstado
    })
  }, [productos, searchTerm, filterEstado])

  // Obtener URL de imagen (portada_libro)
  const getImageUrl = (producto: Producto): string | null => {
    const attrs = producto.attributes || {}
    const data = attrs as any
    const portada = data.PORTADA_LIBRO?.data || data.portada_libro?.data || data.portadaLibro?.data
    if (!portada) return null

    const url = portada.attributes?.url || portada.attributes?.URL
    if (!url) return null

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
    const data = attrs as any
    const stocks = data.STOCKS?.data || data.stocks?.data || []
    return stocks.reduce((total: number, stock: any) => {
      const cantidad = stock.attributes?.CANTIDAD || stock.attributes?.cantidad || 0
      return total + (typeof cantidad === 'number' ? cantidad : 0)
    }, 0)
  }

  // Obtener precio mínimo
  const getPrecioMinimo = (producto: Producto): number | null => {
    const attrs = producto.attributes || {}
    const data = attrs as any
    const precios = data.PRECIOS?.data || data.precios?.data || []
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
        No se encontraron productos en Strapi. Asegúrate de que la colección existe y tiene datos.
      </Alert>
    )
  }

  return (
    <div className="productos-strapi-grid">
      <style jsx global>{`
        .productos-strapi-grid .product-card {
          transition: all 0.2s ease-in-out;
          height: 100%;
        }
        .productos-strapi-grid .product-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
          border-color: var(--bs-primary) !important;
        }
        .productos-strapi-grid .product-image-container {
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          position: relative;
          overflow: hidden;
        }
      `}</style>

      {/* Filtros y Búsqueda */}
      <div className="mb-4">
        <Row className="g-3">
          <Col md={8}>
            <InputGroup>
              <InputGroup.Text>
                <LuSearch />
              </InputGroup.Text>
              <Form.Control
                type="text"
                placeholder="Buscar por nombre, slug o descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </InputGroup>
          </Col>
          <Col md={4}>
            <Form.Select value={filterEstado} onChange={(e) => setFilterEstado(e.target.value as any)}>
              <option value="all">Todos los estados</option>
              <option value="published">Solo publicados</option>
              <option value="draft">Solo borradores</option>
            </Form.Select>
          </Col>
        </Row>
        <div className="mt-2">
          <small className="text-muted">
            Mostrando {filteredProductos.length} de {productos.length} productos
          </small>
        </div>
      </div>

      {/* Grid de Productos */}
      {filteredProductos.length === 0 ? (
        <Alert variant="secondary">
          No se encontraron productos que coincidan con los filtros seleccionados.
        </Alert>
      ) : (
        <Row className="g-3">
          {filteredProductos.map((producto, index) => {
            // Los datos pueden venir en attributes o directamente
            // Primero intentar attributes, luego el objeto directamente
            const attrs = producto.attributes || {}
            const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (producto as any)
            
            // Debug: Log del primer producto para ver la estructura
            if (index === 0 && typeof window !== 'undefined') {
              console.log('[ProductosGrid] Primer producto estructura:', {
                producto,
                tieneAttributes: !!producto.attributes,
                keysProducto: Object.keys(producto),
                keysAttrs: producto.attributes ? Object.keys(producto.attributes) : [],
                keysData: Object.keys(data),
                muestraNombre: data.NOMBRE_LIBRO || data.nombre_libro || data.nombreLibro,
              })
            }
            
            // Buscar nombre con múltiples variaciones
            const nombre = getField(data, 'NOMBRE_LIBRO', 'nombre_libro', 'nombreLibro', 'NOMBRE', 'nombre', 'name', 'NAME') || 'Sin nombre'
            const subtitulo = getField(data, 'SUBTITULO_LIBRO', 'subtitulo_libro', 'subtituloLibro', 'SUBTITULO', 'subtitulo') || ''
            const isbn = getField(data, 'ISBN_LIBRO', 'isbn_libro', 'isbnLibro', 'ISBN', 'isbn') || ''
            const descripcion = getField(data, 'DESCRIPCION', 'descripcion', 'DESCRIPTION', 'description') || ''
            const estado = (attrs.publishedAt || (producto as any).publishedAt) ? 'Publicado' : 'Borrador'
            const estadoEdicion = getField(data, 'ESTADO_EDICION', 'estado_edicion', 'estadoEdicion') || ''
            const tipoLibro = getField(data, 'TIPO_LIBRO', 'tipo_libro', 'tipoLibro') || ''
            const idioma = getField(data, 'IDIOMA', 'idioma', 'IDIOMA') || ''
            const agnoEdicion = getField(data, 'AGNO_EDICION', 'agno_edicion', 'agnoEdicion')
            const numeroEdicion = getField(data, 'NUMERO_EDICION', 'numero_edicion', 'numeroEdicion')
            const completo = getField(data, 'COMPLETO', 'completo') ?? false
            
            const autor = data.autor_relacion?.data?.attributes?.nombre || data.autor_relacion?.data?.attributes?.NOMBRE
            const editorial = data.editorial?.data?.attributes?.nombre || data.editorial?.data?.attributes?.NOMBRE
            const obra = data.obra?.data?.attributes?.nombre || data.obra?.data?.attributes?.NOMBRE
            
            const imageUrl = getImageUrl(producto)
            const stockTotal = getStockTotal(producto)
            const precioMinimo = getPrecioMinimo(producto)

            return (
              <Col key={producto.id} md={4} lg={3} sm={6} xs={12}>
                <Card className="product-card border">
                  {/* Imagen (Portada del libro) */}
                  <div
                    className="product-image-container"
                    style={{
                      height: '280px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={nombre}
                        fill
                        style={{
                          objectFit: 'contain',
                          padding: '12px',
                        }}
                        sizes="(max-width: 576px) 100vw, (max-width: 768px) 50vw, (max-width: 992px) 33vw, 25vw"
                      />
                    ) : (
                      <div
                        className="w-100 h-100 d-flex flex-column align-items-center justify-content-center text-muted"
                        style={{ fontSize: '3rem' }}
                      >
                        <LuImage size={64} style={{ opacity: 0.3 }} />
                        <small style={{ fontSize: '0.75rem', marginTop: '8px' }}>Sin portada</small>
                      </div>
                    )}
                    {estado === 'Borrador' && (
                      <div className="position-absolute top-0 end-0 m-2">
                        <Badge bg="secondary">Borrador</Badge>
                      </div>
                    )}
                    {!completo && (
                      <div className="position-absolute top-0 start-0 m-2">
                        <Badge bg="warning">Incompleto</Badge>
                      </div>
                    )}
                  </div>

                  {/* Información */}
                  <CardBody className="p-3 d-flex flex-column">
                    <h6
                      className="mb-1 text-truncate"
                      style={{
                        fontSize: '0.95rem',
                        fontWeight: 'bold',
                        lineHeight: '1.3',
                      }}
                      title={nombre}
                    >
                      {nombre}
                    </h6>

                    {subtitulo && (
                      <small className="text-muted mb-2 d-block" style={{ fontSize: '0.8rem' }}>
                        {subtitulo}
                      </small>
                    )}

                    {isbn && (
                      <small className="text-muted mb-2 d-block">
                        <strong>ISBN:</strong> <code>{isbn}</code>
                      </small>
                    )}

                    {autor && (
                      <div className="mb-1">
                        <small className="text-muted">
                          <strong>Autor:</strong> {autor}
                        </small>
                      </div>
                    )}

                    {editorial && (
                      <div className="mb-1">
                        <small className="text-muted">
                          <strong>Editorial:</strong> {editorial}
                        </small>
                      </div>
                    )}

                    {(agnoEdicion || numeroEdicion) && (
                      <div className="mb-2">
                        <small className="text-muted">
                          {numeroEdicion && `Edición ${numeroEdicion}`}
                          {numeroEdicion && agnoEdicion && ' · '}
                          {agnoEdicion && `Año ${agnoEdicion}`}
                        </small>
                      </div>
                    )}

                    {/* Precio y Stock */}
                    <div className="d-flex justify-content-between align-items-center mt-auto mb-2">
                      {precioMinimo !== null ? (
                        <span className="fw-bold text-primary fs-6">
                          ${precioMinimo.toLocaleString('es-CL')}
                        </span>
                      ) : (
                        <span className="text-muted small">Sin precio</span>
                      )}
                      {stockTotal > 0 ? (
                        <Badge bg={stockTotal > 10 ? 'success' : 'warning'}>
                          Stock: {stockTotal}
                        </Badge>
                      ) : (
                        <Badge bg="danger">Sin stock</Badge>
                      )}
                    </div>

                    {/* Badges de información */}
                    <div className="d-flex flex-wrap gap-1 mb-2">
                      {tipoLibro && (
                        <Badge bg="info" style={{ fontSize: '0.7rem' }}>
                          {tipoLibro}
                        </Badge>
                      )}
                      {idioma && (
                        <Badge bg="secondary" style={{ fontSize: '0.7rem' }}>
                          {idioma}
                        </Badge>
                      )}
                      {estadoEdicion && (
                        <Badge bg="primary" style={{ fontSize: '0.7rem' }}>
                          {estadoEdicion}
                        </Badge>
                      )}
                    </div>

                    {/* Estado de publicación */}
                    <div className="mb-2">
                      <Badge bg={estado === 'Publicado' ? 'success' : 'secondary'}>
                        {estado}
                      </Badge>
                    </div>

                    {/* Acciones */}
                    <div className="d-flex gap-2 mt-2">
                      <Link href={`/tienda/productos/${producto.id}`} className="flex-grow-1">
                        <Button variant="primary" size="sm" className="w-100">
                          <LuPencil className="me-1" />
                          Editar
                        </Button>
                      </Link>
                      <Link href={`/tienda/productos/${producto.id}`}>
                        <Button variant="outline-secondary" size="sm">
                          <LuEye />
                        </Button>
                      </Link>
                    </div>
                  </CardBody>
                </Card>
              </Col>
            )
          })}
        </Row>
      )}
    </div>
  )
}

