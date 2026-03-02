'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, CardBody, CardHeader, Col, Form, Row } from 'react-bootstrap'
import Link from 'next/link'
import toast from 'react-hot-toast'

const DEPENDENCIAS = [
  'Corporación de Administración Delegada',
  'Municipal',
  'Particular Subvencionado',
  'Particular Pagado',
  'Servicio Local de Educación',
] as const

const RURALIDAD = ['Urbano', 'Rural'] as const

export default function CrearColegioForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    rbd: '',
    rbd_digito_verificador: '',
    colegio_nombre: '',
    dependencia: '',
    ruralidad: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    if (name === 'rbd_digito_verificador' && value.length > 1) return
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
      const res = await fetch('/api/mira/colegios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rbd: rbdNum,
          rbd_digito_verificador: formData.rbd_digito_verificador || undefined,
          colegio_nombre: formData.colegio_nombre.trim(),
          dependencia: formData.dependencia || undefined,
          ruralidad: formData.ruralidad || undefined,
        }),
      })

      const result = await res.json()

      if (!result.success) {
        throw new Error(result.error ?? 'Error al crear colegio')
      }

      toast.success('Colegio creado correctamente')
      router.push('/mira/colegios')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <h5 className="card-title mb-0">Nuevo Establecimiento</h5>
      </CardHeader>
      <CardBody>
        <Form onSubmit={handleSubmit}>
          <Row className="g-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label>RBD <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="number"
                  name="rbd"
                  value={formData.rbd}
                  onChange={handleChange}
                  required
                  min={0}
                  placeholder="Ej: 12345"
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
                  placeholder="0-9"
                />
              </Form.Group>
            </Col>
            <Col md={12}>
              <Form.Group>
                <Form.Label>Nombre del Colegio <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="text"
                  name="colegio_nombre"
                  value={formData.colegio_nombre}
                  onChange={handleChange}
                  required
                  placeholder="Ej: Colegio San José"
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
            <Link href="/mira/colegios">
              <Button variant="outline-secondary" disabled={loading}>
                Cancelar
              </Button>
            </Link>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar Colegio'}
            </Button>
          </div>
        </Form>
      </CardBody>
    </Card>
  )
}
