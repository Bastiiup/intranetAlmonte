'use client'

import { FormGroup, FormLabel, FormControl, FormSelect, Row, Col, Alert } from 'react-bootstrap'

interface GeneralTabProps {
  formData: any
  setFormData: (data: any) => void
}

export default function GeneralTab({ formData, setFormData }: GeneralTabProps) {
  return (
    <div>
      <h5 className="mb-4">Información General del Producto</h5>
      
      <Row>
        <Col md={6}>
          <FormGroup className="mb-3">
            <FormLabel>
              Precio normal ($) <span className="text-danger">*</span>
            </FormLabel>
            <FormControl
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={formData.precio || ''}
              onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
            />
            <small className="text-muted">Precio regular del producto</small>
          </FormGroup>
        </Col>

        <Col md={6}>
          <FormGroup className="mb-3">
            <FormLabel>Precio rebajado ($)</FormLabel>
            <FormControl
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={formData.precio_oferta || ''}
              onChange={(e) => setFormData({ ...formData, precio_oferta: e.target.value })}
            />
            <small className="text-muted">Precio de oferta (opcional)</small>
          </FormGroup>
        </Col>
      </Row>

      <Row>
        <Col md={6}>
          <FormGroup className="mb-3">
            <FormLabel>Sale quantity</FormLabel>
            <FormControl
              type="number"
              min="0"
              placeholder="0"
              value={formData.sale_quantity || ''}
              onChange={(e) => setFormData({ ...formData, sale_quantity: e.target.value })}
            />
            <small className="text-muted">Cantidad disponible en oferta</small>
          </FormGroup>
        </Col>

        <Col md={6}>
          <FormGroup className="mb-3">
            <FormLabel>Sold items</FormLabel>
            <FormControl
              type="number"
              min="0"
              value={formData.sold_items || '0'}
              onChange={(e) => setFormData({ ...formData, sold_items: e.target.value })}
            />
            <small className="text-muted">Items vendidos</small>
          </FormGroup>
        </Col>
      </Row>

      <Row>
        <Col md={6}>
          <FormGroup className="mb-3">
            <FormLabel>Estado del impuesto</FormLabel>
            <FormSelect
              value={formData.tax_status || 'taxable'}
              onChange={(e) => setFormData({ ...formData, tax_status: e.target.value })}
            >
              <option value="taxable">Imponible</option>
              <option value="shipping">Solo envío</option>
              <option value="none">Ninguno</option>
            </FormSelect>
          </FormGroup>
        </Col>

        <Col md={6}>
          <FormGroup className="mb-3">
            <FormLabel>Clase de impuesto</FormLabel>
            <FormSelect
              value={formData.tax_class || 'standard'}
              onChange={(e) => setFormData({ ...formData, tax_class: e.target.value })}
            >
              <option value="standard">Estándar</option>
              <option value="reduced-rate">Tasa reducida</option>
              <option value="zero-rate">Tasa cero</option>
            </FormSelect>
          </FormGroup>
        </Col>
      </Row>

      <Alert variant="info" className="mt-3">
        <strong>Nota:</strong> El precio es obligatorio para que el producto se sincronice correctamente con WooCommerce.
      </Alert>
    </div>
  )
}

