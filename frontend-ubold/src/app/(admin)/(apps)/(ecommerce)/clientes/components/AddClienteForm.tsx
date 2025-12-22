'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardBody, Form, Button, Row, Col, FormGroup, FormLabel, FormControl, Alert } from 'react-bootstrap'
import { LuSave, LuX } from 'react-icons/lu'

const AddClienteForm = () => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    // Campos de Persona
    rut: '',
    nombres: '',
    primer_apellido: '',
    segundo_apellido: '',
    nombre_completo: '',
    email: '',
    telefono: '',
    // Campos de WO-Clientes
    pedidos: '0',
    gasto_total: '0',
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
      // Validar campos obligatorios de Persona
      if (!formData.nombre_completo.trim()) {
        throw new Error('El nombre completo es obligatorio')
      }

      if (!formData.email.trim()) {
        throw new Error('El correo electrónico es obligatorio')
      }

      // Validar formato de email básico
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email.trim())) {
        throw new Error('El correo electrónico no tiene un formato válido')
      }

      // Construir nombre completo si no está lleno pero sí los campos individuales
      let nombreCompletoFinal = formData.nombre_completo.trim()
      if (!nombreCompletoFinal && (formData.nombres.trim() || formData.primer_apellido.trim())) {
        const partes = []
        if (formData.nombres.trim()) partes.push(formData.nombres.trim())
        if (formData.primer_apellido.trim()) partes.push(formData.primer_apellido.trim())
        if (formData.segundo_apellido.trim()) partes.push(formData.segundo_apellido.trim())
        nombreCompletoFinal = partes.join(' ')
      }

      if (!nombreCompletoFinal) {
        throw new Error('Debe proporcionar el nombre completo o los nombres y apellidos')
      }

      // Preparar datos con estructura de Persona primero
      const clienteData: any = {
        data: {
          // Datos de Persona
          persona: {
            rut: formData.rut.trim() || null,
            nombres: formData.nombres.trim() || null,
            primer_apellido: formData.primer_apellido.trim() || null,
            segundo_apellido: formData.segundo_apellido.trim() || null,
            nombre_completo: nombreCompletoFinal,
            emails: [
              {
                email: formData.email.trim(),
                tipo: 'principal',
              }
            ],
            telefonos: formData.telefono.trim() ? [
              {
                numero: formData.telefono.trim(),
                tipo: 'principal',
              }
            ] : [],
          },
          // Datos de WO-Clientes
          pedidos: parseInt(formData.pedidos) || 0,
          gasto_total: parseFloat(formData.gasto_total) || 0,
          fecha_registro: new Date().toISOString(),
        },
      }

      // Crear el cliente (que primero creará Persona y luego WO-Clientes)
      const response = await fetch('/api/tienda/clientes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clienteData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al crear el cliente')
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/clientes')
      }, 1500)
    } catch (err: any) {
      console.error('Error al crear cliente:', err)
      setError(err.message || 'Error al crear el cliente')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Row>
      <Col xs={12}>
        <Card>
          <CardHeader>
            <h4 className="card-title mb-0">Agregar Cliente</h4>
          </CardHeader>
          <CardBody>
            {error && (
              <Alert variant="danger" dismissible onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert variant="success">
                Cliente creado exitosamente. Redirigiendo...
              </Alert>
            )}

            <Form onSubmit={handleSubmit}>
              <h5 className="mb-3">Datos de Persona</h5>
              <Row>
                <Col md={6}>
                  <FormGroup className="mb-3">
                    <FormLabel>
                      Nombre Completo <span className="text-danger">*</span>
                    </FormLabel>
                    <FormControl
                      type="text"
                      placeholder="Ej: Juan Pérez González"
                      value={formData.nombre_completo}
                      onChange={(e) => handleFieldChange('nombre_completo', e.target.value)}
                      required
                    />
                    <small className="text-muted">O complete los campos individuales abajo</small>
                  </FormGroup>
                </Col>
                <Col md={6}>
                  <FormGroup className="mb-3">
                    <FormLabel>RUT</FormLabel>
                    <FormControl
                      type="text"
                      placeholder="Ej: 12345678-9"
                      value={formData.rut}
                      onChange={(e) => handleFieldChange('rut', e.target.value)}
                    />
                  </FormGroup>
                </Col>
              </Row>

              <Row>
                <Col md={4}>
                  <FormGroup className="mb-3">
                    <FormLabel>Nombres</FormLabel>
                    <FormControl
                      type="text"
                      placeholder="Ej: Juan"
                      value={formData.nombres}
                      onChange={(e) => handleFieldChange('nombres', e.target.value)}
                    />
                  </FormGroup>
                </Col>
                <Col md={4}>
                  <FormGroup className="mb-3">
                    <FormLabel>Primer Apellido</FormLabel>
                    <FormControl
                      type="text"
                      placeholder="Ej: Pérez"
                      value={formData.primer_apellido}
                      onChange={(e) => handleFieldChange('primer_apellido', e.target.value)}
                    />
                  </FormGroup>
                </Col>
                <Col md={4}>
                  <FormGroup className="mb-3">
                    <FormLabel>Segundo Apellido</FormLabel>
                    <FormControl
                      type="text"
                      placeholder="Ej: González"
                      value={formData.segundo_apellido}
                      onChange={(e) => handleFieldChange('segundo_apellido', e.target.value)}
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
                      type="text"
                      placeholder="Ej: +56912345678"
                      value={formData.telefono}
                      onChange={(e) => handleFieldChange('telefono', e.target.value)}
                    />
                  </FormGroup>
                </Col>
              </Row>

              <hr className="my-4" />
              <h5 className="mb-3">Datos de Cliente (WO-Clientes)</h5>
              <Row>
                <Col md={6}>
                  <FormGroup className="mb-3">
                    <FormLabel>Pedidos</FormLabel>
                    <FormControl
                      type="number"
                      min="0"
                      placeholder="0"
                      value={formData.pedidos}
                      onChange={(e) => handleFieldChange('pedidos', e.target.value)}
                    />
                    <small className="text-muted">Número total de pedidos realizados</small>
                  </FormGroup>
                </Col>
                <Col md={6}>
                  <FormGroup className="mb-3">
                    <FormLabel>Total Gastado</FormLabel>
                    <FormControl
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.gasto_total}
                      onChange={(e) => handleFieldChange('gasto_total', e.target.value)}
                    />
                    <small className="text-muted">Total acumulado de compras</small>
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
                      <LuSave className="me-1" /> Guardar Cliente
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

export default AddClienteForm

