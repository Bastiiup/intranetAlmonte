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
  LuCircleX,
  LuFilter,
  LuX,
  LuSquareCheck,
  LuLoader,
  LuTrash2,
} from 'react-icons/lu'

/* ── Tipos ─────────────────────────────────────────────────── */
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

type BunnyVideo = {
  guid?: string
  id?: number
  title?: string
  status?: number
  length?: number
  dateUploaded?: string
  views?: number
  storageSize?: number
}

/* ── Estados de video en Bunny ──────────────────────────── */
const BUNNY_STATUS: Record<number, { label: string; color: string }> = {
  0: { label: 'En cola', color: 'secondary' },
  1: { label: 'Subiendo', color: 'info' },
  2: { label: 'Procesando', color: 'warning' },
  3: { label: 'Transcodificando', color: 'warning' },
  4: { label: 'Listo', color: 'success' },
  5: { label: 'Error', color: 'danger' },
  6: { label: 'Subida iniciada', color: 'info' },
}

/* ── Helpers ───────────────────────────────────────────── */
const vid = (v: BunnyVideo) => String(v.guid ?? v.id ?? '')
const vtitle = (v: BunnyVideo) => v.title ?? vid(v)
const formatSize = (bytes?: number) => {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
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
  const [videos, setVideos] = useState<BunnyVideo[]>([])
  const [totalVideos, setTotalVideos] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const perPage = 50

  // Selección
  const [selectedLibroId, setSelectedLibroId] = useState('')
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set())

  // Filtros
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<number | ''>('')
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // UI state
  const [loadingLibros, setLoadingLibros] = useState(false)
  const [loadingVideos, setLoadingVideos] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [linking, setLinking] = useState(false)
  const [linkProgress, setLinkProgress] = useState(0)
  const [message, setMessage] = useState<{ type: 'success' | 'danger' | 'info'; text: string } | null>(null)

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

  /* ── Cargar videos (con búsqueda server-side y paginación) ── */
  const loadVideos = useCallback(
    async (page = 1, append = false) => {
      if (page === 1) setLoadingVideos(true)
      else setLoadingMore(true)

      try {
        const params = new URLSearchParams({
          page: String(page),
          perPage: String(perPage),
        })
        if (searchQuery.trim()) params.set('search', searchQuery.trim())

        const res = await fetch(`/api/bunny/videos?${params}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || data.Message || 'Error al cargar videos')

        const list: BunnyVideo[] = Array.isArray(data.items) ? data.items : Array.isArray(data) ? data : []
        const total = data.totalItems ?? data.total ?? list.length

        if (append) {
          setVideos((prev) => [...prev, ...list])
        } else {
          setVideos(list)
          setSelectedVideoIds(new Set())
        }
        setTotalVideos(total)
        setCurrentPage(page)
      } catch (e: unknown) {
        setMessage({ type: 'danger', text: e instanceof Error ? e.message : 'Error al cargar videos' })
      } finally {
        setLoadingVideos(false)
        setLoadingMore(false)
      }
    },
    [searchQuery]
  )

  // Cargar al montar
  useEffect(() => { loadLibros() }, [])
  useEffect(() => { loadVideos(1) }, [searchQuery])

  /* ── Búsqueda con debounce ─────────────────────────── */
  const handleSearchChange = (val: string) => {
    setSearchInput(val)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      setSearchQuery(val)
    }, 400)
  }

  const clearSearch = () => {
    setSearchInput('')
    setSearchQuery('')
  }

  /* ── Filtro local por status ───────────────────────── */
  const filteredVideos = statusFilter !== ''
    ? videos.filter((v) => v.status === statusFilter)
    : videos

  /* ── Selección ─────────────────────────────────────── */
  const toggleVideo = (id: string) => {
    setSelectedVideoIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllFiltered = () => {
    const allIds = filteredVideos.map((v) => vid(v))
    const allSelected = allIds.every((id) => selectedVideoIds.has(id))
    if (allSelected) {
      // Deseleccionar los filtrados
      setSelectedVideoIds((prev) => {
        const next = new Set(prev)
        allIds.forEach((id) => next.delete(id))
        return next
      })
    } else {
      // Seleccionar todos los filtrados (sin borrar selección previa)
      setSelectedVideoIds((prev) => {
        const next = new Set(prev)
        allIds.forEach((id) => next.add(id))
        return next
      })
    }
  }

  const clearSelection = () => setSelectedVideoIds(new Set())

  /* ── Vincular ──────────────────────────────────────── */
  const handleVincular = async () => {
    if (!selectedLibroId) {
      setMessage({ type: 'danger', text: 'Selecciona un libro' })
      return
    }
    const toLink = videos.filter((v) => selectedVideoIds.has(vid(v)))
    if (toLink.length === 0) {
      setMessage({ type: 'danger', text: 'Selecciona al menos un video' })
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
          videos: toLink.map((v) => ({ id: vid(v), nombre: vtitle(v) })),
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
        setMessage({ type: 'success', text: `${creados} video(s) vinculados correctamente al libro.` })
      }
      setSelectedVideoIds(new Set())
    } catch (e: unknown) {
      setMessage({ type: 'danger', text: e instanceof Error ? e.message : 'Error al vincular' })
    } finally {
      setLinking(false)
    }
  }

  /* ── Cargar más ────────────────────────────────────── */
  const hasMore = videos.length < totalVideos
  const loadMore = () => loadVideos(currentPage + 1, true)

  /* ── Contadores ────────────────────────────────────── */
  const selectedCount = selectedVideoIds.size
  const filteredSelectedCount = filteredVideos.filter((v) => selectedVideoIds.has(vid(v))).length
  const allFilteredSelected = filteredVideos.length > 0 && filteredVideos.every((v) => selectedVideoIds.has(vid(v)))

  /* ── Obtener label del libro seleccionado ─────────── */
  const selectedLibroLabel = (() => {
    const libro = libros.find((l) => String((l as LibroMira).documentId ?? l.id) === selectedLibroId)
    if (!libro) return ''
    const att = libro.attributes
    const libroData = att?.libro?.data?.attributes ?? att?.libro?.attributes ?? att?.libro ?? libro.libro
    return libroData?.nombre_libro ?? ''
  })()

  return (
    <div>
      {/* ── Mensajes ────────────────────────────────────── */}
      {message && (
        <Alert variant={message.type} dismissible onClose={() => setMessage(null)} className="mb-3">
          {message.text}
        </Alert>
      )}

      {/* ── Selector de libro ───────────────────────────── */}
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

      {/* ── Barra de búsqueda y filtros ─────────────────── */}
      <Card className="mb-3">
        <CardBody className="py-3">
          <div className="d-flex align-items-center gap-2 mb-2">
            <LuVideo size={18} className="text-muted" />
            <span className="fw-semibold">Videos en Bunny</span>
            <Badge bg="secondary" className="ms-1">{totalVideos} total</Badge>
            {videos.length < totalVideos && (
              <Badge bg="outline-secondary" text="dark" className="border">{videos.length} cargados</Badge>
            )}
            <Button
              variant="outline-secondary"
              size="sm"
              className="ms-auto"
              onClick={() => loadVideos(1)}
              disabled={loadingVideos}
              title="Recargar"
            >
              <LuRefreshCw size={14} className={loadingVideos ? 'spin-animation' : ''} />
            </Button>
          </div>

          <div className="row g-2">
            {/* Búsqueda */}
            <div className="col-12 col-md-7">
              <InputGroup size="sm">
                <InputGroup.Text><LuSearch size={14} /></InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Buscar videos por nombre (búsqueda en servidor)..."
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
            </div>
            {/* Filtro por status */}
            <div className="col-6 col-md-3">
              <InputGroup size="sm">
                <InputGroup.Text><LuFilter size={14} /></InputGroup.Text>
                <Form.Select
                  size="sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value === '' ? '' : Number(e.target.value))}
                  disabled={linking}
                >
                  <option value="">Todos los estados</option>
                  {Object.entries(BUNNY_STATUS).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </Form.Select>
              </InputGroup>
            </div>
            {/* Acciones de selección */}
            <div className="col-6 col-md-2">
              <div className="d-flex gap-1">
                <OverlayTrigger overlay={<Tooltip>{allFilteredSelected ? 'Deseleccionar filtrados' : 'Seleccionar todos los filtrados'}</Tooltip>}>
                  <Button
                    variant={allFilteredSelected ? 'primary' : 'outline-primary'}
                    size="sm"
                    onClick={selectAllFiltered}
                    disabled={linking || filteredVideos.length === 0}
                    className="flex-grow-1"
                  >
                    <LuCheckCheck size={14} className="me-1" />
                    {allFilteredSelected ? 'Quitar' : 'Todos'}
                  </Button>
                </OverlayTrigger>
                {selectedCount > 0 && (
                  <OverlayTrigger overlay={<Tooltip>Limpiar selección ({selectedCount})</Tooltip>}>
                    <Button variant="outline-danger" size="sm" onClick={clearSelection}>
                      <LuTrash2 size={14} />
                    </Button>
                  </OverlayTrigger>
                )}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* ── Lista de videos ─────────────────────────────── */}
      <div className="border rounded overflow-auto mb-3" style={{ maxHeight: 480 }}>
        {loadingVideos ? (
          <div className="p-5 text-center">
            <Spinner animation="border" className="mb-2" />
            <p className="text-muted mb-0">Cargando videos...</p>
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="p-5 text-center text-muted">
            <LuVideo size={32} className="mb-2 opacity-50" />
            <p className="mb-0">
              {searchQuery ? 'No se encontraron videos con esa búsqueda.' : 'No hay videos disponibles.'}
            </p>
          </div>
        ) : (
          <>
            {filteredVideos.map((v) => {
              const id = vid(v)
              const isSelected = selectedVideoIds.has(id)
              const st = BUNNY_STATUS[v.status ?? -1]

              return (
                <div
                  key={id}
                  onClick={() => !linking && toggleVideo(id)}
                  className={`d-flex align-items-center gap-3 px-3 py-2 border-bottom cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-primary bg-opacity-10 border-start border-primary border-3'
                      : 'bg-white hover-bg-light'
                  }`}
                  style={{ cursor: linking ? 'not-allowed' : 'pointer' }}
                >
                  {/* Checkbox visual */}
                  <div className="flex-shrink-0">
                    {isSelected ? (
                      <LuSquareCheck size={20} className="text-primary" />
                    ) : (
                      <div
                        className="border rounded"
                        style={{ width: 20, height: 20, borderColor: '#ced4da' }}
                      />
                    )}
                  </div>

                  {/* Info del video */}
                  <div className="flex-grow-1 min-w-0">
                    <div className="d-flex align-items-center gap-2">
                      <span
                        className={`text-truncate small ${isSelected ? 'fw-semibold' : ''}`}
                        title={vtitle(v)}
                      >
                        {vtitle(v)}
                      </span>
                    </div>
                    <div className="d-flex align-items-center gap-2 mt-1">
                      {st && (
                        <Badge bg={st.color} className="fw-normal" style={{ fontSize: '0.65rem' }}>
                          {st.label}
                        </Badge>
                      )}
                      {v.length != null && v.length > 0 && (
                        <span className="text-muted" style={{ fontSize: '0.7rem' }}>
                          {formatDur(v.length)}
                        </span>
                      )}
                      {v.storageSize != null && v.storageSize > 0 && (
                        <span className="text-muted" style={{ fontSize: '0.7rem' }}>
                          {formatSize(v.storageSize)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Indicador de selección */}
                  {isSelected && (
                    <LuCircleCheck size={16} className="text-primary flex-shrink-0" />
                  )}
                </div>
              )
            })}

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
                      Cargar más ({videos.length} de {totalVideos})
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Barra de acción fija ─────────────────────────── */}
      <Card className={`border-2 ${selectedCount > 0 ? 'border-primary' : 'border-light'}`}>
        <CardBody className="py-3">
          {linking && <ProgressBar now={linkProgress} animated className="mb-2" style={{ height: 4 }} />}

          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
            {/* Resumen de selección */}
            <div className="d-flex align-items-center gap-2">
              {selectedCount > 0 ? (
                <>
                  <Badge bg="primary" className="fs-6 px-3 py-2">
                    {selectedCount} video{selectedCount !== 1 ? 's' : ''} seleccionado{selectedCount !== 1 ? 's' : ''}
                  </Badge>
                  {selectedLibroLabel && (
                    <span className="text-muted small">
                      para <strong>{selectedLibroLabel}</strong>
                    </span>
                  )}
                </>
              ) : (
                <span className="text-muted small">
                  Haz clic en los videos para seleccionarlos, o usa &quot;Todos&quot; para seleccionar los filtrados.
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
                  Vincular {selectedCount > 0 ? `${selectedCount} video(s)` : ''}
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
        .hover-bg-light:hover {
          background-color: #f8f9fa !important;
        }
        .cursor-pointer {
          cursor: pointer;
        }
        .transition-colors {
          transition: background-color 0.15s ease, border-color 0.15s ease;
        }
      `}</style>
    </div>
  )
}
