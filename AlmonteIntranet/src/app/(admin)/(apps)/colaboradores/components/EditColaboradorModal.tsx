'use client'

import { useState, useEffect } from 'react'
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter, Button, Form, FormGroup, FormLabel, FormControl, FormCheck, Alert } from 'react-bootstrap'
import { LuSave } from 'react-icons/lu'

const ROLES = [
  'super_admin',
  'encargado_adquisiciones',
  'supervisor',
  'soporte',
]

interface ColaboradorType {
  id?: number | string
  documentId?: string
  email_login?: string
  rol?: string
  rol_principal?: string
  rol_operativo?: string
  activo?: boolean
  persona?: any
  usuario?: any
  attributes?: any
  [key: string]: any
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
    activo: true,
  })

  // Cargar datos del colaborador cuando se abre el modal
  useEffect(() => {
    if (colaborador) {
      // Los datos pueden venir en attributes o directamente
      const attrs = (colaborador as any).attributes || {}
      const data = (attrs && Object.keys(attrs).length > 0) ? attrs : colaborador

      setFormData({
        email_login: data.email_login || colaborador.email_login || '',
        rol: data.rol || colaborador.rol || '',
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
        activo: formData.activo,
      }

      // Obtener el ID correcto (documentId si existe, sino id)
      const colaboradorId = (colaborador as any).documentId || colaborador.id
      
      if (!colaboradorId) {
        throw new Error('No se pudo obtener el ID del colaborador')
      }

      // Actualizar el colaborador
      const response = await fetch(`/api/colaboradores/${colaboradorId}`, {
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
            <FormControl
              as="select"
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
            </FormControl>
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
            <LuSave className="me-1" />
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  )
}

export default EditColaboradorModal

