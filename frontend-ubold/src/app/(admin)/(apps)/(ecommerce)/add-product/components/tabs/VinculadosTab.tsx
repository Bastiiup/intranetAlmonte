'use client'

import { memo } from 'react'
import { FormGroup, FormLabel, FormControl, Row, Col } from 'react-bootstrap'

interface VinculadosTabProps {
  formData: any
  updateField: (field: string, value: any) => void
}

const VinculadosTab = memo(function VinculadosTab({ formData, updateField }: VinculadosTabProps) {
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
              onChange={(e) => updateField('upsell_ids', e.target.value)}
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
              onChange={(e) => updateField('cross_sell_ids', e.target.value)}
            />
            <small className="text-muted">Productos que se mostrarán como "Cross-sells"</small>
          </FormGroup>
        </Col>
      </Row>
    </div>
  )
})

export default VinculadosTab
