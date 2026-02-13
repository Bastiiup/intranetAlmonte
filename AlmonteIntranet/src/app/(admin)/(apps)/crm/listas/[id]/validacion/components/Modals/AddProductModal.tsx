/**
 * Modal para agregar un producto manualmente a la lista
 */

'use client'

import { useState } from 'react'
import { Modal, Button, Form, Row, Col, Spinner } from 'react-bootstrap'

interface AddProductModalProps {
  show: boolean
  onHide: () => void
  onAdd: (data: any) => Promise<void>
  loading?: boolean
  nextOrden?: number
}

export default function AddProductModal({
  show,
  onHide,
  onAdd,
  loading = false,
  nextOrden = 1
}: AddProductModalProps) {
  const [formData, setFormData] = useState({
    nombre: '',
    cantidad: 1,
    isbn: '',
    marca: '',
    precio: 0,
    orden: nextOrden,
    categoria: '',
    asignatura: '',
    descripcion: '',
    comprar: true,
  })
  const [saving, setSaving] = useState(false)

  // Reset form cuando se abre el modal
  const handleShow = () => {
    setFormData({
      nombre: '',
      cantidad: 1,
      isbn: '',
      marca: '',
      precio: 0,
      orden: nextOrden,
      categoria: '',
      asignatura: '',
      descripcion: '',
      comprar: true,
    })
  }

  const handleSave = async () => {
    if (!formData.nombre.trim()) return
    setSaving(true)
    try {
      await onAdd(formData)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal show={show} onHide={onHide} size="lg" onEnter={handleShow}>
      <Modal.Header closeButton>
        <Modal.Title>Agregar Producto</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Nombre del Producto *</Form.Label>
            <Form.Control
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              placeholder="Ej: Cuaderno universitario 100 hojas"
              required
              autoFocus
            />
          </Form.Group>

          <Row>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Cantidad *</Form.Label>
                <Form.Control
                  type="number"
                  min="1"
                  value={formData.cantidad}
                  onChange={(e) => setFormData({ ...formData, cantidad: parseInt(e.target.value) || 1 })}
                  required
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Precio</Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.precio}
                  onChange={(e) => setFormData({ ...formData, precio: parseFloat(e.target.value) || 0 })}
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Orden (posición)</Form.Label>
                <Form.Control
                  type="number"
                  min={1}
                  value={formData.orden}
                  onChange={(e) => setFormData({ ...formData, orden: parseInt(e.target.value, 10) || 1 })}
                />
                <Form.Text className="text-muted">
                  Posición en la lista
                </Form.Text>
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>ISBN / SKU</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.isbn}
                  onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                  placeholder="Opcional"
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Marca</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.marca}
                  onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                  placeholder="Opcional"
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Categoria</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.categoria}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  placeholder="Ej: Libro, Util, Cuaderno"
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Asignatura</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.asignatura}
                  onChange={(e) => setFormData({ ...formData, asignatura: e.target.value })}
                  placeholder="Ej: Matematicas, Lenguaje"
                />
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Label>Descripcion</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              placeholder="Opcional"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Check
              type="checkbox"
              label="Marcar para comprar"
              checked={formData.comprar}
              onChange={(e) => setFormData({ ...formData, comprar: e.target.checked })}
            />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancelar
        </Button>
        <Button
          variant="success"
          onClick={handleSave}
          disabled={saving || loading || !formData.nombre.trim()}
        >
          {saving ? (
            <>
              <Spinner size="sm" className="me-2" />
              Agregando...
            </>
          ) : (
            'Agregar Producto'
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
