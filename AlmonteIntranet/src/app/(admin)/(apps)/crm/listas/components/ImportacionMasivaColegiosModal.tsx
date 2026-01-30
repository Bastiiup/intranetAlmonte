'use client'

import { useState, useRef } from 'react'
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
  Table,
  Badge,
  Spinner,
  ProgressBar,
} from 'react-bootstrap'
import { LuUpload, LuFileText, LuCheck, LuX, LuDownload } from 'react-icons/lu'
import * as XLSX from 'xlsx'

interface ImportacionMasivaColegiosModalProps {
  show: boolean
  onHide: () => void
  onSuccess?: () => void
}

interface ImportRow {
  rbd?: string | number
  nombre_colegio?: string
  colegio_nombre?: string
  colegio_id?: string | number
  nombre_curso: string
  nivel: 'Basica' | 'Media'
  grado: number
  año?: number
  asignatura?: string
  orden_asigna?: number
}

interface ProcessResult {
  success: boolean
  message: string
  rowIndex: number
  colegioId?: number | string
  cursoId?: number | string
}

export default function ImportacionMasivaColegiosModal({
  show,
  onHide,
  onSuccess,
}: ImportacionMasivaColegiosModalProps) {
  const [step, setStep] = useState<'upload' | 'review' | 'processing' | 'complete'>('upload')
  const [importData, setImportData] = useState<ImportRow[]>([])
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [processResults, setProcessResults] = useState<ProcessResult[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { raw: false })

        // Normalizar datos
        const normalizedData: ImportRow[] = jsonData.map((row: any) => {
          // Normalizar nombres de columnas (case-insensitive, con/sin guiones)
          const normalizeNivel = (nivel: string): 'Basica' | 'Media' => {
            const n = String(nivel || '').trim().toLowerCase()
            if (n.includes('basica') || n.includes('básica')) return 'Basica'
            if (n.includes('media')) return 'Media'
            return 'Basica' // Default
          }

          return {
            rbd: row.rbd || row.RBD || undefined,
            nombre_colegio: row.nombre_colegio || row.nombre_colegio || row.colegio || row.Colegio || undefined,
            colegio_nombre: row.colegio_nombre || row.nombre_colegio || row.colegio || row.Colegio || undefined,
            colegio_id: row.colegio_id || row.colegioId || row.id_colegio || undefined,
            nombre_curso: String(row.nombre_curso || row.curso || row.curso_nombre || ''),
            nivel: normalizeNivel(row.nivel || row.Nivel || ''),
            grado: parseInt(row.grado || row.Grado || '1') || 1,
            año: row.año || row.ano || row.agno ? parseInt(String(row.año || row.ano || row.agno)) : new Date().getFullYear(),
            asignatura: row.asignatura || row.Asignatura || undefined,
            orden_asigna: row.orden_asigna || row.ordenAsigna || row.orden ? parseInt(String(row.orden_asigna || row.ordenAsigna || row.orden)) : undefined,
          }
        })

        if (normalizedData.length === 0) {
          setError('El archivo Excel está vacío o no contiene datos válidos')
          return
        }

        setImportData(normalizedData)
        setStep('review')
        setError(null)
      } catch (err: any) {
        setError(`Error al leer el archivo: ${err.message}`)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleProcess = async () => {
    setProcessing(true)
    setStep('processing')
    setProgress(0)
    setError(null)
    const results: ProcessResult[] = []

    try {
      // Cargar todos los colegios existentes
      const colegiosResponse = await fetch('/api/crm/colegios?page=1&pageSize=10000')
      const colegiosResult = await colegiosResponse.json()
      
      const colegiosMap = new Map<string | number, { id: number | string; nombre: string; rbd?: number }>()
      const colegiosByRBD = new Map<number, { id: number | string; nombre: string }>()
      const colegiosByName = new Map<string, { id: number | string; nombre: string; rbd?: number }>()

      if (colegiosResult.success && Array.isArray(colegiosResult.data)) {
        colegiosResult.data.forEach((colegio: any) => {
          const id = colegio.id || colegio.documentId
          const nombre = colegio.colegio_nombre || colegio.nombre || ''
          const rbd = colegio.rbd
          
          colegiosMap.set(id, { id, nombre, rbd })
          if (rbd) {
            colegiosByRBD.set(Number(rbd), { id, nombre })
          }
          // Normalizar nombre para búsqueda (sin acentos, lowercase)
          const normalizedName = nombre.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          colegiosByName.set(normalizedName, { id, nombre, rbd })
        })
      }

      // Procesar cada fila
      for (let i = 0; i < importData.length; i++) {
        const row = importData[i]
        setProgress(((i + 1) / importData.length) * 100)

        try {
          // 1. Buscar o crear colegio
          let colegioId: number | string | null = null

          // Intentar match por ID primero
          if (row.colegio_id) {
            const colegio = colegiosMap.get(row.colegio_id)
            if (colegio) {
              colegioId = colegio.id
            }
          }

          // Si no hay match por ID, intentar por RBD
          if (!colegioId && row.rbd) {
            const rbdNum = parseInt(String(row.rbd))
            if (!isNaN(rbdNum)) {
              const colegio = colegiosByRBD.get(rbdNum)
              if (colegio) {
                colegioId = colegio.id
              }
            }
          }

          // Si no hay match por RBD, intentar por nombre
          if (!colegioId && row.nombre_colegio) {
            const normalizedName = row.nombre_colegio.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            const colegio = colegiosByName.get(normalizedName)
            if (colegio) {
              colegioId = colegio.id
            }
          }

          // Si no existe el colegio, verificar nuevamente antes de crear
          if (!colegioId) {
            const nombreColegio = row.nombre_colegio || row.colegio_nombre || 'Colegio sin nombre'
            const rbdNum = row.rbd ? parseInt(String(row.rbd)) : null

            if (!rbdNum) {
              results.push({
                success: false,
                message: `No se puede crear colegio sin RBD. El colegio "${nombreColegio}" necesita un RBD válido.`,
                rowIndex: i,
              })
              continue
            }

            // Verificar una vez más que el RBD no exista (por si se creó en otra iteración)
            if (colegiosByRBD.has(rbdNum)) {
              const colegioExistente = colegiosByRBD.get(rbdNum)!
              colegioId = colegioExistente.id
              console.log(`[Importación Masiva] ✅ Colegio encontrado por RBD ${rbdNum}: ${colegioExistente.nombre}`)
            } else {
              // Verificar también por nombre normalizado (por si el RBD no está en el CSV pero el colegio existe)
              const normalizedName = nombreColegio.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
              if (colegiosByName.has(normalizedName)) {
                const colegioExistente = colegiosByName.get(normalizedName)!
                colegioId = colegioExistente.id
                console.log(`[Importación Masiva] ✅ Colegio encontrado por nombre "${nombreColegio}": ${colegioExistente.nombre} (ID: ${colegioId})`)
                
                // Actualizar el mapa de RBD si el colegio encontrado no tenía RBD
                if (colegioId && !colegiosByRBD.has(rbdNum)) {
                  colegiosByRBD.set(rbdNum, { id: colegioId, nombre: nombreColegio })
                }
              } else {
                // Solo crear si realmente no existe ni por RBD ni por nombre
                console.log(`[Importación Masiva] 📝 Creando nuevo colegio: ${nombreColegio} (RBD: ${rbdNum})`)
                
                const createColegioResponse = await fetch('/api/crm/colegios', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    colegio_nombre: nombreColegio,
                    rbd: rbdNum,
                  }),
                })

                const createColegioResult = await createColegioResponse.json()
                
                if (createColegioResponse.ok && createColegioResult.success) {
                  const nuevoColegio = createColegioResult.data
                  colegioId = nuevoColegio.id || nuevoColegio.documentId
                  
                  // Actualizar mapas
                  if (colegioId) {
                    colegiosMap.set(colegioId, { id: colegioId, nombre: nombreColegio, rbd: rbdNum })
                    colegiosByRBD.set(rbdNum, { id: colegioId, nombre: nombreColegio })
                    colegiosByName.set(normalizedName, { id: colegioId, nombre: nombreColegio, rbd: rbdNum })
                    console.log(`[Importación Masiva] ✅ Colegio creado exitosamente: ${nombreColegio} (ID: ${colegioId}, RBD: ${rbdNum})`)
                  }
                } else {
                  // Si el error es que el RBD ya existe, intentar buscarlo nuevamente
                  if (createColegioResult.error && createColegioResult.error.includes('RBD') && createColegioResult.error.includes('existe')) {
                    console.log(`[Importación Masiva] ⚠️ El RBD ${rbdNum} ya existe, buscando colegio...`)
                    // Recargar colegios para obtener el actualizado
                    const refreshResponse = await fetch('/api/crm/colegios?page=1&pageSize=10000')
                    const refreshResult = await refreshResponse.json()
                    if (refreshResult.success && Array.isArray(refreshResult.data)) {
                      const colegioExistente = refreshResult.data.find((c: any) => c.rbd === rbdNum)
                      if (colegioExistente) {
                        colegioId = colegioExistente.id || colegioExistente.documentId
                        const id = colegioId
                        if (id !== null && id !== undefined) {
                          const nombre = colegioExistente.colegio_nombre || colegioExistente.nombre || nombreColegio
                          colegiosMap.set(id, { id, nombre, rbd: rbdNum })
                          colegiosByRBD.set(rbdNum, { id, nombre })
                          colegiosByName.set(normalizedName, { id, nombre, rbd: rbdNum })
                          console.log(`[Importación Masiva] ✅ Colegio encontrado después del error: ${nombre} (ID: ${id})`)
                        }
                      }
                    }
                  }
                  
                  if (!colegioId) {
                    results.push({
                      success: false,
                      message: `Error al crear colegio: ${createColegioResult.error || 'Error desconocido'}`,
                      rowIndex: i,
                    })
                    continue
                  }
                }
              }
            }
          }

          // 2. Crear o actualizar curso
          if (!colegioId) {
            results.push({
              success: false,
              message: 'No se pudo obtener o crear el colegio',
              rowIndex: i,
            })
            continue
          }

          // Verificar si el curso ya existe
          const cursosResponse = await fetch(`/api/crm/colegios/${colegioId}/cursos`)
          const cursosResult = await cursosResponse.json()
          
          let cursoId: number | string | null = null
          
          if (cursosResult.success && Array.isArray(cursosResult.data)) {
            const cursoExistente = cursosResult.data.find((curso: any) => {
              const attrs = curso.attributes || curso
              return (
                (attrs.nombre_curso || '').toLowerCase().trim() === row.nombre_curso.toLowerCase().trim() &&
                attrs.nivel === row.nivel &&
                String(attrs.grado || '') === String(row.grado) &&
                (attrs.año || 0) === (row.año || 0)
              )
            })
            
            if (cursoExistente) {
              cursoId = cursoExistente.id || cursoExistente.documentId
            }
          }

          // Si no existe, crear el curso
          if (!cursoId) {
            const createCursoResponse = await fetch(`/api/crm/colegios/${colegioId}/cursos`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                nombre_curso: row.nombre_curso,
                nivel: row.nivel,
                grado: String(row.grado),
                año: row.año || new Date().getFullYear(),
                activo: true,
              }),
            })

            const createCursoResult = await createCursoResponse.json()
            
            if (createCursoResponse.ok && createCursoResult.success) {
              const nuevoCurso = createCursoResult.data
              cursoId = nuevoCurso.id || nuevoCurso.documentId
            } else {
              results.push({
                success: false,
                message: `Error al crear curso: ${createCursoResult.error || 'Error desconocido'}`,
                rowIndex: i,
                colegioId,
              })
              continue
            }
          }

          results.push({
            success: true,
            message: `Curso "${row.nombre_curso}" procesado correctamente`,
            rowIndex: i,
            colegioId: colegioId || undefined,
            cursoId: cursoId || undefined,
          })

        } catch (err: any) {
          results.push({
            success: false,
            message: `Error: ${err.message || 'Error desconocido'}`,
            rowIndex: i,
          })
        }
      }

      setProcessResults(results)
      setStep('complete')
    } catch (err: any) {
      setError(`Error al procesar: ${err.message}`)
      setStep('review')
    } finally {
      setProcessing(false)
    }
  }

  const handleReset = () => {
    setImportData([])
    setStep('upload')
    setError(null)
    setProcessResults([])
    setProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClose = () => {
    handleReset()
    onHide()
  }

  const handleComplete = () => {
    if (onSuccess) {
      onSuccess()
    }
    handleClose()
  }

  const successCount = processResults.filter((r) => r.success).length
  const errorCount = processResults.filter((r) => !r.success).length

  return (
    <Modal show={show} onHide={handleClose} size="xl" centered>
      <ModalHeader closeButton>
        <ModalTitle>Importación Masiva de Colegios y Cursos</ModalTitle>
      </ModalHeader>
      <ModalBody>
        {step === 'upload' && (
          <div>
            <Alert variant="info" className="mb-3">
              <strong>Instrucciones:</strong>
              <ul className="mb-0 mt-2">
                <li>El archivo Excel debe contener las siguientes columnas:</li>
                <ul>
                  <li><strong>rbd:</strong> RBD del colegio (obligatorio para crear nuevos colegios)</li>
                  <li><strong>nombre_colegio</strong> o <strong>colegio_nombre</strong> o <strong>colegio:</strong> Nombre del colegio</li>
                  <li><strong>colegio_id:</strong> ID del colegio (opcional, si se conoce)</li>
                  <li><strong>nombre_curso:</strong> Nombre del curso (ej: "1° Básica", "IV Medio")</li>
                  <li><strong>nivel:</strong> "Basica" o "Media"</li>
                  <li><strong>grado:</strong> Número del grado (ej: 1, 2, 3...)</li>
                  <li><strong>año:</strong> Año del curso (opcional, por defecto año actual)</li>
                  <li><strong>asignatura:</strong> Nombre de la asignatura (opcional)</li>
                  <li><strong>orden_asigna:</strong> Orden de la asignatura (opcional)</li>
                </ul>
                <li className="mt-2">El sistema buscará el colegio por RBD, nombre o ID. Si no existe, lo creará automáticamente.</li>
              </ul>
            </Alert>

            <FormGroup>
              <FormLabel>Subir archivo Excel</FormLabel>
              <FormControl
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                ref={fileInputRef}
              />
            </FormGroup>

            {error && <Alert variant="danger" className="mt-3">{error}</Alert>}
          </div>
        )}

        {step === 'review' && (
          <div>
            <Alert variant="info" className="mb-3">
              <strong>Revisión de datos:</strong> Se encontraron {importData.length} filas. Revise los datos antes de procesar.
            </Alert>

            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <Table striped bordered hover size="sm">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>RBD</th>
                    <th>Colegio</th>
                    <th>Curso</th>
                    <th>Nivel</th>
                    <th>Grado</th>
                    <th>Año</th>
                    <th>Asignatura</th>
                    <th>Orden</th>
                  </tr>
                </thead>
                <tbody>
                  {importData.map((row, index) => (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td>{row.rbd || '-'}</td>
                      <td>{row.nombre_colegio || row.colegio_nombre || '-'}</td>
                      <td>{row.nombre_curso}</td>
                      <td>
                        <Badge bg={row.nivel === 'Basica' ? 'primary' : 'info'}>
                          {row.nivel}
                        </Badge>
                      </td>
                      <td>{row.grado}°</td>
                      <td>{row.año || new Date().getFullYear()}</td>
                      <td>{row.asignatura || '-'}</td>
                      <td>{row.orden_asigna || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="text-center">
            <Spinner animation="border" className="mb-3" />
            <p>Procesando {importData.length} filas...</p>
            <ProgressBar now={progress} label={`${Math.round(progress)}%`} className="mb-3" />
          </div>
        )}

        {step === 'complete' && (
          <div>
            <Alert variant={errorCount === 0 ? 'success' : 'warning'} className="mb-3">
              <strong>Procesamiento completado:</strong>
              <ul className="mb-0 mt-2">
                <li>✅ Exitosos: {successCount}</li>
                <li>❌ Errores: {errorCount}</li>
              </ul>
            </Alert>

            {errorCount > 0 && (
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                <h6>Errores:</h6>
                <ul>
                  {processResults
                    .filter((r) => !r.success)
                    .map((r, idx) => (
                      <li key={idx}>
                        Fila {r.rowIndex + 1}: {r.message}
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        {step === 'upload' && (
          <>
            <Button variant="secondary" onClick={handleClose}>
              Cancelar
            </Button>
          </>
        )}
        {step === 'review' && (
          <>
            <Button variant="secondary" onClick={() => setStep('upload')}>
              Volver
            </Button>
            <Button variant="primary" onClick={handleProcess} disabled={processing}>
              {processing ? <Spinner size="sm" /> : 'Procesar'}
            </Button>
          </>
        )}
        {step === 'processing' && (
          <Button variant="secondary" disabled>
            Procesando...
          </Button>
        )}
        {step === 'complete' && (
          <>
            <Button variant="secondary" onClick={handleReset}>
              Nueva Importación
            </Button>
            <Button variant="primary" onClick={handleComplete}>
              Cerrar
            </Button>
          </>
        )}
      </ModalFooter>
    </Modal>
  )
}
