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
import { LuUpload, LuFileSpreadsheet, LuCheck, LuX, LuInfo } from 'react-icons/lu'
import { useDropzone } from 'react-dropzone'

interface ImportarNivelesAsignaturasModalProps {
  show: boolean
  onHide: () => void
  onSuccess?: () => void
}

interface ImportResult {
  rbd: string
  colegioId?: number
  año: number
  cursosCreados: number
  cursosActualizados: number
  errores: string[]
}

export default function ImportarNivelesAsignaturasModal({
  show,
  onHide,
  onSuccess,
}: ImportarNivelesAsignaturasModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultados, setResultados] = useState<ImportResult[]>([])
  const [resumen, setResumen] = useState<{
    totalColegios: number
    totalCursosCreados: number
    totalCursosActualizados: number
    totalErrores: number
  } | null>(null)
  
  // Estados para el progreso en tiempo real
  const [progreso, setProgreso] = useState<{
    colegiosProcesados: number
    totalColegios: number
    cursosCreados: number
    cursosActualizados: number
    errores: number
    ultimoMensaje: string
  }>({
    colegiosProcesados: 0,
    totalColegios: 0,
    cursosCreados: 0,
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
      let cursosCreados = 0
      let cursosActualizados = 0
      let errores = 0
      let ultimoMensaje = ''
      
      // Buscar logs de progreso
      for (const log of logs) {
        const msg = log.message || ''
        
        // Detectar total de colegios
        const matchTotal = msg.match(/Total.*?colegios.*?(\d+)/i) || 
                          msg.match(/colegios.*?encontrados.*?(\d+)/i)
        if (matchTotal) {
          const total = parseInt(matchTotal[1])
          if (total > totalColegios) {
            totalColegios = total
          }
        }
        
        // Detectar progreso de colegios (formato: "[PROGRESO] Colegios: X/Y (Z%)")
        const matchProgreso = msg.match(/\[PROGRESO\]\s*Colegios:\s*(\d+)\/(\d+)/i) || 
                                 msg.match(/Progreso.*?(\d+)\/(\d+).*?colegios/i) ||
                                 msg.match(/Colegios.*?(\d+)\/(\d+)/i)
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
        
        // Detectar cursos creados
        if (msg.includes('✅ Curso creado') || msg.includes('Curso creado:')) {
          cursosCreados++
        }
        
        // Detectar cursos actualizados
        if (msg.includes('✅ Curso actualizado') || msg.includes('Curso actualizado:')) {
          cursosActualizados++
        }
        
        // Detectar errores
        if (msg.includes('❌') || (msg.includes('Error') && log.level === 'error')) {
          errores++
        }
        
        // Obtener último mensaje relevante
        if (msg.includes('[PROGRESO]') || msg.includes('Procesando') || msg.includes('Colegio') || msg.includes('Curso')) {
          ultimoMensaje = msg.replace(/\[.*?\]/g, '').trim().substring(0, 80)
        }
      }
      
      // Si encontramos información, actualizar el estado
      if (colegiosProcesados > 0 || totalColegios > 0 || cursosCreados > 0 || cursosActualizados > 0) {
        setProgreso({
          colegiosProcesados,
          totalColegios,
          cursosCreados,
          cursosActualizados,
          errores,
          ultimoMensaje,
        })
      }
    } catch (err) {
      // Silenciar errores de polling
      console.debug('[ImportarNivelesAsignaturasModal] Error al obtener progreso:', err)
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
      cursosCreados: 0,
      cursosActualizados: 0,
      errores: 0,
      ultimoMensaje: 'Iniciando importación...',
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

      // Crear FormData y enviar a la API
      const formData = new FormData()
      formData.append('file', file)

      console.log('[ImportarNivelesAsignaturasModal] 📤 Enviando archivo:', {
        nombre: file.name,
        tamaño: file.size,
        tipo: file.type,
      })

      // Crear un AbortController para timeout (10 minutos para archivos grandes)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 600000) // 10 minutos

      let response: Response
      try {
        response = await fetch('/api/crm/colegios/import-niveles-asignaturas', {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        })
        clearTimeout(timeoutId)
      } catch (fetchError: any) {
        clearTimeout(timeoutId)
        
        // Manejar diferentes tipos de errores
        if (fetchError.name === 'AbortError') {
          throw new Error('La petición tardó demasiado tiempo. El archivo puede ser muy grande. Intenta con un archivo más pequeño o divide el archivo en partes.')
        }
        
        if (fetchError.message === 'Failed to fetch') {
          throw new Error('No se pudo conectar con el servidor. Verifica que el servidor esté corriendo y que no haya problemas de red.')
        }
        
        throw new Error(`Error al enviar archivo: ${fetchError.message || 'Error desconocido'}`)
      }

      console.log('[ImportarNivelesAsignaturasModal] 📥 Respuesta recibida:', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
      })

      // Verificar si la respuesta es JSON
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('[ImportarNivelesAsignaturasModal] ❌ Respuesta no es JSON:', text.substring(0, 500))
        throw new Error(`Error del servidor: ${response.status} ${response.statusText}. La respuesta no es JSON válido.`)
      }

      const result = await response.json()

      console.log('[ImportarNivelesAsignaturasModal] 📊 Resultado:', {
        success: result.success,
        tieneData: !!result.data,
        tieneResultados: !!result.data?.resultados,
        tieneResumen: !!result.data?.resumen,
        error: result.error,
      })

      if (!response.ok) {
        // Si la respuesta no es OK, intentar obtener más información del error
        let errorMessage = `Error del servidor: ${response.status} ${response.statusText}`
        
        try {
          if (result && result.error) {
            errorMessage = result.error
          } else if (result && result.message) {
            errorMessage = result.message
          }
        } catch (e) {
          // Si no se puede parsear el error, usar el mensaje por defecto
        }
        
        throw new Error(errorMessage)
      }
      
      if (!result.success) {
        const errorMessage = result.error || result.message || 'Error desconocido al procesar el archivo'
        throw new Error(errorMessage)
      }

      if (result.data) {
        setResultados(result.data.resultados || [])
        setResumen(result.data.resumen || null)
        
        // Actualizar progreso final
        if (result.data.resumen) {
          setProgreso({
            colegiosProcesados: result.data.resumen.totalColegios,
            totalColegios: result.data.resumen.totalColegios,
            cursosCreados: result.data.resumen.totalCursosCreados,
            cursosActualizados: result.data.resumen.totalCursosActualizados,
            errores: result.data.resumen.totalErrores,
            ultimoMensaje: '✅ Importación completada',
          })
        }
        
        // Detener polling y contador de tiempo
        if (intervalId) {
          clearInterval(intervalId)
          setIntervalId(null)
        }
        setTiempoInicio(null)
        
        if (onSuccess) {
          setTimeout(() => {
            onSuccess()
          }, 1000)
        }
      } else {
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
        errorInfo.detalle = 'No se pudo conectar con el servidor. El servidor puede estar caído o no estar corriendo. Verifica que el servidor esté activo.'
      }
      
      // Si es un AbortError (timeout), dar mensaje específico
      if (err?.name === 'AbortError') {
        errorInfo.tipo = 'Timeout'
        errorInfo.detalle = 'La petición tardó demasiado tiempo. El archivo puede ser muy grande. Intenta con un archivo más pequeño o divide el archivo en partes.'
      }
      
      // Si el error tiene más propiedades, agregarlas
      if (err && typeof err === 'object') {
        Object.keys(err).forEach(key => {
          if (!['message', 'name', 'stack'].includes(key)) {
            errorInfo[key] = err[key]
          }
        })
      }
      
      console.error('[ImportarNivelesAsignaturasModal] ❌ Error al importar archivo:', errorInfo)
      
      // Mostrar mensaje de error más descriptivo
      let errorMessage = err?.message || err?.toString() || 'Error al procesar el archivo. Por favor, intenta nuevamente.'
      
      // Mejorar mensajes de error comunes
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('fetch')) {
        errorMessage = 'No se pudo conectar con el servidor. Verifica que el servidor esté corriendo (npm run dev).'
      } else if (errorMessage.includes('AbortError') || errorMessage.includes('timeout')) {
        errorMessage = 'La petición tardó demasiado tiempo. El archivo puede ser muy grande. Intenta con un archivo más pequeño.'
      }
      
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
            <LuFileSpreadsheet />
            <span>Importar Niveles y Asignaturas</span>
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
                    <li><strong>AÑO</strong> o <strong>AGNO</strong>: Año de los datos (ej: 2022)</li>
                    <li><strong>RBD</strong>: RBD del colegio (conector con content type Colegios)</li>
                    <li><strong>NIVEL</strong>: Nombre del nivel (ej: "1° Básico", "7° Básico", "I Medio")</li>
                    <li><strong>ID_NIVEL</strong>: Código numérico del nivel según MINEDUC:
                      <ul>
                        <li>4-7: 1° a 4° Básico (Primer Ciclo)</li>
                        <li>8-11: 5° a 8° Básico (Segundo Ciclo)</li>
                        <li>12-15: I a IV Medio</li>
                      </ul>
                    </li>
                    <li><strong>EDUCACIÓN</strong> o <strong>ENS_BAS_MED</strong>: Tipo de enseñanza (Básica, Media)</li>
                    <li><strong>CICLO</strong>: Ciclo educativo (Primer Ciclo Educación Básica, Segundo Ciclo Educación Básica, Educación Media)</li>
                    <li><strong>Asignatura</strong> o <strong>nom_subsector</strong>: Nombre de la asignatura (opcional)</li>
                    <li><strong>Cantidad_Alumnos</strong>: Cantidad de alumnos (opcional)</li>
                  </ul>
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
                  {(progreso.colegiosProcesados > 0 || progreso.cursosCreados > 0 || progreso.cursosActualizados > 0) && (
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
                            <span className="text-muted small">Cursos creados:</span>
                            <Badge bg="success">{progreso.cursosCreados}</Badge>
                          </div>
                        </div>
                        <div className="col-6">
                          <div className="d-flex justify-content-between align-items-center">
                            <span className="text-muted small">Cursos actualizados:</span>
                            <Badge bg="info">{progreso.cursosActualizados}</Badge>
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
                  <strong>Cursos creados:</strong>{' '}
                  <Badge bg="success">{resumen.totalCursosCreados}</Badge>
                </div>
                <div>
                  <strong>Cursos actualizados:</strong>{' '}
                  <Badge bg="info">{resumen.totalCursosActualizados}</Badge>
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
                      <th>Creados</th>
                      <th>Actualizados</th>
                      <th>Errores</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultados.map((resultado, index) => (
                      <tr key={index}>
                        <td>{resultado.rbd}</td>
                        <td>{resultado.año}</td>
                        <td>
                          {resultado.cursosCreados > 0 ? (
                            <Badge bg="success">{resultado.cursosCreados}</Badge>
                          ) : (
                            <span className="text-muted">0</span>
                          )}
                        </td>
                        <td>
                          {resultado.cursosActualizados > 0 ? (
                            <Badge bg="info">{resultado.cursosActualizados}</Badge>
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
                            <LuCheck className="text-success" />
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
