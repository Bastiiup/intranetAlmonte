'use client'

import { useState } from 'react'
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter, Button, Form, FormGroup, FormLabel, FormControl, Alert } from 'react-bootstrap'
import { LuSave } from 'react-icons/lu'

const DEPENDENCIAS = [
  'Municipal',
  'Particular Subvencionado',
  'Particular Pagado',
]

const TIPOS = [
  'Colegio',
  'Liceo',
  'Escuela',
]

interface AddColegioModalProps {
  show: boolean
  onHide: () => void
  onSuccess?: () => void
}

const AddColegioModal = ({ show, onHide, onSuccess }: AddColegioModalProps) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    colegio_nombre: '',
    rbd: '',
    dependencia: '',
    tipo: '',
    zona: '',
    website: '',
    activo: true,
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

    try {
      // Validaciones
      if (!formData.colegio_nombre.trim()) {
        throw new Error('El nombre del colegio es obligatorio')
      }

      // Preparar datos para Strapi
      const colegioData: any = {
        colegio_nombre: formData.colegio_nombre.trim(),
        ...(formData.rbd && { rbd: formData.rbd }),
        ...(formData.dependencia && { dependencia: formData.dependencia }),
        ...(formData.tipo && { tipo: formData.tipo }),
        ...(formData.zona && { zona: formData.zona }),
        ...(formData.website && { website: formData.website.trim() }),
        activo: formData.activo,
        origen: 'manual',
      }

      // Crear el colegio
      const response = await fetch('/api/crm/colegios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(colegioData),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al crear el colegio')
      }

      // Limpiar formulario
      setFormData({
        colegio_nombre: '',
        rbd: '',
        dependencia: '',
        tipo: '',
        zona: '',
        website: '',
        activo: true,
      })

      if (onSuccess) {
        onSuccess()
      } else {
        onHide()
      }
    } catch (err: any) {
      console.error('Error al crear colegio:', err)
      setError(err.message || 'Error al crear el colegio')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Form onSubmit={handleSubmit}>
        <ModalHeader closeButton>
          <ModalTitle>Agregar Nuevo Colegio</ModalTitle>
        </ModalHeader>
        <ModalBody>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <FormGroup className="mb-3">
            <FormLabel>
              Nombre del Colegio <span className="text-danger">*</span>
            </FormLabel>
            <FormControl
              type="text"
              placeholder="Colegio San Juan"
              value={formData.colegio_nombre}
              onChange={(e) => handleFieldChange('colegio_nombre', e.target.value)}
              required
              disabled={loading}
            />
          </FormGroup>

          <FormGroup className="mb-3">
            <FormLabel>RBD</FormLabel>
            <FormControl
              type="text"
              placeholder="12345"
              value={formData.rbd}
              onChange={(e) => handleFieldChange('rbd', e.target.value)}
              disabled={loading}
            />
          </FormGroup>

          <div className="row">
            <div className="col-md-6">
              <FormGroup className="mb-3">
                <FormLabel>Dependencia</FormLabel>
                <FormControl
                  as="select"
                  value={formData.dependencia}
                  onChange={(e) => handleFieldChange('dependencia', e.target.value)}
                  disabled={loading}
                >
                  <option value="">Seleccionar...</option>
                  {DEPENDENCIAS.map((dep) => (
                    <option key={dep} value={dep}>
                      {dep}
                    </option>
                  ))}
                </FormControl>
              </FormGroup>
            </div>
            <div className="col-md-6">
              <FormGroup className="mb-3">
                <FormLabel>Tipo</FormLabel>
                <FormControl
                  as="select"
                  value={formData.tipo}
                  onChange={(e) => handleFieldChange('tipo', e.target.value)}
                  disabled={loading}
                >
                  <option value="">Seleccionar...</option>
                  {TIPOS.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
                </FormControl>
              </FormGroup>
            </div>
          </div>

          <div className="row">
            <div className="col-md-6">
              <FormGroup className="mb-3">
                <FormLabel>Zona</FormLabel>
                <FormControl
                  type="text"
                  placeholder="Centro, Oriente, Poniente..."
                  value={formData.zona}
                  onChange={(e) => handleFieldChange('zona', e.target.value)}
                  disabled={loading}
                />
              </FormGroup>
            </div>
            <div className="col-md-6">
              <FormGroup className="mb-3">
                <FormLabel>Website</FormLabel>
                <FormControl
                  type="url"
                  placeholder="https://www.colegio.cl"
                  value={formData.website}
                  onChange={(e) => handleFieldChange('website', e.target.value)}
                  disabled={loading}
                />
              </FormGroup>
            </div>
          </div>

          <FormGroup className="mb-3">
            <FormControl
              type="checkbox"
              checked={formData.activo}
              onChange={(e) => handleFieldChange('activo', (e.target as HTMLInputElement).checked)}
              disabled={loading}
            />
            <FormLabel className="ms-2">Activo</FormLabel>
            <small className="text-muted d-block mt-1">
              Los colegios inactivos no aparecerán en las listas principales
            </small>
          </FormGroup>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={onHide} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            <LuSave className="me-1" />
            {loading ? 'Creando...' : 'Crear Colegio'}
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  )
}

export default AddColegioModal

