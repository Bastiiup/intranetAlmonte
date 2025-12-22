'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardBody, Form, Button, Row, Col, FormGroup, FormLabel, FormControl, Alert } from 'react-bootstrap'
import { LuSave, LuX } from 'react-icons/lu'

const AddColeccionForm = () => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    nombre_coleccion: '',
    id_coleccion: '',
    editorial: '',
    sello: '',
    estado_publicacion: 'Pendiente',
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
      // Validar nombre obligatorio
      if (!formData.nombre_coleccion.trim()) {
        throw new Error('El nombre de la colección es obligatorio')
      }

      // Preparar datos para Strapi
      const coleccionData: any = {
        data: {
          nombre_coleccion: formData.nombre_coleccion.trim(),
          id_coleccion: formData.id_coleccion ? parseInt(formData.id_coleccion) : null,
          editorial: formData.editorial || null,
          sello: formData.sello || null,
          estado_publicacion: formData.estado_publicacion,
        },
      }

      // Crear la colección
      const response = await fetch('/api/tienda/colecciones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(coleccionData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al crear la colección')
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/products/atributos/colecciones')
      }, 1500)
    } catch (err: any) {
      console.error('Error al crear colección:', err)
      setError(err.message || 'Error al crear la colección')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Row>
      <Col xs={12}>
        <Card>
          <CardHeader>
            <h4 className="card-title mb-0">Agregar Colección</h4>
          </CardHeader>
          <CardBody>
            {error && (
              <Alert variant="danger" dismissible onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert variant="success">
                Colección creada exitosamente. Redirigiendo...
              </Alert>
            )}

            <Form onSubmit={handleSubmit}>
              <Row>
                <Col md={6}>
                  <FormGroup className="mb-3">
                    <FormLabel>
                      Nombre de Colección <span className="text-danger">*</span>
                    </FormLabel>
                    <FormControl
                      type="text"
                      placeholder="Ej: Colección Literatura Contemporánea"
                      value={formData.nombre_coleccion}
                      onChange={(e) => handleFieldChange('nombre_coleccion', e.target.value)}
                      required
                    />
                  </FormGroup>
                </Col>
                <Col md={6}>
                  <FormGroup className="mb-3">
                    <FormLabel>ID Colección</FormLabel>
                    <FormControl
                      type="number"
                      placeholder="Ej: 123"
                      value={formData.id_coleccion}
                      onChange={(e) => handleFieldChange('id_coleccion', e.target.value)}
                    />
                    <small className="text-muted">Opcional</small>
                  </FormGroup>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <FormGroup className="mb-3">
                    <FormLabel>Estado de Publicación</FormLabel>
                    <FormControl
                      as="select"
                      value={formData.estado_publicacion}
                      onChange={(e) => handleFieldChange('estado_publicacion', e.target.value)}
                    >
                      <option value="Publicado">Publicado</option>
                      <option value="Pendiente">Pendiente</option>
                      <option value="Borrador">Borrador</option>
                    </FormControl>
                  </FormGroup>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <FormGroup className="mb-3">
                    <FormLabel>Editorial</FormLabel>
                    <FormControl
                      type="text"
                      placeholder="Opcional - ID de editorial"
                      value={formData.editorial}
                      onChange={(e) => handleFieldChange('editorial', e.target.value)}
                    />
                    <small className="text-muted">ID de la editorial asociada (opcional)</small>
                  </FormGroup>
                </Col>
                <Col md={6}>
                  <FormGroup className="mb-3">
                    <FormLabel>Sello</FormLabel>
                    <FormControl
                      type="text"
                      placeholder="Opcional - ID de sello"
                      value={formData.sello}
                      onChange={(e) => handleFieldChange('sello', e.target.value)}
                    />
                    <small className="text-muted">ID del sello asociado (opcional)</small>
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
                      <span className="spinner-border spinner-border-sm me-2" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <LuSave className="me-1" /> Guardar Colección
                    </>
                  )}
                </Button>
              </div>
            </Form>
          </CardBody>
        </Card>
      </Col>
    </Row>
  )
}

export default AddColeccionForm

