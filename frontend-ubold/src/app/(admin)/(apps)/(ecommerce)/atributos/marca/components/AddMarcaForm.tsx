'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardBody, Form, Button, Row, Col, FormGroup, FormLabel, FormControl, Alert } from 'react-bootstrap'
import { LuSave, LuX, LuUpload } from 'react-icons/lu'

const AddMarcaForm = () => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    descripcion: '',
    imagen: null as File | null,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      if (!formData.name.trim()) {
        throw new Error('El nombre de la marca es obligatorio')
      }

      const marcaData: any = {
        data: {
          name: formData.name.trim(),
          descripcion: formData.descripcion.trim() || null,
        },
      }

      console.log('[AddMarcaForm] Enviando datos:', marcaData)

      let imagenId = null
      if (formData.imagen) {
        try {
          const formDataImagen = new FormData()
          formDataImagen.append('file', formData.imagen)
          
          const uploadResponse = await fetch('/api/tienda/upload', {
            method: 'POST',
            body: formDataImagen,
          })
          
          const uploadResult = await uploadResponse.json()
          if (uploadResult.success && uploadResult.data && uploadResult.data.length > 0) {
            imagenId = uploadResult.data[0].id
            marcaData.data.imagen = imagenId
          } else if (uploadResult.success && uploadResult.data?.id) {
            imagenId = uploadResult.data.id
            marcaData.data.imagen = imagenId
          }
        } catch (uploadError: any) {
          console.warn('[AddMarcaForm] Error al subir imagen:', uploadError.message)
        }
      }

      const response = await fetch('/api/tienda/marca', {
        method: 'POST',
        credentials: 'include', // Incluir cookies
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(marcaData),
      })

      const result = await response.json()

      console.log('[AddMarcaForm] Respuesta:', { response: response.status, result })

      if (!response.ok) {
        throw new Error(result.error || 'Error al crear la marca')
      }

      if (!result.success) {
        throw new Error(result.error || 'Error al crear la marca')
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/atributos/marca')
      }, 1500)
    } catch (err: any) {
      console.error('[AddMarcaForm] Error al crear marca:', err)
      setError(err.message || 'Error al crear la marca')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <h5 className="mb-0">Agregar Nueva Marca</h5>
        <p className="text-muted mb-0 mt-2 small">
          Completa los campos requeridos para crear una nueva marca en el sistema.
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
            ¡Marca creada exitosamente! Redirigiendo...
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
                  {formData.imagen ? (
                    <div>
                      <img 
                        src={URL.createObjectURL(formData.imagen)} 
                        alt="Preview" 
                        style={{ maxHeight: '120px', maxWidth: '100%' }}
                        className="mb-2"
                      />
                      <div>
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => setFormData((prev) => ({ ...prev, imagen: null }))}
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
                        id="imagen-upload"
                      />
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => document.getElementById('imagen-upload')?.click()}
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
              {loading ? 'Guardando...' : 'Guardar Marca'}
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

export default AddMarcaForm

