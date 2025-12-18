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
    slug: '',
    descripcion: '',
    activo: true,
    imagen: null as File | null,
  })

  // Generar slug automáticamente desde el nombre
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
      .replace(/[^a-z0-9]+/g, '-') // Reemplazar caracteres especiales con guiones
      .replace(/(^-|-$)/g, '') // Eliminar guiones al inicio y final
  }

  const handleNombreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nombre = e.target.value
    setFormData((prev) => ({
      ...prev,
      nombre,
      slug: prev.slug || generateSlug(nombre), // Solo generar slug si está vacío
    }))
  }

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      slug: e.target.value,
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
        const formDataImage = new FormData()
        formDataImage.append('files', formData.imagen)

        const uploadResponse = await fetch('/api/tienda/upload', {
          method: 'POST',
          body: formDataImage,
        })

        if (!uploadResponse.ok) {
          throw new Error('Error al subir la imagen')
        }

        const uploadData = await uploadResponse.json()
        if (uploadData.success && uploadData.data) {
          // El upload puede devolver un objeto o un array
          const uploadedFile = Array.isArray(uploadData.data) ? uploadData.data[0] : uploadData.data
          imagenId = uploadedFile.id || uploadData.id
        }
      }

      // Preparar datos para Strapi
      const categoriaData: any = {
        data: {
          nombre: formData.nombre,
          slug: formData.slug || generateSlug(formData.nombre),
          descripcion: formData.descripcion || null,
          activo: formData.activo,
        },
      }

      // Agregar imagen si existe
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
            <Col md={6}>
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
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup>
                <FormLabel>
                  Slug <span className="text-danger">*</span>
                </FormLabel>
                <FormControl
                  type="text"
                  placeholder="Ej: libros, material-escolar"
                  value={formData.slug}
                  onChange={handleSlugChange}
                  required
                />
                <small className="text-muted">
                  Se genera automáticamente desde el nombre si está vacío
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

            <Col md={6}>
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
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup>
                <FormLabel>Estado</FormLabel>
                <Form.Select
                  value={formData.activo ? 'activa' : 'inactiva'}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      activo: e.target.value === 'activa',
                    }))
                  }
                >
                  <option value="activa">Activa</option>
                  <option value="inactiva">Inactiva</option>
                </Form.Select>
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

