'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button, Card, Form, Alert, Spinner } from 'react-bootstrap'

export default function EditarTrampolinClient() {
  const [urlDestino, setUrlDestino] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/mira/trampolin')
      const json = await res.json()
      if (json.success && json.data) {
        setUrlDestino(json.data.urlDestino || '')
      } else {
        setError(json.error || 'Error al cargar')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const res = await fetch('/api/mira/trampolin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urlDestino: urlDestino.trim() }),
      })
      const json = await res.json()
      if (json.success) {
        setUrlDestino(json.data?.urlDestino ?? urlDestino.trim())
        setSuccess(true)
      } else {
        setError(json.error || 'Error al guardar')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <Card.Body className="text-center py-5">
          <Spinner animation="border" />
          <p className="mt-2 mb-0 text-muted">Cargando...</p>
        </Card.Body>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <Card.Header>
          <Card.Title as="h5">URL de destino del trampolín</Card.Title>
        </Card.Header>
        <Card.Body>
          {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
          {success && <Alert variant="success" onClose={() => setSuccess(false)} dismissible>Guardado correctamente.</Alert>}
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>URL de destino</Form.Label>
              <Form.Control
                type="url"
                placeholder="https://ejemplo.com/pagina"
                value={urlDestino}
                onChange={(e) => setUrlDestino(e.target.value)}
              />
              <Form.Text className="text-muted">
                Al escanear el QR (o abrir <strong>/mira/ir</strong>), se redirige a esta URL en tiempo 0.
              </Form.Text>
            </Form.Group>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </Button>
          </Form>
        </Card.Body>
      </Card>
      <Card className="mt-3">
        <Card.Body>
          <Card.Title as="h6">Uso</Card.Title>
          <p className="text-muted small mb-0">
            El QR debe apuntar a la URL de esta intranet: <strong>{typeof window !== 'undefined' ? `${window.location.origin}/mira/ir` : 'https://tu-dominio.railway.app/mira/ir'}</strong>.
            Genera el QR en <strong>MIRA → Generador QR</strong> usando esa URL como “URL de origen”. La URL de destino la configuras aquí y puedes cambiarla cuando quieras sin volver a generar el QR.
          </p>
        </Card.Body>
      </Card>
    </>
  )
}
