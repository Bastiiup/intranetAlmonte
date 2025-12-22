'use client'

import { Col, Row, Alert, Card, CardHeader, CardBody, Form, Button, FormGroup, FormLabel, FormControl } from 'react-bootstrap'
import { format } from 'date-fns'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LuSave, LuX, LuUpload } from 'react-icons/lu'

interface MarcaDetailsProps {
  marca: any
  marcaId: string
  error?: string | null
}

const getField = (obj: any, ...fieldNames: string[]): any => {
  for (const fieldName of fieldNames) {
    if (obj[fieldName] !== undefined && obj[fieldName] !== null && obj[fieldName] !== '') {
      return obj[fieldName]
    }
  }
  return undefined
}

const MarcaDetails = ({ marca: initialMarca, marcaId, error: initialError }: MarcaDetailsProps) => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(initialError || null)
  const [success, setSuccess] = useState(false)
  const [marca, setMarca] = useState(initialMarca)
  
  if (!marca && !initialError) {
    return (
      <Alert variant="warning">
        <strong>Cargando...</strong> Obteniendo información de la marca.
      </Alert>
    )
  }

  if (initialError && !marca) {
    return (
      <Alert variant="danger">
        <strong>Error:</strong> {initialError}
      </Alert>
    )
  }
  
  const attrs = marca.attributes || {}
  const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (marca as any)

  const [formData, setFormData] = useState({
    name: getField(data, 'name', 'nombre', 'nombre_marca', 'nombreMarca', 'NOMBRE_MARCA', 'NAME') || '',
    descripcion: getField(data, 'descripcion', 'description', 'DESCRIPCION') || '',
    imagen: null as File | null,
    imagenUrl: data.imagen?.data?.attributes?.url || data.imagen?.url || null,
  })

  useEffect(() => {
    if (marca) {
      const attrs = marca.attributes || {}
      const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (marca as any)
      
      setFormData({
        name: getField(data, 'name', 'nombre', 'nombre_marca', 'nombreMarca', 'NOMBRE_MARCA', 'NAME') || '',
        descripcion: getField(data, 'descripcion', 'description', 'DESCRIPCION') || '',
        imagen: null,
        imagenUrl: data.imagen?.data?.attributes?.url || data.imagen?.url || null,
      })
    }
  }, [marca])

  const mId = marca.id?.toString() || marca.documentId || marcaId

  const isPublished = !!(attrs.publishedAt || marca.publishedAt)
  const createdAt = attrs.createdAt || marca.createdAt || new Date().toISOString()
  const createdDate = new Date(createdAt)
  const updatedAt = attrs.updatedAt || marca.updatedAt || new Date().toISOString()
  const updatedDate = new Date(updatedAt)
  
  if (!marca) {
    return (
      <Alert variant="warning">
        <strong>Error:</strong> No se pudo cargar la información de la marca.
      </Alert>
    )
  }

  if (!mId || mId === 'unknown') {
    return (
      <Alert variant="danger">
        <strong>Error:</strong> No se pudo obtener el ID de la marca.
      </Alert>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      let imagenId = null
      if (formData.imagen) {
        try {
          const formDataImagen = new FormData()
          formDataImagen.append('file', formData.imagen)
          
          const uploadResponse = await fetch('/api/tienda/upload', {
            method: 'POST',
            credentials: 'include', // Incluir cookies
            body: formDataImagen,
          })
          
          const uploadResult = await uploadResponse.json()
          if (uploadResult.success && uploadResult.data && uploadResult.data.length > 0) {
            imagenId = uploadResult.data[0].id
          } else if (uploadResult.success && uploadResult.data?.id) {
            imagenId = uploadResult.data.id
          }
        } catch (uploadError: any) {
          console.warn('[MarcaDetails] Error al subir imagen:', uploadError.message)
        }
      }

      const url = `/api/tienda/marca/${mId}`
      const body = JSON.stringify({
        data: {
          name: formData.name.trim(),
          descripcion: formData.descripcion.trim() || null,
          imagen: imagenId || null,
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
      
      if (result.data) {
        setMarca(result.data.strapi || result.data)
      }
      
      setTimeout(() => {
        setSuccess(false)
      }, 2000)
    } catch (err: any) {
      const errorMessage = err.message || 'Error al guardar cambios'
      setError(errorMessage)
      console.error('[MarcaDetails] Error al guardar:', {
        mId,
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
          <h5 className="mb-0">Editar Marca</h5>
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
                    Nombre de la Marca <span className="text-danger">*</span>
                  </FormLabel>
                  <FormControl
                    type="text"
                    placeholder="Ej: Marca Ejemplo"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    required
                  />
                  <small className="text-muted">
                    Nombre completo de la marca (requerido).
                  </small>
                </FormGroup>
              </Col>

              <Col md={12}>
                <FormGroup>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl
                    as="textarea"
                    rows={3}
                    placeholder="Descripción de la marca..."
                    value={formData.descripcion}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, descripcion: e.target.value }))
                    }
                  />
                  <small className="text-muted">
                    Descripción opcional de la marca.
                  </small>
                </FormGroup>
              </Col>

              <Col md={12}>
                <FormGroup>
                  <FormLabel>Imagen</FormLabel>
                  <div className="border rounded p-3 text-center" style={{ minHeight: '150px', backgroundColor: '#f8f9fa' }}>
                    {formData.imagenUrl || formData.imagen ? (
                      <div>
                        <img
                          src={formData.imagen ? URL.createObjectURL(formData.imagen) : formData.imagenUrl || ''}
                          alt="Preview"
                          style={{ maxHeight: '120px', maxWidth: '100%' }}
                          className="mb-2"
                        />
                        <div>
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => setFormData((prev) => ({ ...prev, imagen: null, imagenUrl: null }))}
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
                            const target = e.target as HTMLInputElement
                            const file = target.files?.[0]
                            if (file) {
                              setFormData((prev) => ({ ...prev, imagen: file }))
                            }
                          }}
                          className="mt-2"
                          style={{ display: 'none' }}
                          id="imagen-upload-edit"
                        />
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => document.getElementById('imagen-upload-edit')?.click()}
                          className="mt-2"
                        >
                          Seleccionar archivo
                        </Button>
                      </div>
                    )}
                  </div>
                  <small className="text-muted">
                    Imagen de la marca (opcional). Formatos: JPG, PNG, GIF.
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
          <Row>
            <Col md={6}>
              <div className="mb-3">
                <strong>Estado:</strong>{' '}
                <span className={`badge ${isPublished ? 'badge-soft-success' : 'badge-soft-danger'}`}>
                  {isPublished ? 'Published' : 'Draft'}
                </span>
              </div>
            </Col>
            <Col md={6}>
              <div className="mb-3">
                <strong>ID:</strong> {mId}
              </div>
            </Col>
            <Col md={6}>
              <div className="mb-3">
                <strong>Creado:</strong> {format(createdDate, 'dd MMM, yyyy h:mm a')}
              </div>
            </Col>
            <Col md={6}>
              <div className="mb-3">
                <strong>Actualizado:</strong> {format(updatedDate, 'dd MMM, yyyy h:mm a')}
              </div>
            </Col>
          </Row>
        </CardBody>
      </Card>
    </div>
  )
}

export default MarcaDetails

