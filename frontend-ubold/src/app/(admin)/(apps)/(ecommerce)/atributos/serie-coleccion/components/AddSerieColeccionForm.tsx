'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardBody, Form, Button, Row, Col, FormGroup, FormLabel, FormControl, Alert } from 'react-bootstrap'
import { LuSave, LuX } from 'react-icons/lu'
import { RelationSelector } from '@/app/(admin)/(apps)/(ecommerce)/add-product/components/RelationSelector'

const AddSerieColeccionForm = () => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    id_coleccion: '',
    nombre_coleccion: '',
    editorial: '',
    sello: '',
    libros: [] as string[],
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      // Validaciones
      if (!formData.id_coleccion || formData.id_coleccion.trim() === '') {
        throw new Error('El ID de la colección es obligatorio')
      }

      const idColeccionNum = parseInt(formData.id_coleccion)
      if (isNaN(idColeccionNum)) {
        throw new Error('El ID de la colección debe ser un número válido')
      }

      if (!formData.nombre_coleccion.trim()) {
        throw new Error('El nombre de la colección es obligatorio')
      }

      // Preparar datos para Strapi según schema real
      // Schema: id_coleccion* (Number), nombre_coleccion* (Text), editorial, sello, libros, externalIds
      const serieColeccionData: any = {
        data: {
          id_coleccion: idColeccionNum,
          nombre_coleccion: formData.nombre_coleccion.trim(),
          editorial: formData.editorial || null,
          sello: formData.sello || null,
          libros: formData.libros.length > 0 ? formData.libros : null,
        },
      }

      console.log('[AddSerieColeccionForm] Enviando datos:', serieColeccionData)

      // Crear la serie-coleccion
      const response = await fetch('/api/tienda/serie-coleccion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(serieColeccionData),
      })

      const result = await response.json()

      console.log('[AddSerieColeccionForm] Respuesta:', { response: response.status, result })

      if (!response.ok) {
        throw new Error(result.error || 'Error al crear la serie/colección')
      }

      if (!result.success) {
        throw new Error(result.error || 'Error al crear la serie/colección')
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/atributos/serie-coleccion')
      }, 1500)
    } catch (err: any) {
      console.error('[AddSerieColeccionForm] Error al crear serie-coleccion:', err)
      setError(err.message || 'Error al crear la serie/colección')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <h5 className="mb-0">Agregar Nueva Serie/Colección</h5>
        <p className="text-muted mb-0 mt-2 small">
          Completa los campos requeridos para crear una nueva serie/colección en el sistema.
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
            ¡Serie/Colección creada exitosamente! Redirigiendo...
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
                <small className="text-muted">
                  Editorial asociada a esta serie/colección (opcional).
                </small>
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
                <small className="text-muted">
                  Sello editorial asociado a esta serie/colección (opcional).
                </small>
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
                <small className="text-muted">
                  Libros que pertenecen a esta serie/colección (opcional).
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
              {loading ? 'Guardando...' : 'Guardar Serie/Colección'}
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

export default AddSerieColeccionForm

