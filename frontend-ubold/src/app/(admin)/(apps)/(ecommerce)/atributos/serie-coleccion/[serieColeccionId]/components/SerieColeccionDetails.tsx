'use client'

import { Badge, Col, Row, Alert, Card, CardHeader, CardBody, Form, Button, FormGroup, FormLabel, FormControl } from 'react-bootstrap'
import { format } from 'date-fns'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LuSave, LuX } from 'react-icons/lu'
import { RelationSelector } from '@/app/(admin)/(apps)/(ecommerce)/add-product/components/RelationSelector'

interface SerieColeccionDetailsProps {
  serieColeccion: any
  serieColeccionId: string
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

const SerieColeccionDetails = ({ serieColeccion: initialSerieColeccion, serieColeccionId, error: initialError }: SerieColeccionDetailsProps) => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(initialError || null)
  const [success, setSuccess] = useState(false)
  const [serieColeccion, setSerieColeccion] = useState(initialSerieColeccion)
  
  if (!serieColeccion && !initialError) {
    return (
      <Alert variant="warning">
        <strong>Cargando...</strong> Obteniendo información de la serie/colección.
      </Alert>
    )
  }

  if (initialError && !serieColeccion) {
    return (
      <Alert variant="danger">
        <strong>Error:</strong> {initialError}
      </Alert>
    )
  }
  
  const attrs = serieColeccion.attributes || {}
  const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (serieColeccion as any)

  // Obtener relaciones existentes con sus datos
  const getRelationIds = (relation: any): string[] => {
    if (!relation) return []
    if (Array.isArray(relation.data)) {
      return relation.data.map((item: any) => item.documentId || item.id).filter(Boolean)
    }
    if (relation.data) {
      return [relation.data.documentId || relation.data.id].filter(Boolean)
    }
    if (Array.isArray(relation)) {
      return relation.map((item: any) => item.documentId || item.id).filter(Boolean)
    }
    return []
  }

  // Obtener datos de relaciones para mostrar nombres
  const getRelationData = (relation: any): any[] => {
    if (!relation) return []
    if (Array.isArray(relation.data)) {
      return relation.data
    }
    if (relation.data) {
      return [relation.data]
    }
    if (Array.isArray(relation)) {
      return relation
    }
    return []
  }

  // Obtener datos de relaciones de la serie-coleccion (usar attrs si están disponibles)
  const editorialRelation = attrs.editorial || data.editorial
  const selloRelation = attrs.sello || data.sello
  const librosRelation = attrs.libros || data.libros
  
  const editorialData = getRelationData(editorialRelation)
  const selloData = getRelationData(selloRelation)
  const librosData = getRelationData(librosRelation)

  // Inicializar formData con los valores de la serie-coleccion según schema real
  // Schema: id_coleccion* (Number), nombre_coleccion* (Text), editorial, sello, libros, externalIds
  const [formData, setFormData] = useState({
    id_coleccion: getField(data, 'id_coleccion', 'idColeccion', 'ID_COLECCION')?.toString() || '',
    nombre_coleccion: getField(data, 'nombre_coleccion', 'nombreColeccion', 'nombre', 'NOMBRE_COLECCION', 'NAME') || '',
    editorial: data.editorial?.data?.documentId || data.editorial?.data?.id || data.editorial?.documentId || data.editorial?.id || '',
    sello: data.sello?.data?.documentId || data.sello?.data?.id || data.sello?.documentId || data.sello?.id || '',
    libros: getRelationIds(data.libros),
  })

  // Actualizar formData cuando cambie la serie-coleccion
  useEffect(() => {
    if (serieColeccion) {
      const attrs = serieColeccion.attributes || {}
      const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (serieColeccion as any)
      
      setFormData({
        id_coleccion: getField(data, 'id_coleccion', 'idColeccion', 'ID_COLECCION')?.toString() || '',
        nombre_coleccion: getField(data, 'nombre_coleccion', 'nombreColeccion', 'nombre', 'NOMBRE_COLECCION', 'NAME') || '',
        editorial: (attrs.editorial || data.editorial)?.data?.documentId || 
                   (attrs.editorial || data.editorial)?.data?.id || 
                   (attrs.editorial || data.editorial)?.documentId || 
                   (attrs.editorial || data.editorial)?.id || '',
        sello: (attrs.sello || data.sello)?.data?.documentId || 
               (attrs.sello || data.sello)?.data?.id || 
               (attrs.sello || data.sello)?.documentId || 
               (attrs.sello || data.sello)?.id || '',
        libros: getRelationIds(attrs.libros || data.libros),
      })
    }
  }, [serieColeccion])

  // Obtener el ID correcto
  const scId = serieColeccion.id?.toString() || serieColeccion.documentId || serieColeccionId
  
  // Contar productos asociados (libros según schema)
  const libros = data.libros?.data || data.libros || []
  const librosCount = Array.isArray(libros) ? libros.length : 0

  const isPublished = !!(attrs.publishedAt || serieColeccion.publishedAt)
  const createdAt = attrs.createdAt || serieColeccion.createdAt || new Date().toISOString()
  const createdDate = new Date(createdAt)
  const updatedAt = attrs.updatedAt || serieColeccion.updatedAt || new Date().toISOString()
  const updatedDate = new Date(updatedAt)
  
  // Validar que serieColeccion existe
  if (!serieColeccion) {
    return (
      <Alert variant="warning">
        <strong>Error:</strong> No se pudo cargar la información de la serie/colección.
      </Alert>
    )
  }

  // Validar que tenemos un ID válido
  if (!scId || scId === 'unknown') {
    console.error('[SerieColeccionDetails] No se pudo obtener un ID válido:', {
      id: serieColeccion.id,
      documentId: serieColeccion.documentId,
      serieColeccion: serieColeccion,
    })
    return (
      <Alert variant="danger">
        <strong>Error:</strong> No se pudo obtener el ID de la serie/colección.
      </Alert>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const url = `/api/tienda/serie-coleccion/${scId}`
      const body = JSON.stringify({
        data: {
          id_coleccion: parseInt(formData.id_coleccion),
          nombre_coleccion: formData.nombre_coleccion.trim(),
          editorial: formData.editorial || null,
          sello: formData.sello || null,
          libros: formData.libros.length > 0 ? formData.libros : null,
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
        setSerieColeccion(result.data.strapi || result.data)
      }
      
      // Ocultar el mensaje de éxito después de 2 segundos
      setTimeout(() => {
        setSuccess(false)
      }, 2000)
    } catch (err: any) {
      const errorMessage = err.message || 'Error al guardar cambios'
      setError(errorMessage)
      console.error('[SerieColeccionDetails] Error al guardar:', {
        scId,
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
          <h5 className="mb-0">Editar Serie/Colección</h5>
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
                    ID de la Colección <span className="text-danger">*</span>
                  </FormLabel>
                  <FormControl
                    type="number"
                    placeholder="Ej: 1, 2, 1000"
                    value={formData.id_coleccion}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, id_coleccion: e.target.value }))
                    }
                    required
                  />
                  <small className="text-muted">
                    ID numérico único de la colección (requerido).
                  </small>
                </FormGroup>
              </Col>

              <Col md={6}>
                <FormGroup>
                  <FormLabel>
                    Nombre de la Colección <span className="text-danger">*</span>
                  </FormLabel>
                  <FormControl
                    type="text"
                    placeholder="Ej: Colección Literatura Clásica"
                    value={formData.nombre_coleccion}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, nombre_coleccion: e.target.value }))
                    }
                    required
                  />
                  <small className="text-muted">
                    Nombre completo de la serie/colección (requerido).
                  </small>
                </FormGroup>
              </Col>

              <Col md={12}>
                <FormGroup>
                  <FormLabel>Editorial</FormLabel>
                  <RelationSelector
                    label=""
                    value={formData.editorial}
                    onChange={(value) => setFormData((prev) => ({ ...prev, editorial: value as string }))}
                    endpoint="/api/tienda/editoriales"
                    displayField="nombre_editorial"
                  />
                  {formData.editorial && (
                    <div className="mt-2 d-flex align-items-center gap-2 flex-wrap">
                      {editorialData.length > 0 ? (
                        editorialData.map((editorial: any, idx: number) => {
                          const editorialId = editorial.documentId || editorial.id
                          const editorialName = editorial.attributes?.nombre_editorial || 
                                               editorial.nombre_editorial || 
                                               editorial.nombre || 
                                               editorialId
                          const isPublished = !!(editorial.attributes?.publishedAt || editorial.publishedAt)
                          return (
                            <div key={idx} className="d-flex align-items-center gap-1">
                              <Badge bg={isPublished ? 'success' : 'secondary'}>{isPublished ? 'Published' : 'Draft'}</Badge>
                              <span className="text-muted small">{editorialName}</span>
                              <span className="text-muted small">({editorialId})</span>
                              <Button
                                variant="link"
                                size="sm"
                                className="p-0 ms-1"
                                onClick={() => setFormData((prev) => ({ ...prev, editorial: '' }))}
                              >
                                ✕
                              </Button>
                            </div>
                          )
                        })
                      ) : (
                        <div className="d-flex align-items-center gap-1">
                          <Badge bg="success">Published</Badge>
                          <span className="text-muted small">{formData.editorial}</span>
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0 ms-1"
                            onClick={() => setFormData((prev) => ({ ...prev, editorial: '' }))}
                          >
                            ✕
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </FormGroup>
              </Col>

              <Col md={12}>
                <FormGroup>
                  <FormLabel>Sello</FormLabel>
                  <RelationSelector
                    label=""
                    value={formData.sello}
                    onChange={(value) => setFormData((prev) => ({ ...prev, sello: value as string }))}
                    endpoint="/api/tienda/sello"
                    displayField="nombre_sello"
                  />
                  {formData.sello && (
                    <div className="mt-2 d-flex align-items-center gap-2 flex-wrap">
                      {selloData.length > 0 ? (
                        selloData.map((sello: any, idx: number) => {
                          const selloId = sello.documentId || sello.id
                          const selloName = sello.attributes?.nombre_sello || 
                                           sello.nombre_sello || 
                                           sello.attributes?.nombre ||
                                           sello.nombre ||
                                           selloId
                          const isPublished = !!(sello.attributes?.publishedAt || sello.publishedAt)
                          return (
                            <div key={idx} className="d-flex align-items-center gap-1">
                              <Badge bg={isPublished ? 'success' : 'secondary'}>{isPublished ? 'Published' : 'Draft'}</Badge>
                              <span className="text-muted small">{selloName}</span>
                              <span className="text-muted small">({selloId})</span>
                              <Button
                                variant="link"
                                size="sm"
                                className="p-0 ms-1"
                                onClick={() => setFormData((prev) => ({ ...prev, sello: '' }))}
                              >
                                ✕
                              </Button>
                            </div>
                          )
                        })
                      ) : (
                        <div className="d-flex align-items-center gap-1">
                          <Badge bg="success">Published</Badge>
                          <span className="text-muted small">{formData.sello}</span>
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0 ms-1"
                            onClick={() => setFormData((prev) => ({ ...prev, sello: '' }))}
                          >
                            ✕
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </FormGroup>
              </Col>

              <Col md={12}>
                <FormGroup>
                  <FormLabel>Libros ({formData.libros.length})</FormLabel>
                  <RelationSelector
                    label=""
                    value={formData.libros}
                    onChange={(value) => setFormData((prev) => ({ ...prev, libros: value as string[] }))}
                    endpoint="/api/tienda/productos"
                    multiple={true}
                    displayField="titulo"
                  />
                  {formData.libros.length > 0 && (
                    <div className="mt-2 d-flex flex-wrap gap-2">
                      {librosData.length > 0 ? (
                        librosData.map((libro: any, idx: number) => {
                          const libroId = libro.documentId || libro.id
                          const libroTitulo = libro.attributes?.titulo || 
                                            libro.titulo || 
                                            libro.attributes?.nombre ||
                                            libro.nombre ||
                                            libroId
                          const isPublished = !!(libro.attributes?.publishedAt || libro.publishedAt)
                          const isModified = !!(libro.attributes?.updatedAt && libro.attributes?.updatedAt !== libro.attributes?.createdAt)
                          return (
                            <div key={idx} className="d-flex align-items-center gap-1">
                              <Badge bg={isModified ? 'warning' : isPublished ? 'success' : 'secondary'}>
                                {isModified ? 'Modified' : isPublished ? 'Published' : 'Draft'}
                              </Badge>
                              <span className="text-muted small">{libroTitulo}</span>
                              <span className="text-muted small">({libroId})</span>
                              <Button
                                variant="link"
                                size="sm"
                                className="p-0 ms-1"
                                onClick={() => {
                                  setFormData((prev) => ({
                                    ...prev,
                                    libros: prev.libros.filter((id) => id !== libroId),
                                  }))
                                }}
                              >
                                ✕
                              </Button>
                            </div>
                          )
                        })
                      ) : (
                        formData.libros.map((libroId, idx) => (
                          <Badge key={idx} bg="info" className="d-flex align-items-center gap-1">
                            {libroId}
                            <Button
                              variant="link"
                              size="sm"
                              className="p-0 text-white"
                              onClick={() => {
                                setFormData((prev) => ({
                                  ...prev,
                                  libros: prev.libros.filter((id) => id !== libroId),
                                }))
                              }}
                            >
                              ✕
                            </Button>
                          </Badge>
                        ))
                      )}
                    </div>
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

export default SerieColeccionDetails

