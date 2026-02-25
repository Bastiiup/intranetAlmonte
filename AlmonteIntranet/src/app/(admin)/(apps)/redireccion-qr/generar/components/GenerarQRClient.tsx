'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button, Card, Form, Alert, Spinner } from 'react-bootstrap'
import QRCode from 'qrcode'

type Trampolin = { id: string; urlDestino: string; nombre: string; descripcion: string; visitas: number }

export default function GenerarQRClient() {
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
      const res = await fetch('/api/mira/trampolin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
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

  const guardar = async (id: string, data: { urlDestino: string; nombre: string; descripcion: string }) => {
    setSavingId(id)
    setError(null)
    try {
      const res = await fetch(`/api/mira/trampolin/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (json.success && json.data) {
        setList((prev) => prev.map((t) => (t.id === id ? { ...t, ...json.data } : t)))
      } else setError(json.error || 'Error al guardar')
    } catch {
      setError('Error de conexión')
    } finally {
      setSavingId(null)
    }
  }

  const eliminar = async (id: string) => {
    if (!confirm('¿Eliminar esta redirección? El QR dejará de funcionar.')) return
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
      a.download = `qr-${id}.png`
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
    <Card>
      <Card.Header className="d-flex justify-content-between align-items-center">
        <div>
          <Card.Title as="h5" className="mb-1">Crear redirección QR</Card.Title>
          <Card.Text as="small" className="text-muted">
            Configura una nueva redirección de URL y genera su código QR. Nombre y descripción ayudan a identificar cada QR y ver métricas.
          </Card.Text>
        </div>
        <Button variant="primary" size="sm" onClick={crearNuevo} disabled={creating}>
          {creating ? 'Creando…' : 'Nueva redirección'}
        </Button>
      </Card.Header>
      <Card.Body>
        {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}

        {list.length === 0 ? (
          <p className="text-muted mb-0">No hay redirecciones. Pulsa <strong>Nueva redirección</strong> para crear una.</p>
        ) : (
          <div className="d-flex flex-column gap-3">
            {list.map((t) => (
              <TrampolinRow
                key={t.id}
                trampolin={t}
                baseUrl={baseUrl}
                saving={savingId === t.id}
                onSave={(data) => guardar(t.id, data)}
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
  onSave: (data: { urlDestino: string; nombre: string; descripcion: string }) => void
  onDelete: () => void
  onGenerarQR: () => void
  onDescargarQR: () => void
  showQrPreview: boolean
  qrDataUrl: string | null
}) {
  const [urlDestino, setUrlDestino] = useState(trampolin.urlDestino)
  const [nombre, setNombre] = useState(trampolin.nombre)
  const [descripcion, setDescripcion] = useState(trampolin.descripcion)
  const link = `${baseUrl}/mira/ir/${trampolin.id}`

  useEffect(() => {
    setUrlDestino(trampolin.urlDestino)
    setNombre(trampolin.nombre)
    setDescripcion(trampolin.descripcion)
  }, [trampolin.urlDestino, trampolin.nombre, trampolin.descripcion])

  return (
    <Card className="border">
      <Card.Body className="py-3">
        <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
          <span className="badge bg-secondary">/{trampolin.id}</span>
          <small className="text-muted text-break">{link}</small>
          {trampolin.visitas != null && (
            <span className="badge bg-primary ms-auto">{trampolin.visitas} visitas</span>
          )}
        </div>
        <Form
          onSubmit={(e) => {
            e.preventDefault()
            onSave({ urlDestino, nombre, descripcion })
          }}
          className="mb-2"
        >
          <div className="row g-2 mb-2">
            <div className="col-12 col-md-4">
              <Form.Group>
                <Form.Label className="small mb-1">Nombre de la URL</Form.Label>
                <Form.Control
                  type="text"
                  size="sm"
                  placeholder="Ej: Guía Matemáticas 2026"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                />
              </Form.Group>
            </div>
            <div className="col-12 col-md-4">
              <Form.Group>
                <Form.Label className="small mb-1">Descripción</Form.Label>
                <Form.Control
                  as="textarea"
                  size="sm"
                  rows={1}
                  placeholder="Breve descripción del propósito..."
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                />
              </Form.Group>
            </div>
            <div className="col-12 col-md-4">
              <Form.Group>
                <Form.Label className="small mb-1">URL de destino</Form.Label>
                <Form.Control
                  type="url"
                  size="sm"
                  placeholder="https://..."
                  value={urlDestino}
                  onChange={(e) => setUrlDestino(e.target.value)}
                />
              </Form.Group>
            </div>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <Button type="submit" size="sm" variant="primary" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </Button>
            <Button type="button" size="sm" variant="outline-primary" onClick={onGenerarQR}>Ver QR</Button>
            <Button type="button" size="sm" variant="outline-secondary" onClick={onDescargarQR}>Descargar PNG</Button>
            <Button type="button" size="sm" variant="outline-danger" onClick={onDelete}>Eliminar</Button>
          </div>
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
