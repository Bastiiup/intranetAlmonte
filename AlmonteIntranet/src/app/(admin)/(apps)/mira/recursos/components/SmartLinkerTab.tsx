'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Card,
  CardBody,
  Button,
  Form,
  Alert,
  Spinner,
  Badge,
  InputGroup,
  OverlayTrigger,
  Tooltip,
  ProgressBar,
} from 'react-bootstrap'
import {
  LuLink,
  LuRefreshCw,
  LuSearch,
  LuVideo,
  LuBookMarked,
  LuCheckCheck,
  LuCircleCheck,
  LuFilter,
  LuX,
  LuSquareCheck,
  LuLoader,
  LuTrash2,
  LuBookOpen,
  LuHash,
  LuTag,
  LuClock,
  LuFileText,
  LuChevronDown,
  LuChevronUp,
} from 'react-icons/lu'

/* ── Constantes ─────────────────────────────────────────── */
const SECCIONES = [
  'Teorico', 'Ensayo', 'Ejercitacion', 'Solucionario', 'Clase_Grabada',
  'Marco_Teorico', 'Evaluacion_Matematicas_M1', 'Evaluacion_Matematicas_M2', 'Otro',
] as const

const SECCION_LABELS: Record<string, string> = {
  Teorico: 'Teórico',
  Ensayo: 'Ensayo',
  Ejercitacion: 'Ejercitación',
  Solucionario: 'Solucionario',
  Clase_Grabada: 'Clase Grabada',
  Marco_Teorico: 'Marco Teórico',
  Evaluacion_Matematicas_M1: 'Eval. Matemáticas M1',
  Evaluacion_Matematicas_M2: 'Eval. Matemáticas M2',
  Otro: 'Otro',
}

const SECCION_COLORS: Record<string, string> = {
  Teorico: '#6f42c1',
  Ensayo: '#0d6efd',
  Ejercitacion: '#198754',
  Solucionario: '#fd7e14',
  Clase_Grabada: '#20c997',
  Marco_Teorico: '#6610f2',
  Evaluacion_Matematicas_M1: '#d63384',
  Evaluacion_Matematicas_M2: '#e35d6a',
  Otro: '#6c757d',
}

/* ── Tipos ─────────────────────────────────────────────── */
type LibroMira = {
  id: number | string
  documentId?: string
  attributes?: {
    libro?: {
      data?: { attributes?: { nombre_libro?: string } }
      attributes?: { nombre_libro?: string }
      nombre_libro?: string
    }
  }
  libro?: { nombre_libro?: string }
}

type RecursoMira = {
  id: number
  documentId?: string
  nombre?: string
  video_id?: string
  tipo?: string
  seccion?: string
  numero_capitulo?: string
  sub_seccion?: string
  numero_ejercicio?: string
  titulo_personalizado?: string
  duracion_segundos?: number
  orden?: number
  createdAt?: string
  libro_mira?: {
    id?: number
    documentId?: string
    libro?: { nombre_libro?: string }
  } | null
  // Strapi v5 flat format alternatives
  attributes?: Record<string, unknown>
}

type StrapiPagination = {
  page: number
  pageSize: number
  pageCount: number
  total: number
}

/* ── Helpers ───────────────────────────────────────────── */
const rid = (r: RecursoMira) => String(r.documentId ?? r.id)
const rname = (r: RecursoMira) =>
  r.titulo_personalizado || r.nombre || r.video_id || String(r.id)

const formatDur = (sec?: number) => {
  if (!sec || sec <= 0) return ''
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

/* ── Componente principal ──────────────────────────────── */
export default function SmartLinkerTab() {
  // Data
  const [libros, setLibros] = useState<LibroMira[]>([])
  const [recursos, setRecursos] = useState<RecursoMira[]>([])
  const [pagination, setPagination] = useState<StrapiPagination | null>(null)

  // Selección
  const [selectedLibroId, setSelectedLibroId] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Filtros
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [seccionFilter, setSeccionFilter] = useState('')
  const [capituloFilter, setCapituloFilter] = useState('')
  const [subSeccionFilter, setSubSeccionFilter] = useState('')
  const [ejercicioFilter, setEjercicioFilter] = useState('')
  const [tituloFilter, setTituloFilter] = useState('')
  const [asignacionFilter, setAsignacionFilter] = useState<'todos' | 'sinLibro' | 'conLibro'>('sinLibro')
  const [filtersOpen, setFiltersOpen] = useState(false)

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // UI state
  const [loadingLibros, setLoadingLibros] = useState(false)
  const [loadingRecursos, setLoadingRecursos] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [linking, setLinking] = useState(false)
  const [linkProgress, setLinkProgress] = useState(0)
  const [message, setMessage] = useState<{ type: 'success' | 'danger' | 'info'; text: string } | null>(null)

  // Track si los filtros avanzados tienen algo
  const hasAdvancedFilters =
    seccionFilter !== '' ||
    capituloFilter !== '' ||
    subSeccionFilter !== '' ||
    ejercicioFilter !== '' ||
    tituloFilter !== ''

  const activeFilterCount =
    (seccionFilter ? 1 : 0) +
    (capituloFilter ? 1 : 0) +
    (subSeccionFilter ? 1 : 0) +
    (ejercicioFilter ? 1 : 0) +
    (tituloFilter ? 1 : 0) +
    (asignacionFilter !== 'todos' ? 1 : 0)

  /* ── Cargar libros ───────────────────────────────────── */
  const loadLibros = useCallback(async () => {
    setLoadingLibros(true)
    setMessage(null)
    try {
      const res = await fetch('/api/mira/libros-mira?pagination[pageSize]=500')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al cargar libros')
      const list = Array.isArray(data.data) ? data.data : []
      setLibros(list)
      if (!selectedLibroId && list.length) {
        const first = list[0] as LibroMira
        setSelectedLibroId(String(first.documentId ?? first.id))
      }
    } catch (e: unknown) {
      setMessage({ type: 'danger', text: e instanceof Error ? e.message : 'Error al cargar libros' })
    } finally {
      setLoadingLibros(false)
    }
  }, [selectedLibroId])

  /* ── Cargar recursos desde Strapi ──────────────────── */
  const loadRecursos = useCallback(
    async (page = 1, append = false) => {
      if (page === 1) setLoadingRecursos(true)
      else setLoadingMore(true)

      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: '50',
        })
        if (searchQuery.trim()) params.set('search', searchQuery.trim())
        if (seccionFilter) params.set('seccion', seccionFilter)
        if (capituloFilter.trim()) params.set('capitulo', capituloFilter.trim())
        if (subSeccionFilter.trim()) params.set('sub_seccion', subSeccionFilter.trim())
        if (ejercicioFilter.trim()) params.set('ejercicio', ejercicioFilter.trim())
        if (tituloFilter.trim()) params.set('titulo', tituloFilter.trim())
        if (asignacionFilter === 'sinLibro') params.set('sinLibro', 'true')
        if (asignacionFilter === 'conLibro') params.set('conLibro', 'true')

        const res = await fetch(`/api/mira/recursos?${params}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Error al cargar recursos')

        const list: RecursoMira[] = Array.isArray(data.data) ? data.data : []
        const pag: StrapiPagination = data.meta?.pagination ?? {
          page,
          pageSize: 50,
          pageCount: 1,
          total: list.length,
        }

        if (append) {
          setRecursos((prev) => [...prev, ...list])
        } else {
          setRecursos(list)
          setSelectedIds(new Set())
        }
        setPagination(pag)
      } catch (e: unknown) {
        setMessage({ type: 'danger', text: e instanceof Error ? e.message : 'Error al cargar recursos' })
      } finally {
        setLoadingRecursos(false)
        setLoadingMore(false)
      }
    },
    [searchQuery, seccionFilter, capituloFilter, subSeccionFilter, ejercicioFilter, tituloFilter, asignacionFilter]
  )

  // Cargar al montar
  useEffect(() => {
    loadLibros()
  }, [])
  useEffect(() => {
    loadRecursos(1)
  }, [searchQuery, seccionFilter, capituloFilter, subSeccionFilter, ejercicioFilter, tituloFilter, asignacionFilter])

  /* ── Búsqueda con debounce ─────────────────────────── */
  const handleSearchChange = (val: string) => {
    setSearchInput(val)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => setSearchQuery(val), 400)
  }

  const clearSearch = () => {
    setSearchInput('')
    setSearchQuery('')
  }

  const clearAllFilters = () => {
    setSearchInput('')
    setSearchQuery('')
    setSeccionFilter('')
    setCapituloFilter('')
    setSubSeccionFilter('')
    setEjercicioFilter('')
    setTituloFilter('')
    setAsignacionFilter('sinLibro')
  }

  /* ── Selección ─────────────────────────────────────── */
  const toggleRecurso = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllVisible = () => {
    const allIds = recursos.map((r) => rid(r))
    const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id))
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        allIds.forEach((id) => next.delete(id))
        return next
      })
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        allIds.forEach((id) => next.add(id))
        return next
      })
    }
  }

  const clearSelection = () => setSelectedIds(new Set())

  /* ── Vincular ──────────────────────────────────────── */
  const handleVincular = async () => {
    if (!selectedLibroId) {
      setMessage({ type: 'danger', text: 'Selecciona un libro destino' })
      return
    }
    const toLink = recursos.filter((r) => selectedIds.has(rid(r)))
    if (toLink.length === 0) {
      setMessage({ type: 'danger', text: 'Selecciona al menos un recurso' })
      return
    }
    setLinking(true)
    setLinkProgress(0)
    setMessage(null)
    try {
      const res = await fetch('/api/mira/recursos/vincular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          libroId: selectedLibroId,
          videos: toLink.map((r) => ({
            id: r.video_id || rid(r),
            nombre: rname(r),
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al vincular')
      const creados = data.creados ?? 0
      const errores = data.errores ?? 0
      const primerError = data.primerError ?? null
      setLinkProgress(100)
      if (errores > 0 && primerError) {
        setMessage({ type: 'danger', text: `${creados} vinculados, ${errores} errores: ${primerError}` })
      } else {
        setMessage({ type: 'success', text: `${creados} recurso(s) vinculado(s) correctamente al libro.` })
      }
      setSelectedIds(new Set())
      // Recargar para ver estado actualizado
      loadRecursos(1)
    } catch (e: unknown) {
      setMessage({ type: 'danger', text: e instanceof Error ? e.message : 'Error al vincular' })
    } finally {
      setLinking(false)
    }
  }

  /* ── Cargar más ────────────────────────────────────── */
  const hasMore = pagination ? pagination.page < pagination.pageCount : false
  const loadMore = () => loadRecursos((pagination?.page ?? 1) + 1, true)

  /* ── Contadores ────────────────────────────────────── */
  const selectedCount = selectedIds.size
  const allVisibleSelected = recursos.length > 0 && recursos.every((r) => selectedIds.has(rid(r)))

  /* ── Label del libro seleccionado ──────────────────── */
  const selectedLibroLabel = (() => {
    const libro = libros.find((l) => String((l as LibroMira).documentId ?? l.id) === selectedLibroId)
    if (!libro) return ''
    const att = libro.attributes
    const libroData = att?.libro?.data?.attributes ?? att?.libro?.attributes ?? att?.libro ?? libro.libro
    return libroData?.nombre_libro ?? ''
  })()

  /* ── Render de un recurso ──────────────────────────── */
  const renderRecurso = (r: RecursoMira) => {
    const id = rid(r)
    const isSelected = selectedIds.has(id)
    const secLabel = r.seccion ? SECCION_LABELS[r.seccion] ?? r.seccion : null
    const secColor = r.seccion ? SECCION_COLORS[r.seccion] ?? '#6c757d' : '#6c757d'
    const tieneLibro = r.libro_mira != null
    const libroNombre = r.libro_mira?.libro?.nombre_libro

    return (
      <div
        key={id}
        onClick={() => !linking && toggleRecurso(id)}
        className="recurso-card"
        style={{
          padding: '10px 14px',
          borderBottom: '1px solid #e9ecef',
          cursor: linking ? 'not-allowed' : 'pointer',
          backgroundColor: isSelected ? '#e8f0fe' : 'transparent',
          borderLeft: isSelected ? '4px solid #0d6efd' : '4px solid transparent',
          transition: 'all 0.15s ease',
        }}
      >
        <div className="d-flex align-items-start gap-2">
          {/* Checkbox visual */}
          <div className="flex-shrink-0 pt-1">
            {isSelected ? (
              <LuSquareCheck size={18} className="text-primary" />
            ) : (
              <div
                className="border rounded"
                style={{ width: 18, height: 18, borderColor: '#ced4da' }}
              />
            )}
          </div>

          {/* Contenido principal */}
          <div className="flex-grow-1 min-w-0">
            {/* Fila 1: Título + badges */}
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <span
                className={`text-truncate ${isSelected ? 'fw-semibold' : ''}`}
                style={{ fontSize: '0.9rem', maxWidth: '100%' }}
                title={rname(r)}
              >
                {rname(r)}
              </span>
              {isSelected && <LuCircleCheck size={14} className="text-primary flex-shrink-0" />}
            </div>

            {/* Fila 2: Metadata tags */}
            <div className="d-flex align-items-center gap-1 flex-wrap mt-1">
              {secLabel && (
                <span
                  className="badge rounded-pill fw-normal"
                  style={{
                    backgroundColor: secColor + '20',
                    color: secColor,
                    border: `1px solid ${secColor}40`,
                    fontSize: '0.68rem',
                    padding: '2px 8px',
                  }}
                >
                  {secLabel}
                </span>
              )}
              {r.numero_capitulo && (
                <span className="badge bg-light text-dark border" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                  <LuBookOpen size={10} className="me-1" />
                  Cap. {r.numero_capitulo}
                </span>
              )}
              {r.sub_seccion && (
                <span className="badge bg-light text-dark border" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                  <LuTag size={10} className="me-1" />
                  {r.sub_seccion}
                </span>
              )}
              {r.numero_ejercicio && (
                <span className="badge bg-light text-dark border" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                  <LuHash size={10} className="me-1" />
                  Ej. {r.numero_ejercicio}
                </span>
              )}
              {r.duracion_segundos != null && r.duracion_segundos > 0 && (
                <span className="badge bg-light text-muted border" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                  <LuClock size={10} className="me-1" />
                  {formatDur(r.duracion_segundos)}
                </span>
              )}
              {tieneLibro && (
                <span
                  className="badge rounded-pill fw-normal"
                  style={{
                    backgroundColor: '#19875420',
                    color: '#198754',
                    border: '1px solid #19875440',
                    fontSize: '0.65rem',
                    padding: '2px 8px',
                  }}
                >
                  <LuBookMarked size={10} className="me-1" />
                  {libroNombre ?? 'Asignado'}
                </span>
              )}
            </div>

            {/* Fila 3: Nombre del archivo (si difiere del título) */}
            {r.titulo_personalizado && r.nombre && r.titulo_personalizado !== r.nombre && (
              <div className="text-muted mt-1" style={{ fontSize: '0.7rem' }}>
                <LuFileText size={10} className="me-1" />
                {r.nombre}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* ── Mensajes ────────────────────────────────────── */}
      {message && (
        <Alert variant={message.type} dismissible onClose={() => setMessage(null)} className="mb-3">
          {message.text}
        </Alert>
      )}

      {/* ── Selector de libro destino ────────────────────── */}
      <Card className="mb-3 border-primary border-opacity-25">
        <CardBody className="py-3">
          <div className="d-flex align-items-center gap-2 mb-2">
            <LuBookMarked size={18} className="text-primary" />
            <span className="fw-semibold text-primary">Libro destino</span>
          </div>
          <div className="d-flex gap-2">
            <Form.Select
              value={selectedLibroId}
              onChange={(e) => setSelectedLibroId(e.target.value)}
              disabled={loadingLibros || linking}
              className="flex-grow-1"
            >
              <option value="">-- Seleccionar libro --</option>
              {libros.map((l) => {
                const libro = l as LibroMira
                const id = String(libro.documentId ?? libro.id)
                const att = libro.attributes
                const libroData = att?.libro?.data?.attributes ?? att?.libro?.attributes ?? att?.libro ?? libro.libro
                const label = libroData?.nombre_libro ?? id
                return <option key={id} value={id}>{label}</option>
              })}
            </Form.Select>
            <Button
              variant="outline-secondary"
              onClick={loadLibros}
              disabled={loadingLibros}
              title="Recargar libros"
            >
              <LuRefreshCw size={16} className={loadingLibros ? 'spin-animation' : ''} />
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* ── Barra de filtros ─────────────────────────────── */}
      <Card className="mb-3">
        <CardBody className="py-3">
          {/* Encabezado con contador de resultados */}
          <div className="d-flex align-items-center gap-2 mb-2">
            <LuVideo size={18} className="text-muted" />
            <span className="fw-semibold">Recursos MIRA</span>
            <Badge bg="secondary" className="ms-1">
              {pagination?.total ?? 0} total
            </Badge>
            {recursos.length > 0 && recursos.length < (pagination?.total ?? 0) && (
              <Badge bg="outline-secondary" text="dark" className="border">
                {recursos.length} cargados
              </Badge>
            )}
            {activeFilterCount > 0 && (
              <Badge bg="info" className="ms-1">
                {activeFilterCount} filtro{activeFilterCount > 1 ? 's' : ''} activo{activeFilterCount > 1 ? 's' : ''}
              </Badge>
            )}
            <Button
              variant="outline-secondary"
              size="sm"
              className="ms-auto"
              onClick={() => loadRecursos(1)}
              disabled={loadingRecursos}
              title="Recargar"
            >
              <LuRefreshCw size={14} className={loadingRecursos ? 'spin-animation' : ''} />
            </Button>
          </div>

          {/* Búsqueda general + toggle filtros */}
          <div className="d-flex gap-2 mb-2">
            <InputGroup size="sm" className="flex-grow-1">
              <InputGroup.Text><LuSearch size={14} /></InputGroup.Text>
              <Form.Control
                type="text"
                placeholder="Buscar por nombre o título personalizado..."
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                disabled={linking}
              />
              {searchInput && (
                <Button variant="outline-secondary" onClick={clearSearch}>
                  <LuX size={14} />
                </Button>
              )}
            </InputGroup>
            <Button
              variant={hasAdvancedFilters ? 'primary' : 'outline-secondary'}
              size="sm"
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="d-flex align-items-center gap-1"
              style={{ whiteSpace: 'nowrap' }}
            >
              <LuFilter size={14} />
              Filtros
              {hasAdvancedFilters && (
                <Badge bg="light" text="dark" pill className="ms-1" style={{ fontSize: '0.65rem' }}>
                  {activeFilterCount - (asignacionFilter !== 'todos' ? 1 : 0)}
                </Badge>
              )}
              {filtersOpen ? <LuChevronUp size={12} /> : <LuChevronDown size={12} />}
            </Button>
          </div>

          {/* Panel de filtros avanzados (colapsable) */}
          {filtersOpen && (
            <div
              className="border rounded p-3 mb-2"
              style={{ backgroundColor: '#f8f9fa' }}
            >
              <div className="row g-2">
                {/* Sección */}
                <div className="col-12 col-md-4">
                  <Form.Label className="small text-muted mb-1" style={{ fontSize: '0.75rem' }}>
                    Sección
                  </Form.Label>
                  <Form.Select
                    size="sm"
                    value={seccionFilter}
                    onChange={(e) => setSeccionFilter(e.target.value)}
                    disabled={linking}
                  >
                    <option value="">Todas las secciones</option>
                    {SECCIONES.map((s) => (
                      <option key={s} value={s}>{SECCION_LABELS[s] ?? s}</option>
                    ))}
                  </Form.Select>
                </div>

                {/* Capítulo */}
                <div className="col-6 col-md-4">
                  <Form.Label className="small text-muted mb-1" style={{ fontSize: '0.75rem' }}>
                    Capítulo N°
                  </Form.Label>
                  <Form.Control
                    size="sm"
                    type="text"
                    placeholder="Ej: 1, 2A..."
                    value={capituloFilter}
                    onChange={(e) => setCapituloFilter(e.target.value)}
                    disabled={linking}
                  />
                </div>

                {/* Sub Sección */}
                <div className="col-6 col-md-4">
                  <Form.Label className="small text-muted mb-1" style={{ fontSize: '0.75rem' }}>
                    Sub Sección
                  </Form.Label>
                  <Form.Control
                    size="sm"
                    type="text"
                    placeholder="Ej: Ejercicio, Ejemplo..."
                    value={subSeccionFilter}
                    onChange={(e) => setSubSeccionFilter(e.target.value)}
                    disabled={linking}
                  />
                </div>

                {/* N° Ejercicio */}
                <div className="col-6 col-md-4">
                  <Form.Label className="small text-muted mb-1" style={{ fontSize: '0.75rem' }}>
                    N° Ejercicio
                  </Form.Label>
                  <Form.Control
                    size="sm"
                    type="text"
                    placeholder="Ej: 62, 15b..."
                    value={ejercicioFilter}
                    onChange={(e) => setEjercicioFilter(e.target.value)}
                    disabled={linking}
                  />
                </div>

                {/* Título personalizado */}
                <div className="col-6 col-md-4">
                  <Form.Label className="small text-muted mb-1" style={{ fontSize: '0.75rem' }}>
                    Título personalizado
                  </Form.Label>
                  <Form.Control
                    size="sm"
                    type="text"
                    placeholder="Buscar en títulos..."
                    value={tituloFilter}
                    onChange={(e) => setTituloFilter(e.target.value)}
                    disabled={linking}
                  />
                </div>

                {/* Asignación */}
                <div className="col-12 col-md-4">
                  <Form.Label className="small text-muted mb-1" style={{ fontSize: '0.75rem' }}>
                    Estado de asignación
                  </Form.Label>
                  <Form.Select
                    size="sm"
                    value={asignacionFilter}
                    onChange={(e) => setAsignacionFilter(e.target.value as 'todos' | 'sinLibro' | 'conLibro')}
                    disabled={linking}
                  >
                    <option value="todos">Todos</option>
                    <option value="sinLibro">Sin libro asignado</option>
                    <option value="conLibro">Con libro asignado</option>
                  </Form.Select>
                </div>
              </div>

              {/* Botón limpiar filtros */}
              {hasAdvancedFilters && (
                <div className="mt-2 text-end">
                  <Button variant="link" size="sm" className="text-danger p-0" onClick={clearAllFilters}>
                    <LuTrash2 size={12} className="me-1" />
                    Limpiar todos los filtros
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Acciones de selección */}
          <div className="d-flex align-items-center gap-2">
            <OverlayTrigger
              overlay={
                <Tooltip>
                  {allVisibleSelected ? 'Deseleccionar visibles' : 'Seleccionar todos los visibles'}
                </Tooltip>
              }
            >
              <Button
                variant={allVisibleSelected ? 'primary' : 'outline-primary'}
                size="sm"
                onClick={selectAllVisible}
                disabled={linking || recursos.length === 0}
              >
                <LuCheckCheck size={14} className="me-1" />
                {allVisibleSelected ? 'Quitar' : 'Todos'}
              </Button>
            </OverlayTrigger>
            {selectedCount > 0 && (
              <OverlayTrigger overlay={<Tooltip>Limpiar selección ({selectedCount})</Tooltip>}>
                <Button variant="outline-danger" size="sm" onClick={clearSelection}>
                  <LuTrash2 size={14} className="me-1" />
                  Limpiar ({selectedCount})
                </Button>
              </OverlayTrigger>
            )}
          </div>
        </CardBody>
      </Card>

      {/* ── Lista de recursos ────────────────────────────── */}
      <div className="border rounded overflow-auto mb-3" style={{ maxHeight: 500 }}>
        {loadingRecursos ? (
          <div className="p-5 text-center">
            <Spinner animation="border" className="mb-2" />
            <p className="text-muted mb-0">Cargando recursos...</p>
          </div>
        ) : recursos.length === 0 ? (
          <div className="p-5 text-center text-muted">
            <LuVideo size={32} className="mb-2 opacity-50" />
            <p className="mb-1 fw-semibold">No se encontraron recursos</p>
            <p className="mb-0 small">
              {hasAdvancedFilters || searchQuery
                ? 'Prueba ajustando los filtros o la búsqueda.'
                : 'No hay recursos registrados aún. Sube videos desde la pestaña "Subir Videos".'}
            </p>
          </div>
        ) : (
          <>
            {recursos.map(renderRecurso)}

            {/* Cargar más */}
            {hasMore && (
              <div className="p-3 text-center bg-light">
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Cargando...
                    </>
                  ) : (
                    <>
                      <LuLoader size={14} className="me-1" />
                      Cargar más ({recursos.length} de {pagination?.total ?? '?'})
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Barra de acción ──────────────────────────────── */}
      <Card className={`border-2 ${selectedCount > 0 ? 'border-primary' : 'border-light'}`}>
        <CardBody className="py-3">
          {linking && <ProgressBar now={linkProgress} animated className="mb-2" style={{ height: 4 }} />}

          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
            {/* Resumen de selección */}
            <div className="d-flex align-items-center gap-2">
              {selectedCount > 0 ? (
                <>
                  <Badge bg="primary" className="fs-6 px-3 py-2">
                    {selectedCount} recurso{selectedCount !== 1 ? 's' : ''} seleccionado{selectedCount !== 1 ? 's' : ''}
                  </Badge>
                  {selectedLibroLabel && (
                    <span className="text-muted small">
                      para <strong>{selectedLibroLabel}</strong>
                    </span>
                  )}
                </>
              ) : (
                <span className="text-muted small">
                  Usa los filtros para encontrar recursos y haz clic para seleccionarlos.
                </span>
              )}
            </div>

            {/* Botón vincular */}
            <Button
              variant="primary"
              onClick={handleVincular}
              disabled={linking || !selectedLibroId || selectedCount === 0}
              size="lg"
            >
              {linking ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Vinculando...
                </>
              ) : (
                <>
                  <LuLink className="me-2" size={18} />
                  Vincular {selectedCount > 0 ? `${selectedCount} recurso(s)` : ''}
                </>
              )}
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* ── CSS para animaciones ─────────────────────────── */}
      <style jsx global>{`
        .spin-animation {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .recurso-card:hover {
          background-color: #f8f9fa !important;
        }
      `}</style>
    </div>
  )
}
