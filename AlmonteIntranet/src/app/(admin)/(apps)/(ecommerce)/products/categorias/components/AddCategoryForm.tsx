'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardBody, Form, Button, Row, Col, FormGroup, FormLabel, FormControl, Alert } from 'react-bootstrap'
import { LuSave, LuX } from 'react-icons/lu'

const AddCategoryForm = () => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    imagen: null as File | null,
  })

  const handleNombreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      nombre: e.target.value,
    }))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      // Primero subir la imagen si existe
      let imagenId = null
      if (formData.imagen) {
        console.log('[AddCategory] Subiendo imagen...')
        const uploadFormData = new FormData()
        uploadFormData.append('file', formData.imagen)

        const uploadResponse = await fetch('/api/tienda/upload', {
          method: 'POST',
          body: uploadFormData,
        })

        const uploadResult = await uploadResponse.json()

        if (uploadResult.success && uploadResult.id) {
          imagenId = uploadResult.id
          console.log('[AddCategory] Imagen subida con ID:', imagenId)
        } else {
          console.warn('[AddCategory] No se pudo subir la imagen:', uploadResult.error)
          throw new Error(uploadResult.error || 'Error al subir la imagen')
        }
      }

      // Preparar datos para Strapi (usar nombres del schema real)
      const categoriaData: any = {
        data: {
          name: formData.nombre, // El schema usa 'name', no 'nombre'
          descripcion: formData.descripcion || null,
          // Nota: El schema no tiene 'slug' ni 'activo', se manejan automáticamente
        },
      }

      // Agregar imagen si existe (el schema tiene campo 'imagen' de tipo media)
      if (imagenId) {
        categoriaData.data.imagen = imagenId
      }

      // Crear la categoría
      const response = await fetch('/api/tienda/categorias', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(categoriaData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al crear la categoría')
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/products/categorias')
      }, 1500)
    } catch (err: any) {
      console.error('Error al crear categoría:', err)
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
          <Row className="g-3">
            <Col md={12}>
              <FormGroup>
                <FormLabel>
                  Nombre de la Categoría <span className="text-danger">*</span>
                </FormLabel>
                <FormControl
                  type="text"
                  placeholder="Ej: Libros, Material Escolar"
                  value={formData.nombre}
                  onChange={handleNombreChange}
                  required
                />
                <small className="text-muted">
                  El slug se generará automáticamente desde el nombre en Strapi
                </small>
              </FormGroup>
            </Col>

            <Col md={12}>
              <FormGroup>
                <FormLabel>Descripción</FormLabel>
                <FormControl
                  as="textarea"
                  rows={3}
                  placeholder="Descripción de la categoría..."
                  value={formData.descripcion}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, descripcion: e.target.value }))
                  }
                />
              </FormGroup>
            </Col>

            <Col md={12}>
              <FormGroup>
                <FormLabel>Imagen</FormLabel>
                <FormControl
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                />
                {formData.imagen && (
                  <small className="text-muted d-block mt-1">
                    Archivo seleccionado: {formData.imagen.name}
                  </small>
                )}
                <small className="text-muted">
                  Opcional. Imagen representativa de la categoría
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
              {loading ? 'Guardando...' : 'Guardar Categoría'}
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

export default AddCategoryForm

