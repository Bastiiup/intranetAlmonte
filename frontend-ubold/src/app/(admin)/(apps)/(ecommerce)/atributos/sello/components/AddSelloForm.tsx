'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardBody, Form, Button, Row, Col, FormGroup, FormLabel, FormControl, Alert, Badge } from 'react-bootstrap'
import { LuSave, LuX, LuUpload } from 'react-icons/lu'
import { RelationSelector } from '@/app/(admin)/(apps)/(ecommerce)/add-product/components/RelationSelector'

const AddSelloForm = () => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    id_sello: '',
    nombre_sello: '',
    acronimo: '',
    website: '',
    editorial: '',
    libros: [] as string[],
    colecciones: [] as string[],
    logo: null as File | null,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      // Validaciones
      if (!formData.id_sello || formData.id_sello.trim() === '') {
        throw new Error('El ID del sello es obligatorio')
      }

      const idSelloNum = parseInt(formData.id_sello)
      if (isNaN(idSelloNum)) {
        throw new Error('El ID del sello debe ser un número válido')
      }

      if (!formData.nombre_sello.trim()) {
        throw new Error('El nombre del sello es obligatorio')
      }

      // Preparar datos para Strapi según schema real
      const selloData: any = {
        data: {
          id_sello: idSelloNum,
          nombre_sello: formData.nombre_sello.trim(),
          acronimo: formData.acronimo.trim() || null,
          website: formData.website.trim() || null,
          editorial: formData.editorial || null,
          libros: formData.libros.length > 0 ? formData.libros : null,
          colecciones: formData.colecciones.length > 0 ? formData.colecciones : null,
        },
      }

      console.log('[AddSelloForm] Enviando datos:', selloData)

      // Si hay logo, primero subirlo
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
            selloData.data.logo = logoId
          } else if (uploadResult.success && uploadResult.data?.id) {
            logoId = uploadResult.data.id
            selloData.data.logo = logoId
          }
        } catch (uploadError: any) {
          console.warn('[AddSelloForm] Error al subir logo:', uploadError.message)
          // Continuar sin logo si falla la subida
        }
      }

      // Crear el sello
      const response = await fetch('/api/tienda/sello', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(selloData),
      })

      const result = await response.json()

      console.log('[AddSelloForm] Respuesta:', { response: response.status, result })

      if (!response.ok) {
        throw new Error(result.error || 'Error al crear el sello')
      }

      if (!result.success) {
        throw new Error(result.error || 'Error al crear el sello')
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/atributos/sello')
      }, 1500)
    } catch (err: any) {
      console.error('[AddSelloForm] Error al crear sello:', err)
      setError(err.message || 'Error al crear el sello')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <h5 className="mb-0">Agregar Nuevo Sello</h5>
        <p className="text-muted mb-0 mt-2 small">
          Completa los campos requeridos para crear un nuevo sello en el sistema.
        </p>
      </CardHeader>
      <CardBody>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert variant="success">
            ¡Sello creado exitosamente! Redirigiendo...
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
              </FormGroup>
            </Col>

            <Col md={12}>
              <FormGroup>
                <FormLabel>Libros</FormLabel>
                <RelationSelector
                  label=""
                  value={formData.libros}
                  onChange={(value) => setFormData((prev) => ({ ...prev, libros: value as string[] }))}
                  endpoint="/api/tienda/productos"
                  multiple={true}
                  displayField="titulo"
                />
              </FormGroup>
            </Col>

            <Col md={12}>
              <FormGroup>
                <FormLabel>Colecciones</FormLabel>
                <RelationSelector
                  label=""
                  value={formData.colecciones}
                  onChange={(value) => setFormData((prev) => ({ ...prev, colecciones: value as string[] }))}
                  endpoint="/api/tienda/colecciones"
                  multiple={true}
                  displayField="nombre"
                />
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
                            setFormData((prev) => ({ ...prev, logo: file }))
                          }
                        }}
                        className="mt-2"
                        style={{ display: 'none' }}
                        id="logo-upload"
                      />
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => document.getElementById('logo-upload')?.click()}
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
                    const target = e.target as HTMLInputElement
                    const file = target.files?.[0]
                    if (file) {
                      setFormData((prev) => ({ ...prev, logo: file }))
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
              {loading ? 'Guardando...' : 'Guardar Sello'}
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
  )
}

export default AddSelloForm
