'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Alert, Button, Card, CardBody, CardHeader, Col, Form, Row, Spinner } from 'react-bootstrap'
import toast from 'react-hot-toast'
import SearchableSelect, { SearchableOption } from '@/components/form/SearchableSelect'

interface CursoDetailsProps {
  curso: any
  cursoId: string
}

interface ColegioOption {
  id: number | string
  nombre: string
  rbd: number | null
}

const NIVELES = ['Basica', 'Media'] as const

const CursoDetails = ({ curso, cursoId }: CursoDetailsProps) => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [colegios, setColegios] = useState<ColegioOption[]>([])
  const [loadingColegios, setLoadingColegios] = useState(false)
  const [errorColegios, setErrorColegios] = useState<string | null>(null)
  const [colegiosPage, setColegiosPage] = useState(1)
  const [colegiosHasMore, setColegiosHasMore] = useState(true)
  const [colegiosSearch, setColegiosSearch] = useState('')

  const initialColegio = curso.colegio ?? null

  const [formData, setFormData] = useState({
    colegioId: initialColegio?.id ? String(initialColegio.id) : '',
    nombre_curso: curso.nombre_curso ?? '',
    nivel: curso.nivel ?? '',
    grado: curso.grado != null ? String(curso.grado) : '',
    letra: curso.letra ?? '',
    anio: curso.anio != null ? String(curso.anio) : new Date().getFullYear().toString(),
  })

  const loadColegios = async (page: number, search: string, append: boolean) => {
    setLoadingColegios(true)
    setErrorColegios(null)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '50',
      })
      if (search.trim()) {
        params.set('search', search.trim())
      }
      const res = await fetch(`/api/mira/colegios?${params.toString()}`)
      const result = await res.json()

      if (result.success && Array.isArray(result.data)) {
        const mapped = result.data.map((c: any) => ({
          id: c.id ?? c.documentId,
          nombre: c.colegio_nombre ?? '',
          rbd: c.rbd ?? null,
        })) as ColegioOption[]

        setColegios((prev) => {
          const base = append ? prev : []
          const existingIds = new Set(base.map((x) => String(x.id)))
          const merged = [
            ...base,
            ...mapped.filter((x) => !existingIds.has(String(x.id))),
          ]
          return merged
        })

        const pagination = result.meta?.pagination
        const hasMore =
          pagination?.page != null &&
          pagination?.pageCount != null &&
          pagination.page < pagination.pageCount
        setColegiosHasMore(Boolean(hasMore))
        setColegiosPage(page)
      } else {
        setErrorColegios(result.error ?? 'Error al obtener colegios')
        setColegiosHasMore(false)
      }
    } catch (err: unknown) {
      setErrorColegios(
        err instanceof Error ? err.message : 'Error de conexión al cargar colegios'
      )
      setColegiosHasMore(false)
    } finally {
      setLoadingColegios(false)
    }
  }

  useEffect(() => {
    // Cargar primera página al montar
    loadColegios(1, '', false)
  }, [])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const colegioOptions: SearchableOption[] = colegios.map((c) => ({
    value: c.id,
    label: `${c.nombre}${c.rbd ? ` (RBD ${c.rbd})` : ''}`,
  }))

  const nivelOptions: SearchableOption[] = NIVELES.map((n) => ({
    value: n,
    label: n === 'Basica' ? 'Básica' : 'Media',
  }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.colegioId) {
      toast.error('Debes seleccionar un colegio')
      return
    }

    if (!formData.nombre_curso.trim()) {
      toast.error('El nombre del curso es obligatorio')
      return
    }

    const anioNum = parseInt(formData.anio, 10)
    if (isNaN(anioNum) || anioNum < 2000 || anioNum > 2100) {
      toast.error('El año debe ser un número válido')
      return
    }

    const gradoNum = formData.grado ? parseInt(formData.grado, 10) : undefined
    if (formData.grado && (isNaN(gradoNum as number) || (gradoNum as number) <= 0)) {
      toast.error('El grado debe ser un número positivo')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/mira/cursos/${encodeURIComponent(curso.id ?? cursoId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          colegio: formData.colegioId ? Number(formData.colegioId) : undefined,
          nombre_curso: formData.nombre_curso.trim(),
          nivel: formData.nivel || undefined,
          grado: gradoNum,
          letra: formData.letra || undefined,
          anio: anioNum,
        }),
      })

      const result = await res.json().catch(() => ({}))

      if (!res.ok || !result.success) {
        const message =
          result?.error || `Error al actualizar curso (${res.status} ${res.statusText})`
        throw new Error(message)
      }

      toast.success('Curso actualizado correctamente')
      router.refresh()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar cambios'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <h5 className="card-title mb-0">Editar Curso</h5>
      </CardHeader>
      <CardBody>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {errorColegios && (
          <Alert variant="warning" dismissible onClose={() => setErrorColegios(null)}>
            {errorColegios}
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          <Row className="g-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label>
                  Colegio <span className="text-danger">*</span>
                </Form.Label>
                <SearchableSelect
                  options={colegioOptions}
                  value={formData.colegioId}
                  onChange={(val) => setFormData((prev) => ({ ...prev, colegioId: val }))}
                  placeholder={
                    loadingColegios ? 'Cargando colegios...' : 'Seleccionar colegio...'
                  }
                  isDisabled={loadingColegios && colegios.length === 0}
                  isLoading={loadingColegios}
                  onInputChange={(input) => {
                    setColegiosSearch(input)
                    loadColegios(1, input, false)
                  }}
                  onMenuScrollToBottom={() => {
                    if (!loadingColegios && colegiosHasMore) {
                      loadColegios(colegiosPage + 1, colegiosSearch, true)
                    }
                  }}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>
                  Año <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="number"
                  name="anio"
                  value={formData.anio}
                  onChange={handleChange}
                  min={2000}
                  max={2100}
                  required
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Nivel</Form.Label>
                <SearchableSelect
                  options={nivelOptions}
                  value={formData.nivel}
                  onChange={(val) => setFormData((prev) => ({ ...prev, nivel: val }))}
                  placeholder="Seleccionar nivel..."
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>
                  Nombre del Curso <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  name="nombre_curso"
                  value={formData.nombre_curso}
                  onChange={handleChange}
                  required
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Grado</Form.Label>
                <Form.Control
                  type="text"
                  name="grado"
                  value={formData.grado}
                  onChange={handleChange}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Letra</Form.Label>
                <Form.Control
                  type="text"
                  name="letra"
                  value={formData.letra}
                  onChange={handleChange}
                  maxLength={2}
                />
              </Form.Group>
            </Col>
          </Row>

          <div className="d-flex gap-2 mt-4">
            <Button
              type="button"
              variant="outline-secondary"
              disabled={loading}
              onClick={() => router.push('/mira/cursos')}
            >
              Volver al listado
            </Button>
            <Button type="submit" variant="primary" disabled={loading || loadingColegios}>
              {loading ? (
                <>
                  <Spinner as="span" animation="border" size="sm" className="me-2" />
                  Guardando...
                </>
              ) : (
                'Guardar Cambios'
              )}
            </Button>
          </div>
        </Form>
      </CardBody>
    </Card>
  )
}

export default CursoDetails

