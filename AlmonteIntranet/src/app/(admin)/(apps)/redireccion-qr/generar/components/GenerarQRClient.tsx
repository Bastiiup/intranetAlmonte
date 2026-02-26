'use client'

import { useState, useCallback } from 'react'
import { Button, Card, Form, Alert, Spinner } from 'react-bootstrap'
import QRCode from 'qrcode'
import { LuCheck, LuSparkles, LuDownload, LuExternalLink } from 'react-icons/lu'

const MOR_CL_BASE = 'https://mor.cl'

const USO_CATEGORIA = [
  { value: '', label: 'Seleccione categoría' },
  { value: 'libros-moraleja', label: 'Libros Moraleja' },
  { value: 'general', label: 'General' },
  { value: 'promocion', label: 'Promoción' },
  { value: 'otro', label: 'Otro' },
]

type ResultState = {
  linkCorto: string
  slug: string
  qrDataUrl: string
  destino: string
} | null

export default function GenerarQRClient() {
  const year = new Date().getFullYear()
  const year2 = String(year).slice(-2)

  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [categoria, setCategoria] = useState('')
  const [ano, setAno] = useState(year2)
  const [dominio, setDominio] = useState<'mor.cl'>('mor.cl')
  const [rutaOrigen, setRutaOrigen] = useState('')
  const [rutaDestino, setRutaDestino] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [result, setResult] = useState<ResultState>(null)

  const linkPreview = rutaOrigen.trim()
    ? `${dominio}/${ano}/${rutaOrigen.trim().replace(/[^a-zA-Z0-9_-]/g, '')}.html`
    : ''

  const limpiar = useCallback(() => {
    setNombre('')
    setDescripcion('')
    setCategoria('')
    setAno(year2)
    setRutaOrigen('')
    setRutaDestino('')
    setResult(null)
    setError(null)
  }, [year2])

  const generar = async (e: React.FormEvent) => {
    e.preventDefault()
    const slug = rutaOrigen.trim().replace(/[^a-zA-Z0-9_-]/g, '')
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
    try {
      const desc = categoria
        ? `[${USO_CATEGORIA.find((c) => c.value === categoria)?.label ?? categoria}] ${nombre ? nombre + '. ' : ''}${descripcion}`.trim()
        : (nombre ? nombre + '. ' : '') + descripcion
      const res = await fetch('/api/mira/trampolin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaña: ano,
          slug,
          destino: rutaDestino.trim(),
          descripcion: desc,
        }),
      })
      const json = await res.json()
      if (json.success && json.data) {
        const fullUrl = `${MOR_CL_BASE}/${ano}/${slug}.html`
        const qrDataUrl = await QRCode.toDataURL(fullUrl, { width: 320, margin: 2 })
        setResult({
          linkCorto: fullUrl,
          slug,
          qrDataUrl,
          destino: rutaDestino.trim(),
        })
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

  const validarRedireccion = () => {
    if (!result) return
    window.open(result.linkCorto, '_blank')
  }

  return (
    <>
      <div className="mb-3">
        <h4 className="mb-1">Crear Redirección QR</h4>
        <p className="text-muted small mb-0">
          Configure una nueva redirección de URL y genere su código QR institucional.
        </p>
      </div>

      {error && (
        <Alert variant="danger" onClose={() => setError(null)} dismissible className="mb-3">
          {error}
        </Alert>
      )}

      <div className="row g-4">
        {/* Columna izquierda: formulario */}
        <div className="col-12 col-lg-7">
          <Card className="border shadow-sm">
            <Card.Header className="bg-light">
              <Card.Title as="h6" className="mb-0">Información General</Card.Title>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={generar}>
                <Form.Group className="mb-3">
                  <Form.Label>Nombre de la URL</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Ej: Guía de Matemáticas 2026"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Descripción</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    placeholder="Breve descripción del propósito de este QR..."
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Uso / Categoría</Form.Label>
                  <Form.Select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                    {USO_CATEGORIA.map((opt) => (
                      <option key={opt.value || 'v'} value={opt.value}>{opt.label}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <Form.Group>
                      <Form.Label>Año</Form.Label>
                      <Form.Select value={ano} onChange={(e) => setAno(e.target.value)}>
                        <option value={year2}>{year}</option>
                        <option value={String(year - 1).slice(-2)}>{year - 1}</option>
                        <option value={String(year - 2).slice(-2)}>{year - 2}</option>
                      </Form.Select>
                    </Form.Group>
                  </div>
                  <div className="col-6">
                    <Form.Group>
                      <Form.Label>Extensión / Dominio</Form.Label>
                      <div className="d-flex gap-2 flex-wrap align-items-center pt-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="primary"
                          disabled
                        >
                          mor.cl
                        </Button>
                        <span className="small text-muted">(escolar.cl y moraleja.cl próximamente)</span>
                      </div>
                    </Form.Group>
                  </div>
                </div>
                <Form.Group className="mb-3">
                  <Form.Label>Ruta de Origen</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="mira"
                    value={rutaOrigen}
                    onChange={(e) => setRutaOrigen(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                  />
                </Form.Group>
                {linkPreview && (
                  <div className="mb-3 p-2 bg-light rounded">
                    <span className="small text-muted text-uppercase">Previsualización</span>
                    <p className="mb-0 fw-medium">{linkPreview}</p>
                  </div>
                )}
                <Form.Group className="mb-4">
                  <Form.Label>Ruta Final (Destino)</Form.Label>
                  <Form.Control
                    type="url"
                    placeholder="https://..."
                    value={rutaDestino}
                    onChange={(e) => setRutaDestino(e.target.value)}
                  />
                </Form.Group>
                <div className="d-flex gap-2">
                  <Button type="button" variant="outline-secondary" onClick={limpiar}>
                    Limpiar
                  </Button>
                  <Button type="submit" variant="primary" disabled={creating}>
                    {creating ? <><Spinner animation="border" size="sm" className="me-1" /> Generando…</> : <><LuSparkles className="me-1" /> Generar Redirección</>}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </div>

        {/* Columna derecha: resultado */}
        <div className="col-12 col-lg-5">
          <Card className="border shadow-sm h-100">
            <Card.Body className="d-flex flex-column align-items-center justify-content-center text-center py-5">
              {result ? (
                <>
                  <div className="text-success mb-3">
                    <LuCheck size={48} strokeWidth={2.5} />
                  </div>
                  <h5 className="mb-1">Redirección Lista</h5>
                  <p className="text-muted small mb-4">El código QR ha sido generado exitosamente.</p>
                  <div className="border rounded p-3 bg-white mb-4">
                    <img src={result.qrDataUrl} alt="QR" style={{ width: 200, height: 200 }} />
                  </div>
                  <div className="d-flex gap-2 flex-wrap justify-content-center mb-4">
                    <Button variant="dark" size="sm" onClick={descargarPNG}>
                      <LuDownload className="me-1" /> Descargar PNG
                    </Button>
                    <Button variant="outline-primary" size="sm" onClick={validarRedireccion}>
                      <LuExternalLink className="me-1" /> Validar Redirección
                    </Button>
                  </div>
                  <div className="w-100 text-start border-top pt-3">
                    <h6 className="text-muted text-uppercase small mb-2">Resumen de enlace</h6>
                    <p className="mb-1 small"><strong>Link corto:</strong> <code>{result.linkCorto}</code></p>
                    <p className="mb-1 small"><strong>Vencimiento:</strong> Sin límite</p>
                    <p className="mb-0 small"><strong>Tracking:</strong> Activado</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-muted mb-2" style={{ fontSize: 48 }}>📱</div>
                  <p className="text-muted mb-0">Complete el formulario y pulse <strong>Generar Redirección</strong> para ver el código QR aquí.</p>
                </>
              )}
            </Card.Body>
          </Card>
        </div>
      </div>
    </>
  )
}
