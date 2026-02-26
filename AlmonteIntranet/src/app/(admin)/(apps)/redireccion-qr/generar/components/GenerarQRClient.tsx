'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button, Card, Form, Alert, Spinner } from 'react-bootstrap'
import QRCode from 'qrcode'

const MOR_CL_BASE = 'https://mor.cl'

type RedirectItem = {
  id: string
  campaña: string
  slug: string
  urlDestino: string
  nombre: string
  descripcion: string
  visitas: number
}

export default function GenerarQRClient() {
  const [list, setList] = useState<RedirectItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [qrPreviewId, setQrPreviewId] = useState<string | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [creating, setCreating] = useState(false)

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

  const crearEnBana = async (payload: { campaña: string; slug: string; destino: string; descripcion: string }) => {
    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/mira/trampolin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaña: payload.campaña,
          slug: payload.slug,
          destino: payload.destino,
          descripcion: payload.descripcion,
        }),
      })
      const json = await res.json()
      if (json.success && json.data) {
        setList((prev) => [...prev, json.data])
        setShowNewForm(false)
      } else {
        setError(json.error || 'Error al crear')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setCreating(false)
    }
  }

  const guardar = async (id: string, data: { urlDestino: string; descripcion: string }) => {
    setSavingId(id)
    setError(null)
    try {
      const res = await fetch(`/api/mira/trampolin/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urlDestino: data.urlDestino, descripcion: data.descripcion }),
      })
      const json = await res.json()
      if (json.success && json.data) {
        setList((prev) => prev.map((t) => (t.id === id ? { ...t, ...json.data } : t)))
      } else {
        setError(json.error || 'Error al guardar')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setSavingId(null)
    }
  }

  const eliminar = async (id: string) => {
    if (!confirm('¿Eliminar esta redirección? Se borrará también en mor.cl (Bana).')) return
    setError(null)
    try {
      const res = await fetch(`/api/mira/trampolin/${encodeURIComponent(id)}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        setList((prev) => prev.filter((t) => t.id !== id))
        if (qrPreviewId === id) setQrPreviewId(null), setQrDataUrl(null)
      } else {
        setError(json.error || 'Error al eliminar')
      }
    } catch {
      setError('Error de conexión')
    }
  }

  const generarQR = useCallback(async (id: string, url: string) => {
    setError(null)
    try {
      const dataUrl = await QRCode.toDataURL(url, { width: 320, margin: 2 })
      setQrPreviewId(id)
      setQrDataUrl(dataUrl)
    } catch {
      setError('No se pudo generar el QR')
      setQrDataUrl(null)
    }
  }, [])

  const descargarQR = useCallback((url: string, slug: string) => {
    QRCode.toDataURL(url, { width: 320, margin: 2 }).then((dataUrl) => {
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `qr-mor-${slug || 'redirect'}.png`
      a.click()
    })
  }, [])

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

  const year2 = String(new Date().getFullYear()).slice(-2)

  return (
    <Card>
      <Card.Header className="d-flex justify-content-between align-items-center">
        <div>
          <Card.Title as="h5" className="mb-1">Redirección QR (mor.cl / Bana)</Card.Title>
          <Card.Text as="small" className="text-muted">
            Todo se guarda directo en Banahosting. Crear o editar actualiza mor.cl al instante; no hay que publicar aparte.
          </Card.Text>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowNewForm((v) => !v)}
          disabled={creating}
        >
          {showNewForm ? 'Cancelar' : 'Nueva redirección'}
        </Button>
      </Card.Header>
      <Card.Body>
        {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}

        {showNewForm && (
          <NewRedirectForm
            year2={year2}
            creating={creating}
            onCrear={crearEnBana}
            onCancelar={() => setShowNewForm(false)}
          />
        )}

        {list.length === 0 && !showNewForm ? (
          <p className="text-muted mb-0">No hay redirecciones en Bana. Pulsa <strong>Nueva redirección</strong> para crear una en mor.cl.</p>
        ) : (
          <div className="d-flex flex-column gap-3 mt-3">
            {list.map((t) => (
              <RedirectRow
                key={t.id}
                item={t}
                saving={savingId === t.id}
                onSave={(data) => guardar(t.id, data)}
                onDelete={() => eliminar(t.id)}
                onGenerarQR={(url) => generarQR(t.id, url)}
                onDescargarQR={(url, slug) => descargarQR(url, slug)}
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

function NewRedirectForm({
  year2,
  creating,
  onCrear,
  onCancelar,
}: {
  year2: string
  creating: boolean
  onCrear: (p: { campaña: string; slug: string; destino: string; descripcion: string }) => void
  onCancelar: () => void
}) {
  const [campaña, setCampaña] = useState(year2)
  const [slug, setSlug] = useState('')
  const [destino, setDestino] = useState('')
  const [descripcion, setDescripcion] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!slug.trim()) return
    onCrear({ campaña: campaña || year2, slug: slug.trim(), destino: destino.trim(), descripcion: descripcion.trim() })
  }

  return (
    <Card className="border border-primary">
      <Card.Body className="py-3">
        <Card.Title as="h6" className="mb-2">Crear en Bana (mor.cl)</Card.Title>
        <Form onSubmit={handleSubmit}>
          <div className="row g-2 mb-2">
            <div className="col-6 col-md-2">
              <Form.Group>
                <Form.Label className="small mb-1">Año (campaña)</Form.Label>
                <Form.Control
                  type="text"
                  size="sm"
                  placeholder="26"
                  value={campaña}
                  onChange={(e) => setCampaña(e.target.value.replace(/\D/g, '').slice(0, 2))}
                />
              </Form.Group>
            </div>
            <div className="col-6 col-md-2">
              <Form.Group>
                <Form.Label className="small mb-1">Slug</Form.Label>
                <Form.Control
                  type="text"
                  size="sm"
                  placeholder="mira"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
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
                  value={destino}
                  onChange={(e) => setDestino(e.target.value)}
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
                  placeholder="Opcional"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                />
              </Form.Group>
            </div>
          </div>
          <div className="d-flex gap-2">
            <Button type="submit" size="sm" variant="primary" disabled={creating || !slug.trim()}>
              {creating ? 'Creando en Bana…' : 'Crear en Bana'}
            </Button>
            <Button type="button" size="sm" variant="outline-secondary" onClick={onCancelar}>Cancelar</Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  )
}

function RedirectRow({
  item,
  saving,
  onSave,
  onDelete,
  onGenerarQR,
  onDescargarQR,
  showQrPreview,
  qrDataUrl,
}: {
  item: RedirectItem
  saving: boolean
  onSave: (data: { urlDestino: string; descripcion: string }) => void
  onDelete: () => void
  onGenerarQR: (url: string) => void
  onDescargarQR: (url: string, slug: string) => void
  showQrPreview: boolean
  qrDataUrl: string | null
}) {
  const [urlDestino, setUrlDestino] = useState(item.urlDestino)
  const [descripcion, setDescripcion] = useState(item.descripcion)
  const morClUrl = `${MOR_CL_BASE}/${item.campaña}/${item.slug}.html`

  useEffect(() => {
    setUrlDestino(item.urlDestino)
    setDescripcion(item.descripcion)
  }, [item.urlDestino, item.descripcion])

  return (
    <Card className="border">
      <Card.Body className="py-3">
        <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
          <span className="badge bg-secondary">{item.id}</span>
          <small className="text-muted text-break">{morClUrl}</small>
          <small className="text-primary">mor.cl (Bana)</small>
        </div>
        <Form
          onSubmit={(e) => {
            e.preventDefault()
            onSave({ urlDestino, descripcion })
          }}
          className="mb-2"
        >
          <div className="row g-2 mb-2">
            <div className="col-12 col-md-6">
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
            <div className="col-12 col-md-6">
              <Form.Group>
                <Form.Label className="small mb-1">Descripción</Form.Label>
                <Form.Control
                  as="textarea"
                  size="sm"
                  rows={1}
                  placeholder="Opcional"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                />
              </Form.Group>
            </div>
          </div>
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <Button type="submit" size="sm" variant="primary" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </Button>
            <Button type="button" size="sm" variant="outline-primary" onClick={() => onGenerarQR(morClUrl)} title="QR apunta a mor.cl">Ver QR</Button>
            <Button type="button" size="sm" variant="outline-secondary" onClick={() => onDescargarQR(morClUrl, item.slug)}>Descargar PNG</Button>
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
