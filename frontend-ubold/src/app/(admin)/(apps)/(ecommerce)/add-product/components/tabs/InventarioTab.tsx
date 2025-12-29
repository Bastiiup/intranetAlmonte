'use client'

import { FormGroup, FormLabel, FormControl, FormCheck, Row, Col } from 'react-bootstrap'

interface InventarioTabProps {
  formData: any
  setFormData: (data: any) => void
}

export default function InventarioTab({ formData, setFormData }: InventarioTabProps) {
  return (
    <div>
      <h5 className="mb-4">Gestión de Inventario</h5>
      
      <Row>
        <Col md={6}>
          <FormGroup className="mb-3">
            <FormLabel>SKU</FormLabel>
            <FormControl
              type="text"
              placeholder="SKU del producto"
              value={formData.sku || formData.isbn_libro || ''}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
            />
            <small className="text-muted">Código único del producto (se puede usar el ISBN)</small>
          </FormGroup>
        </Col>

        <Col md={6}>
          <FormGroup className="mb-3">
            <FormLabel>GTIN, UPC, EAN, o ISBN</FormLabel>
            <FormControl
              type="text"
              placeholder="ISBN del libro"
              value={formData.isbn_libro || ''}
              onChange={(e) => setFormData({ ...formData, isbn_libro: e.target.value })}
            />
            <small className="text-muted">Identificador internacional del producto</small>
          </FormGroup>
        </Col>
      </Row>

      <div className="mb-4">
        <FormCheck
          type="checkbox"
          id="manage_stock"
          label="Hacer seguimiento de la cantidad de inventario de este producto"
          checked={formData.manage_stock !== false}
          onChange={(e) => setFormData({ ...formData, manage_stock: e.target.checked })}
        />
      </div>

      {formData.manage_stock !== false && (
        <Row>
          <Col md={6}>
            <FormGroup className="mb-3">
              <FormLabel>Cantidad de stock</FormLabel>
              <FormControl
                type="number"
                min="0"
                placeholder="0"
                value={formData.stock_quantity || ''}
                onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
              />
            </FormGroup>
          </Col>
        </Row>
      )}

      <div className="mb-4">
        <FormLabel className="mb-2">Estado del inventario</FormLabel>
        <div>
          <FormCheck
            type="radio"
            id="stock_instock"
            name="stock_status"
            label="En stock"
            checked={formData.stock_status === 'instock'}
            onChange={() => setFormData({ ...formData, stock_status: 'instock' })}
          />
          <FormCheck
            type="radio"
            id="stock_outofstock"
            name="stock_status"
            label="Agotado"
            checked={formData.stock_status === 'outofstock'}
            onChange={() => setFormData({ ...formData, stock_status: 'outofstock' })}
          />
          <FormCheck
            type="radio"
            id="stock_onbackorder"
            name="stock_status"
            label="Se puede reservar"
            checked={formData.stock_status === 'onbackorder'}
            onChange={() => setFormData({ ...formData, stock_status: 'onbackorder' })}
          />
        </div>
      </div>

      <div className="mb-4">
        <FormLabel className="mb-2">Vendido individualmente</FormLabel>
        <FormCheck
          type="checkbox"
          id="sold_individually"
          label="Limitar compras a 1 artículo por pedido"
          checked={formData.sold_individually || false}
          onChange={(e) => setFormData({ ...formData, sold_individually: e.target.checked })}
        />
      </div>
    </div>
  )
}

