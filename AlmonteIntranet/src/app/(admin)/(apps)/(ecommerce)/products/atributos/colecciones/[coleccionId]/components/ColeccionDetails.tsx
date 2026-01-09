'use client'

import { Badge, Col, Row, Alert, Card, CardHeader, CardBody, Form, Button, FormGroup, FormLabel, FormControl } from 'react-bootstrap'
import { format } from 'date-fns'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LuSave, LuX } from 'react-icons/lu'

interface ColeccionDetailsProps {
  coleccion: any
  coleccionId: string
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

const ColeccionDetails = ({ coleccion: initialColeccion, coleccionId }: ColeccionDetailsProps) => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [coleccion, setColeccion] = useState(initialColeccion)
  
  const attrs = coleccion.attributes || {}
  const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (coleccion as any)

  // Inicializar formData con los valores de la colección
  const [formData, setFormData] = useState({
    nombre_coleccion: getField(data, 'nombre_coleccion', 'nombreColeccion', 'NOMBRE_COLECCION') || '',
    id_coleccion: getField(data, 'id_coleccion', 'idColeccion', 'ID_COLECCION')?.toString() || '',
    editorial: data.editorial?.data?.id?.toString() || data.editorial?.id?.toString() || '',
    sello: data.sello?.data?.id?.toString() || data.sello?.id?.toString() || '',
    estado_publicacion: getField(data, 'estado_publicacion', 'ESTADO_PUBLICACION', 'estadoPublicacion') || 'Pendiente',
  })

  // Actualizar formData cuando cambie la colección
  useEffect(() => {
    const attrs = coleccion.attributes || {}
    const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (coleccion as any)
    
    setFormData({
      nombre_coleccion: getField(data, 'nombre_coleccion', 'nombreColeccion', 'NOMBRE_COLECCION') || '',
      id_coleccion: getField(data, 'id_coleccion', 'idColeccion', 'ID_COLECCION')?.toString() || '',
      editorial: data.editorial?.data?.id?.toString() || data.editorial?.id?.toString() || '',
      sello: data.sello?.data?.id?.toString() || data.sello?.id?.toString() || '',
      estado_publicacion: getField(data, 'estado_publicacion', 'ESTADO_PUBLICACION', 'estadoPublicacion') || 'Pendiente',
    })
  }, [coleccion])

  // Obtener el ID correcto
  const colId = coleccion.id?.toString() || coleccion.documentId || coleccionId
  
  // Contar libros (si hay relación)
  const libros = data.libros?.data || data.books || []
  const librosCount = Array.isArray(libros) ? libros.length : 0

  // Obtener nombres de editorial y sello
  const editorialNombre = data.editorial?.data?.attributes?.nombre_editorial || data.editorial?.attributes?.nombre_editorial || data.editorial?.nombre_editorial || null
  const selloNombre = data.sello?.data?.attributes?.nombre_sello || data.sello?.attributes?.nombre_sello || data.sello?.nombre_sello || null

  const isPublished = !!(attrs.publishedAt || coleccion.publishedAt)
  const createdAt = attrs.createdAt || coleccion.createdAt || new Date().toISOString()
  const createdDate = new Date(createdAt)
  const updatedAt = attrs.updatedAt || coleccion.updatedAt || new Date().toISOString()
  const updatedDate = new Date(updatedAt)
  
  // Validar que colección existe
  if (!coleccion) {
    return (
      <Alert variant="warning">
        <strong>Error:</strong> No se pudo cargar la información de la colección.
      </Alert>
    )
  }

  // Validar que tenemos un ID válido
  if (!colId || colId === 'unknown') {
    console.error('[ColeccionDetails] No se pudo obtener un ID válido de la colección:', {
      id: coleccion.id,
      documentId: coleccion.documentId,
      coleccion: coleccion,
    })
    return (
      <Alert variant="danger">
        <strong>Error:</strong> No se pudo obtener el ID de la colección.
      </Alert>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      console.log('[ColeccionDetails] ===== INICIANDO GUARDADO =====')
      console.log('[ColeccionDetails] Datos de la colección:', {
        id: coleccion.id,
        documentId: coleccion.documentId,
        colId,
        formData,
      })

      const url = `/api/tienda/colecciones/${colId}`
      const body = JSON.stringify({
        data: {
          nombre_coleccion: formData.nombre_coleccion,
          id_coleccion: formData.id_coleccion ? parseInt(formData.id_coleccion) : null,
          editorial: formData.editorial || null,
          sello: formData.sello || null,
          estado_publicacion: formData.estado_publicacion,
        },
      })
      
      console.log('[ColeccionDetails] Enviando petición PUT:', {
        url,
        colId,
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

      console.log('[ColeccionDetails] ✅ Cambios guardados exitosamente:', result)
      setSuccess(true)
      
      // Actualizar el estado local con los datos actualizados de la respuesta
      if (result.data) {
        setColeccion(result.data)
        const updatedData = result.data.attributes || result.data
        
        setFormData({
          nombre_coleccion: getField(updatedData, 'nombre_coleccion', 'nombreColeccion', 'NOMBRE_COLECCION') || formData.nombre_coleccion,
          id_coleccion: getField(updatedData, 'id_coleccion', 'idColeccion', 'ID_COLECCION')?.toString() || formData.id_coleccion,
          editorial: updatedData.editorial?.data?.id?.toString() || updatedData.editorial?.id?.toString() || formData.editorial,
          sello: updatedData.sello?.data?.id?.toString() || updatedData.sello?.id?.toString() || formData.sello,
          estado_publicacion: getField(updatedData, 'estado_publicacion', 'ESTADO_PUBLICACION', 'estadoPublicacion') || formData.estado_publicacion,
        })
      }
      
      // Ocultar el mensaje de éxito después de 2 segundos
      setTimeout(() => {
        setSuccess(false)
      }, 2000)
    } catch (err: any) {
      const errorMessage = err.message || 'Error al guardar cambios'
      setError(errorMessage)
      console.error('[ColeccionDetails] Error al guardar:', {
        colId,
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
          <h5 className="mb-0">Editar Colección</h5>
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
                    Nombre de Colección <span className="text-danger">*</span>
                  </FormLabel>
                  <FormControl
                    type="text"
                    placeholder="Ej: Colección Literatura Contemporánea"
                    value={formData.nombre_coleccion}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, nombre_coleccion: e.target.value }))
                    }
                    required
                  />
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <FormLabel>ID Colección</FormLabel>
                  <FormControl
                    type="number"
                    placeholder="Ej: 123"
                    value={formData.id_coleccion}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, id_coleccion: e.target.value }))
                    }
                  />
                  <small className="text-muted">Opcional</small>
                </FormGroup>
              </Col>

              <Col md={6}>
                <FormGroup>
                  <FormLabel>Estado de Publicación</FormLabel>
                  <FormControl
                    as="select"
                    value={formData.estado_publicacion}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, estado_publicacion: e.target.value }))
                    }
                  >
                    <option value="Publicado">Publicado</option>
                    <option value="Pendiente">Pendiente</option>
                    <option value="Borrador">Borrador</option>
                  </FormControl>
                </FormGroup>
              </Col>

              <Col md={6}>
                <FormGroup>
                  <FormLabel>Editorial</FormLabel>
                  <FormControl
                    type="text"
                    placeholder="ID de editorial"
                    value={formData.editorial}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, editorial: e.target.value }))
                    }
                  />
                  {editorialNombre && (
                    <small className="text-muted">Actual: {editorialNombre}</small>
                  )}
                </FormGroup>
              </Col>

              <Col md={6}>
                <FormGroup>
                  <FormLabel>Sello</FormLabel>
                  <FormControl
                    type="text"
                    placeholder="ID de sello"
                    value={formData.sello}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, sello: e.target.value }))
                    }
                  />
                  {selloNombre && (
                    <small className="text-muted">Actual: {selloNombre}</small>
                  )}
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
                <label className="form-label text-muted">ID Colección</label>
                <div>
                  <Badge bg="info" className="fs-base">
                    {getField(data, 'id_coleccion', 'idColeccion', 'ID_COLECCION') || 'N/A'}
                  </Badge>
                </div>
              </div>
            </Col>
            <Col md={6}>
              <div>
                <label className="form-label text-muted">Libros asociados</label>
                <div>
                  <Badge bg="info" className="fs-base">
                    {librosCount} libro{librosCount !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </div>
            </Col>

            <Col md={6}>
              <div>
                <label className="form-label text-muted">Editorial</label>
                <div>
                  <span className="text-dark">{editorialNombre || 'N/A'}</span>
                </div>
              </div>
            </Col>

            <Col md={6}>
              <div>
                <label className="form-label text-muted">Sello</label>
                <div>
                  <span className="text-dark">{selloNombre || 'N/A'}</span>
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

export default ColeccionDetails

