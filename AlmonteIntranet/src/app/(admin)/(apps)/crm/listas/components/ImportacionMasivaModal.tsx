'use client'

import { useState, useRef, useEffect } from 'react'
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
  ProgressBar,
  Table,
  Badge,
  Spinner,
} from 'react-bootstrap'
import { LuUpload, LuFileText, LuCheck, LuX, LuDownload } from 'react-icons/lu'
import { TbSparkles } from 'react-icons/tb'
import * as XLSX from 'xlsx'
import Select from 'react-select'

interface ImportacionMasivaModalProps {
  show: boolean
  onHide: () => void
  onSuccess?: () => void
}

interface ColegioOption {
  value: number | string
  label: string
}

interface ImportRow {
  colegio: string
  nombre_curso: string
  nivel: 'Basica' | 'Media'
  grado: number
  año?: number
  pdf?: File | null
  _cursoIdNum?: number
  _cursoDocumentId?: string
}

interface ProcessResult {
  success: boolean
  message: string
  cursoId?: number | string
  cursoNombre?: string
}

export default function ImportacionMasivaModal({ show, onHide, onSuccess }: ImportacionMasivaModalProps) {
  const [step, setStep] = useState<'upload' | 'review' | 'processing' | 'results'>('upload')
  const [excelFile, setExcelFile] = useState<File | null>(null)
  const [importData, setImportData] = useState<ImportRow[]>([])
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<ProcessResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [colegios, setColegios] = useState<ColegioOption[]>([])
  const [selectedColegio, setSelectedColegio] = useState<ColegioOption | null>(null)
  const [loadingColegios, setLoadingColegios] = useState(false)
  const [processingIA, setProcessingIA] = useState(false)
  const [progressIA, setProgressIA] = useState(0)
  const [iaResults, setIaResults] = useState<Array<{ cursoId: string | number; cursoNombre: string; success: boolean; message: string }>>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pdfInputsRef = useRef<{ [key: number]: HTMLInputElement }>({})

  // Cargar colegios al abrir el modal
  useEffect(() => {
    if (show) {
      loadColegios()
      setSelectedColegio(null) // Resetear selección al abrir
    }
  }, [show])

  const loadColegios = async () => {
    setLoadingColegios(true)
    setError(null)
    try {
      console.log('[Importación Masiva] Cargando colegios...')
      const response = await fetch('/api/crm/colegios?page=1&pageSize=1000')
      const result = await response.json()
      
      console.log('[Importación Masiva] Respuesta de colegios:', { 
        success: result.success, 
        count: result.data?.length || 0 
      })
      
      if (result.success && Array.isArray(result.data)) {
        const colegiosOptions: ColegioOption[] = result.data.map((colegio: any) => ({
          value: colegio.id || colegio.documentId,
          label: colegio.colegio_nombre || colegio.nombre || 'Sin nombre',
        }))
        console.log('[Importación Masiva] Colegios cargados:', colegiosOptions.length)
        setColegios(colegiosOptions)
        
        if (colegiosOptions.length === 0) {
          setError('No se encontraron colegios. Por favor, asegúrese de que haya colegios creados en el sistema.')
        }
      } else {
        setError('Error al cargar colegios: ' + (result.error || 'Respuesta inválida'))
      }
    } catch (err: any) {
      console.error('[Importación Masiva] Error al cargar colegios:', err)
      setError('Error al cargar colegios: ' + err.message)
    } finally {
      setLoadingColegios(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls') && !file.name.endsWith('.csv')) {
      setError('Por favor, seleccione un archivo Excel (.xlsx, .xls) o CSV')
      return
    }

    setExcelFile(file)
    setError(null)

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = event.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[]

        // Validar que se haya seleccionado un colegio
        if (!selectedColegio) {
          setError('Por favor, seleccione un colegio antes de subir el archivo')
          setExcelFile(null)
          if (fileInputRef.current) {
            fileInputRef.current.value = ''
          }
          return
        }

        // Función para normalizar el nivel a "Basica" o "Media" (sin tilde, exactamente como espera Strapi)
        const normalizeNivel = (nivel: any): 'Basica' | 'Media' => {
          if (!nivel) return 'Basica' // Default
          
          // Convertir a string, eliminar tildes, convertir a minúsculas y quitar espacios
          const nivelStr = String(nivel)
            .normalize('NFD') // Descompone caracteres con tildes
            .replace(/[\u0300-\u036f]/g, '') // Elimina tildes
            .toLowerCase()
            .trim()
          
          // Mapear variantes comunes a los valores correctos
          if (nivelStr === 'basica' || nivelStr === 'basico' || nivelStr === 'básica' || nivelStr === 'básico' || nivelStr === 'bas') {
            return 'Basica'
          }
          if (nivelStr === 'media' || nivelStr === 'med') {
            return 'Media'
          }
          
          // Si no coincide, usar default
          console.warn(`[Importación Masiva] Nivel desconocido "${nivel}", usando "Basica" por defecto`)
          return 'Basica'
        }

        // Validar y mapear datos
        const mappedData: ImportRow[] = jsonData.map((row, index) => {
          // Normalizar nombres de columnas (case-insensitive)
          const normalizeKey = (key: string) => key.toLowerCase().trim().replace(/\s+/g, '_')
          const normalizedRow: any = {}
          Object.keys(row).forEach((key) => {
            normalizedRow[normalizeKey(key)] = row[key]
          })

          return {
            colegio: selectedColegio.label, // Usar el colegio seleccionado en lugar del Excel
            nombre_curso: String(normalizedRow.nombre_curso || normalizedRow.curso || normalizedRow.curso_nombre || ''),
            nivel: normalizeNivel(normalizedRow.nivel), // ✅ Normalizar correctamente
            grado: parseInt(normalizedRow.grado) || 1,
            año: normalizedRow.año || normalizedRow.ano || normalizedRow.agno ? parseInt(normalizedRow.año || normalizedRow.ano || normalizedRow.agno) : new Date().getFullYear(),
            pdf: null,
          }
        })

        // Validar datos requeridos (ya no requiere colegio en el Excel)
        const invalidRows = mappedData.filter((row, index) => !row.nombre_curso)
        if (invalidRows.length > 0) {
          setError(`Hay ${invalidRows.length} fila(s) con datos incompletos. Asegúrese de que todas las filas tengan "nombre_curso"`)
          return
        }

        setImportData(mappedData)
        setStep('review')
      } catch (err: any) {
        setError('Error al leer el archivo: ' + err.message)
      }
    }

    if (file.name.endsWith('.csv')) {
      reader.readAsText(file)
    } else {
      reader.readAsBinaryString(file)
    }
  }

  const handlePDFUpload = (index: number, file: File | null) => {
    if (file) {
      // Validar que sea un PDF
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        setError(`El archivo "${file.name}" no es un PDF válido. Por favor, seleccione un archivo PDF.`)
        return
      }
      
      // Validar tamaño (máximo 10MB)
      const maxSize = 10 * 1024 * 1024 // 10MB
      if (file.size > maxSize) {
        setError(`El archivo "${file.name}" es demasiado grande (${(file.size / 1024 / 1024).toFixed(2)} MB). Máximo permitido: 10 MB.`)
        return
      }
      
      console.log(`[Importación Masiva] ✅ PDF válido seleccionado para fila ${index + 1}:`, {
        nombre: file.name,
        tamaño: file.size,
        tipo: file.type,
      })
    }
    
    setImportData((prev) => {
      const updated = [...prev]
      updated[index].pdf = file
      return updated
    })
  }

  const handleProcess = async () => {
    setProcessing(true)
    setStep('processing')
    setProgress(0)
    setError(null)
    const processResults: ProcessResult[] = []

    try {
      // Cargar colegios primero para mapear nombres a IDs
      const colegiosResponse = await fetch('/api/crm/colegios?page=1&pageSize=1000')
      const colegiosResult = await colegiosResponse.json()
      const colegiosMap = new Map<string, number | string>()
      const colegiosMapNormalized = new Map<string, number | string>() // Para búsqueda flexible
      const colegiosList: any[] = [] // Guardar lista de colegios para búsqueda flexible
      
      if (colegiosResult.success && Array.isArray(colegiosResult.data)) {
        colegiosList.push(...colegiosResult.data)
        colegiosResult.data.forEach((colegio: any) => {
          const nombre = colegio.colegio_nombre || colegio.nombre || ''
          const id = colegio.id || colegio.documentId
          // Mapeo exacto (case-insensitive)
          colegiosMap.set(nombre.toLowerCase().trim(), id)
          // Mapeo normalizado (sin espacios, sin acentos, case-insensitive) para búsqueda flexible
          const normalized = nombre.toLowerCase().trim().replace(/\s+/g, ' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          colegiosMapNormalized.set(normalized, id)
        })
      }

      // Validar que se haya seleccionado un colegio
      if (!selectedColegio) {
        setError('Por favor, seleccione un colegio antes de procesar')
        setProcessing(false)
        setStep('review')
        return
      }

      // Usar el colegio seleccionado directamente
      const colegioId = selectedColegio.value
      console.log(`[Importación Masiva] Usando colegio seleccionado:`, {
        id: colegioId,
        nombre: selectedColegio.label,
      })

      // Procesar cada fila
      for (let i = 0; i < importData.length; i++) {
        const row = importData[i]
        setProgress(Math.round(((i + 1) / importData.length) * 100))

        // Agregar un pequeño delay entre peticiones para evitar problemas de concurrencia
        // Solo para los primeros cursos (índices 0, 1, 2) para evitar rate limiting
        if (i < 3) {
          await new Promise(resolve => setTimeout(resolve, 200 * (i + 1))) // 200ms, 400ms, 600ms
        }

        console.log(`[Importación Masiva] Procesando fila ${i + 1}/${importData.length}:`, {
          colegio: selectedColegio.label,
          curso: row.nombre_curso,
          nivel: row.nivel,
          grado: row.grado,
          año: row.año,
        })

        try {

          // Buscar o crear curso
          let cursoId: number | string | null = null

          // Primero intentar buscar el curso existente
          const cursosResponse = await fetch(`/api/crm/colegios/${colegioId}/cursos`)
          const cursosResult = await cursosResponse.json()
          
          if (cursosResult.success && Array.isArray(cursosResult.data)) {
            const cursoExistente = cursosResult.data.find((curso: any) => {
              const attrs = curso.attributes || curso
              const nombreCurso = attrs.nombre_curso || attrs.curso_nombre || ''
              const grado = String(attrs.grado || '') // grado es string en Strapi
              const nivel = attrs.nivel || ''
              const año = attrs.año || attrs.ano || 0

              return (
                nombreCurso.toLowerCase().trim() === row.nombre_curso.toLowerCase().trim() &&
                grado === String(row.grado || '') && // Comparar como strings
                nivel === row.nivel &&
                (año || 0) === (row.año || 0)
              )
            })

            if (cursoExistente) {
              cursoId = cursoExistente.documentId || cursoExistente.id
            }
          }

          // Si no existe, crear el curso
          if (!cursoId) {
            // Generar nombre del curso como en CrearCursoModal
            const nombreCursoGenerado = row.nombre_curso || `${row.nivel} ${row.grado}°`
            
            const payload: any = {
              nombre_curso: nombreCursoGenerado,
              nivel: row.nivel,
              grado: String(row.grado), // ✅ grado debe ser string según schema de Strapi
              año: row.año || new Date().getFullYear(),
              activo: true,
            }
            
            console.log(`[Importación Masiva] Payload del curso a crear:`, {
              ...payload,
              colegioId: colegioId, // Log para debugging
            })


            console.log(`[Importación Masiva] Creando curso:`, payload)

            console.log(`[Importación Masiva] Enviando petición a: /api/crm/colegios/${colegioId}/cursos`)
            console.log(`[Importación Masiva] Payload completo:`, JSON.stringify(payload, null, 2))
            
            const createCursoResponse = await fetch(`/api/crm/colegios/${colegioId}/cursos`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(payload),
            })

            // Leer la respuesta una sola vez
            let responseText = ''
            try {
              responseText = await createCursoResponse.text()
            } catch (readError: any) {
              console.error(`[Importación Masiva] ❌ Error al leer respuesta:`, readError)
              processResults.push({
                success: false,
                message: `Error al leer respuesta del servidor: ${readError.message || 'Error desconocido'}`,
                cursoNombre: row.nombre_curso,
              })
              continue
            }

            if (!createCursoResponse.ok) {
              let errorJson: any = null
              let errorMessage = `Error HTTP ${createCursoResponse.status} ${createCursoResponse.statusText}`
              
              // Intentar parsear como JSON
              if (responseText) {
                try {
                  errorJson = JSON.parse(responseText)
                  errorMessage = errorJson?.error || errorJson?.message || errorJson?.details?.message || errorMessage
                } catch {
                  // Si no es JSON, usar el texto directamente
                  errorMessage = responseText || errorMessage
                }
              }
              
              // Log más detallado para debugging
              const errorDetails: any = {
                status: createCursoResponse.status,
                statusText: createCursoResponse.statusText,
                cursoNombre: row.nombre_curso,
                colegioId: colegioId,
              }
              
              if (responseText) {
                errorDetails.errorText = responseText.substring(0, 500) // Limitar a 500 caracteres
              } else {
                errorDetails.errorText = '(vacío)'
              }
              
              if (errorJson) {
                errorDetails.errorJson = errorJson
              }
              
              errorDetails.errorMessage = errorMessage
              errorDetails.payload = {
                nombre_curso: payload.nombre_curso,
                nivel: payload.nivel,
                grado: payload.grado,
                año: payload.año,
              }
              
              console.error(`[Importación Masiva] ❌ Error HTTP al crear curso:`, errorDetails)
              
              processResults.push({
                success: false,
                message: `Error al crear curso: ${errorMessage}`,
                cursoNombre: row.nombre_curso,
              })
              continue // Saltar esta fila y continuar con la siguiente
            }

            // Si la respuesta es exitosa, parsear el resultado
            let createResult: any = null
            try {
              if (responseText) {
                createResult = JSON.parse(responseText)
              } else {
                throw new Error('Respuesta vacía del servidor')
              }
            } catch (parseError: any) {
              console.error(`[Importación Masiva] ❌ Error al parsear respuesta exitosa:`, {
                parseError: parseError.message,
                responseText: responseText,
                status: createCursoResponse.status,
              })
              processResults.push({
                success: false,
                message: `Error al procesar respuesta del servidor: ${parseError.message}`,
                cursoNombre: row.nombre_curso,
              })
              continue
            }
            
            console.log(`[Importación Masiva] Respuesta creación curso:`, {
              success: createResult.success,
              error: createResult.error,
              data: createResult.data,
              message: createResult.message,
            })

            if (createResult.success && createResult.data) {
              // Intentar obtener el ID del curso de diferentes formas
              const cursoData = createResult.data
              const cursoIdNum = cursoData.id || (cursoData.attributes && cursoData.attributes.id)
              const cursoDocumentId = cursoData.documentId || (cursoData.attributes && cursoData.attributes.documentId)
              
              // Priorizar documentId si está disponible, sino usar id numérico
              cursoId = cursoDocumentId || cursoIdNum || null
              
              if (!cursoId) {
                console.error(`[Importación Masiva] ❌ No se pudo obtener el ID del curso creado:`, cursoData)
                processResults.push({
                  success: false,
                  message: `Curso creado pero no se pudo obtener su ID`,
                  cursoNombre: row.nombre_curso,
                })
                continue
              }
              
              console.log(`[Importación Masiva] ✅ Curso creado:`, {
                id: cursoIdNum,
                documentId: cursoDocumentId,
                cursoIdUsado: cursoId,
              })
              
              // Guardar ambos IDs para usar en el PDF upload
              row._cursoIdNum = cursoIdNum
              row._cursoDocumentId = cursoDocumentId
            } else {
              console.error(`[Importación Masiva] ❌ Error al crear curso:`, createResult)
              processResults.push({
                success: false,
                message: `Error al crear curso: ${createResult.error || createResult.message || 'Error desconocido'}`,
                cursoNombre: row.nombre_curso,
              })
              continue // Saltar esta fila y continuar con la siguiente
            }
          } else {
            console.log(`[Importación Masiva] ✅ Curso ya existe: ID=${cursoId}`)
          }

          // Si hay PDF, subirlo al curso
          let pdfSubido = false
          if (row.pdf && cursoId) {
            try {
              // Validar PDF antes de subir
              if (row.pdf.type !== 'application/pdf' && !row.pdf.name.toLowerCase().endsWith('.pdf')) {
                console.error(`[Importación Masiva] ❌ PDF inválido para curso ${row.nombre_curso}:`, {
                  nombre: row.pdf.name,
                  tipo: row.pdf.type,
                })
                // Continuar sin PDF
              } else {
                // Esperar más tiempo para asegurar que el curso esté completamente disponible en Strapi
                // Strapi puede necesitar tiempo para procesar la creación y hacer el curso disponible
                console.log(`[Importación Masiva] ⏳ Esperando 2 segundos para que Strapi procese el curso...`)
                await new Promise(resolve => setTimeout(resolve, 2000))
                
                const pdfFormData = new FormData()
                pdfFormData.append('pdf', row.pdf)
                // Enviar ambos IDs si están disponibles para que el endpoint pueda intentar ambos
                pdfFormData.append('cursoId', String(cursoId))
                if (row._cursoDocumentId && row._cursoDocumentId !== cursoId) {
                  pdfFormData.append('cursoDocumentId', String(row._cursoDocumentId))
                }
                if (row._cursoIdNum && row._cursoIdNum !== cursoId) {
                  pdfFormData.append('cursoIdNum', String(row._cursoIdNum))
                }
                pdfFormData.append('colegioId', String(colegioId))

                const tamañoKB = (row.pdf.size / 1024).toFixed(2)
                const tamañoMB = (row.pdf.size / 1024 / 1024).toFixed(2)
                
                console.log(`[Importación Masiva] 📤 Subiendo PDF para curso:`, {
                  cursoId: cursoId,
                  tipoCursoId: typeof cursoId,
                  nombreArchivo: row.pdf.name,
                  tamaño: row.pdf.size,
                  tamañoKB: parseFloat(tamañoKB),
                  tamañoMB: parseFloat(tamañoMB),
                  tipo: row.pdf.type,
                  tieneDocumentId: !!row._cursoDocumentId,
                  tieneIdNum: !!row._cursoIdNum,
                })
                
                // Enviar log al sistema de logs
                try {
                  await fetch('/api/crm/listas/importacion-completa-logs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      level: 'log',
                      message: `[Importación Masiva] 📤 Subiendo PDF para curso: ${row.nombre_curso}`,
                      data: {
                        cursoId: cursoId,
                        cursoNombre: row.nombre_curso,
                        nombreArchivo: row.pdf.name,
                        tamañoBytes: row.pdf.size,
                        tamañoKB: parseFloat(tamañoKB),
                        tamañoMB: parseFloat(tamañoMB),
                        tipo: row.pdf.type,
                        tieneDocumentId: !!row._cursoDocumentId,
                        tieneIdNum: !!row._cursoIdNum,
                      },
                    }),
                  })
                } catch (e) {
                  // Ignorar errores de logging
                }

                const uploadStartTime = Date.now()
                const uploadResponse = await fetch('/api/crm/cursos/import-pdf', {
                  method: 'POST',
                  body: pdfFormData,
                })
                const uploadDuration = Date.now() - uploadStartTime
                
                console.log(`[Importación Masiva] 📥 Respuesta de /api/crm/cursos/import-pdf:`, {
                  status: uploadResponse.status,
                  statusText: uploadResponse.statusText,
                  ok: uploadResponse.ok,
                  duration: `${uploadDuration}ms`,
                  nombreArchivo: row.pdf.name,
                  cursoId: cursoId,
                })

                // Leer la respuesta una sola vez
                let uploadResponseText = ''
                try {
                  uploadResponseText = await uploadResponse.text()
                } catch (readError: any) {
                  console.error(`[Importación Masiva] ❌ Error al leer respuesta del PDF:`, readError)
                  // NO hacer continue aquí - el curso se creó, solo falló el PDF
                  // Continuar al final para registrar el resultado
                }

                if (!uploadResponse.ok) {
                  let errorJson: any = null
                  let errorMessage = `Error HTTP ${uploadResponse.status} ${uploadResponse.statusText}`
                  
                  // Intentar parsear como JSON
                  if (uploadResponseText && uploadResponseText.trim()) {
                    try {
                      errorJson = JSON.parse(uploadResponseText)
                      errorMessage = errorJson?.error || errorJson?.message || errorJson?.details?.message || errorMessage
                    } catch (parseErr) {
                      // Si no es JSON, usar el texto directamente
                      errorMessage = uploadResponseText || errorMessage
                      console.warn(`[Importación Masiva] ⚠️ No se pudo parsear respuesta como JSON:`, parseErr)
                    }
                  }
                  
                  // Log más detallado para debugging - usar console.log separados para evitar problemas de serialización
                  console.error(`[Importación Masiva] ❌ Error HTTP al subir PDF`)
                  console.error(`  Status:`, uploadResponse.status)
                  console.error(`  StatusText:`, uploadResponse.statusText)
                  console.error(`  CursoId:`, cursoId)
                  console.error(`  CursoNombre:`, row.nombre_curso)
                  console.error(`  NombreArchivo:`, row.pdf?.name || 'N/A')
                  console.error(`  TamañoArchivo:`, row.pdf?.size || 'N/A')
                  console.error(`  TipoArchivo:`, row.pdf?.type || 'N/A')
                  console.error(`  ErrorText:`, uploadResponseText || '(vacío)')
                  console.error(`  ErrorTextLength:`, uploadResponseText?.length || 0)
                  console.error(`  ErrorJson:`, errorJson)
                  console.error(`  ErrorMessage:`, errorMessage)
                  try {
                    const headersObj = Object.fromEntries(uploadResponse.headers.entries())
                    console.error(`  Headers:`, headersObj)
                  } catch (e) {
                    console.error(`  Headers: (no se pudieron leer)`)
                  }
                  
                  // Enviar log de error al sistema de logs
                  try {
                    await fetch('/api/crm/listas/importacion-completa-logs', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        level: 'error',
                        message: `[Importación Masiva] ❌ Error HTTP al subir PDF: ${uploadResponse.status} ${uploadResponse.statusText}`,
                        data: {
                          cursoId: cursoId,
                          cursoNombre: row.nombre_curso,
                          nombreArchivo: row.pdf?.name || 'N/A',
                          status: uploadResponse.status,
                          statusText: uploadResponse.statusText,
                          errorMessage: errorMessage,
                          duration: `${uploadDuration}ms`,
                        },
                      }),
                    })
                  } catch (e) {
                    // Ignorar errores de logging
                  }
                  
                  // NO hacer continue aquí - el curso se creó, solo falló el PDF
                  // Continuar al final para registrar el resultado y notificar
                }

                // Si la respuesta es exitosa, parsear el resultado
                let uploadResult: any = null
                try {
                  if (uploadResponseText && uploadResponseText.trim()) {
                    uploadResult = JSON.parse(uploadResponseText)
                  } else {
                    console.warn(`[Importación Masiva] ⚠️ Respuesta vacía al subir PDF (status ${uploadResponse.status})`)
                  }
                } catch (parseError: any) {
                  console.error(`[Importación Masiva] ❌ Error al parsear respuesta del PDF:`, {
                    parseError: parseError.message,
                    responseText: uploadResponseText || '(vacío)',
                    responseTextLength: uploadResponseText?.length || 0,
                    status: uploadResponse.status,
                    statusText: uploadResponse.statusText,
                    cursoId: cursoId,
                  })
                  // Continuar, el curso se creó exitosamente
                }
                
                if (uploadResult && !uploadResult.success) {
                  // Log detallado usando console.log separados
                  console.error(`[Importación Masiva] ❌ Error al subir PDF (respuesta indica fallo)`)
                  console.error(`  UploadResult completo:`, JSON.stringify(uploadResult, null, 2))
                  console.error(`  CursoId:`, cursoId)
                  console.error(`  CursoNombre:`, row.nombre_curso)
                  console.error(`  Error:`, uploadResult.error)
                  console.error(`  Message:`, uploadResult.message)
                  console.error(`  Details:`, uploadResult.details)
                  // No hacer continue, el curso se creó exitosamente
                } else if (uploadResult && uploadResult.success) {
                  console.log(`[Importación Masiva] ✅ PDF subido exitosamente`)
                  console.log(`  CursoId:`, cursoId)
                  console.log(`  VersionesCount:`, uploadResult.data?.versionesCount)
                  pdfSubido = true
                  
                  // Enviar log de éxito al sistema de logs
                  try {
                    await fetch('/api/crm/listas/importacion-completa-logs', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        level: 'log',
                        message: `[Importación Masiva] ✅ PDF subido exitosamente para curso: ${row.nombre_curso}`,
                        data: {
                          cursoId: cursoId,
                          cursoNombre: row.nombre_curso,
                          nombreArchivo: row.pdf.name,
                          versionesCount: uploadResult.data?.versionesCount,
                          duration: `${uploadDuration}ms`,
                        },
                      }),
                    })
                  } catch (e) {
                    // Ignorar errores de logging
                  }
                } else if (!uploadResult) {
                  // Si no hay resultado pero el status es OK, asumir éxito
                  if (uploadResponse.ok) {
                    console.log(`[Importación Masiva] ✅ PDF subido (sin respuesta JSON, pero status OK)`)
                    pdfSubido = true
                  } else {
                    console.warn(`[Importación Masiva] ⚠️ No se pudo determinar el resultado del PDF`)
                    console.warn(`  Status:`, uploadResponse.status)
                    console.warn(`  StatusText:`, uploadResponse.statusText)
                    console.warn(`  ResponseText:`, uploadResponseText || '(vacío)')
                  }
                }
              }
            } catch (pdfError: any) {
              console.error(`[Importación Masiva] ❌ Excepción al subir PDF:`, {
                error: pdfError.message,
                stack: pdfError.stack,
                cursoId: cursoId,
              })
              
              // Enviar log de excepción al sistema de logs
              try {
                await fetch('/api/crm/listas/importacion-completa-logs', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    level: 'error',
                    message: `[Importación Masiva] ❌ Excepción al subir PDF: ${pdfError.message}`,
                    data: {
                      cursoId: cursoId,
                      cursoNombre: row.nombre_curso,
                      nombreArchivo: row.pdf?.name || 'N/A',
                      error: pdfError.message,
                      stack: pdfError.stack?.substring(0, 500),
                    },
                  }),
                })
              } catch (e) {
                // Ignorar errores de logging
              }
              
              // No hacer continue, el curso se creó exitosamente
            }
          }

          // Siempre registrar el resultado del curso (se creó exitosamente)
          processResults.push({
            success: true,
            message: row.pdf 
              ? (pdfSubido ? 'Curso creado y PDF asignado' : 'Curso creado pero error al subir PDF')
              : 'Curso creado',
            cursoId,
            cursoNombre: row.nombre_curso,
          })
          
          // Notificar cambio a otras páginas
          if (typeof window !== 'undefined' && cursoId) {
            window.dispatchEvent(new CustomEvent('curso-cambiado', {
              detail: { tipo: 'creado', cursoId, timestamp: Date.now() }
            }))
            localStorage.setItem('curso-cambio-notificacion', JSON.stringify({
              tipo: 'creado',
              cursoId,
              timestamp: Date.now()
            }))
          }
        } catch (err: any) {
          processResults.push({
            success: false,
            message: `Error: ${err.message}`,
            cursoNombre: row.nombre_curso,
          })
        }
      }

      setResults(processResults)
      setStep('results')
      
      // Contar cursos creados exitosamente
      const cursosCreados = processResults.filter(r => r.success && r.cursoId).length
      console.log(`[Importación Masiva] ✅ Procesamiento completado: ${cursosCreados} curso(s) creado(s) de ${processResults.length} total`)
      
      // Notificar cambios inmediatamente
      if (typeof window !== 'undefined') {
        // Notificar a otras páginas
        window.dispatchEvent(new CustomEvent('curso-cambiado', {
          detail: { tipo: 'creado', timestamp: Date.now(), cantidad: cursosCreados }
        }))
        localStorage.setItem('curso-cambio-notificacion', JSON.stringify({
          tipo: 'creado',
          timestamp: Date.now(),
          cantidad: cursosCreados
        }))
      }
      
      // Llamar a onSuccess inmediatamente (igual que ListaModal)
      // El delay se maneja en handleModalSuccess de ListasListing
      if (onSuccess) {
        console.log('[Importación Masiva] ✅ Llamando a onSuccess inmediatamente...')
        // Llamar inmediatamente
        onSuccess()
        
        // Llamar de nuevo después de delays para forzar múltiples recargas
        setTimeout(() => {
          console.log('[Importación Masiva] ✅ Llamando a onSuccess nuevamente después de 1s...')
          if (onSuccess) onSuccess()
        }, 1000)
        
        setTimeout(() => {
          console.log('[Importación Masiva] ✅ Llamando a onSuccess nuevamente después de 3s...')
          if (onSuccess) onSuccess()
        }, 3000)
      }
    } catch (err: any) {
      setError('Error durante el procesamiento: ' + err.message)
    } finally {
      setProcessing(false)
    }
  }

  // Función para procesar todos los PDFs con IA
  const handleProcesarTodoConIA = async () => {
    if (!results || results.length === 0) {
      alert('No hay cursos procesados para aplicar IA')
      return
    }

    // Filtrar solo los cursos que se crearon exitosamente
    const cursosExitosos = results.filter(r => r.success && r.cursoId)
    
    if (cursosExitosos.length === 0) {
      alert('No hay cursos creados exitosamente para procesar con IA')
      return
    }

    // Verificar cuáles cursos tienen PDF antes de procesar
    console.log('[Importación Masiva IA] 🔍 Verificando cursos con PDF...')
    const cursosConPDFVerificados: typeof cursosExitosos = []
    
    for (const curso of cursosExitosos) {
      try {
        const cursoResponse = await fetch(`/api/crm/listas/${curso.cursoId}`)
        const cursoData = await cursoResponse.json()
        
        if (cursoData.success && cursoData.data) {
          const attrs = cursoData.data.attributes || cursoData.data
          const versiones = attrs?.versiones_materiales || []
          const tienePDF = versiones.some((v: any) => v.pdf_id || v.pdf_url)
          
          if (tienePDF) {
            cursosConPDFVerificados.push(curso)
          } else {
            console.log(`[Importación Masiva IA] ⚠️ Curso ${curso.cursoNombre} no tiene PDF asignado`)
          }
        }
      } catch (err: any) {
        console.warn(`[Importación Masiva IA] ⚠️ No se pudo verificar PDF del curso ${curso.cursoNombre}:`, err.message)
        // Incluir de todas formas, la verificación se hará durante el procesamiento
        cursosConPDFVerificados.push(curso)
      }
    }

    if (cursosConPDFVerificados.length === 0) {
      alert('⚠️ Ninguno de los cursos creados tiene PDF asignado. Por favor, asigna PDFs a los cursos antes de procesar con IA.')
      return
    }

    if (!confirm(`¿Deseas procesar ${cursosConPDFVerificados.length} curso(s) con IA? Esto puede tardar varios minutos.\n\nCursos sin PDF serán omitidos automáticamente.`)) {
      return
    }

    setProcessingIA(true)
    setProgressIA(0)
    setIaResults([])
    setError(null)

    const iaResultsArray: Array<{ cursoId: string | number; cursoNombre: string; success: boolean; message: string }> = []

    try {
      // Función para procesar un curso individual
      const procesarCurso = async (curso: typeof cursosConPDFVerificados[0], index: number): Promise<void> => {
        // Obtener el documentId del curso (ya verificamos que tiene PDF antes)
        // Declarar fuera del try para que esté disponible en el catch
        let cursoDocumentId: string | number | null = null
        
        try {
          console.log(`[Importación Masiva IA] 🔄 [${index + 1}/${cursosConPDFVerificados.length}] Procesando: ${curso.cursoNombre}`)

          // Obtener documentId del curso
          try {
            const cursoResponse = await fetch(`/api/crm/listas/${curso.cursoId}`)
            const cursoData = await cursoResponse.json()
            
            if (cursoData.success && cursoData.data) {
              cursoDocumentId = cursoData.data.documentId || cursoData.data.id || curso.cursoId || null
            } else {
              cursoDocumentId = curso.cursoId || null
            }
          } catch (err: any) {
            console.warn(`[Importación Masiva IA] ⚠️ No se pudo obtener documentId, usando cursoId:`, err.message)
            cursoDocumentId = curso.cursoId || null
          }

          if (!cursoDocumentId) {
            throw new Error('No se pudo obtener el ID del curso')
          }

          // Procesar el PDF con IA
          console.log(`[Importación Masiva IA] 📄 [${index + 1}/${cursosConPDFVerificados.length}] Procesando PDF de: ${curso.cursoNombre} (ID: ${cursoDocumentId})`)
          
          const startTime = Date.now()
          let iaResponse: Response
          let iaData: any = {}
          
          try {
            iaResponse = await fetch(`/api/crm/listas/${cursoDocumentId}/procesar-pdf`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              // Timeout más largo para PDFs grandes
              signal: AbortSignal.timeout(300000), // 5 minutos
            })

            const processingTime = ((Date.now() - startTime) / 1000).toFixed(1)
            
            // Verificar si la respuesta es JSON válido
            const contentType = iaResponse.headers.get('content-type')
            if (!contentType || !contentType.includes('application/json')) {
              const textResponse = await iaResponse.text()
              console.error(`[Importación Masiva IA] ❌ [${index + 1}/${cursosConPDFVerificados.length}] Respuesta no es JSON:`, {
                status: iaResponse.status,
                statusText: iaResponse.statusText,
                contentType,
                responseText: textResponse.substring(0, 500),
              })
              throw new Error(`Error del servidor (${iaResponse.status}): ${textResponse.substring(0, 200)}`)
            }

            // Intentar parsear JSON
            try {
              iaData = await iaResponse.json()
            } catch (jsonError: any) {
              const textResponse = await iaResponse.text()
              console.error(`[Importación Masiva IA] ❌ [${index + 1}/${cursosConPDFVerificados.length}] Error al parsear JSON:`, {
                status: iaResponse.status,
                statusText: iaResponse.statusText,
                jsonError: jsonError.message,
                responseText: textResponse.substring(0, 500),
              })
              throw new Error(`Error al parsear respuesta del servidor: ${jsonError.message}`)
            }

            // Log detallado de la respuesta
            console.log(`[Importación Masiva IA] 📊 [${index + 1}/${cursosConPDFVerificados.length}] Respuesta de API (${processingTime}s):`, {
              ok: iaResponse.ok,
              success: iaData?.success,
              status: iaResponse.status,
              statusText: iaResponse.statusText,
              tieneProductos: !!iaData?.data?.productos,
              cantidadProductos: iaData?.data?.productos?.length || 0,
              error: iaData?.error,
              details: iaData?.details,
              sugerencia: iaData?.sugerencia,
              pdfSizeMB: iaData?.pdfSizeMB,
              responseKeys: Object.keys(iaData || {}),
            })

          } catch (fetchError: any) {
            // Error de red o al hacer fetch
            console.error(`[Importación Masiva IA] ❌ [${index + 1}/${cursosConPDFVerificados.length}] Error de red/fetch:`, {
              curso: curso.cursoNombre,
              cursoId: cursoDocumentId,
              error: fetchError.message,
              stack: fetchError.stack,
            })
            throw new Error(`Error de conexión: ${fetchError.message}`)
          }

          if (!iaResponse.ok || !iaData?.success) {
            const errorMsg = iaData?.error || iaData?.details || iaData?.message || `Error HTTP ${iaResponse.status}: ${iaResponse.statusText}` || 'Error al procesar con IA'
            const sugerencia = iaData?.sugerencia || ''
            const pdfSizeMB = iaData?.pdfSizeMB
            const details = iaData?.details || ''
            
            // Construir mensaje de error más descriptivo
            let mensajeErrorCompleto = errorMsg
            if (sugerencia) {
              mensajeErrorCompleto += ` | ${sugerencia}`
            }
            if (pdfSizeMB) {
              mensajeErrorCompleto += ` (PDF: ${pdfSizeMB.toFixed(2)} MB)`
            }
            
            // Log completo de la respuesta para debugging
            console.error(`[Importación Masiva IA] ❌ [${index + 1}/${cursosConPDFVerificados.length}] Error detallado:`, {
              curso: curso.cursoNombre,
              cursoId: cursoDocumentId,
              status: iaResponse.status,
              statusText: iaResponse.statusText,
              error: errorMsg,
              details: details,
              sugerencia,
              pdfSizeMB,
              responseData: JSON.stringify(iaData, null, 2), // Log completo como string para evitar problemas de serialización
              responseKeys: Object.keys(iaData || {}),
            })
            
            // Crear un error con más información
            const error = new Error(mensajeErrorCompleto) as any
            error.details = details
            error.sugerencia = sugerencia
            error.pdfSizeMB = pdfSizeMB
            error.status = iaResponse.status
            error.statusText = iaResponse.statusText
            error.responseData = iaData
            throw error
          }

          const productosExtraidos = iaData.data?.productos?.length || 0
          const productosEncontrados = iaData.data?.productos?.filter((p: any) => p.encontrado_en_woocommerce).length || 0

          if (productosExtraidos === 0) {
            // Si no se extrajeron productos pero la API respondió OK, es un warning, no un error crítico
            console.warn(`[Importación Masiva IA] ⚠️ [${index + 1}/${cursosConPDFVerificados.length}] PDF procesado pero sin productos: ${curso.cursoNombre}`)
            iaResultsArray.push({
              cursoId: curso.cursoId!,
              cursoNombre: curso.cursoNombre || 'Sin nombre',
              success: false,
              message: '⚠️ PDF procesado pero no se encontraron productos'
            })
          } else {
            iaResultsArray.push({
              cursoId: curso.cursoId!,
              cursoNombre: curso.cursoNombre || 'Sin nombre',
              success: true,
              message: `✅ ${productosExtraidos} productos extraídos, ${productosEncontrados} encontrados en WooCommerce`
            })

            console.log(`[Importación Masiva IA] ✅ [${index + 1}/${cursosConPDFVerificados.length}] Completado: ${curso.cursoNombre} (${productosExtraidos} productos)`)
          }
        } catch (err: any) {
          // Log completo del error con toda la información disponible
          const errorInfo: any = {
            error: err?.message || 'Error desconocido',
            errorType: err?.constructor?.name || typeof err,
            curso: curso.cursoNombre,
            cursoId: curso.cursoId,
            cursoDocumentId: cursoDocumentId,
          }
          
          // Agregar información adicional si está disponible
          if (err?.status) errorInfo.status = err.status
          if (err?.statusText) errorInfo.statusText = err.statusText
          if (err?.details) errorInfo.details = err.details
          if (err?.sugerencia) errorInfo.sugerencia = err.sugerencia
          if (err?.pdfSizeMB) errorInfo.pdfSizeMB = err.pdfSizeMB
          if (err?.stack) errorInfo.stack = err.stack
          if (err?.responseData) {
            // Log responseData como string para evitar problemas de serialización
            try {
              errorInfo.responseData = JSON.stringify(err.responseData, null, 2)
            } catch {
              errorInfo.responseData = String(err.responseData)
            }
          }
          
          console.error(`[Importación Masiva IA] ❌ [${index + 1}/${cursosConPDFVerificados.length}] Error en ${curso.cursoNombre}:`, errorInfo)
          
          let mensajeError = err?.message || 'Error desconocido'
          
          // Intentar obtener más detalles del error si está disponible
          let errorDetails = ''
          if (err?.details) {
            errorDetails = ` | ${err.details}`
          }
          if (err?.sugerencia) {
            errorDetails += ` | ${err.sugerencia}`
          }
          
          // Categorizar y simplificar mensajes de error
          if (mensajeError.includes('PDF') || mensajeError.includes('no tiene PDF') || mensajeError.includes('no tiene PDF asociado')) {
            mensajeError = '⚠️ Sin PDF asignado'
          } else if (mensajeError.includes('No se pudieron extraer productos') || mensajeError.includes('no se encontraron productos') || mensajeError.includes('no contiene un array de productos')) {
            // Mensaje más descriptivo para este caso común
            mensajeError = '⚠️ PDF sin productos reconocibles'
            if (errorDetails) {
              mensajeError += errorDetails.substring(0, 80) // Limitar longitud
            }
          } else if (mensajeError.includes('timeout') || mensajeError.includes('Timeout') || mensajeError.includes('tiempo límite') || mensajeError.includes('excedió el tiempo')) {
            mensajeError = '⏱️ PDF muy grande - procesar individualmente'
            if (err.pdfSizeMB) {
              mensajeError += ` (${err.pdfSizeMB} MB)`
            }
          } else if (mensajeError.includes('API key') || mensajeError.includes('GEMINI_API_KEY') || mensajeError.includes('no está configurada')) {
            mensajeError = '🔑 Error de configuración API'
          } else if (mensajeError.includes('No se pudo obtener el ID') || mensajeError.includes('Lista no encontrada')) {
            mensajeError = '⚠️ Error al obtener ID del curso'
          } else if (mensajeError.includes('Error al descargar')) {
            mensajeError = '⚠️ Error al descargar PDF desde Strapi'
          } else {
            // Truncar mensajes muy largos pero mantener información útil
            if (mensajeError.length > 80) {
              mensajeError = mensajeError.substring(0, 77) + '...'
            }
            // Agregar detalles si están disponibles y el mensaje es corto
            if (errorDetails && mensajeError.length < 60) {
              mensajeError += errorDetails.substring(0, 40)
            }
          }
          
          iaResultsArray.push({
            cursoId: curso.cursoId!,
            cursoNombre: curso.cursoNombre || 'Sin nombre',
            success: false,
            message: mensajeError
          })
        } finally {
          // Actualizar progreso
          const completados = iaResultsArray.length
          setProgressIA(Math.round((completados / cursosConPDFVerificados.length) * 100))
        }
      }

      // Procesar en paralelo con límite de concurrencia (3 a la vez para no sobrecargar)
      const CONCURRENCY_LIMIT = 3
      const chunks: Array<Array<typeof cursosConPDFVerificados[0]>> = []
      
      for (let i = 0; i < cursosConPDFVerificados.length; i += CONCURRENCY_LIMIT) {
        chunks.push(cursosConPDFVerificados.slice(i, i + CONCURRENCY_LIMIT))
      }

      console.log(`[Importación Masiva IA] 🚀 Procesando ${cursosConPDFVerificados.length} cursos en ${chunks.length} lotes (${CONCURRENCY_LIMIT} en paralelo)`)

      // Procesar cada lote
      for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
        const chunk = chunks[chunkIndex]
        
        // Procesar todos los cursos del lote en paralelo
        await Promise.all(
          chunk.map((curso, indexInChunk) => 
            procesarCurso(curso, chunkIndex * CONCURRENCY_LIMIT + indexInChunk)
          )
        )

        // Pequeño delay entre lotes (solo 200ms) para no sobrecargar el servidor
        if (chunkIndex < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200))
        }
      }

      setIaResults(iaResultsArray)
      
      const exitosos = iaResultsArray.filter(r => r.success).length
      const fallidos = iaResultsArray.filter(r => !r.success).length
      const total = iaResultsArray.length
      
      // Mensaje más detallado
      let mensajeResumen = `✅ Procesamiento con IA completado:\n\n`
      mensajeResumen += `📊 Total: ${total} curso(s)\n`
      mensajeResumen += `✅ Exitosos: ${exitosos}\n`
      mensajeResumen += `❌ Fallidos: ${fallidos}\n\n`
      
      if (fallidos > 0) {
        mensajeResumen += `Cursos con problemas:\n`
        iaResultsArray
          .filter(r => !r.success)
          .slice(0, 5) // Mostrar máximo 5
          .forEach((r, i) => {
            mensajeResumen += `${i + 1}. ${r.cursoNombre}: ${r.message}\n`
          })
        if (fallidos > 5) {
          mensajeResumen += `... y ${fallidos - 5} más\n`
        }
        mensajeResumen += `\n💡 Recomendaciones:\n`
        mensajeResumen += `- Revisa los logs del servidor para más detalles\n`
        mensajeResumen += `- Verifica que los PDFs contengan listas de útiles válidas\n`
        mensajeResumen += `- Puedes procesar los cursos fallidos individualmente desde la lista\n`
        if (fallidos === total) {
          mensajeResumen += `\n⚠️ Todos los cursos fallaron. Posibles causas:\n`
          mensajeResumen += `- PDFs vacíos o sin productos reconocibles\n`
          mensajeResumen += `- Problema con la API de Gemini (verifica la API key)\n`
          mensajeResumen += `- PDFs muy grandes (timeout)\n`
        }
      }
      
      console.log(`[Importación Masiva IA] 📊 Resumen final:`, {
        total,
        exitosos,
        fallidos,
        porcentajeExito: total > 0 ? ((exitosos / total) * 100).toFixed(1) + '%' : '0%',
      })
      
      alert(mensajeResumen)
      
      // Actualizar los resultados originales con la información de IA
      const resultadosActualizados = results.map(r => {
        const iaResult = iaResultsArray.find(ia => String(ia.cursoId) === String(r.cursoId))
        if (iaResult) {
          return {
            ...r,
            message: `${r.message} | ${iaResult.message}`
          }
        }
        return r
      })
      setResults(resultadosActualizados)

    } catch (err: any) {
      console.error('[Importación Masiva IA] ❌ Error general:', err)
      setError('Error al procesar con IA: ' + err.message)
    } finally {
      setProcessingIA(false)
    }
  }

  const handleReset = () => {
    setStep('upload')
    setExcelFile(null)
    setIaResults([])
    setProgressIA(0)
    setImportData([])
    setResults([])
    setError(null)
    setProgress(0)
    setSelectedColegio(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const downloadTemplate = () => {
    // Template simple y limpio
    const template = [
      {
        nombre_curso: 'Nombre del Curso',
        nivel: 'Basica',
        grado: 1,
        año: new Date().getFullYear(),
      },
    ]

    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla')
    XLSX.writeFile(wb, 'plantilla_importacion_listas.xlsx')
  }

  const successCount = results.filter((r) => r.success).length
  const errorCount = results.filter((r) => !r.success).length

  return (
    <Modal show={show} onHide={onHide} size="xl">
      <ModalHeader closeButton>
        <ModalTitle>Importación Masiva de Listas y Cursos</ModalTitle>
      </ModalHeader>
      <ModalBody>
        {error && (
          <Alert variant="danger" className="mb-3">
            {error}
          </Alert>
        )}

        {step === 'upload' && (
          <div>
            <Alert variant="info" className="mb-4">
              <h6>📋 Instrucciones para Importación Masiva:</h6>
              <ol>
                <li><strong>Seleccione el colegio</strong> al que pertenecerán todos los cursos (obligatorio)</li>
                <li><strong>Descargue la plantilla Excel</strong> haciendo clic en "Descargar Plantilla"</li>
                <li><strong>Complete la plantilla</strong> con los datos de los cursos:
                  <ul className="mt-2 mb-2">
                    <li><strong>nombre_curso:</strong> Nombre del curso (ej: "Matemáticas", "Lenguaje")</li>
                    <li><strong>nivel:</strong> "Basica" o "Media" (exactamente así)</li>
                    <li><strong>grado:</strong> Número como texto (ej: "1", "2", "3")</li>
                    <li><strong>año:</strong> Año del curso (ej: 2026)</li>
                  </ul>
                </li>
                <li><strong>⚠️ IMPORTANTE:</strong> NO incluya una columna "colegio" en el Excel. El colegio ya está seleccionado arriba.</li>
                <li><strong>Suba el archivo Excel</strong> completado</li>
                <li><strong>Revise los datos</strong> y asigne PDFs si es necesario</li>
                <li><strong>Procese la importación</strong></li>
              </ol>
              <Alert variant="warning" className="mt-3 mb-0">
                <strong>Nota:</strong> Todos los cursos importados se vincularán automáticamente al colegio seleccionado.
              </Alert>
            </Alert>

            <Row>
              <Col md={12}>
                <FormGroup className="mb-3">
                  <FormLabel>Colegio *</FormLabel>
                  <Select
                    options={colegios}
                    value={selectedColegio}
                    onChange={(option: ColegioOption | null) => {
                      console.log('[Importación Masiva] Colegio seleccionado:', option)
                      setSelectedColegio(option)
                      setError(null) // Limpiar errores al seleccionar
                    }}
                    placeholder={loadingColegios ? "Cargando colegios..." : "Seleccione un colegio..."}
                    isDisabled={loadingColegios}
                    isLoading={loadingColegios}
                    isClearable
                    isSearchable
                    noOptionsMessage={() => loadingColegios ? "Cargando..." : "No hay colegios disponibles"}
                  />
                  {colegios.length === 0 && !loadingColegios && (
                    <Alert variant="warning" className="mt-2">
                      No se pudieron cargar los colegios. Por favor, recargue la página.
                    </Alert>
                  )}
                  <small className="text-muted">
                    Todos los cursos importados pertenecerán a este colegio
                  </small>
                </FormGroup>
              </Col>
            </Row>

            <Row>
              <Col md={12}>
                <FormGroup className="mb-3">
                  <FormLabel>Archivo Excel/CSV</FormLabel>
                  <div className="d-flex gap-2 mb-2">
                    <Button variant="outline-secondary" size="sm" onClick={downloadTemplate}>
                      <LuDownload className="me-1" />
                      Descargar Plantilla
                    </Button>
                  </div>
                  <FormControl
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    disabled={!selectedColegio}
                  />
                  <small className="text-muted">
                    Formatos soportados: .xlsx, .xls, .csv. {!selectedColegio && 'Primero debe seleccionar un colegio.'}
                  </small>
                </FormGroup>
              </Col>
            </Row>
          </div>
        )}

        {step === 'review' && (
          <div>
            <Alert variant="warning" className="mb-3">
              <strong>Revise los datos antes de procesar:</strong> Se crearán {importData.length} curso(s). 
              Puede asignar PDFs a cada curso antes de procesar.
            </Alert>

            <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <Table striped bordered hover size="sm">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Colegio</th>
                    <th>Curso</th>
                    <th>Nivel</th>
                    <th>Grado</th>
                    <th>Año</th>
                    <th>PDF</th>
                  </tr>
                </thead>
                <tbody>
                  {importData.map((row, index) => (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td>{row.colegio}</td>
                      <td>{row.nombre_curso}</td>
                      <td>
                        <Badge bg={row.nivel === 'Basica' ? 'primary' : 'info'}>
                          {row.nivel}
                        </Badge>
                      </td>
                      <td>{row.grado}°</td>
                      <td>{row.año || new Date().getFullYear()}</td>
                      <td>
                        <FormControl
                          ref={(el) => {
                            if (el) pdfInputsRef.current[index] = el
                          }}
                          type="file"
                          accept=".pdf"
                          size="sm"
                          onChange={(e) => {
                            const target = e.target as HTMLInputElement
                            const file = target.files?.[0]
                            handlePDFUpload(index, file || null)
                          }}
                        />
                        {row.pdf && (
                          <small className="text-success d-block mt-1">
                            <LuFileText size={12} /> {row.pdf.name}
                          </small>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="text-center py-4">
            <h5>Procesando importación...</h5>
            <ProgressBar now={progress} label={`${progress}%`} className="my-3" />
            <p className="text-muted">Por favor, espere mientras se crean los cursos y se asignan los PDFs.</p>
          </div>
        )}

        {step === 'results' && (
          <div>
            <Alert variant={errorCount === 0 ? 'success' : 'warning'} className="mb-3">
              <strong>Procesamiento completado:</strong> {successCount} exitoso(s), {errorCount} error(es)
            </Alert>

            <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <Table striped bordered hover size="sm">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Curso</th>
                    <th>Estado</th>
                    <th>Mensaje</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, index) => (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td>{result.cursoNombre || '-'}</td>
                      <td>
                        {result.success ? (
                          <Badge bg="success">
                            <LuCheck className="me-1" />
                            Éxito
                          </Badge>
                        ) : (
                          <Badge bg="danger">
                            <LuX className="me-1" />
                            Error
                          </Badge>
                        )}
                      </td>
                      <td>{result.message}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        {step === 'upload' && (
          <>
            <Button variant="secondary" onClick={onHide}>
              Cancelar
            </Button>
          </>
        )}

        {step === 'review' && (
          <>
            <Button variant="secondary" onClick={handleReset}>
              Volver
            </Button>
            <Button variant="primary" onClick={handleProcess}>
              Procesar Importación
            </Button>
          </>
        )}

        {step === 'processing' && (
          <Button variant="secondary" disabled>
            Procesando...
          </Button>
        )}

        {step === 'results' && (
          <>
            <Button variant="secondary" onClick={handleReset} disabled={processingIA}>
              Nueva Importación
            </Button>
            {successCount > 0 && !processingIA && (
              <Button
                variant="primary"
                onClick={handleProcesarTodoConIA}
                disabled={processingIA}
                className="d-flex align-items-center"
              >
                <TbSparkles className="me-2" />
                Procesar Todo con IA
              </Button>
            )}
            {processingIA && (
              <Button variant="primary" disabled>
                <Spinner animation="border" size="sm" className="me-2" />
                Procesando con IA... ({progressIA}%)
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => {
                handleReset()
                // onSuccess ya se llamó después de procesar, no llamarlo de nuevo
                onHide()
              }}
              disabled={processingIA}
            >
              Cerrar
            </Button>
          </>
        )}
      </ModalFooter>
    </Modal>
  )
}
