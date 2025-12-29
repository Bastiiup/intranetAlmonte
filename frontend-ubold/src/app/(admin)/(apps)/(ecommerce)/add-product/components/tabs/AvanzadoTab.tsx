'use client'

import { FormGroup, FormLabel, FormControl, FormCheck, Row, Col } from 'react-bootstrap'

interface AvanzadoTabProps {
  formData: any
  setFormData: (data: any) => void
}

export default function AvanzadoTab({ formData, setFormData }: AvanzadoTabProps) {
  return (
    <div>
      <h5 className="mb-4">Configuración Avanzada</h5>
      
      <Row>
        <Col md={12}>
          <FormGroup className="mb-3">
            <FormLabel>Nota de compra</FormLabel>
            <FormControl
              as="textarea"
              rows={4}
              placeholder="Nota que se enviará al cliente después de la compra"
              value={formData.purchase_note || ''}
              onChange={(e) => setFormData({ ...formData, purchase_note: e.target.value })}
            />
          </FormGroup>
        </Col>
      </Row>

      <Row>
        <Col md={6}>
          <FormGroup className="mb-3">
            <FormLabel>Orden en el menú</FormLabel>
            <FormControl
              type="number"
              min="0"
              value={formData.menu_order || '0'}
              onChange={(e) => setFormData({ ...formData, menu_order: e.target.value })}
            />
            <small className="text-muted">Orden de visualización en listados</small>
          </FormGroup>
        </Col>
      </Row>

      <div className="mb-4">
        <FormCheck
          type="checkbox"
          id="reviews_allowed"
          label="Activa las valoraciones"
          checked={formData.reviews_allowed !== false}
          onChange={(e) => setFormData({ ...formData, reviews_allowed: e.target.checked })}
        />
      </div>

      <div className="mb-4">
        <FormCheck
          type="checkbox"
          id="virtual"
          label="Virtual"
          checked={formData.virtual || false}
          onChange={(e) => setFormData({ ...formData, virtual: e.target.checked })}
        />
        <small className="text-muted d-block ms-4">Activa esto si el producto no requiere envío</small>
      </div>

      <div className="mb-4">
        <FormCheck
          type="checkbox"
          id="downloadable"
          label="Descargable"
          checked={formData.downloadable || false}
          onChange={(e) => setFormData({ ...formData, downloadable: e.target.checked })}
        />
        <small className="text-muted d-block ms-4">Activa esto si el producto es descargable</small>
      </div>
    </div>
  )
}

