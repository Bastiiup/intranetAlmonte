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
  Spinner,
  OverlayTrigger,
  Tooltip,
} from 'react-bootstrap'
import {
  LuUpload,
  LuX,
  LuCheck,
  LuClock,
  LuFileVideo,
  LuTrash2,
  LuWand,
  LuTriangleAlert,
} from 'react-icons/lu'
import * as tus from 'tus-js-client'

/* ── Constantes ────────────────────────────────────────────────── */
const CONCURRENCY = 3

// Valores del enum en Strapi (deben coincidir con schema.json recurso-mira)
const SECCIONES = [
  'Teorico',
  'Ensayo',
  'Ejercitacion',
  'Solucionario',
  'Clase_Grabada',
  'Marco_Teorico',
  'Evaluacion_Matematicas_M1',
  'Evaluacion_Matematicas_M2',
  'Otro',
] as const
type Seccion = (typeof SECCIONES)[number]

// Labels legibles para el usuario en los selects
const SECCION_LABELS: Record<Seccion, string> = {
  Teorico: 'Teórico',
  Ensayo: 'Ensayo',
  Ejercitacion: 'Ejercitación',
  Solucionario: 'Solucionario',
  Clase_Grabada: 'Clase Grabada',
  Marco_Teorico: 'Marco Teórico',
  Evaluacion_Matematicas_M1: 'Evaluación Matemáticas M1',
  Evaluacion_Matematicas_M2: 'Evaluación Matemáticas M2',
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
  // Metadata editable
  titulo: string
  capitulo: string
  seccion: Seccion
  subSeccion: string
  numeroEjercicio: string
  contenido: string
  duracionSegundos: number | null
  duracionDetectando: boolean
  duracionAutodetectada: boolean // si fue detectada automáticamente
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/* ── Diccionarios de mapeo para nomenclatura del cliente ──────────── */

// Mapeo LITERAL del primer paréntesis → Sección (valor enum de Strapi)
// Orden importa: reglas más específicas primero
const SECCION_MAP: [RegExp, Seccion][] = [
  // Evaluaciones específicas por módulo
  [/Eval\.?\s*M1/i, 'Evaluacion_Matematicas_M1'],   // (Eval. M1) → Evaluación Matemáticas M1
  [/Eval\.?\s*M2/i, 'Evaluacion_Matematicas_M2'],   // (Eval. M2) → Evaluación Matemáticas M2
  // Marco Teórico (antes que Teórico genérico)
  [/M\.\s*Te[oó]ri/i, 'Marco_Teorico'],             // (M. Teorico) → Marco Teórico
  [/Marco\s*Te[oó]ri/i, 'Marco_Teorico'],           // (Marco Teorico) → Marco Teórico
  // Genéricos
  [/Te[oó]ri/i, 'Teorico'],                          // (Teorico) → Teórico
  [/Ensayo/i, 'Ensayo'],
  [/Ejercit/i, 'Ejercitacion'],
  [/Soluci[oó]n/i, 'Solucionario'],
  [/Clase/i, 'Clase_Grabada'],
]

// Segundo grupo → Sub-sección (texto libre, no enum)
const SUB_SECCION_MAP: [RegExp, string][] = [
  [/Ejer\.|Ejercicio/i, 'Ejercicio'],
  [/Ejem\.|Ejemplo/i, 'Ejemplo'],
  [/Lectura/i, 'Lectura'],
  [/Soluci[oó]n/i, 'Solución'],
  [/Resumen/i, 'Resumen'],
  [/Pr[aá]ctica/i, 'Práctica'],
]

/* ── Autodetección de metadata desde nombre de archivo ────────────── */
type ParseResult = {
  ejercicio: string
  capitulo: string
  seccion: Seccion | null
  subSeccion: string
  tituloGenerado: string
}

function parseFilename(filename: string): ParseResult {
  const name = filename.replace(/\.[^.]+$/, '') // quitar extensión

  // ── Intentar formato estándar del cliente ──
  // Formato: (Sección Abreviada) - (Sub Categoría) (Número).ext
  // Ejemplo: "(Eval. M1) - Ejer. 65.mkv", "(M. Teorico) - Ejem. 12.mp4"
  const clientFormat = name.match(
    /^\(([^)]+)\)\s*-\s*(.+?)(?:\s+(\d+[a-zA-Z]?(?:\.\d+)?))?$/
  )

  if (clientFormat) {
    const [, primerGrupo, segundoGrupo, numero] = clientFormat

    // Mapear sección desde primer grupo (reglas literales)
    let seccion: Seccion | null = null
    for (const [regex, sec] of SECCION_MAP) {
      if (regex.test(primerGrupo)) {
        seccion = sec
        break
      }
    }
    if (!seccion) seccion = 'Otro'

    // Mapear sub-sección desde segundo grupo
    let subSeccion = ''
    for (const [regex, sub] of SUB_SECCION_MAP) {
      if (regex.test(segundoGrupo)) {
        subSeccion = sub
        break
      }
    }
    if (!subSeccion) subSeccion = segundoGrupo.trim()

    const ejercicio = numero || ''

    // Generar título personalizado: "[Sección Label] - [Sub-Sección] [Número]"
    const secLabel = SECCION_LABELS[seccion]
    const tituloGenerado = [
      secLabel,
      ' - ',
      subSeccion,
      ejercicio ? ` ${ejercicio}` : '',
    ].join('')

    return {
      ejercicio,
      capitulo: '', // NO se puede deducir del nombre → vacío
      seccion,
      subSeccion,
      tituloGenerado,
    }
  }

  // ── Fallback: lógica genérica para archivos sin formato estándar ──
  let ejercicio = ''
  let capitulo = ''
  let seccion: Seccion | null = null
  let subSeccion = ''

  // Número de ejercicio
  const ejerMatch = name.match(/(?:Ejer\.?|Ejercicio|Ej\.?)\s*(?:N°?\s*)?(\d+[a-zA-Z]?(?:\.\d+)?)/i)
  if (ejerMatch) ejercicio = ejerMatch[1]

  // Sub-sección
  for (const [regex, sub] of SUB_SECCION_MAP) {
    if (regex.test(name)) { subSeccion = sub; break }
  }

  // Capítulo
  const capMatch = name.match(/(?:Cap[íi]?tulo|Cap\.?)\s*(\d+[a-zA-Z]?)/i)
  if (capMatch) capitulo = capMatch[1]

  // Sección (usa los mismos mapeos literales)
  for (const [regex, sec] of SECCION_MAP) {
    if (regex.test(name)) { seccion = sec; break }
  }

  return {
    ejercicio,
    capitulo,
    seccion,
    subSeccion,
    tituloGenerado: '',
  }
}

/* ── Formatear duración ──────────────────────────────────── */
function formatDuration(seconds: number | null): string {
  if (seconds == null || seconds <= 0) return ''
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

/* ── Detectar duración de un archivo de video local ────────── */
function detectDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    // Timeout de 8s para archivos donde el navegador no soporta el codec (ej: MKV)
    const timeout = setTimeout(() => {
      URL.revokeObjectURL(url)
      resolve(0)
    }, 8000)

    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      clearTimeout(timeout)
      const dur = Math.round(video.duration)
      URL.revokeObjectURL(url)
      resolve(isNaN(dur) || !isFinite(dur) ? 0 : dur)
    }
    video.onerror = () => {
      clearTimeout(timeout)
      URL.revokeObjectURL(url)
      resolve(0)
    }
    video.src = url
  })
}

/* ── Estilos reutilizables para inputs inline ──────────────── */
const INPUT_STYLE: React.CSSProperties = { fontSize: '0.8rem' }
const INPUT_CLS = 'border-0 bg-transparent px-1'
const INPUT_CLS_FOCUS = 'px-1'

/* ── Componente principal ──────────────────────────────────── */
export default function BunnyUploaderTab() {
  const [items, setItems] = useState<FileItem[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)
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
      const rawName = file.name.replace(/\.[^.]+$/, '')
      return {
        file,
        id: generateId(),
        status: 'pending',
        progress: 0,
        titulo: parsed.tituloGenerado || rawName,
        capitulo: parsed.capitulo,
        seccion: parsed.seccion || 'Teorico',
        subSeccion: parsed.subSeccion,
        numeroEjercicio: parsed.ejercicio,
        contenido: '',
        duracionSegundos: null,
        duracionDetectando: true,
        duracionAutodetectada: false,
      }
    })

    setItems((prev) => [...prev, ...newItems])
    setGlobalError(null)

    // Detectar duración de cada archivo en paralelo
    for (const item of newItems) {
      detectDuration(item.file).then((dur) => {
        setItems((prev) =>
          prev.map((it) =>
            it.id === item.id
              ? {
                  ...it,
                  duracionSegundos: dur > 0 ? dur : it.duracionSegundos,
                  duracionDetectando: false,
                  duracionAutodetectada: dur > 0,
                }
              : it
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
      updateItem(item.id, { status: 'uploading', progress: 2 })
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

        updateItem(item.id, { progress: 5 })

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
              updateItem(item.id, { progress: Math.min(95, Math.max(pct, 5)) })
            },
            onSuccess: () => resolve(),
            onError: (error) => reject(error),
          })
          upload.start()
        })

        updateItem(item.id, { progress: 97 })

        // 3) Registrar en Strapi con metadata actualizada de la fila
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
  }, [])

  const clearAll = useCallback(() => { setItems([]); setGlobalError(null) }, [])

  /* ── Metadata global (aplicar individualmente por campo) ── */
  const [globalCapitulo, setGlobalCapitulo] = useState('')
  const [globalSeccion, setGlobalSeccion] = useState<Seccion | ''>('')
  const [globalSubSeccion, setGlobalSubSeccion] = useState('')
  const [globalContenido, setGlobalContenido] = useState('')

  const applyField = useCallback((field: keyof FileItem, value: string) => {
    if (!value) return
    setItems((prev) =>
      prev.map((it) =>
        it.status === 'pending' ? { ...it, [field]: value } : it
      )
    )
  }, [])

  /* ── Resumen ──────────────────────────────────────────── */
  const doneCount = items.filter((i) => i.status === 'done').length
  const errorCount = items.filter((i) => i.status === 'error').length
  const pendingCount = items.filter((i) => i.status === 'pending').length
  const uploadingCount = items.filter((i) => i.status === 'uploading').length
  const total = items.length
  const totalProgress = total ? Math.round(items.reduce((a, i) => a + i.progress, 0) / total) : 0

  /* ── Helper: color de la barra según estado ──────────── */
  const progressVariant = (it: FileItem) => {
    if (it.status === 'done') return 'success'
    if (it.status === 'error') return 'danger'
    if (it.status === 'uploading') return undefined // default azul
    return 'warning'
  }

  return (
    <Card>
      <CardBody>
        {/* ── Zona de Drag & Drop ─────────────────────────── */}
        <p className="text-muted mb-3">
          Arrastra archivos de video o haz clic para seleccionar. Edita la metadata directamente en
          la tabla antes de subir.
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
          className={`border-2 border-dashed rounded-3 p-4 text-center ${
            isDragging ? 'border-primary bg-primary bg-opacity-10' : 'border-secondary'
          }`}
          style={{ cursor: isUploading ? 'not-allowed' : 'pointer', minHeight: 100 }}
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
          <LuUpload size={28} className="text-muted mb-1" />
          <p className="mb-0 text-muted small">
            {isDragging ? 'Suelta los archivos aquí' : 'Arrastra videos o haz clic para elegir'}
          </p>
        </div>

        {/* ── Panel cuando hay archivos ────────────────────── */}
        {total > 0 && (
          <>
            {/* Barra de resumen */}
            <div className="d-flex flex-wrap gap-2 align-items-center mt-3 mb-2">
              <Badge bg="secondary">{total} archivos</Badge>
              {pendingCount > 0 && <Badge bg="warning" text="dark">{pendingCount} pendientes</Badge>}
              {uploadingCount > 0 && <Badge bg="info">{uploadingCount} subiendo</Badge>}
              {doneCount > 0 && <Badge bg="success">{doneCount} completados</Badge>}
              {errorCount > 0 && <Badge bg="danger">{errorCount} errores</Badge>}
              <div className="ms-auto d-flex gap-2">
                <Button variant="outline-danger" size="sm" onClick={clearAll} disabled={isUploading}>
                  <LuTrash2 className="me-1" size={14} />
                  Limpiar
                </Button>
              </div>
            </div>

            {isUploading && (
              <ProgressBar now={totalProgress} label={`Total: ${totalProgress}%`} className="mb-3" style={{ height: 8 }} />
            )}

            {/* ── Metadata global (aplicar individualmente) ── */}
            <Card className="mb-3 border-primary border-opacity-25">
              <CardBody className="py-2 px-3">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <LuWand size={14} className="text-primary" />
                  <span className="fw-semibold small text-primary">
                    Aplicar a los {pendingCount} pendientes
                  </span>
                  <span className="text-muted small ms-1">(cada campo por separado)</span>
                </div>
                <div className="row g-2 align-items-end">
                  {/* Capítulo */}
                  <div className="col-6 col-md-3">
                    <Form.Label className="small mb-0 text-muted">Capítulo</Form.Label>
                    <div className="d-flex gap-1">
                      <Form.Control
                        type="text"
                        placeholder="ej. 1, 2A"
                        value={globalCapitulo}
                        onChange={(e) => setGlobalCapitulo(e.target.value)}
                        size="sm"
                        disabled={isUploading}
                      />
                      <OverlayTrigger overlay={<Tooltip>Aplicar capítulo &quot;{globalCapitulo || '...'}&quot; a todos los pendientes</Tooltip>}>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => applyField('capitulo', globalCapitulo)}
                          disabled={isUploading || pendingCount === 0 || !globalCapitulo}
                          className="flex-shrink-0"
                        >
                          <LuCheck size={14} />
                        </Button>
                      </OverlayTrigger>
                    </div>
                  </div>
                  {/* Sección */}
                  <div className="col-6 col-md-3">
                    <Form.Label className="small mb-0 text-muted">Sección</Form.Label>
                    <div className="d-flex gap-1">
                      <Form.Select
                        size="sm"
                        value={globalSeccion}
                        onChange={(e) => setGlobalSeccion(e.target.value as Seccion | '')}
                        disabled={isUploading}
                      >
                        <option value="">-- Elegir --</option>
                        {SECCIONES.map((s) => (
                          <option key={s} value={s}>{SECCION_LABELS[s]}</option>
                        ))}
                      </Form.Select>
                      <OverlayTrigger overlay={<Tooltip>Aplicar sección a todos los pendientes</Tooltip>}>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => applyField('seccion', globalSeccion)}
                          disabled={isUploading || pendingCount === 0 || !globalSeccion}
                          className="flex-shrink-0"
                        >
                          <LuCheck size={14} />
                        </Button>
                      </OverlayTrigger>
                    </div>
                  </div>
                  {/* Sub-Sección */}
                  <div className="col-6 col-md-3">
                    <Form.Label className="small mb-0 text-muted">Sub-Sección</Form.Label>
                    <div className="d-flex gap-1">
                      <Form.Control
                        type="text"
                        placeholder="ej. Ec. Cuadráticas"
                        value={globalSubSeccion}
                        onChange={(e) => setGlobalSubSeccion(e.target.value)}
                        size="sm"
                        disabled={isUploading}
                      />
                      <OverlayTrigger overlay={<Tooltip>Aplicar sub-sección a todos los pendientes</Tooltip>}>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => applyField('subSeccion', globalSubSeccion)}
                          disabled={isUploading || pendingCount === 0 || !globalSubSeccion}
                          className="flex-shrink-0"
                        >
                          <LuCheck size={14} />
                        </Button>
                      </OverlayTrigger>
                    </div>
                  </div>
                  {/* Contenido / Tema */}
                  <div className="col-6 col-md-3">
                    <Form.Label className="small mb-0 text-muted">Contenido / Tema</Form.Label>
                    <div className="d-flex gap-1">
                      <Form.Control
                        type="text"
                        placeholder="ej: NÚMEROS ENTEROS"
                        value={globalContenido}
                        onChange={(e) => setGlobalContenido(e.target.value.toUpperCase())}
                        size="sm"
                        disabled={isUploading}
                      />
                      <OverlayTrigger overlay={<Tooltip>Aplicar contenido a todos los pendientes</Tooltip>}>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => applyField('contenido', globalContenido)}
                          disabled={isUploading || pendingCount === 0 || !globalContenido}
                          className="flex-shrink-0"
                        >
                          <LuCheck size={14} />
                        </Button>
                      </OverlayTrigger>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* ── Lista de edición masiva inline ────────────── */}
            <div style={{ maxHeight: 600, overflowY: 'auto' }}>
              {items.map((it, idx) => {
                const canEdit = it.status === 'pending'
                const isMkv = /\.mkv$/i.test(it.file.name)
                const durFailed = !it.duracionDetectando && (!it.duracionSegundos || it.duracionSegundos <= 0)

                return (
                  <Card
                    key={it.id}
                    className={`mb-2 ${
                      it.status === 'error'
                        ? 'border-danger'
                        : it.status === 'done'
                        ? 'border-success'
                        : it.status === 'uploading'
                        ? 'border-info'
                        : 'border-light'
                    }`}
                  >
                    <CardBody className="py-2 px-3">
                      {/* ── Fila 1: Archivo + Estado + Progreso ── */}
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <span className="text-muted small fw-bold" style={{ minWidth: 20 }}>
                          {idx + 1}
                        </span>
                        <LuFileVideo size={16} className="text-muted flex-shrink-0" />
                        <span className="text-truncate small fw-semibold" title={it.file.name} style={{ maxWidth: 280 }}>
                          {it.file.name}
                        </span>
                        <span className="text-muted small flex-shrink-0">
                          ({(it.file.size / 1024 / 1024).toFixed(1)} MB)
                        </span>

                        {/* Estado inline */}
                        <div className="ms-auto d-flex align-items-center gap-2">
                          {it.status === 'pending' && <Badge bg="warning" text="dark">Pendiente</Badge>}
                          {it.status === 'uploading' && (
                            <div className="d-flex align-items-center gap-2" style={{ minWidth: 160 }}>
                              <Spinner animation="border" size="sm" />
                              <ProgressBar
                                now={it.progress}
                                variant="info"
                                animated
                                style={{ width: 100, height: 10 }}
                              />
                              <span className="small fw-bold">{it.progress}%</span>
                            </div>
                          )}
                          {it.status === 'done' && (
                            <OverlayTrigger overlay={<Tooltip>Bunny ID: {it.videoId}</Tooltip>}>
                              <Badge bg="success">
                                <LuCheck size={12} className="me-1" />
                                Subido
                              </Badge>
                            </OverlayTrigger>
                          )}
                          {it.status === 'error' && (
                            <OverlayTrigger overlay={<Tooltip>{it.error || 'Error desconocido'}</Tooltip>}>
                              <Badge bg="danger">
                                <LuTriangleAlert size={12} className="me-1" />
                                Error
                              </Badge>
                            </OverlayTrigger>
                          )}

                          <Button
                            variant="link"
                            size="sm"
                            className="p-0 text-danger flex-shrink-0"
                            onClick={() => removeItem(it.id)}
                            disabled={it.status === 'uploading'}
                            title="Quitar de la lista"
                          >
                            <LuX size={18} />
                          </Button>
                        </div>
                      </div>

                      {/* ── Barra de progreso individual (visible solo subiendo/completado) ── */}
                      {(it.status === 'uploading' || it.status === 'done' || it.status === 'error') && (
                        <ProgressBar
                          now={it.status === 'error' ? 100 : it.progress}
                          variant={progressVariant(it)}
                          animated={it.status === 'uploading'}
                          className="mb-2"
                          style={{ height: 4 }}
                        />
                      )}

                      {/* ── Fila 2: Inputs inline directos ─────── */}
                      <div className="row g-2">
                        {/* Título */}
                        <div className="col-12 col-md-4">
                          <div className="d-flex align-items-center gap-1">
                            <Form.Label className="small mb-0 text-muted flex-shrink-0" style={{ minWidth: 42 }}>
                              Título
                            </Form.Label>
                            <Form.Control
                              type="text"
                              value={it.titulo}
                              onChange={(e) => updateItem(it.id, { titulo: e.target.value })}
                              size="sm"
                              disabled={!canEdit}
                              className={canEdit ? INPUT_CLS_FOCUS : INPUT_CLS}
                              style={INPUT_STYLE}
                              placeholder="Título del video"
                            />
                          </div>
                        </div>
                        {/* Capítulo */}
                        <div className="col-4 col-md-1">
                          <div className="d-flex align-items-center gap-1">
                            <Form.Label className="small mb-0 text-muted flex-shrink-0" style={{ minWidth: 28 }}>
                              Cap.
                            </Form.Label>
                            <Form.Control
                              type="text"
                              value={it.capitulo}
                              onChange={(e) => updateItem(it.id, { capitulo: e.target.value })}
                              size="sm"
                              disabled={!canEdit}
                              className={`text-center ${canEdit ? INPUT_CLS_FOCUS : INPUT_CLS}`}
                              style={{ ...INPUT_STYLE, maxWidth: 60 }}
                              placeholder="--"
                            />
                          </div>
                        </div>
                        {/* Sección */}
                        <div className="col-8 col-md-2">
                          <div className="d-flex align-items-center gap-1">
                            <Form.Label className="small mb-0 text-muted flex-shrink-0" style={{ minWidth: 28 }}>
                              Sec.
                            </Form.Label>
                            <Form.Select
                              size="sm"
                              value={it.seccion}
                              onChange={(e) => updateItem(it.id, { seccion: e.target.value as Seccion })}
                              disabled={!canEdit}
                              className={canEdit ? INPUT_CLS_FOCUS : INPUT_CLS}
                              style={INPUT_STYLE}
                            >
                              {SECCIONES.map((s) => (
                                <option key={s} value={s}>{SECCION_LABELS[s]}</option>
                              ))}
                            </Form.Select>
                          </div>
                        </div>
                        {/* Ejercicio */}
                        <div className="col-4 col-md-2">
                          <div className="d-flex align-items-center gap-1">
                            <Form.Label className="small mb-0 text-muted flex-shrink-0" style={{ minWidth: 32 }}>
                              Ejer.
                            </Form.Label>
                            <Form.Control
                              type="text"
                              value={it.numeroEjercicio}
                              onChange={(e) => updateItem(it.id, { numeroEjercicio: e.target.value })}
                              size="sm"
                              disabled={!canEdit}
                              className={`text-center ${canEdit ? INPUT_CLS_FOCUS : INPUT_CLS}`}
                              style={{ ...INPUT_STYLE, maxWidth: 70 }}
                              placeholder="--"
                            />
                          </div>
                        </div>
                        {/* Duración (editable si no se detectó) */}
                        <div className="col-8 col-md-3">
                          <div className="d-flex align-items-center gap-1">
                            <LuClock size={14} className="text-muted flex-shrink-0" />
                            {it.duracionDetectando ? (
                              <div className="d-flex align-items-center gap-1">
                                <Spinner animation="border" size="sm" className="text-muted" />
                                <span className="small text-muted">Detectando...</span>
                              </div>
                            ) : (
                              <>
                                <Form.Control
                                  type="number"
                                  value={it.duracionSegundos ?? ''}
                                  onChange={(e) => {
                                    const val = e.target.value ? parseInt(e.target.value, 10) : null
                                    updateItem(it.id, { duracionSegundos: val })
                                  }}
                                  size="sm"
                                  disabled={!canEdit}
                                  className={`text-center ${canEdit ? INPUT_CLS_FOCUS : INPUT_CLS}`}
                                  style={{ ...INPUT_STYLE, maxWidth: 75 }}
                                  placeholder="seg."
                                  min={0}
                                />
                                <span className="small text-muted flex-shrink-0">
                                  {it.duracionSegundos && it.duracionSegundos > 0
                                    ? formatDuration(it.duracionSegundos)
                                    : ''}
                                </span>
                                {durFailed && (
                                  <OverlayTrigger
                                    overlay={
                                      <Tooltip>
                                        {isMkv
                                          ? 'MKV: el navegador no puede leer la duración. Ingresala manualmente en segundos.'
                                          : 'No se pudo detectar la duración. Ingresala manualmente en segundos.'}
                                      </Tooltip>
                                    }
                                  >
                                    <LuTriangleAlert size={14} className="text-warning flex-shrink-0" />
                                  </OverlayTrigger>
                                )}
                                {it.duracionAutodetectada && it.duracionSegundos && it.duracionSegundos > 0 && (
                                  <OverlayTrigger overlay={<Tooltip>Duración auto-detectada. Puedes editarla.</Tooltip>}>
                                    <LuCheck size={14} className="text-success flex-shrink-0" />
                                  </OverlayTrigger>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* ── Fila 3: Sub-Sección + Contenido (siempre visible, inline) ── */}
                      <div className="row g-2 mt-1">
                        <div className="col-12 col-md-4">
                          <div className="d-flex align-items-center gap-1">
                            <Form.Label className="small mb-0 text-muted flex-shrink-0" style={{ minWidth: 65 }}>
                              Sub-Sec.
                            </Form.Label>
                            <Form.Control
                              type="text"
                              value={it.subSeccion}
                              onChange={(e) => updateItem(it.id, { subSeccion: e.target.value })}
                              size="sm"
                              disabled={!canEdit}
                              className={canEdit ? INPUT_CLS_FOCUS : INPUT_CLS}
                              style={INPUT_STYLE}
                              placeholder="ej: Ecuaciones Cuadráticas"
                            />
                          </div>
                        </div>
                        <div className="col-12 col-md-8">
                          <div className="d-flex align-items-start gap-1">
                            <Form.Label className="small mb-0 text-muted flex-shrink-0 pt-1" style={{ minWidth: 60 }}>
                              Contenido
                            </Form.Label>
                            <Form.Control
                              as="textarea"
                              rows={1}
                              value={it.contenido}
                              onChange={(e) => updateItem(it.id, { contenido: e.target.value })}
                              size="sm"
                              disabled={!canEdit}
                              className={canEdit ? INPUT_CLS_FOCUS : INPUT_CLS}
                              style={{ ...INPUT_STYLE, resize: 'vertical', minHeight: 30 }}
                              placeholder="Descripción, teoría asociada..."
                            />
                          </div>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                )
              })}
            </div>

            {/* ── Botón principal de subida ─────────────────── */}
            <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
              <p className="small text-muted mb-0">
                Subida en paralelo (x{CONCURRENCY}). Toda la metadata se guarda en Strapi al completar.
              </p>
              <Button
                variant="primary"
                size="lg"
                onClick={() => runQueue()}
                disabled={isUploading || pendingCount === 0}
              >
                {isUploading ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Subiendo... ({doneCount}/{total})
                  </>
                ) : (
                  <>
                    <LuUpload className="me-2" />
                    Procesar y Subir Todo ({pendingCount})
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
