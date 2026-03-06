'use client'

import { useEffect, useState } from 'react'
import { Alert, Button, Col, Form, Row, Spinner } from 'react-bootstrap'
import toast from 'react-hot-toast'
import SearchableSelect, { SearchableOption } from '@/components/form/SearchableSelect'

interface LibroMiraDetalle {
  id: string | number
  documentId: string
  libro: {
    id: string | number | null
    documentId: string
    nombre_libro: string
    isbn_libro: string | null
  } | null
  asignatura: {
    id: string | number | null
    documentId: string
    nombre: string | null
  } | null
  url_qr_redireccion: string | null
  google_drive_folder_id: string | null
  tiene_omr: boolean
  activo: boolean
}

interface LibroBaseOption {
  id: number | string
  nombre: string
  isbn: string | null
}

interface AsignaturaOption {
  id: number | string
  nombre: string
}

interface Props {
  initialData: LibroMiraDetalle
  libroMiraId: string
}

export default function LibroMiraDetails({ initialData, libroMiraId }: Props) {
  const [formData, setFormData] = useState({
    libroId: initialData.libro?.id ? String(initialData.libro.id) : '',
    asignaturaId: initialData.asignatura?.id ? String(initialData.asignatura.id) : '',
    url_qr_redireccion: initialData.url_qr_redireccion ?? '',
    google_drive_folder_id: initialData.google_drive_folder_id ?? '',
    tiene_omr: initialData.tiene_omr,
    activo: initialData.activo,
  })

  const [saving, setSaving] = useState(false)

  const [librosBase, setLibrosBase] = useState<LibroBaseOption[]>([])
  const [librosSearch, setLibrosSearch] = useState('')
  const [loadingLibros, setLoadingLibros] = useState(false)

  const [asignaturas, setAsignaturas] = useState<AsignaturaOption[]>([])
  const [loadingAsignaturas, setLoadingAsignaturas] = useState(false)

  const [errorLibros, setErrorLibros] = useState<string | null>(null)
  const [errorAsignaturas, setErrorAsignaturas] = useState<string | null>(null)

  const loadLibrosBase = async (search: string) => {
    setLoadingLibros(true)
    setErrorLibros(null)
    try {
      const params = new URLSearchParams()
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
        setLibrosBase(mapped)
      } else {
        setErrorLibros(result.error ?? 'Error al obtener libros base')
      }
    } catch (err: unknown) {
      setErrorLibros(
        err instanceof Error ? err.message : 'Error de conexión al cargar libros base',
      )
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
    loadLibrosBase('')
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

    setSaving(true)
    try {
      const res = await fetch(`/api/mira/libros-mira/${encodeURIComponent(libroMiraId)}`, {
        method: 'PUT',
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
        throw new Error(result.error ?? 'Error al actualizar libro MIRA')
      }

      toast.success('Libro MIRA actualizado correctamente')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar cambios'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Form onSubmit={handleSubmit}>
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

      <Row className="g-3">
        <Col md={6}>
          <Form.Group>
            <Form.Label>
              Libro base <span className="text-danger">*</span>
            </Form.Label>
            <SearchableSelect
              options={libroOptions}
              value={formData.libroId}
              // En edición no permitimos cambiar el libro base
              onChange={() => {}}
              placeholder={
                loadingLibros ? 'Cargando libros...' : 'Libro base asignado'
              }
              isDisabled
              isLoading={loadingLibros && librosBase.length === 0}
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
            id="edit-tiene-omr-switch"
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
            id="edit-activo-switch"
            label="Activo en MIRA.APP"
            checked={formData.activo}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, activo: e.target.checked }))
            }
          />
        </Col>
      </Row>

      <div className="d-flex gap-2 mt-4">
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? (
            <>
              <Spinner as="span" animation="border" size="sm" className="me-2" />
              Guardando cambios...
            </>
          ) : (
            'Guardar cambios'
          )}
        </Button>
      </div>
    </Form>
  )
}

