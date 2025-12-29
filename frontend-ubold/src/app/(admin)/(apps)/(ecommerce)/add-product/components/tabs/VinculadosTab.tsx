'use client'

import { FormGroup, FormLabel, FormControl, Row, Col } from 'react-bootstrap'

interface VinculadosTabProps {
  formData: any
  setFormData: (data: any) => void
}

export default function VinculadosTab({ formData, setFormData }: VinculadosTabProps) {
  return (
    <div>
      <h5 className="mb-4">Productos Vinculados</h5>
      
      <Row>
        <Col md={6}>
          <FormGroup className="mb-3">
            <FormLabel>Ventas dirigidas</FormLabel>
            <FormControl
              type="text"
              placeholder="Busca un producto..."
              value={formData.upsell_ids || ''}
              onChange={(e) => setFormData({ ...formData, upsell_ids: e.target.value })}
            />
            <small className="text-muted">Productos que se mostrarán como "Upsells"</small>
          </FormGroup>
        </Col>

        <Col md={6}>
          <FormGroup className="mb-3">
            <FormLabel>Ventas cruzadas</FormLabel>
            <FormControl
              type="text"
              placeholder="Busca un producto..."
              value={formData.cross_sell_ids || ''}
              onChange={(e) => setFormData({ ...formData, cross_sell_ids: e.target.value })}
            />
            <small className="text-muted">Productos que se mostrarán como "Cross-sells"</small>
          </FormGroup>
        </Col>
      </Row>
    </div>
  )
}

