'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardBody, Button, Form, Alert, Spinner } from 'react-bootstrap'
import { LuLink, LuRefreshCw } from 'react-icons/lu'

type LibroMira = {
  id: number | string
  documentId?: string
  attributes?: { libro?: { data?: { attributes?: { nombre_libro?: string } }; attributes?: { nombre_libro?: string }; nombre_libro?: string } }
  libro?: { nombre_libro?: string }
}
type BunnyVideo = { guid?: string; id?: number; title?: string; status?: number }

export default function SmartLinkerTab() {
  const [libros, setLibros] = useState<LibroMira[]>([])
  const [videos, setVideos] = useState<BunnyVideo[]>([])
  const [selectedLibroId, setSelectedLibroId] = useState<string>('')
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [loadingLibros, setLoadingLibros] = useState(false)
  const [loadingVideos, setLoadingVideos] = useState(false)
  const [linking, setLinking] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'danger'; text: string } | null>(null)

  const loadLibros = useCallback(async () => {
    setLoadingLibros(true)
    setMessage(null)
    try {
      const res = await fetch('/api/mira/libros-mira?pagination[pageSize]=500')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al cargar libros')
      const list = data.data ?? []
      const arr = Array.isArray(list) ? list : []
      setLibros(arr)
      if (!selectedLibroId && arr.length) {
        const first = arr[0]
        setSelectedLibroId(String((first as LibroMira).documentId ?? (first as LibroMira).id))
      }
    } catch (e: unknown) {
      setMessage({ type: 'danger', text: e instanceof Error ? e.message : 'Error al cargar libros' })
    } finally {
      setLoadingLibros(false)
    }
  }, [selectedLibroId])

  const loadVideos = useCallback(async () => {
    setLoadingVideos(true)
    setMessage(null)
    try {
      const res = await fetch('/api/bunny/videos?perPage=500')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || data.Message || 'Error al cargar videos')
      const list = data.items ?? data ?? []
      setVideos(Array.isArray(list) ? list : [])
      setSelectedVideoIds(new Set())
    } catch (e: unknown) {
      setMessage({ type: 'danger', text: e instanceof Error ? e.message : 'Error al cargar videos' })
    } finally {
      setLoadingVideos(false)
    }
  }, [])

  useEffect(() => {
    loadLibros()
  }, [])
  useEffect(() => {
    loadVideos()
  }, [])

  const videoId = (v: BunnyVideo) => String(v.guid ?? v.id ?? '')
  const videoTitle = (v: BunnyVideo) => v.title ?? videoId(v)

  const filteredVideos = search.trim()
    ? videos.filter((v) => videoTitle(v).toLowerCase().includes(search.trim().toLowerCase()))
    : videos

  const toggleVideo = (id: string) => {
    setSelectedVideoIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => {
    if (selectedVideoIds.size >= filteredVideos.length) {
      setSelectedVideoIds(new Set())
    } else {
      setSelectedVideoIds(new Set(filteredVideos.map((v) => videoId(v))))
    }
  }

  const handleVincular = async () => {
    if (!selectedLibroId) {
      setMessage({ type: 'danger', text: 'Selecciona un libro' })
      return
    }
    const toLink = filteredVideos.filter((v) => selectedVideoIds.has(videoId(v)))
    if (toLink.length === 0) {
      setMessage({ type: 'danger', text: 'Selecciona al menos un video' })
      return
    }
    setLinking(true)
    setMessage(null)
    try {
      const res = await fetch('/api/mira/recursos/vincular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          libroId: selectedLibroId,
          videos: toLink.map((v) => ({ id: videoId(v), nombre: videoTitle(v) })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al vincular')
      setMessage({
        type: 'success',
        text: `Vinculados ${data.creados ?? toLink.length} videos.${data.errores ? ` Errores: ${data.errores}.` : ''}`,
      })
      setSelectedVideoIds(new Set())
    } catch (e: unknown) {
      setMessage({ type: 'danger', text: e instanceof Error ? e.message : 'Error al vincular' })
    } finally {
      setLinking(false)
    }
  }

  const selectedCount = filteredVideos.filter((v) => selectedVideoIds.has(videoId(v))).length

  return (
    <Card>
      <CardBody>
        <p className="text-muted mb-3">
          Elige un libro MIRA y los videos de Bunny que quieras asignar. Se crearán entradas en
          recurso-mira vinculadas al libro.
        </p>
        {message && (
          <Alert variant={message.type} dismissible onClose={() => setMessage(null)}>
            {message.text}
          </Alert>
        )}

        <Form.Group className="mb-3">
          <Form.Label>Libro MIRA</Form.Label>
          <div className="d-flex gap-2">
            <Form.Select
              value={selectedLibroId}
              onChange={(e) => setSelectedLibroId(e.target.value)}
              disabled={loadingLibros}
            >
              <option value="">-- Seleccionar libro --</option>
              {libros.map((l) => {
                const libro = l as LibroMira
                const id = String(libro.documentId ?? libro.id)
                const att = libro.attributes
                const libroData = att?.libro?.data?.attributes ?? att?.libro?.attributes ?? att?.libro ?? libro.libro
                const label = libroData?.nombre_libro ?? id
                return (
                  <option key={id} value={id}>
                    {label}
                  </option>
                )
              })}
            </Form.Select>
            <Button variant="outline-secondary" onClick={loadLibros} disabled={loadingLibros}>
              <LuRefreshCw size={18} />
            </Button>
          </div>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Videos en Bunny</Form.Label>
          <div className="d-flex gap-2 mb-2">
            <Form.Control
              type="text"
              placeholder="Buscar por nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-grow-1"
            />
            <Button variant="outline-secondary" onClick={loadVideos} disabled={loadingVideos}>
              <LuRefreshCw size={18} />
            </Button>
            <Button variant="outline-primary" size="sm" onClick={selectAll}>
              {selectedVideoIds.size >= filteredVideos.length && filteredVideos.length
                ? 'Quitar todos'
                : 'Seleccionar todos'}
            </Button>
          </div>
          <div className="border rounded overflow-auto bg-light" style={{ maxHeight: 340 }}>
            {loadingVideos ? (
              <div className="p-4 text-center">
                <Spinner animation="border" size="sm" /> Cargando videos...
              </div>
            ) : filteredVideos.length === 0 ? (
              <div className="p-4 text-center text-muted">
                No hay videos o no se pudieron cargar.
              </div>
            ) : (
              <ul className="list-group list-group-flush mb-0">
                {filteredVideos.map((v) => {
                  const id = videoId(v)
                  const checked = selectedVideoIds.has(id)
                  return (
                    <li key={id} className="list-group-item list-group-item-action py-2">
                      <Form.Check
                        type="checkbox"
                        id={`vid-${id}`}
                        label={videoTitle(v)}
                        checked={checked}
                        onChange={() => toggleVideo(id)}
                      />
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </Form.Group>

        <Button
          variant="primary"
          onClick={handleVincular}
          disabled={linking || !selectedLibroId || selectedCount === 0}
        >
          {linking ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Vinculando...
            </>
          ) : (
            <>
              <LuLink className="me-2" />
              Vincular {selectedCount} video(s)
            </>
          )}
        </Button>
      </CardBody>
    </Card>
  )
}
