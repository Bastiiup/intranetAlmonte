'use client'

import { useState, useEffect } from 'react'
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter, Button, Form, FormGroup, FormLabel, FormControl, Alert, Row, Col } from 'react-bootstrap'
import { LuPlus, LuTrash2 } from 'react-icons/lu'

interface Material {
  material_nombre: string
  tipo: 'util' | 'libro' | 'cuaderno' | 'otro'
  cantidad: number
  obligatorio: boolean
  descripcion?: string
}

interface CursoData {
  curso_nombre: string
  nivel?: string
  grado?: string
  activo: boolean
  materiales: Material[]
}

interface CursoModalProps {
  show: boolean
  onHide: () => void
  colegioId: string
  curso?: any // Curso existente para editar
  onSuccess?: () => void
}

const TIPOS_MATERIAL = [
  { value: 'util', label: 'Útil Escolar' },
  { value: 'libro', label: 'Libro' },
  { value: 'cuaderno', label: 'Cuaderno' },
  { value: 'otro', label: 'Otro' },
]

const NIVELES = [
  'Básico',
  'Medio',
  'Superior',
]

export default function CursoModal({ show, onHide, colegioId, curso, onSuccess }: CursoModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<CursoData>({
    curso_nombre: '',
    nivel: '',
    grado: '',
    activo: true,
    materiales: [],
  })

  // Cargar datos del curso si se está editando
  useEffect(() => {
    if (show) {
      if (curso) {
        const attrs = curso.attributes || curso
        // El campo en Strapi se llama "nombre", pero mantenemos curso_nombre en el frontend
        setFormData({
          curso_nombre: attrs.nombre || attrs.curso_nombre || '',
          nivel: attrs.nivel || '',
          grado: attrs.grado || '',
          activo: attrs.activo !== false,
          materiales: (attrs.materiales || []).map((m: any) => ({
            material_nombre: m.material_nombre || '',
            tipo: m.tipo || 'util',
            cantidad: m.cantidad || 1,
            obligatorio: m.obligatorio !== false,
            descripcion: m.descripcion || '',
          })),
        })
      } else {
        // Resetear formulario para nuevo curso
        setFormData({
          curso_nombre: '',
          nivel: '',
          grado: '',
          activo: true,
          materiales: [],
        })
      }
      setError(null)
    }
  }, [show, curso])

  const handleFieldChange = (field: keyof CursoData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleMaterialChange = (index: number, field: keyof Material, value: any) => {
    setFormData((prev) => ({
      ...prev,
      materiales: prev.materiales.map((m, i) =>
        i === index ? { ...m, [field]: value } : m
      ),
    }))
  }

  const handleAddMaterial = () => {
    setFormData((prev) => ({
      ...prev,
      materiales: [
        ...prev.materiales,
        {
          material_nombre: '',
          tipo: 'util',
          cantidad: 1,
          obligatorio: true,
          descripcion: '',
        },
      ],
    }))
  }

  const handleRemoveMaterial = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      materiales: prev.materiales.filter((_, i) => i !== index),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validaciones
      if (!formData.curso_nombre.trim()) {
        throw new Error('El nombre del curso es obligatorio')
      }

      // Validar materiales
      const materialesInvalidos = formData.materiales.filter(
        (m) => !m.material_nombre.trim()
      )
      if (materialesInvalidos.length > 0) {
        throw new Error('Todos los materiales deben tener un nombre')
      }

      const url = curso
        ? `/api/crm/cursos/${curso.documentId || curso.id}`
        : `/api/crm/colegios/${colegioId}/cursos`

      const method = curso ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          curso_nombre: formData.curso_nombre.trim(), // Frontend usa curso_nombre
          nombre: formData.curso_nombre.trim(), // Strapi usa nombre
          nivel: formData.nivel || undefined,
          grado: formData.grado || undefined,
          activo: formData.activo,
          materiales: formData.materiales.filter((m) => m.material_nombre.trim()),
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al guardar el curso')
      }

      // Cerrar modal y ejecutar callback
      onHide()
      if (onSuccess) {
        setTimeout(() => {
          onSuccess()
        }, 100)
      }
    } catch (err: any) {
      console.error('Error al guardar curso:', err)
      setError(err.message || 'Error al guardar el curso')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!curso) return

    if (!confirm('¿Estás seguro de que deseas eliminar este curso? Esta acción no se puede deshacer.')) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/crm/cursos/${curso.documentId || curso.id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al eliminar el curso')
      }

      // Cerrar modal y ejecutar callback
      onHide()
      if (onSuccess) {
        setTimeout(() => {
          onSuccess()
        }, 100)
      }
    } catch (err: any) {
      console.error('Error al eliminar curso:', err)
      setError(err.message || 'Error al eliminar el curso')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <ModalHeader closeButton>
        <ModalTitle>{curso ? 'Editar Curso' : 'Agregar Curso'}</ModalTitle>
      </ModalHeader>
      <Form onSubmit={handleSubmit}>
        <ModalBody>
          {error && (
            <Alert variant="danger" className="mb-3">
              {error}
            </Alert>
          )}

          <Row>
            <Col md={12}>
              <FormGroup className="mb-3">
                <FormLabel>Nombre del Curso *</FormLabel>
                <FormControl
                  type="text"
                  value={formData.curso_nombre}
                  onChange={(e) => handleFieldChange('curso_nombre', e.target.value)}
                  placeholder="Ej: 1° Básico, Matemáticas 3° Medio"
                  required
                />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>Nivel</FormLabel>
                <FormControl
                  as="select"
                  value={formData.nivel}
                  onChange={(e) => handleFieldChange('nivel', e.target.value)}
                >
                  <option value="">Seleccionar nivel</option>
                  {NIVELES.map((nivel) => (
                    <option key={nivel} value={nivel}>
                      {nivel}
                    </option>
                  ))}
                </FormControl>
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>Grado</FormLabel>
                <FormControl
                  type="text"
                  value={formData.grado}
                  onChange={(e) => handleFieldChange('grado', e.target.value)}
                  placeholder="Ej: 1° Básico, 2° Medio"
                />
              </FormGroup>
            </Col>
            <Col md={12}>
              <FormGroup className="mb-3">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={formData.activo}
                    onChange={(e) => handleFieldChange('activo', e.target.checked)}
                    id="activo"
                  />
                  <label className="form-check-label" htmlFor="activo">
                    Curso activo
                  </label>
                </div>
              </FormGroup>
            </Col>
          </Row>

          <hr className="my-4" />

          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0">Lista de Útiles / Materiales</h5>
            <Button
              type="button"
              variant="outline-primary"
              size="sm"
              onClick={handleAddMaterial}
            >
              <LuPlus className="me-1" size={16} />
              Agregar Material
            </Button>
          </div>

          {formData.materiales.length === 0 ? (
            <Alert variant="info">
              No hay materiales agregados. Haz clic en "Agregar Material" para comenzar.
            </Alert>
          ) : (
            <div className="list-group">
              {formData.materiales.map((material, index) => (
                <div key={index} className="list-group-item mb-3 border rounded p-3">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <h6 className="mb-0">Material #{index + 1}</h6>
                    <Button
                      type="button"
                      variant="outline-danger"
                      size="sm"
                      onClick={() => handleRemoveMaterial(index)}
                    >
                      <LuTrash2 size={14} />
                    </Button>
                  </div>
                  <Row>
                    <Col md={12}>
                      <FormGroup className="mb-2">
                        <FormLabel>Nombre del Material *</FormLabel>
                        <FormControl
                          type="text"
                          value={material.material_nombre}
                          onChange={(e) =>
                            handleMaterialChange(index, 'material_nombre', e.target.value)
                          }
                          placeholder="Ej: Lápiz grafito, Libro de Matemáticas"
                          required
                        />
                      </FormGroup>
                    </Col>
                    <Col md={4}>
                      <FormGroup className="mb-2">
                        <FormLabel>Tipo *</FormLabel>
                        <FormControl
                          as="select"
                          value={material.tipo}
                          onChange={(e) =>
                            handleMaterialChange(index, 'tipo', e.target.value as Material['tipo'])
                          }
                          required
                        >
                          {TIPOS_MATERIAL.map((tipo) => (
                            <option key={tipo.value} value={tipo.value}>
                              {tipo.label}
                            </option>
                          ))}
                        </FormControl>
                      </FormGroup>
                    </Col>
                    <Col md={3}>
                      <FormGroup className="mb-2">
                        <FormLabel>Cantidad *</FormLabel>
                        <FormControl
                          type="number"
                          min="1"
                          value={material.cantidad}
                          onChange={(e) =>
                            handleMaterialChange(index, 'cantidad', parseInt(e.target.value) || 1)
                          }
                          required
                        />
                      </FormGroup>
                    </Col>
                    <Col md={5}>
                      <FormGroup className="mb-2">
                        <div className="form-check mt-4">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            checked={material.obligatorio}
                            onChange={(e) =>
                              handleMaterialChange(index, 'obligatorio', e.target.checked)
                            }
                            id={`obligatorio-${index}`}
                          />
                          <label className="form-check-label" htmlFor={`obligatorio-${index}`}>
                            Obligatorio
                          </label>
                        </div>
                      </FormGroup>
                    </Col>
                    <Col md={12}>
                      <FormGroup className="mb-0">
                        <FormLabel>Descripción (opcional)</FormLabel>
                        <FormControl
                          as="textarea"
                          rows={2}
                          value={material.descripcion || ''}
                          onChange={(e) =>
                            handleMaterialChange(index, 'descripcion', e.target.value)
                          }
                          placeholder="Descripción adicional del material..."
                        />
                      </FormGroup>
                    </Col>
                  </Row>
                </div>
              ))}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          {curso && (
            <Button
              type="button"
              variant="danger"
              onClick={handleDelete}
              disabled={loading}
              className="me-auto"
            >
              Eliminar
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={onHide} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Guardando...' : curso ? 'Actualizar' : 'Crear'}
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  )
}
