'use client'

import { useState, useEffect } from 'react'
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

interface ColegioType {
  id?: number | string
  documentId?: string
  colegio_nombre?: string
  rbd?: number | string
  dependencia?: string
  tipo?: string
  zona?: string
  website?: string
  activo?: boolean
  attributes?: any
  [key: string]: any
}

interface EditColegioModalProps {
  show: boolean
  onHide: () => void
  colegio: ColegioType | null
  onSuccess?: () => void
}

const EditColegioModal = ({ show, onHide, colegio, onSuccess }: EditColegioModalProps) => {
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

  // Cargar datos del colegio cuando se abre el modal
  useEffect(() => {
    if (colegio) {
      // Los datos pueden venir en attributes o directamente
      const attrs = (colegio as any).attributes || {}
      const data = (attrs && Object.keys(attrs).length > 0) ? attrs : colegio

      setFormData({
        colegio_nombre: data.colegio_nombre || colegio.colegio_nombre || '',
        rbd: data.rbd?.toString() || colegio.rbd?.toString() || '',
        dependencia: data.dependencia || colegio.dependencia || '',
        tipo: data.tipo || colegio.tipo || '',
        zona: data.zona || colegio.zona || '',
        website: data.website || colegio.website || '',
        activo: data.activo !== undefined ? data.activo : (colegio.activo !== undefined ? colegio.activo : true),
      })
    }
  }, [colegio])

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!colegio) return

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
      }

      // Obtener el ID correcto (documentId si existe, sino id)
      const colegioId = (colegio as any).documentId || colegio.id
      
      if (!colegioId) {
        throw new Error('No se pudo obtener el ID del colegio')
      }

      // Actualizar el colegio
      const response = await fetch(`/api/crm/colegios/${colegioId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(colegioData),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al actualizar el colegio')
      }

      if (onSuccess) {
        onSuccess()
      } else {
        onHide()
      }
    } catch (err: any) {
      console.error('Error al actualizar colegio:', err)
      setError(err.message || 'Error al actualizar el colegio')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Form onSubmit={handleSubmit}>
        <ModalHeader closeButton>
          <ModalTitle>Editar Colegio</ModalTitle>
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
              onChange={(e) => handleFieldChange('activo', e.target.checked)}
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
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  )
}

export default EditColegioModal

