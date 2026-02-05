/**
 * Modal para editar un producto existente
 */

'use client'

import { useState, useEffect } from 'react'
import { Modal, Button, Form, Row, Col, Spinner, Alert, Badge } from 'react-bootstrap'
import type { ProductoIdentificado } from '../../types'

interface EditProductModalProps {
  show: boolean
  producto: ProductoIdentificado | null
  onHide: () => void
  onSave: (data: any) => Promise<void>
  loading?: boolean
}

export default function EditProductModal({
  show,
  producto,
  onHide,
  onSave,
  loading = false
}: EditProductModalProps) {
  const [formData, setFormData] = useState({
    nombre: '',
    cantidad: 1,
    isbn: '',
    marca: '',
    precio: 0,
    orden: 1,
    categoria: '',
    asignatura: '',
    descripcion: '',
    comprar: true,
    stock_quantity: undefined as number | undefined
  })

  useEffect(() => {
    if (producto) {
      setFormData({
        nombre: producto.nombre,
        cantidad: producto.cantidad,
        isbn: producto.isbn || '',
        marca: producto.marca || '',
        precio: producto.precio || 0,
        orden: producto.orden ?? 1,
        categoria: producto.categoria || '',
        asignatura: producto.asignatura || '',
        descripcion: producto.descripcion || '',
        comprar: producto.comprar !== false,
        stock_quantity: producto.stock_quantity !== undefined ? producto.stock_quantity : undefined
      })
    }
  }, [producto])

  const handleSave = async () => {
    await onSave(formData)
  }

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Editar Producto</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Nombre del Producto *</Form.Label>
            <Form.Control
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              required
            />
          </Form.Group>

          <Row>
            <Col md={6}>
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
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Precio</Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.precio}
                  onChange={(e) => setFormData({ ...formData, precio: parseFloat(e.target.value) || 0 })}
                />
                {producto?.woocommerce_id && (
                  <Form.Text className="text-muted">
                    💰 Este precio se actualizará también en WooCommerce
                  </Form.Text>
                )}
              </Form.Group>
            </Col>
          </Row>

          {producto?.woocommerce_id && (
            <>
              <Alert variant="info" className="mb-3">
                <strong>🔄 Sincronización con WooCommerce:</strong>
                <br />
                Este producto está vinculado a WooCommerce (ID: {producto.woocommerce_id}).
                <br />
                Los cambios se actualizarán también en WooCommerce.
              </Alert>
              
              <Form.Group className="mb-3">
                <Form.Label>
                  Stock en WooCommerce
                  {producto.stock_quantity !== undefined && (
                    <Badge bg={producto.stock_quantity > 0 ? 'success' : 'danger'} className="ms-2">
                      Actual: {producto.stock_quantity}
                    </Badge>
                  )}
                </Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  value={formData.stock_quantity !== undefined ? formData.stock_quantity : (producto.stock_quantity || 0)}
                  onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })}
                  placeholder="Ingrese la cantidad en stock"
                />
              </Form.Group>
            </>
          )}

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>ISBN / SKU</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.isbn}
                  onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
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
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Orden (posición en PDF)</Form.Label>
                <Form.Control
                  type="number"
                  min={1}
                  value={formData.orden}
                  onChange={(e) => setFormData({ ...formData, orden: parseInt(e.target.value, 10) || 1 })}
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Categoría</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.categoria}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  placeholder="Ej. Libro, Útil"
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Asignatura</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.asignatura}
                  onChange={(e) => setFormData({ ...formData, asignatura: e.target.value })}
                  placeholder="Ej. Matemáticas, Lenguaje"
                />
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Label>Descripción</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
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
        <Button variant="primary" onClick={handleSave} disabled={loading}>
          {loading ? (
            <>
              <Spinner size="sm" className="me-2" />
              Guardando...
            </>
          ) : (
            'Guardar Cambios'
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
