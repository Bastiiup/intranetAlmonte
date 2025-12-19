'use client'

import { Badge, Col, Row, Alert, Card, CardHeader, CardBody, Form, Button, FormGroup, FormLabel, FormControl } from 'react-bootstrap'
import { format } from 'date-fns'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LuSave, LuX } from 'react-icons/lu'

interface SelloDetailsProps {
  sello: any
  selloId: string
  error?: string | null
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

const SelloDetails = ({ sello: initialSello, selloId, error: initialError }: SelloDetailsProps) => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(initialError || null)
  const [success, setSuccess] = useState(false)
  const [sello, setSello] = useState(initialSello)
  
  if (!sello && !initialError) {
    return (
      <Alert variant="warning">
        <strong>Cargando...</strong> Obteniendo información del sello.
      </Alert>
    )
  }

  if (initialError && !sello) {
    return (
      <Alert variant="danger">
        <strong>Error:</strong> {initialError}
      </Alert>
    )
  }
  
  const attrs = sello.attributes || {}
  const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (sello as any)

  // Inicializar formData con los valores del sello según schema real
  const [formData, setFormData] = useState({
    codigo_sello: getField(data, 'codigo_sello', 'codigoSello', 'codigo', 'CODIGO_SELLO') || '',
    nombre_sello: getField(data, 'nombre_sello', 'nombreSello', 'nombre', 'NOMBRE_SELLO', 'NAME') || '',
    descripcion: getField(data, 'descripcion', 'description', 'DESCRIPCION', 'DESCRIPTION') || '',
  })

  // Actualizar formData cuando cambie el sello
  useEffect(() => {
    if (sello) {
      const attrs = sello.attributes || {}
      const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (sello as any)
      
      setFormData({
        codigo_sello: getField(data, 'codigo_sello', 'codigoSello', 'codigo', 'CODIGO_SELLO') || '',
        nombre_sello: getField(data, 'nombre_sello', 'nombreSello', 'nombre', 'NOMBRE_SELLO', 'NAME') || '',
        descripcion: getField(data, 'descripcion', 'description', 'DESCRIPCION', 'DESCRIPTION') || '',
      })
    }
  }, [sello])

  // Obtener el ID correcto
  const sId = sello.id?.toString() || sello.documentId || selloId
  
  // Contar productos asociados (si hay relación)
  const productos = data.productos?.data || data.products?.data || data.productos || data.products || []
  const productosCount = Array.isArray(productos) ? productos.length : 0

  const isPublished = !!(attrs.publishedAt || sello.publishedAt)
  const createdAt = attrs.createdAt || sello.createdAt || new Date().toISOString()
  const createdDate = new Date(createdAt)
  const updatedAt = attrs.updatedAt || sello.updatedAt || new Date().toISOString()
  const updatedDate = new Date(updatedAt)
  
  // Validar que sello existe
  if (!sello) {
    return (
      <Alert variant="warning">
        <strong>Error:</strong> No se pudo cargar la información del sello.
      </Alert>
    )
  }

  // Validar que tenemos un ID válido
  if (!sId || sId === 'unknown') {
    console.error('[SelloDetails] No se pudo obtener un ID válido del sello:', {
      id: sello.id,
      documentId: sello.documentId,
      sello: sello,
    })
    return (
      <Alert variant="danger">
        <strong>Error:</strong> No se pudo obtener el ID del sello.
      </Alert>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const url = `/api/tienda/sello/${sId}`
      const body = JSON.stringify({
        data: {
          codigo_sello: formData.codigo_sello.trim(),
          nombre_sello: formData.nombre_sello.trim(),
          descripcion: formData.descripcion.trim() || null,
        },
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

      setSuccess(true)
      
      // Actualizar el estado local con los datos actualizados de la respuesta
      if (result.data) {
        setSello(result.data.strapi || result.data)
      }
      
      // Ocultar el mensaje de éxito después de 2 segundos
      setTimeout(() => {
        setSuccess(false)
      }, 2000)
    } catch (err: any) {
      const errorMessage = err.message || 'Error al guardar cambios'
      setError(errorMessage)
      console.error('[SelloDetails] Error al guardar:', {
        sId,
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
          <h5 className="mb-0">Editar Sello</h5>
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
              <Col md={12}>
                <FormGroup>
                  <FormLabel>
                    Código del Sello <span className="text-danger">*</span>
                  </FormLabel>
                  <FormControl
                    type="text"
                    placeholder="Ej: SELLO-001, SELLO-002"
                    value={formData.codigo_sello}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, codigo_sello: e.target.value }))
                    }
                    required
                  />
                  <small className="text-muted">
                    Código único identificador del sello (requerido).
                  </small>
                </FormGroup>
              </Col>

              <Col md={12}>
                <FormGroup>
                  <FormLabel>
                    Nombre del Sello <span className="text-danger">*</span>
                  </FormLabel>
                  <FormControl
                    type="text"
                    placeholder="Ej: Sello Editorial, Sello Académico"
                    value={formData.nombre_sello}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, nombre_sello: e.target.value }))
                    }
                    required
                  />
                  <small className="text-muted">
                    Nombre completo del sello (requerido).
                  </small>
                </FormGroup>
              </Col>

              <Col md={12}>
                <FormGroup>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl
                    as="textarea"
                    rows={4}
                    placeholder="Descripción detallada del sello..."
                    value={formData.descripcion}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, descripcion: e.target.value }))
                    }
                  />
                  <small className="text-muted">
                    Opcional. Descripción del sello.
                  </small>
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
                <label className="form-label text-muted">Productos asociados</label>
                <div>
                  <Badge bg="info" className="fs-base">
                    {productosCount} producto{productosCount !== 1 ? 's' : ''}
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
                <label className="form-label text-muted">Fecha de creación</label>
                <div>
                  <span className="text-dark">
                    {format(createdDate, 'dd MMM, yyyy')} <small className="text-muted">{format(createdDate, 'h:mm a')}</small>
                  </span>
                </div>
              </div>
            </Col>

            <Col md={6}>
              <div>
                <label className="form-label text-muted">Última actualización</label>
                <div>
                  <span className="text-dark">
                    {format(updatedDate, 'dd MMM, yyyy')} <small className="text-muted">{format(updatedDate, 'h:mm a')}</small>
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

export default SelloDetails

