'use client'

import { Badge, Col, Row, Alert, Card, CardHeader, CardBody, Form, Button, FormGroup, FormLabel, FormControl } from 'react-bootstrap'
import { format } from 'date-fns'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LuSave, LuX } from 'react-icons/lu'

interface EtiquetaDetailsProps {
  etiqueta: any
  etiquetaId: string
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

const EtiquetaDetails = ({ etiqueta: initialEtiqueta, etiquetaId, error: initialError }: EtiquetaDetailsProps) => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(initialError || null)
  const [success, setSuccess] = useState(false)
  const [etiqueta, setEtiqueta] = useState(initialEtiqueta)
  
  if (!etiqueta && !initialError) {
    return (
      <Alert variant="warning">
        <strong>Cargando...</strong> Obteniendo información de la etiqueta.
      </Alert>
    )
  }

  if (initialError && !etiqueta) {
    return (
      <Alert variant="danger">
        <strong>Error:</strong> {initialError}
      </Alert>
    )
  }
  
  const attrs = etiqueta.attributes || {}
  const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (etiqueta as any)

  // Inicializar formData
  const [formData, setFormData] = useState({
    name: getField(data, 'name', 'nombre', 'NOMBRE', 'NAME') || '',
    descripcion: getField(data, 'descripcion', 'description', 'DESCRIPCION', 'DESCRIPTION') || '',
  })

  // Actualizar formData cuando cambie la etiqueta
  useEffect(() => {
    if (etiqueta) {
      const attrs = etiqueta.attributes || {}
      const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (etiqueta as any)
      
      setFormData({
        name: getField(data, 'name', 'nombre', 'NOMBRE', 'NAME') || '',
        descripcion: getField(data, 'descripcion', 'description', 'DESCRIPCION', 'DESCRIPTION') || '',
      })
    }
  }, [etiqueta])

  // Obtener el ID correcto
  const etqId = etiqueta.id?.toString() || etiqueta.documentId || etiquetaId
  
  // Contar productos
  const productos = data.productos?.data || data.products?.data || data.productos || data.products || []
  const productosCount = Array.isArray(productos) ? productos.length : 0

  const isPublished = !!(attrs.publishedAt || etiqueta.publishedAt)
  const createdAt = attrs.createdAt || etiqueta.createdAt || new Date().toISOString()
  const createdDate = new Date(createdAt)

  // Obtener estado_publicacion
  const estadoPublicacionRaw = getField(data, 'estado_publicacion', 'ESTADO_PUBLICACION', 'estadoPublicacion') || 'pendiente'
  const estadoPublicacion = typeof estadoPublicacionRaw === 'string' 
    ? estadoPublicacionRaw.toLowerCase() 
    : estadoPublicacionRaw

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      if (!formData.name.trim()) {
        throw new Error('El nombre de la etiqueta es obligatorio')
      }

      const updateData: any = {
        data: {
          name: formData.name.trim(),
          descripcion: formData.descripcion?.trim() || null,
        },
      }

      const response = await fetch(`/api/tienda/etiquetas/${etqId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al actualizar la etiqueta')
      }

      setSuccess(true)
      // Recargar datos
      router.refresh()
    } catch (err: any) {
      console.error('[EtiquetaDetails] Error:', err)
      setError(err.message || 'Error al actualizar la etiqueta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Card className="mb-4">
        <CardHeader>
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Información de la Etiqueta</h5>
            <div className="d-flex gap-2">
              <Badge bg={isPublished ? 'success' : 'secondary'}>
                {isPublished ? 'Publicado' : 'No Publicado'}
              </Badge>
              <Badge bg={
                estadoPublicacion === 'publicado' ? 'success' :
                estadoPublicacion === 'pendiente' ? 'warning' :
                'secondary'
              }>
                {estadoPublicacion === 'publicado' ? 'Publicado' :
                 estadoPublicacion === 'pendiente' ? 'Pendiente' :
                 'Borrador'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          <Row>
            <Col md={6}>
              <p><strong>ID:</strong> {etqId}</p>
              <p><strong>Productos:</strong> {productosCount}</p>
              <p><strong>Fecha de creación:</strong> {format(createdDate, 'dd/MM/yyyy HH:mm')}</p>
            </Col>
          </Row>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h5 className="mb-0">Editar Etiqueta</h5>
        </CardHeader>
        <CardBody>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert variant="success">
              ¡Etiqueta actualizada exitosamente!
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            <Row>
              <Col md={12}>
                <FormGroup className="mb-3">
                  <FormLabel>
                    Nombre de la Etiqueta <span className="text-danger">*</span>
                  </FormLabel>
                  <FormControl
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    required
                    disabled={loading}
                  />
                </FormGroup>
              </Col>

              <Col md={12}>
                <FormGroup className="mb-3">
                  <FormLabel>Descripción</FormLabel>
                  <FormControl
                    as="textarea"
                    rows={4}
                    value={formData.descripcion}
                    onChange={(e) => handleFieldChange('descripcion', e.target.value)}
                    disabled={loading}
                  />
                </FormGroup>
              </Col>
            </Row>

            <div className="d-flex gap-2 justify-content-end">
              <Button
                variant="light"
                onClick={() => router.back()}
                disabled={loading}
              >
                <LuX className="me-1" /> Cancelar
              </Button>
              <Button variant="primary" type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <LuSave className="me-1" /> Guardar Cambios
                  </>
                )}
              </Button>
            </div>
          </Form>
        </CardBody>
      </Card>
    </>
  )
}

export default EtiquetaDetails

