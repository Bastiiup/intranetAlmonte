'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Form, Button, Row, Col, Card } from 'react-bootstrap'
import toast from 'react-hot-toast'

import strapiClient from '@/lib/strapi/client'

type CategoriaEvaluacion = 'Basica' | 'Media' | 'Simce' | 'Paes' | 'Universitaria'

type LibroMiraOption = {
  id: number
  nombre: string
}

type FormaState = {
  nombre_forma: string
  codigo_evaluacion: string
  pauta_respuestas_text: string
}

const CATEGORIAS: { value: CategoriaEvaluacion; label: string }[] = [
  { value: 'Basica', label: 'Básica' },
  { value: 'Media', label: 'Media' },
  { value: 'Simce', label: 'Simce' },
  { value: 'Paes', label: 'PAES' },
  { value: 'Universitaria', label: 'Universitaria' },
]

export function CrearEvaluacionOmrForm() {
  const router = useRouter()

  const [nombre, setNombre] = useState('')
  const [categoria, setCategoria] = useState<CategoriaEvaluacion | ''>('Paes')
  const [cantidadPreguntas, setCantidadPreguntas] = useState<number | ''>('')
  const [libroMiraId, setLibroMiraId] = useState<number | ''>('')

  const [librosOptions, setLibrosOptions] = useState<LibroMiraOption[]>([])
  const [isLoadingLibros, setIsLoadingLibros] = useState(false)

  const [formas, setFormas] = useState<FormaState[]>([
    { nombre_forma: 'Forma A', codigo_evaluacion: '', pauta_respuestas_text: '' },
  ])

  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchLibrosMira = async () => {
    try {
      setIsLoadingLibros(true)
      const response = await strapiClient.get<any>(
        '/api/libros-mira?populate[libro]=true&pagination[pageSize]=100',
      )

      const dataArray = Array.isArray(response?.data) ? response.data : []

      const options: LibroMiraOption[] = dataArray
        .map((item: any) => {
          const id = item.id
          const attributes = item.attributes || {}
          const libro = attributes.libro?.data
          const nombre = libro?.attributes?.nombre || attributes.nombre || `Libro ${id}`

          if (!id || !nombre) return null

          return {
            id,
            nombre,
          }
        })
        .filter(Boolean) as LibroMiraOption[]

      setLibrosOptions(options)
    } catch (error: any) {
      console.error('Error al cargar libros MIRA', error)
      toast.error('Error al cargar libros MIRA')
    } finally {
      setIsLoadingLibros(false)
    }
  }

  const handleAddForma = () => {
    setFormas((prev) => [
      ...prev,
      { nombre_forma: `Forma ${String.fromCharCode(65 + prev.length)}`, codigo_evaluacion: '', pauta_respuestas_text: '' },
    ])
  }

  const handleRemoveForma = (index: number) => {
    setFormas((prev) => prev.filter((_, i) => i !== index))
  }

  const handleFormaChange = (index: number, field: keyof FormaState, value: string) => {
    setFormas((prev) =>
      prev.map((forma, i) => (i === index ? { ...forma, [field]: value } : forma)),
    )
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!nombre.trim()) {
      toast.error('El nombre de la prueba es obligatorio')
      return
    }

    if (!categoria) {
      toast.error('La categoría es obligatoria')
      return
    }

    if (!cantidadPreguntas || cantidadPreguntas <= 0) {
      toast.error('La cantidad de preguntas debe ser mayor a 0')
      return
    }

    if (!libroMiraId) {
      toast.error('Debes seleccionar un libro MIRA')
      return
    }

    if (formas.length === 0) {
      toast.error('Debes agregar al menos una forma')
      return
    }

    let formasParsed
    try {
      formasParsed = formas.map((forma, index) => {
        if (!forma.nombre_forma.trim()) {
          throw new Error(`La forma #${index + 1} debe tener un nombre`)
        }
        if (!forma.codigo_evaluacion.trim()) {
          throw new Error(`La forma #${index + 1} debe tener un código de evaluación`)
        }
        if (!forma.pauta_respuestas_text.trim()) {
          throw new Error(`La forma #${index + 1} debe tener una pauta de respuestas`)
        }

        let pautaJson: Record<string, string>
        try {
          pautaJson = JSON.parse(forma.pauta_respuestas_text)
        } catch (error) {
          throw new Error(
            `La pauta de respuestas de la forma "${forma.nombre_forma}" no es un JSON válido`,
          )
        }

        return {
          nombre_forma: forma.nombre_forma.trim(),
          codigo_evaluacion: forma.codigo_evaluacion.trim(),
          pauta_respuestas: pautaJson,
        }
      })
    } catch (validationError: any) {
      toast.error(validationError.message || 'Error al validar las formas')
      return
    }

    const payload = {
      data: {
        nombre: nombre.trim(),
        categoria,
        cantidad_preguntas: cantidadPreguntas,
        libro_mira: libroMiraId,
        activo: true,
        formas: formasParsed,
      },
    }

    try {
      setIsSubmitting(true)
      await strapiClient.post('/api/evaluacions', payload)

      toast.success('Evaluación creada correctamente')
      router.push('/(admin)/(apps)/mira/evaluaciones-omr')
    } catch (error: any) {
      console.error('Error al crear evaluación', error)
      const message =
        error?.message ||
        error?.details?.errors?.[0]?.message ||
        'Error al crear la evaluación'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="mt-3">
      <Card.Body>
        <Form onSubmit={handleSubmit}>
          <Row className="mb-3">
            <Col md={6}>
              <Form.Group controlId="nombre">
                <Form.Label>Nombre de la prueba</Form.Label>
                <Form.Control
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Ensayo PAES 1"
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group controlId="categoria">
                <Form.Label>Categoría</Form.Label>
                <Form.Select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value as CategoriaEvaluacion)}
                >
                  <option value="">Selecciona categoría</option>
                  {CATEGORIAS.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group controlId="cantidadPreguntas">
                <Form.Label>Cantidad de preguntas</Form.Label>
                <Form.Control
                  type="number"
                  min={1}
                  value={cantidadPreguntas}
                  onChange={(e) =>
                    setCantidadPreguntas(e.target.value ? Number(e.target.value) : '')
                  }
                />
              </Form.Group>
            </Col>
          </Row>

          <Row className="mb-3">
            <Col md={6}>
              <Form.Group controlId="libroMira">
                <Form.Label>Libro MIRA</Form.Label>
                <div className="d-flex gap-2">
                  <Form.Select
                    value={libroMiraId}
                    onChange={(e) =>
                      setLibroMiraId(e.target.value ? Number(e.target.value) : '')
                    }
                    onFocus={() => {
                      if (librosOptions.length === 0 && !isLoadingLibros) {
                        fetchLibrosMira()
                      }
                    }}
                  >
                    <option value="">
                      {isLoadingLibros ? 'Cargando libros...' : 'Selecciona un libro MIRA'}
                    </option>
                    {librosOptions.map((libro) => (
                      <option key={libro.id} value={libro.id}>
                        {libro.nombre}
                      </option>
                    ))}
                  </Form.Select>
                  <Button
                    variant="outline-secondary"
                    type="button"
                    disabled={isLoadingLibros}
                    onClick={fetchLibrosMira}
                  >
                    {isLoadingLibros ? 'Actualizando...' : 'Actualizar'}
                  </Button>
                </div>
              </Form.Group>
            </Col>
          </Row>

          <hr className="my-4" />

          <h5 className="mb-3">Formas de la evaluación</h5>

          {formas.map((forma, index) => (
            <Card key={index} className="mb-3">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="mb-0">Forma #{index + 1}</h6>
                  {formas.length > 1 && (
                    <Button
                      variant="outline-danger"
                      size="sm"
                      type="button"
                      onClick={() => handleRemoveForma(index)}
                    >
                      Eliminar
                    </Button>
                  )}
                </div>

                <Row className="mb-3">
                  <Col md={4}>
                    <Form.Group controlId={`forma-nombre-${index}`}>
                      <Form.Label>Nombre de la forma</Form.Label>
                      <Form.Control
                        type="text"
                        value={forma.nombre_forma}
                        onChange={(e) =>
                          handleFormaChange(index, 'nombre_forma', e.target.value)
                        }
                        placeholder="Ej: Forma A"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group controlId={`forma-codigo-${index}`}>
                      <Form.Label>Código de evaluación</Form.Label>
                      <Form.Control
                        type="text"
                        value={forma.codigo_evaluacion}
                        onChange={(e) =>
                          handleFormaChange(index, 'codigo_evaluacion', e.target.value)
                        }
                        placeholder="Ej: B1234567"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group controlId={`forma-pauta-${index}`}>
                      <Form.Label>Pauta de respuestas (JSON)</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={4}
                        value={forma.pauta_respuestas_text}
                        onChange={(e) =>
                          handleFormaChange(index, 'pauta_respuestas_text', e.target.value)
                        }
                        placeholder='Ej: {"1":"A","2":"C","3":"B"}'
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          ))}

          <div className="mb-4">
            <Button variant="outline-primary" type="button" onClick={handleAddForma}>
              Agregar otra forma
            </Button>
          </div>

          <div className="d-flex justify-content-end gap-2">
            <Button
              variant="secondary"
              type="button"
              onClick={() => router.push('/(admin)/(apps)/mira/evaluaciones-omr')}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button variant="primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar evaluación'}
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  )
}

