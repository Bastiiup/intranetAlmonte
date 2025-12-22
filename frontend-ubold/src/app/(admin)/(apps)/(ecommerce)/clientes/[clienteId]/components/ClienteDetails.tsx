'use client'

import { Badge, Col, Row, Alert, Card, CardHeader, CardBody, Form, Button, FormGroup, FormLabel, FormControl } from 'react-bootstrap'
import { format } from 'date-fns'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LuSave, LuX } from 'react-icons/lu'

interface ClienteDetailsProps {
  cliente: any
  clienteId: string
}

// Helper para obtener campo con múltiples variaciones
const getField = (obj: any, ...fieldNames: string[]): any => {
  for (const fieldName of fieldNames) {
    if (obj[fieldName] !== undefined && obj[fieldName] !== null && obj[fieldName] !== '') {
      return obj[fieldName]
    }
  }
  return undefined
}

const ClienteDetails = ({ cliente: initialCliente, clienteId }: ClienteDetailsProps) => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [cliente, setCliente] = useState(initialCliente)
  
  const attrs = cliente.attributes || {}
  const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (cliente as any)

  // Obtener woocommerce_id y email para buscar en WooCommerce
  const woocommerceId = getField(data, 'woocommerce_id', 'WOCOMMERCE_ID') || null
  const emailCliente = getField(data, 'correo_electronico', 'CORREO_ELECTRONICO', 'email', 'EMAIL') || ''
  const nombreCompleto = getField(data, 'nombre', 'NOMBRE', 'name', 'NAME') || ''
  
  // Parsear nombre en first_name y last_name
  const nombrePartes = nombreCompleto.trim().split(/\s+/)
  const first_name = nombrePartes[0] || ''
  const last_name = nombrePartes.slice(1).join(' ') || ''

  // Inicializar formData con formato simple (igual que el modal del POS)
  const [formData, setFormData] = useState({
    email: emailCliente,
    first_name: first_name,
    last_name: last_name,
    phone: '',
  })

  // Actualizar formData cuando cambie el cliente
  useEffect(() => {
    const attrs = cliente.attributes || {}
    const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (cliente as any)
    
    const email = getField(data, 'correo_electronico', 'CORREO_ELECTRONICO', 'email', 'EMAIL') || ''
    const nombre = getField(data, 'nombre', 'NOMBRE', 'name', 'NAME') || ''
    const nombrePartes = nombre.trim().split(/\s+/)
    const first = nombrePartes[0] || ''
    const last = nombrePartes.slice(1).join(' ') || ''
    
    setFormData({
      email: email,
      first_name: first,
      last_name: last,
      phone: '',
    })
  }, [cliente])

  // Obtener el ID correcto
  const cliId = cliente.id?.toString() || cliente.documentId || clienteId

  const isPublished = !!(attrs.publishedAt || cliente.publishedAt)
  const createdAt = attrs.createdAt || cliente.createdAt || new Date().toISOString()
  const createdDate = new Date(createdAt)
  const updatedAt = attrs.updatedAt || cliente.updatedAt || new Date().toISOString()
  const updatedDate = new Date(updatedAt)
  
  // Validar que cliente existe
  if (!cliente) {
    return (
      <Alert variant="warning">
        <strong>Error:</strong> No se pudo cargar la información del cliente.
      </Alert>
    )
  }

  // Validar que tenemos un ID válido
  if (!cliId || cliId === 'unknown') {
    console.error('[ClienteDetails] No se pudo obtener un ID válido del cliente:', {
      id: cliente.id,
      documentId: cliente.documentId,
      cliente: cliente,
    })
    return (
      <Alert variant="danger">
        <strong>Error:</strong> No se pudo obtener el ID del cliente.
      </Alert>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      // Validar campos (igual que el modal del POS)
      if (!formData.email.trim()) {
        throw new Error('El correo electrónico es obligatorio')
      }

      if (!formData.first_name.trim()) {
        throw new Error('El nombre es obligatorio')
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email.trim())) {
        throw new Error('El correo electrónico no tiene un formato válido')
      }

      // Buscar cliente en WooCommerce por woocommerce_id o email
      let customerId: number | null = null
      
      if (woocommerceId) {
        customerId = parseInt(woocommerceId.toString())
      } else {
        // Buscar por email en WooCommerce
        try {
          const searchResponse = await fetch(`/api/woocommerce/customers?search=${encodeURIComponent(formData.email)}&per_page=1`)
          const searchData = await searchResponse.json()
          if (searchData.success && searchData.data && searchData.data.length > 0) {
            customerId = searchData.data[0].id
          }
        } catch (searchErr) {
          console.warn('[ClienteDetails] No se pudo buscar cliente en WooCommerce:', searchErr)
        }
      }

      // Preparar datos en formato simple (igual que el modal del POS)
      const updateData = {
        email: formData.email.trim(),
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim() || '',
        phone: formData.phone.trim() || '',
      }

      let response: Response
      let result: any

      if (customerId) {
        // Actualizar cliente existente en WooCommerce
        response = await fetch(`/api/woocommerce/customers/${customerId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData),
        })
        result = await response.json()
      } else {
        // Crear nuevo cliente en WooCommerce si no existe
        response = await fetch('/api/woocommerce/customers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData),
        })
        result = await response.json()
      }

      if (!result.success) {
        throw new Error(result.error || 'Error al guardar cambios')
      }

      console.log('[ClienteDetails] ✅ Cambios guardados exitosamente')
      setSuccess(true)
      
      // Ocultar el mensaje de éxito después de 2 segundos
      setTimeout(() => {
        setSuccess(false)
        router.refresh() // Refrescar la página para cargar datos actualizados
      }, 2000)
    } catch (err: any) {
      const errorMessage = err.message || 'Error al guardar cambios'
      setError(errorMessage)
      console.error('[ClienteDetails] Error al guardar:', {
        cliId,
        error: errorMessage,
        err,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Card>
        <CardHeader>
          <h5 className="mb-0">Editar Cliente</h5>
        </CardHeader>
        <CardBody>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert variant="success">
              ¡Cambios guardados exitosamente!
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            <Row className="g-3">
              <Col md={6}>
                <FormGroup>
                  <FormLabel>
                    Email <span className="text-danger">*</span>
                  </FormLabel>
                  <FormControl
                    type="email"
                    placeholder="Ej: juan.perez@ejemplo.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, email: e.target.value }))
                    }
                    required
                  />
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <FormLabel>
                    Nombre <span className="text-danger">*</span>
                  </FormLabel>
                  <FormControl
                    type="text"
                    placeholder="Ej: Juan"
                    value={formData.first_name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, first_name: e.target.value }))
                    }
                    required
                  />
                </FormGroup>
              </Col>

              <Col md={6}>
                <FormGroup>
                  <FormLabel>Apellido</FormLabel>
                  <FormControl
                    type="text"
                    placeholder="Ej: Pérez"
                    value={formData.last_name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, last_name: e.target.value }))
                    }
                  />
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl
                    type="tel"
                    placeholder="Ej: +56912345678"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, phone: e.target.value }))
                    }
                  />
                </FormGroup>
              </Col>
            </Row>

            <div className="d-flex gap-2 mt-4">
              <Button
                type="submit"
                variant="primary"
                disabled={loading}
              >
                <LuSave className="fs-sm me-2" />
                {loading ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
              <Button
                type="button"
                variant="light"
                onClick={() => router.back()}
              >
                <LuX className="fs-sm me-2" />
                Cancelar
              </Button>
            </div>
          </Form>
        </CardBody>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <h5 className="mb-0">Información Adicional</h5>
        </CardHeader>
        <CardBody>
          <Row className="g-3">
            <Col md={6}>
              <div>
                <label className="form-label text-muted">ID Cliente</label>
                <div>
                  <Badge bg="info" className="fs-base">
                    {cliId || 'N/A'}
                  </Badge>
                </div>
              </div>
            </Col>

            <Col md={6}>
              <div>
                <label className="form-label text-muted">Estado</label>
                <div>
                  <Badge bg={isPublished ? 'success' : 'secondary'} className="fs-base">
                    {isPublished ? 'Publicado' : 'Borrador'}
                  </Badge>
                </div>
              </div>
            </Col>

            <Col md={6}>
              <div>
                <label className="form-label text-muted">Fecha de Registro</label>
                <div>
                  <span className="text-dark">
                    {(() => {
                      const fechaRegistro = getField(data, 'fecha_registro', 'FECHA_REGISTRO', 'fechaRegistro')
                      const fecha = fechaRegistro ? new Date(fechaRegistro) : createdDate
                      return (
                        <>
                          {format(fecha, 'dd MMM, yyyy')}{' '}
                          <small className="text-muted">{format(fecha, 'h:mm a')}</small>
                        </>
                      )
                    })()}
                  </span>
                </div>
              </div>
            </Col>

            <Col md={6}>
              <div>
                <label className="form-label text-muted">Última Actividad</label>
                <div>
                  <span className="text-dark">
                    {(() => {
                      const ultimaActividad = getField(data, 'ultima_actividad', 'ULTIMA_ACTIVIDAD', 'ultimaActividad')
                      return ultimaActividad ? (
                        format(new Date(ultimaActividad), 'dd MMM, yyyy')
                      ) : (
                        'N/A'
                      )
                    })()}
                  </span>
                </div>
              </div>
            </Col>

            <Col md={6}>
              <div>
                <label className="form-label text-muted">Fecha de creación</label>
                <div>
                  <span className="text-dark">
                    {format(createdDate, 'dd MMM, yyyy')}{' '}
                    <small className="text-muted">{format(createdDate, 'h:mm a')}</small>
                  </span>
                </div>
              </div>
            </Col>

            <Col md={6}>
              <div>
                <label className="form-label text-muted">Última actualización</label>
                <div>
                  <span className="text-dark">
                    {format(updatedDate, 'dd MMM, yyyy')}{' '}
                    <small className="text-muted">{format(updatedDate, 'h:mm a')}</small>
                  </span>
                </div>
              </div>
            </Col>
          </Row>
        </CardBody>
      </Card>
    </div>
  )
}

export default ClienteDetails

