'use client'
import { Container, Card, CardBody, Alert, Button, Form } from 'react-bootstrap'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { notFound } from 'next/navigation'

import PageBreadcrumb from '@/components/PageBreadcrumb'
import strapiClient from '@/lib/strapi/client'

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
    tipoVisualizacion: 'default',
    estado: 'Borrador',
  })

  useEffect(() => {
    async function fetchProducto() {
      try {
        // Endpoint correcto confirmado: /api/libros (verificado en test-strapi)
        const response = await strapiClient.get<any>(`/api/libros/${productoId}?populate=*`)
        
        if (response.data) {
          const prod = response.data
          const attrs = prod.attributes || {}
          
          setProducto(prod)
          setFormData({
            nombre: attrs.name || '',
            slug: attrs.slug || '',
            descripcion: attrs.descripcion || '',
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
      // Endpoint correcto confirmado: /api/libros (verificado en test-strapi)
      const endpoint = `/api/libros/${productoId}`

      // Preparar datos para actualizar según la estructura de Strapi
      const updateData: any = {
        data: {
          name: formData.nombre,
          slug: formData.slug,
          descripcion: formData.descripcion,
          tipo_visualizacion: formData.tipoVisualizacion,
        }
      }

      // Si está publicado, agregar publishedAt
      if (formData.estado === 'Publicado') {
        updateData.data.publishedAt = new Date().toISOString()
      } else {
        updateData.data.publishedAt = null
      }

      await strapiClient.put<any>(endpoint, updateData)
      
      setSuccess(true)
      setTimeout(() => {
        router.push('/tienda/productos')
      }, 1500)
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

  return (
    <Container fluid>
      <PageBreadcrumb 
        title={`Editar Producto #${productoId}`} 
        subtitle="Tienda - Productos" 
      />
      
      <div className="row">
        <div className="col-12">
          <Card>
            <CardBody>
              <h4 className="card-title mb-4">Editar Producto #{productoId}</h4>
              
              {error && (
                <Alert variant="danger" className="mb-3" dismissible onClose={() => setError(null)}>
                  <strong>Error:</strong> {error}
                </Alert>
              )}

              {success && (
                <Alert variant="success" className="mb-3">
                  <strong>✅ Producto guardado correctamente</strong>
                  <br />
                  <small>Redirigiendo a la lista de productos...</small>
                </Alert>
              )}

              {producto && (
                <Form onSubmit={handleSubmit}>
                  <div className="row">
                    <div className="col-md-6">
                      <Form.Group className="mb-3">
                        <Form.Label>Nombre del Producto *</Form.Label>
                        <Form.Control
                          type="text"
                          value={formData.nombre}
                          onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                          required
                        />
                      </Form.Group>
                    </div>

                    <div className="col-md-6">
                      <Form.Group className="mb-3">
                        <Form.Label>Slug *</Form.Label>
                        <Form.Control
                          type="text"
                          value={formData.slug}
                          onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                          required
                          placeholder="categoria-producto"
                        />
                        <Form.Text className="text-muted">
                          URL amigable del producto (ej: categoria-producto)
                        </Form.Text>
                      </Form.Group>
                    </div>

                    <div className="col-md-6">
                      <Form.Group className="mb-3">
                        <Form.Label>Tipo de Visualización</Form.Label>
                        <Form.Select
                          value={formData.tipoVisualizacion}
                          onChange={(e) => setFormData({ ...formData, tipoVisualizacion: e.target.value })}
                        >
                          <option value="default">Default</option>
                          <option value="grid">Grid</option>
                          <option value="list">List</option>
                          <option value="card">Card</option>
                        </Form.Select>
                      </Form.Group>
                    </div>

                    <div className="col-md-6">
                      <Form.Group className="mb-3">
                        <Form.Label>Estado</Form.Label>
                        <Form.Select
                          value={formData.estado}
                          onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                        >
                          <option value="Publicado">Publicado</option>
                          <option value="Borrador">Borrador</option>
                        </Form.Select>
                      </Form.Group>
                    </div>

                    <div className="col-12">
                      <Form.Group className="mb-3">
                        <Form.Label>Descripción</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={4}
                          value={formData.descripcion}
                          onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                          placeholder="Descripción del producto..."
                        />
                      </Form.Group>
                    </div>

                    <div className="col-12">
                      <Alert variant="info" className="mb-0">
                        <strong>ℹ️ Nota:</strong> Los campos de imagen, categoría padre, categorías hijas y externalIds 
                        se gestionan directamente en Strapi. Para editarlos, ve a Strapi → Content Manager → Producto.
                      </Alert>
                    </div>
                  </div>

                  <div className="mt-4 d-flex gap-2">
                    <Button variant="primary" type="submit" disabled={saving}>
                      {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                    <Button 
                      variant="secondary" 
                      type="button"
                      onClick={() => router.push('/tienda/productos')}
                    >
                      Volver a Lista
                    </Button>
                  </div>
                </Form>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </Container>
  )
}
