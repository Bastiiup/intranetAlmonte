'use client'

import PageBreadcrumb from '@/components/PageBreadcrumb'
import Link from 'next/link'
import { Card, CardBody, Col, Container, Row, Spinner, Alert } from 'react-bootstrap'
import { TbBriefcase, TbCalendarEvent, TbEdit, TbMail, TbMessage, TbPencil, TbPhoneCall, TbStar, TbUserCircle, TbUserPlus, TbX, TbCheck, TbClock, TbDots } from 'react-icons/tb'
import { useState, useEffect, useMemo } from 'react'
import { getActivities, type ActivityType, tipoToIcon, estadoToBadge } from './data'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

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

  useEffect(() => {
    loadActivities()
  }, [])

  const loadActivities = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getActivities({ pageSize: 100 })
      setActivities(result.activities)
    } catch (err: any) {
      setError(err.message || 'Error al cargar actividades')
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
        title='Activities' 
        subtitle='CRM' 
        infoText="Las Actividades registran todas las interacciones y eventos relacionados con tus contactos, leads y oportunidades. Aquí puedes ver el historial completo: llamadas, emails, reuniones, notas, cambios de estado, y más. Cada actividad muestra quién la realizó, cuándo, y está relacionada con la entidad correspondiente del CRM."
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
              {activities.length === 0 ? (
                <div className="text-center py-5">
                  <p className="text-muted">No hay actividades registradas aún.</p>
                </div>
              ) : (
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
        </Col>
      </Row>
    </Container>
  )
}

export default Page
