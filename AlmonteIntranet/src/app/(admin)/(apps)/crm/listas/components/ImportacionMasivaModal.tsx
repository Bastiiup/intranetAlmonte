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
} from 'react-bootstrap'
import { LuUpload, LuFileText, LuCheck, LuX, LuDownload } from 'react-icons/lu'
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
  paralelo?: string
  año?: number
  pdf?: File | null
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
            paralelo: normalizedRow.paralelo ? String(normalizedRow.paralelo) : undefined,
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
              const paralelo = attrs.paralelo || ''
              const grado = String(attrs.grado || '') // grado es string en Strapi
              const nivel = attrs.nivel || ''
              const año = attrs.año || attrs.ano || 0

              return (
                nombreCurso.toLowerCase().trim() === row.nombre_curso.toLowerCase().trim() &&
                (paralelo || '') === (row.paralelo || '') &&
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
            const nombreCursoGenerado = row.nombre_curso || `${row.nivel} ${row.grado}°${row.paralelo ? ` ${row.paralelo}` : ''}`
            
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

            if (row.paralelo) {
              payload.paralelo = row.paralelo
            }

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
                paralelo: payload.paralelo,
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

              console.log(`[Importación Masiva] Subiendo PDF para curso:`, {
                cursoId: cursoId,
                tipoCursoId: typeof cursoId,
                nombreArchivo: row.pdf.name,
                tamaño: row.pdf.size,
              })

              const uploadResponse = await fetch('/api/crm/cursos/import-pdf', {
                method: 'POST',
                body: pdfFormData,
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
            } catch (pdfError: any) {
              console.error(`[Importación Masiva] ❌ Excepción al subir PDF:`, {
                error: pdfError.message,
                stack: pdfError.stack,
                cursoId: cursoId,
              })
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

  const handleReset = () => {
    setStep('upload')
    setExcelFile(null)
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
        paralelo: 'A',
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
                    <li><strong>paralelo:</strong> Letra del paralelo (ej: "A", "B") o dejar vacío</li>
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
                    <th>Paralelo</th>
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
                      <td>{row.paralelo || '-'}</td>
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
                            const file = e.target.files?.[0]
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
            <Button variant="secondary" onClick={handleReset}>
              Nueva Importación
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                handleReset()
                // onSuccess ya se llamó después de procesar, no llamarlo de nuevo
                onHide()
              }}
            >
              Cerrar
            </Button>
          </>
        )}
      </ModalFooter>
    </Modal>
  )
}
