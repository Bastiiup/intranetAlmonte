/**
 * Modal de alta rápida en catálogo: mismo flujo que /add-product pero aquí,
 * con el producto de la fila ya cargado. Campos: Nombre, Plataformas (Moraleja/Escolar),
 * Descripción, Descripción breve, Portada del libro.
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { Modal, Button, Form, Row, Col, Alert, Spinner, FormCheck } from 'react-bootstrap'
import type { ProductoIdentificado } from '../../types'

interface AddProductQuickAccessModalProps {
  show: boolean
  onHide: () => void
  /** Producto de la fila para precargar nombre, precio, isbn, etc. */
  productPrecargado?: ProductoIdentificado | null
  onSuccess?: () => void
}

const initialForm = {
  nombre_libro: '',
  precio: '',
  isbn_libro: '',
  descripcion: '',
  subtitulo_libro: '',
  stock_quantity: '1',
  plataformas: [] as string[], // Array vacío por defecto - si no se selecciona nada, se guarda solo en Strapi
  portada_libro: null as File | null,
}

export default function AddProductQuickAccessModal({
  show,
  onHide,
  productPrecargado,
  onSuccess,
}: AddProductQuickAccessModalProps) {
  const [formData, setFormData] = useState(initialForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const submittingRef = useRef(false)

  const handlePlatformChange = (platform: string, checked: boolean) => {
    if (checked) {
      setFormData((prev) => ({
        ...prev,
        plataformas: prev.plataformas && Array.isArray(prev.plataformas)
          ? (prev.plataformas.includes(platform) ? prev.plataformas : [...prev.plataformas, platform])
          : [platform]
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        plataformas: prev.plataformas && Array.isArray(prev.plataformas)
          ? prev.plataformas.filter((p) => p !== platform)
          : []
      }))
    }
  }


  useEffect(() => {
    if (!show) return
    setError(null)
    setSuccess(false)
    if (productPrecargado) {
      setFormData({
        nombre_libro: productPrecargado.nombre || '',
        precio: String(productPrecargado.precio ?? ''),
        isbn_libro: productPrecargado.isbn || '',
        descripcion: productPrecargado.descripcion || '',
        subtitulo_libro: (productPrecargado.nombre || '').slice(0, 160),
        stock_quantity: String(productPrecargado.cantidad ?? 1),
        plataformas: [], // Por defecto sin plataformas - se guarda solo en Strapi
        portada_libro: null,
      })
    } else {
      setFormData(initialForm)
    }
  }, [show, productPrecargado])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submittingRef.current) return
    submittingRef.current = true
    setError(null)
    if (!formData.nombre_libro.trim()) {
      setError('El nombre del producto es obligatorio')
      submittingRef.current = false
      return
    }
    const precioNum = parseFloat(formData.precio)
    if (isNaN(precioNum) || precioNum < 0) {
      setError('Indica un precio válido (número ≥ 0)')
      submittingRef.current = false
      return
    }

    setSaving(true)
    try {
      let portadaLibroId: number | null = null
      let portadaLibroUrl: string | null = null
      if (formData.portada_libro) {
        const uploadFormData = new FormData()
        uploadFormData.append('file', formData.portada_libro)
        const uploadResponse = await fetch('/api/tienda/upload', {
          method: 'POST',
          body: uploadFormData,
        })
        if (!uploadResponse.ok) throw new Error('Error al subir la portada')
        const uploadData = await uploadResponse.json()
        portadaLibroId = uploadData.data?.id ?? null
        portadaLibroUrl = uploadData.data?.url ?? null
      }

      const payload: Record<string, unknown> = {
        nombre_libro: formData.nombre_libro.trim(),
        descripcion: formData.descripcion?.trim() || '',
        subtitulo_libro: formData.subtitulo_libro?.trim() || formData.nombre_libro.trim().slice(0, 160),
        isbn_libro: formData.isbn_libro?.trim() || '',
        precio: String(precioNum),
        stock_quantity: formData.stock_quantity?.trim() || '1',
      }
      if (portadaLibroId) payload.portada_libro_id = portadaLibroId
      if (portadaLibroUrl) payload.portada_libro = portadaLibroUrl

      // Si se seleccionaron plataformas, asignar los canales correspondientes
      if (formData.plataformas && formData.plataformas.length > 0) {
        let canalesIds: string[] = []
        try {
          const canalesRes = await fetch('/api/tienda/canales')
          const canalesData = await canalesRes.json()
          if (canalesData.success && Array.isArray(canalesData.data)) {
            for (const key of ['woo_moraleja', 'woo_escolar']) {
              if (!formData.plataformas.includes(key)) continue
              const canal = canalesData.data.find(
                (c: any) =>
                  (c.attributes?.key || c.key) === key ||
                  (c.attributes?.nombre || c.nombre || '').toLowerCase().includes(key === 'woo_moraleja' ? 'moraleja' : 'escolar')
              )
              const docId = canal?.documentId ?? canal?.id
              if (docId) canalesIds.push(String(docId))
            }
          }
        } catch (_) {
          // Si hay error al obtener canales, usar IDs por defecto
          if (formData.plataformas.includes('woo_moraleja')) canalesIds.push('1')
          if (formData.plataformas.includes('woo_escolar')) canalesIds.push('2')
        }
        if (canalesIds.length > 0) {
          payload.canales = canalesIds
          console.log('[AddProductQuickAccessModal] ✅ Canales asignados:', canalesIds)
        }
      } else {
        // Si NO se seleccionó ninguna plataforma, NO se asignan canales
        // El producto se guarda solo en Strapi con estado "Pendiente"
        console.log('[AddProductQuickAccessModal] ⚠️ No se seleccionaron plataformas - se guarda solo en Strapi sin canales')
        console.log('[AddProductQuickAccessModal] ℹ️ El producto se sincronizará a "escolar" cuando se apruebe')
      }

      const response = await fetch('/api/tienda/productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || `Error ${response.status}`)
      if (!data.success) throw new Error(data.error || 'Error al crear producto')

      setSuccess(true)
      onSuccess?.()
      setTimeout(() => onHide(), 1200)
    } catch (err: any) {
      setError(err.message || 'Error al crear el producto')
    } finally {
      setSaving(false)
      submittingRef.current = false
    }
  }

  return (
    <Modal show={show} onHide={onHide} size="lg" centered onEscapeKeyDown={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>Alta producto en catálogo</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {productPrecargado && (
            <Alert variant="info" className="small mb-3">
              Producto de la lista cargado: <strong>{productPrecargado.nombre}</strong>. Revisa y envía.
            </Alert>
          )}
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert variant="success">Producto creado en el catálogo correctamente.</Alert>
          )}

          <Form.Group className="mb-3">
            <Form.Label>Nombre del producto *</Form.Label>
            <Form.Control
              type="text"
              value={formData.nombre_libro}
              onChange={(e) => setFormData({ ...formData, nombre_libro: e.target.value })}
              placeholder="Ej: Cuaderno universitario 100 hojas"
              required
              autoFocus
            />
          </Form.Group>

          <div className="bg-white border rounded p-3 mb-3">
            <Form.Label className="fw-bold mb-2">Plataformas de publicación</Form.Label>
            <div className="d-flex gap-4">
              <FormCheck
                type="checkbox"
                id="platform_moraleja"
                label="Moraleja"
                checked={formData.plataformas?.includes('woo_moraleja') || false}
                onChange={(e) => handlePlatformChange('woo_moraleja', e.target.checked)}
              />
              <FormCheck
                type="checkbox"
                id="platform_escolar"
                label="Escolar"
                checked={formData.plataformas?.includes('woo_escolar') || false}
                onChange={(e) => handlePlatformChange('woo_escolar', e.target.checked)}
              />
            </div>
            <Form.Text className="text-muted">
              Si seleccionas plataformas, el producto se enviará directamente a esos canales. 
              Si no seleccionas ninguna, se guardará solo en Strapi y se sincronizará a "Escolar" cuando se apruebe.
            </Form.Text>
          </div>

          <Form.Group className="mb-3">
            <Form.Label>Descripción del producto</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              placeholder="Descripción completa del producto"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Descripción breve del producto</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={formData.subtitulo_libro}
              onChange={(e) => setFormData({ ...formData, subtitulo_libro: e.target.value })}
              placeholder="Descripción corta (ej. para WooCommerce)"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Portada del libro</Form.Label>
            <Form.Control
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = (e.target as HTMLInputElement).files?.[0]
                setFormData((prev) => ({ ...prev, portada_libro: file || null }))
              }}
            />
            <Form.Text className="text-muted">Opcional. Imagen del producto.</Form.Text>
          </Form.Group>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Precio *</Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.precio}
                  onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                  placeholder="0"
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Stock</Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                />
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-0">
            <Form.Label>ISBN / SKU</Form.Label>
            <Form.Control
              type="text"
              value={formData.isbn_libro}
              onChange={(e) => setFormData({ ...formData, isbn_libro: e.target.value })}
              placeholder="Opcional"
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} type="button">
            Cancelar
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={saving || success || !formData.nombre_libro.trim()}
          >
            {saving ? (
              <>
                <Spinner size="sm" animation="border" className="me-2" />
                Creando...
              </>
            ) : success ? (
              'Creado'
            ) : (
              'Crear en catálogo'
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}
