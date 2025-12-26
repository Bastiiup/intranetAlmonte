'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardBody, Form, Button, Row, Col, FormGroup, FormLabel, FormControl, Alert } from 'react-bootstrap'
import { LuSave, LuX } from 'react-icons/lu'

const AddCategoriaForm = () => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    descripcion: '',
    imagen: null as File | null,
  })

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleImagenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData((prev) => ({
        ...prev,
        imagen: e.target.files![0],
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      // Validar campos obligatorios
      if (!formData.name.trim()) {
        throw new Error('El nombre de la categoría es obligatorio')
      }

      // Primero subir la imagen si existe
      let imagenId = null
      if (formData.imagen) {
        console.log('[AddCategoria] Subiendo imagen...')
        const uploadFormData = new FormData()
        uploadFormData.append('file', formData.imagen)

        const uploadResponse = await fetch('/api/tienda/upload', {
          method: 'POST',
          body: uploadFormData,
        })

        const uploadResult = await uploadResponse.json()

        if (uploadResult.success && uploadResult.id) {
          imagenId = uploadResult.id
          console.log('[AddCategoria] Imagen subida con ID:', imagenId)
        } else {
          console.warn('[AddCategoria] No se pudo subir la imagen:', uploadResult.error)
          // No fallar si la imagen no se puede subir, solo advertir
        }
      }

      // Preparar datos para Strapi
      const categoriaData: any = {
        data: {
          name: formData.name.trim(),
          descripcion: formData.descripcion?.trim() || null,
          // estado_publicacion siempre será "pendiente" al crear
        },
      }

      // Agregar imagen si existe
      if (imagenId) {
        categoriaData.data.imagen = imagenId
      }

      console.log('[AddCategoria] Enviando datos:', categoriaData)

      // Crear la categoría
      const response = await fetch('/api/tienda/categorias', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(categoriaData),
      })

      const result = await response.json()

      console.log('[AddCategoria] Respuesta:', { response: response.status, result })

      if (!response.ok) {
        throw new Error(result.error || 'Error al crear la categoría')
      }

      if (!result.success) {
        throw new Error(result.error || 'Error al crear la categoría')
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/products/categorias/solicitudes')
      }, 1500)
    } catch (err: any) {
      console.error('[AddCategoria] Error al crear categoría:', err)
      setError(err.message || 'Error al crear la categoría')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <h5 className="mb-0">Nueva Categoría</h5>
      </CardHeader>
      <CardBody>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert variant="success">
            ¡Categoría creada exitosamente! Redirigiendo...
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          <Row>
            <Col md={12}>
              <FormGroup className="mb-3">
                <FormLabel>
                  Nombre de la Categoría <span className="text-danger">*</span>
                </FormLabel>
                <FormControl
                  type="text"
                  placeholder="Ej: Literatura"
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
                  placeholder="Descripción de la categoría (opcional)"
                  value={formData.descripcion}
                  onChange={(e) => handleFieldChange('descripcion', e.target.value)}
                  disabled={loading}
                />
              </FormGroup>
            </Col>

            <Col md={12}>
              <FormGroup className="mb-3">
                <FormLabel>Imagen</FormLabel>
                <FormControl
                  type="file"
                  accept="image/*"
                  onChange={handleImagenChange}
                  disabled={loading}
                />
                <small className="text-muted">Opcional: Sube una imagen para la categoría</small>
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
                  <LuSave className="me-1" /> Guardar Categoría
                </>
              )}
            </Button>
          </div>
        </Form>
      </CardBody>
    </Card>
  )
}

export default AddCategoriaForm

