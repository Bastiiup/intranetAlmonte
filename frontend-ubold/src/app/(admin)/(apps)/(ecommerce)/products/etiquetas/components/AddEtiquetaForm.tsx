'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardBody, Form, Button, Row, Col, FormGroup, FormLabel, FormControl, Alert } from 'react-bootstrap'
import { LuSave, LuX } from 'react-icons/lu'

const AddEtiquetaForm = () => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    descripcion: '',
  })

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      // Validar campos obligatorios
      if (!formData.name.trim()) {
        throw new Error('El nombre de la etiqueta es obligatorio')
      }

      // Preparar datos para Strapi
      const etiquetaData: any = {
        data: {
          name: formData.name.trim(),
          descripcion: formData.descripcion?.trim() || null,
          // estado_publicacion siempre será "pendiente" al crear
        },
      }

      console.log('[AddEtiqueta] Enviando datos:', etiquetaData)

      // Crear la etiqueta
      const response = await fetch('/api/tienda/etiquetas', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(etiquetaData),
      })

      const result = await response.json()

      console.log('[AddEtiqueta] Respuesta:', { response: response.status, result })

      if (!response.ok) {
        throw new Error(result.error || 'Error al crear la etiqueta')
      }

      if (!result.success) {
        throw new Error(result.error || 'Error al crear la etiqueta')
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/products/etiquetas/solicitudes')
      }, 1500)
    } catch (err: any) {
      console.error('[AddEtiqueta] Error al crear etiqueta:', err)
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
          <Row>
            <Col md={12}>
              <FormGroup className="mb-3">
                <FormLabel>
                  Nombre de la Etiqueta <span className="text-danger">*</span>
                </FormLabel>
                <FormControl
                  type="text"
                  placeholder="Ej: Novela"
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
                  placeholder="Descripción de la etiqueta (opcional)"
                  value={formData.descripcion}
                  onChange={(e) => handleFieldChange('descripcion', e.target.value)}
                  disabled={loading}
                />
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
                  <LuSave className="me-1" /> Guardar Etiqueta
                </>
              )}
            </Button>
          </div>
        </Form>
      </CardBody>
    </Card>
  )
}

export default AddEtiquetaForm

