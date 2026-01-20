'use client'

import { useState, useMemo } from 'react'
import { Button, Form, Row, Col, Alert, Spinner } from 'react-bootstrap'
import { LuPlus } from 'react-icons/lu'
import MaterialItemRow from './MaterialItemRow'

export interface MaterialItem {
  item: string
  asignatura: string
  cantidad: string
  categoria: string
  marca: string
  isbn?: string
  imagen?: string
  notas?: string
  relacion_orden?: string
  relacion_orden_num?: number
  boton?: string
}

interface MaterialesFormProps {
  materiales: MaterialItem[]
  onChange: (materiales: MaterialItem[]) => void
  loading?: boolean
}

const ASIGNATURAS = [
  'Lenguaje',
  'Matemáticas',
  'Ciencias Naturales',
  'Historia',
  'Geografía',
  'Educación Física',
  'Arte',
  'Música',
  'Inglés',
  'Tecnología',
  'Religión',
  'Orientación',
  'Otro',
]

const CATEGORIAS = [
  'Libro',
  'Cuaderno',
  'Útil Escolar',
  'Material de Arte',
  'Material de Laboratorio',
  'Otro',
]

export default function MaterialesForm({
  materiales,
  onChange,
  loading = false,
}: MaterialesFormProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  const handleAddMaterial = () => {
    const nuevoMaterial: MaterialItem = {
      item: '',
      asignatura: ASIGNATURAS[0],
      cantidad: '1',
      categoria: CATEGORIAS[0],
      marca: '',
    }
    onChange([...materiales, nuevoMaterial])
    setExpandedIndex(materiales.length)
  }

  const handleUpdateMaterial = (index: number, material: MaterialItem) => {
    const updated = [...materiales]
    updated[index] = material
    onChange(updated)
  }

  const handleDeleteMaterial = (index: number) => {
    const updated = materiales.filter((_, i) => i !== index)
    onChange(updated)
    if (expandedIndex === index) {
      setExpandedIndex(null)
    } else if (expandedIndex !== null && expandedIndex > index) {
      setExpandedIndex(expandedIndex - 1)
    }
  }

  const handleMoveUp = (index: number) => {
    if (index === 0) return
    const updated = [...materiales]
    ;[updated[index - 1], updated[index]] = [updated[index], updated[index - 1]]
    onChange(updated)
    setExpandedIndex(index - 1)
  }

  const handleMoveDown = (index: number) => {
    if (index === materiales.length - 1) return
    const updated = [...materiales]
    ;[updated[index], updated[index + 1]] = [updated[index + 1], updated[index]]
    onChange(updated)
    setExpandedIndex(index + 1)
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center p-5">
        <Spinner animation="border" variant="primary" />
      </div>
    )
  }

  return (
    <div className="p-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="mb-0">Materiales ({materiales.length})</h6>
        <Button variant="primary" size="sm" onClick={handleAddMaterial}>
          <LuPlus className="me-1" />
          Agregar Material
        </Button>
      </div>

      {materiales.length === 0 ? (
        <Alert variant="info">
          No hay materiales. Haz clic en "Agregar Material" para comenzar.
        </Alert>
      ) : (
        <div className="d-flex flex-column gap-2">
          {materiales.map((material, index) => (
            <MaterialItemRow
              key={index}
              material={material}
              index={index}
              asignaturas={ASIGNATURAS}
              categorias={CATEGORIAS}
              expanded={expandedIndex === index}
              onExpand={() => setExpandedIndex(expandedIndex === index ? null : index)}
              onUpdate={(updated) => handleUpdateMaterial(index, updated)}
              onDelete={() => handleDeleteMaterial(index)}
              onMoveUp={index > 0 ? () => handleMoveUp(index) : undefined}
              onMoveDown={index < materiales.length - 1 ? () => handleMoveDown(index) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}
