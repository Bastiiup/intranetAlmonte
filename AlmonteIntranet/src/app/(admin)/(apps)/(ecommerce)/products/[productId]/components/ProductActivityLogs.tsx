"use client"

import { useEffect, useState } from 'react'
import { Card, CardBody, CardHeader, CardTitle, Spinner, Alert } from 'react-bootstrap'
import { 
  TbPencil, 
  TbTrash, 
  TbChecklist, 
  TbArrowBackUp, 
  TbUserCircle,
  TbDollar,
  TbTag,
  TbRefresh
} from 'react-icons/tb'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

interface ProductActivityLogsProps {
  productId: string | number
}

interface LogEntry {
  id: string | number
  accion: string
  entidad: string
  entidad_id?: string
  descripcion: string
  fecha: string
  usuario?: {
    nombre?: string
    email?: string
  }
  datos_anteriores?: any
  datos_nuevos?: any
}

const ProductActivityLogs = ({ productId }: ProductActivityLogsProps) => {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadLogs = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(
        `/api/logs?entidad=producto&entidad_id=${productId}&pageSize=100&sort=fecha:desc`,
        { cache: 'no-store' }
      )

      const result = await response.json()

      if (result.success && result.data) {
        const logsArray = Array.isArray(result.data) ? result.data : [result.data]
        
        // Transformar logs al formato esperado
        const transformedLogs = logsArray.map((log: any) => {
          const attrs = log.attributes || log
          
          // Extraer usuario
          let usuario: any = undefined
          if (attrs.usuario) {
            const usuarioData = attrs.usuario.data || attrs.usuario
            const usuarioAttrs = usuarioData?.attributes || usuarioData
            
            if (usuarioAttrs) {
              const persona = usuarioAttrs.persona?.data?.attributes || 
                             usuarioAttrs.persona?.attributes ||
                             usuarioAttrs.persona
              
              const nombreCompleto = persona?.nombre_completo || 
                                   `${persona?.nombres || ''} ${persona?.primer_apellido || ''}`.trim() ||
                                   usuarioAttrs.email_login ||
                                   'Usuario'
              
              usuario = {
                nombre: nombreCompleto,
                email: usuarioAttrs.email_login || usuarioAttrs.email
              }
            }
          }

          // Parsear datos anteriores y nuevos si son strings JSON
          let datosAnteriores = attrs.datos_anteriores
          let datosNuevos = attrs.datos_nuevos
          
          if (typeof datosAnteriores === 'string') {
            try {
              datosAnteriores = JSON.parse(datosAnteriores)
            } catch {
              // Mantener como string si no es JSON válido
            }
          }
          
          if (typeof datosNuevos === 'string') {
            try {
              datosNuevos = JSON.parse(datosNuevos)
            } catch {
              // Mantener como string si no es JSON válido
            }
          }

          return {
            id: log.id || log.documentId || Math.random(),
            accion: attrs.accion || 'acción',
            entidad: attrs.entidad || 'producto',
            entidad_id: attrs.entidad_id,
            descripcion: attrs.descripcion || 'Sin descripción',
            fecha: attrs.fecha || attrs.createdAt || new Date().toISOString(),
            usuario,
            datos_anteriores: datosAnteriores,
            datos_nuevos: datosNuevos
          }
        })

        setLogs(transformedLogs)
      } else {
        setLogs([])
      }
    } catch (err: any) {
      console.error('[ProductActivityLogs] Error al cargar logs:', err)
      setError(err.message || 'Error al cargar los logs de actividades')
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (productId) {
      loadLogs()
    }
  }, [productId])

  // Determinar icono según acción y campo cambiado
  const getIcon = (log: LogEntry) => {
    const descripcion = log.descripcion.toLowerCase()
    const accion = log.accion.toLowerCase()

    // Cambios de precio
    if (descripcion.includes('precio') || descripcion.includes('price')) {
      return TbDollar
    }
    
    // Cambios de nombre
    if (descripcion.includes('nombre') || descripcion.includes('name') || descripcion.includes('título')) {
      return TbTag
    }

    // Acciones generales
    if (accion.includes('crear') || accion.includes('create')) {
      return TbChecklist
    }
    if (accion.includes('actualizar') || accion.includes('update') || accion.includes('editar') || accion.includes('edit')) {
      return TbPencil
    }
    if (accion.includes('eliminar') || accion.includes('delete')) {
      return TbTrash
    }

    return TbUserCircle
  }

  // Determinar color según acción
  const getColor = (log: LogEntry) => {
    const accion = log.accion.toLowerCase()
    
    if (accion.includes('crear') || accion.includes('create')) {
      return 'success'
    }
    if (accion.includes('actualizar') || accion.includes('update') || accion.includes('editar') || accion.includes('edit')) {
      return 'warning'
    }
    if (accion.includes('eliminar') || accion.includes('delete')) {
      return 'danger'
    }

    return 'primary'
  }

  // Extraer keywords de la descripción
  const getKeywords = (log: LogEntry): string[] => {
    const keywords: string[] = []
    const descripcion = log.descripcion.toLowerCase()
    
    if (descripcion.includes('precio') || descripcion.includes('price')) {
      keywords.push('precio')
    }
    if (descripcion.includes('nombre') || descripcion.includes('name')) {
      keywords.push('nombre')
    }
    if (descripcion.includes('descripción') || descripcion.includes('description')) {
      keywords.push('descripción')
    }
    if (descripcion.includes('stock') || descripcion.includes('inventario')) {
      keywords.push('stock')
    }
    if (descripcion.includes('imagen') || descripcion.includes('image')) {
      keywords.push('imagen')
    }

    // Agregar acción como keyword
    keywords.push(log.accion)

    return keywords
  }

  if (loading) {
    return (
      <Card className="mt-5 shadow-none border border-dashed">
        <CardBody className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2 text-muted">Cargando actividades...</p>
        </CardBody>
      </Card>
    )
  }

  return (
    <Card className="mt-5 shadow-none border border-dashed">
      <CardHeader className="border-light d-flex justify-content-between align-items-center">
        <CardTitle className="mb-0">Historial de Cambios</CardTitle>
        <button
          className="btn btn-sm btn-outline-primary"
          onClick={loadLogs}
          disabled={loading}
        >
          <TbRefresh className="me-1" />
          {loading ? 'Cargando...' : 'Actualizar'}
        </button>
      </CardHeader>
      <CardBody className="p-0">
        {error && (
          <Alert variant="warning" className="m-3 mb-0">
            <strong>Advertencia:</strong> {error}
          </Alert>
        )}

        {logs.length === 0 && !loading && (
          <Alert variant="info" className="m-3 mb-0">
            <p className="mb-0">
              <strong>No hay cambios registrados para este producto.</strong>
              <br />
              <small>Los cambios se registrarán automáticamente cuando se actualice el producto.</small>
            </p>
          </Alert>
        )}

        {logs.length > 0 && (
          <div className="timeline timeline-icon-bordered p-4">
            {logs.map((log, idx) => {
              const IconComponent = getIcon(log)
              const color = getColor(log)
              const keywords = getKeywords(log)
              
              const fecha = new Date(log.fecha)
              const tiempoRelativo = formatDistanceToNow(fecha, {
                addSuffix: true,
                locale: es
              })

              return (
                <div key={log.id} className="timeline-item d-flex align-items-start">
                  <div className="timeline-time pe-3 text-muted" style={{ minWidth: '120px' }}>
                    {tiempoRelativo}
                  </div>
                  <div className="timeline-dot">
                    <IconComponent className={`text-${color}`} />
                  </div>
                  <div className={`timeline-content ps-3 ${idx !== logs.length - 1 ? 'pb-4' : ''}`}>
                    <h5 className="mb-1">
                      {log.usuario?.nombre || 'Usuario desconocido'}
                    </h5>
                    <p className="mb-1">{log.descripcion}</p>
                    <small className="text-muted">
                      {keywords.join(' • ')}
                    </small>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardBody>
    </Card>
  )
}

export default ProductActivityLogs
