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

  // Inicializar formData con los valores del cliente
  const [formData, setFormData] = useState({
    nombre: getField(data, 'nombre', 'NOMBRE', 'name', 'NAME') || '',
    correo_electronico: getField(data, 'correo_electronico', 'CORREO_ELECTRONICO', 'email', 'EMAIL') || '',
    telefono: getField(data, 'telefono', 'TELEFONO', 'phone', 'PHONE') || '',
    direccion: getField(data, 'direccion', 'DIRECCION', 'address', 'ADDRESS') || '',
    pedidos: (typeof data.pedidos === 'number' ? data.pedidos : (typeof data.pedidos === 'string' ? parseInt(data.pedidos) : 0)) || 0,
    gasto_total: (typeof data.gasto_total === 'number' ? data.gasto_total : (typeof data.gasto_total === 'string' ? parseFloat(data.gasto_total) : 0)) || 0,
    fecha_registro: getField(data, 'fecha_registro', 'FECHA_REGISTRO', 'fechaRegistro') || attrs.createdAt || cliente.createdAt || '',
    ultima_actividad: getField(data, 'ultima_actividad', 'ULTIMA_ACTIVIDAD', 'ultimaActividad') || '',
  })

  // Actualizar formData cuando cambie el cliente
  useEffect(() => {
    const attrs = cliente.attributes || {}
    const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (cliente as any)
    
    setFormData({
      nombre: getField(data, 'nombre', 'NOMBRE', 'name', 'NAME') || '',
      correo_electronico: getField(data, 'correo_electronico', 'CORREO_ELECTRONICO', 'email', 'EMAIL') || '',
      telefono: getField(data, 'telefono', 'TELEFONO', 'phone', 'PHONE') || '',
      direccion: getField(data, 'direccion', 'DIRECCION', 'address', 'ADDRESS') || '',
      pedidos: (typeof data.pedidos === 'number' ? data.pedidos : (typeof data.pedidos === 'string' ? parseInt(data.pedidos) : 0)) || 0,
      gasto_total: (typeof data.gasto_total === 'number' ? data.gasto_total : (typeof data.gasto_total === 'string' ? parseFloat(data.gasto_total) : 0)) || 0,
      fecha_registro: getField(data, 'fecha_registro', 'FECHA_REGISTRO', 'fechaRegistro') || attrs.createdAt || cliente.createdAt || '',
      ultima_actividad: getField(data, 'ultima_actividad', 'ULTIMA_ACTIVIDAD', 'ultimaActividad') || '',
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
      console.log('[ClienteDetails] ===== INICIANDO GUARDADO =====')
      console.log('[ClienteDetails] Datos del cliente:', {
        id: cliente.id,
        documentId: cliente.documentId,
        cliId,
        formData,
      })

      // Validar nombre y correo obligatorios
      if (!formData.nombre.trim()) {
        throw new Error('El nombre del cliente es obligatorio')
      }

      if (!formData.correo_electronico.trim()) {
        throw new Error('El correo electrónico del cliente es obligatorio')
      }

      // Validar formato de email básico
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.correo_electronico.trim())) {
        throw new Error('El correo electrónico no tiene un formato válido')
      }

      const url = `/api/tienda/clientes/${cliId}`
      const body = JSON.stringify({
        data: {
          nombre: formData.nombre.trim(),
          correo_electronico: formData.correo_electronico.trim(),
          telefono: formData.telefono.trim() || null,
          direccion: formData.direccion.trim() || null,
          pedidos: parseInt(formData.pedidos.toString()) || 0,
          gasto_total: parseFloat(formData.gasto_total.toString()) || 0,
          fecha_registro: formData.fecha_registro || null,
          ultima_actividad: formData.ultima_actividad || null,
        },
      })
      
      console.log('[ClienteDetails] Enviando petición PUT:', {
        url,
        cliId,
        body,
      })
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: body,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || `Error HTTP: ${response.status}`
        throw new Error(errorMessage)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Error al guardar cambios')
      }

      console.log('[ClienteDetails] ✅ Cambios guardados exitosamente:', result)
      setSuccess(true)
      
      // Actualizar el estado local con los datos actualizados de la respuesta
      if (result.data) {
        setCliente(result.data)
        const updatedData = result.data.attributes || result.data
        
        setFormData({
          nombre: getField(updatedData, 'nombre', 'NOMBRE', 'name', 'NAME') || formData.nombre,
          correo_electronico: getField(updatedData, 'correo_electronico', 'CORREO_ELECTRONICO', 'email', 'EMAIL') || formData.correo_electronico,
          telefono: getField(updatedData, 'telefono', 'TELEFONO', 'phone', 'PHONE') || formData.telefono,
          direccion: getField(updatedData, 'direccion', 'DIRECCION', 'address', 'ADDRESS') || formData.direccion,
          pedidos: (typeof updatedData.pedidos === 'number' ? updatedData.pedidos : (typeof updatedData.pedidos === 'string' ? parseInt(updatedData.pedidos) : 0)) || formData.pedidos,
          gasto_total: (typeof updatedData.gasto_total === 'number' ? updatedData.gasto_total : (typeof updatedData.gasto_total === 'string' ? parseFloat(updatedData.gasto_total) : 0)) || formData.gasto_total,
          fecha_registro: getField(updatedData, 'fecha_registro', 'FECHA_REGISTRO', 'fechaRegistro') || formData.fecha_registro,
          ultima_actividad: getField(updatedData, 'ultima_actividad', 'ULTIMA_ACTIVIDAD', 'ultimaActividad') || formData.ultima_actividad,
        })
      }
      
      // Ocultar el mensaje de éxito después de 2 segundos
      setTimeout(() => {
        setSuccess(false)
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
                    Nombre <span className="text-danger">*</span>
                  </FormLabel>
                  <FormControl
                    type="text"
                    placeholder="Ej: Juan Pérez"
                    value={formData.nombre}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, nombre: e.target.value }))
                    }
                    required
                  />
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <FormLabel>
                    Correo Electrónico <span className="text-danger">*</span>
                  </FormLabel>
                  <FormControl
                    type="email"
                    placeholder="Ej: juan.perez@ejemplo.com"
                    value={formData.correo_electronico}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, correo_electronico: e.target.value }))
                    }
                    required
                  />
                </FormGroup>
              </Col>

              <Col md={6}>
                <FormGroup>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl
                    type="text"
                    placeholder="Ej: +56 9 1234 5678"
                    value={formData.telefono}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, telefono: e.target.value }))
                    }
                  />
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <FormLabel>Dirección</FormLabel>
                  <FormControl
                    type="text"
                    placeholder="Ej: Calle Principal 123, Santiago"
                    value={formData.direccion}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, direccion: e.target.value }))
                    }
                  />
                </FormGroup>
              </Col>

              <Col md={6}>
                <FormGroup>
                  <FormLabel>Pedidos</FormLabel>
                  <FormControl
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.pedidos}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, pedidos: parseInt(e.target.value) || 0 }))
                    }
                  />
                  <small className="text-muted">Número total de pedidos realizados</small>
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <FormLabel>Total Gastado</FormLabel>
                  <FormControl
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.gasto_total}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, gasto_total: parseFloat(e.target.value) || 0 }))
                    }
                  />
                  <small className="text-muted">Total acumulado de compras</small>
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
                    {formData.fecha_registro ? (
                      <>
                        {format(new Date(formData.fecha_registro), 'dd MMM, yyyy')}{' '}
                        <small className="text-muted">
                          {format(new Date(formData.fecha_registro), 'h:mm a')}
                        </small>
                      </>
                    ) : (
                      <>
                        {format(createdDate, 'dd MMM, yyyy')}{' '}
                        <small className="text-muted">{format(createdDate, 'h:mm a')}</small>
                      </>
                    )}
                  </span>
                </div>
              </div>
            </Col>

            <Col md={6}>
              <div>
                <label className="form-label text-muted">Última Actividad</label>
                <div>
                  <span className="text-dark">
                    {formData.ultima_actividad ? (
                      format(new Date(formData.ultima_actividad), 'dd MMM, yyyy')
                    ) : (
                      'N/A'
                    )}
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

