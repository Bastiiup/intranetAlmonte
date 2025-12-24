'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardBody, Form, Button, Row, Col, FormGroup, FormLabel, FormControl, FormSelect, Alert, FormCheck } from 'react-bootstrap'
import { LuSave, LuX } from 'react-icons/lu'

const ROLES = [
  'super_admin',
  'encargado_adquisiciones',
  'supervisor',
  'soporte',
]

interface ColaboradorType {
  id: number | string
  documentId?: string
  email_login?: string
  rol?: string
  rol_principal?: string
  rol_operativo?: string
  activo?: boolean
  persona?: any
  usuario?: any
  attributes?: any
}

interface EditColaboradorFormProps {
  colaborador: any
  error?: string | null
}

const EditColaboradorForm = ({ colaborador: propsColaborador, error: propsError }: EditColaboradorFormProps) => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(propsError || null)
  const [success, setSuccess] = useState(false)

  // Obtener datos del colaborador - manejar diferentes estructuras de Strapi
  const getColaboradorData = () => {
    if (!propsColaborador) return null
    
    // Caso 1: datos en attributes (estructura estándar de Strapi)
    if (propsColaborador.attributes) {
      return propsColaborador.attributes
    }
    
    // Caso 2: datos directamente en el objeto
    if (propsColaborador.email_login || propsColaborador.rol !== undefined) {
      return propsColaborador
    }
    
    // Caso 3: datos en data.attributes
    if ((propsColaborador as any).data?.attributes) {
      return (propsColaborador as any).data.attributes
    }
    
    // Caso 4: datos en data directamente
    if ((propsColaborador as any).data) {
      return (propsColaborador as any).data
    }
    
    return null
  }

  const colaboradorData = getColaboradorData()
  // Obtener el ID correcto (documentId si existe, sino id)
  const colaboradorId = (propsColaborador as any)?.documentId || propsColaborador?.id || (propsColaborador as any)?.data?.id

  const [formData, setFormData] = useState({
    email_login: colaboradorData?.email_login || '',
    rol: colaboradorData?.rol || '',
    activo: colaboradorData?.activo !== undefined ? colaboradorData.activo : true,
  })

  useEffect(() => {
    if (colaboradorData) {
      setFormData({
        email_login: colaboradorData.email_login || '',
        rol: colaboradorData.rol || '',
        activo: colaboradorData.activo !== undefined ? colaboradorData.activo : true,
      })
    }
  }, [colaboradorData])

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!colaboradorId) {
      setError('No se pudo obtener el ID del colaborador')
      return
    }

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

      // Preparar datos para Strapi
      const colaboradorUpdateData: any = {
        email_login: formData.email_login.trim(),
        rol: formData.rol || null,
        activo: formData.activo,
      }

      // Actualizar el colaborador
      const response = await fetch(`/api/colaboradores/${colaboradorId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(colaboradorUpdateData),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al actualizar el colaborador')
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/colaboradores')
      }, 1500)
    } catch (err: any) {
      console.error('Error al actualizar colaborador:', err)
      setError(err.message || 'Error al actualizar el colaborador')
    } finally {
      setLoading(false)
    }
  }

  if (!colaboradorData) {
    return (
      <Card>
        <CardBody>
          <Alert variant="warning">
            No se pudo cargar la información del colaborador.
            {propsError && (
              <div className="mt-2">
                <small>Error: {propsError}</small>
              </div>
            )}
            {!propsColaborador && (
              <div className="mt-2">
                <small>No se recibieron datos del colaborador.</small>
              </div>
            )}
          </Alert>
        </CardBody>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <h4 className="card-title mb-0">Editar Colaborador</h4>
      </CardHeader>
      <CardBody>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert variant="success">
            ¡Colaborador actualizado exitosamente! Redirigiendo...
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
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </Form>
      </CardBody>
    </Card>
  )
}

export default EditColaboradorForm

