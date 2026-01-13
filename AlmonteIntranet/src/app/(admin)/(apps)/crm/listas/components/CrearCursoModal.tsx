'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
  Button,
  Form,
  FormGroup,
  FormLabel,
  FormControl,
  Alert,
  Row,
  Col,
} from 'react-bootstrap'
import Select from 'react-select'

interface CrearCursoModalProps {
  show: boolean
  onHide: () => void
  colegioId: number | string | null
  onSuccess?: (curso: any) => void
}

const NIVELES = [
  { value: 'Basica', label: 'Básica' },
  { value: 'Media', label: 'Media' },
]

const GRADOS_BASICA = Array.from({ length: 8 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1}° Básica`,
}))

const GRADOS_MEDIA = Array.from({ length: 4 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1}° Media`,
}))

const PARALELOS = [
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
  { value: 'C', label: 'C' },
  { value: 'D', label: 'D' },
  { value: 'E', label: 'E' },
  { value: 'F', label: 'F' },
]

const getAñosDisponibles = () => {
  const añoActual = new Date().getFullYear()
  const años = []
  for (let i = -2; i <= 2; i++) {
    años.push({
      value: añoActual + i,
      label: String(añoActual + i),
    })
  }
  return años
}

const AÑOS_DISPONIBLES = getAñosDisponibles()

export default function CrearCursoModal({
  show,
  onHide,
  colegioId,
  onSuccess,
}: CrearCursoModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    nivel: 'Basica' as 'Basica' | 'Media',
    grado: '1',
    paralelo: '',
    año: new Date().getFullYear(),
    activo: true,
  })

  useEffect(() => {
    if (show) {
      setFormData({
        nivel: 'Basica',
        grado: '1',
        paralelo: '',
        año: new Date().getFullYear(),
        activo: true,
      })
      setError(null)
    }
  }, [show])

  const gradosDisponibles = useMemo(() => {
    if (formData.nivel === 'Basica') {
      return GRADOS_BASICA
    } else if (formData.nivel === 'Media') {
      return GRADOS_MEDIA
    }
    return []
  }, [formData.nivel])

  const nombreCursoGenerado = useMemo(() => {
    if (!formData.nivel || !formData.grado) {
      return ''
    }
    const nivelLabel = NIVELES.find((n) => n.value === formData.nivel)?.label || formData.nivel
    const gradoText = `${formData.grado}°`
    const paraleloText = formData.paralelo ? ` ${formData.paralelo}` : ''
    return `${gradoText} ${nivelLabel}${paraleloText}`
  }, [formData.nivel, formData.grado, formData.paralelo])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!colegioId) {
      setError('Debe seleccionar un colegio primero')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Validaciones
      if (!formData.nivel || !formData.grado) {
        throw new Error('El nivel y grado son obligatorios')
      }

      const payload: any = {
        nombre_curso: nombreCursoGenerado,
        nivel: formData.nivel,
        grado: formData.grado,
        año: formData.año,
        activo: formData.activo,
      }

      if (formData.paralelo) {
        payload.paralelo = formData.paralelo
      }

      const response = await fetch(`/api/crm/colegios/${colegioId}/cursos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (result.success) {
        if (onSuccess) {
          onSuccess(result.data)
        }
        onHide()
      } else {
        throw new Error(result.error || 'Error al crear el curso')
      }
    } catch (err: any) {
      setError(err.message || 'Error al crear el curso')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <ModalHeader closeButton>
        <ModalTitle>Crear Nuevo Curso</ModalTitle>
      </ModalHeader>
      <Form onSubmit={handleSubmit}>
        <ModalBody>
          {error && <Alert variant="danger">{error}</Alert>}

          <FormGroup className="mb-3">
            <FormLabel>Nivel *</FormLabel>
            <Select
              options={NIVELES}
              value={NIVELES.find((n) => n.value === formData.nivel)}
              onChange={(option) =>
                setFormData((prev) => ({
                  ...prev,
                  nivel: option?.value || 'Basica',
                  grado: '1', // Resetear grado
                }))
              }
              isSearchable={false}
            />
          </FormGroup>

          <Row>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>Grado *</FormLabel>
                <Select
                  options={gradosDisponibles}
                  value={gradosDisponibles.find((g) => g.value === formData.grado)}
                  onChange={(option) =>
                    setFormData((prev) => ({ ...prev, grado: option?.value || '1' }))
                  }
                  isSearchable={false}
                />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>Paralelo</FormLabel>
                <Select
                  options={PARALELOS}
                  value={PARALELOS.find((p) => p.value === formData.paralelo)}
                  onChange={(option) =>
                    setFormData((prev) => ({ ...prev, paralelo: option?.value || '' }))
                  }
                  isClearable
                  isSearchable={false}
                  placeholder="Opcional"
                />
              </FormGroup>
            </Col>
          </Row>

          <FormGroup className="mb-3">
            <FormLabel>Año *</FormLabel>
            <Select
              options={AÑOS_DISPONIBLES}
              value={AÑOS_DISPONIBLES.find((a) => a.value === formData.año)}
              onChange={(option) =>
                setFormData((prev) => ({
                  ...prev,
                  año: option?.value || new Date().getFullYear(),
                }))
              }
              isSearchable={false}
            />
          </FormGroup>

          {nombreCursoGenerado && (
            <Alert variant="info" className="mb-3">
              <strong>Nombre del curso:</strong> {nombreCursoGenerado}
            </Alert>
          )}

          <FormGroup className="mb-3">
            <Form.Check
              type="switch"
              label="Curso activo"
              checked={formData.activo}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, activo: e.target.checked }))
              }
            />
          </FormGroup>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={onHide} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" disabled={loading || !colegioId}>
            {loading ? 'Creando...' : 'Crear Curso'}
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  )
}
