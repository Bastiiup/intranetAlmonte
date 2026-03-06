'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, CardBody, CardHeader, Col, Form, Row, Spinner, Alert } from 'react-bootstrap'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface ProfesorOption {
  id: number | string
  nombre: string
  rut: string
}

interface ColegioOption {
  id: number | string
  nombre: string
  rbd: number | null
}

interface CursoOption {
  id: number | string
  nombre: string
  letra: string | null
  anio: number | null
  colegioId: number | string | null
}

export default function CrearAsignacionForm() {
  const router = useRouter()

  const [loading, setLoading] = useState(false)

  const [profesores, setProfesores] = useState<ProfesorOption[]>([])
  const [colegios, setColegios] = useState<ColegioOption[]>([])
  const [cursos, setCursos] = useState<CursoOption[]>([])

  const [loadingData, setLoadingData] = useState(true)
  const [errorData, setErrorData] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    profesorId: '',
    colegioId: '',
    cursoId: '',
    cargo: '',
    anio: new Date().getFullYear().toString(),
    is_current: true,
  })

  useEffect(() => {
    const fetchAll = async () => {
      setLoadingData(true)
      setErrorData(null)
      try {
        const [profRes, colRes, curRes] = await Promise.all([
          fetch('/api/mira/personas?pageSize=200'),
          fetch('/api/mira/colegios?pageSize=500'),
          fetch('/api/mira/cursos?pageSize=500'),
        ])

        const [profJson, colJson, curJson] = await Promise.all([profRes.json(), colRes.json(), curRes.json()])

        if (!profJson.success) throw new Error(profJson.error || 'Error al cargar profesores')
        if (!colJson.success) throw new Error(colJson.error || 'Error al cargar colegios')
        if (!curJson.success) throw new Error(curJson.error || 'Error al cargar cursos')

        const profesoresOpts: ProfesorOption[] = (profJson.data || []).map((p: any) => ({
          id: p.id ?? p.documentId,
          nombre: p.nombre_completo || 'Sin nombre',
          rut: p.rut || '',
        }))

        const colegiosOpts: ColegioOption[] = (colJson.data || []).map((c: any) => ({
          id: c.id ?? c.documentId,
          nombre: c.colegio_nombre || 'Sin nombre',
          rbd: c.rbd ?? null,
        }))

        const cursosOpts: CursoOption[] = (curJson.data || []).map((c: any) => ({
          id: c.id ?? c.documentId,
          nombre: c.nombre_curso || '',
          letra: c.letra ?? null,
          anio: c.anio ?? null,
          colegioId: c.colegio?.id ?? null,
        }))

        setProfesores(profesoresOpts)
        setColegios(colegiosOpts)
        setCursos(cursosOpts)
      } catch (err: unknown) {
        setErrorData(err instanceof Error ? err.message : 'Error al cargar datos')
      } finally {
        setLoadingData(false)
      }
    }

    fetchAll()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleIsCurrentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { checked } = e.target
    setFormData((prev) => ({ ...prev, is_current: checked }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.profesorId) {
      toast.error('Debes seleccionar un profesor')
      return
    }
    if (!formData.colegioId) {
      toast.error('Debes seleccionar un colegio')
      return
    }
    if (!formData.cursoId) {
      toast.error('Debes seleccionar un curso')
      return
    }
    if (!formData.cargo.trim()) {
      toast.error('El cargo es obligatorio')
      return
    }

    const anioNum = parseInt(formData.anio, 10)
    if (isNaN(anioNum) || anioNum < 2000 || anioNum > 2100) {
      toast.error('El año debe ser un número válido')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/mira/trayectorias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona: Number(formData.profesorId),
          colegio: Number(formData.colegioId),
          curso: Number(formData.cursoId),
          cargo: formData.cargo.trim(),
          anio: anioNum,
          is_current: formData.is_current,
        }),
      })

      const result = await res.json()

      if (!result.success) {
        throw new Error(result.error ?? 'Error al crear asignación')
      }

      toast.success('Asignación creada correctamente')
      router.push('/mira/asignaciones')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar asignación'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const cursosFiltrados = formData.colegioId
    ? cursos.filter((c) => String(c.colegioId ?? '') === formData.colegioId)
    : cursos

  return (
    <Card>
      <CardHeader>
        <h5 className="card-title mb-0">Nueva Asignación de Docente</h5>
      </CardHeader>
      <CardBody>
        {errorData && (
          <Alert variant="danger" className="mb-3">
            {errorData}
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          <Row className="g-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label>
                  Profesor <span className="text-danger">*</span>
                </Form.Label>
                <Form.Select
                  name="profesorId"
                  value={formData.profesorId}
                  onChange={handleChange}
                  disabled={loadingData}
                  required
                >
                  <option value="">{loadingData ? 'Cargando profesores...' : 'Seleccionar profesor...'}</option>
                  {profesores.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                      {p.rut ? ` · ${p.rut}` : ''}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group>
                <Form.Label>
                  Colegio <span className="text-danger">*</span>
                </Form.Label>
                <Form.Select
                  name="colegioId"
                  value={formData.colegioId}
                  onChange={handleChange}
                  disabled={loadingData}
                  required
                >
                  <option value="">{loadingData ? 'Cargando colegios...' : 'Seleccionar colegio...'}</option>
                  {colegios.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                      {c.rbd ? ` (RBD ${c.rbd})` : ''}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group>
                <Form.Label>
                  Curso <span className="text-danger">*</span>
                </Form.Label>
                <Form.Select
                  name="cursoId"
                  value={formData.cursoId}
                  onChange={handleChange}
                  disabled={loadingData || !formData.colegioId}
                  required
                >
                  <option value="">
                    {loadingData
                      ? 'Cargando cursos...'
                      : !formData.colegioId
                        ? 'Selecciona primero un colegio'
                        : cursosFiltrados.length === 0
                          ? 'No hay cursos para este colegio'
                          : 'Seleccionar curso...'}
                  </option>
                  {cursosFiltrados.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                      {c.letra ? ` ${c.letra}` : ''}
                      {c.anio ? ` (${c.anio})` : ''}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={3}>
              <Form.Group>
                <Form.Label>Cargo</Form.Label>
                <Form.Control
                  type="text"
                  name="cargo"
                  value={formData.cargo}
                  onChange={handleChange}
                  placeholder="Ej: Profesor Titular"
                />
              </Form.Group>
            </Col>

            <Col md={3}>
              <Form.Group>
                <Form.Label>Año</Form.Label>
                <Form.Control
                  type="number"
                  name="anio"
                  value={formData.anio}
                  onChange={handleChange}
                  min={2000}
                  max={2100}
                />
              </Form.Group>
            </Col>

            <Col md={4} className="d-flex align-items-center">
              <Form.Group className="mt-3 mt-md-4">
                <Form.Check
                  type="switch"
                  id="is_current"
                  label="Es asignación actual"
                  checked={formData.is_current}
                  onChange={handleIsCurrentChange}
                />
              </Form.Group>
            </Col>
          </Row>

          <div className="d-flex gap-2 mt-4">
            <Link href="/mira/asignaciones">
              <Button variant="outline-secondary" disabled={loading}>
                Cancelar
              </Button>
            </Link>
            <Button type="submit" variant="primary" disabled={loading || loadingData}>
              {loading ? (
                <>
                  <Spinner as="span" animation="border" size="sm" className="me-2" />
                  Guardando...
                </>
              ) : (
                'Guardar Asignación'
              )}
            </Button>
          </div>
        </Form>
      </CardBody>
    </Card>
  )
}

