'use client'

import { useState, useEffect } from 'react'
import { Modal, Button, Form, Row, Col, Alert } from 'react-bootstrap'
import { LuX, LuSave, LuMinus, LuMaximize2 } from 'react-icons/lu'

interface EdicionColegioModalProps {
  show: boolean
  onHide: () => void
  colegio: any
  onSuccess?: () => void
}

export default function EdicionColegioModal({ show, onHide, colegio, onSuccess }: EdicionColegioModalProps) {
  const [minimizado, setMinimizado] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    colegio_nombre: '',
    rbd: '',
    comuna: '',
    region: '',
    direccion: '',
    telefono: '',
    email: '',
    total_matriculados: 0,
  })

  useEffect(() => {
    if (colegio) {
      console.log('[EdicionColegioModal] Datos del colegio recibidos:', {
        nombre: colegio.nombre,
        rbd: colegio.rbd,
        comuna: colegio.comuna,
        region: colegio.region,
        direccion: colegio.direccion,
        telefono: colegio.telefono,
        email: colegio.email,
        total_matriculados: colegio.total_matriculados,
        colegioCompleto: colegio,
      })
      
      setFormData({
        colegio_nombre: colegio.nombre || '',
        rbd: String(colegio.rbd || ''),
        comuna: colegio.comuna || '',
        region: colegio.region || '',
        direccion: colegio.direccion || '',
        telefono: colegio.telefono || '',
        email: colegio.email || '',
        total_matriculados: colegio.total_matriculados !== null && colegio.total_matriculados !== undefined ? colegio.total_matriculados : 0,
      })
    }
  }, [colegio])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'total_matriculados' ? parseInt(value) || 0 : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardando(true)
    setError(null)

    try {
      const response = await fetch(`/api/crm/colegios/${colegio.documentId || colegio.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al actualizar colegio')
      }

      onSuccess?.()
      onHide()
    } catch (err: any) {
      setError(err.message || 'Error al guardar cambios')
    } finally {
      setGuardando(false)
    }
  }

  if (!colegio) return null

  return (
    <Modal 
      show={show} 
      onHide={onHide} 
      size="lg" 
      centered
      className={minimizado ? 'modal-minimized' : ''}
      style={minimizado ? {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        top: 'auto',
        left: 'auto',
        margin: 0,
      } : undefined}
    >
      <Modal.Header className="d-flex justify-content-between align-items-center">
        <div className="flex-grow-1">
          <Modal.Title>Editar Colegio</Modal.Title>
          <small className="text-muted">RBD: {colegio.rbd}</small>
        </div>
        <div className="d-flex gap-2">
          <Button 
            variant="light" 
            size="sm" 
            onClick={() => setMinimizado(!minimizado)} 
            className="btn-icon rounded-circle"
            title={minimizado ? "Maximizar" : "Minimizar"}
          >
            {minimizado ? <LuMaximize2 /> : <LuMinus />}
          </Button>
          <Button variant="light" size="sm" onClick={onHide} className="btn-icon rounded-circle">
            <LuX />
          </Button>
        </div>
      </Modal.Header>

      {!minimizado && (
        <>
          <Modal.Body>
            {error && (
              <Alert variant="danger" dismissible onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            <Form onSubmit={handleSubmit}>
              <Row>
                <Col md={8}>
                  <Form.Group className="mb-3">
                    <Form.Label>Nombre del Colegio *</Form.Label>
                    <Form.Control
                      type="text"
                      name="colegio_nombre"
                      value={formData.colegio_nombre}
                      onChange={handleChange}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>RBD *</Form.Label>
                    <Form.Control
                      type="text"
                      name="rbd"
                      value={formData.rbd}
                      onChange={handleChange}
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Comuna</Form.Label>
                    <Form.Control
                      type="text"
                      name="comuna"
                      value={formData.comuna}
                      onChange={handleChange}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Región</Form.Label>
                    <Form.Control
                      type="text"
                      name="region"
                      value={formData.region}
                      onChange={handleChange}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label>Dirección</Form.Label>
                <Form.Control
                  type="text"
                  name="direccion"
                  value={formData.direccion}
                  onChange={handleChange}
                />
              </Form.Group>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Teléfono</Form.Label>
                    <Form.Control
                      type="tel"
                      name="telefono"
                      value={formData.telefono}
                      onChange={handleChange}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Email</Form.Label>
                    <Form.Control
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label>Total Matriculados</Form.Label>
                <Form.Control
                  type="number"
                  name="total_matriculados"
                  value={formData.total_matriculados}
                  onChange={handleChange}
                  min="0"
                />
              </Form.Group>
            </Form>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="secondary" onClick={onHide}>
              Cancelar
            </Button>
            <Button 
              variant="primary" 
              onClick={handleSubmit}
              disabled={guardando}
            >
              <LuSave className="me-2" />
              {guardando ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </Modal.Footer>
        </>
      )}
    </Modal>
  )
}
