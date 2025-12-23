'use client'

import { useState, useEffect } from 'react'
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter, Button, Form, FormGroup, FormLabel, FormControl, FormSelect, FormCheck, Alert } from 'react-bootstrap'
import { TbSave } from 'react-icons/tb'

const ROLES = [
  'super_admin',
  'encargado_adquisiciones',
  'supervisor',
  'soporte',
]

interface ColaboradorType {
  id: number | string
  email_login: string
  rol?: string
  rol_principal?: string
  rol_operativo?: string
  activo: boolean
  persona?: any
  usuario?: any
}

interface EditColaboradorModalProps {
  show: boolean
  onHide: () => void
  colaborador: ColaboradorType | null
  onSuccess?: () => void
}

const EditColaboradorModal = ({ show, onHide, colaborador, onSuccess }: EditColaboradorModalProps) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email_login: '',
    rol: '',
    rol_principal: '',
    rol_operativo: '',
    activo: true,
  })

  // Cargar datos del colaborador cuando se abre el modal
  useEffect(() => {
    if (colaborador) {
      const attrs = colaborador.attributes || {}
      const data = (attrs && Object.keys(attrs).length > 0) ? attrs : colaborador

      setFormData({
        email_login: data.email_login || colaborador.email_login || '',
        rol: data.rol || colaborador.rol || '',
        rol_principal: data.rol_principal || colaborador.rol_principal || '',
        rol_operativo: data.rol_operativo || colaborador.rol_operativo || '',
        activo: data.activo !== undefined ? data.activo : (colaborador.activo !== undefined ? colaborador.activo : true),
      })
    }
  }, [colaborador])

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!colaborador) return

    setLoading(true)
    setError(null)

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
      const colaboradorData: any = {
        email_login: formData.email_login.trim(),
        rol: formData.rol || null,
        rol_principal: formData.rol_principal || null,
        rol_operativo: formData.rol_operativo || null,
        activo: formData.activo,
      }

      // Actualizar el colaborador
      const response = await fetch(`/api/colaboradores/${colaborador.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(colaboradorData),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al actualizar el colaborador')
      }

      if (onSuccess) {
        onSuccess()
      } else {
        onHide()
      }
    } catch (err: any) {
      console.error('Error al actualizar colaborador:', err)
      setError(err.message || 'Error al actualizar el colaborador')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Form onSubmit={handleSubmit}>
        <ModalHeader closeButton>
          <ModalTitle>Editar Colaborador</ModalTitle>
        </ModalHeader>
        <ModalBody>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

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

          <FormGroup className="mb-3">
            <FormLabel>Rol Principal</FormLabel>
            <FormControl
              type="text"
              placeholder="Rol principal"
              value={formData.rol_principal}
              onChange={(e) => handleFieldChange('rol_principal', e.target.value)}
              disabled={loading}
            />
          </FormGroup>

          <FormGroup className="mb-3">
            <FormLabel>Rol Operativo</FormLabel>
            <FormControl
              type="text"
              placeholder="Rol operativo"
              value={formData.rol_operativo}
              onChange={(e) => handleFieldChange('rol_operativo', e.target.value)}
              disabled={loading}
            />
          </FormGroup>

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
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={onHide} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            <TbSave className="me-1" />
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  )
}

export default EditColaboradorModal

