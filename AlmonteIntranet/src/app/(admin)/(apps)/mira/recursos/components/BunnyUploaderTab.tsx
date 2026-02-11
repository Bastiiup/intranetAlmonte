'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  Card,
  CardBody,
  ProgressBar,
  Button,
  Alert,
  Form,
  Badge,
  Table,
  Spinner,
  OverlayTrigger,
  Tooltip,
} from 'react-bootstrap'
import {
  LuUpload,
  LuX,
  LuPencil,
  LuCheck,
  LuClock,
  LuFileVideo,
  LuTrash2,
  LuChevronDown,
  LuChevronUp,
  LuWand2,
  LuPlay,
} from 'react-icons/lu'
import * as tus from 'tus-js-client'

/* ── Constantes ────────────────────────────────────────────────── */
const CONCURRENCY = 3
const SECCIONES = ['Teorico', 'Ensayo', 'Ejercitacion', 'Solucionario', 'Clase_Grabada', 'Otro'] as const
type Seccion = (typeof SECCIONES)[number]

const SECCION_LABELS: Record<Seccion, string> = {
  Teorico: 'Teórico',
  Ensayo: 'Ensayo',
  Ejercitacion: 'Ejercitación',
  Solucionario: 'Solucionario',
  Clase_Grabada: 'Clase Grabada',
  Otro: 'Otro',
}

/* ── Tipo FileItem con metadata editable por fila ──────────────── */
type FileItem = {
  file: File
  id: string
  status: 'pending' | 'uploading' | 'done' | 'error'
  progress: number
  error?: string
  videoId?: string
  // Metadata editable por fila
  titulo: string
  capitulo: string
  seccion: Seccion
  subSeccion: string
  numeroEjercicio: string
  contenido: string
  duracionSegundos: number | null // autodetectado
  duracionDetectando: boolean
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/* ── Regex para autodetección de metadata desde nombre de archivo ── */
function parseFilename(filename: string): {
  ejercicio: string
  capitulo: string
  seccion: Seccion | null
} {
  const name = filename.replace(/\.[^.]+$/, '') // quitar extensión
  let ejercicio = ''
  let capitulo = ''
  let seccion: Seccion | null = null

  // Detectar número de ejercicio: "Ejer. 62", "Ejercicio 15b", "Ej 3.2", "Ej. N°62"
  const ejerMatch = name.match(/(?:Ejer\.?|Ejercicio|Ej\.?)\s*(?:N°?\s*)?(\d+[a-zA-Z]?(?:\.\d+)?)/i)
  if (ejerMatch) ejercicio = ejerMatch[1]

  // Detectar capítulo: "Cap 1", "Cap. 2A", "Capítulo 3", "C1", "(C1)"
  const capMatch = name.match(/(?:Cap[íi]?tulo|Cap\.?|C)\s*(\d+[a-zA-Z]?)/i)
  if (capMatch) capitulo = capMatch[1]

  // Detectar sección desde nombre
  const lower = name.toLowerCase()
  if (/te[oó]ri/i.test(lower)) seccion = 'Teorico'
  else if (/ensayo/i.test(lower)) seccion = 'Ensayo'
  else if (/ejercit/i.test(lower)) seccion = 'Ejercitacion'
  else if (/solucion/i.test(lower)) seccion = 'Solucionario'
  else if (/clase/i.test(lower)) seccion = 'Clase_Grabada'

  // Detectar patrón de evaluación: "(Eval. M1)", "(Eval. L2)"
  const evalMatch = name.match(/\(Eval\.?\s*([A-Z]\d+)\)/i)
  if (evalMatch && !capitulo) capitulo = evalMatch[1]

  return { ejercicio, capitulo, seccion }
}

/* ── Formatear duración ──────────────────────────────────── */
function formatDuration(seconds: number | null): string {
  if (seconds == null || seconds <= 0) return '--:--'
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

/* ── Detectar duración de un archivo de video local ────────── */
function detectDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      const dur = Math.round(video.duration)
      URL.revokeObjectURL(url)
      resolve(isNaN(dur) ? 0 : dur)
    }
    video.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(0)
    }
    video.src = url
  })
}

/* ── Componente principal ──────────────────────────────────── */
export default function BunnyUploaderTab() {
  const [items, setItems] = useState<FileItem[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const itemsRef = useRef<FileItem[]>(items)
  const runningRef = useRef(false)

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  const updateItem = useCallback((id: string, patch: Partial<FileItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)))
  }, [])

  /* ── Agregar archivos con autodetección ───────────────── */
  const addFiles = useCallback(async (files: FileList | File[]) => {
    const list = Array.isArray(files) ? files : Array.from(files)
    const videoFiles = list.filter(
      (f) => f.type.startsWith('video/') || /\.(mp4|webm|mov|avi|mkv)$/i.test(f.name)
    )

    const newItems: FileItem[] = videoFiles.map((file) => {
      const parsed = parseFilename(file.name)
      return {
        file,
        id: generateId(),
        status: 'pending',
        progress: 0,
        titulo: file.name.replace(/\.[^.]+$/, ''),
        capitulo: parsed.capitulo,
        seccion: parsed.seccion || 'Teorico',
        subSeccion: '',
        numeroEjercicio: parsed.ejercicio,
        contenido: '',
        duracionSegundos: null,
        duracionDetectando: true,
      }
    })

    setItems((prev) => [...prev, ...newItems])
    setGlobalError(null)

    // Detectar duración de cada archivo en paralelo
    for (const item of newItems) {
      detectDuration(item.file).then((dur) => {
        setItems((prev) =>
          prev.map((it) =>
            it.id === item.id ? { ...it, duracionSegundos: dur, duracionDetectando: false } : it
          )
        )
      })
    }
  }, [])

  /* ── Cola de subida ───────────────────────────────────── */
  const runQueue = useCallback(async () => {
    if (runningRef.current) return
    const current = itemsRef.current
    const pending = current.filter((i) => i.status === 'pending')
    if (pending.length === 0) return
    runningRef.current = true
    setIsUploading(true)

    const runOne = async (item: FileItem) => {
      updateItem(item.id, { status: 'uploading', progress: 5 })
      const title = item.titulo || item.file.name.replace(/\.[^.]+$/, '')

      try {
        // 1) Crear video en Bunny y obtener firma TUS
        const res = await fetch('/api/bunny/videos/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          updateItem(item.id, { status: 'error', progress: 0, error: data.error || res.statusText })
          return
        }

        const { uploadUrl, videoId, libraryId, expires, signature } = data as {
          uploadUrl: string; videoId: string; libraryId: string; expires: number; signature: string
        }

        // 2) Subir archivo directo a Bunny via TUS
        await new Promise<void>((resolve, reject) => {
          const upload = new tus.Upload(item.file, {
            endpoint: uploadUrl,
            chunkSize: 5 * 1024 * 1024,
            retryDelays: [0, 3000, 5000, 10000],
            metadata: {
              filename: item.file.name,
              filetype: item.file.type || 'video/mp4',
            },
            headers: {
              AuthorizationSignature: signature,
              AuthorizationExpire: String(expires),
              LibraryId: String(libraryId),
              VideoId: String(videoId),
            },
            onProgress(bytesSent, bytesTotal) {
              if (!bytesTotal) return
              const pct = Math.round((bytesSent / bytesTotal) * 100)
              updateItem(item.id, { progress: Math.min(99, Math.max(pct, 10)) })
            },
            onSuccess: () => resolve(),
            onError: (error) => reject(error),
          })
          upload.start()
        })

        // 3) Registrar en Strapi con TODA la metadata de esta fila
        // Leer estado actualizado del item (el usuario puede haber editado mientras subía)
        const freshItem = itemsRef.current.find((i) => i.id === item.id) || item
        const refRes = await fetch('/api/mira/recursos/crear-referencia', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: item.file.name,
            video_id: videoId,
            tipo: 'video',
            proveedor: 'bunny_stream',
            titulo_personalizado: freshItem.titulo || undefined,
            numero_capitulo: freshItem.capitulo || undefined,
            seccion: freshItem.seccion,
            sub_seccion: freshItem.subSeccion || undefined,
            numero_ejercicio: freshItem.numeroEjercicio || undefined,
            contenido: freshItem.contenido || undefined,
            duracion_segundos: freshItem.duracionSegundos || undefined,
            orden: 0,
          }),
        })
        const refData = await refRes.json().catch(() => ({}))
        if (!refRes.ok) {
          updateItem(item.id, { status: 'error', progress: 0, error: refData.error || 'Error Strapi' })
          return
        }

        updateItem(item.id, { status: 'done', progress: 100, videoId })
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Error de red'
        updateItem(item.id, { status: 'error', progress: 0, error: msg })
        setGlobalError(msg)
      }
    }

    const batch = pending.slice(0, CONCURRENCY)
    await Promise.all(batch.map(runOne))

    const stillPending = itemsRef.current.some((i) => i.status === 'pending')
    if (stillPending) {
      runningRef.current = false
      setTimeout(runQueue, 0)
    } else {
      runningRef.current = false
      setIsUploading(false)
    }
  }, [updateItem])

  /* ── Handlers ─────────────────────────────────────────── */
  const handleDrop = useCallback(
    (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); addFiles(e.dataTransfer.files) },
    [addFiles]
  )
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }, [])
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false) }, [])

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
    if (expandedRow === id) setExpandedRow(null)
  }, [expandedRow])

  const clearAll = useCallback(() => { setItems([]); setGlobalError(null); setExpandedRow(null) }, [])

  /* ── Aplicar metadata global a todos los pendientes ──── */
  const [globalCapitulo, setGlobalCapitulo] = useState('')
  const [globalSeccion, setGlobalSeccion] = useState<Seccion>('Teorico')
  const [globalContenido, setGlobalContenido] = useState('')

  const applyGlobalToAll = useCallback(() => {
    setItems((prev) =>
      prev.map((it) =>
        it.status === 'pending'
          ? {
              ...it,
              capitulo: globalCapitulo || it.capitulo,
              seccion: globalSeccion || it.seccion,
              contenido: globalContenido || it.contenido,
            }
          : it
      )
    )
  }, [globalCapitulo, globalSeccion, globalContenido])

  /* ── Resumen ──────────────────────────────────────────── */
  const done = items.filter((i) => i.status === 'done').length
  const errors = items.filter((i) => i.status === 'error').length
  const pending = items.filter((i) => i.status === 'pending').length
  const uploading = items.filter((i) => i.status === 'uploading').length
  const total = items.length
  const totalProgress = total ? Math.round(items.reduce((a, i) => a + i.progress, 0) / total) : 0

  return (
    <Card>
      <CardBody>
        {/* ── Zona de Drag & Drop ─────────────────────────── */}
        <p className="text-muted mb-3">
          Arrastra archivos de video o haz clic para seleccionar. Podrás editar la metadata de cada
          video antes de subir.
        </p>

        {globalError && (
          <Alert variant="danger" dismissible onClose={() => setGlobalError(null)}>
            {globalError}
          </Alert>
        )}

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !isUploading && inputRef.current?.click()}
          className={`border-2 border-dashed rounded-3 p-5 text-center transition-colors ${
            isDragging ? 'border-primary bg-primary bg-opacity-10' : 'border-secondary'
          }`}
          style={{ cursor: isUploading ? 'not-allowed' : 'pointer', minHeight: 120 }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="video/*,.mp4,.webm,.mov,.avi,.mkv"
            multiple
            className="d-none"
            onChange={(e) => {
              const f = e.target.files
              if (f?.length) addFiles(f)
              e.target.value = ''
            }}
          />
          <LuUpload size={32} className="text-muted mb-2" />
          <p className="mb-0 text-muted">
            {isDragging ? 'Suelta los archivos aquí' : 'Arrastra videos o haz clic para elegir'}
          </p>
        </div>

        {/* ── Panel cuando hay archivos ────────────────────── */}
        {total > 0 && (
          <>
            {/* Barra de resumen */}
            <div className="d-flex flex-wrap gap-2 align-items-center mt-3 mb-2">
              <Badge bg="secondary">{total} archivos</Badge>
              {pending > 0 && <Badge bg="warning" text="dark">{pending} pendientes</Badge>}
              {uploading > 0 && <Badge bg="info">{uploading} subiendo</Badge>}
              {done > 0 && <Badge bg="success">{done} completados</Badge>}
              {errors > 0 && <Badge bg="danger">{errors} errores</Badge>}
              <div className="ms-auto d-flex gap-2">
                <Button variant="outline-danger" size="sm" onClick={clearAll} disabled={isUploading}>
                  <LuTrash2 className="me-1" />
                  Limpiar todo
                </Button>
              </div>
            </div>

            {isUploading && <ProgressBar now={totalProgress} label={`${totalProgress}%`} className="mb-3" />}

            {/* ── Metadata global (aplicar a todos) ────────── */}
            <Card className="mb-3 border-primary border-opacity-25">
              <CardBody className="py-3">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <LuWand2 className="text-primary" />
                  <span className="fw-semibold small text-primary">Aplicar a todos los pendientes</span>
                </div>
                <div className="row g-2">
                  <div className="col-12 col-md-3">
                    <Form.Control
                      type="text"
                      placeholder="Capítulo (ej. 1, 2A)"
                      value={globalCapitulo}
                      onChange={(e) => setGlobalCapitulo(e.target.value)}
                      size="sm"
                      disabled={isUploading}
                    />
                  </div>
                  <div className="col-12 col-md-3">
                    <Form.Select
                      size="sm"
                      value={globalSeccion}
                      onChange={(e) => setGlobalSeccion(e.target.value as Seccion)}
                      disabled={isUploading}
                    >
                      {SECCIONES.map((s) => (
                        <option key={s} value={s}>{SECCION_LABELS[s]}</option>
                      ))}
                    </Form.Select>
                  </div>
                  <div className="col-12 col-md-4">
                    <Form.Control
                      type="text"
                      placeholder="Contenido / Tema (ej: NÚMEROS ENTEROS)"
                      value={globalContenido}
                      onChange={(e) => setGlobalContenido(e.target.value.toUpperCase())}
                      size="sm"
                      disabled={isUploading}
                    />
                  </div>
                  <div className="col-12 col-md-2">
                    <Button
                      variant="outline-primary"
                      size="sm"
                      className="w-100"
                      onClick={applyGlobalToAll}
                      disabled={isUploading || pending === 0}
                    >
                      <LuCheck className="me-1" />
                      Aplicar
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* ── Tabla de edición masiva ───────────────────── */}
            <div className="table-responsive" style={{ maxHeight: 500, overflowY: 'auto' }}>
              <Table size="sm" hover className="mb-0 align-middle">
                <thead className="table-light sticky-top">
                  <tr>
                    <th style={{ width: 32 }}></th>
                    <th>Archivo</th>
                    <th style={{ width: 180 }}>Título</th>
                    <th style={{ width: 70 }}>Cap.</th>
                    <th style={{ width: 130 }}>Sección</th>
                    <th style={{ width: 70 }}>Ejer.</th>
                    <th style={{ width: 65 }}>
                      <LuClock size={14} className="me-1" />
                      Dur.
                    </th>
                    <th style={{ width: 100 }}>Estado</th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => {
                    const isExpanded = expandedRow === it.id
                    const isPending = it.status === 'pending'
                    const canEdit = isPending && !isUploading

                    return (
                      <>
                        <tr key={it.id} className={it.status === 'error' ? 'table-danger' : it.status === 'done' ? 'table-success' : ''}>
                          {/* Expand */}
                          <td>
                            <Button
                              variant="link"
                              size="sm"
                              className="p-0 text-muted"
                              onClick={() => setExpandedRow(isExpanded ? null : it.id)}
                              title="Expandir detalles"
                            >
                              {isExpanded ? <LuChevronUp size={16} /> : <LuChevronDown size={16} />}
                            </Button>
                          </td>
                          {/* Nombre archivo */}
                          <td>
                            <div className="d-flex align-items-center gap-1">
                              <LuFileVideo size={14} className="text-muted shrink-0" />
                              <span className="text-truncate small" style={{ maxWidth: 200 }} title={it.file.name}>
                                {it.file.name}
                              </span>
                              <span className="text-muted small">
                                ({(it.file.size / 1024 / 1024).toFixed(1)}MB)
                              </span>
                            </div>
                          </td>
                          {/* Título */}
                          <td>
                            <Form.Control
                              type="text"
                              value={it.titulo}
                              onChange={(e) => updateItem(it.id, { titulo: e.target.value })}
                              size="sm"
                              disabled={!canEdit}
                              className="border-0 bg-transparent px-1"
                              style={{ fontSize: '0.8rem' }}
                            />
                          </td>
                          {/* Capítulo */}
                          <td>
                            <Form.Control
                              type="text"
                              value={it.capitulo}
                              onChange={(e) => updateItem(it.id, { capitulo: e.target.value })}
                              size="sm"
                              disabled={!canEdit}
                              className="border-0 bg-transparent px-1 text-center"
                              style={{ fontSize: '0.8rem' }}
                              placeholder="--"
                            />
                          </td>
                          {/* Sección */}
                          <td>
                            <Form.Select
                              size="sm"
                              value={it.seccion}
                              onChange={(e) => updateItem(it.id, { seccion: e.target.value as Seccion })}
                              disabled={!canEdit}
                              className="border-0 bg-transparent px-1"
                              style={{ fontSize: '0.8rem' }}
                            >
                              {SECCIONES.map((s) => (
                                <option key={s} value={s}>{SECCION_LABELS[s]}</option>
                              ))}
                            </Form.Select>
                          </td>
                          {/* Ejercicio */}
                          <td>
                            <Form.Control
                              type="text"
                              value={it.numeroEjercicio}
                              onChange={(e) => updateItem(it.id, { numeroEjercicio: e.target.value })}
                              size="sm"
                              disabled={!canEdit}
                              className="border-0 bg-transparent px-1 text-center"
                              style={{ fontSize: '0.8rem' }}
                              placeholder="--"
                            />
                          </td>
                          {/* Duración */}
                          <td className="text-center">
                            {it.duracionDetectando ? (
                              <Spinner animation="border" size="sm" className="text-muted" />
                            ) : (
                              <span className="small text-muted">{formatDuration(it.duracionSegundos)}</span>
                            )}
                          </td>
                          {/* Estado */}
                          <td>
                            {it.status === 'pending' && <Badge bg="warning" text="dark">Pendiente</Badge>}
                            {it.status === 'uploading' && (
                              <div className="d-flex align-items-center gap-1">
                                <Spinner animation="border" size="sm" />
                                <span className="small">{it.progress}%</span>
                              </div>
                            )}
                            {it.status === 'done' && (
                              <OverlayTrigger overlay={<Tooltip>ID: {it.videoId}</Tooltip>}>
                                <Badge bg="success">
                                  <LuCheck size={12} className="me-1" />
                                  Listo
                                </Badge>
                              </OverlayTrigger>
                            )}
                            {it.status === 'error' && (
                              <OverlayTrigger overlay={<Tooltip>{it.error}</Tooltip>}>
                                <Badge bg="danger">Error</Badge>
                              </OverlayTrigger>
                            )}
                          </td>
                          {/* Eliminar */}
                          <td>
                            <Button
                              variant="link"
                              size="sm"
                              className="p-0 text-danger"
                              onClick={() => removeItem(it.id)}
                              disabled={it.status === 'uploading'}
                              title="Quitar"
                            >
                              <LuX size={16} />
                            </Button>
                          </td>
                        </tr>
                        {/* Fila expandida con campos extra */}
                        {isExpanded && (
                          <tr key={`${it.id}-expand`} className="bg-light">
                            <td></td>
                            <td colSpan={8}>
                              <div className="row g-2 py-2">
                                <div className="col-12 col-md-4">
                                  <Form.Group>
                                    <Form.Label className="small mb-1 fw-semibold">Sub-Sección</Form.Label>
                                    <Form.Control
                                      type="text"
                                      value={it.subSeccion}
                                      onChange={(e) => updateItem(it.id, { subSeccion: e.target.value })}
                                      size="sm"
                                      disabled={!canEdit}
                                      placeholder="ej: Ecuaciones Cuadráticas"
                                    />
                                  </Form.Group>
                                </div>
                                <div className="col-12 col-md-8">
                                  <Form.Group>
                                    <Form.Label className="small mb-1 fw-semibold">Contenido / Descripción</Form.Label>
                                    <Form.Control
                                      as="textarea"
                                      rows={2}
                                      value={it.contenido}
                                      onChange={(e) => updateItem(it.id, { contenido: e.target.value })}
                                      size="sm"
                                      disabled={!canEdit}
                                      placeholder="Descripción detallada del video, teoría asociada, etc."
                                    />
                                  </Form.Group>
                                </div>
                                <div className="col-12">
                                  <div className="d-flex flex-wrap gap-3 small text-muted">
                                    <span>
                                      <strong>Duración:</strong>{' '}
                                      {it.duracionDetectando
                                        ? 'Detectando...'
                                        : it.duracionSegundos
                                        ? `${formatDuration(it.duracionSegundos)} (${it.duracionSegundos}s)`
                                        : 'No detectada'}
                                    </span>
                                    <span>
                                      <strong>Tamaño:</strong> {(it.file.size / 1024 / 1024).toFixed(2)} MB
                                    </span>
                                    <span>
                                      <strong>Tipo:</strong> {it.file.type || 'desconocido'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })}
                </tbody>
              </Table>
            </div>

            {/* ── Botón principal de subida ─────────────────── */}
            <div className="d-flex justify-content-between align-items-center mt-3">
              <p className="small text-muted mb-0">
                Se suben de a {CONCURRENCY} en paralelo. La metadata se guarda junto al registro en Strapi.
              </p>
              <Button
                variant="primary"
                size="lg"
                onClick={() => runQueue()}
                disabled={isUploading || pending === 0}
              >
                {isUploading ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Subiendo... ({done}/{total})
                  </>
                ) : (
                  <>
                    <LuUpload className="me-2" />
                    Procesar y Subir Todo ({pending})
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </CardBody>
    </Card>
  )
}
