'use client'

import { useState, useEffect } from 'react'
import { Button, Card, Form, Spinner, Alert, Table } from 'react-bootstrap'

type PersonaMira = {
  id: number
  documentId?: string
  email?: string
  persona?: { nombre?: string; apellido_paterno?: string; rut?: string }
}

type LibroMira = {
  id: number
  documentId?: string
  libro?: { nombre_libro?: string; isbn_libro?: string }
}

type ColegioOption = {
  id: number | string
  nombre: string
}

type CursoOption = {
  id: number | string
  nombre: string
  colegioId?: number | string | null
}

type TipoEvaluacionUI = 'libro' | 'colegio'

type OmrRecord = {
  id: number
  rut?: string | null
  codigo_evaluacion?: string | null
  estado?: string
  resultados?: { respuestas?: Record<string, string>; rut?: string; codigo?: string }
  createdAt?: string
  estudiante?: { data?: { id: number; attributes?: { email?: string } } }
}

export default function EvaluacionesOmrClient() {
  const [personas, setPersonas] = useState<PersonaMira[]>([])
  const [librosMira, setLibrosMira] = useState<LibroMira[]>([])
  const [estudianteId, setEstudianteId] = useState<string>('')
  const [libroMiraId, setLibroMiraId] = useState<string>('')
  const [tipoEvaluacion, setTipoEvaluacion] = useState<TipoEvaluacionUI>('libro')
  const [colegios, setColegios] = useState<ColegioOption[]>([])
  const [cursos, setCursos] = useState<CursoOption[]>([])
  const [colegioId, setColegioId] = useState<string>('')
  const [cursoId, setCursoId] = useState<string>('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingPersonas, setLoadingPersonas] = useState(true)
  const [loadingLibros, setLoadingLibros] = useState(true)
  const [loadingColegios, setLoadingColegios] = useState(true)
  const [loadingCursos, setLoadingCursos] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<OmrRecord | null>(null)
  const [listado, setListado] = useState<OmrRecord[]>([])

  useEffect(() => {
    fetch('/api/mira/personas-mira')
      .then((r) => r.json())
      .then((data) => {
        if (data.data && Array.isArray(data.data)) {
          setPersonas(
            data.data.map((d: { id: number; documentId?: string; attributes?: any }) => ({
              id: d.id,
              documentId: d.documentId,
              email: d.attributes?.email,
              persona: d.attributes?.persona?.data?.attributes,
            }))
          )
        }
      })
      .catch(() => setError('Error al cargar estudiantes'))
      .finally(() => setLoadingPersonas(false))
  }, [])

  useEffect(() => {
    fetch('/api/mira/libros-mira')
      .then((r) => r.json())
      .then((data) => {
        if (data.data && Array.isArray(data.data)) {
          setLibrosMira(
            data.data.map((d: any) => {
              const att = d.attributes || d
              const libro = att.libro?.data?.attributes || att.libro?.attributes || att.libro
              return {
                id: d.id,
                documentId: d.documentId,
                libro: libro ? { nombre_libro: libro.nombre_libro, isbn_libro: libro.isbn_libro } : undefined,
              }
            })
          )
        }
      })
      .catch(() => {})
      .finally(() => setLoadingLibros(false))
  }, [])

  useEffect(() => {
    fetch('/api/mira/colegios?pageSize=500')
      .then((r) => r.json())
      .then((data) => {
        const arr = Array.isArray(data?.data) ? data.data : []
        const mapped: ColegioOption[] = arr.map((c: any) => ({
          id: c.id ?? c.documentId ?? c.rbd ?? String(c.id ?? ''),
          nombre:
            c.colegio_nombre ??
            c.nombre ??
            c.attributes?.colegio_nombre ??
            c.attributes?.nombre ??
            `Colegio #${c.id}`,
        }))
        setColegios(mapped)
      })
      .catch(() => {})
      .finally(() => setLoadingColegios(false))
  }, [])

  useEffect(() => {
    fetch('/api/mira/cursos?pageSize=500')
      .then((r) => r.json())
      .then((data) => {
        const arr = Array.isArray(data?.data) ? data.data : []
        const mapped: CursoOption[] = arr.map((item: any) => {
          const nombreBase =
            item.nombre_curso ?? item.nombre ?? item.attributes?.nombre_curso ?? `Curso ${item.id}`
          const letra = item.letra ?? item.paralelo ?? item.attributes?.letra ?? null
          const anio = item.anio ?? item.attributes?.anio ?? null
          const labelParts: string[] = []
          if (nombreBase) labelParts.push(String(nombreBase))
          if (letra) labelParts.push(String(letra))
          if (anio) labelParts.push(String(anio))
          const colegioIdValue =
            item.colegio?.id ??
            item.colegioId ??
            item.colegio?.documentId ??
            item.attributes?.colegio?.data?.id ??
            item.attributes?.colegio?.data?.documentId ??
            null
          return {
            id: item.id ?? item.documentId ?? String(item.id ?? ''),
            nombre: labelParts.join(' ') || `Curso ${item.id}`,
            colegioId: colegioIdValue,
          }
        })
        setCursos(mapped)
      })
      .catch(() => {})
      .finally(() => setLoadingCursos(false))
  }, [])

  useEffect(() => {
    fetch('/api/mira/omr-evaluaciones?pageSize=15')
      .then((r) => r.json())
      .then((data) => {
        if (data.data && Array.isArray(data.data)) {
          setListado(
            data.data.map((d: any) => {
              const att = d.attributes || d
              return {
                id: d.id,
                rut: att.rut,
                codigo_evaluacion: att.codigo_evaluacion,
                estado: att.estado,
                resultados: att.resultados,
                createdAt: att.createdAt,
                estudiante: att.estudiante,
              }
            })
          )
        }
      })
      .catch(() => {})
  }, [lastResult])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!estudianteId || !file) {
      setError('Selecciona estudiante y sube la imagen de la hoja.')
      return
    }
    if (tipoEvaluacion === 'colegio') {
      if (!colegioId || !cursoId) {
        setError('Para una Prueba de Colegio debes seleccionar Colegio y Curso.')
        return
      }
    }
    setLoading(true)
    try {
      const payload: {
        estudiante: number
        libro_mira?: number | string
        colegio?: number | string
        curso?: number | string
      } = { estudiante: Number(estudianteId) }

      if (tipoEvaluacion === 'libro') {
        if (libroMiraId) {
          const num = Number(libroMiraId)
          payload.libro_mira = Number.isNaN(num) ? libroMiraId : num
        }
      } else if (tipoEvaluacion === 'colegio') {
        const numColegio = Number(colegioId)
        const numCurso = Number(cursoId)
        payload.colegio = Number.isNaN(numColegio) ? colegioId : numColegio
        payload.curso = Number.isNaN(numCurso) ? cursoId : numCurso
      }
      const formData = new FormData()
      formData.append('data', JSON.stringify(payload))
      formData.append('imagen_hoja', file)
      const res = await fetch('/api/mira/omr-evaluaciones', {
        method: 'POST',
        body: formData,
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error?.message || json.error || res.statusText)
      }
      const created = json.data
      const att = created?.attributes || created
      setLastResult({
        id: created?.id,
        rut: att?.rut,
        codigo_evaluacion: att?.codigo_evaluacion,
        estado: att?.estado,
        resultados: att?.resultados,
        createdAt: att?.createdAt,
      })
      setFile(null)
      ;(e.target as HTMLFormElement).reset()
    } catch (err: any) {
      setError(err.message || 'Error al procesar la hoja')
    } finally {
      setLoading(false)
    }
  }

  const labelPersona = (p: PersonaMira) => {
    const nom = p.persona?.nombre || ''
    const ap = p.persona?.apellido_paterno || ''
    const rut = p.persona?.rut || ''
    const email = p.email || ''
    return [nom, ap].filter(Boolean).join(' ') || email || `ID ${p.id}`
  }

  return (
    <>
      <Card className="mb-4">
        <Card.Header>Subir hoja de respuestas OMR</Card.Header>
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Estudiante</Form.Label>
              <Form.Select
                value={estudianteId}
                onChange={(e) => setEstudianteId(e.target.value)}
                disabled={loadingPersonas}
              >
                <option value="">Selecciona un estudiante</option>
                {personas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {labelPersona(p)} {p.email ? `(${p.email})` : ''}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>¿A qué corresponde esta evaluación?</Form.Label>
              <div>
                <Form.Check
                  inline
                  type="radio"
                  id="tipo-evaluacion-libro"
                  name="tipo-evaluacion"
                  label="Libro MIRA (Global)"
                  value="libro"
                  checked={tipoEvaluacion === 'libro'}
                  onChange={() => setTipoEvaluacion('libro')}
                />
                <Form.Check
                  inline
                  type="radio"
                  id="tipo-evaluacion-colegio"
                  name="tipo-evaluacion"
                  label="Prueba de Colegio (Institucional)"
                  value="colegio"
                  checked={tipoEvaluacion === 'colegio'}
                  onChange={() => setTipoEvaluacion('colegio')}
                />
              </div>
            </Form.Group>

            {tipoEvaluacion === 'libro' && (
              <Form.Group className="mb-3">
                <Form.Label>Libro MIRA (opcional)</Form.Label>
                <Form.Select
                  value={libroMiraId}
                  onChange={(e) => setLibroMiraId(e.target.value)}
                  disabled={loadingLibros}
                >
                  <option value="">
                    {loadingLibros ? 'Cargando libros...' : 'Sin libro'}
                  </option>
                  {librosMira.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.libro?.nombre_libro || `Libro #${l.id}`}
                      {l.libro?.isbn_libro ? ` (${l.libro.isbn_libro})` : ''}
                    </option>
                  ))}
                </Form.Select>
                <Form.Text className="text-muted">
                  El libro desde el que escaneas; así la evaluación queda vinculada y aparece en Mis
                  evaluaciones.
                </Form.Text>
              </Form.Group>
            )}

            {tipoEvaluacion === 'colegio' && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>Colegio</Form.Label>
                  <Form.Select
                    value={colegioId}
                    onChange={(e) => {
                      setColegioId(e.target.value)
                      setCursoId('')
                    }}
                    disabled={loadingColegios}
                  >
                    <option value="">
                      {loadingColegios ? 'Cargando colegios...' : 'Selecciona un colegio'}
                    </option>
                    {colegios.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Curso</Form.Label>
                  <Form.Select
                    value={cursoId}
                    onChange={(e) => setCursoId(e.target.value)}
                    disabled={loadingCursos || !colegioId}
                  >
                    <option value="">
                      {loadingCursos
                        ? 'Cargando cursos...'
                        : colegioId
                        ? 'Selecciona un curso'
                        : 'Selecciona primero un colegio'}
                    </option>
                    {cursos
                      .filter(
                        (c) =>
                          !colegioId ||
                          (c.colegioId != null && String(c.colegioId) === String(colegioId)),
                      )
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                  </Form.Select>
                </Form.Group>
              </>
            )}
            <Form.Group className="mb-3">
              <Form.Label>Imagen de la hoja (JPG/PNG)</Form.Label>
              <Form.Control
                type="file"
                accept="image/jpeg,image/png,image/jpg"
                onChange={(e) => setFile((e.target as HTMLInputElement).files?.[0] || null)}
              />
            </Form.Group>
            {error && <Alert variant="danger">{error}</Alert>}
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Procesando...
                </>
              ) : (
                'Subir y procesar'
              )}
            </Button>
          </Form>
        </Card.Body>
      </Card>

      {lastResult && (
        <Card className="mb-4 border-success">
          <Card.Header>Último resultado</Card.Header>
          <Card.Body>
            <p>
              <strong>RUT:</strong> {lastResult.rut ?? '—'}
            </p>
            <p>
              <strong>Código evaluación:</strong> {lastResult.codigo_evaluacion ?? '—'}
            </p>
            <p>
              <strong>Estado:</strong> {lastResult.estado ?? '—'}
            </p>
            {lastResult.resultados?.respuestas && (
              <small className="text-muted">
                Respuestas 1–80 guardadas en el registro (campo resultados).
              </small>
            )}
          </Card.Body>
        </Card>
      )}

      <Card>
        <Card.Header>Últimas evaluaciones</Card.Header>
        <Card.Body>
          <Table responsive size="sm">
            <thead>
              <tr>
                <th>ID</th>
                <th>RUT</th>
                <th>Código</th>
                <th>Estado</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {listado.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>{r.rut ?? '—'}</td>
                  <td>{r.codigo_evaluacion ?? '—'}</td>
                  <td>{r.estado ?? '—'}</td>
                  <td>{r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          {listado.length === 0 && !loadingPersonas && (
            <p className="text-muted mb-0">No hay evaluaciones aún.</p>
          )}
        </Card.Body>
      </Card>
    </>
  )
}
