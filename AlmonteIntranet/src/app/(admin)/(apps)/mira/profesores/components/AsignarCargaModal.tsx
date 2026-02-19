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

  // Form
  const [colegioId, setColegioId] = useState('')
  const [cursoId, setCursoId] = useState('')
  const [asignaturaId, setAsignaturaId] = useState('')
  const [cargo, setCargo] = useState('')
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [notas, setNotas] = useState('')
  const [searchColegio, setSearchColegio] = useState('')

  // State
  const [loadingTrayectorias, setLoadingTrayectorias] = useState(false)
  const [loadingColegios, setLoadingColegios] = useState(false)
  const [loadingCursos, setLoadingCursos] = useState(false)
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

  const fetchCursos = useCallback(async (colId: string) => {
    if (!colId) {
      setCursos([])
      return
    }
    setLoadingCursos(true)
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
        setCursos(mapped)
      }
    } catch (err: any) {
      console.error('Error fetching cursos:', err)
    } finally {
      setLoadingCursos(false)
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

  useEffect(() => {
    if (colegioId) {
      setCursoId('')
      fetchCursos(colegioId)
    } else {
      setCursos([])
      setCursoId('')
    }
  }, [colegioId, fetchCursos])

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
    setColegioId('')
    setCursoId('')
    setAsignaturaId('')
    setCargo('')
    setAnio(new Date().getFullYear())
    setNotas('')
    setSearchColegio('')
    setError(null)
    setSuccessMsg(null)
  }

  const handleGuardar = async () => {
    setError(null)
    setSuccessMsg(null)

    if (!colegioId) { setError('Selecciona un colegio'); return }
    if (!cargo) { setError('Selecciona un cargo'); return }

    setSaving(true)
    try {
      const res = await fetch(`/api/mira/profesores/${encodeURIComponent(personaDocId)}/asignar-carga`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          colegio_id: colegioId,
          curso_id: cursoId || undefined,
          asignatura_id: asignaturaId || undefined,
          cargo,
          anio,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setSuccessMsg('Carga académica asignada correctamente')
        toast.success('Carga académica asignada correctamente')
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

  const colegioSeleccionado = colegios.find(
    (c) => c.documentId === colegioId || String(c.id) === colegioId
  )

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

        {/* Formulario de nueva asignación */}
        <h6 className="fw-bold d-flex align-items-center gap-2 mb-3">
          <LuPlus size={18} />
          Nueva Asignación
        </h6>

        <Row className="g-3">
          {/* Colegio */}
          <Col md={6}>
            <Form.Group>
              <Form.Label className="fw-semibold">
                Colegio <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control
                type="text"
                placeholder="Buscar colegio..."
                value={searchColegio}
                onChange={(e) => setSearchColegio(e.target.value)}
                className="mb-1"
                size="sm"
              />
              <Form.Select
                value={colegioId}
                onChange={(e) => setColegioId(e.target.value)}
                disabled={loadingColegios}
              >
                <option value="">
                  {loadingColegios ? 'Cargando...' : `Seleccionar colegio (${colegios.length})`}
                </option>
                {colegios.map((c) => (
                  <option key={c.documentId || c.id} value={c.documentId || String(c.id)}>
                    {c.nombre} {c.rbd ? `(RBD ${c.rbd})` : ''}
                  </option>
                ))}
              </Form.Select>
              {colegioSeleccionado && (
                <Form.Text className="text-success">
                  Seleccionado: {colegioSeleccionado.nombre}
                </Form.Text>
              )}
            </Form.Group>
          </Col>

          {/* Curso */}
          <Col md={6}>
            <Form.Group>
              <Form.Label className="fw-semibold">Curso</Form.Label>
              <Form.Select
                value={cursoId}
                onChange={(e) => setCursoId(e.target.value)}
                disabled={!colegioId || loadingCursos}
              >
                <option value="">
                  {!colegioId
                    ? 'Primero selecciona un colegio'
                    : loadingCursos
                      ? 'Cargando cursos...'
                      : cursos.length === 0
                        ? 'Sin cursos disponibles'
                        : `Seleccionar curso (${cursos.length})`}
                </option>
                {cursos.map((c) => (
                  <option key={c.documentId || c.id} value={c.documentId || String(c.id)}>
                    {c.curso_letra_anio || c.nombre} {c.nivel ? `— ${c.nivel}` : ''}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>

          {/* Asignatura */}
          <Col md={6}>
            <Form.Group>
              <Form.Label className="fw-semibold">Asignatura</Form.Label>
              <Form.Select
                value={asignaturaId}
                onChange={(e) => setAsignaturaId(e.target.value)}
                disabled={loadingAsignaturas}
              >
                <option value="">
                  {loadingAsignaturas ? 'Cargando asignaturas...' : 'Seleccionar asignatura (opcional)'}
                </option>
                {asignaturas.map((a) => (
                  <option key={a.documentId || a.id} value={a.documentId || String(a.id)}>
                    {a.nombre}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>

          {/* Cargo */}
          <Col md={4}>
            <Form.Group>
              <Form.Label className="fw-semibold">
                Cargo <span className="text-danger">*</span>
              </Form.Label>
              <Form.Select value={cargo} onChange={(e) => setCargo(e.target.value)}>
                <option value="">Seleccionar cargo</option>
                {CARGOS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>

          {/* Año */}
          <Col md={4}>
            <Form.Group>
              <Form.Label className="fw-semibold">Año</Form.Label>
              <Form.Control
                type="number"
                value={anio}
                onChange={(e) => setAnio(Number(e.target.value))}
                min={2000}
                max={2100}
              />
            </Form.Group>
          </Col>

          {/* Notas */}
          <Col md={4}>
            <Form.Group>
              <Form.Label className="fw-semibold">Notas</Form.Label>
              <Form.Control
                type="text"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Opcional..."
              />
            </Form.Group>
          </Col>
        </Row>
      </Modal.Body>

      <Modal.Footer className="d-flex justify-content-between">
        <Button variant="outline-secondary" onClick={onHide}>
          Cerrar
        </Button>
        <Button
          variant="primary"
          onClick={handleGuardar}
          disabled={saving || !colegioId || !cargo}
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
