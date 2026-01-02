'use client'

import { useState, useEffect } from 'react'
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter, Button, Form, FormGroup, FormLabel, FormControl, Alert, Row, Col } from 'react-bootstrap'
import { LuCheck } from 'react-icons/lu'
import type { ContactType } from '@/app/(admin)/(apps)/crm/types'

const DEPENDENCIAS = [
  'Municipal',
  'Particular Subvencionado',
  'Particular Pagado',
]

interface EditContactModalProps {
  show: boolean
  onHide: () => void
  contact: ContactType | null
  onSuccess?: () => void
}

const EditContactModal = ({ show, onHide, contact, onSuccess }: EditContactModalProps) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    nombres: '',
    email: '',
    cargo: '',
    telefono: '',
    empresa: '',
    region: '',
    comuna: '',
    dependencia: '',
  })

  // Cargar datos del contacto cuando se abre el modal
  useEffect(() => {
    if (contact && show) {
      console.log('[EditContactModal] Cargando datos del contacto:', contact)
      setFormData({
        nombres: contact.name || '',
        email: contact.email || '',
        cargo: contact.cargo || '',
        telefono: contact.phone || '',
        empresa: contact.empresa || '',
        region: contact.region || '',
        comuna: contact.comuna || '',
        dependencia: contact.dependencia || '',
      })
      setError(null) // Limpiar errores previos
    }
  }, [contact, show])

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contact) return

    setLoading(true)
    setError(null)

    try {
      // Validaciones
      if (!formData.nombres.trim()) {
        throw new Error('El nombre es obligatorio')
      }
      if (!formData.email.trim()) {
        throw new Error('El email es obligatorio')
      }

      // Preparar datos para Strapi
      const contactData: any = {
        nombres: formData.nombres.trim(),
        emails: [{
          email: formData.email.trim(),
          principal: true,
        }],
        ...(formData.telefono && {
          telefonos: [{
            telefono_raw: formData.telefono.trim(),
            principal: true,
          }],
        }),
      }

      // Obtener el ID correcto (usar la misma lógica que en data.ts)
      console.log('[EditContactModal] Contacto recibido:', contact)
      console.log('[EditContactModal] contact.id:', contact.id)
      console.log('[EditContactModal] contact.documentId:', (contact as any).documentId)
      
      let contactId: number | string | undefined = undefined
      
      // Intentar obtener documentId primero (identificador principal en Strapi)
      const documentId = (contact as any).documentId
      if (documentId) {
        contactId = typeof documentId === 'number' ? documentId.toString() : String(documentId)
      } else if (contact.id !== undefined && contact.id !== null) {
        // Si no hay documentId, usar id
        if (typeof contact.id === 'number') {
          contactId = contact.id.toString()
        } else if (typeof contact.id === 'string') {
          contactId = contact.id
        } else {
          contactId = String(contact.id)
        }
      }
      
      console.log('[EditContactModal] contactId final:', contactId)
      
      if (!contactId || contactId === '0' || contactId === 'undefined' || contactId === 'null') {
        console.error('[EditContactModal] Error: No se pudo obtener un ID válido del contacto', {
          contact,
          documentId,
          id: contact.id,
        })
        throw new Error('No se pudo obtener el ID del contacto. Por favor, recarga la página e intenta nuevamente.')
      }
      
      // Asegurar que sea string para la URL
      const contactIdStr = String(contactId)

      // Actualizar el contacto
      const response = await fetch(`/api/crm/contacts/${contactIdStr}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactData),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        const errorMessage = result.details?.errors?.[0]?.message || result.error || 'Error al actualizar contacto'
        throw new Error(errorMessage)
      }

      if (onSuccess) {
        onSuccess()
      } else {
        onHide()
      }
    } catch (err: any) {
      console.error('Error al actualizar contacto:', err)
      setError(err.message || 'Error al actualizar contacto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Form onSubmit={handleSubmit}>
        <ModalHeader closeButton>
          <ModalTitle>Editar Contacto</ModalTitle>
        </ModalHeader>
        <ModalBody>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Row>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>
                  Nombre <span className="text-danger">*</span>
                </FormLabel>
                <FormControl
                  type="text"
                  placeholder="Nombre completo"
                  value={formData.nombres}
                  onChange={(e) => handleFieldChange('nombres', e.target.value)}
                  required
                  disabled={loading}
                />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>
                  Email <span className="text-danger">*</span>
                </FormLabel>
                <FormControl
                  type="email"
                  placeholder="email@ejemplo.cl"
                  value={formData.email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  required
                  disabled={loading}
                />
              </FormGroup>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>Cargo</FormLabel>
                <FormControl
                  type="text"
                  placeholder="Ej: Profesor de Matemáticas"
                  value={formData.cargo}
                  onChange={(e) => handleFieldChange('cargo', e.target.value)}
                  disabled={loading}
                />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>Teléfono</FormLabel>
                <FormControl
                  type="text"
                  placeholder="+569 1234 5678"
                  value={formData.telefono}
                  onChange={(e) => handleFieldChange('telefono', e.target.value)}
                  disabled={loading}
                />
              </FormGroup>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>Empresa</FormLabel>
                <FormControl
                  type="text"
                  placeholder="Nombre del colegio"
                  value={formData.empresa}
                  onChange={(e) => handleFieldChange('empresa', e.target.value)}
                  disabled={loading}
                />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>Región</FormLabel>
                <FormControl
                  type="text"
                  placeholder="Ej: Región Metropolitana"
                  value={formData.region}
                  onChange={(e) => handleFieldChange('region', e.target.value)}
                  disabled={loading}
                />
              </FormGroup>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>Comuna</FormLabel>
                <FormControl
                  type="text"
                  placeholder="Ej: Santiago"
                  value={formData.comuna}
                  onChange={(e) => handleFieldChange('comuna', e.target.value)}
                  disabled={loading}
                />
              </FormGroup>
            </Col>
            <Col md={6}>
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
            </Col>
          </Row>

        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={onHide} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            <LuCheck className="me-1" />
            {loading ? 'Guardando...' : 'Guardar'}
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  )
}

export default EditContactModal

