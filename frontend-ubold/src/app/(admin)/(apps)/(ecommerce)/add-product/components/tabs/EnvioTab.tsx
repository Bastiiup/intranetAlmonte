'use client'

import { FormGroup, FormLabel, FormControl, FormSelect, Row, Col } from 'react-bootstrap'

interface EnvioTabProps {
  formData: any
  setFormData: (data: any) => void
}

export default function EnvioTab({ formData, setFormData }: EnvioTabProps) {
  return (
    <div>
      <h5 className="mb-4">Configuración de Envío</h5>
      
      <Row>
        <Col md={6}>
          <FormGroup className="mb-3">
            <FormLabel>Peso (kg)</FormLabel>
            <FormControl
              type="number"
              step="0.01"
              min="0"
              placeholder="0"
              value={formData.weight || ''}
              onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
            />
            <small className="text-muted">Peso del producto en kilogramos</small>
          </FormGroup>
        </Col>
      </Row>

      <div className="mb-4">
        <FormLabel className="mb-2">Dimensiones (cm)</FormLabel>
        <Row>
          <Col md={4}>
            <FormGroup>
              <FormLabel>Longitud</FormLabel>
              <FormControl
                type="number"
                step="0.01"
                min="0"
                placeholder="0"
                value={formData.length || ''}
                onChange={(e) => setFormData({ ...formData, length: e.target.value })}
              />
            </FormGroup>
          </Col>
          <Col md={4}>
            <FormGroup>
              <FormLabel>Ancho</FormLabel>
              <FormControl
                type="number"
                step="0.01"
                min="0"
                placeholder="0"
                value={formData.width || ''}
                onChange={(e) => setFormData({ ...formData, width: e.target.value })}
              />
            </FormGroup>
          </Col>
          <Col md={4}>
            <FormGroup>
              <FormLabel>Altura</FormLabel>
              <FormControl
                type="number"
                step="0.01"
                min="0"
                placeholder="0"
                value={formData.height || ''}
                onChange={(e) => setFormData({ ...formData, height: e.target.value })}
              />
            </FormGroup>
          </Col>
        </Row>
      </div>

      <Row>
        <Col md={6}>
          <FormGroup className="mb-3">
            <FormLabel>Clase de envío</FormLabel>
            <FormSelect
              value={formData.shipping_class || ''}
              onChange={(e) => setFormData({ ...formData, shipping_class: e.target.value })}
            >
              <option value="">Ninguna clase de envío</option>
              <option value="standard">Estándar</option>
              <option value="express">Express</option>
              <option value="overnight">Overnight</option>
            </FormSelect>
          </FormGroup>
        </Col>
      </Row>
    </div>
  )
}

