'use client'

import { useState, useCallback } from 'react'
import { Button, Card, Form, Alert, Spinner, Badge, OverlayTrigger, Tooltip } from 'react-bootstrap'
import QRCode from 'qrcode'
import {
  LuCheck,
  LuSparkles,
  LuDownload,
  LuExternalLink,
  LuCopy,
  LuRotateCcw,
  LuLink2,
  LuGlobe,
  LuTag,
  LuCalendar,
  LuRoute,
  LuFileText,
  LuQrCode,
} from 'react-icons/lu'

const MOR_CL_BASE = 'https://mor.cl'

const USO_CATEGORIA = [
  { value: '', label: 'Seleccione categoría' },
  { value: 'libros-moraleja', label: 'Libros Moraleja' },
  { value: 'general', label: 'General' },
  { value: 'promocion', label: 'Promoción' },
  { value: 'otro', label: 'Otro' },
]

const DOMINIOS = [
  { value: 'mor.cl', label: 'mor.cl', activo: true },
  { value: 'moraleja.cl', label: 'moraleja.cl', activo: false },
  { value: 'escolar.cl', label: 'escolar.cl', activo: false },
]

type ResultState = {
  linkCorto: string
  slug: string
  qrDataUrl: string
  destino: string
  nombre: string
} | null

export default function GenerarQRClient() {
  const year = new Date().getFullYear()
  const year2 = String(year).slice(-2)

  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [categoria, setCategoria] = useState('')
  const [ano, setAno] = useState(year2)
  const [dominio] = useState('mor.cl')
  const [rutaOrigen, setRutaOrigen] = useState('')
  const [rutaDestino, setRutaDestino] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [result, setResult] = useState<ResultState>(null)
  const [copied, setCopied] = useState(false)

  const slug = rutaOrigen.trim().replace(/[^a-zA-Z0-9_-]/g, '')
  const linkPreview = slug ? `${dominio}/${ano}/${slug}.html` : ''

  const limpiar = useCallback(() => {
    setNombre('')
    setDescripcion('')
    setCategoria('')
    setAno(year2)
    setRutaOrigen('')
    setRutaDestino('')
    setResult(null)
    setError(null)
    setCopied(false)
  }, [year2])

  const generar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!slug) {
      setError('Indique la Ruta de Origen (slug)')
      return
    }
    if (!rutaDestino.trim()) {
      setError('Indique la Ruta Final (Destino)')
      return
    }
    setCreating(true)
    setError(null)
    setResult(null)
    setCopied(false)
    try {
      const desc = categoria
        ? `[${USO_CATEGORIA.find((c) => c.value === categoria)?.label ?? categoria}] ${nombre ? nombre + '. ' : ''}${descripcion}`.trim()
        : (nombre ? nombre + '. ' : '') + descripcion
      const res = await fetch('/api/mira/trampolin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaña: ano, slug, destino: rutaDestino.trim(), descripcion: desc }),
      })
      const json = await res.json()
      if (json.success && json.data) {
        const fullUrl = `${MOR_CL_BASE}/${ano}/${slug}.html`
        const qrDataUrl = await QRCode.toDataURL(fullUrl, { width: 400, margin: 2 })
        setResult({ linkCorto: fullUrl, slug, qrDataUrl, destino: rutaDestino.trim(), nombre })
      } else {
        setError(json.error || 'Error al generar')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setCreating(false)
    }
  }

  const descargarPNG = () => {
    if (!result) return
    const a = document.createElement('a')
    a.href = result.qrDataUrl
    a.download = `qr-mor-${result.slug}.png`
    a.click()
  }

  const copiarLink = async () => {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result.linkCorto)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }

  return (
    <>
      <div className="mb-4">
        <h4 className="fw-bold mb-1">Crear Redirección QR</h4>
        <p className="text-muted mb-0">
          Configure una nueva redirección de URL y genere su código QR institucional.
        </p>
      </div>

      {error && (
        <Alert variant="danger" onClose={() => setError(null)} dismissible className="mb-3 shadow-sm">
          {error}
        </Alert>
      )}

      <div className="row g-4">
        {/* ── Columna izquierda: formulario ── */}
        <div className="col-12 col-lg-7">
          <Card className="shadow-sm border-0">
            <Card.Header className="bg-white border-bottom py-3">
              <Card.Title as="h6" className="mb-0 d-flex align-items-center gap-2">
                <LuFileText size={18} className="text-primary" />
                Información General
              </Card.Title>
            </Card.Header>
            <Card.Body className="py-4">
              <Form onSubmit={generar}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold small d-flex align-items-center gap-1">
                    <LuTag size={14} className="text-muted" /> Nombre de la URL
                  </Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Ej: Guía de Matemáticas 2026"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="py-2"
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold small">Descripción</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    placeholder="Breve descripción del propósito de este QR..."
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    className="py-2"
                  />
                </Form.Group>

                <div className="row g-3 mb-3">
                  <div className="col-12 col-md-6">
                    <Form.Group>
                      <Form.Label className="fw-semibold small d-flex align-items-center gap-1">
                        <LuTag size={14} className="text-muted" /> Uso / Categoría
                      </Form.Label>
                      <Form.Select
                        value={categoria}
                        onChange={(e) => setCategoria(e.target.value)}
                        className="py-2"
                      >
                        {USO_CATEGORIA.map((opt) => (
                          <option key={opt.value || 'v'} value={opt.value}>{opt.label}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </div>
                  <div className="col-12 col-md-6">
                    <Form.Group>
                      <Form.Label className="fw-semibold small d-flex align-items-center gap-1">
                        <LuCalendar size={14} className="text-muted" /> Año
                      </Form.Label>
                      <Form.Select
                        value={ano}
                        onChange={(e) => setAno(e.target.value)}
                        className="py-2"
                      >
                        <option value={year2}>{year}</option>
                        <option value={String(year - 1).slice(-2)}>{year - 1}</option>
                        <option value={String(year - 2).slice(-2)}>{year - 2}</option>
                      </Form.Select>
                    </Form.Group>
                  </div>
                </div>

                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold small d-flex align-items-center gap-1">
                    <LuGlobe size={14} className="text-muted" /> Extensión / Dominio
                  </Form.Label>
                  <div className="d-flex gap-2 flex-wrap">
                    {DOMINIOS.map((d) => (
                      <OverlayTrigger
                        key={d.value}
                        placement="top"
                        overlay={!d.activo ? <Tooltip>Próximamente</Tooltip> : <></>}
                      >
                        <span>
                          <Button
                            type="button"
                            size="sm"
                            variant={d.value === dominio ? 'primary' : 'outline-secondary'}
                            disabled={!d.activo}
                            className="px-3 py-1"
                          >
                            {d.label}
                          </Button>
                        </span>
                      </OverlayTrigger>
                    ))}
                  </div>
                </Form.Group>

                <Form.Group className="mb-2">
                  <Form.Label className="fw-semibold small d-flex align-items-center gap-1">
                    <LuRoute size={14} className="text-muted" /> Ruta de Origen
                  </Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="mira"
                    value={rutaOrigen}
                    onChange={(e) => setRutaOrigen(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                    className="py-2"
                  />
                </Form.Group>

                {linkPreview && (
                  <div className="mb-3 p-2 px-3 rounded-2 d-flex align-items-center gap-2" style={{ background: '#f0f4ff' }}>
                    <LuLink2 size={14} className="text-primary flex-shrink-0" />
                    <span className="small text-muted text-uppercase me-1">Previsualización:</span>
                    <code className="fw-semibold text-primary">{linkPreview}</code>
                  </div>
                )}

                <Form.Group className="mb-4">
                  <Form.Label className="fw-semibold small d-flex align-items-center gap-1">
                    <LuLink2 size={14} className="text-muted" /> Ruta Final (Destino)
                  </Form.Label>
                  <Form.Control
                    type="url"
                    placeholder="https://docs.google.com/viewer?..."
                    value={rutaDestino}
                    onChange={(e) => setRutaDestino(e.target.value)}
                    className="py-2"
                  />
                </Form.Group>

                <div className="d-flex gap-2 pt-2 border-top">
                  <Button type="button" variant="light" onClick={limpiar} className="px-4">
                    <LuRotateCcw size={14} className="me-1" /> Limpiar
                  </Button>
                  <Button type="submit" variant="primary" disabled={creating} className="px-4 ms-auto">
                    {creating
                      ? <><Spinner animation="border" size="sm" className="me-1" /> Generando…</>
                      : <><LuSparkles size={14} className="me-1" /> Generar Redirección</>
                    }
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </div>

        {/* ── Columna derecha: resultado ── */}
        <div className="col-12 col-lg-5">
          <Card className="shadow-sm border-0 h-100" style={{ minHeight: 480 }}>
            <Card.Body className="d-flex flex-column align-items-center justify-content-center text-center p-4">
              {result ? (
                <>
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center mb-3"
                    style={{ width: 56, height: 56, background: '#e6f9ed' }}
                  >
                    <LuCheck size={28} className="text-success" strokeWidth={3} />
                  </div>
                  <h5 className="fw-bold mb-1">Redirección Lista</h5>
                  <p className="text-muted small mb-4">El código QR ha sido generado exitosamente.</p>

                  <div className="rounded-3 p-3 mb-4" style={{ background: '#fafbfc', border: '1px solid #e9ecef' }}>
                    <img src={result.qrDataUrl} alt="QR" style={{ width: 180, height: 180 }} />
                  </div>

                  <div className="d-flex gap-2 flex-wrap justify-content-center mb-4">
                    <Button variant="dark" onClick={descargarPNG} className="px-3">
                      <LuDownload size={14} className="me-1" /> Descargar PNG
                    </Button>
                    <Button variant="outline-primary" onClick={() => window.open(result.linkCorto, '_blank')} className="px-3">
                      <LuExternalLink size={14} className="me-1" /> Validar Redirección
                    </Button>
                  </div>

                  <div className="w-100 rounded-3 p-3 text-start" style={{ background: '#f0f4ff' }}>
                    <h6 className="text-uppercase small fw-bold text-primary mb-3" style={{ letterSpacing: '0.5px' }}>
                      Resumen de enlace
                    </h6>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="small text-muted">Link Corto:</span>
                      <span className="d-flex align-items-center gap-1">
                        <code className="small fw-bold">{result.linkCorto.replace('https://', '')}</code>
                        <Button variant="link" size="sm" className="p-0 ms-1 text-muted" onClick={copiarLink} title="Copiar enlace">
                          <LuCopy size={12} />
                        </Button>
                        {copied && <Badge bg="success" className="ms-1" style={{ fontSize: 9 }}>Copiado</Badge>}
                      </span>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span className="small text-muted">Vencimiento:</span>
                      <Badge bg="success-subtle" text="dark" className="fw-normal">Sin límite</Badge>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="small text-muted">Tracking:</span>
                      <Badge bg="primary-subtle" text="dark" className="fw-normal">Activado</Badge>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-5">
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3"
                    style={{ width: 72, height: 72, background: '#f0f4ff' }}
                  >
                    <LuQrCode size={32} className="text-primary" />
                  </div>
                  <h6 className="text-muted mb-2">Sin QR generado</h6>
                  <p className="text-muted small mb-0" style={{ maxWidth: 260 }}>
                    Complete el formulario y pulse <strong>Generar Redirección</strong> para ver el código QR aquí.
                  </p>
                </div>
              )}
            </Card.Body>
          </Card>
        </div>
      </div>
    </>
  )
}
