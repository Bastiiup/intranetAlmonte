'use client'

import PageBreadcrumb from '@/components/PageBreadcrumb'
import Link from 'next/link'
import { Card, CardBody, Col, Container, Row, Spinner, Alert, Button } from 'react-bootstrap'
import { TbBriefcase, TbCalendarEvent, TbEdit, TbMail, TbMessage, TbPencil, TbPhoneCall, TbStar, TbUserCircle, TbUserPlus, TbX, TbCheck, TbClock, TbDots, TbPlus, TbRefresh } from 'react-icons/tb'
import { useState, useEffect, useMemo } from 'react'
import { type ActivityType, estadoToBadge } from './data'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useToggle } from 'usehooks-ts'
import AddActivityModal from './components/AddActivityModal'

// Mapeo de tipos a iconos
const tipoIconMap: Record<string, any> = {
  'llamada': TbPhoneCall,
  'email': TbMail,
  'reunion': TbCalendarEvent,
  'nota': TbPencil,
  'cambio_estado': TbEdit,
  'tarea': TbCheck,
  'recordatorio': TbClock,
  'otro': TbDots,
}

// Mapeo de tipos a colores
const tipoColorMap: Record<string, string> = {
  'llamada': 'secondary',
  'email': 'danger',
  'reunion': 'primary',
  'nota': 'muted',
  'cambio_estado': 'primary',
  'tarea': 'info',
  'recordatorio': 'warning',
  'otro': 'muted',
}

const Page = () => {
  const [activities, setActivities] = useState<ActivityType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddModal, toggleAddModal] = useToggle(false)

  useEffect(() => {
    loadActivities()
  }, [])

  const loadActivities = async (forceRefresh = false) => {
    setLoading(true)
    setError(null)
    try {
      // Agregar timestamp para forzar recarga y evitar cache
      const timestamp = forceRefresh ? `&_t=${Date.now()}` : ''
      // Lógica similar a logs: fetch directo desde la API
      const response = await fetch(`/api/crm/activities?pageSize=100${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      })
      
      const result = await response.json()
      
      if (!response.ok || !result.success) {
        // Si el content-type no existe o hay error de permisos
        if (result.message?.includes('no existe en Strapi') || result.error === 'Content-type no encontrado') {
          setError('El content-type "Actividad" no existe en Strapi. Verifica que esté creado y los permisos configurados.')
          setActivities([])
          return
        }
        if (result.error === 'Permisos insuficientes') {
          setError('Error de permisos. Verifica que el rol tenga permisos para "Actividad" en Strapi Admin.')
          setActivities([])
          return
        }
        throw new Error(result.error || result.message || 'Error al obtener actividades')
      }
      
      // Manejar respuesta flexible (puede ser array o objeto con data)
      let activitiesData: any[] = []
      if (Array.isArray(result.data)) {
        activitiesData = result.data
      } else if (result.data && Array.isArray(result.data)) {
        activitiesData = result.data
      } else if (result.data) {
        activitiesData = [result.data]
      }
      
      // Transformar usando la función de transformación
      const transformed = activitiesData.map((actividad: any) => {
        const attrs = actividad.attributes || actividad
        
        // ID
        const actividadId = actividad.documentId || actividad.id
        const idReal = actividadId ? (typeof actividadId === 'string' ? actividadId : actividadId.toString()) : String(actividad.id || '0')
        const id = idReal.startsWith('#') ? idReal : `#ACT${idReal.padStart(6, '0')}`
        
        // Tipo
        const tipo = attrs.tipo || 'nota'
        
        // Título y descripción
        const titulo = attrs.titulo || 'Sin título'
        const descripcion = attrs.descripcion || ''
        
        // Fecha
        const fecha = attrs.fecha || attrs.createdAt || new Date().toISOString()
        const fechaObj = new Date(fecha)
        const fechaFormateada = fechaObj.toLocaleDateString('es-ES', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        })
        const hora = fechaObj.toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })
        
        // Estado
        const estadoRaw = attrs.estado || 'pendiente'
        const estado = estadoToBadge[estadoRaw]?.label || estadoRaw
        
        // Notas
        const notas = attrs.notas || ''
        
        // Relacionado con
        let relacionadoCon: any = undefined
        if (attrs.relacionado_con_contacto) {
          const contacto = attrs.relacionado_con_contacto.data || attrs.relacionado_con_contacto
          const contactoAttrs = contacto?.attributes || contacto
          relacionadoCon = {
            tipo: 'contacto',
            nombre: contactoAttrs?.nombre_completo || contactoAttrs?.nombres || 'Contacto',
            id: contacto?.documentId || contacto?.id
          }
        } else if (attrs.relacionado_con_lead) {
          const lead = attrs.relacionado_con_lead.data || attrs.relacionado_con_lead
          const leadAttrs = lead?.attributes || lead
          relacionadoCon = {
            tipo: 'lead',
            nombre: leadAttrs?.nombre || 'Lead',
            id: lead?.documentId || lead?.id
          }
        } else if (attrs.relacionado_con_oportunidad) {
          const oportunidad = attrs.relacionado_con_oportunidad.data || attrs.relacionado_con_oportunidad
          const oportunidadAttrs = oportunidad?.attributes || oportunidad
          relacionadoCon = {
            tipo: 'oportunidad',
            nombre: oportunidadAttrs?.nombre || 'Oportunidad',
            id: oportunidad?.documentId || oportunidad?.id
          }
        } else if (attrs.relacionado_con_colegio) {
          const colegio = attrs.relacionado_con_colegio.data || attrs.relacionado_con_colegio
          const colegioAttrs = colegio?.attributes || colegio
          relacionadoCon = {
            tipo: 'colegio',
            nombre: colegioAttrs?.colegio_nombre || colegioAttrs?.nombre || 'Colegio',
            id: colegio?.documentId || colegio?.id
          }
        }
        
        // Creado por
        let creadoPor: any = undefined
        if (attrs.creado_por) {
          const colaborador = attrs.creado_por.data || attrs.creado_por
          const colaboradorAttrs = colaborador?.attributes || colaborador
          const nombre = colaboradorAttrs?.persona?.nombre_completo || 
                         colaboradorAttrs?.nombre_completo || 
                         colaboradorAttrs?.email_login || 
                         'Sin nombre'
          creadoPor = {
            nombre,
            avatar: undefined
          }
        }
        
        return {
          id,
          realId: idReal,
          tipo,
          titulo,
          descripcion,
          fecha,
          fechaFormateada,
          hora,
          estado,
          notas,
          relacionadoCon,
          creadoPor,
        }
      })
      
      // Logs detallados después de transformar
      console.log('═══════════════════════════════════════════════════════')
      console.log('[Activities Page] ✅ ACTIVIDADES CARGADAS')
      console.log('═══════════════════════════════════════════════════════')
      console.log('[Activities Page] 📊 Estadísticas:')
      console.log('  - Total de actividades:', activitiesData.length)
      console.log('  - Actividades transformadas:', transformed.length)
      console.log('[Activities Page] 📋 Tipos de actividades:')
      const tiposCount: Record<string, number> = {}
      transformed.forEach(a => {
        tiposCount[a.tipo] = (tiposCount[a.tipo] || 0) + 1
      })
      Object.entries(tiposCount).forEach(([tipo, count]) => {
        console.log(`  - ${tipo}: ${count}`)
      })
      // Calcular actividadesByDate temporalmente para el log
      const grouped: Record<string, ActivityType[]> = {}
      transformed.forEach(activity => {
        const dateKey = format(new Date(activity.fecha), 'dd MMM, yyyy', { locale: es })
        if (!grouped[dateKey]) {
          grouped[dateKey] = []
        }
        grouped[dateKey].push(activity)
      })
      console.log('[Activities Page] 📅 Actividades agrupadas por fecha:', Object.keys(grouped).length, 'fechas')
      console.log('═══════════════════════════════════════════════════════')
      
      // Actualizar estado con las actividades transformadas
      setActivities(transformed)
      console.log('[Activities Page] ✅ Estado actualizado con', transformed.length, 'actividades')
    } catch (err: any) {
      console.error('[Activities Page] ❌ Error al cargar actividades:', err)
      setError(err.message || 'Error al cargar actividades')
      setActivities([])
    } finally {
      setLoading(false)
    }
  }

  // Agrupar actividades por fecha
  const activitiesByDate = useMemo(() => {
    const grouped: Record<string, ActivityType[]> = {}
    
    activities.forEach(activity => {
      const dateKey = format(new Date(activity.fecha), 'dd MMM, yyyy', { locale: es })
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(activity)
    })
    
    // Ordenar fechas descendente
    return Object.entries(grouped).sort((a, b) => {
      return new Date(b[0]).getTime() - new Date(a[0]).getTime()
    })
  }, [activities])

  if (loading) {
    return (
      <Container fluid>
        <PageBreadcrumb 
          title='Activities' 
          subtitle='CRM' 
          infoText="Las Actividades registran todas las interacciones y eventos relacionados con tus contactos, leads y oportunidades. Aquí puedes ver el historial completo: llamadas, emails, reuniones, notas, cambios de estado, y más. Cada actividad muestra quién la realizó, cuándo, y está relacionada con la entidad correspondiente del CRM."
        />
        <Row className="justify-content-center">
          <Col xxl={9}>
            <Card>
              <CardBody className="text-center py-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-2 text-muted">Cargando actividades...</p>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>
    )
  }

  return (
    <Container fluid>
      <PageBreadcrumb 
        title='Actividades' 
        subtitle='CRM' 
        infoText="Las Actividades registran todas las interacciones y eventos relacionados con tus contactos, leads y oportunidades. Aquí puedes ver el historial completo: llamadas, emails, reuniones, notas, cambios de estado, y más. Cada actividad muestra quién la realizó, cuándo, y está relacionada con la entidad correspondiente del CRM. Para crear una nueva actividad, haz clic en el botón 'Nueva Actividad'."
      />
      
      {error && (
        <Alert variant="danger" className="mb-3">
          <strong>Error:</strong> {error}
        </Alert>
      )}

      <Row className="justify-content-center">
        <Col xxl={9}>
          <Card>
            <CardBody>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">Historial de Actividades</h5>
                <div className="d-flex gap-2">
                  <Button 
                    variant="outline-secondary" 
                    onClick={() => {
                      console.log('[Activities Page] 🔄 Refrescando manualmente...')
                      loadActivities(true)
                    }}
                    disabled={loading}
                  >
                    <TbRefresh className="me-1" /> {loading ? 'Cargando...' : 'Refrescar'}
                  </Button>
                  <Button variant="primary" onClick={toggleAddModal}>
                    <TbPlus className="me-1" /> Nueva Actividad
                  </Button>
                </div>
              </div>
              
              {activities.length === 0 && !loading && (
                <Alert variant="info" className="mb-3">
                  <strong>No hay actividades registradas.</strong>
                  <p className="mb-0 mt-2">
                    Las actividades se crean automáticamente cuando realizas acciones en el CRM (como crear un lead, 
                    cambiar el estado de una oportunidad, etc.) o puedes crearlas manualmente haciendo clic en "Nueva Actividad".
                    <br />
                    <small className="text-muted">
                      Tipos de actividades: Llamadas, Emails, Reuniones, Notas, Cambios de Estado, Tareas, Recordatorios.
                    </small>
                  </p>
                </Alert>
              )}
              {activities.length > 0 && (
                <div className="timeline timeline-icon-bordered">
                  {activitiesByDate.map(([dateKey, dateActivities]) => (
                    <div key={dateKey} className="mb-3">
                      <h6 className="text-muted fw-bold mb-3">{dateKey}</h6>

                      {dateActivities.map((activity) => {
                        const IconComponent = tipoIconMap[activity.tipo] || TbDots
                        const color = tipoColorMap[activity.tipo] || 'muted'
                        const estadoInfo = estadoToBadge[activity.estado.toLowerCase()] || { label: activity.estado, variant: 'secondary' }

                        return (
                          <div key={activity.id} className="timeline-item d-flex align-items-start">
                            <div className="timeline-time pe-3 text-muted">{activity.hora}</div>
                            <div className="timeline-dot">
                              <IconComponent className={`fs-xl text-${color}`} />
                            </div>
                            <div className="timeline-content ps-3 pb-4">
                              <p className="mb-1">
                                <strong>{activity.titulo}</strong>
                                {activity.descripcion && (
                                  <>: {activity.descripcion}</>
                                )}
                                {activity.relacionadoCon && (
                                  <> - Relacionado con <strong>{activity.relacionadoCon.nombre}</strong> ({activity.relacionadoCon.tipo})</>
                                )}
                                {activity.creadoPor && (
                                  <> por <span className="fw-semibold text-primary">{activity.creadoPor.nombre}</span></>
                                )}
                              </p>
                              
                              {activity.notas && (
                                <div className="d-flex align-items-start gap-2 mt-2">
                                  <small className="text-muted">{activity.notas}</small>
                                </div>
                              )}
                              
                              <div className="d-flex align-items-center gap-2 mt-2">
                                <span className={`badge bg-${estadoInfo.variant}-subtle text-${estadoInfo.variant}`}>
                                  {estadoInfo.label}
                                </span>
                                <span className="badge bg-light border text-muted text-capitalize">
                                  {activity.tipo}
                                </span>
                                <small className="text-muted">{activity.fechaFormateada}, {activity.hora}</small>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
          
          <AddActivityModal
            show={showAddModal}
            toggleModal={toggleAddModal}
            onActivityCreated={() => {
              console.log('[Activities Page] 🔄 Recargando actividades después de crear...')
              // Forzar recarga con timestamp para evitar cache
              loadActivities(true)
              toggleAddModal()
            }}
          />
        </Col>
      </Row>
    </Container>
  )
}

export default Page
