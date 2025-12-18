'use client'
import { Container, Card, CardBody, Alert, Button, Form, Row, Col, Badge } from 'react-bootstrap'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { LuPencil, LuSettings2 } from 'react-icons/lu'
import { TbStarFilled } from 'react-icons/tb'

import PageBreadcrumb from '@/components/PageBreadcrumb'
import strapiClient from '@/lib/strapi/client'
import { STRAPI_API_URL } from '@/lib/strapi/config'

interface EditarProductoPageProps {
  params: { id: string }
}

export default function EditarProductoPage({ params }: EditarProductoPageProps) {
  const router = useRouter()
  const productoId = params.id
  const [producto, setProducto] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  const [formData, setFormData] = useState({
    nombre: '',
    slug: '',
    descripcion: '',
    precioOriginal: '',
    precioActual: '',
    descuento: '',
    tipoVisualizacion: 'default',
    estado: 'Borrador',
  })

  // Helper para obtener campos
  const getField = (obj: any, ...keys: string[]) => {
    for (const key of keys) {
      if (obj[key] !== undefined && obj[key] !== null) {
        return obj[key]
      }
    }
    return ''
  }

  // Obtener URL de imagen
  const getImageUrl = (prod: any): string | null => {
    const attrs = prod.attributes || {}
    const data = attrs as any
    const portada = data.PORTADA_LIBRO?.data || data.portada_libro?.data
    if (!portada) return null

    const url = portada.attributes?.url || portada.attributes?.URL
    if (!url) return null

    if (url.startsWith('http')) {
      return url
    }

    const baseUrl = STRAPI_API_URL.replace(/\/$/, '')
    return `${baseUrl}${url.startsWith('/') ? url : `/${url}`}`
  }

  // Obtener precio mínimo
  const getPrecioMinimo = (prod: any): number | null => {
    const attrs = prod.attributes || {}
    const data = attrs as any
    const precios = data.PRECIOS?.data || data.precios?.data || []
    if (precios.length === 0) return null
    
    const preciosNumeros = precios
      .map((p: any) => p.attributes?.PRECIO || p.attributes?.precio)
      .filter((p: any): p is number => typeof p === 'number' && p > 0)
    
    return preciosNumeros.length > 0 ? Math.min(...preciosNumeros) : null
  }

  // Calcular stock total
  const getStockTotal = (prod: any): number => {
    const attrs = prod.attributes || {}
    const data = attrs as any
    const stocks = data.STOCKS?.data || data.stocks?.data || []
    return stocks.reduce((total: number, stock: any) => {
      const cantidad = stock.attributes?.CANTIDAD || stock.attributes?.cantidad || 0
      return total + (typeof cantidad === 'number' ? cantidad : 0)
    }, 0)
  }

  useEffect(() => {
    async function fetchProducto() {
      try {
        // Cargar con populate para obtener imágenes y precios
        const response = await strapiClient.get<any>(`/api/libros/${productoId}?populate=*`)
        
        if (response.data) {
          const prod = response.data
          const attrs = prod.attributes || {}
          
          const precioMinimo = getPrecioMinimo(prod)
          const precioOriginal = precioMinimo ? precioMinimo * 1.15 : 0 // Simular precio original 15% más alto
          const descuento = precioMinimo && precioOriginal ? Math.round(((precioOriginal - precioMinimo) / precioOriginal) * 100) : 0
          
          setProducto(prod)
          setFormData({
            nombre: getField(attrs, 'NOMBRE_LIBRO', 'nombre_libro', 'name', 'NAME') || '',
            slug: attrs.slug || '',
            descripcion: getField(attrs, 'DESCRIPCION', 'descripcion', 'DESCRIPTION', 'description') || '',
            precioOriginal: precioOriginal > 0 ? precioOriginal.toFixed(2) : '',
            precioActual: precioMinimo ? precioMinimo.toFixed(2) : '',
            descuento: descuento.toString(),
            tipoVisualizacion: attrs.tipo_visualizacion || 'default',
            estado: attrs.publishedAt ? 'Publicado' : 'Borrador',
          })
        } else {
          setError('Producto no encontrado')
        }
      } catch (err: any) {
        setError(err.message || 'Error al obtener el producto')
        console.error('Error al obtener producto:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchProducto()
  }, [productoId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const endpoint = `/api/libros/${productoId}`

      const updateData: any = {
        data: {
          nombre_libro: formData.nombre,
          NOMBRE_LIBRO: formData.nombre,
          slug: formData.slug,
          descripcion: formData.descripcion,
          DESCRIPCION: formData.descripcion,
          tipo_visualizacion: formData.tipoVisualizacion,
        }
      }

      // Actualizar precio si se proporcionó
      if (formData.precioActual) {
        // Aquí necesitarías actualizar la relación de precios
        // Por ahora solo guardamos los datos básicos
        // TODO: Implementar actualización de precios en Strapi
      }

      if (formData.estado === 'Publicado') {
        updateData.data.publishedAt = new Date().toISOString()
      } else {
        updateData.data.publishedAt = null
      }

      await strapiClient.put<any>(endpoint, updateData)
      
      setSuccess(true)
      setTimeout(() => {
        router.push('/tienda/productos')
      }, 600)
    } catch (err: any) {
      setError(err.message || 'Error al guardar el producto')
      console.error('Error al guardar producto:', err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Container fluid>
        <PageBreadcrumb 
          title={`Editar Producto #${productoId}`} 
          subtitle="Tienda - Productos" 
        />
        <Alert variant="info">Cargando producto...</Alert>
      </Container>
    )
  }

  if (error && !producto) {
    return (
      <Container fluid>
        <PageBreadcrumb 
          title={`Editar Producto #${productoId}`} 
          subtitle="Tienda - Productos" 
        />
        <Alert variant="danger">
          <strong>Error:</strong> {error}
        </Alert>
      </Container>
    )
  }

  if (!producto) return null

  const imageUrl = getImageUrl(producto)
  const stockTotal = getStockTotal(producto)
  const isPublished = formData.estado === 'Publicado'
  const publishedDate = producto.attributes?.publishedAt 
    ? new Date(producto.attributes.publishedAt).toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'No publicado'

  return (
    <Container fluid>
      <PageBreadcrumb 
        title={`Editar Producto #${productoId}`} 
        subtitle="Tienda - Productos" 
      />
      
      {error && (
        <Alert variant="danger" className="mb-3" dismissible onClose={() => setError(null)}>
          <strong>Error:</strong> {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" className="mb-3">
          <strong>✅ Producto guardado correctamente</strong>
        </Alert>
      )}

      <Form onSubmit={handleSubmit}>
        <Row className="g-4">
          {/* Columna Izquierda - Imagen */}
          <Col lg={5}>
            <Card>
              <CardBody>
                <div className="text-center mb-3">
                  {imageUrl ? (
                    <div style={{ position: 'relative', width: '100%', height: '400px', marginBottom: '16px' }}>
                      <Image
                        src={imageUrl}
                        alt={formData.nombre || 'Producto'}
                        fill
                        style={{ objectFit: 'contain' }}
                        sizes="(max-width: 768px) 100vw, 40vw"
                      />
                    </div>
                  ) : (
                    <div 
                      className="d-flex align-items-center justify-content-center bg-light"
                      style={{ height: '400px', borderRadius: '8px' }}
                    >
                      <div className="text-muted">
                        <p>Sin imagen</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Thumbnails placeholder */}
                  <div className="d-flex gap-2 justify-content-center">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="border rounded"
                        style={{ width: '80px', height: '80px', cursor: 'pointer' }}
                      >
                        {imageUrl && (
                          <Image
                            src={imageUrl}
                            alt={`Thumbnail ${i}`}
                            width={80}
                            height={80}
                            style={{ objectFit: 'cover', borderRadius: '4px' }}
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Botones de acción */}
                  <div className="d-flex gap-2 justify-content-center mt-3">
                    <Button variant="light" size="sm">
                      <LuPencil className="me-2" />
                      Edit
                    </Button>
                    <Button variant="danger" size="sm">
                      <LuSettings2 className="me-2" />
                      Delisting
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          </Col>

          {/* Columna Derecha - Información */}
          <Col lg={7}>
            <Card>
              <CardBody>
                {/* Disponibilidad y Rating */}
                <div className="d-flex align-items-center gap-3 mb-3">
                  <Badge bg="success" className="px-3 py-2">
                    In Stock
                  </Badge>
                  <div className="d-flex align-items-center gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <TbStarFilled key={i} className="text-warning" size={18} />
                    ))}
                    <span className="ms-2 text-muted">(859 Reviews)</span>
                  </div>
                </div>

                {/* Título del producto */}
                <Form.Group className="mb-4">
                  <Form.Control
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="border-0 fs-3 fw-bold p-0"
                    placeholder="Nombre del producto"
                    required
                  />
                </Form.Group>

                {/* Métricas */}
                <Row className="mb-4">
                  <Col xs={6} md={4}>
                    <div>
                      <small className="text-muted d-block">SKU</small>
                      <strong>{getField(producto.attributes, 'ISBN_LIBRO', 'isbn_libro', 'ISBN', 'isbn') || 'N/A'}</strong>
                    </div>
                  </Col>
                  <Col xs={6} md={4}>
                    <div>
                      <small className="text-muted d-block">CATEGORY</small>
                      <strong>{getField(producto.attributes, 'TIPO_LIBRO', 'tipo_libro') || 'N/A'}</strong>
                    </div>
                  </Col>
                  <Col xs={6} md={4}>
                    <div>
                      <small className="text-muted d-block">STOCK</small>
                      <strong>{stockTotal}</strong>
                    </div>
                  </Col>
                  <Col xs={6} md={4}>
                    <div>
                      <small className="text-muted d-block">ORDERS</small>
                      <strong>1428</strong>
                    </div>
                  </Col>
                  <Col xs={6} md={4}>
                    <div>
                      <small className="text-muted d-block">REVENUE</small>
                      <strong>$2,350,120.00</strong>
                    </div>
                  </Col>
                  <Col xs={6} md={4}>
                    <div>
                      <small className="text-muted d-block">PUBLISHED</small>
                      <strong>{publishedDate}</strong>
                    </div>
                  </Col>
                </Row>

                {/* Precios */}
                <div className="mb-4 p-3 bg-light rounded">
                  <h6 className="mb-3">Pricing</h6>
                  <Row className="g-3">
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label className="small text-muted">Original Price</Form.Label>
                        <Form.Control
                          type="number"
                          step="0.01"
                          value={formData.precioOriginal}
                          onChange={(e) => setFormData({ ...formData, precioOriginal: e.target.value })}
                          placeholder="1499.00"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label className="small text-muted">Current Price</Form.Label>
                        <Form.Control
                          type="number"
                          step="0.01"
                          value={formData.precioActual}
                          onChange={(e) => setFormData({ ...formData, precioActual: e.target.value })}
                          placeholder="1299.00"
                          className="fw-bold text-danger"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label className="small text-muted">Discount %</Form.Label>
                        <Form.Control
                          type="number"
                          value={formData.descuento}
                          onChange={(e) => setFormData({ ...formData, descuento: e.target.value })}
                          placeholder="13"
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  {formData.precioOriginal && formData.precioActual && (
                    <div className="mt-2">
                      <span className="text-decoration-line-through text-muted me-2">
                        ${parseFloat(formData.precioOriginal).toLocaleString('es-CL', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="fw-bold text-danger fs-5">
                        ${parseFloat(formData.precioActual).toLocaleString('es-CL', { minimumFractionDigits: 2 })}
                      </span>
                      {formData.descuento && (
                        <span className="ms-2 text-danger">({formData.descuento}%)</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="mb-4">
                  <h6 className="mb-2">PRODUCT INFO:</h6>
                  <Form.Group>
                    <Form.Control
                      as="textarea"
                      rows={4}
                      value={formData.descripcion}
                      onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                      placeholder="Descripción del producto..."
                      className="border-0 bg-light"
                    />
                  </Form.Group>
                </div>

                {/* Details */}
                <div className="mb-4">
                  <h6 className="mb-2">Details:</h6>
                  <ul className="list-unstyled">
                    <li className="mb-2">• ISBN: {getField(producto.attributes, 'ISBN_LIBRO', 'isbn_libro') || 'N/A'}</li>
                    <li className="mb-2">• Estado: {getField(producto.attributes, 'ESTADO_EDICION', 'estado_edicion') || 'N/A'}</li>
                    <li className="mb-2">• Idioma: {getField(producto.attributes, 'IDIOMA', 'idioma') || 'N/A'}</li>
                    <li className="mb-2">• Stock disponible: {stockTotal} unidades</li>
                  </ul>
                </div>

                {/* Estado y Slug */}
                <Row className="mb-4">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Estado</Form.Label>
                      <Form.Select
                        value={formData.estado}
                        onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                      >
                        <option value="Publicado">Publicado</option>
                        <option value="Borrador">Borrador</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Slug</Form.Label>
                      <Form.Control
                        type="text"
                        value={formData.slug}
                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                        placeholder="producto-slug"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                {/* Botones de acción */}
                <div className="d-flex gap-2">
                  <Button variant="primary" type="submit" disabled={saving}>
                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                  </Button>
                  <Button 
                    variant="secondary" 
                    type="button"
                    onClick={() => router.push('/tienda/productos')}
                  >
                    Cancelar
                  </Button>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Form>
    </Container>
  )
}
