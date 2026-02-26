'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Form, Button, Row, Col, Card } from 'react-bootstrap'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'

type CategoriaEvaluacion = 'Basica' | 'Media' | 'Simce' | 'Paes' | 'Universitaria'

type LibroMiraOption = {
  id: number
  nombre: string
}

export type MapaPreguntaItem = {
  numero?: number
  codigo_pregunta?: string
  habilidad?: string
  nivel?: string
  tema?: string
  subtema?: string
  imagen?: string
}

type FormaState = {
  nombre_forma: string
  codigo_evaluacion: string
  /** Mapa número de pregunta (1-based) → letra correcta ("A" | "B" | "C" | "D" | "E") */
  pauta_respuestas: Record<string, string>
  /** Metadata por pregunta (importado desde Excel) */
  mapa_preguntas?: MapaPreguntaItem[]
}

const OPCIONES_RESPUESTA = ['A', 'B', 'C', 'D', 'E'] as const

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
    { nombre_forma: 'Forma A', codigo_evaluacion: '', pauta_respuestas: {} },
  ])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isImportingExcel, setIsImportingExcel] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchLibrosMira = async () => {
    try {
      setIsLoadingLibros(true)
      const res = await fetch('/api/mira/libros-mira')
      const response = await res.json()
      if (!res.ok) {
        throw new Error(response?.error || res.statusText)
      }

      const dataArray = Array.isArray(response?.data) ? response.data : []

      const options: LibroMiraOption[] = dataArray
        .map((item: any) => {
          const id = item.id
          const att = item.attributes || item
          const libro = att.libro?.data?.attributes ?? att.libro?.attributes ?? att.libro
          const nombre = libro?.nombre_libro ?? att.nombre ?? `Libro ${id}`

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
      toast.error(error?.message || 'Error al cargar libros MIRA')
    } finally {
      setIsLoadingLibros(false)
    }
  }

  const handleAddForma = () => {
    setFormas((prev) => [
      ...prev,
      { nombre_forma: `Forma ${String.fromCharCode(65 + prev.length)}`, codigo_evaluacion: '', pauta_respuestas: {}, mapa_preguntas: [] },
    ])
  }

  const handleRemoveForma = (index: number) => {
    setFormas((prev) => prev.filter((_, i) => i !== index))
  }

  const handleFormaChange = (index: number, field: keyof Omit<FormaState, 'pauta_respuestas'>, value: string) => {
    setFormas((prev) =>
      prev.map((forma, i) => (i === index ? { ...forma, [field]: value } : forma)),
    )
  }

  const handlePautaChange = (formaIndex: number, preguntaNum: number, letra: string) => {
    setFormas((prev) =>
      prev.map((forma, i) => {
        if (i !== formaIndex) return forma
        const key = String(preguntaNum)
        const next = { ...forma.pauta_respuestas, [key]: letra }
        return { ...forma, pauta_respuestas: next }
      }),
    )
  }

  const getCell = (row: Record<string, unknown>, keys: string[]): string | number | undefined => {
    for (const k of keys) {
      const v = row[k]
      if (v !== undefined && v !== null && v !== '') return v as string | number
    }
    return undefined
  }

  const handleImportExcel = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const accept = '.xlsx,.xls,.csv'
    if (!accept.split(',').some((ext) => file.name.toLowerCase().endsWith(ext.trim().replace('.', '')))) {
      toast.error('Selecciona un archivo .xlsx, .xls o .csv')
      return
    }
    if (fileInputRef.current) fileInputRef.current.value = ''

    setIsImportingExcel(true)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        if (!data) {
          toast.error('No se pudo leer el archivo')
          return
        }
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        if (!firstSheet) {
          toast.error('El archivo no tiene hojas')
          return
        }
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet)
        if (!rows.length) {
          toast.error('El archivo no tiene filas de datos')
          return
        }

        const col = (varNames: string[]) => (row: Record<string, unknown>) => getCell(row, varNames)

        const nombreEval = col(['Nombre Evaluacion', 'Nombre Evaluación', 'Nombre evaluacion'])(rows[0])
        if (nombreEval !== undefined && nombreEval !== '') setNombre(String(nombreEval).trim())

        const byForma = new Map<string, typeof rows>()
        for (const row of rows) {
          const formaKey = String(getCell(row, ['Forma', 'forma']) ?? '').trim() || 'Única'
          if (!byForma.has(formaKey)) byForma.set(formaKey, [])
          byForma.get(formaKey)!.push(row)
        }

        let maxPreguntas = 0
        const formasImported: FormaState[] = []

        byForma.forEach((formRows, formaLabel) => {
          const codigoEval = getCell(formRows[0], ['Código Evaluacion', 'Código Evaluación', 'Codigo Evaluacion'])
          const pauta: Record<string, string> = {}
          const mapa: MapaPreguntaItem[] = []

          const seenNum = new Set<number>()
          for (const row of formRows) {
            const num = Number(getCell(row, ['Número Pregunta', 'Numero Pregunta', 'Número pregunta']))
            if (!Number.isNaN(num)) seenNum.add(num)
            const resp = getCell(row, ['Respuesta', 'respuesta'])
            if (num !== undefined && !Number.isNaN(Number(num)) && resp !== undefined) {
              pauta[String(num)] = String(resp).trim().toUpperCase()
            }
            mapa.push({
              numero: num !== undefined && !Number.isNaN(Number(num)) ? Number(num) : undefined,
              codigo_pregunta: getCell(row, ['Código Pregunta', 'Codigo Pregunta', 'Código pregunta']) as string | undefined,
              habilidad: getCell(row, ['HABILIDAD', 'Habilidad', 'habilidad']) as string | undefined,
              nivel: getCell(row, ['NIVEL', 'Nivel', 'nivel']) as string | undefined,
              tema: getCell(row, ['CLASE (Tema)', 'CLASE (Tema)', 'Tema', 'tema']) as string | undefined,
              subtema: getCell(row, ['KONTENIDO (Titulo)', 'KONTENIDO (Título)', 'Kontenido (Titulo)', 'subtema']) as string | undefined,
              imagen: getCell(row, ['Imágen', 'Imagen', 'imagen']) as string | undefined,
            })
          }
          const count = seenNum.size || Object.keys(pauta).length
          if (count > maxPreguntas) maxPreguntas = count

          formasImported.push({
            nombre_forma: formaLabel,
            codigo_evaluacion: codigoEval !== undefined ? String(codigoEval) : '',
            pauta_respuestas: pauta,
            mapa_preguntas: mapa.length ? mapa : undefined,
          })
        })

        if (maxPreguntas > 0) setCantidadPreguntas(maxPreguntas)
        setFormas(formasImported.length ? formasImported : [{ nombre_forma: 'Forma A', codigo_evaluacion: '', pauta_respuestas: {}, mapa_preguntas: [] }])
        toast.success('Excel procesado. Revisa los datos y selecciona el Libro MIRA antes de guardar.')
      } catch (err: unknown) {
        console.error('Error al importar Excel', err)
        toast.error(err instanceof Error ? err.message : 'Error al procesar el Excel')
      } finally {
        setIsImportingExcel(false)
      }
    }
    reader.readAsBinaryString(file)
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

    const n = Number(cantidadPreguntas)
    let formasParsed
    try {
      formasParsed = formas.map((forma, index) => {
        if (!forma.nombre_forma.trim()) {
          throw new Error(`La forma #${index + 1} debe tener un nombre`)
        }
        if (!forma.codigo_evaluacion.trim()) {
          throw new Error(`La forma #${index + 1} debe tener un código de evaluación`)
        }
        const pauta: Record<string, string> = {}
        for (let i = 1; i <= n; i++) {
          const key = String(i)
          const val = forma.pauta_respuestas[key]?.trim()
          if (!val || !OPCIONES_RESPUESTA.includes(val as any)) {
            throw new Error(
              `En la forma "${forma.nombre_forma}", indica la respuesta correcta para la pregunta ${i}`,
            )
          }
          pauta[key] = val
        }
        return {
          nombre_forma: forma.nombre_forma.trim(),
          codigo_evaluacion: forma.codigo_evaluacion.trim(),
          pauta_respuestas: pauta,
          ...(Array.isArray(forma.mapa_preguntas) && forma.mapa_preguntas.length > 0 && { mapa_preguntas: forma.mapa_preguntas }),
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
      const res = await fetch('/api/mira/evaluaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json?.error?.message ?? json?.error ?? res.statusText)
      }

      toast.success('Evaluación creada correctamente')
      router.push('/mira/evaluaciones-omr')
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
        <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="d-none"
            onChange={handleImportExcel}
          />
          <Button
            variant="outline-success"
            type="button"
            disabled={isImportingExcel}
            onClick={() => fileInputRef.current?.click()}
          >
            {isImportingExcel ? 'Procesando...' : 'Importar desde Excel (.xlsx)'}
          </Button>
        </div>
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
                  <Col md={6}>
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
                  <Col md={6}>
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
                </Row>

                <Form.Group className="mt-3">
                  <Form.Label className="fw-semibold">Respuesta correcta por pregunta</Form.Label>
                  {!cantidadPreguntas || cantidadPreguntas < 1 ? (
                    <p className="text-muted small mb-0">
                      Indica primero la <strong>cantidad de preguntas</strong> arriba para ver las opciones.
                    </p>
                  ) : (
                    <>
                      <p className="text-muted small mb-2">
                        Elige la letra correcta (A, B, C, D o E) para cada número de pregunta.
                      </p>
                      <div className="d-flex flex-wrap gap-2">
                        {Array.from({ length: Number(cantidadPreguntas) }, (_, i) => i + 1).map((num) => (
                          <div key={num} className="d-flex align-items-center gap-1" style={{ minWidth: '5rem' }}>
                            <span className="text-muted small" style={{ width: '1.75rem' }}>{num}</span>
                            <Form.Select
                              size="sm"
                              value={forma.pauta_respuestas[String(num)] ?? ''}
                              onChange={(e) => handlePautaChange(index, num, e.target.value)}
                              aria-label={`Pregunta ${num}`}
                            >
                              <option value="">—</option>
                              {OPCIONES_RESPUESTA.map((letra) => (
                                <option key={letra} value={letra}>{letra}</option>
                              ))}
                            </Form.Select>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </Form.Group>
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
              onClick={() => router.push('/mira/evaluaciones-omr')}
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

