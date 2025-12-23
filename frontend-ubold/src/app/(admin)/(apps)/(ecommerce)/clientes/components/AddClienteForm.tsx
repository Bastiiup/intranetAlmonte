'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardBody, Form, Button, Row, Col, FormGroup, FormLabel, FormControl, Alert } from 'react-bootstrap'
import { LuSave, LuX } from 'react-icons/lu'

interface AddClienteFormProps {
  onSave?: () => void
  onCancel?: () => void
  showCard?: boolean
}

const AddClienteForm = ({ onSave, onCancel, showCard = true }: AddClienteFormProps = {}) => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
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
      if (!formData.first_name.trim()) {
        throw new Error('El nombre del cliente es obligatorio')
      }
      if (!formData.email.trim()) {
        throw new Error('El correo electrónico es obligatorio')
      }
      
      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email.trim())) {
        throw new Error('El correo electrónico no tiene un formato válido')
      }

      // Preparar datos para la API
      const clienteData: any = {
        email: formData.email.trim(),
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim() || '',
      }

      // Agregar teléfono si existe
      if (formData.phone.trim()) {
        clienteData.phone = formData.phone.trim()
        clienteData.billing = {
          phone: formData.phone.trim(),
        }
      }

      // Crear el cliente (esto creará en Persona, WO-Clientes y ambos WordPress)
      const response = await fetch('/api/woocommerce/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clienteData),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al crear el cliente')
      }

      setSuccess(true)
      
      // Si hay callback onSave, usarlo (modal), sino redirigir (página completa)
      if (onSave) {
        setTimeout(() => {
          onSave()
          router.refresh()
        }, 1500)
      } else {
        setTimeout(() => {
          router.push('/clientes')
        }, 1500)
      }
    } catch (err: any) {
      console.error('Error al crear cliente:', err)
      setError(err.message || 'Error al crear el cliente')
    } finally {
      setLoading(false)
    }
  }

  const formContent = (
    <>
            {error && (
              <Alert variant="danger" dismissible onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert variant="success">
                Cliente creado exitosamente. Se ha agregado a Librería Escolar y Editorial Moraleja. Redirigiendo...
              </Alert>
            )}

            <Form onSubmit={handleSubmit}>
              <Row>
                <Col md={6}>
                  <FormGroup className="mb-3">
                    <FormLabel>
                      Nombre <span className="text-danger">*</span>
                    </FormLabel>
                    <FormControl
                      type="text"
                      placeholder="Ej: Juan"
                      value={formData.first_name}
                      onChange={(e) => handleFieldChange('first_name', e.target.value)}
                      required
                    />
                  </FormGroup>
                </Col>
                <Col md={6}>
                  <FormGroup className="mb-3">
                    <FormLabel>Apellido</FormLabel>
                    <FormControl
                      type="text"
                      placeholder="Ej: Pérez"
                      value={formData.last_name}
                      onChange={(e) => handleFieldChange('last_name', e.target.value)}
                    />
                  </FormGroup>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <FormGroup className="mb-3">
                    <FormLabel>
                      Correo Electrónico <span className="text-danger">*</span>
                    </FormLabel>
                    <FormControl
                      type="email"
                      placeholder="Ej: juan.perez@ejemplo.com"
                      value={formData.email}
                      onChange={(e) => handleFieldChange('email', e.target.value)}
                      required
                    />
                  </FormGroup>
                </Col>
                <Col md={6}>
                  <FormGroup className="mb-3">
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl
                      type="tel"
                      placeholder="Ej: +56 9 1234 5678"
                      value={formData.phone}
                      onChange={(e) => handleFieldChange('phone', e.target.value)}
                    />
                  </FormGroup>
                </Col>
              </Row>

              <div className="d-flex gap-2 justify-content-end">
                <Button
                  variant="light"
                  onClick={() => {
                    if (onCancel) {
                      onCancel()
                    } else {
                      router.back()
                    }
                  }}
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
                      <LuSave className="me-1" /> Guardar Cliente
                    </>
                  )}
                </Button>
              </div>
            </Form>
    </>
  )

  if (!showCard) {
    return formContent
  }

  return (
    <Row>
      <Col xs={12}>
        <Card>
          <CardHeader>
            <h4 className="card-title mb-0">Agregar Cliente</h4>
          </CardHeader>
          <CardBody>
            {formContent}
          </CardBody>
        </Card>
      </Col>
    </Row>
  )
}

export default AddClienteForm

