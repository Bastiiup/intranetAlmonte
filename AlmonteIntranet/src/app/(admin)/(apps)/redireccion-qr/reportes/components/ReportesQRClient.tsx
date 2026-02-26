'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, Spinner, Table, Button, Form, Modal, Badge, Alert, InputGroup } from 'react-bootstrap'
import {
  LuPencil,
  LuTrash2,
  LuExternalLink,
  LuDownload,
  LuQrCode,
  LuLink2,
  LuSearch,
  LuRefreshCw,
  LuCopy,
} from 'react-icons/lu'
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
  const [editQr, setEditQr] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

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

  const openEdit = async (item: RedirectItem) => {
    setEditId(item.id)
    setEditDestino(item.urlDestino)
    setEditDescripcion(item.descripcion)
    const url = `${MOR_CL_BASE}/${item.campaña}/${item.slug}.html`
    const qr = await QRCode.toDataURL(url, { width: 320, margin: 2 })
    setEditQr(qr)
  }

  const closeEdit = () => {
    setEditId(null)
    setEditDestino('')
    setEditDescripcion('')
    setEditQr(null)
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
        setSuccessMsg('Redirección actualizada en mor.cl')
        setTimeout(() => setSuccessMsg(null), 3000)
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
    QRCode.toDataURL(url, { width: 400, margin: 2 }).then((dataUrl) => {
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `qr-mor-${item.slug}.png`
      a.click()
    })
  }

  const copiarLink = async (item: RedirectItem) => {
    const url = `${MOR_CL_BASE}/${item.campaña}/${item.slug}.html`
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(item.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch { /* ignore */ }
  }

  const totalVisitas = list.reduce((s, t) => s + (t.visitas || 0), 0)
  const itemEditando = editId ? list.find((t) => t.id === editId) : null

  const filteredList = search.trim()
    ? list.filter((t) =>
        (t.nombre || t.slug || t.id).toLowerCase().includes(search.toLowerCase()) ||
        t.descripcion.toLowerCase().includes(search.toLowerCase()) ||
        t.urlDestino.toLowerCase().includes(search.toLowerCase())
      )
    : list

  if (loading) {
    return (
      <Card className="shadow-sm border-0">
        <Card.Body className="text-center py-5">
          <Spinner animation="border" className="text-primary" />
          <p className="mt-3 mb-0 text-muted">Cargando redirecciones...</p>
        </Card.Body>
      </Card>
    )
  }

  return (
    <>
      {/* ── Stats cards ── */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <Card className="border-0 shadow-sm text-center py-2">
            <Card.Body className="py-3">
              <div className="rounded-circle mx-auto mb-2 d-flex align-items-center justify-content-center" style={{ width: 40, height: 40, background: '#e8f0fe' }}>
                <LuQrCode size={20} className="text-primary" />
              </div>
              <h3 className="fw-bold mb-0">{list.length}</h3>
              <p className="text-muted small mb-0">Redirecciones</p>
            </Card.Body>
          </Card>
        </div>
        <div className="col-6 col-md-3">
          <Card className="border-0 shadow-sm text-center py-2">
            <Card.Body className="py-3">
              <div className="rounded-circle mx-auto mb-2 d-flex align-items-center justify-content-center" style={{ width: 40, height: 40, background: '#e6f9ed' }}>
                <LuExternalLink size={20} className="text-success" />
              </div>
              <h3 className="fw-bold mb-0">{totalVisitas}</h3>
              <p className="text-muted small mb-0">Total visitas</p>
            </Card.Body>
          </Card>
        </div>
        <div className="col-6 col-md-3">
          <Card className="border-0 shadow-sm text-center py-2">
            <Card.Body className="py-3">
              <div className="rounded-circle mx-auto mb-2 d-flex align-items-center justify-content-center" style={{ width: 40, height: 40, background: '#fff4e5' }}>
                <LuLink2 size={20} className="text-warning" />
              </div>
              <h3 className="fw-bold mb-0">mor.cl</h3>
              <p className="text-muted small mb-0">Dominio activo</p>
            </Card.Body>
          </Card>
        </div>
        <div className="col-6 col-md-3">
          <Card className="border-0 shadow-sm text-center py-2">
            <Card.Body className="py-3">
              <div className="rounded-circle mx-auto mb-2 d-flex align-items-center justify-content-center" style={{ width: 40, height: 40, background: '#f3e8ff' }}>
                <LuRefreshCw size={20} style={{ color: '#7c3aed' }} />
              </div>
              <h3 className="fw-bold mb-0">Activo</h3>
              <p className="text-muted small mb-0">Estado Bana</p>
            </Card.Body>
          </Card>
        </div>
      </div>

      {/* ── Mensajes ── */}
      {error && (
        <Alert variant="danger" onClose={() => setError(null)} dismissible className="mb-3 shadow-sm">
          {error}
        </Alert>
      )}
      {successMsg && (
        <Alert variant="success" onClose={() => setSuccessMsg(null)} dismissible className="mb-3 shadow-sm">
          {successMsg}
        </Alert>
      )}

      {/* ── Tabla ── */}
      <Card className="shadow-sm border-0">
        <Card.Header className="bg-white border-bottom py-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div>
            <Card.Title as="h6" className="mb-0 d-flex align-items-center gap-2">
              <LuQrCode size={18} className="text-primary" />
              Listado de redirecciones
            </Card.Title>
            <small className="text-muted">Edite destino o descripción; los cambios se aplican en mor.cl al instante.</small>
          </div>
          <InputGroup style={{ maxWidth: 260 }}>
            <InputGroup.Text className="bg-white border-end-0"><LuSearch size={14} className="text-muted" /></InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="sm"
              className="border-start-0"
            />
          </InputGroup>
        </Card.Header>
        <Card.Body className="p-0">
          {filteredList.length === 0 ? (
            <div className="text-center py-5">
              <div className="rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center" style={{ width: 56, height: 56, background: '#f0f4ff' }}>
                <LuQrCode size={24} className="text-primary" />
              </div>
              <p className="text-muted mb-0">
                {search ? 'No se encontraron resultados.' : <>No hay redirecciones. Cree una en <strong>Generar QR</strong>.</>}
              </p>
            </div>
          ) : (
            <Table responsive hover className="mb-0 align-middle">
              <thead className="bg-light">
                <tr>
                  <th className="ps-3">Nombre</th>
                  <th>Descripción</th>
                  <th>Enlace</th>
                  <th>Destino</th>
                  <th className="text-center" style={{ width: 80 }}>Visitas</th>
                  <th className="text-end pe-3" style={{ width: 180 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((t) => {
                  const morUrl = `${MOR_CL_BASE}/${t.campaña}/${t.slug}.html`
                  return (
                    <tr key={t.id}>
                      <td className="ps-3 fw-medium">{t.nombre || t.slug || t.id}</td>
                      <td className="text-muted small" style={{ maxWidth: 200 }}>
                        {t.descripcion
                          ? t.descripcion.length > 60 ? t.descripcion.slice(0, 60) + '…' : t.descripcion
                          : <span className="fst-italic">—</span>
                        }
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-1">
                          <code className="small text-primary">{morUrl.replace('https://', '')}</code>
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0 text-muted"
                            onClick={() => copiarLink(t)}
                            title="Copiar enlace"
                          >
                            <LuCopy size={12} />
                          </Button>
                          {copiedId === t.id && <Badge bg="success" style={{ fontSize: 9 }}>Copiado</Badge>}
                        </div>
                      </td>
                      <td className="small text-muted" style={{ maxWidth: 160 }}>
                        {t.urlDestino
                          ? t.urlDestino.length > 40 ? t.urlDestino.slice(0, 40) + '…' : t.urlDestino
                          : '—'
                        }
                      </td>
                      <td className="text-center">
                        <Badge bg="primary-subtle" text="dark" className="fw-semibold">{t.visitas ?? 0}</Badge>
                      </td>
                      <td className="text-end pe-3">
                        <div className="d-flex gap-1 justify-content-end">
                          <Button variant="soft-primary" size="sm" onClick={() => openEdit(t)} title="Editar">
                            <LuPencil size={14} />
                          </Button>
                          <Button variant="soft-secondary" size="sm" onClick={() => validar(t)} title="Abrir enlace">
                            <LuExternalLink size={14} />
                          </Button>
                          <Button variant="soft-secondary" size="sm" onClick={() => descargarQR(t)} title="Descargar QR">
                            <LuDownload size={14} />
                          </Button>
                          <Button variant="soft-danger" size="sm" onClick={() => eliminar(t.id)} title="Eliminar">
                            <LuTrash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* ── Modal editar ── */}
      <Modal show={!!editId} onHide={closeEdit} centered size="lg">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title as="h5" className="fw-bold">Editar redirección</Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-3">
          {itemEditando && (
            <div className="row g-4">
              <div className="col-12 col-md-7">
                <div className="rounded-3 p-3 mb-3" style={{ background: '#f0f4ff' }}>
                  <div className="d-flex align-items-center gap-2">
                    <LuLink2 size={14} className="text-primary" />
                    <code className="small fw-semibold text-primary">
                      {MOR_CL_BASE}/{itemEditando.campaña}/{itemEditando.slug}.html
                    </code>
                  </div>
                </div>

                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold small">URL de destino</Form.Label>
                  <Form.Control
                    type="url"
                    value={editDestino}
                    onChange={(e) => setEditDestino(e.target.value)}
                    placeholder="https://..."
                    className="py-2"
                  />
                </Form.Group>
                <Form.Group>
                  <Form.Label className="fw-semibold small">Descripción</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={editDescripcion}
                    onChange={(e) => setEditDescripcion(e.target.value)}
                    className="py-2"
                  />
                </Form.Group>
              </div>
              <div className="col-12 col-md-5 text-center">
                <p className="small text-muted mb-2">QR actual</p>
                {editQr && (
                  <div className="rounded-3 p-3 d-inline-block" style={{ background: '#fafbfc', border: '1px solid #e9ecef' }}>
                    <img src={editQr} alt="QR" style={{ width: 160, height: 160 }} />
                  </div>
                )}
                <div className="mt-2">
                  <Badge bg="success-subtle" text="dark" className="fw-normal">Sin vencimiento</Badge>
                </div>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button variant="light" onClick={closeEdit} className="px-4">Cancelar</Button>
          <Button variant="primary" onClick={guardarEdicion} disabled={savingId !== null} className="px-4">
            {savingId ? <><Spinner animation="border" size="sm" className="me-1" /> Guardando…</> : 'Guardar cambios'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}
