'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Modal,
  Button,
  Form,
  Row,
  Col,
  Alert,
  Spinner,
  Badge,
  Table,
} from 'react-bootstrap'
import { LuBriefcase, LuTrash2, LuPlus, LuSchool } from 'react-icons/lu'
import toast from 'react-hot-toast'
import type { ProfesorType } from './ProfesoresListing'

interface AsignarCargaModalProps {
  show: boolean
  onHide: () => void
  profesor: ProfesorType | null
}

interface ColegioOption {
  id: number
  documentId: string
  nombre: string
  rbd: number | null
}

interface CursoOption {
  id: number
  documentId: string
  nombre: string
  nombre_curso?: string
  nivel?: string
  grado?: string
  letra?: string
  curso_letra_anio?: string
}

interface TrayectoriaItem {
  id: number | string
  documentId?: string
  cargo: string
  anio: number | null
  fecha_inicio: string | null
  is_current: boolean
  notas: string
  colegio: { id: number; documentId: string; nombre: string; rbd: number | null } | null
  curso: { id: number; documentId: string; nombre: string; nivel: string; grado: string; letra: string } | null
  asignatura: { id: number; documentId: string; nombre: string } | null
}

const CARGOS = ['Docente', 'Profesor Jefe', 'Jefe de Departamento', 'Coordinador']

export default function AsignarCargaModal({ show, onHide, profesor }: AsignarCargaModalProps) {
  // Data
  const [trayectorias, setTrayectorias] = useState<TrayectoriaItem[]>([])
  const [colegios, setColegios] = useState<ColegioOption[]>([])
  const [cursos, setCursos] = useState<CursoOption[]>([])
  const [asignaturas, setAsignaturas] = useState<{ id: number; documentId: string; nombre: string }[]>([])

  // Form: múltiples filas de asignación
  type FilaAsignacion = { id: string; colegioId: string; cursoId: string; asignaturaId: string; cargo: string; anio: number }
  const [filas, setFilas] = useState<FilaAsignacion[]>([
    { id: '1', colegioId: '', cursoId: '', asignaturaId: '', cargo: '', anio: new Date().getFullYear() },
  ])
  const [searchColegio, setSearchColegio] = useState('')
  const [cursosByColegio, setCursosByColegio] = useState<Record<string, CursoOption[]>>({})
  const [loadingCursosIds, setLoadingCursosIds] = useState<Set<string>>(new Set())

  // State
  const [loadingTrayectorias, setLoadingTrayectorias] = useState(false)
  const [loadingColegios, setLoadingColegios] = useState(false)
  const [loadingAsignaturas, setLoadingAsignaturas] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const personaDocId = profesor?.documentId || String(profesor?.id || '')

  const fetchTrayectorias = useCallback(async () => {
    if (!personaDocId) return
    setLoadingTrayectorias(true)
    try {
      const res = await fetch(`/api/mira/profesores/asignar?persona_id=${encodeURIComponent(personaDocId)}`)
      const data = await res.json()
      if (data.success) {
        setTrayectorias(data.data || [])
      }
    } catch (err: any) {
      console.error('Error fetching trayectorias:', err)
    } finally {
      setLoadingTrayectorias(false)
    }
  }, [personaDocId])

  const fetchColegios = useCallback(async (search?: string) => {
    setLoadingColegios(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      const res = await fetch(`/api/crm/colegios/list?${params.toString()}`)
      const data = await res.json()
      if (data.success) {
        setColegios(data.data || [])
      }
    } catch (err: any) {
      console.error('Error fetching colegios:', err)
    } finally {
      setLoadingColegios(false)
    }
  }, [])

  const fetchCursosForColegio = useCallback(async (colId: string) => {
    if (!colId) return
    setLoadingCursosIds((prev) => new Set(prev).add(colId))
    try {
      const res = await fetch(`/api/crm/colegios/${colId}/cursos`)
      const data = await res.json()
      if (data.success) {
        const raw = data.data || []
        const mapped: CursoOption[] = raw.map((c: any) => ({
          id: c.id,
          documentId: c.documentId || String(c.id),
          nombre: c.nombre_curso || c.titulo || c.nombre || 'Sin nombre',
          nombre_curso: c.nombre_curso,
          nivel: c.nivel || '',
          grado: c.grado || '',
          letra: c.letra || '',
          curso_letra_anio: c.curso_letra_anio || '',
        }))
        setCursosByColegio((prev) => ({ ...prev, [colId]: mapped }))
      }
    } catch (err: any) {
      console.error('Error fetching cursos:', err)
    } finally {
        setLoadingCursosIds((prev) => {
        const next = new Set(prev)
        next.delete(colId)
        return next
      })
    }
  }, [])

  const fetchAsignaturas = useCallback(async () => {
    setLoadingAsignaturas(true)
    try {
      const res = await fetch('/api/mira/asignaturas')
      const data = await res.json()
      if (data.success) setAsignaturas(data.data || [])
    } catch (err) {
      console.error('Error fetching asignaturas:', err)
    } finally {
      setLoadingAsignaturas(false)
    }
  }, [])

  useEffect(() => {
    if (show && profesor) {
      fetchTrayectorias()
      fetchColegios()
      fetchAsignaturas()
    }
    if (!show) {
      resetForm()
      setTrayectorias([])
    }
  }, [show, profesor, fetchTrayectorias, fetchColegios, fetchAsignaturas])

  const setFila = (index: number, field: keyof FilaAsignacion, value: string | number) => {
    setFilas((prev) => {
      const next = [...prev]
      const row = { ...next[index], [field]: value }
      if (field === 'colegioId') {
        row.cursoId = ''
        fetchCursosForColegio(String(value))
      }
      next[index] = row
      return next
    })
  }

  const addFila = () => {
    setFilas((prev) => [
      ...prev,
      { id: String(Date.now()), colegioId: '', cursoId: '', asignaturaId: '', cargo: '', anio: new Date().getFullYear() },
    ])
  }

  const removeFila = (index: number) => {
    if (filas.length <= 1) return
    setFilas((prev) => prev.filter((_, i) => i !== index))
  }

  // Debounce para búsqueda de colegios
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchColegio.length >= 2 || searchColegio.length === 0) {
        fetchColegios(searchColegio)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [searchColegio, fetchColegios])

  const resetForm = () => {
    setFilas([
      { id: String(Date.now()), colegioId: '', cursoId: '', asignaturaId: '', cargo: '', anio: new Date().getFullYear() },
    ])
    setSearchColegio('')
    setError(null)
    setSuccessMsg(null)
  }

  const handleGuardar = async () => {
    setError(null)
    setSuccessMsg(null)

    const asignaciones = filas
      .filter((f) => f.colegioId && f.cargo?.trim())
      .map((f) => ({
        colegio_id: f.colegioId,
        curso_id: f.cursoId || undefined,
        asignatura_id: f.asignaturaId || undefined,
        cargo: f.cargo.trim(),
        anio: f.anio,
      }))

    if (asignaciones.length === 0) {
      setError('Añade al menos una fila con colegio y cargo.')
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/mira/profesores/${encodeURIComponent(personaDocId)}/asignar-carga`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asignaciones }),
      })

      const data = await res.json()
      if (data.success) {
        const msg = data.created > 1 ? `${data.created} asignaciones creadas` : 'Carga académica asignada correctamente'
        setSuccessMsg(msg)
        toast.success(msg)
        resetForm()
        fetchTrayectorias()
        onHide()
      } else {
        setError(data.error || 'Error al asignar')
      }
    } catch (err: any) {
      setError(err?.message || 'Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  const handleEliminar = async (trayectoria: TrayectoriaItem) => {
    const tid = trayectoria.documentId || String(trayectoria.id)
    if (!confirm('¿Estás seguro de eliminar esta asignación?')) return

    setDeleting(tid)
    try {
      const res = await fetch(`/api/mira/profesores/asignar?id=${encodeURIComponent(tid)}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        fetchTrayectorias()
      } else {
        setError(data.error || 'Error al eliminar')
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión')
    } finally {
      setDeleting(null)
    }
  }

  const algunaFilaCompleta = filas.some((f) => f.colegioId && f.cargo?.trim())

  return (
    <Modal show={show} onHide={onHide} centered size="xl" backdrop="static">
      <Modal.Header closeButton className="bg-primary bg-opacity-10">
        <Modal.Title className="d-flex align-items-center gap-2">
          <LuBriefcase size={22} className="text-primary" />
          Carga Académica — {profesor?.nombre_completo || ''}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}
        {successMsg && <Alert variant="success" dismissible onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}

        {/* Trayectorias existentes */}
        <div className="mb-4">
          <h6 className="fw-bold d-flex align-items-center gap-2 mb-3">
            <LuSchool size={18} />
            Asignaciones Actuales
            <Badge bg="secondary" pill>{trayectorias.length}</Badge>
          </h6>

          {loadingTrayectorias ? (
            <div className="text-center py-3">
              <Spinner animation="border" size="sm" variant="primary" />
            </div>
          ) : trayectorias.length === 0 ? (
            <Alert variant="info" className="mb-0">
              Este profesor no tiene asignaciones de carga académica aún.
            </Alert>
          ) : (
            <div className="table-responsive">
              <Table size="sm" hover className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Colegio</th>
                    <th>Curso</th>
                    <th>Asignatura</th>
                    <th>Cargo</th>
                    <th>Año</th>
                    <th style={{ width: '60px' }}>Vigente</th>
                    <th style={{ width: '50px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {trayectorias.map((t) => (
                    <tr key={t.documentId || t.id}>
                      <td>
                        <span className="fw-semibold">{t.colegio?.nombre || '—'}</span>
                        {t.colegio?.rbd && (
                          <small className="text-muted ms-1">(RBD {t.colegio.rbd})</small>
                        )}
                      </td>
                      <td>{t.curso?.nombre || '—'}</td>
                      <td>{t.asignatura?.nombre || '—'}</td>
                      <td><Badge bg="soft-primary" text="dark">{t.cargo || '—'}</Badge></td>
                      <td>{t.anio || '—'}</td>
                      <td className="text-center">
                        {t.is_current
                          ? <Badge bg="success" pill>Sí</Badge>
                          : <Badge bg="secondary" pill>No</Badge>}
                      </td>
                      <td>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleEliminar(t)}
                          disabled={deleting === (t.documentId || String(t.id))}
                          title="Eliminar asignación"
                        >
                          {deleting === (t.documentId || String(t.id))
                            ? <Spinner animation="border" size="sm" />
                            : <LuTrash2 size={14} />}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </div>

        <hr />

        {/* Formulario: varias filas de asignación */}
        <h6 className="fw-bold d-flex align-items-center gap-2 mb-3">
          <LuPlus size={18} />
          Nueva(s) Asignación(es)
        </h6>
        <p className="text-muted small mb-3">Puedes añadir varias filas para asignar múltiples colegios, cursos, asignaturas y cargos a la vez.</p>

        <Form.Control
          type="text"
          placeholder="Buscar colegio..."
          value={searchColegio}
          onChange={(e) => setSearchColegio(e.target.value)}
          className="mb-3"
          size="sm"
          style={{ maxWidth: '280px' }}
        />

        {filas.map((fila, index) => (
          <div key={fila.id} className="border rounded p-3 mb-3 bg-light bg-opacity-50">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="fw-semibold text-secondary small">Asignación {index + 1}</span>
              {filas.length > 1 && (
                <Button variant="outline-danger" size="sm" onClick={() => removeFila(index)} title="Quitar fila">
                  <LuTrash2 size={14} />
                </Button>
              )}
            </div>
            <Row className="g-2">
              <Col md={3}>
                <Form.Group>
                  <Form.Label className="small mb-0">Colegio <span className="text-danger">*</span></Form.Label>
                  <Form.Select
                    size="sm"
                    value={fila.colegioId}
                    onChange={(e) => setFila(index, 'colegioId', e.target.value)}
                    disabled={loadingColegios}
                  >
                    <option value="">{loadingColegios ? 'Cargando...' : 'Seleccionar'}</option>
                    {colegios.map((c) => (
                      <option key={c.documentId || c.id} value={c.documentId || String(c.id)}>
                        {c.nombre} {c.rbd ? `(RBD ${c.rbd})` : ''}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group>
                  <Form.Label className="small mb-0">Curso</Form.Label>
                  <Form.Select
                    size="sm"
                    value={fila.cursoId}
                    onChange={(e) => setFila(index, 'cursoId', e.target.value)}
                    disabled={!fila.colegioId || loadingCursosIds.has(fila.colegioId)}
                  >
                    <option value="">
                      {!fila.colegioId ? 'Primero colegio' : loadingCursosIds.has(fila.colegioId) ? 'Cargando...' : 'Seleccionar'}
                    </option>
                    {(cursosByColegio[fila.colegioId] || []).map((c) => (
                      <option key={c.documentId || c.id} value={c.documentId || String(c.id)}>
                        {c.curso_letra_anio || c.nombre}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group>
                  <Form.Label className="small mb-0">Asignatura</Form.Label>
                  <Form.Select
                    size="sm"
                    value={fila.asignaturaId}
                    onChange={(e) => setFila(index, 'asignaturaId', e.target.value)}
                    disabled={loadingAsignaturas}
                  >
                    <option value="">{loadingAsignaturas ? '...' : 'Seleccionar'}</option>
                    {asignaturas.map((a) => (
                      <option key={a.documentId || a.id} value={a.documentId || String(a.id)}>{a.nombre}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group>
                  <Form.Label className="small mb-0">Cargo <span className="text-danger">*</span></Form.Label>
                  <Form.Select size="sm" value={fila.cargo} onChange={(e) => setFila(index, 'cargo', e.target.value)}>
                    <option value="">Cargo</option>
                    {CARGOS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={1}>
                <Form.Group>
                  <Form.Label className="small mb-0">Año</Form.Label>
                  <Form.Control
                    type="number"
                    size="sm"
                    value={fila.anio}
                    onChange={(e) => setFila(index, 'anio', Number(e.target.value))}
                    min={2000}
                    max={2100}
                  />
                </Form.Group>
              </Col>
            </Row>
          </div>
        ))}

        <Button variant="outline-primary" size="sm" onClick={addFila} className="mb-3 d-flex align-items-center gap-1">
          <LuPlus size={16} />
          Añadir otra asignación
        </Button>
      </Modal.Body>

      <Modal.Footer className="d-flex justify-content-between">
        <Button variant="outline-secondary" onClick={onHide}>
          Cerrar
        </Button>
        <Button
          variant="primary"
          onClick={handleGuardar}
          disabled={saving || !algunaFilaCompleta}
          className="d-flex align-items-center gap-2"
        >
          {saving ? (
            <>
              <Spinner animation="border" size="sm" />
              Guardando...
            </>
          ) : (
            <>
              <LuPlus size={16} />
              Asignar Carga
            </>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
