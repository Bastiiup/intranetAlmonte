'use client'

import { useState } from 'react'
import {
  Modal,
  Button,
  Form,
  Row,
  Col,
  Alert,
  Spinner,
  InputGroup,
} from 'react-bootstrap'
import { LuUserPlus, LuCopy, LuCheck } from 'react-icons/lu'

interface CrearProfesorModalProps {
  show: boolean
  onHide: () => void
  onCreado: () => void
}

interface FormData {
  nombres: string
  primer_apellido: string
  segundo_apellido: string
  rut: string
  email: string
}

const initialFormData: FormData = {
  nombres: '',
  primer_apellido: '',
  segundo_apellido: '',
  rut: '',
  email: '',
}

export default function CrearProfesorModal({ show, onHide, onCreado }: CrearProfesorModalProps) {
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<any>(null)
  const [copiado, setCopiado] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setError(null)
  }

  const formatRut = (rut: string): string => {
    let valor = rut.replace(/[^0-9kK]/g, '')
    if (valor.length > 1) {
      const cuerpo = valor.slice(0, -1)
      const dv = valor.slice(-1).toUpperCase()
      const cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
      valor = `${cuerpoFormateado}-${dv}`
    }
    return valor
  }

  const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatRut(e.target.value)
    setFormData((prev) => ({ ...prev, rut: formatted }))
    setError(null)
  }

  const validar = (): string | null => {
    if (!formData.nombres.trim()) return 'El nombre es obligatorio'
    if (!formData.primer_apellido.trim()) return 'El apellido paterno es obligatorio'
    if (!formData.rut.trim()) return 'El RUT es obligatorio'
    if (!formData.email.trim()) return 'El email es obligatorio'
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email.trim())) return 'El email no tiene un formato válido'
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const errorValidacion = validar()
    if (errorValidacion) {
      setError(errorValidacion)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/mira/profesores/crear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombres: formData.nombres.trim(),
          primer_apellido: formData.primer_apellido.trim(),
          segundo_apellido: formData.segundo_apellido.trim() || undefined,
          rut: formData.rut.trim(),
          email: formData.email.trim(),
        }),
      })

      const data = await res.json()

      if (data.success) {
        setResultado(data)
      } else {
        setError(data.error || 'Error al crear profesor')
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const handleCopiarPassword = () => {
    if (resultado?.data?.password_temporal) {
      navigator.clipboard.writeText(resultado.data.password_temporal)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    }
  }

  const handleCerrar = () => {
    if (resultado) {
      onCreado()
    } else {
      onHide()
    }
    setFormData(initialFormData)
    setResultado(null)
    setError(null)
    setCopiado(false)
  }

  return (
    <Modal show={show} onHide={handleCerrar} centered size="lg" backdrop="static">
      <Modal.Header closeButton className="bg-primary bg-opacity-10">
        <Modal.Title className="d-flex align-items-center gap-2">
          <LuUserPlus size={22} className="text-primary" />
          {resultado ? 'Profesor Creado' : 'Crear Nuevo Profesor'}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {resultado ? (
          <div>
            <Alert variant="success" className="mb-3">
              <Alert.Heading className="fs-6">Profesor creado exitosamente</Alert.Heading>
              <p className="mb-0">Se creó el usuario y el perfil de persona vinculados correctamente.</p>
            </Alert>

            <div className="bg-light rounded p-3 mb-3">
              <h6 className="text-muted mb-3">Datos del profesor</h6>
              <Row className="g-2">
                <Col sm={6}>
                  <small className="text-muted d-block">Nombre</small>
                  <span className="fw-semibold">{resultado.data.persona.nombre_completo}</span>
                </Col>
                <Col sm={6}>
                  <small className="text-muted d-block">RUT</small>
                  <span className="font-monospace">{resultado.data.persona.rut}</span>
                </Col>
                <Col sm={6}>
                  <small className="text-muted d-block">Email / Username</small>
                  <span className="text-primary">{resultado.data.usuario.email}</span>
                </Col>
                <Col sm={6}>
                  <small className="text-muted d-block">Contraseña temporal</small>
                  <InputGroup size="sm">
                    <Form.Control
                      readOnly
                      value={resultado.data.password_temporal}
                      className="font-monospace bg-white"
                    />
                    <Button
                      variant={copiado ? 'success' : 'outline-secondary'}
                      onClick={handleCopiarPassword}
                      title="Copiar contraseña"
                    >
                      {copiado ? <LuCheck size={14} /> : <LuCopy size={14} />}
                    </Button>
                  </InputGroup>
                </Col>
              </Row>
            </div>

            <Alert variant="warning" className="mb-0">
              <small>
                <strong>Importante:</strong> Anota o comparte la contraseña temporal con el profesor.
                Deberá cambiarla en su primer inicio de sesión.
              </small>
            </Alert>
          </div>
        ) : (
          <Form onSubmit={handleSubmit}>
            {error && (
              <Alert variant="danger" dismissible onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            <Row className="g-3">
              <Col md={12}>
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    Nombres <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="nombres"
                    value={formData.nombres}
                    onChange={handleChange}
                    placeholder="Ej: Juan Carlos"
                    required
                    autoFocus
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    Apellido Paterno <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="primer_apellido"
                    value={formData.primer_apellido}
                    onChange={handleChange}
                    placeholder="Ej: González"
                    required
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Apellido Materno</Form.Label>
                  <Form.Control
                    type="text"
                    name="segundo_apellido"
                    value={formData.segundo_apellido}
                    onChange={handleChange}
                    placeholder="Ej: Pérez"
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    RUT <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="rut"
                    value={formData.rut}
                    onChange={handleRutChange}
                    placeholder="12.345.678-9"
                    required
                    maxLength={12}
                  />
                  <Form.Text className="text-muted">
                    Se formatea automáticamente
                  </Form.Text>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    Email <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="profesor@colegio.cl"
                    required
                  />
                  <Form.Text className="text-muted">
                    Se usará como username y para login
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <div className="bg-light rounded p-3 mt-3">
              <small className="text-muted">
                <strong>Nota:</strong> La contraseña temporal se generará automáticamente
                a partir del RUT (formato: MIRA + dígitos del RUT sin verificador).
                El profesor deberá cambiarla en su primer inicio de sesión.
              </small>
            </div>
          </Form>
        )}
      </Modal.Body>

      <Modal.Footer>
        {resultado ? (
          <Button variant="primary" onClick={handleCerrar}>
            Cerrar y Volver al Listado
          </Button>
        ) : (
          <>
            <Button variant="outline-secondary" onClick={handleCerrar} disabled={loading}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={loading}
              className="d-flex align-items-center gap-2"
            >
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" />
                  Creando...
                </>
              ) : (
                <>
                  <LuUserPlus size={16} />
                  Crear Profesor
                </>
              )}
            </Button>
          </>
        )}
      </Modal.Footer>
    </Modal>
  )
}
