'use client'

import { Badge, Col, Row, Alert, Card, CardHeader, CardBody, Form, Button, FormGroup, FormLabel, FormControl } from 'react-bootstrap'
import { format } from 'date-fns'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LuSave, LuX } from 'react-icons/lu'

interface ObraDetailsProps {
  obra: any
  obraId: string
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

const ObraDetails = ({ obra: initialObra, obraId, error: initialError }: ObraDetailsProps) => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(initialError || null)
  const [success, setSuccess] = useState(false)
  const [obra, setObra] = useState(initialObra)
  
  if (!obra && !initialError) {
    return (
      <Alert variant="warning">
        <strong>Cargando...</strong> Obteniendo información de la obra.
      </Alert>
    )
  }

  if (initialError && !obra) {
    return (
      <Alert variant="danger">
        <strong>Error:</strong> {initialError}
      </Alert>
    )
  }
  
  const attrs = obra.attributes || {}
  const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (obra as any)

  // Inicializar formData con los valores de la obra
  const [formData, setFormData] = useState({
    nombre: getField(data, 'name', 'nombre', 'NOMBRE', 'NAME') || '',
    descripcion: getField(data, 'descripcion', 'description', 'DESCRIPCION', 'DESCRIPTION') || '',
  })

  // Actualizar formData cuando cambie la obra
  useEffect(() => {
    if (obra) {
      const attrs = obra.attributes || {}
      const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (obra as any)
      
      setFormData({
        nombre: getField(data, 'name', 'nombre', 'NOMBRE', 'NAME') || '',
        descripcion: getField(data, 'descripcion', 'description', 'DESCRIPCION', 'DESCRIPTION') || '',
      })
    }
  }, [obra])

  // Obtener el ID correcto
  const obId = obra.id?.toString() || obra.documentId || obraId
  
  // Contar productos (si hay relación)
  const productos = data.productos?.data || data.products?.data || data.productos || data.products || []
  const productosCount = Array.isArray(productos) ? productos.length : 0

  const isPublished = !!(attrs.publishedAt || obra.publishedAt)
  const createdAt = attrs.createdAt || obra.createdAt || new Date().toISOString()
  const createdDate = new Date(createdAt)
  const updatedAt = attrs.updatedAt || obra.updatedAt || new Date().toISOString()
  const updatedDate = new Date(updatedAt)
  
  // Validar que obra existe
  if (!obra) {
    return (
      <Alert variant="warning">
        <strong>Error:</strong> No se pudo cargar la información de la obra.
      </Alert>
    )
  }

  // Validar que tenemos un ID válido
  if (!obId || obId === 'unknown') {
    console.error('[ObraDetails] No se pudo obtener un ID válido de la obra:', {
      id: obra.id,
      documentId: obra.documentId,
      obra: obra,
    })
    return (
      <Alert variant="danger">
        <strong>Error:</strong> No se pudo obtener el ID de la obra.
      </Alert>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const url = `/api/tienda/obras/${obId}`
      const body = JSON.stringify({
        data: {
          name: formData.nombre,
          descripcion: formData.descripcion || null,
        },
      })
      
      const response = await fetch(url, {
        method: 'PUT',
        credentials: 'include', // Incluir cookies
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
        setObra(result.data.strapi || result.data)
      }
      
      // Ocultar el mensaje de éxito después de 2 segundos
      setTimeout(() => {
        setSuccess(false)
      }, 2000)
    } catch (err: any) {
      const errorMessage = err.message || 'Error al guardar cambios'
      setError(errorMessage)
      console.error('[ObraDetails] Error al guardar:', {
        obId,
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
          <h5 className="mb-0">Editar Obra</h5>
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
                    Nombre de la Obra <span className="text-danger">*</span>
                  </FormLabel>
                  <FormControl
                    type="text"
                    placeholder="Ej: Primera Edición, Segunda Edición"
                    value={formData.nombre}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, nombre: e.target.value }))
                    }
                    required
                  />
                  <small className="text-muted">
                    Nombre de la obra que se mostrará en los productos
                  </small>
                </FormGroup>
              </Col>

              <Col md={12}>
                <FormGroup>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl
                    as="textarea"
                    rows={3}
                    placeholder="Descripción de la obra..."
                    value={formData.descripcion}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, descripcion: e.target.value }))
                    }
                  />
                  <small className="text-muted">
                    Opcional. Descripción de la obra
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
                    {isPublished ? 'Publicada' : 'Borrador'}
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

export default ObraDetails



