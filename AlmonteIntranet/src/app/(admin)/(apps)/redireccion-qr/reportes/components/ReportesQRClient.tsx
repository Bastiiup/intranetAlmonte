'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, Spinner, Table, Button, Form, Modal } from 'react-bootstrap'
import { LuPencil, LuTrash2, LuExternalLink, LuDownload } from 'react-icons/lu'
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

export default function ReportesQRClient() {
  const [list, setList] = useState<RedirectItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [editDestino, setEditDestino] = useState('')
  const [editDescripcion, setEditDescripcion] = useState('')

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

  const openEdit = (item: RedirectItem) => {
    setEditId(item.id)
    setEditDestino(item.urlDestino)
    setEditDescripcion(item.descripcion)
  }

  const closeEdit = () => {
    setEditId(null)
    setEditDestino('')
    setEditDescripcion('')
  }

  const guardarEdicion = async () => {
    if (!editId) return
    setSavingId(editId)
    setError(null)
    try {
      const res = await fetch(`/api/mira/trampolin/${encodeURIComponent(editId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urlDestino: editDestino, descripcion: editDescripcion }),
      })
      const json = await res.json()
      if (json.success && json.data) {
        setList((prev) => prev.map((t) => (t.id === editId ? { ...t, ...json.data } : t)))
        closeEdit()
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
        if (editId === id) closeEdit()
      } else {
        setError(json.error || 'Error al eliminar')
      }
    } catch {
      setError('Error de conexión')
    }
  }

  const validar = (item: RedirectItem) => {
    window.open(`${MOR_CL_BASE}/${item.campaña}/${item.slug}.html`, '_blank')
  }

  const descargarQR = (item: RedirectItem) => {
    const url = `${MOR_CL_BASE}/${item.campaña}/${item.slug}.html`
    QRCode.toDataURL(url, { width: 320, margin: 2 }).then((dataUrl) => {
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `qr-mor-${item.slug}.png`
      a.click()
    })
  }

  const totalVisitas = list.reduce((s, t) => s + (t.visitas || 0), 0)
  const itemEditando = editId ? list.find((t) => t.id === editId) : null

  if (loading) {
    return (
      <Card>
        <Card.Body className="text-center py-5">
          <Spinner animation="border" />
          <p className="mt-2 mb-0 text-muted">Cargando reportes...</p>
        </Card.Body>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <Card.Header>
          <Card.Title as="h5" className="mb-0">Listado y edición de redirecciones</Card.Title>
          <Card.Text as="small" className="text-muted mb-0 mt-1">
            Total de accesos: <strong>{totalVisitas}</strong> · Redirecciones: <strong>{list.length}</strong>. Edite destino o descripción y guarde; los cambios se aplican en mor.cl al instante.
          </Card.Text>
        </Card.Header>
        <Card.Body className="p-0">
          {error && (
            <div className="p-3 pb-0">
              <Card className="border-danger bg-danger bg-opacity-10">
                <Card.Body className="py-2">{error}</Card.Body>
              </Card>
            </div>
          )}
          {list.length === 0 ? (
            <p className="text-muted p-4 mb-0">No hay redirecciones. Cree una en <strong>Generar QR</strong>.</p>
          ) : (
            <Table responsive hover className="mb-0">
              <thead>
                <tr>
                  <th>Nombre / Slug</th>
                  <th>Descripción</th>
                  <th>Enlace corto</th>
                  <th className="text-end">Visitas</th>
                  <th className="text-end" style={{ width: 160 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {list.map((t) => (
                  <tr key={t.id}>
                    <td>{t.nombre || t.slug || t.id}</td>
                    <td className="text-muted small" style={{ maxWidth: 280 }}>{t.descripcion || '—'}</td>
                    <td><code className="small">{MOR_CL_BASE}/{t.campaña}/{t.slug}.html</code></td>
                    <td className="text-end fw-semibold">{t.visitas ?? 0}</td>
                    <td className="text-end">
                      <Button variant="outline-primary" size="sm" className="me-1" onClick={() => openEdit(t)} title="Editar">
                        <LuPencil />
                      </Button>
                      <Button variant="outline-secondary" size="sm" className="me-1" onClick={() => validar(t)} title="Validar redirección">
                        <LuExternalLink />
                      </Button>
                      <Button variant="outline-secondary" size="sm" className="me-1" onClick={() => descargarQR(t)} title="Descargar QR">
                        <LuDownload />
                      </Button>
                      <Button variant="outline-danger" size="sm" onClick={() => eliminar(t.id)} title="Eliminar">
                        <LuTrash2 />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      <Modal show={!!editId} onHide={closeEdit} centered>
        <Modal.Header closeButton>
          <Modal.Title>Editar redirección</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {itemEditando && (
            <p className="small text-muted mb-3">
              Link corto: <code>{MOR_CL_BASE}/{itemEditando.campaña}/{itemEditando.slug}.html</code>
            </p>
          )}
          <Form.Group className="mb-3">
            <Form.Label>URL de destino</Form.Label>
            <Form.Control
              type="url"
              value={editDestino}
              onChange={(e) => setEditDestino(e.target.value)}
              placeholder="https://..."
            />
          </Form.Group>
          <Form.Group>
            <Form.Label>Descripción</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={editDescripcion}
              onChange={(e) => setEditDescripcion(e.target.value)}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={closeEdit}>Cancelar</Button>
          <Button variant="primary" onClick={guardarEdicion} disabled={savingId !== null}>
            {savingId ? 'Guardando…' : 'Guardar'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}
