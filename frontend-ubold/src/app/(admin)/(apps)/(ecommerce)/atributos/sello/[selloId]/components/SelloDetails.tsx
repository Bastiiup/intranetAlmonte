'use client'

import { Badge, Col, Row, Alert, Card, CardHeader, CardBody, Form, Button, FormGroup, FormLabel, FormControl } from 'react-bootstrap'
import { format } from 'date-fns'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LuSave, LuX, LuUpload } from 'react-icons/lu'
import { RelationSelector } from '@/app/(admin)/(apps)/(ecommerce)/add-product/components/RelationSelector'

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

  // Obtener datos de relaciones del sello (usar attrs si están disponibles)
  const editorialRelation = attrs.editorial || data.editorial
  const librosRelation = attrs.libros || data.libros
  const coleccionesRelation = attrs.colecciones || data.colecciones
  
  const editorialData = getRelationData(editorialRelation)
  const librosData = getRelationData(librosRelation)
  const coleccionesData = getRelationData(coleccionesRelation)

  // Inicializar formData con los valores del sello según schema real
  const [formData, setFormData] = useState({
    id_sello: getField(data, 'id_sello', 'idSello', 'ID_SELLO')?.toString() || '',
    nombre_sello: getField(data, 'nombre_sello', 'nombreSello', 'nombre', 'NOMBRE_SELLO', 'NAME') || '',
    acronimo: getField(data, 'acronimo', 'acronimo', 'ACRONIMO') || '',
    website: getField(data, 'website', 'website', 'WEBSITE') || '',
    editorial: data.editorial?.data?.documentId || data.editorial?.data?.id || data.editorial?.documentId || data.editorial?.id || '',
    libros: getRelationIds(data.libros),
    colecciones: getRelationIds(data.colecciones),
    logo: null as File | null,
    logoUrl: data.logo?.data?.attributes?.url || data.logo?.url || null,
  })

  // Actualizar formData cuando cambie el sello
  useEffect(() => {
    if (sello) {
      const attrs = sello.attributes || {}
      const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (sello as any)
      
      setFormData({
        id_sello: getField(data, 'id_sello', 'idSello', 'ID_SELLO')?.toString() || '',
        nombre_sello: getField(data, 'nombre_sello', 'nombreSello', 'nombre', 'NOMBRE_SELLO', 'NAME') || '',
        acronimo: getField(data, 'acronimo', 'acronimo', 'ACRONIMO') || '',
        website: getField(data, 'website', 'website', 'WEBSITE') || '',
        editorial: (attrs.editorial || data.editorial)?.data?.documentId || 
                   (attrs.editorial || data.editorial)?.data?.id || 
                   (attrs.editorial || data.editorial)?.documentId || 
                   (attrs.editorial || data.editorial)?.id || '',
        libros: getRelationIds(attrs.libros || data.libros),
        colecciones: getRelationIds(attrs.colecciones || data.colecciones),
        logo: null,
        logoUrl: data.logo?.data?.attributes?.url || data.logo?.url || null,
      })
    }
  }, [sello])

  // Obtener el ID correcto
  const sId = sello.id?.toString() || sello.documentId || selloId
  
  // Contar productos asociados (libros y colecciones según schema)
  const libros = data.libros?.data || data.libros || []
  const colecciones = data.colecciones?.data || data.colecciones || []
  const librosCount = Array.isArray(libros) ? libros.length : 0
  const coleccionesCount = Array.isArray(colecciones) ? colecciones.length : 0
  const productosCount = librosCount + coleccionesCount

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
      // Si hay logo nuevo, primero subirlo
      let logoId = null
      if (formData.logo) {
        try {
          const formDataLogo = new FormData()
          formDataLogo.append('file', formData.logo)
          
          const uploadResponse = await fetch('/api/tienda/upload', {
            method: 'POST',
            body: formDataLogo,
          })
          
          const uploadResult = await uploadResponse.json()
          if (uploadResult.success && uploadResult.data && uploadResult.data.length > 0) {
            logoId = uploadResult.data[0].id
          } else if (uploadResult.success && uploadResult.data?.id) {
            logoId = uploadResult.data.id
          }
        } catch (uploadError: any) {
          console.warn('[SelloDetails] Error al subir logo:', uploadError.message)
          // Continuar sin logo si falla la subida
        }
      }

      const url = `/api/tienda/sello/${sId}`
      const body = JSON.stringify({
        data: {
          id_sello: parseInt(formData.id_sello),
          nombre_sello: formData.nombre_sello.trim(),
          acronimo: formData.acronimo.trim() || null,
          website: formData.website.trim() || null,
          editorial: formData.editorial || null,
          libros: formData.libros.length > 0 ? formData.libros : null,
          colecciones: formData.colecciones.length > 0 ? formData.colecciones : null,
          logo: logoId || null,
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
              <Col md={6}>
                <FormGroup>
                  <FormLabel>
                    ID del Sello <span className="text-danger">*</span>
                  </FormLabel>
                  <FormControl
                    type="number"
                    placeholder="Ej: 1, 2, 1000"
                    value={formData.id_sello}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, id_sello: e.target.value }))
                    }
                    required
                  />
                  <small className="text-muted">
                    ID numérico único del sello (requerido).
                  </small>
                </FormGroup>
              </Col>

              <Col md={6}>
                <FormGroup>
                  <FormLabel>
                    Nombre del Sello <span className="text-danger">*</span>
                  </FormLabel>
                  <FormControl
                    type="text"
                    placeholder="Ej: Sello Editorial Planeta"
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

              <Col md={6}>
                <FormGroup>
                  <FormLabel>Acrónimo</FormLabel>
                  <FormControl
                    type="text"
                    placeholder="Ej: SEP, SEPL"
                    value={formData.acronimo}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, acronimo: e.target.value }))
                    }
                  />
                  <small className="text-muted">
                    Acrónimo opcional del sello.
                  </small>
                </FormGroup>
              </Col>

              <Col md={6}>
                <FormGroup>
                  <FormLabel>Website</FormLabel>
                  <FormControl
                    type="url"
                    placeholder="https://ejemplo.com"
                    value={formData.website}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, website: e.target.value }))
                    }
                  />
                  <small className="text-muted">
                    URL del sitio web del sello (opcional).
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

              <Col md={12}>
                <FormGroup>
                  <FormLabel>Colecciones ({formData.colecciones.length})</FormLabel>
                  <RelationSelector
                    label=""
                    value={formData.colecciones}
                    onChange={(value) => setFormData((prev) => ({ ...prev, colecciones: value as string[] }))}
                    endpoint="/api/tienda/colecciones"
                    multiple={true}
                    displayField="nombre"
                  />
                  {formData.colecciones.length > 0 && (
                    <div className="mt-2 d-flex flex-wrap gap-2">
                      {coleccionesData.length > 0 ? (
                        coleccionesData.map((coleccion: any, idx: number) => {
                          const coleccionId = coleccion.documentId || coleccion.id
                          const coleccionNombre = coleccion.attributes?.nombre || 
                                                 coleccion.nombre || 
                                                 coleccion.attributes?.titulo ||
                                                 coleccion.titulo ||
                                                 coleccionId
                          const isPublished = !!(coleccion.attributes?.publishedAt || coleccion.publishedAt)
                          return (
                            <div key={idx} className="d-flex align-items-center gap-1">
                              <Badge bg={isPublished ? 'success' : 'secondary'}>
                                {isPublished ? 'Published' : 'Draft'}
                              </Badge>
                              <span className="text-muted small">{coleccionNombre}</span>
                              <span className="text-muted small">({coleccionId})</span>
                              <Button
                                variant="link"
                                size="sm"
                                className="p-0 ms-1"
                                onClick={() => {
                                  setFormData((prev) => ({
                                    ...prev,
                                    colecciones: prev.colecciones.filter((id) => id !== coleccionId),
                                  }))
                                }}
                              >
                                ✕
                              </Button>
                            </div>
                          )
                        })
                      ) : (
                        formData.colecciones.map((coleccionId, idx) => (
                          <Badge key={idx} bg="success" className="d-flex align-items-center gap-1">
                            {coleccionId}
                            <Button
                              variant="link"
                              size="sm"
                              className="p-0 text-white"
                              onClick={() => {
                                setFormData((prev) => ({
                                  ...prev,
                                  colecciones: prev.colecciones.filter((id) => id !== coleccionId),
                                }))
                              }}
                            >
                              ✕
                            </Button>
                          </Badge>
                        ))
                      )}
                      <Button
                        variant="link"
                        size="sm"
                        className="mt-1 p-0"
                        onClick={() => {
                          alert('Funcionalidad "Crear nueva relación" próximamente')
                        }}
                      >
                        + Create a relation
                      </Button>
                    </div>
                  )}
                </FormGroup>
              </Col>

              <Col md={12}>
                <FormGroup>
                  <FormLabel>Logo</FormLabel>
                  <div className="border rounded p-3 text-center" style={{ minHeight: '150px', backgroundColor: '#f8f9fa' }}>
                    {formData.logo ? (
                      <div>
                        <img 
                          src={URL.createObjectURL(formData.logo)} 
                          alt="Preview" 
                          style={{ maxHeight: '120px', maxWidth: '100%' }}
                          className="mb-2"
                        />
                        <div>
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => setFormData((prev) => ({ ...prev, logo: null }))}
                          >
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    ) : formData.logoUrl ? (
                      <div>
                        <img 
                          src={formData.logoUrl.startsWith('http') ? formData.logoUrl : `${process.env.NEXT_PUBLIC_STRAPI_URL || 'https://strapi.moraleja.cl'}${formData.logoUrl}`}
                          alt="Logo actual" 
                          style={{ maxHeight: '120px', maxWidth: '100%' }}
                          className="mb-2"
                        />
                        <div>
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => {
                              setFormData((prev) => ({ ...prev, logoUrl: null }))
                            }}
                          >
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <LuUpload className="fs-1 text-muted mb-2" />
                        <div className="text-muted small">
                          Click para agregar un archivo o arrastra y suelta uno en esta área
                        </div>
                        <FormControl
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              setFormData((prev) => ({ ...prev, logo: file }))
                            }
                          }}
                          className="mt-2"
                          style={{ display: 'none' }}
                          id="logo-upload-edit"
                        />
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => document.getElementById('logo-upload-edit')?.click()}
                          className="mt-2"
                        >
                          Seleccionar archivo
                        </Button>
                      </div>
                    )}
                  </div>
                  <FormControl
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setFormData((prev) => ({ ...prev, logo: file, logoUrl: null }))
                      }
                    }}
                    className="mt-2"
                  />
                  <small className="text-muted">
                    Logo del sello (opcional). Formatos: JPG, PNG, GIF.
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

