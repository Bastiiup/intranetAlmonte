'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Alert, Button, Card, CardBody, CardHeader, Col, Form, Row, Badge } from 'react-bootstrap'
import toast from 'react-hot-toast'

const DEPENDENCIAS = [
  'Corporación de Administración Delegada',
  'Municipal',
  'Particular Subvencionado',
  'Particular Pagado',
  'Servicio Local de Educación',
] as const

const RURALIDAD = ['Urbano', 'Rural'] as const

interface ColegioDetailsProps {
  colegio: any
  colegioId: string
}

const ColegioDetails = ({ colegio, colegioId }: ColegioDetailsProps) => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const initialRbd = colegio.rbd ?? ''
  const initialDv = colegio.rbd_digito_verificador ?? ''

  const [formData, setFormData] = useState({
    rbd: initialRbd ? String(initialRbd) : '',
    rbd_digito_verificador: initialDv ? String(initialDv) : '',
    colegio_nombre: colegio.colegio_nombre ?? '',
    dependencia: colegio.dependencia ?? '',
    ruralidad: colegio.ruralidad ?? '',
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    if (name === 'rbd_digito_verificador' && value.length > 1) return
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.rbd?.trim() || !formData.colegio_nombre?.trim()) {
      toast.error('RBD y Nombre del Colegio son obligatorios')
      return
    }

    const rbdNum = parseInt(formData.rbd, 10)
    if (isNaN(rbdNum) || rbdNum < 0) {
      toast.error('RBD debe ser un número válido')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/mira/colegios/${encodeURIComponent(colegio.id ?? colegioId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rbd: rbdNum,
          rbd_digito_verificador: formData.rbd_digito_verificador || undefined,
          colegio_nombre: formData.colegio_nombre.trim(),
          dependencia: formData.dependencia || undefined,
          ruralidad: formData.ruralidad || undefined,
        }),
      })

      const result = await res.json().catch(() => ({}))

      if (!res.ok || !result.success) {
        const message =
          result?.error ||
          `Error al actualizar establecimiento (${res.status} ${res.statusText})`
        throw new Error(message)
      }

      toast.success('Establecimiento actualizado correctamente')
      router.refresh()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar cambios'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const estado = colegio.estado ?? colegio.estado_nombre ?? null

  return (
    <Card>
      <CardHeader>
        <h5 className="card-title mb-0">Editar Establecimiento</h5>
      </CardHeader>
      <CardBody>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          <Row className="g-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label>
                  RBD <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="number"
                  name="rbd"
                  value={formData.rbd}
                  onChange={handleChange}
                  required
                  min={0}
                />
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group>
                <Form.Label>Dígito verificador</Form.Label>
                <Form.Control
                  type="text"
                  name="rbd_digito_verificador"
                  value={formData.rbd_digito_verificador}
                  onChange={handleChange}
                  maxLength={1}
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Estado</Form.Label>
                <div>
                  {estado ? (
                    <Badge bg="info">{estado}</Badge>
                  ) : (
                    <span className="text-muted">Sin estado</span>
                  )}
                </div>
              </Form.Group>
            </Col>
            <Col md={12}>
              <Form.Group>
                <Form.Label>
                  Nombre del Colegio <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  name="colegio_nombre"
                  value={formData.colegio_nombre}
                  onChange={handleChange}
                  required
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Dependencia</Form.Label>
                <Form.Select
                  name="dependencia"
                  value={formData.dependencia}
                  onChange={handleChange}
                >
                  <option value="">Seleccionar...</option>
                  {DEPENDENCIAS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Ruralidad</Form.Label>
                <Form.Select
                  name="ruralidad"
                  value={formData.ruralidad}
                  onChange={handleChange}
                >
                  <option value="">Seleccionar...</option>
                  {RURALIDAD.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <div className="d-flex gap-2 mt-4">
            <Button
              type="button"
              variant="outline-secondary"
              disabled={loading}
              onClick={() => router.push('/mira/colegios')}
            >
              Volver al listado
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </Form>
      </CardBody>
    </Card>
  )
}

export default ColegioDetails

