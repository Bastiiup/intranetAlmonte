'use client'

import {
  Modal,
  Button,
  Form,
  Row,
  Col,
  ModalHeader,
  ModalBody,
  ModalTitle,
  FormGroup,
  FormLabel,
  FormControl,
  FormSelect,
  ModalFooter,
  Alert,
} from 'react-bootstrap'
import { useState, useEffect } from 'react'

interface AddActivityModalProps {
  show: boolean
  toggleModal: () => void
  onActivityCreated?: () => void
  relacionadoCon?: {
    tipo: 'contacto' | 'lead' | 'oportunidad' | 'colegio'
    id: string
    nombre: string
  }
}

interface ColaboradorOption {
  id: number | string
  documentId?: string
  persona?: {
    nombre_completo?: string
  }
  email_login?: string
}

const TIPOS = [
  { value: 'llamada', label: 'Llamada' },
  { value: 'email', label: 'Email' },
  { value: 'reunion', label: 'Reunión' },
  { value: 'nota', label: 'Nota' },
  { value: 'cambio_estado', label: 'Cambio de Estado' },
  { value: 'tarea', label: 'Tarea' },
  { value: 'recordatorio', label: 'Recordatorio' },
  { value: 'otro', label: 'Otro' },
]

const ESTADOS = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'en_progreso', label: 'En Progreso' },
  { value: 'completada', label: 'Completada' },
  { value: 'cancelada', label: 'Cancelada' },
]

const AddActivityModal = ({ show, toggleModal, onActivityCreated, relacionadoCon }: AddActivityModalProps) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [colaboradores, setColaboradores] = useState<ColaboradorOption[]>([])
  const [loadingData, setLoadingData] = useState(false)
  
  const [formData, setFormData] = useState({
    tipo: 'nota',
    titulo: '',
    descripcion: '',
    fecha: new Date().toISOString().slice(0, 16), // Formato para datetime-local
    estado: 'pendiente',
    notas: '',
    relacionado_con_contacto: '',
    relacionado_con_lead: '',
    relacionado_con_oportunidad: '',
    relacionado_con_colegio: '',
    creado_por: '',
  })

  // Cargar colaboradores cuando se abre el modal
  useEffect(() => {
    if (show) {
      loadColaboradores()
      // Si hay una relación predefinida, establecerla
      if (relacionadoCon) {
        const relationField = `relacionado_con_${relacionadoCon.tipo}` as keyof typeof formData
        setFormData(prev => ({
          ...prev,
          [relationField]: relacionadoCon.id,
        }))
      }
      setError(null)
    }
  }, [show, relacionadoCon])

  const loadColaboradores = async () => {
    setLoadingData(true)
    try {
      const response = await fetch('/api/colaboradores?activo=true&pageSize=100')
      const result = await response.json()
      
      if (result.success && result.data) {
        setColaboradores(result.data)
      }
    } catch (err: any) {
      console.error('Error loading colaboradores:', err)
    } finally {
      setLoadingData(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!formData.titulo.trim()) {
        throw new Error('El título de la actividad es obligatorio')
      }

      if (!formData.fecha) {
        throw new Error('La fecha de la actividad es obligatoria')
      }

      const activityData: any = {
        tipo: formData.tipo,
        titulo: formData.titulo.trim(),
        descripcion: formData.descripcion.trim() || undefined,
        fecha: formData.fecha,
        estado: formData.estado,
        notas: formData.notas.trim() || undefined,
        creado_por: formData.creado_por || undefined,
      }

      // Agregar relación según corresponda
      if (formData.relacionado_con_contacto) {
        activityData.relacionado_con_contacto = formData.relacionado_con_contacto
      }
      if (formData.relacionado_con_lead) {
        activityData.relacionado_con_lead = formData.relacionado_con_lead
      }
      if (formData.relacionado_con_oportunidad) {
        activityData.relacionado_con_oportunidad = formData.relacionado_con_oportunidad
      }
      if (formData.relacionado_con_colegio) {
        activityData.relacionado_con_colegio = formData.relacionado_con_colegio
      }

      const response = await fetch('/api/crm/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(activityData),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al crear actividad')
      }

      // Éxito
      toggleModal()
      if (onActivityCreated) {
        onActivityCreated()
      }
    } catch (err: any) {
      setError(err.message || 'Error al crear actividad')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal show={show} onHide={toggleModal} size="lg">
      <ModalHeader closeButton>
        <ModalTitle as="h5">Nueva Actividad</ModalTitle>
      </ModalHeader>

      <Form id="activityForm" onSubmit={handleSubmit}>
        <ModalBody>
          {error && (
            <Alert variant="danger" className="mb-3">
              {error}
            </Alert>
          )}

          {relacionadoCon && (
            <Alert variant="info" className="mb-3">
              <strong>Relacionado con:</strong> {relacionadoCon.nombre} ({relacionadoCon.tipo})
            </Alert>
          )}

          <Row className="g-3">
            <Col md={6}>
              <FormGroup controlId="activityType">
                <FormLabel>Tipo de Actividad <span className="text-danger">*</span></FormLabel>
                <FormSelect
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                  required
                  disabled={loading}
                >
                  {TIPOS.map((tipo) => (
                    <option key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </option>
                  ))}
                </FormSelect>
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="activityStatus">
                <FormLabel>Estado <span className="text-danger">*</span></FormLabel>
                <FormSelect
                  value={formData.estado}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                  required
                  disabled={loading}
                >
                  {ESTADOS.map((estado) => (
                    <option key={estado.value} value={estado.value}>
                      {estado.label}
                    </option>
                  ))}
                </FormSelect>
              </FormGroup>
            </Col>

            <Col md={12}>
              <FormGroup controlId="activityTitle">
                <FormLabel>Título <span className="text-danger">*</span></FormLabel>
                <FormControl
                  type="text"
                  placeholder="Ej: Llamada de seguimiento con Juan Pérez"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  required
                  disabled={loading}
                />
              </FormGroup>
            </Col>

            <Col md={12}>
              <FormGroup controlId="activityDescription">
                <FormLabel>Descripción</FormLabel>
                <FormControl
                  as="textarea"
                  rows={3}
                  placeholder="Descripción detallada de la actividad..."
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  disabled={loading}
                />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="activityDate">
                <FormLabel>Fecha y Hora <span className="text-danger">*</span></FormLabel>
                <FormControl
                  type="datetime-local"
                  value={formData.fecha}
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  required
                  disabled={loading}
                />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="activityCreator">
                <FormLabel>Creado por <span className="text-danger">*</span></FormLabel>
                <FormSelect
                  value={formData.creado_por}
                  onChange={(e) => setFormData({ ...formData, creado_por: e.target.value })}
                  required
                  disabled={loading || loadingData}
                >
                  <option value="">Seleccionar colaborador</option>
                  {colaboradores.map((colaborador) => {
                    const id = colaborador.documentId || colaborador.id
                    const nombre = colaborador.persona?.nombre_completo || colaborador.email_login || `ID: ${id}`
                    return (
                      <option key={id} value={String(id)}>
                        {nombre}
                      </option>
                    )
                  })}
                </FormSelect>
              </FormGroup>
            </Col>

            <Col md={12}>
              <FormGroup controlId="activityNotes">
                <FormLabel>Notas Adicionales</FormLabel>
                <FormControl
                  as="textarea"
                  rows={2}
                  placeholder="Notas adicionales sobre la actividad..."
                  value={formData.notas}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  disabled={loading}
                />
              </FormGroup>
            </Col>
          </Row>
        </ModalBody>

        <ModalFooter>
          <Button variant="light" onClick={toggleModal} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar Actividad'}
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  )
}

export default AddActivityModal
