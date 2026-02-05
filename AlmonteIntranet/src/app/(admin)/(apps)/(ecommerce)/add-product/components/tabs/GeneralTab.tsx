'use client'

import { memo } from 'react'
import { FormGroup, FormLabel, FormControl, FormSelect, Row, Col, Alert } from 'react-bootstrap'

interface GeneralTabProps {
  formData: any
  updateField: (field: string, value: any) => void
}

const GeneralTab = memo(function GeneralTab({ formData, updateField }: GeneralTabProps) {
  return (
    <div>
      <h5 className="mb-4">Información General del Producto</h5>
      
      <Alert variant="info" className="mb-4">
        <strong>ℹ️ Nota:</strong> Los precios y el inventario se gestionan desde el módulo de <strong>Inventario/Proveedores</strong>.
      </Alert>

      <Row>
        <Col md={6}>
          <FormGroup className="mb-3">
            <FormLabel>Sale quantity</FormLabel>
            <FormControl
              type="number"
              min="0"
              placeholder="0"
              value={formData.sale_quantity || ''}
              onChange={(e) => updateField('sale_quantity', e.target.value)}
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
              onChange={(e) => updateField('sold_items', e.target.value)}
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
              onChange={(e) => updateField('tax_status', e.target.value)}
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
              onChange={(e) => updateField('tax_class', e.target.value)}
            >
              <option value="standard">Estándar</option>
              <option value="reduced-rate">Tasa reducida</option>
              <option value="zero-rate">Tasa cero</option>
            </FormSelect>
          </FormGroup>
        </Col>
      </Row>
    </div>
  )
})

export default GeneralTab

