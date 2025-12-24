'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardBody, Form, Button, Row, Col, FormGroup, FormLabel, FormControl, FormSelect, Alert, FormCheck, InputGroup } from 'react-bootstrap'
import { LuSave, LuX, LuEye, LuEyeOff } from 'react-icons/lu'

const ROLES = [
  'super_admin',
  'encargado_adquisiciones',
  'supervisor',
  'soporte',
]

const AddColaboradorForm = () => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email_login: '',
    password: '',
    rol: '',
    activo: true,
    persona: null as string | null,
    usuario: null as string | null,
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
      // Validaciones
      if (!formData.email_login.trim()) {
        throw new Error('El email_login es obligatorio')
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email_login.trim())) {
        throw new Error('El email_login no tiene un formato válido')
      }

      // Validar contraseña
      if (!formData.password || formData.password.trim().length < 6) {
        throw new Error('La contraseña es obligatoria y debe tener al menos 6 caracteres')
      }

      // Preparar datos para Strapi
      const colaboradorData: any = {
        email_login: formData.email_login.trim(),
        password: formData.password,
        rol: formData.rol || null,
        activo: formData.activo,
        ...(formData.persona && { persona: formData.persona }),
        ...(formData.usuario && { usuario: formData.usuario }),
      }

      // Crear el colaborador
      const response = await fetch('/api/colaboradores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(colaboradorData),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al crear el colaborador')
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/colaboradores')
      }, 1500)
    } catch (err: any) {
      console.error('Error al crear colaborador:', err)
      setError(err.message || 'Error al crear el colaborador')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <h4 className="card-title mb-0">Agregar Nuevo Colaborador</h4>
      </CardHeader>
      <CardBody>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert variant="success">
            ¡Colaborador creado exitosamente! Redirigiendo...
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          <Row>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>
                  Email Login <span className="text-danger">*</span>
                </FormLabel>
                <FormControl
                  type="email"
                  placeholder="usuario@ejemplo.com"
                  value={formData.email_login}
                  onChange={(e) => handleFieldChange('email_login', e.target.value)}
                  required
                  disabled={loading}
                />
                <small className="text-muted">Email que usará para iniciar sesión</small>
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>
                  Contraseña <span className="text-danger">*</span>
                </FormLabel>
                <InputGroup>
                  <FormControl
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => handleFieldChange('password', e.target.value)}
                    required
                    disabled={loading}
                    minLength={6}
                  />
                  <Button
                    variant="outline-secondary"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                    type="button"
                  >
                    {showPassword ? <LuEyeOff /> : <LuEye />}
                  </Button>
                </InputGroup>
                <small className="text-muted">Mínimo 6 caracteres</small>
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>Rol</FormLabel>
                <FormSelect
                  value={formData.rol}
                  onChange={(e) => handleFieldChange('rol', e.target.value)}
                  disabled={loading}
                >
                  <option value="">Seleccionar rol...</option>
                  {ROLES.map((rol) => (
                    <option key={rol} value={rol}>
                      {rol}
                    </option>
                  ))}
                </FormSelect>
              </FormGroup>
            </Col>

            <Col md={12}>
              <FormGroup className="mb-3">
                <FormCheck
                  type="checkbox"
                  label="Activo"
                  checked={formData.activo}
                  onChange={(e) => handleFieldChange('activo', e.target.checked)}
                  disabled={loading}
                />
                <small className="text-muted d-block mt-1">
                  Los colaboradores inactivos no podrán iniciar sesión
                </small>
              </FormGroup>
            </Col>
          </Row>

          <div className="d-flex gap-2 justify-content-end">
            <Button
              variant="secondary"
              onClick={() => router.back()}
              disabled={loading}
            >
              <LuX className="me-1" /> Cancelar
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              <LuSave className="me-1" />
              {loading ? 'Guardando...' : 'Guardar Colaborador'}
            </Button>
          </div>
        </Form>
      </CardBody>
    </Card>
  )
}

export default AddColaboradorForm

