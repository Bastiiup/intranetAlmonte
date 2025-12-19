'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardBody, Form, Button, Row, Col, FormGroup, FormLabel, FormControl, Alert } from 'react-bootstrap'
import { LuSave, LuX } from 'react-icons/lu'

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
        },
      }

      console.log('[AddSelloForm] Enviando datos:', selloData)

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
