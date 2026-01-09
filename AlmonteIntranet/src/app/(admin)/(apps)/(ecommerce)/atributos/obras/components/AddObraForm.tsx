'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardBody, Form, Button, Row, Col, FormGroup, FormLabel, FormControl, Alert } from 'react-bootstrap'
import { LuSave, LuX } from 'react-icons/lu'

const AddObraForm = () => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    codigo_obra: '',
    nombre_obra: '',
    descripcion: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      // Validaciones
      if (!formData.codigo_obra.trim()) {
        throw new Error('El código de la obra es obligatorio')
      }

      if (!formData.nombre_obra.trim()) {
        throw new Error('El nombre de la obra es obligatorio')
      }

      // Preparar datos para Strapi según schema real
      const obraData: any = {
        data: {
          codigo_obra: formData.codigo_obra.trim(),
          nombre_obra: formData.nombre_obra.trim(),
          descripcion: formData.descripcion.trim() || null,
        },
      }

      console.log('[AddObraForm] Enviando datos:', obraData)

      // Crear la obra
      const response = await fetch('/api/tienda/obras', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(obraData),
      })

      const result = await response.json()

      console.log('[AddObraForm] Respuesta:', { response: response.status, result })

      if (!response.ok) {
        throw new Error(result.error || 'Error al crear la obra')
      }

      if (!result.success) {
        throw new Error(result.error || 'Error al crear la obra')
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/atributos/obras')
      }, 1500)
    } catch (err: any) {
      console.error('[AddObraForm] Error al crear obra:', err)
      setError(err.message || 'Error al crear la obra')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <h5 className="mb-0">Agregar Nueva Obra</h5>
        <p className="text-muted mb-0 mt-2 small">
          Completa los campos requeridos para crear una nueva obra en el sistema.
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
            ¡Obra creada exitosamente! Redirigiendo...
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          <Row className="g-3">
            <Col md={12}>
              <FormGroup>
                <FormLabel>
                  Código de la Obra <span className="text-danger">*</span>
                </FormLabel>
                <FormControl
                  type="text"
                  placeholder="Ej: OBRA-001, ISBN-123456"
                  value={formData.codigo_obra}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, codigo_obra: e.target.value }))
                  }
                  required
                />
                <small className="text-muted">
                  Código único identificador de la obra (requerido).
                </small>
              </FormGroup>
            </Col>

            <Col md={12}>
              <FormGroup>
                <FormLabel>
                  Nombre de la Obra <span className="text-danger">*</span>
                </FormLabel>
                <FormControl
                  type="text"
                  placeholder="Ej: Matemáticas 1, Lenguaje y Comunicación"
                  value={formData.nombre_obra}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, nombre_obra: e.target.value }))
                  }
                  required
                />
                <small className="text-muted">
                  Nombre completo de la obra (requerido).
                </small>
              </FormGroup>
            </Col>

            <Col md={12}>
              <FormGroup>
                <FormLabel>Descripción</FormLabel>
                <FormControl
                  as="textarea"
                  rows={4}
                  placeholder="Descripción detallada de la obra..."
                  value={formData.descripcion}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, descripcion: e.target.value }))
                  }
                />
                <small className="text-muted">
                  Descripción opcional de la obra.
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
              {loading ? 'Guardando...' : 'Guardar Obra'}
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

export default AddObraForm
