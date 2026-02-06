'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Card, CardBody, ProgressBar, Button, Alert } from 'react-bootstrap'
import { LuUpload, LuX } from 'react-icons/lu'
import * as tus from 'tus-js-client'

const CONCURRENCY = 3

type FileItem = {
  file: File
  id: string
  status: 'pending' | 'uploading' | 'done' | 'error'
  progress: number
  error?: string
  videoId?: string
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export default function BunnyUploaderTab() {
  const [items, setItems] = useState<FileItem[]>([])
  const [isDragging, setIsDragging] = useState(false)
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

  const runQueue = useCallback(async () => {
    if (runningRef.current) return
    const current = itemsRef.current
    const pending = current.filter((i) => i.status === 'pending')
    if (pending.length === 0) return
    runningRef.current = true

    const runOne = async (item: FileItem) => {
      updateItem(item.id, { status: 'uploading', progress: 5 })

      const title = item.file.name.replace(/\.[^.]+$/, '') || item.file.name

      try {
        // 1) Pedir a nuestra API los datos para subida directa (crear video + firma)
        const res = await fetch('/api/bunny/videos/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          updateItem(item.id, {
            status: 'error',
            progress: 0,
            error: data.error || res.statusText,
          })
          return
        }

        const { uploadUrl, videoId, libraryId, expires, signature } = data as {
          uploadUrl: string
          videoId: string
          libraryId: string
          expires: number
          signature: string
        }

        // 2) Subir archivo directo a Bunny via TUS
        await new Promise<void>((resolve, reject) => {
          const upload = new tus.Upload(item.file, {
            endpoint: uploadUrl,
            chunkSize: 5 * 1024 * 1024, // 5MB por chunk
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
            onSuccess() {
              resolve()
            },
            onError(error) {
              reject(error)
            },
          })

          upload.start()
        })

        updateItem(item.id, { status: 'done', progress: 100, videoId })
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Error de red'
        updateItem(item.id, { status: 'error', progress: 0, error: msg })
      }
    }

    const batch = pending.slice(0, CONCURRENCY)
    await Promise.all(batch.map(runOne))

    runningRef.current = false
    if (itemsRef.current.some((i) => i.status === 'pending')) setTimeout(runQueue, 0)
  }, [updateItem])

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const list = Array.isArray(files) ? files : Array.from(files)
      const videoFiles = list.filter(
        (f) => f.type.startsWith('video/') || /\.(mp4|webm|mov|avi|mkv)$/i.test(f.name)
      )
      const newItems: FileItem[] = videoFiles.map((file) => ({
        file,
        id: generateId(),
        status: 'pending',
        progress: 0,
      }))
      setItems((prev) => [...prev, ...newItems])
      setGlobalError(null)
      if (newItems.length > 0) setTimeout(runQueue, 100)
    },
    [runQueue]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      addFiles(e.dataTransfer.files)
    },
    [addFiles]
  )
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    setItems([])
    setGlobalError(null)
  }, [])

  const done = items.filter((i) => i.status === 'done').length
  const total = items.length
  const totalProgress = total ? Math.round((items.reduce((a, i) => a + i.progress, 0) / total)) : 0

  return (
    <Card>
      <CardBody>
        <p className="text-muted mb-3">
          Arrastra archivos de video o haz clic para seleccionar. Se subirán de a {CONCURRENCY} en
          paralelo para no saturar el navegador.
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
          onClick={() => inputRef.current?.click()}
          className={`border rounded-3 p-5 text-center ${isDragging ? 'border-primary bg-light' : 'border-secondary'}`}
          style={{ cursor: 'pointer', minHeight: 140 }}
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
            {isDragging ? 'Suelta los archivos aquí' : 'Arrastra videos aquí o haz clic para elegir'}
          </p>
        </div>

        {total > 0 && (
          <>
            <div className="d-flex justify-content-between align-items-center mt-3 mb-2">
              <span>
                Progreso total: {done}/{total}
              </span>
              <Button variant="outline-danger" size="sm" onClick={clearAll}>
                <LuX className="me-1" />
                Limpiar lista
              </Button>
            </div>
            <ProgressBar now={totalProgress} label={`${totalProgress}%`} className="mb-3" />
            <div className="small overflow-auto" style={{ maxHeight: 320 }}>
              {items.map((it) => (
                <div
                  key={it.id}
                  className="d-flex align-items-center gap-2 py-2 border-bottom border-light"
                >
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 text-danger"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeItem(it.id)
                    }}
                    aria-label="Quitar"
                  >
                    <LuX size={16} />
                  </Button>
                  <span className="text-truncate flex-grow-1" title={it.file.name}>
                    {it.file.name}
                  </span>
                  {it.status === 'uploading' && (
                    <ProgressBar now={it.progress} style={{ width: 80 }} className="mb-0" />
                  )}
                  {it.status === 'done' && (
                    <span className="text-success small">Subido (ID: {it.videoId})</span>
                  )}
                  {it.status === 'error' && (
                    <span className="text-danger small" title={it.error}>
                      Error
                    </span>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </CardBody>
    </Card>
  )
}
