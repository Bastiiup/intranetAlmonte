'use client'

import { useState, useEffect } from 'react'
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
  Button,
  Alert,
  Form,
} from 'react-bootstrap'
import { LuPackage } from 'react-icons/lu'

// Alfabeto restringido: sin 0 ni O para evitar confusiones visuales
const PREFIJO_ALLOWED = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789'

function normalizePrefijoInput(value: string): string {
  const upper = value.toUpperCase().replace(/[^A-Z0-9]/g, '')
  return upper
    .split('')
    .filter((c) => PREFIJO_ALLOWED.includes(c))
    .slice(0, 4)
    .join('')
}

interface GeneradorModalProps {
  show: boolean
  onHide: () => void
  onGenerateComplete?: () => void
}

interface LibroMiraOption {
  id: number | string
  documentId: string
  nombre: string
}

export default function GeneradorModal({
  show,
  onHide,
  onGenerateComplete,
}: GeneradorModalProps) {
  const [libros, setLibros] = useState<LibroMiraOption[]>([])
  const [loadingLibros, setLoadingLibros] = useState(false)
  const [libroMiraId, setLibroMiraId] = useState<string>('')
  const [cantidad, setCantidad] = useState<number>(100)
  const [prefijo, setPrefijo] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!show) return
    setError(null)
    setSuccess(null)
    setLoadingLibros(true)
    fetch('/api/mira/libros-mira')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error)
        const raw = data.data || data
        const list = Array.isArray(raw) ? raw : []
        const opts: LibroMiraOption[] = list.map((d: any) => {
          const att = d.attributes ?? d
          const libro = att.libro?.data ?? att.libro
          const libroAttrs = libro?.attributes ?? libro ?? {}
          const nombre = libroAttrs.nombre_libro ?? 'Sin título'
          return {
            id: d.id,
            documentId: d.documentId ?? String(d.id),
            nombre,
          }
        })
        setLibros(opts)
        if (opts.length > 0 && !libroMiraId) {
          setLibroMiraId(String(opts[0].documentId ?? opts[0].id))
        }
      })
      .catch((e) => setError(e.message || 'Error al cargar libros'))
      .finally(() => setLoadingLibros(false))
  }, [show])

  const handleGenerar = async () => {
    if (!libroMiraId || cantidad < 1) {
      setError('Elige un libro y una cantidad mayor a 0.')
      return
    }
    const prefijoFinal = normalizePrefijoInput(prefijo)
    if (prefijo.length > 0 && prefijoFinal.length !== 4) {
      setError('El prefijo debe tener exactamente 4 caracteres (A-Z sin O, 1-9 sin 0).')
      return
    }
    setError(null)
    setSuccess(null)
    setIsGenerating(true)
    try {
      const res = await fetch('/api/mira/generar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          libroMiraId: libroMiraId,
          cantidad: Number(cantidad),
          prefijo: prefijoFinal.length === 4 ? prefijoFinal : undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Error ${res.status}`)
      }
      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition')
      const filename =
        disposition?.split('filename=')[1]?.replace(/"/g, '').trim() ||
        'licencias_generadas.xlsx'
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      setSuccess(`Se generaron ${cantidad} licencias. El archivo "${filename}" se ha descargado.`)
      onGenerateComplete?.()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al generar licencias')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleClose = () => {
    if (!isGenerating) {
      setError(null)
      setSuccess(null)
      onHide()
    }
  }

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered>
      <ModalHeader closeButton={!isGenerating}>
        <ModalTitle>
          <LuPackage className="me-2" />
          Generar Licencias
        </ModalTitle>
      </ModalHeader>
      <ModalBody>
        <p className="text-muted mb-3">
          Genera códigos únicos para un libro MIRA y descarga un Excel con los códigos y las URLs
          para los QRs (imprenta).
        </p>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert variant="success" dismissible onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Libro MIRA</Form.Label>
            <Form.Select
              value={libroMiraId}
              onChange={(e) => setLibroMiraId(e.target.value)}
              disabled={loadingLibros || isGenerating}
            >
              <option value="">
                {loadingLibros ? 'Cargando...' : 'Selecciona un libro'}
              </option>
              {libros.map((l) => (
                <option key={String(l.documentId || l.id)} value={String(l.documentId || l.id)}>
                  {l.nombre}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Cantidad a generar</Form.Label>
            <Form.Control
              type="number"
              min={1}
              max={10000}
              value={cantidad}
              onChange={(e) => setCantidad(Math.max(1, Math.min(10000, parseInt(e.target.value, 10) || 0)))}
              disabled={isGenerating}
            />
            <Form.Text className="text-muted">Entre 1 y 10.000</Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Prefijo (opcional, 4 caracteres)</Form.Label>
            <Form.Control
              type="text"
              placeholder="Ej: MAT2"
              maxLength={4}
              value={prefijo}
              onChange={(e) => setPrefijo(normalizePrefijoInput(e.target.value))}
              disabled={isGenerating}
            />
            <Form.Text className="text-muted">
              Solo A-Z (sin O) y 1-9 (sin 0). Formato: PREFIJO XXXX XXXX XXXX (ej: MAT2 A1B2 C3D4 E5F6)
            </Form.Text>
          </Form.Group>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={handleClose} disabled={isGenerating}>
          Cerrar
        </Button>
        <Button
          variant="primary"
          onClick={handleGenerar}
          disabled={loadingLibros || !libroMiraId || cantidad < 1 || isGenerating}
        >
          {isGenerating ? 'Generando y descargando...' : 'Generar y Descargar Excel'}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
