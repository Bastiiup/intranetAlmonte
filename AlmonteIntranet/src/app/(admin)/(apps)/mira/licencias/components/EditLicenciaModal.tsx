'use client'

import { useState, useEffect } from 'react'
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter, Button, Form, FormGroup, FormLabel, FormControl, Alert, Row, Col } from 'react-bootstrap'
import { LuCheck } from 'react-icons/lu'
import type { LicenciaType } from './LicenciasListing'

interface EditLicenciaModalProps {
  show: boolean
  onHide: () => void
  licencia: LicenciaType | null
  onSuccess?: () => void
}

const EditLicenciaModal = ({ show, onHide, licencia, onSuccess }: EditLicenciaModalProps) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    activa: true,
    fecha_vencimiento: '',
    numeral: '',
  })

  // Cargar datos de la licencia cuando se abre el modal
  useEffect(() => {
    if (show && licencia) {
      // Formatear fecha_vencimiento para el input type="date" (YYYY-MM-DD)
      let fechaVencimientoFormatted = ''
      if (licencia.fecha_vencimiento) {
        try {
          const date = new Date(licencia.fecha_vencimiento)
          fechaVencimientoFormatted = date.toISOString().split('T')[0]
        } catch (e) {
          console.error('Error al formatear fecha_vencimiento:', e)
        }
      }

      setFormData({
        activa: licencia.activa !== false,
        fecha_vencimiento: fechaVencimientoFormatted,
        numeral: licencia.numeral != null ? String(licencia.numeral) : '',
      })
      setError(null)
    }
  }, [show, licencia])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!licencia?.id && !licencia?.documentId) {
      setError('No se pudo obtener el ID de la licencia')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const licenciaId = licencia.documentId || licencia.id

      const updateData: any = {
        activa: formData.activa,
        fecha_vencimiento: formData.fecha_vencimiento || null,
        numeral: formData.numeral ? parseInt(formData.numeral, 10) : null,
      }

      const response = await fetch(`/api/mira/licencias/${licenciaId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        const errorMessage = result.error || result.details?.errors?.[0]?.message || 'Error al actualizar licencia'
        throw new Error(errorMessage)
      }

      if (onSuccess) {
        onSuccess()
      }
      onHide()
    } catch (err: any) {
      console.error('Error al actualizar licencia:', err)
      setError(err.message || 'Error al actualizar licencia')
    } finally {
      setLoading(false)
    }
  }

  if (!licencia) return null

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Form onSubmit={handleSubmit}>
        <ModalHeader closeButton>
          <ModalTitle>Editar Licencia</ModalTitle>
        </ModalHeader>
        <ModalBody>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Row className="g-3">
            <Col md={12}>
              <FormGroup controlId="codigoActivacion">
                <FormLabel>Código de Activación</FormLabel>
                <FormControl
                  type="text"
                  value={licencia.codigo_activacion || ''}
                  disabled
                  className="bg-light"
                />
                <small className="text-muted">Este campo no se puede editar</small>
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="activa">
                <FormLabel>Estado</FormLabel>
                <FormSelect
                  value={formData.activa ? 'true' : 'false'}
                  onChange={(e) => setFormData({ ...formData, activa: e.target.value === 'true' })}
                  disabled={loading}
                >
                  <option value="true">Activa</option>
                  <option value="false">Inactiva</option>
                </FormSelect>
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="numeral">
                <FormLabel>Numeral</FormLabel>
                <FormControl
                  type="number"
                  placeholder="Ej: 1, 2, 3..."
                  value={formData.numeral}
                  onChange={(e) => setFormData({ ...formData, numeral: e.target.value })}
                  disabled={loading}
                  min="0"
                />
                <small className="text-muted">Número correlativo de la licencia</small>
              </FormGroup>
            </Col>

            <Col md={12}>
              <FormGroup controlId="fechaVencimiento">
                <FormLabel>Fecha de Vencimiento</FormLabel>
                <FormControl
                  type="date"
                  value={formData.fecha_vencimiento}
                  onChange={(e) => setFormData({ ...formData, fecha_vencimiento: e.target.value })}
                  disabled={loading}
                />
                <small className="text-muted">Fecha de vencimiento de la licencia (opcional)</small>
              </FormGroup>
            </Col>

            {licencia.libro_mira?.libro && (
              <Col md={12}>
                <FormGroup controlId="libro">
                  <FormLabel>Libro</FormLabel>
                  <FormControl
                    type="text"
                    value={licencia.libro_mira.libro.nombre_libro || ''}
                    disabled
                    className="bg-light"
                  />
                  <small className="text-muted">Este campo no se puede editar</small>
                </FormGroup>
              </Col>
            )}

            {licencia.estudiante?.persona && (
              <Col md={12}>
                <FormGroup controlId="estudiante">
                  <FormLabel>Estudiante</FormLabel>
                  <FormControl
                    type="text"
                    value={`${licencia.estudiante.persona.nombres} ${licencia.estudiante.persona.primer_apellido} ${licencia.estudiante.persona.segundo_apellido || ''}`.trim()}
                    disabled
                    className="bg-light"
                  />
                  <small className="text-muted">Este campo no se puede editar</small>
                </FormGroup>
              </Col>
            )}
          </Row>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={onHide} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? 'Guardando...' : (
              <>
                <LuCheck className="me-2" />
                Guardar Cambios
              </>
            )}
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  )
}

export default EditLicenciaModal
