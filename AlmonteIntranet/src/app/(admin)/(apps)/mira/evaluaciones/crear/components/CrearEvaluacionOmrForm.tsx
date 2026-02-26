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

type EvaluacionState = {
  id_temp: string
  nombre: string
  categoria: CategoriaEvaluacion | ''
  cantidad_preguntas: number | ''
  formas: FormaState[]
}

const OPCIONES_RESPUESTA = ['A', 'B', 'C', 'D', 'E'] as const

const CATEGORIAS: { value: CategoriaEvaluacion; label: string }[] = [
  { value: 'Basica', label: 'Básica' },
  { value: 'Media', label: 'Media' },
  { value: 'Simce', label: 'Simce' },
  { value: 'Paes', label: 'PAES' },
  { value: 'Universitaria', label: 'Universitaria' },
]

const createEmptyEvaluacion = (index = 0): EvaluacionState => ({
  id_temp:
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `tmp-${Date.now()}-${index}`,
  nombre: '',
  categoria: 'Paes',
  cantidad_preguntas: '',
  formas: [
    {
      nombre_forma: 'Forma A',
      codigo_evaluacion: '',
      pauta_respuestas: {},
      mapa_preguntas: [],
    },
  ],
})

export function CrearEvaluacionOmrForm() {
  const router = useRouter()

  const [libroMiraId, setLibroMiraId] = useState<number | ''>('')

  const [librosOptions, setLibrosOptions] = useState<LibroMiraOption[]>([])
  const [isLoadingLibros, setIsLoadingLibros] = useState(false)

  const [evaluaciones, setEvaluaciones] = useState<EvaluacionState[]>([
    createEmptyEvaluacion(),
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

  const handleEvaluacionFieldChange = (
    evalIndex: number,
    field: keyof Omit<EvaluacionState, 'id_temp' | 'formas'>,
    value: string | number | '',
  ) => {
    setEvaluaciones((prev) =>
      prev.map((ev, i) =>
        i === evalIndex
          ? {
              ...ev,
              [field]: field === 'cantidad_preguntas' ? (value === '' ? '' : Number(value)) : value,
            }
          : ev,
      ),
    )
  }

  const handleAddForma = (evalIndex: number) => {
    setEvaluaciones((prev) =>
      prev.map((ev, i) =>
        i === evalIndex
          ? {
              ...ev,
              formas: [
                ...ev.formas,
                {
                  nombre_forma: `Forma ${String.fromCharCode(65 + ev.formas.length)}`,
                  codigo_evaluacion: '',
                  pauta_respuestas: {},
                  mapa_preguntas: [],
                },
              ],
            }
          : ev,
      ),
    )
  }

  const handleRemoveForma = (evalIndex: number, formaIndex: number) => {
    setEvaluaciones((prev) =>
      prev.map((ev, i) =>
        i === evalIndex
          ? {
              ...ev,
              formas: ev.formas.filter((_, idx) => idx !== formaIndex),
            }
          : ev,
      ),
    )
  }

  const handleFormaChange = (
    evalIndex: number,
    formaIndex: number,
    field: keyof Omit<FormaState, 'pauta_respuestas'>,
    value: string,
  ) => {
    setEvaluaciones((prev) =>
      prev.map((ev, i) =>
        i === evalIndex
          ? {
              ...ev,
              formas: ev.formas.map((forma, idx) =>
                idx === formaIndex ? { ...forma, [field]: value } : forma,
              ),
            }
          : ev,
      ),
    )
  }

  const handlePautaChange = (
    evalIndex: number,
    formaIndex: number,
    preguntaNum: number,
    letra: string,
  ) => {
    setEvaluaciones((prev) =>
      prev.map((ev, i) =>
        i === evalIndex
          ? {
              ...ev,
              formas: ev.formas.map((forma, idx) => {
                if (idx !== formaIndex) return forma
                const key = String(preguntaNum)
                const next = { ...forma.pauta_respuestas, [key]: letra }
                return { ...forma, pauta_respuestas: next }
              }),
            }
          : ev,
      ),
    )
  }

  const handleRemoveEvaluacion = (evalIndex: number) => {
    setEvaluaciones((prev) => {
      if (prev.length === 1) {
        return [createEmptyEvaluacion()]
      }
      return prev.filter((_, i) => i !== evalIndex)
    })
  }

  const getCell = (
    row: Record<string, unknown>,
    keys: string[],
  ): string | number | undefined => {
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
        const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet)

        const col =
          (varNames: string[]) =>
          (row: Record<string, unknown>) =>
            getCell(row, varNames)

        const codigoKeys = ['Código Evaluacion', 'Código Evaluación', 'Codigo Evaluacion']
        const numeroPreguntaKeys = ['Número Pregunta', 'Numero Pregunta', 'Número pregunta']

        // 1) Filtrar filas vacías (sin código ni número de pregunta)
        const rows = rawRows.filter((row) => {
          const cod = getCell(row, codigoKeys)
          const num = getCell(row, numeroPreguntaKeys)
          return (cod !== undefined && String(cod).trim() !== '') || (num !== undefined && num !== '')
        })

        if (!rows.length) {
          toast.error('El archivo no tiene filas de datos válidas')
          return
        }

        // 2) Nivel 1: agrupar por Código Evaluacion. Si una fila no trae código, se usa el de la fila anterior (forward-fill)
        const byCodigoEvaluacion = new Map<string, Record<string, unknown>[]>()
        let lastCodigo: string | null = null

        for (const row of rows) {
          let codigoRaw = getCell(row, codigoKeys)
          if (codigoRaw !== undefined && codigoRaw !== null && String(codigoRaw).trim() !== '') {
            lastCodigo = String(codigoRaw).trim()
          }
          const key = lastCodigo ?? 'sin-codigo'
          if (!byCodigoEvaluacion.has(key)) byCodigoEvaluacion.set(key, [])
          byCodigoEvaluacion.get(key)!.push(row)
        }

        const nuevasEvaluaciones: EvaluacionState[] = []
        let idx = 0

        byCodigoEvaluacion.forEach((rowsEvaluacion, codigoKey) => {
          if (!rowsEvaluacion.length) return

          // 3) Nombre: primera fila del grupo (evita typos en filas siguientes)
          const nombreEval = col(['Nombre Evaluacion', 'Nombre Evaluación', 'Nombre evaluacion'])(
            rowsEvaluacion[0],
          )
          const nombre = nombreEval !== undefined && nombreEval !== ''
            ? String(nombreEval).trim()
            : codigoKey !== 'sin-codigo' ? `Evaluación ${codigoKey}` : 'Sin nombre'

          // 4) Cantidad de preguntas: máximo de Número Pregunta en TODO el grupo
          let maxPreguntas = 0
          for (const row of rowsEvaluacion) {
            const num = Number(getCell(row, numeroPreguntaKeys))
            if (!Number.isNaN(num) && num > maxPreguntas) maxPreguntas = num
          }

          // 5) Nivel 2: dentro del grupo, agrupar por Forma (vacío/nulo => "Única")
          const byForma = new Map<string, typeof rowsEvaluacion>()
          for (const row of rowsEvaluacion) {
            const formaVal = getCell(row, ['Forma', 'forma'])
            const formaKey =
              formaVal !== undefined && formaVal !== null && String(formaVal).trim() !== ''
                ? String(formaVal).trim()
                : 'Única'
            if (!byForma.has(formaKey)) byForma.set(formaKey, [])
            byForma.get(formaKey)!.push(row)
          }

          const codigoEvalStr = codigoKey !== 'sin-codigo' ? codigoKey : ''

          const formasImported: FormaState[] = []

          byForma.forEach((formRows, formaLabel) => {
            const pauta: Record<string, string> = {}
            const mapa: MapaPreguntaItem[] = []

            for (const row of formRows) {
              const num = Number(getCell(row, numeroPreguntaKeys))
              const resp = getCell(row, ['Respuesta', 'respuesta'])
              if (!Number.isNaN(num) && resp !== undefined && resp !== '') {
                pauta[String(num)] = String(resp).trim().toUpperCase()
              }

              const numVal = !Number.isNaN(num) ? num : undefined
              const safeStr = (v: string | number | undefined) =>
                v !== undefined && v !== null && v !== '' ? String(v) : undefined
              mapa.push({
                numero: numVal,
                codigo_pregunta: safeStr(getCell(row, ['Código Pregunta', 'Codigo Pregunta', 'Código pregunta'])),
                habilidad: safeStr(getCell(row, ['HABILIDAD', 'Habilidad', 'habilidad'])),
                nivel: safeStr(getCell(row, ['NIVEL', 'Nivel', 'nivel'])),
                tema: safeStr(getCell(row, ['CLASE (Tema)', 'Tema', 'tema'])),
                subtema: safeStr(getCell(row, ['KONTENIDO (Titulo)', 'KONTENIDO (Título)', 'Kontenido (Titulo)', 'subtema'])),
                imagen: safeStr(getCell(row, ['Imágen', 'Imagen', 'imagen'])),
              })
            }

            formasImported.push({
              nombre_forma: String(formaLabel).trim(),
              codigo_evaluacion: codigoEvalStr,
              pauta_respuestas: pauta,
              mapa_preguntas: mapa.length > 0 ? mapa : undefined,
            })
          })

          nuevasEvaluaciones.push({
            id_temp:
              typeof crypto !== 'undefined' && 'randomUUID' in crypto
                ? crypto.randomUUID()
                : `tmp-${Date.now()}-${idx++}`,
            nombre,
            categoria: 'Paes',
            cantidad_preguntas: maxPreguntas || '',
            formas:
              formasImported.length > 0
                ? formasImported
                : [
                    {
                      nombre_forma: 'Forma A',
                      codigo_evaluacion: codigoEvalStr,
                      pauta_respuestas: {},
                      mapa_preguntas: [],
                    },
                  ],
          })
        })

        setEvaluaciones(nuevasEvaluaciones.length ? nuevasEvaluaciones : [createEmptyEvaluacion()])
        toast.success(
          'Excel procesado. Revisa las evaluaciones y selecciona el Libro MIRA antes de guardar.',
        )
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

    if (!libroMiraId) {
      toast.error('Debes seleccionar un libro MIRA')
      return
    }

    if (!evaluaciones.length) {
      toast.error('Debes tener al menos una evaluación')
      return
    }

    try {
      const payloads = evaluaciones.map((ev, evalIndex) => {
        if (!ev.nombre.trim()) {
          throw new Error(`La evaluación #${evalIndex + 1} debe tener un nombre`)
        }
        if (!ev.categoria) {
          throw new Error(`La evaluación #${evalIndex + 1} debe tener una categoría`)
        }
        if (!ev.cantidad_preguntas || ev.cantidad_preguntas <= 0) {
          throw new Error(
            `La evaluación #${evalIndex + 1} debe tener una cantidad de preguntas mayor a 0`,
          )
        }
        if (!ev.formas.length) {
          throw new Error(`La evaluación #${evalIndex + 1} debe tener al menos una forma`)
        }

        const n = Number(ev.cantidad_preguntas)
        const formasParsed = ev.formas.map((forma, formaIndex) => {
          if (!forma.nombre_forma.trim()) {
            throw new Error(
              `En la evaluación "${ev.nombre}", la forma #${formaIndex + 1} debe tener un nombre`,
            )
          }
          if (!forma.codigo_evaluacion.trim()) {
            throw new Error(
              `En la evaluación "${ev.nombre}", la forma #${formaIndex + 1} debe tener un código de evaluación`,
            )
          }
          const pauta: Record<string, string> = {}
          for (let i = 1; i <= n; i++) {
            const key = String(i)
            const val = forma.pauta_respuestas[key]?.trim()
            if (!val || !OPCIONES_RESPUESTA.includes(val as any)) {
              throw new Error(
                `En la evaluación "${ev.nombre}", forma "${forma.nombre_forma}", indica la respuesta correcta para la pregunta ${i}`,
              )
            }
            pauta[key] = val
          }
          return {
            nombre_forma: forma.nombre_forma.trim(),
            codigo_evaluacion: forma.codigo_evaluacion.trim(),
            pauta_respuestas: pauta,
            ...(Array.isArray(forma.mapa_preguntas) &&
              forma.mapa_preguntas.length > 0 && { mapa_preguntas: forma.mapa_preguntas }),
          }
        })

        return {
          data: {
            nombre: ev.nombre.trim(),
            categoria: ev.categoria,
            cantidad_preguntas: n,
            libro_mira: libroMiraId,
            activo: true,
            formas: formasParsed,
          },
        }
      })

      setIsSubmitting(true)

      await Promise.all(
        payloads.map(async (payload) => {
          const res = await fetch('/api/mira/evaluaciones', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
          const json = await res.json()
          if (!res.ok) {
            throw new Error(json?.error?.message ?? json?.error ?? res.statusText)
          }
        }),
      )

      toast.success(`Se crearon ${payloads.length} evaluaciones correctamente`)
      router.push('/mira/evaluaciones-omr')
    } catch (error: any) {
      console.error('Error al crear evaluaciones', error)
      const message =
        error?.message ||
        error?.details?.errors?.[0]?.message ||
        'Error al crear las evaluaciones'
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

          <h5 className="mb-3">Evaluaciones</h5>

          {evaluaciones.map((ev, evalIndex) => (
            <Card key={ev.id_temp} className="mb-4">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="mb-0">Evaluación #{evalIndex + 1}</h5>
                  {evaluaciones.length > 1 && (
                    <Button
                      variant="outline-danger"
                      size="sm"
                      type="button"
                      onClick={() => handleRemoveEvaluacion(evalIndex)}
                    >
                      Eliminar evaluación
                    </Button>
                  )}
                </div>

                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Group controlId={`eval-nombre-${evalIndex}`}>
                      <Form.Label>Nombre de la prueba</Form.Label>
                      <Form.Control
                        type="text"
                        value={ev.nombre}
                        onChange={(e) =>
                          handleEvaluacionFieldChange(evalIndex, 'nombre', e.target.value)
                        }
                        placeholder="Ej: Ensayo PAES 1"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group controlId={`eval-categoria-${evalIndex}`}>
                      <Form.Label>Categoría</Form.Label>
                      <Form.Select
                        value={ev.categoria}
                        onChange={(e) =>
                          handleEvaluacionFieldChange(
                            evalIndex,
                            'categoria',
                            e.target.value as CategoriaEvaluacion,
                          )
                        }
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
                    <Form.Group controlId={`eval-cantidad-${evalIndex}`}>
                      <Form.Label>Cantidad de preguntas</Form.Label>
                      <Form.Control
                        type="number"
                        min={1}
                        value={ev.cantidad_preguntas}
                        onChange={(e) =>
                          handleEvaluacionFieldChange(
                            evalIndex,
                            'cantidad_preguntas',
                            e.target.value ? Number(e.target.value) : '',
                          )
                        }
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <h6 className="mb-3">Formas de esta evaluación</h6>

                {ev.formas.map((forma, formaIndex) => (
                  <Card key={`${ev.id_temp}-forma-${formaIndex}`} className="mb-3">
                    <Card.Body>
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <span className="fw-semibold">Forma #{formaIndex + 1}</span>
                        {ev.formas.length > 1 && (
                          <Button
                            variant="outline-danger"
                            size="sm"
                            type="button"
                            onClick={() => handleRemoveForma(evalIndex, formaIndex)}
                          >
                            Eliminar forma
                          </Button>
                        )}
                      </div>

                      <Row className="mb-3">
                        <Col md={6}>
                          <Form.Group controlId={`forma-nombre-${evalIndex}-${formaIndex}`}>
                            <Form.Label>Nombre de la forma</Form.Label>
                            <Form.Control
                              type="text"
                              value={forma.nombre_forma}
                              onChange={(e) =>
                                handleFormaChange(
                                  evalIndex,
                                  formaIndex,
                                  'nombre_forma',
                                  e.target.value,
                                )
                              }
                              placeholder="Ej: Forma A"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group controlId={`forma-codigo-${evalIndex}-${formaIndex}`}>
                            <Form.Label>Código de evaluación</Form.Label>
                            <Form.Control
                              type="text"
                              value={forma.codigo_evaluacion}
                              onChange={(e) =>
                                handleFormaChange(
                                  evalIndex,
                                  formaIndex,
                                  'codigo_evaluacion',
                                  e.target.value,
                                )
                              }
                              placeholder="Ej: B1234567"
                            />
                          </Form.Group>
                        </Col>
                      </Row>

                      <Form.Group className="mt-3">
                        <Form.Label className="fw-semibold">
                          Respuesta correcta por pregunta
                        </Form.Label>
                        {!ev.cantidad_preguntas || ev.cantidad_preguntas < 1 ? (
                          <p className="text-muted small mb-0">
                            Indica primero la <strong>cantidad de preguntas</strong> de esta
                            evaluación para ver las opciones.
                          </p>
                        ) : (
                          <>
                            <p className="text-muted small mb-2">
                              Elige la letra correcta (A, B, C, D o E) para cada número de
                              pregunta.
                            </p>
                            <div className="d-flex flex-wrap gap-2">
                              {Array.from(
                                { length: Number(ev.cantidad_preguntas) },
                                (_, i) => i + 1,
                              ).map((num) => (
                                <div
                                  key={num}
                                  className="d-flex align-items-center gap-1"
                                  style={{ minWidth: '5rem' }}
                                >
                                  <span
                                    className="text-muted small"
                                    style={{ width: '1.75rem' }}
                                  >
                                    {num}
                                  </span>
                                  <Form.Select
                                    size="sm"
                                    value={forma.pauta_respuestas[String(num)] ?? ''}
                                    onChange={(e) =>
                                      handlePautaChange(
                                        evalIndex,
                                        formaIndex,
                                        num,
                                        e.target.value,
                                      )
                                    }
                                    aria-label={`Pregunta ${num}`}
                                  >
                                    <option value="">—</option>
                                    {OPCIONES_RESPUESTA.map((letra) => (
                                      <option key={letra} value={letra}>
                                        {letra}
                                      </option>
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

                <div className="mb-2">
                  <Button
                    variant="outline-primary"
                    type="button"
                    onClick={() => handleAddForma(evalIndex)}
                  >
                    Agregar otra forma
                  </Button>
                </div>
              </Card.Body>
            </Card>
          ))}

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
              {isSubmitting ? 'Guardando...' : 'Guardar evaluaciones'}
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  )
}

