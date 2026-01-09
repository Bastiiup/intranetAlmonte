'use client'

import { useState, useEffect } from 'react'
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter, Button, Form, FormGroup, FormLabel, FormControl, Alert, Row, Col, FormSelect } from 'react-bootstrap'
import { LuCheck } from 'react-icons/lu'
import type { LeadType } from '@/app/(admin)/(apps)/crm/types'

interface EditLeadModalProps {
  show: boolean
  onHide: () => void
  lead: LeadType | null
  onSuccess?: () => void
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
  { value: 'baja', label: 'Cold Lead' },
  { value: 'media', label: 'Prospect' },
  { value: 'alta', label: 'Hot Lead' },
]

const ESTADOS = [
  { value: 'in-progress', label: 'In Progress' },
  { value: 'proposal-sent', label: 'Proposal Sent' },
  { value: 'follow-up', label: 'Follow Up' },
  { value: 'pending', label: 'Pending' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'rejected', label: 'Rejected' },
]

const EditLeadModal = ({ show, onHide, lead, onSuccess }: EditLeadModalProps) => {
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

  // Cargar datos completos del lead cuando se abre el modal
  useEffect(() => {
    if (show && lead?.realId) {
      loadLeadData()
      loadColaboradores()
      setError(null)
    } else if (show && lead) {
      // Fallback: usar datos limitados de LeadType
      // Mapear etiqueta desde tag.label
      const etiquetaMap: Record<string, string> = {
        'Cold Lead': 'baja',
        'Prospect': 'media',
        'Hot Lead': 'alta',
      }
      const etiqueta = etiquetaMap[lead.tag.label] || 'baja'

      // Mapear estado desde status
      const estadoMap: Record<string, string> = {
        'In Progress': 'in-progress',
        'Proposal Sent': 'proposal-sent',
        'Follow Up': 'follow-up',
        'Pending': 'pending',
        'Negotiation': 'negotiation',
        'Rejected': 'rejected',
      }
      const estado = estadoMap[lead.status] || 'in-progress'

      setFormData({
        nombre: lead.customer || '',
        email: lead.email || '',
        telefono: lead.phone || '',
        empresa: lead.company || '',
        monto_estimado: lead.amount ? String(lead.amount) : '',
        etiqueta,
        estado,
        fuente: 'Manual',
        asignado_a: '',
      })
      
      loadColaboradores()
      setError(null)
    }
  }, [show, lead])

  const loadLeadData = async () => {
    if (!lead?.realId) return

    try {
      // Limpiar el ID (remover #LD si existe)
      const cleanId = lead.realId.replace(/^#LD/, '').replace(/^#/, '')
      
      const response = await fetch(`/api/crm/leads/${cleanId}`)
      const result = await response.json()

      if (result.success && result.data) {
        const data = result.data.attributes || result.data
        
        // Extraer ID de relación asignado_a
        let asignadoId = ''
        if (data.asignado_a) {
          const asignado = data.asignado_a.data || data.asignado_a
          asignadoId = asignado?.documentId || asignado?.id || ''
        }

        setFormData({
          nombre: data.nombre || '',
          email: data.email || '',
          telefono: data.telefono || '',
          empresa: data.empresa || '',
          monto_estimado: data.monto_estimado ? String(data.monto_estimado) : '',
          etiqueta: data.etiqueta || 'baja',
          estado: data.estado || 'in-progress',
          fuente: data.fuente || 'Manual',
          asignado_a: String(asignadoId),
        })
      }
    } catch (err) {
      console.error('Error al cargar datos del lead:', err)
    }
  }

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

    if (!lead?.realId) {
      setError('No se pudo obtener el ID del lead')
      return
    }

    setLoading(true)
    setError(null)

    try {
      if (!formData.nombre.trim()) {
        throw new Error('El nombre del lead es obligatorio')
      }

      // Limpiar el ID (remover #LD si existe)
      const cleanId = lead.realId.replace(/^#LD/, '').replace(/^#/, '')

      const leadData: any = {
        nombre: formData.nombre.trim(),
        email: formData.email.trim() || undefined,
        telefono: formData.telefono.trim() || undefined,
        empresa: formData.empresa.trim() || undefined,
        monto_estimado: formData.monto_estimado ? Number(formData.monto_estimado) : undefined,
        etiqueta: formData.etiqueta,
        estado: formData.estado,
        fuente: formData.fuente.trim() || 'Manual',
        asignado_a: formData.asignado_a || undefined,
      }

      const response = await fetch(`/api/crm/leads/${cleanId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(leadData),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        const errorMessage = result.error || result.details?.errors?.[0]?.message || 'Error al actualizar lead'
        throw new Error(errorMessage)
      }

      if (onSuccess) {
        onSuccess()
      }
      onHide()
    } catch (err: any) {
      console.error('Error al actualizar lead:', err)
      setError(err.message || 'Error al actualizar lead')
    } finally {
      setLoading(false)
    }
  }

  if (!lead) return null

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Form onSubmit={handleSubmit}>
        <ModalHeader closeButton>
          <ModalTitle>Editar Lead</ModalTitle>
        </ModalHeader>
        <ModalBody>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
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
                  disabled={loading}
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
                  disabled={loading}
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
                  disabled={loading}
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
                  disabled={loading}
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
                  disabled={loading}
                />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="etiqueta">
                <FormLabel>Etiqueta</FormLabel>
                <FormSelect
                  value={formData.etiqueta}
                  onChange={(e) => setFormData({ ...formData, etiqueta: e.target.value })}
                  disabled={loading}
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

            <Col md={6}>
              <FormGroup controlId="fuente">
                <FormLabel>Fuente</FormLabel>
                <FormControl
                  type="text"
                  placeholder="Ej: Feria del Libro, Web, Referencia"
                  value={formData.fuente}
                  onChange={(e) => setFormData({ ...formData, fuente: e.target.value })}
                  disabled={loading}
                />
              </FormGroup>
            </Col>

            <Col md={12}>
              <FormGroup controlId="assignedTo">
                <FormLabel>Asignado a</FormLabel>
                <FormSelect
                  value={formData.asignado_a}
                  onChange={(e) => setFormData({ ...formData, asignado_a: e.target.value })}
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
          </Row>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={onHide} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            <LuCheck className="me-1" />
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  )
}

export default EditLeadModal
