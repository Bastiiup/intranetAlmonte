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
    precio: 0,
    stock: 0,
    estado: 'Borrador',
    descripcion: '',
  })

  useEffect(() => {
    async function fetchProducto() {
      try {
        let response: any = null
        
        try {
          response = await strapiClient.get<any>(`/api/producto/${productoId}?populate=*`)
        } catch {
          try {
            response = await strapiClient.get<any>(`/api/productos/${productoId}?populate=*`)
          } catch {
            try {
              response = await strapiClient.get<any>(`/api/products/${productoId}?populate=*`)
            } catch {
              response = await strapiClient.get<any>(`/api/ecommerce-productos/${productoId}?populate=*`)
            }
          }
        }
        
        if (response.data) {
          const prod = response.data
          const attrs = prod.attributes || {}
          
          setProducto(prod)
          setFormData({
            nombre: attrs.nombre || attrs.name || attrs.titulo || attrs.title || '',
            precio: attrs.precio || attrs.price || attrs.precio_venta || 0,
            stock: attrs.stock || attrs.cantidad || attrs.inventory || 0,
            estado: attrs.estado || attrs.status || (attrs.publishedAt ? 'Publicado' : 'Borrador'),
            descripcion: attrs.descripcion || attrs.description || attrs.descripcion_corta || '',
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
      // Determinar qué endpoint usar (empezar con "producto" singular)
      let endpoint = `/api/producto/${productoId}`
      try {
        await strapiClient.get<any>(`/api/producto/${productoId}`)
      } catch {
        try {
          await strapiClient.get<any>(`/api/productos/${productoId}`)
          endpoint = `/api/productos/${productoId}`
        } catch {
          try {
            await strapiClient.get<any>(`/api/products/${productoId}`)
            endpoint = `/api/products/${productoId}`
          } catch {
            endpoint = `/api/ecommerce-productos/${productoId}`
          }
        }
      }

      // Preparar datos para actualizar
      const updateData: any = {
        data: {
          nombre: formData.nombre,
          precio: formData.precio,
          stock: formData.stock,
          estado: formData.estado,
          descripcion: formData.descripcion,
        }
      }

      // Intentar con diferentes nombres de campos según la estructura de Strapi
      const attrs = producto?.attributes || {}
      if (attrs.name) {
        updateData.data.name = formData.nombre
      }
      if (attrs.price) {
        updateData.data.price = formData.precio
      }
      if (attrs.inventory) {
        updateData.data.inventory = formData.stock
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
                        <Form.Label>Nombre del Producto</Form.Label>
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
                        <Form.Label>Precio</Form.Label>
                        <Form.Control
                          type="number"
                          step="0.01"
                          value={formData.precio}
                          onChange={(e) => setFormData({ ...formData, precio: parseFloat(e.target.value) || 0 })}
                          required
                        />
                      </Form.Group>
                    </div>

                    <div className="col-md-6">
                      <Form.Group className="mb-3">
                        <Form.Label>Stock</Form.Label>
                        <Form.Control
                          type="number"
                          value={formData.stock}
                          onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                          required
                        />
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
                          <option value="Pendiente">Pendiente</option>
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
                        />
                      </Form.Group>
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
