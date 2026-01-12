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

interface AddNewLeadModalProps {
  show: boolean
  toggleModal: () => void
  onLeadCreated?: () => void
}

interface ColaboradorOption {
  id: number | string
  documentId?: string
  persona?: {
    nombre_completo?: string
  }
  email_login?: string
}

const ETIQUETAS = [
  { value: 'baja', label: 'Lead Frío' },
  { value: 'media', label: 'Prospecto' },
  { value: 'alta', label: 'Lead Caliente' },
]

const ESTADOS = [
  { value: 'in-progress', label: 'En Progreso' },
  { value: 'proposal-sent', label: 'Propuesta Enviada' },
  { value: 'follow-up', label: 'Seguimiento' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'negotiation', label: 'Negociación' },
  { value: 'rejected', label: 'Rechazado' },
]

const AddNewLeadModal = ({ show, toggleModal, onLeadCreated }: AddNewLeadModalProps) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [colaboradores, setColaboradores] = useState<ColaboradorOption[]>([])
  const [loadingData, setLoadingData] = useState(false)
  
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    empresa: '',
    monto_estimado: '',
    etiqueta: 'baja',
    estado: 'in-progress',
    fuente: 'Manual',
    asignado_a: '',
  })

  // Cargar colaboradores cuando se abre el modal
  useEffect(() => {
    if (show) {
      loadColaboradores()
      // Resetear formulario
      setFormData({
        nombre: '',
        email: '',
        telefono: '',
        empresa: '',
        monto_estimado: '',
        etiqueta: 'baja',
        estado: 'in-progress',
        fuente: 'Manual',
        asignado_a: '',
      })
      setError(null)
    }
  }, [show])

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
      const leadData: any = {
        nombre: formData.nombre.trim(),
        email: formData.email.trim() || undefined,
        telefono: formData.telefono.trim() || undefined,
        empresa: formData.empresa.trim() || undefined,
        monto_estimado: formData.monto_estimado ? Number(formData.monto_estimado) : undefined,
        etiqueta: formData.etiqueta,
        estado: formData.estado,
        fuente: formData.fuente.trim(),
        asignado_a: formData.asignado_a || undefined,
      }

      const response = await fetch('/api/crm/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(leadData),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al crear lead')
      }

      // Éxito
      toggleModal()
      if (onLeadCreated) {
        onLeadCreated()
      }
    } catch (err: any) {
      setError(err.message || 'Error al crear lead')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal show={show} onHide={toggleModal} size="lg">
      <ModalHeader closeButton>
        <ModalTitle as="h5">Nuevo Lead</ModalTitle>
      </ModalHeader>

      <Form id="leadForm" onSubmit={handleSubmit}>
        <ModalBody>
          {error && (
            <Alert variant="danger" className="mb-3">
              {error}
            </Alert>
          )}

          <Row className="g-3">
            <Col md={6}>
              <FormGroup controlId="leadName">
                <FormLabel>Nombre del Lead <span className="text-danger">*</span></FormLabel>
                <FormControl
                  type="text"
                  placeholder="Ej: Juan Pérez"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="companyName">
                <FormLabel>Empresa/Colegio</FormLabel>
                <FormControl
                  type="text"
                  placeholder="Ej: Colegio San José"
                  value={formData.empresa}
                  onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
                />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="email">
                <FormLabel>Email</FormLabel>
                <FormControl
                  type="email"
                  placeholder="ejemplo@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="phone">
                <FormLabel>Teléfono</FormLabel>
                <FormControl
                  type="tel"
                  placeholder="+56 9 1234 5678"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="amount">
                <FormLabel>Monto Estimado (CLP)</FormLabel>
                <FormControl
                  type="number"
                  placeholder="Ej: 500000"
                  value={formData.monto_estimado}
                  onChange={(e) => setFormData({ ...formData, monto_estimado: e.target.value })}
                  min="0"
                />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="etiqueta">
                <FormLabel>Etiqueta</FormLabel>
                <FormSelect
                  value={formData.etiqueta}
                  onChange={(e) => setFormData({ ...formData, etiqueta: e.target.value })}
                >
                  {ETIQUETAS.map((etiqueta) => (
                    <option key={etiqueta.value} value={etiqueta.value}>
                      {etiqueta.label}
                    </option>
                  ))}
                </FormSelect>
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="leadStatus">
                <FormLabel>Estado</FormLabel>
                <FormSelect
                  value={formData.estado}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                >
                  {ESTADOS.map((estado) => (
                    <option key={estado.value} value={estado.value}>
                      {estado.label}
                    </option>
                  ))}
                </FormSelect>
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="fuente">
                <FormLabel>Fuente</FormLabel>
                <FormControl
                  type="text"
                  placeholder="Ej: Feria del Libro, Web, Referencia"
                  value={formData.fuente}
                  onChange={(e) => setFormData({ ...formData, fuente: e.target.value })}
                />
              </FormGroup>
            </Col>

            <Col md={12}>
              <FormGroup controlId="assignedTo">
                <FormLabel>Asignado a</FormLabel>
                <FormSelect
                  value={formData.asignado_a}
                  onChange={(e) => setFormData({ ...formData, asignado_a: e.target.value })}
                  disabled={loadingData}
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
          </Row>
        </ModalBody>

        <ModalFooter>
          <Button variant="light" onClick={toggleModal} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar Lead'}
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  )
}

export default AddNewLeadModal
