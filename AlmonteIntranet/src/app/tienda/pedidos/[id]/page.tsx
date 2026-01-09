'use client'
import { Container, Card, CardBody, Alert, Button, Form } from 'react-bootstrap'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

import PageBreadcrumb from '@/components/PageBreadcrumb'
import strapiClient from '@/lib/strapi/client'

interface EditarPedidoPageProps {
  params: { id: string }
}

export default function EditarPedidoPage({ params }: EditarPedidoPageProps) {
  const router = useRouter()
  const pedidoId = params.id
  const [pedido, setPedido] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  const [formData, setFormData] = useState({
    numeroPedido: '',
    fechaPedido: '',
    estado: 'Pendiente',
    publicado: false,
  })

  useEffect(() => {
    async function fetchPedido() {
      try {
        let response: any = null
        
        try {
          response = await strapiClient.get<any>(`/api/ecommerce-pedidos/${pedidoId}?populate=*`)
        } catch {
          try {
            response = await strapiClient.get<any>(`/api/wo-pedidos/${pedidoId}?populate=*`)
          } catch {
            response = await strapiClient.get<any>(`/api/pedidos/${pedidoId}?populate=*`)
          }
        }
        
        if (response.data) {
          const ped = response.data
          const attrs = ped.attributes || {}
          
          setPedido(ped)
          
          // Formatear fecha para el input datetime-local
          let fechaFormateada = ''
          const fechaPedido = attrs.FECHA_PEDIDO || attrs.fecha_pedido || attrs.fechaPedido || attrs.createdAt
          if (fechaPedido) {
            try {
              const fecha = new Date(fechaPedido)
              fechaFormateada = fecha.toISOString().slice(0, 16)
            } catch {
              fechaFormateada = ''
            }
          }
          
          setFormData({
            numeroPedido: attrs.NUMERO_PEDIDO || attrs.numero_pedido || attrs.numeroPedido || ped.id,
            fechaPedido: fechaFormateada,
            estado: attrs.ESTADO || attrs.estado || 'Pendiente',
            publicado: !!attrs.publishedAt,
          })
        } else {
          setError('Pedido no encontrado')
        }
      } catch (err: any) {
        setError(err.message || 'Error al obtener el pedido')
        console.error('Error al obtener pedido:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPedido()
  }, [pedidoId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      // Determinar qué endpoint usar
      let endpoint = `/api/ecommerce-pedidos/${pedidoId}`
      try {
        await strapiClient.get<any>(`/api/ecommerce-pedidos/${pedidoId}`)
      } catch {
        try {
          await strapiClient.get<any>(`/api/wo-pedidos/${pedidoId}`)
          endpoint = `/api/wo-pedidos/${pedidoId}`
        } catch {
          endpoint = `/api/pedidos/${pedidoId}`
        }
      }

      // Preparar datos para actualizar
      const updateData: any = {
        data: {
          NUMERO_PEDIDO: formData.numeroPedido,
          FECHA_PEDIDO: formData.fechaPedido,
          ESTADO: formData.estado,
        }
      }

      // Si está publicado, agregar publishedAt
      if (formData.publicado) {
        updateData.data.publishedAt = new Date().toISOString()
      } else {
        updateData.data.publishedAt = null
      }

      // Intentar con diferentes nombres de campos
      const attrs = pedido?.attributes || {}
      if (attrs.numero_pedido) {
        updateData.data.numero_pedido = formData.numeroPedido
      }
      if (attrs.fecha_pedido) {
        updateData.data.fecha_pedido = formData.fechaPedido
      }
      if (attrs.estado) {
        updateData.data.estado = formData.estado
      }

      await strapiClient.put<any>(endpoint, updateData)
      
      setSuccess(true)
      setTimeout(() => {
        router.push('/tienda/pedidos')
      }, 1500)
    } catch (err: any) {
      setError(err.message || 'Error al guardar el pedido')
      console.error('Error al guardar pedido:', err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Container fluid>
        <PageBreadcrumb 
          title={`Editar Pedido #${pedidoId}`} 
          subtitle="Tienda - Pedidos" 
        />
        <Alert variant="info">Cargando pedido...</Alert>
      </Container>
    )
  }

  if (error && !pedido) {
    return (
      <Container fluid>
        <PageBreadcrumb 
          title={`Editar Pedido #${pedidoId}`} 
          subtitle="Tienda - Pedidos" 
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
        title={`Editar Pedido #${pedidoId}`} 
        subtitle="Tienda - Pedidos" 
      />
      
      <div className="row">
        <div className="col-12">
          <Card>
            <CardBody>
              <h4 className="card-title mb-4">Editar Pedido #{pedidoId}</h4>
              
              {error && (
                <Alert variant="danger" className="mb-3" dismissible onClose={() => setError(null)}>
                  <strong>Error:</strong> {error}
                </Alert>
              )}

              {success && (
                <Alert variant="success" className="mb-3">
                  <strong>✅ Pedido guardado correctamente</strong>
                  <br />
                  <small>Redirigiendo a la lista de pedidos...</small>
                </Alert>
              )}

              {pedido && (
                <Form onSubmit={handleSubmit}>
                  <div className="row">
                    <div className="col-md-6">
                      <Form.Group className="mb-3">
                        <Form.Label>Número de Pedido</Form.Label>
                        <Form.Control
                          type="text"
                          value={formData.numeroPedido}
                          onChange={(e) => setFormData({ ...formData, numeroPedido: e.target.value })}
                          readOnly
                        />
                      </Form.Group>
                    </div>

                    <div className="col-md-6">
                      <Form.Group className="mb-3">
                        <Form.Label>Fecha de Pedido</Form.Label>
                        <Form.Control
                          type="datetime-local"
                          value={formData.fechaPedido}
                          onChange={(e) => setFormData({ ...formData, fechaPedido: e.target.value })}
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
                          <option value="Pendiente">Pendiente</option>
                          <option value="Completado">Completado</option>
                          <option value="Cancelado">Cancelado</option>
                          <option value="En proceso">En proceso</option>
                        </Form.Select>
                      </Form.Group>
                    </div>

                    <div className="col-md-6">
                      <Form.Group className="mb-3">
                        <Form.Label>Estado de Publicación</Form.Label>
                        <Form.Select
                          value={formData.publicado ? 'Published' : 'Draft'}
                          onChange={(e) => setFormData({ ...formData, publicado: e.target.value === 'Published' })}
                        >
                          <option value="Published">Publicado</option>
                          <option value="Draft">Borrador</option>
                        </Form.Select>
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
                      onClick={() => router.push('/tienda/pedidos')}
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
