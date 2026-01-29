'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
  Button,
  Alert,
  Spinner,
  ProgressBar,
  Table,
  Badge,
} from 'react-bootstrap'
import { LuUpload, LuFileSpreadsheet, LuUsers, LuInfo } from 'react-icons/lu'
import { useDropzone } from 'react-dropzone'
import * as XLSX from 'xlsx'

interface ImportarMatriculadosModalProps {
  show: boolean
  onHide: () => void
  onSuccess?: () => void
}

interface ImportResult {
  rbd: string
  colegioId?: number
  año: number
  cursosActualizados: number
  errores: string[]
}

export default function ImportarMatriculadosModal({
  show,
  onHide,
  onSuccess,
}: ImportarMatriculadosModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultados, setResultados] = useState<ImportResult[]>([])
  const [resumen, setResumen] = useState<{
    totalColegios: number
    totalCursosActualizados: number
    totalErrores: number
  } | null>(null)
  
  // Estados para el progreso en tiempo real
  const [progreso, setProgreso] = useState<{
    colegiosProcesados: number
    totalColegios: number
    cursosActualizados: number
    errores: number
    ultimoMensaje: string
  }>({
    colegiosProcesados: 0,
    totalColegios: 0,
    cursosActualizados: 0,
    errores: 0,
    ultimoMensaje: '',
  })
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null)
  const [tiempoInicio, setTiempoInicio] = useState<number | null>(null)
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState<string>('00:00')
  const tiempoIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Función para obtener progreso desde los logs
  const obtenerProgresoDesdeLogs = useCallback(async () => {
    try {
      const response = await fetch('/api/crm/colegios/logs?limit=100')
      if (!response.ok) return
      
      const result = await response.json()
      if (!result.success || !result.data?.logs) return
      
      const logs = result.data.logs
      
      // Extraer información de progreso de los logs
      let colegiosProcesados = 0
      let totalColegios = 0
      let cursosActualizados = 0
      let errores = 0
      let ultimoMensaje = ''
      
      // Buscar logs de progreso
      for (const log of logs) {
        const msg = log.message || ''
        
        // Detectar progreso de colegios (formato: "[PROGRESO] Colegios: X/Y (Z%)")
        const matchProgreso = msg.match(/\[PROGRESO.*?MATRICULADOS\]\s*Colegios:\s*(\d+)\/(\d+)/i) || 
                                 msg.match(/Progreso.*?matriculados.*?(\d+)\/(\d+).*?colegios/i) ||
                                 msg.match(/Matriculados.*?(\d+)\/(\d+).*?colegios/i)
        if (matchProgreso) {
          const procesados = parseInt(matchProgreso[1])
          const total = parseInt(matchProgreso[2])
          if (procesados > colegiosProcesados) {
            colegiosProcesados = procesados
          }
          if (total > totalColegios) {
            totalColegios = total
          }
        }
        
        // Detectar cursos actualizados
        if (msg.includes('✅ Matriculados actualizados') || msg.includes('Matriculados actualizados:')) {
          cursosActualizados++
        }
        
        // Detectar errores
        if (msg.includes('❌') || (msg.includes('Error') && log.level === 'error')) {
          errores++
        }
        
        // Obtener último mensaje relevante
        if (msg.includes('[PROGRESO') || msg.includes('Matriculados') || msg.includes('Procesando')) {
          ultimoMensaje = msg.replace(/\[.*?\]/g, '').trim().substring(0, 80)
        }
      }
      
      // Si encontramos información, actualizar el estado
      if (colegiosProcesados > 0 || totalColegios > 0 || cursosActualizados > 0) {
        setProgreso({
          colegiosProcesados,
          totalColegios,
          cursosActualizados,
          errores,
          ultimoMensaje,
        })
      }
    } catch (err) {
      // Silenciar errores de polling
      console.debug('[ImportarMatriculadosModal] Error al obtener progreso:', err)
    }
  }, [])

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return

    const file = acceptedFiles[0]
    setError(null)
    setLoading(true)
    setResultados([])
    setResumen(null)
    
    // Resetear progreso
    setProgreso({
      colegiosProcesados: 0,
      totalColegios: 0,
      cursosActualizados: 0,
      errores: 0,
      ultimoMensaje: 'Iniciando importación de matriculados...',
    })
    
    // Iniciar contador de tiempo
    setTiempoInicio(Date.now())
    
    // Iniciar polling de progreso cada 2 segundos
    const interval = setInterval(obtenerProgresoDesdeLogs, 2000)
    setIntervalId(interval)
    
    // Iniciar contador de tiempo cada segundo
    const inicioTiempo = Date.now()
    if (tiempoIntervalRef.current) {
      clearInterval(tiempoIntervalRef.current)
    }
    tiempoIntervalRef.current = setInterval(() => {
      const segundos = Math.floor((Date.now() - inicioTiempo) / 1000)
      const minutos = Math.floor(segundos / 60)
      const segs = segundos % 60
      setTiempoTranscurrido(`${String(minutos).padStart(2, '0')}:${String(segs).padStart(2, '0')}`)
    }, 1000)
    
    // Primera consulta inmediata
    obtenerProgresoDesdeLogs()

    try {
      // Validar tipo de archivo
      const allowedExtensions = ['.xlsx', '.xls', '.csv']
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
      
      if (!allowedExtensions.includes(fileExtension)) {
        throw new Error('Tipo de archivo no válido. Se aceptan: .xlsx, .xls, .csv')
      }

      // Validar tamaño (max 100MB)
      const maxSize = 100 * 1024 * 1024 // 100MB
      if (file.size > maxSize) {
        throw new Error('El archivo es demasiado grande. Tamaño máximo: 100MB')
      }

      console.log('[ImportarMatriculadosModal] 📤 Procesando archivo en el cliente:', {
        nombre: file.name,
        tamaño: file.size,
        tipo: file.type,
      })

      // Procesar archivo en el cliente para evitar límites de Next.js
      let rawData: any[] = []
      
      if (fileExtension === '.csv') {
        // Leer CSV como texto
        const text = await file.text()
        const workbook = XLSX.read(text, { type: 'string', raw: false })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        rawData = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: '' })
      } else {
        // Leer Excel como arrayBuffer
        const arrayBuffer = await file.arrayBuffer()
        const workbook = XLSX.read(arrayBuffer, { type: 'buffer', cellDates: true })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        rawData = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: '' })
      }

      if (rawData.length === 0) {
        throw new Error('El archivo no contiene datos válidos')
      }

      console.log('[ImportarMatriculadosModal] ✅ Archivo procesado:', {
        filas: rawData.length,
        columnas: rawData.length > 0 ? Object.keys(rawData[0]).join(', ') : 'N/A',
      })

      // Filtrar y limpiar datos antes de procesar para reducir tamaño
      console.log('[ImportarMatriculadosModal] 🧹 Limpiando y filtrando datos...')
      const datosLimpios = rawData
        .filter((row: any) => {
          // Solo incluir filas con RBD válido
          const rbd = row.RBD || row.rbd || row.Rbd
          return rbd && String(rbd).trim() !== ''
        })
        .map((row: any) => {
          // Extraer solo los campos necesarios para reducir tamaño
          return {
            agno: row.AGNO || row.agno || row.AÑO || row.año,
            rbd: row.RBD || row.rbd || row.Rbd,
            nivel: row.NIVEL || row.nivel || row.Nivel,
            id_nivel: row.ID_NIVEL || row.id_nivel || row.IdNivel,
            n_alu: row.N_ALU || row.n_alu || row.NAlu || row.cantidad_alumnos,
            ens_bas_med: row.ENS_BAS_MED || row.ens_bas_med || row.EDUCACIÓN || row.educacion || row.tipo_ensenanza,
          }
        })
      
      console.log('[ImportarMatriculadosModal] ✅ Datos limpiados:', {
        filasOriginales: rawData.length,
        filasLimpias: datosLimpios.length,
        reduccion: `${((1 - datosLimpios.length / rawData.length) * 100).toFixed(1)}%`,
      })

      // Dividir datos en chunks más pequeños para archivos grandes
      // Chunks más pequeños = menos memoria y mejor manejo de errores
      const CHUNK_SIZE = rawData.length > 10000 ? 1000 : 2000 // Chunks más pequeños para archivos grandes
      const chunks: any[][] = []
      for (let i = 0; i < datosLimpios.length; i += CHUNK_SIZE) {
        chunks.push(datosLimpios.slice(i, i + CHUNK_SIZE))
      }

      console.log('[ImportarMatriculadosModal] 📦 Dividido en chunks:', {
        totalChunks: chunks.length,
        filasPorChunk: CHUNK_SIZE,
        totalFilas: rawData.length,
      })

      // Procesar chunks secuencialmente
      let resultadosAcumulados: any[] = []
      let resumenAcumulado: any = {
        totalColegios: 0,
        totalCursosActualizados: 0,
        totalErrores: 0,
      }

      for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
        const chunk = chunks[chunkIndex]
        const chunkNumber = chunkIndex + 1
        
        console.log(`[ImportarMatriculadosModal] 📤 Enviando chunk ${chunkNumber}/${chunks.length} (${chunk.length} filas)...`)
        
        // Actualizar progreso
        setProgreso({
          colegiosProcesados: Math.floor((chunkIndex / chunks.length) * 100),
          totalColegios: 100,
          cursosActualizados: 0,
          errores: 0,
          ultimoMensaje: `Procesando chunk ${chunkNumber}/${chunks.length}...`,
        })

        const response = await fetch('/api/crm/colegios/import-matriculados', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          // Comprimir datos antes de enviar (Next.js lo hace automáticamente, pero ser explícito ayuda)
          body: JSON.stringify({
            datos: chunk,
            nombreArchivo: file.name,
            chunkIndex: chunkIndex,
            totalChunks: chunks.length,
            // Metadata para optimización
            metadata: {
              filasEnChunk: chunk.length,
              camposPorFila: chunk.length > 0 ? Object.keys(chunk[0]).length : 0,
            },
          }),
        })

        console.log(`[ImportarMatriculadosModal] 📥 Respuesta recibida para chunk ${chunkNumber}:`, {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
        })

        // Verificar si la respuesta es JSON
        const contentType = response.headers.get('content-type')
        let result: any
        
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text()
          console.error(`[ImportarMatriculadosModal] ❌ Respuesta no es JSON para chunk ${chunkNumber}:`, text.substring(0, 500))
          throw new Error(`Error del servidor en chunk ${chunkNumber}: ${response.status} ${response.statusText}`)
        }

        try {
          result = await response.json()
        } catch (jsonError: any) {
          console.error(`[ImportarMatriculadosModal] ❌ Error al parsear JSON para chunk ${chunkNumber}:`, jsonError)
          throw new Error(`Error al procesar la respuesta del servidor para chunk ${chunkNumber}: ${jsonError.message || 'Respuesta inválida'}`)
        }

        if (!response.ok || !result.success) {
          const errorMessage = result.error || result.message || `Error del servidor en chunk ${chunkNumber}: ${response.status} ${response.statusText}`
          throw new Error(errorMessage)
        }

        // Acumular resultados
        if (result.data) {
          resultadosAcumulados.push(...(result.data.resultados || []))
          if (result.data.resumen) {
            resumenAcumulado.totalColegios = Math.max(
              resumenAcumulado.totalColegios,
              result.data.resumen.totalColegios || 0
            )
            resumenAcumulado.totalCursosActualizados += result.data.resumen.totalCursosActualizados || 0
            resumenAcumulado.totalErrores += result.data.resumen.totalErrores || 0
          }
        }

        // Actualizar progreso
        setProgreso({
          colegiosProcesados: Math.floor(((chunkIndex + 1) / chunks.length) * 100),
          totalColegios: 100,
          cursosActualizados: resumenAcumulado.totalCursosActualizados,
          errores: resumenAcumulado.totalErrores,
          ultimoMensaje: `Chunk ${chunkNumber}/${chunks.length} completado`,
        })
      }

      // Procesamiento completado
      console.log('[ImportarMatriculadosModal] ✅ Todos los chunks procesados:', {
        totalChunks: chunks.length,
        resultadosAcumulados: resultadosAcumulados.length,
        resumenAcumulado,
      })

      setResultados(resultadosAcumulados)
      setResumen(resumenAcumulado)
      
      // Actualizar progreso final
      setProgreso({
        colegiosProcesados: 100,
        totalColegios: 100,
        cursosActualizados: resumenAcumulado.totalCursosActualizados,
        errores: resumenAcumulado.totalErrores,
        ultimoMensaje: '✅ Importación completada',
      })
      
      // Detener polling y contador de tiempo
      if (intervalId) {
        clearInterval(intervalId)
        setIntervalId(null)
      }
      if (tiempoIntervalRef.current) {
        clearInterval(tiempoIntervalRef.current)
        tiempoIntervalRef.current = null
      }
      setTiempoInicio(null)
      
      if (onSuccess) {
        setTimeout(() => {
          onSuccess()
        }, 1000)
      }
    } catch (err: any) {
      // Mejorar el logging de errores
      const errorInfo: any = {
        message: err?.message || 'Error desconocido',
        name: err?.name,
        stack: err?.stack,
      }
      
      // Si es un error de red, agregar más información
      if (err instanceof TypeError && err.message.includes('fetch')) {
        errorInfo.tipo = 'Error de red'
        errorInfo.detalle = 'No se pudo conectar con el servidor. Verifica tu conexión a internet.'
      }
      
      // Si el error tiene más propiedades, agregarlas
      if (err && typeof err === 'object') {
        Object.keys(err).forEach(key => {
          if (!['message', 'name', 'stack'].includes(key)) {
            errorInfo[key] = err[key]
          }
        })
      }
      
      console.error('[ImportarMatriculadosModal] ❌ Error al importar archivo:', errorInfo)
      
      // Mostrar mensaje de error más descriptivo
      const errorMessage = err?.message || err?.toString() || 'Error al procesar el archivo. Por favor, intenta nuevamente.'
      setError(errorMessage)
      setResultados([])
      setResumen(null)
      
      // Detener polling y contador de tiempo
      if (intervalId) {
        clearInterval(intervalId)
        setIntervalId(null)
      }
      if (tiempoIntervalRef.current) {
        clearInterval(tiempoIntervalRef.current)
        tiempoIntervalRef.current = null
      }
      setTiempoInicio(null)
    } finally {
      setLoading(false)
    }
  }, [onSuccess, obtenerProgresoDesdeLogs, intervalId])
  
  // Limpiar intervalo al desmontar o cerrar el modal
  useEffect(() => {
    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [intervalId])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
    disabled: loading,
  })

  const handleClose = () => {
    if (loading) {
      // Si está procesando, preguntar si realmente quiere cerrar
      if (confirm('⚠️ La importación está en progreso. Si cierras el modal, perderás la visualización del progreso, pero el proceso puede continuar en el servidor.\n\n¿Deseas cerrar de todas formas?\n\nPuedes verificar el progreso en la página de logs.')) {
        // Detener polling pero mantener el proceso en el servidor
        if (intervalId) {
          clearInterval(intervalId)
          setIntervalId(null)
        }
        if (tiempoIntervalRef.current) {
          clearInterval(tiempoIntervalRef.current)
          tiempoIntervalRef.current = null
        }
        setTiempoInicio(null)
        setLoading(false)
        setError(null)
        setResultados([])
        setResumen(null)
        onHide()
      }
    } else {
      // Si no está procesando, cerrar normalmente
      if (intervalId) {
        clearInterval(intervalId)
        setIntervalId(null)
      }
      if (tiempoIntervalRef.current) {
        clearInterval(tiempoIntervalRef.current)
        tiempoIntervalRef.current = null
      }
      setTiempoInicio(null)
      setError(null)
      setResultados([])
      setResumen(null)
      onHide()
    }
  }

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered>
      <ModalHeader closeButton>
        <ModalTitle>
          <div className="d-flex align-items-center gap-2">
            <LuUsers />
            <span>Importar Matriculados (Cantidad de Alumnos)</span>
          </div>
        </ModalTitle>
      </ModalHeader>
      <ModalBody>
        {!resumen && (
          <>
            <Alert variant="info" className="mb-3">
              <div className="d-flex align-items-start gap-2">
                <LuInfo size={20} className="mt-1" />
                <div>
                  <strong>Formato del archivo CSV/Excel:</strong>
                  <ul className="mb-0 mt-2">
                    <li><strong>AGNO</strong> o <strong>AÑO</strong>: Año de los datos (ej: 2025)</li>
                    <li><strong>RBD</strong>: RBD del colegio (obligatorio)</li>
                    <li><strong>NIVEL</strong> o <strong>ID_NIVEL</strong>: Nivel del curso (ej: "5° Básico", "I Medio", o código numérico)</li>
                    <li><strong>N_ALU</strong>: Número total de alumnos en el curso (obligatorio)</li>
                    <li><strong>N_ALU_GRADO1</strong>, <strong>N_ALU_GRADO2</strong>, etc.: Número de alumnos por grado (opcional, para cursos combinados)</li>
                    <li><strong>EDUCACIÓN</strong> o <strong>ENS_BAS_MED</strong>: Tipo de enseñanza (Básica, Media)</li>
                  </ul>
                  <p className="mb-0 mt-2">
                    <strong>Nota:</strong> El sistema buscará los cursos existentes por RBD, año, nivel y grado, y actualizará la cantidad de alumnos.
                  </p>
                </div>
              </div>
            </Alert>

            {error && (
              <Alert variant="danger" className="mb-3">
                {error}
              </Alert>
            )}

            <div
              {...getRootProps()}
              className={`border rounded p-5 text-center ${
                isDragActive ? 'border-primary bg-primary-subtle' : 'border-dashed'
              }`}
              style={{ cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              <input {...getInputProps()} />
              {loading ? (
                <div>
                  <Spinner animation="border" className="mb-3" />
                  <p className="mb-2 fw-semibold">Procesando archivo...</p>
                  
                  {/* Resumen de progreso en tiempo real */}
                  {(progreso.colegiosProcesados > 0 || progreso.cursosActualizados > 0) && (
                    <div className="mb-3 p-3 bg-light rounded border">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h6 className="mb-0">📊 Progreso de Importación</h6>
                        {tiempoInicio && (
                          <Badge bg="secondary" className="fs-6">
                            ⏱️ {tiempoTranscurrido}
                          </Badge>
                        )}
                      </div>
                      <div className="row g-2">
                        {progreso.totalColegios > 0 && (
                          <div className="col-6">
                            <div className="d-flex justify-content-between align-items-center">
                              <span className="text-muted small">Colegios:</span>
                              <Badge bg="primary">
                                {progreso.colegiosProcesados} / {progreso.totalColegios}
                              </Badge>
                            </div>
                            <ProgressBar 
                              now={(progreso.colegiosProcesados / progreso.totalColegios) * 100} 
                              className="mt-1"
                              style={{ height: '6px' }}
                            />
                          </div>
                        )}
                        <div className="col-6">
                          <div className="d-flex justify-content-between align-items-center">
                            <span className="text-muted small">Cursos actualizados:</span>
                            <Badge bg="success">{progreso.cursosActualizados}</Badge>
                          </div>
                        </div>
                        {progreso.errores > 0 && (
                          <div className="col-6">
                            <div className="d-flex justify-content-between align-items-center">
                              <span className="text-muted small">Errores:</span>
                              <Badge bg="danger">{progreso.errores}</Badge>
                            </div>
                          </div>
                        )}
                      </div>
                      {progreso.ultimoMensaje && (
                        <div className="mt-2 pt-2 border-top">
                          <small className="text-muted">
                            <strong>Última actividad:</strong> {progreso.ultimoMensaje}
                          </small>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <Alert variant="warning" className="mb-2 small">
                    <strong>⚠️ Importante:</strong> Si cierras este modal o recargas la página, perderás la visualización del progreso, pero el proceso continuará ejecutándose en el servidor. Los datos ya guardados no se perderán.
                  </Alert>
                  <p className="mb-2 text-muted small">
                    Esto puede tardar varios minutos dependiendo del tamaño del archivo.
                  </p>
                  <p className="mb-0 text-muted small">
                    Puedes abrir la página de <Link href="/crm/colegios/logs" target="_blank" className="text-primary fw-semibold">logs</Link> en otra pestaña para ver el progreso en tiempo real y verificar el estado incluso si cierras este modal.
                  </p>
                  <Alert variant="info" className="mt-3 small">
                    <strong>💡 Nota sobre archivos grandes:</strong> Si tu archivo es muy grande (más de 50MB), considera dividirlo en partes más pequeñas o comprimirlo. Archivos muy grandes pueden tardar más tiempo en procesarse.
                  </Alert>
                </div>
              ) : (
                <div>
                  <LuUpload size={48} className="text-muted mb-3" />
                  <p className="mb-2">
                    {isDragActive
                      ? 'Suelta el archivo aquí'
                      : 'Arrastra un archivo CSV/Excel aquí o haz clic para seleccionar'}
                  </p>
                  <small className="text-muted">
                    Formatos aceptados: .xlsx, .xls, .csv (máx. 100MB)
                  </small>
                </div>
              )}
            </div>
          </>
        )}

        {resumen && (
          <>
            <Alert variant="success" className="mb-3">
              <h6 className="mb-2">✅ Importación completada</h6>
              <div className="d-flex gap-3 flex-wrap">
                <div>
                  <strong>Colegios procesados:</strong> {resumen.totalColegios}
                </div>
                <div>
                  <strong>Cursos actualizados:</strong>{' '}
                  <Badge bg="success">{resumen.totalCursosActualizados}</Badge>
                </div>
                {resumen.totalErrores > 0 && (
                  <div>
                    <strong>Errores:</strong> <Badge bg="danger">{resumen.totalErrores}</Badge>
                  </div>
                )}
              </div>
            </Alert>

            {resultados.length > 0 && (
              <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <Table striped bordered hover size="sm">
                  <thead>
                    <tr>
                      <th>RBD</th>
                      <th>Año</th>
                      <th>Cursos Actualizados</th>
                      <th>Errores</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultados.map((resultado, idx) => (
                      <tr key={idx}>
                        <td>{resultado.rbd}</td>
                        <td>{resultado.año}</td>
                        <td>
                          {resultado.cursosActualizados > 0 ? (
                            <Badge bg="success">{resultado.cursosActualizados}</Badge>
                          ) : (
                            <span className="text-muted">0</span>
                          )}
                        </td>
                        <td>
                          {resultado.errores.length > 0 ? (
                            <div>
                              <Badge bg="danger">{resultado.errores.length}</Badge>
                              <small className="d-block text-muted mt-1">
                                {resultado.errores[0]}
                                {resultado.errores.length > 1 && ` (+${resultado.errores.length - 1} más)`}
                              </small>
                            </div>
                          ) : (
                            <LuUsers className="text-success" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={handleClose} disabled={loading}>
          {resumen ? 'Cerrar' : 'Cancelar'}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
