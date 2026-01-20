'use client'

import { useState, useEffect } from 'react'
import { Card, Form, Row, Col, Button, ButtonGroup, Badge } from 'react-bootstrap'
import { LuChevronDown, LuChevronUp, LuTrash2, LuArrowUp, LuArrowDown } from 'react-icons/lu'
import type { MaterialItem } from './MaterialesForm'

interface MaterialItemRowProps {
  material: MaterialItem
  index: number
  asignaturas: string[]
  categorias: string[]
  expanded: boolean
  onExpand: () => void
  onUpdate: (material: MaterialItem) => void
  onDelete: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
}

export default function MaterialItemRow({
  material,
  index,
  asignaturas,
  categorias,
  expanded,
  onExpand,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
}: MaterialItemRowProps) {
  const [localMaterial, setLocalMaterial] = useState<MaterialItem>(material)

  useEffect(() => {
    setLocalMaterial(material)
  }, [material])

  const handleChange = (field: keyof MaterialItem, value: any) => {
    const updated = { ...localMaterial, [field]: value }
    setLocalMaterial(updated)
    onUpdate(updated)
  }

  return (
    <Card className="border">
      <Card.Header
        className="d-flex justify-content-between align-items-center cursor-pointer"
        onClick={onExpand}
        style={{ cursor: 'pointer' }}
      >
        <div className="d-flex align-items-center gap-2">
          <Badge bg="secondary">#{index + 1}</Badge>
          <div>
            <strong>{localMaterial.item || 'Sin nombre'}</strong>
            <div className="small text-muted">
              {localMaterial.asignatura} • {localMaterial.cantidad} • {localMaterial.categoria}
            </div>
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <ButtonGroup size="sm">
            {onMoveUp && (
              <Button variant="outline-secondary" onClick={(e) => { e.stopPropagation(); onMoveUp() }}>
                <LuArrowUp />
              </Button>
            )}
            {onMoveDown && (
              <Button variant="outline-secondary" onClick={(e) => { e.stopPropagation(); onMoveDown() }}>
                <LuArrowDown />
              </Button>
            )}
          </ButtonGroup>
          <Button
            variant="outline-danger"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
          >
            <LuTrash2 />
          </Button>
          {expanded ? <LuChevronUp /> : <LuChevronDown />}
        </div>
      </Card.Header>

      {expanded && (
        <Card.Body>
          <Row className="g-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label>Asignatura *</Form.Label>
                <Form.Select
                  value={localMaterial.asignatura}
                  onChange={(e) => handleChange('asignatura', e.target.value)}
                >
                  {asignaturas.map((asig) => (
                    <option key={asig} value={asig}>
                      {asig}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group>
                <Form.Label>Item *</Form.Label>
                <Form.Control
                  type="text"
                  value={localMaterial.item}
                  onChange={(e) => handleChange('item', e.target.value)}
                  placeholder="Ej: Diccionario 4"
                />
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group>
                <Form.Label>Cantidad *</Form.Label>
                <Form.Control
                  type="text"
                  value={localMaterial.cantidad}
                  onChange={(e) => handleChange('cantidad', e.target.value)}
                  placeholder="Ej: 1, 5 Varios"
                />
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group>
                <Form.Label>Categoría *</Form.Label>
                <Form.Select
                  value={localMaterial.categoria}
                  onChange={(e) => handleChange('categoria', e.target.value)}
                >
                  {categorias.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group>
                <Form.Label>Marca</Form.Label>
                <Form.Control
                  type="text"
                  value={localMaterial.marca}
                  onChange={(e) => handleChange('marca', e.target.value)}
                  placeholder="Ej: Santillana, N/A"
                />
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group>
                <Form.Label>ISBN</Form.Label>
                <Form.Control
                  type="text"
                  value={localMaterial.isbn || ''}
                  onChange={(e) => handleChange('isbn', e.target.value)}
                  placeholder="ISBN del libro (opcional)"
                />
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group>
                <Form.Label>Imagen</Form.Label>
                <Form.Control
                  type="text"
                  value={localMaterial.imagen || ''}
                  onChange={(e) => handleChange('imagen', e.target.value)}
                  placeholder="URL de imagen (opcional)"
                />
              </Form.Group>
            </Col>

            <Col md={12}>
              <Form.Group>
                <Form.Label>Notas</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={localMaterial.notas || ''}
                  onChange={(e) => handleChange('notas', e.target.value)}
                  placeholder="Notas adicionales (opcional)"
                />
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group>
                <Form.Label>Relación de Orden</Form.Label>
                <Form.Control
                  type="text"
                  value={localMaterial.relacion_orden || ''}
                  onChange={(e) => handleChange('relacion_orden', e.target.value)}
                  placeholder="Ej: 1 Lenguaje"
                />
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group>
                <Form.Label>Botón</Form.Label>
                <Form.Control
                  type="text"
                  value={localMaterial.boton || ''}
                  onChange={(e) => handleChange('boton', e.target.value)}
                  placeholder="Ej: Validar"
                />
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      )}
    </Card>
  )
}

