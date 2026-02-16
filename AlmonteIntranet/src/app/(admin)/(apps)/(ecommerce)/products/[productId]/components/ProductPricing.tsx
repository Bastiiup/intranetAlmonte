'use client'

import { useState, useEffect } from 'react'
import { Card, CardBody, Form, Row, Col, FormGroup, FormLabel, FormControl, FormSelect, FormCheck, Alert, Spinner, Button } from 'react-bootstrap'
import { TbPencil, TbCheck, TbX, TbInfoCircle } from 'react-icons/tb'
import Link from 'next/link'

interface ProductPricingProps {
  producto: any
  onUpdate?: () => Promise<void> | void
  onProductoUpdate?: (updates: any) => void
}

// Helper para obtener campo con múltiples variaciones
const getField = (obj: any, ...fieldNames: string[]): any => {
  for (const fieldName of fieldNames) {
    if (obj[fieldName] !== undefined && obj[fieldName] !== null && obj[fieldName] !== '') {
      return obj[fieldName]
    }
  }
  return undefined
}

export function ProductPricing({ producto, onUpdate, onProductoUpdate }: ProductPricingProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  // Obtener datos del producto (puede venir de attributes o directamente)
  const attrs = producto.attributes || {}
  const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (producto as any)
  
  // Estados para campos de WooCommerce
  const [formData, setFormData] = useState({
    precio: getField(data, 'precio', 'PRECIO', 'precio') || '',
    precio_oferta: getField(data, 'precio_oferta', 'PRECIO_OFERTA', 'precioOferta') || '',
    type: getField(data, 'type', 'TYPE', 'type') || 'simple',
    stock_quantity: getField(data, 'stock_quantity', 'STOCK_QUANTITY', 'stockQuantity') || '',
    stock_status: getField(data, 'stock_status', 'STOCK_STATUS', 'stockStatus') || 'instock',
    backorders: getField(data, 'backorders', 'BACKORDERS', 'backorders') || 'no',
    manage_stock: getField(data, 'manage_stock', 'MANAGE_STOCK', 'manageStock') !== undefined 
      ? Boolean(getField(data, 'manage_stock', 'MANAGE_STOCK', 'manageStock'))
      : true,
    sold_individually: getField(data, 'sold_individually', 'SOLD_INDIVIDUALLY', 'soldIndividually') !== undefined
      ? Boolean(getField(data, 'sold_individually', 'SOLD_INDIVIDUALLY', 'soldIndividually'))
      : false,
    weight: getField(data, 'weight', 'WEIGHT', 'weight') || '',
    length: getField(data, 'length', 'LENGTH', 'length') || '',
    width: getField(data, 'width', 'WIDTH', 'width') || '',
    height: getField(data, 'height', 'HEIGHT', 'height') || '',
  })

  // Resetear form cuando cambia el producto
  useEffect(() => {
    const attrs = producto.attributes || {}
    const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (producto as any)
    
    setFormData({
      precio: getField(data, 'precio', 'PRECIO', 'precio') || '',
      precio_oferta: getField(data, 'precio_oferta', 'PRECIO_OFERTA', 'precioOferta') || '',
      type: getField(data, 'type', 'TYPE', 'type') || 'simple',
      stock_quantity: getField(data, 'stock_quantity', 'STOCK_QUANTITY', 'stockQuantity') || '',
      stock_status: getField(data, 'stock_status', 'STOCK_STATUS', 'stockStatus') || 'instock',
      backorders: getField(data, 'backorders', 'BACKORDERS', 'backorders') || 'no',
      manage_stock: getField(data, 'manage_stock', 'MANAGE_STOCK', 'manageStock') !== undefined 
        ? Boolean(getField(data, 'manage_stock', 'MANAGE_STOCK', 'manageStock'))
        : true,
      sold_individually: getField(data, 'sold_individually', 'SOLD_INDIVIDUALLY', 'soldIndividually') !== undefined
        ? Boolean(getField(data, 'sold_individually', 'SOLD_INDIVIDUALLY', 'soldIndividually'))
        : false,
      weight: getField(data, 'weight', 'WEIGHT', 'weight') || '',
      length: getField(data, 'length', 'LENGTH', 'length') || '',
      width: getField(data, 'width', 'WIDTH', 'width') || '',
      height: getField(data, 'height', 'HEIGHT', 'height') || '',
    })
  }, [producto])

  const resetForm = () => {
    const attrs = producto.attributes || {}
    const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (producto as any)
    
    setFormData({
      precio: getField(data, 'precio', 'PRECIO', 'precio') || '',
      precio_oferta: getField(data, 'precio_oferta', 'PRECIO_OFERTA', 'precioOferta') || '',
      type: getField(data, 'type', 'TYPE', 'type') || 'simple',
      stock_quantity: getField(data, 'stock_quantity', 'STOCK_QUANTITY', 'stockQuantity') || '',
      stock_status: getField(data, 'stock_status', 'STOCK_STATUS', 'stockStatus') || 'instock',
      backorders: getField(data, 'backorders', 'BACKORDERS', 'backorders') || 'no',
      manage_stock: getField(data, 'manage_stock', 'MANAGE_STOCK', 'manageStock') !== undefined 
        ? Boolean(getField(data, 'manage_stock', 'MANAGE_STOCK', 'manageStock'))
        : true,
      sold_individually: getField(data, 'sold_individually', 'SOLD_INDIVIDUALLY', 'soldIndividually') !== undefined
        ? Boolean(getField(data, 'sold_individually', 'SOLD_INDIVIDUALLY', 'soldIndividually'))
        : false,
      weight: getField(data, 'weight', 'WEIGHT', 'weight') || '',
      length: getField(data, 'length', 'LENGTH', 'length') || '',
      width: getField(data, 'width', 'WIDTH', 'width') || '',
      height: getField(data, 'height', 'HEIGHT', 'height') || '',
    })
  }

  const handleEdit = () => {
    resetForm()
    setIsEditing(true)
    setError(null)
    setSuccess(false)
  }

  const handleCancel = () => {
    resetForm()
    setIsEditing(false)
    setError(null)
    setSuccess(false)
  }

  const handleSaveAll = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(false)

      const productId = producto.id?.toString() || producto.documentId
      
      if (!productId || productId === 'unknown') {
        throw new Error('No se pudo obtener el ID del producto')
      }

      // Preparar datos WooCommerce
      const dataToSend: any = {}

      // Precio
      if (formData.precio !== undefined && formData.precio !== '') {
        dataToSend.precio = parseFloat(formData.precio.toString()) || 0
      }
      if (formData.precio_oferta !== undefined && formData.precio_oferta !== '') {
        dataToSend.precio_oferta = parseFloat(formData.precio_oferta.toString()) || 0
      }

      // Tipo de producto
      if (formData.type) {
        dataToSend.type = formData.type
      }

      // Inventario - Stock se gestiona SOLO via órdenes de compra
      // NO enviamos stock_quantity ni stock_status desde aquí
      if (formData.backorders) {
        dataToSend.backorders = formData.backorders
      }
      dataToSend.manage_stock = formData.manage_stock
      dataToSend.sold_individually = formData.sold_individually

      // Peso y dimensiones
      if (formData.weight !== undefined && formData.weight !== '') {
        dataToSend.weight = parseFloat(formData.weight.toString()) || 0
      }
      if (formData.length !== undefined && formData.length !== '') {
        dataToSend.length = parseFloat(formData.length.toString()) || 0
      }
      if (formData.width !== undefined && formData.width !== '') {
        dataToSend.width = parseFloat(formData.width.toString()) || 0
      }
      if (formData.height !== undefined && formData.height !== '') {
        dataToSend.height = parseFloat(formData.height.toString()) || 0
      }

      console.log('[ProductPricing] 📤 Enviando:', dataToSend)

      // Llamada al API
      const response = await fetch(`/api/tienda/productos/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend)
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Error al actualizar')
      }

      console.log('[ProductPricing] ✅ Guardado exitoso')

      // Actualizar estado local inmediatamente
      if (onProductoUpdate) {
        onProductoUpdate(dataToSend)
      }
      
      setSuccess(true)
      setIsEditing(false)
      
      // Refrescar desde servidor en segundo plano
      if (onUpdate) {
        const updateResult = onUpdate()
        if (updateResult && typeof updateResult.catch === 'function') {
          updateResult.catch((err: any) => {
            console.error('[ProductPricing] Error al refrescar:', err)
          })
        }
      }
      
      // Ocultar mensaje de éxito después de 2 segundos
      setTimeout(() => {
        setSuccess(false)
      }, 2000)

    } catch (err: any) {
      console.error('[ProductPricing] Error:', err)
      setError(err.message || 'Error al guardar cambios')
    } finally {
      setSaving(false)
    }
  }

  // Obtener valores para mostrar en modo vista
  const displayValues = {
    precio: getField(data, 'precio', 'PRECIO', 'precio') || '0.00',
    precio_oferta: getField(data, 'precio_oferta', 'PRECIO_OFERTA', 'precioOferta') || '0.00',
    type: getField(data, 'type', 'TYPE', 'type') || 'simple',
    stock_quantity: getField(data, 'stock_quantity', 'STOCK_QUANTITY', 'stockQuantity') || '0',
    stock_status: getField(data, 'stock_status', 'STOCK_STATUS', 'stockStatus') || 'instock',
    backorders: getField(data, 'backorders', 'BACKORDERS', 'backorders') || 'no',
    manage_stock: getField(data, 'manage_stock', 'MANAGE_STOCK', 'manageStock') !== undefined
      ? Boolean(getField(data, 'manage_stock', 'MANAGE_STOCK', 'manageStock'))
      : true,
    sold_individually: getField(data, 'sold_individually', 'SOLD_INDIVIDUALLY', 'soldIndividually') !== undefined
      ? Boolean(getField(data, 'sold_individually', 'SOLD_INDIVIDUALLY', 'soldIndividually'))
      : false,
    weight: getField(data, 'weight', 'WEIGHT', 'weight') || '0.00',
    length: getField(data, 'length', 'LENGTH', 'length') || '0.00',
    width: getField(data, 'width', 'WIDTH', 'width') || '0.00',
    height: getField(data, 'height', 'HEIGHT', 'height') || '0.00',
  }

  const getStockStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      instock: 'En Stock',
      outofstock: 'Sin Stock',
      onbackorder: 'Pedido Pendiente'
    }
    return labels[status] || status
  }

  const getBackordersLabel = (value: string) => {
    const labels: Record<string, string> = {
      no: 'No Permitir',
      notify: 'Permitir, Notificar Cliente',
      yes: 'Permitir'
    }
    return labels[value] || value
  }

  return (
    <>
      {/* ════════════════════════════════════════════════════════════════ */}
      {/* SECCIÓN: WOOCOMMERCE - PRECIO E INVENTARIO */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <Card className="mt-4">
        <CardBody>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="card-title mb-0">WooCommerce - Precio e Inventario</h5>
            
            {!isEditing ? (
              <Button
                variant="primary"
                onClick={handleEdit}
              >
                <TbPencil className="me-1" />
                Editar
              </Button>
            ) : (
              <div className="btn-group">
                <Button
                  variant="success"
                  onClick={handleSaveAll}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <TbCheck className="me-1" />
                      Guardar Cambios
                    </>
                  )}
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  <TbX className="me-1" />
                  Cancelar
                </Button>
              </div>
            )}
          </div>

          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert variant="success">
              ✅ Configuración de WooCommerce actualizada exitosamente
            </Alert>
          )}

          {saving && (
            <Alert variant="info" className="mt-3">
              <div className="d-flex align-items-center">
                <Spinner animation="border" size="sm" className="me-2" />
                <div>Guardando cambios...</div>
              </div>
            </Alert>
          )}

          {/* MODO VISTA */}
          {!isEditing ? (
            <Row>
              <Col md={4}>
                <div className="mb-3">
                  <Form.Label className="text-muted">Precio Regular</Form.Label>
                  <div className="fw-medium">${parseFloat(displayValues.precio.toString()).toFixed(2)}</div>
                </div>
              </Col>
              
              <Col md={4}>
                <div className="mb-3">
                  <Form.Label className="text-muted">Precio de Oferta</Form.Label>
                  <div className="fw-medium">${parseFloat(displayValues.precio_oferta.toString()).toFixed(2)}</div>
                </div>
              </Col>
              
              <Col md={4}>
                <div className="mb-3">
                  <Form.Label className="text-muted">Tipo de Producto</Form.Label>
                  <div className="fw-medium">{displayValues.type}</div>
                </div>
              </Col>
              
              <Col md={4}>
                <div className="mb-3">
                  <Form.Label className="text-muted">Stock</Form.Label>
                  <div className="fw-medium">{displayValues.stock_quantity}</div>
                </div>
              </Col>
              
              <Col md={4}>
                <div className="mb-3">
                  <Form.Label className="text-muted">Estado de Stock</Form.Label>
                  <div className="fw-medium">{getStockStatusLabel(displayValues.stock_status)}</div>
                </div>
              </Col>
              
              <Col md={4}>
                <div className="mb-3">
                  <Form.Label className="text-muted">Backorders</Form.Label>
                  <div className="fw-medium">{getBackordersLabel(displayValues.backorders)}</div>
                </div>
              </Col>
              
              <Col md={6}>
                <div className="mb-3">
                  <Form.Label className="text-muted">Gestionar Stock</Form.Label>
                  <div className="fw-medium">{displayValues.manage_stock ? 'Sí' : 'No'}</div>
                </div>
              </Col>
              
              <Col md={6}>
                <div className="mb-3">
                  <Form.Label className="text-muted">Vender Individualmente</Form.Label>
                  <div className="fw-medium">{displayValues.sold_individually ? 'Sí' : 'No'}</div>
                </div>
              </Col>
            </Row>
          ) : (
            /* MODO EDICIÓN */
            <>
              <Alert variant="info" className="mb-3">
                <strong>ℹ️ Nota:</strong> Revisa todos los campos antes de guardar. Los cambios se aplicarán al presionar "Guardar Cambios".
              </Alert>
              
              <Row>
                <Col md={4}>
                  <FormGroup className="mb-3">
                    <FormLabel>
                      Precio Regular <span className="text-danger">*</span>
                    </FormLabel>
                    <FormControl
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="0.00"
                      value={formData.precio}
                      onChange={(e) => {
                        setFormData(prev => ({...prev, precio: e.target.value}))
                      }}
                    />
                  </FormGroup>
                </Col>
                
                <Col md={4}>
                  <FormGroup className="mb-3">
                    <FormLabel>Precio de Oferta</FormLabel>
                    <FormControl
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={formData.precio_oferta}
                      onChange={(e) => {
                        setFormData(prev => ({...prev, precio_oferta: e.target.value}))
                      }}
                    />
                  </FormGroup>
                </Col>
                
                <Col md={4}>
                  <FormGroup className="mb-3">
                    <FormLabel>Tipo de Producto</FormLabel>
                    <FormSelect
                      value={formData.type}
                      onChange={(e) => {
                        setFormData(prev => ({...prev, type: e.target.value as any}))
                      }}
                    >
                      <option value="simple">Simple</option>
                      <option value="grouped">Agrupado</option>
                      <option value="external">Externo</option>
                      <option value="variable">Variable</option>
                    </FormSelect>
                  </FormGroup>
                </Col>
              </Row>
              
              {/* Stock solo lectura - se gestiona via órdenes de compra */}
              <Alert variant="info" className="mb-3">
                <div className="d-flex align-items-center">
                  <TbInfoCircle className="me-2" size={20} />
                  <div>
                    <strong>Stock:</strong> El inventario se actualiza automáticamente al confirmar recepción de órdenes de compra.
                    <br />
                    <Link href="/inventario/proveedores" className="text-decoration-none">
                      Ir a Inventario/Proveedores →
                    </Link>
                  </div>
                </div>
              </Alert>
              
              <Row>
                <Col md={4}>
                  <FormGroup className="mb-3">
                    <FormLabel>Stock <span className="badge bg-secondary ms-1">Solo lectura</span></FormLabel>
                    <FormControl
                      type="number"
                      min="0"
                      placeholder="0"
                      value={formData.stock_quantity}
                      disabled
                      readOnly
                      className="bg-light"
                    />
                    <small className="text-muted">Se actualiza vía Órdenes de Compra</small>
                  </FormGroup>
                </Col>
                
                <Col md={4}>
                  <FormGroup className="mb-3">
                    <FormLabel>Estado de Stock <span className="badge bg-secondary ms-1">Auto</span></FormLabel>
                    <FormControl
                      type="text"
                      value={getStockStatusLabel(formData.stock_status)}
                      disabled
                      readOnly
                      className="bg-light"
                    />
                    <small className="text-muted">Calculado según stock disponible</small>
                  </FormGroup>
                </Col>
                
                <Col md={4}>
                  <FormGroup className="mb-3">
                    <FormLabel>Backorders</FormLabel>
                    <FormSelect
                      value={formData.backorders}
                      onChange={(e) => {
                        setFormData(prev => ({...prev, backorders: e.target.value as any}))
                      }}
                    >
                      <option value="no">No Permitir</option>
                      <option value="notify">Permitir, Notificar Cliente</option>
                      <option value="yes">Permitir</option>
                    </FormSelect>
                  </FormGroup>
                </Col>
              </Row>
              
              <Row>
                <Col md={6}>
                  <FormGroup className="mb-3">
                    <FormCheck
                      type="checkbox"
                      checked={formData.manage_stock}
                      onChange={(e) => {
                        setFormData(prev => ({...prev, manage_stock: e.target.checked}))
                      }}
                      label="Gestionar Stock"
                    />
                  </FormGroup>
                </Col>
                
                <Col md={6}>
                  <FormGroup className="mb-3">
                    <FormCheck
                      type="checkbox"
                      checked={formData.sold_individually}
                      onChange={(e) => {
                        setFormData(prev => ({...prev, sold_individually: e.target.checked}))
                      }}
                      label="Vender Individualmente"
                    />
                  </FormGroup>
                </Col>
              </Row>
            </>
          )}
        </CardBody>
      </Card>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* SECCIÓN: WOOCOMMERCE - PESO Y DIMENSIONES */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <Card className="mt-4">
        <CardBody>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="card-title mb-0">WooCommerce - Peso y Dimensiones</h5>
          </div>

          {/* MODO VISTA */}
          {!isEditing ? (
            <Row>
              <Col md={3}>
                <div className="mb-3">
                  <Form.Label className="text-muted">Peso (kg)</Form.Label>
                  <div className="fw-medium">{parseFloat(displayValues.weight.toString()).toFixed(2)}</div>
                </div>
              </Col>
              
              <Col md={3}>
                <div className="mb-3">
                  <Form.Label className="text-muted">Largo (cm)</Form.Label>
                  <div className="fw-medium">{parseFloat(displayValues.length.toString()).toFixed(2)}</div>
                </div>
              </Col>
              
              <Col md={3}>
                <div className="mb-3">
                  <Form.Label className="text-muted">Ancho (cm)</Form.Label>
                  <div className="fw-medium">{parseFloat(displayValues.width.toString()).toFixed(2)}</div>
                </div>
              </Col>
              
              <Col md={3}>
                <div className="mb-3">
                  <Form.Label className="text-muted">Alto (cm)</Form.Label>
                  <div className="fw-medium">{parseFloat(displayValues.height.toString()).toFixed(2)}</div>
                </div>
              </Col>
            </Row>
          ) : (
            /* MODO EDICIÓN */
            <Row>
              <Col md={3}>
                <FormGroup className="mb-3">
                  <FormLabel>Peso (kg)</FormLabel>
                  <FormControl
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.weight}
                    onChange={(e) => {
                      setFormData(prev => ({...prev, weight: e.target.value}))
                    }}
                  />
                </FormGroup>
              </Col>
              
              <Col md={3}>
                <FormGroup className="mb-3">
                  <FormLabel>Largo (cm)</FormLabel>
                  <FormControl
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.length}
                    onChange={(e) => {
                      setFormData(prev => ({...prev, length: e.target.value}))
                    }}
                  />
                </FormGroup>
              </Col>
              
              <Col md={3}>
                <FormGroup className="mb-3">
                  <FormLabel>Ancho (cm)</FormLabel>
                  <FormControl
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.width}
                    onChange={(e) => {
                      setFormData(prev => ({...prev, width: e.target.value}))
                    }}
                  />
                </FormGroup>
              </Col>
              
              <Col md={3}>
                <FormGroup className="mb-3">
                  <FormLabel>Alto (cm)</FormLabel>
                  <FormControl
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.height}
                    onChange={(e) => {
                      setFormData(prev => ({...prev, height: e.target.value}))
                    }}
                  />
                </FormGroup>
              </Col>
            </Row>
          )}
        </CardBody>
      </Card>
    </>
  )
}
