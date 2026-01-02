'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardBody, Form, Button, Row, Col, FormGroup, FormLabel, FormControl, Alert } from 'react-bootstrap'
import { LuSave, LuX } from 'react-icons/lu'

const AddTagForm = () => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
  })

  const handleNombreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      nombre: e.target.value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      // Preparar datos para Strapi (usar nombres del schema real)
      const etiquetaData: any = {
        data: {
          name: formData.nombre, // El schema usa 'name'
          descripcion: formData.descripcion || null,
        },
      }

      // Crear la etiqueta
      const response = await fetch('/api/tienda/etiquetas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(etiquetaData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al crear la etiqueta')
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/products/etiquetas')
      }, 1500)
    } catch (err: any) {
      console.error('Error al crear etiqueta:', err)
      setError(err.message || 'Error al crear la etiqueta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <h5 className="mb-0">Nueva Etiqueta</h5>
      </CardHeader>
      <CardBody>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert variant="success">
            ¡Etiqueta creada exitosamente! Redirigiendo...
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          <Row className="g-3">
            <Col md={12}>
              <FormGroup>
                <FormLabel>
                  Nombre de la Etiqueta <span className="text-danger">*</span>
                </FormLabel>
                <FormControl
                  type="text"
                  placeholder="Ej: Nuevo, Oferta, Recomendado"
                  value={formData.nombre}
                  onChange={handleNombreChange}
                  required
                />
                <small className="text-muted">
                  Nombre de la etiqueta que se mostrará en los productos
                </small>
              </FormGroup>
            </Col>

            <Col md={12}>
              <FormGroup>
                <FormLabel>Descripción</FormLabel>
                <FormControl
                  as="textarea"
                  rows={3}
                  placeholder="Descripción de la etiqueta..."
                  value={formData.descripcion}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, descripcion: e.target.value }))
                  }
                />
                <small className="text-muted">
                  Opcional. Descripción de la etiqueta
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
              {loading ? 'Guardando...' : 'Guardar Etiqueta'}
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

export default AddTagForm

