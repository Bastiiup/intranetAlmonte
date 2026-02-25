'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button, Card, Form, Alert, Spinner } from 'react-bootstrap'
import QRCode from 'qrcode'

type Trampolin = { id: string; urlDestino: string }

export default function GeneradorQRClient() {
  const [list, setList] = useState<Trampolin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [qrPreviewId, setQrPreviewId] = useState<string | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  const loadList = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/mira/trampolin')
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) setList(json.data)
      else setError(json.error || 'Error al cargar')
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadList()
  }, [loadList])

  const crearNuevo = async () => {
    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/mira/trampolin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      const json = await res.json()
      if (json.success && json.data) {
        setList((prev) => [...prev, json.data])
      } else setError(json.error || 'Error al crear')
    } catch {
      setError('Error de conexión')
    } finally {
      setCreating(false)
    }
  }

  const guardar = async (id: string, urlDestino: string) => {
    setSavingId(id)
    setError(null)
    try {
      const res = await fetch(`/api/mira/trampolin/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urlDestino: urlDestino.trim() }),
      })
      const json = await res.json()
      if (json.success) {
        setList((prev) => prev.map((t) => (t.id === id ? { ...t, urlDestino: urlDestino.trim() } : t)))
      } else setError(json.error || 'Error al guardar')
    } catch {
      setError('Error de conexión')
    } finally {
      setSavingId(null)
    }
  }

  const eliminar = async (id: string) => {
    if (!confirm('¿Eliminar este trampolín? El QR dejará de funcionar.')) return
    setError(null)
    try {
      const res = await fetch(`/api/mira/trampolin/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        setList((prev) => prev.filter((t) => t.id !== id))
        if (qrPreviewId === id) setQrPreviewId(null), setQrDataUrl(null)
      } else setError(json.error || 'Error al eliminar')
    } catch {
      setError('Error de conexión')
    }
  }

  const generarQR = useCallback(async (id: string) => {
    const url = `${baseUrl}/mira/ir/${id}`
    setError(null)
    try {
      const dataUrl = await QRCode.toDataURL(url, { width: 320, margin: 2 })
      setQrPreviewId(id)
      setQrDataUrl(dataUrl)
    } catch {
      setError('No se pudo generar el QR')
      setQrDataUrl(null)
    }
  }, [baseUrl])

  const descargarQR = useCallback((id: string) => {
    if (!baseUrl) return
    const url = `${baseUrl}/mira/ir/${id}`
    QRCode.toDataURL(url, { width: 320, margin: 2 }).then((dataUrl) => {
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `mira-qr-${id}.png`
      a.click()
    })
  }, [baseUrl])

  if (loading) {
    return (
      <Card>
        <Card.Body className="text-center py-4">
          <Spinner animation="border" />
          <p className="mt-2 mb-0 text-muted">Cargando...</p>
        </Card.Body>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <Card.Header className="d-flex justify-content-between align-items-center">
          <Card.Title as="h5" className="mb-0">Generador QR</Card.Title>
          <Button variant="primary" size="sm" onClick={crearNuevo} disabled={creating}>
            {creating ? 'Creando…' : 'Nuevo trampolín'}
          </Button>
        </Card.Header>
        <Card.Body>
          {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
          <p className="text-muted small mb-3">
            Cada trampolín tiene su propia URL y su QR. El QR apunta a esta intranet; la URL de destino la editas aquí cuando quieras.
          </p>

          {list.length === 0 ? (
            <p className="text-muted mb-0">No hay trampolines. Pulsa <strong>Nuevo trampolín</strong> para crear uno.</p>
          ) : (
            <div className="d-flex flex-column gap-3">
              {list.map((t) => (
                <TrampolinRow
                  key={t.id}
                  trampolin={t}
                  baseUrl={baseUrl}
                  saving={savingId === t.id}
                  onSave={(url) => guardar(t.id, url)}
                  onDelete={() => eliminar(t.id)}
                  onGenerarQR={() => generarQR(t.id)}
                  onDescargarQR={() => descargarQR(t.id)}
                  showQrPreview={qrPreviewId === t.id}
                  qrDataUrl={qrPreviewId === t.id ? qrDataUrl : null}
                />
              ))}
            </div>
          )}
        </Card.Body>
      </Card>
    </>
  )
}

function TrampolinRow({
  trampolin,
  baseUrl,
  saving,
  onSave,
  onDelete,
  onGenerarQR,
  onDescargarQR,
  showQrPreview,
  qrDataUrl,
}: {
  trampolin: Trampolin
  baseUrl: string
  saving: boolean
  onSave: (url: string) => void
  onDelete: () => void
  onGenerarQR: () => void
  onDescargarQR: () => void
  showQrPreview: boolean
  qrDataUrl: string | null
}) {
  const [urlDestino, setUrlDestino] = useState(trampolin.urlDestino)
  const link = `${baseUrl}/mira/ir/${trampolin.id}`

  useEffect(() => {
    setUrlDestino(trampolin.urlDestino)
  }, [trampolin.urlDestino])

  return (
    <Card className="border">
      <Card.Body className="py-3">
        <div className="d-flex flex-wrap align-items-start gap-2 mb-2">
          <span className="badge bg-secondary">/{trampolin.id}</span>
          <small className="text-muted text-break">{link}</small>
        </div>
        <Form
          onSubmit={(e) => {
            e.preventDefault()
            onSave(urlDestino)
          }}
          className="d-flex flex-wrap gap-2 align-items-end mb-2"
        >
          <Form.Group className="flex-grow-1" style={{ minWidth: 200 }}>
            <Form.Label className="small mb-1">URL de destino</Form.Label>
            <Form.Control
              type="url"
              size="sm"
              placeholder="https://ejemplo.com"
              value={urlDestino}
              onChange={(e) => setUrlDestino(e.target.value)}
            />
          </Form.Group>
          <Button type="submit" size="sm" variant="primary" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
          <Button type="button" size="sm" variant="outline-primary" onClick={onGenerarQR}>Ver QR</Button>
          <Button type="button" size="sm" variant="outline-secondary" onClick={onDescargarQR}>Descargar QR</Button>
          <Button type="button" size="sm" variant="outline-danger" onClick={onDelete}>Eliminar</Button>
        </Form>
        {showQrPreview && qrDataUrl && (
          <div className="mt-2">
            <img src={qrDataUrl} alt="QR" style={{ maxWidth: 160, height: 'auto' }} />
          </div>
        )}
      </Card.Body>
    </Card>
  )
}
