'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, CardBody, CardHeader, Col, Form, Row, Spinner, Alert } from 'react-bootstrap'
import Link from 'next/link'
import toast from 'react-hot-toast'
import SearchableSelect, { SearchableOption } from '@/components/form/SearchableSelect'

interface LibroBaseOption {
  id: number | string
  nombre: string
  isbn: string | null
}

interface AsignaturaOption {
  id: number | string
  nombre: string
}

export default function CrearLibroMiraForm() {
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [errorLibros, setErrorLibros] = useState<string | null>(null)
  const [errorAsignaturas, setErrorAsignaturas] = useState<string | null>(null)

  const [librosBase, setLibrosBase] = useState<LibroBaseOption[]>([])
  const [librosPage, setLibrosPage] = useState(1)
  const [librosHasMore, setLibrosHasMore] = useState(true)
  const [librosSearch, setLibrosSearch] = useState('')
  const [loadingLibros, setLoadingLibros] = useState(false)

  const [asignaturas, setAsignaturas] = useState<AsignaturaOption[]>([])
  const [loadingAsignaturas, setLoadingAsignaturas] = useState(false)

  const [formData, setFormData] = useState({
    libroId: '',
    asignaturaId: '',
    url_qr_redireccion: '',
    google_drive_folder_id: '',
    tiene_omr: true,
    activo: true,
  })

  const loadLibrosBase = async (page: number, search: string, append: boolean) => {
    setLoadingLibros(true)
    setErrorLibros(null)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      if (search.trim()) {
        params.set('search', search.trim())
      }
      const res = await fetch(`/api/mira/libros-base?${params.toString()}`)
      const result = await res.json()

      if (result.success && Array.isArray(result.data)) {
        const mapped = result.data.map((l: any) => ({
          id: l.id ?? l.documentId,
          nombre: l.nombre_libro ?? 'Sin título',
          isbn: l.isbn_libro ?? null,
        })) as LibroBaseOption[]

        setLibrosBase((prev) => {
          const base = append ? prev : []
          const existingIds = new Set(base.map((x) => String(x.id)))
          const merged = [...base, ...mapped.filter((x) => !existingIds.has(String(x.id)))]
          return merged
        })

        const meta = result.meta?.pagination
        if (meta && meta.page != null && meta.pageCount != null) {
          setLibrosHasMore(meta.page < meta.pageCount)
          setLibrosPage(meta.page)
        } else {
          // Fallback: si vienen exactamente 50, asumimos que puede haber más
          setLibrosHasMore(mapped.length === 50)
          setLibrosPage(page)
        }
      } else {
        setErrorLibros(result.error ?? 'Error al obtener libros base')
        setLibrosHasMore(false)
      }
    } catch (err: unknown) {
      setErrorLibros(
        err instanceof Error ? err.message : 'Error de conexión al cargar libros base',
      )
      setLibrosHasMore(false)
    } finally {
      setLoadingLibros(false)
    }
  }

  const loadAsignaturas = async () => {
    setLoadingAsignaturas(true)
    setErrorAsignaturas(null)
    try {
      const res = await fetch('/api/mira/asignaturas')
      const result = await res.json()
      if (result.success && Array.isArray(result.data)) {
        const mapped = result.data.map((a: any) => ({
          id: a.id ?? a.documentId,
          nombre: a.nombre ?? 'Sin nombre',
        })) as AsignaturaOption[]
        setAsignaturas(mapped)
      } else {
        setErrorAsignaturas(result.error ?? 'Error al obtener asignaturas')
      }
    } catch (err: unknown) {
      setErrorAsignaturas(
        err instanceof Error ? err.message : 'Error de conexión al cargar asignaturas',
      )
    } finally {
      setLoadingAsignaturas(false)
    }
  }

  useEffect(() => {
    loadLibrosBase(1, '', false)
    loadAsignaturas()
  }, [])

  const libroOptions: SearchableOption[] = librosBase.map((l) => ({
    value: l.id,
    label: `${l.nombre}${l.isbn ? ` (ISBN ${l.isbn})` : ''}`,
  }))

  const asignaturaOptions: SearchableOption[] = asignaturas.map((a) => ({
    value: a.id,
    label: a.nombre,
  }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.libroId) {
      toast.error('Debes seleccionar un libro base')
      return
    }
    if (!formData.asignaturaId) {
      toast.error('Debes seleccionar una asignatura')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/mira/libros-mira', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          libro: Number(formData.libroId),
          asignatura: Number(formData.asignaturaId),
          url_qr_redireccion:
            formData.url_qr_redireccion.trim() || undefined,
          google_drive_folder_id:
            formData.google_drive_folder_id.trim() || undefined,
          tiene_omr: formData.tiene_omr,
          activo: formData.activo,
        }),
      })

      const result = await res.json()

      if (!result.success) {
        throw new Error(result.error ?? 'Error al crear libro MIRA')
      }

      toast.success('Libro MIRA asignado correctamente')
      router.push('/mira/libros-mira')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar libro MIRA'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <h5 className="card-title mb-0">Asignar Libro a MIRA</h5>
      </CardHeader>
      <CardBody>
        {errorLibros && (
          <Alert variant="danger">
            <div className="d-flex justify-content-between align-items-center">
              <span>{errorLibros}</span>
            </div>
          </Alert>
        )}
        {errorAsignaturas && (
          <Alert variant="danger">
            <div className="d-flex justify-content-between align-items-center">
              <span>{errorAsignaturas}</span>
            </div>
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          <Row className="g-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label>
                  Libro base <span className="text-danger">*</span>
                </Form.Label>
                <SearchableSelect
                  options={libroOptions}
                  value={formData.libroId}
                  onChange={(val) => setFormData((prev) => ({ ...prev, libroId: val }))}
                  placeholder={
                    loadingLibros ? 'Cargando libros...' : 'Buscar o seleccionar libro...'
                  }
                  isDisabled={loadingLibros && librosBase.length === 0}
                  isLoading={loadingLibros}
                  onInputChange={(input) => {
                    setLibrosSearch(input)
                    loadLibrosBase(1, input, false)
                  }}
                  onMenuScrollToBottom={() => {
                    if (!loadingLibros && librosHasMore) {
                      loadLibrosBase(librosPage + 1, librosSearch, true)
                    }
                  }}
                />
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group>
                <Form.Label>
                  Asignatura <span className="text-danger">*</span>
                </Form.Label>
                <SearchableSelect
                  options={asignaturaOptions}
                  value={formData.asignaturaId}
                  onChange={(val) =>
                    setFormData((prev) => ({ ...prev, asignaturaId: val }))
                  }
                  placeholder={
                    loadingAsignaturas
                      ? 'Cargando asignaturas...'
                      : 'Seleccionar asignatura...'
                  }
                  isDisabled={loadingAsignaturas && asignaturas.length === 0}
                  isLoading={loadingAsignaturas}
                />
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group>
                <Form.Label>URL QR Redirección</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.url_qr_redireccion}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      url_qr_redireccion: e.target.value,
                    }))
                  }
                  placeholder="Ej: /qr?libro=ISBN..."
                />
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group>
                <Form.Label>ID Carpeta Google Drive</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.google_drive_folder_id}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      google_drive_folder_id: e.target.value,
                    }))
                  }
                  placeholder="ID de la carpeta con recursos"
                />
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Check
                type="switch"
                id="tiene-omr-switch"
                label="Tiene OMR (hojas escaneables)"
                checked={formData.tiene_omr}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, tiene_omr: e.target.checked }))
                }
              />
            </Col>

            <Col md={6}>
              <Form.Check
                type="switch"
                id="activo-switch"
                label="Activo en MIRA.APP"
                checked={formData.activo}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, activo: e.target.checked }))
                }
              />
            </Col>
          </Row>

          <div className="d-flex gap-2 mt-4">
            <Link href="/mira/libros-mira">
              <Button variant="outline-secondary" disabled={loading}>
                Cancelar
              </Button>
            </Link>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? (
                <>
                  <Spinner as="span" animation="border" size="sm" className="me-2" />
                  Guardando...
                </>
              ) : (
                'Guardar Libro MIRA'
              )}
            </Button>
          </div>
        </Form>
      </CardBody>
    </Card>
  )
}

