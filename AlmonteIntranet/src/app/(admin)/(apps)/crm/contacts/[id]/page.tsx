'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Container, Card, CardHeader, CardBody, Alert, Spinner, Row, Col, Badge, Table, Nav, NavItem, NavLink, Button } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { LuArrowLeft, LuUsers, LuBuilding2, LuHistory, LuFileText, LuMail, LuPhone, LuMapPin, LuGraduationCap, LuBookOpen, LuCalendar, LuUser, LuPencil } from 'react-icons/lu'
import Link from 'next/link'
import EditContactModal from '../components/EditContactModal'
import EditContactColegioModal from '../components/EditContactColegioModal'
import EditContactEmpresaModal from '../components/EditContactEmpresaModal'
import type { ContactType } from '@/app/(admin)/(apps)/crm/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import Image from 'next/image'
import { generateInitials } from '@/helpers/casing'

interface ContactDetailData {
  id: number | string
  documentId: string
  nombre_completo: string
  nombres: string
  primer_apellido?: string
  segundo_apellido?: string
  rut?: string
  nivel_confianza: 'baja' | 'media' | 'alta'
  origen: string
  activo: boolean
  createdAt: string
  updatedAt: string
  emails: Array<{ email?: string; principal?: boolean }>
  telefonos: Array<{ telefono_norm?: string; telefono_raw?: string; principal?: boolean }>
  imagen?: string | {
    url?: string
    media?: {
      data?: {
        attributes?: {
          url?: string
        }
      }
    }
  }
  tags?: Array<{ name?: string }>
  trayectorias: Array<{
    id: string | number
    documentId: string
    cargo?: string
    anio?: number | null
    is_current: boolean
    activo: boolean
    fecha_inicio?: string | null
    fecha_fin?: string | null
    colegio: {
      id: string | number
      documentId: string
      nombre: string
      rbd?: string | number
      dependencia?: string
      region?: string
      comuna?: string
    }
    curso: {
      id: string | number
      nombre: string
    }
    asignatura: {
      id: string | number
      nombre: string
    }
  }>
  equipos: Array<{
    id: string | number
    documentId: string
    nombre: string
    descripcion?: string
    activo: boolean
    colegio?: {
      id: string | number
      documentId: string
      nombre: string
    } | null
    lider?: {
      id: string | number
      documentId: string
      nombre: string
    } | null
  }>
  colegios: Array<{
    id: string | number
    documentId: string
    nombre: string
    rbd?: string | number
    dependencia?: string
    region?: string
    comuna?: string
  }>
  empresa_contactos: Array<{
    id: string | number
    documentId: string
    cargo?: string
    empresa: {
      id: string | number
      documentId: string
      empresa_nombre?: string
      nombre?: string
    }
  }>
  actividades: Array<{
    id: string | number
    documentId: string
    tipo: string
    titulo: string
    descripcion?: string
    fecha: string
    estado: string
    notas?: string
    creado_por?: {
      id: string | number
      nombre: string
      email?: string
    } | null
  }>
}

type TabType = 'equipo' | 'equipos' | 'colegio' | 'historial' | 'logs'

const ContactDetailPage = () => {
  const params = useParams()
  const router = useRouter()
  const contactId = params.id as string

  const [contact, setContact] = useState<ContactDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('equipo')
  const [editModal, setEditModal] = useState(false)
  const [contactType, setContactType] = useState<'colegio' | 'empresa' | null>(null)

  useEffect(() => {
    const fetchContact = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/crm/contacts/${contactId}`)
        const result = await response.json()

        if (!result.success) {
          throw new Error(result.error || 'Error al cargar contacto')
        }

        const contactData = result.data
        setContact(contactData)
        
        // Detectar tipo de contacto de manera más precisa
        const attrs = contactData.attributes || contactData
        
        // Verificar trayectorias con colegio válido
        const trayectorias = attrs.trayectorias?.data || attrs.trayectorias || []
        const trayectoriasArray = Array.isArray(trayectorias) ? trayectorias : [trayectorias]
        const hasTrayectorias = trayectoriasArray.some((t: any) => {
          const tAttrs = t.attributes || t
          const colegio = tAttrs.colegio?.data || tAttrs.colegio || t.colegio
          return colegio?.id || colegio?.documentId
        })
        
        // Verificar empresa_contactos con empresa válida
        const empresaContactos = attrs.empresa_contactos?.data || attrs.empresa_contactos || []
        const empresaContactosArray = Array.isArray(empresaContactos) ? empresaContactos : [empresaContactos]
        const hasEmpresaContactos = empresaContactosArray.some((ec: any) => {
          const ecAttrs = ec.attributes || ec
          const empresa = ecAttrs.empresa?.data || ecAttrs.empresa
          return empresa?.id || empresa?.documentId
        })
        
        // Determinar tipo: priorizar empresa si tiene empresa-contactos, sino colegio si tiene trayectorias
        if (hasEmpresaContactos) {
          setContactType('empresa')
        } else if (hasTrayectorias) {
          setContactType('colegio')
        } else {
          setContactType(null)
        }
      } catch (err: any) {
        console.error('Error fetching contact:', err)
        setError(err.message || 'Error al cargar contacto')
      } finally {
        setLoading(false)
      }
    }

    if (contactId) {
      fetchContact()
    }
  }, [contactId])

  const getConfidenceBadge = (nivel: string) => {
    const variants: Record<string, { variant: string; label: string }> = {
      baja: { variant: 'info', label: 'Cold Lead' },
      media: { variant: 'warning', label: 'Prospect' },
      alta: { variant: 'success', label: 'Hot Lead' },
    }
    const conf = variants[nivel] || variants.media
    return <Badge bg={`${conf.variant}-subtle`} text={conf.variant}>{conf.label}</Badge>
  }

  const getOrigenBadge = (origen: string) => {
    const origenes: Record<string, string> = {
      mineduc: 'MINEDUC',
      csv: 'CSV',
      manual: 'Manual',
      crm: 'CRM',
      web: 'Web',
      otro: 'Otro',
    }
    return <Badge bg="primary-subtle" text="primary">{origenes[origen] || origen}</Badge>
  }

  const getTipoActividadBadge = (tipo: string) => {
    const tipos: Record<string, { variant: string; label: string }> = {
      llamada: { variant: 'info', label: 'Llamada' },
      email: { variant: 'primary', label: 'Email' },
      reunion: { variant: 'success', label: 'Reunión' },
      nota: { variant: 'secondary', label: 'Nota' },
      cambio_estado: { variant: 'warning', label: 'Cambio Estado' },
      tarea: { variant: 'danger', label: 'Tarea' },
      recordatorio: { variant: 'info', label: 'Recordatorio' },
      otro: { variant: 'secondary', label: 'Otro' },
    }
    const tipoInfo = tipos[tipo] || tipos.otro
    return <Badge bg={`${tipoInfo.variant}-subtle`} text={tipoInfo.variant}>{tipoInfo.label}</Badge>
  }

  const getEstadoActividadBadge = (estado: string) => {
    const estados: Record<string, { variant: string; label: string }> = {
      completada: { variant: 'success', label: 'Completada' },
      pendiente: { variant: 'warning', label: 'Pendiente' },
      cancelada: { variant: 'danger', label: 'Cancelada' },
      en_progreso: { variant: 'info', label: 'En Progreso' },
    }
    const estadoInfo = estados[estado] || estados.pendiente
    return <Badge bg={`${estadoInfo.variant}-subtle`} text={estadoInfo.variant}>{estadoInfo.label}</Badge>
  }

  const renderEquipoTab = () => {
    if (!contact) return null

    const trayectoriasActivas = contact.trayectorias?.filter(t => t.activo && t.is_current) || []
    const trayectoriasHistoricas = contact.trayectorias?.filter(t => !t.is_current || !t.activo) || []
    const empresaContactos = contact.empresa_contactos || []

    return (
      <div>
        <h5 className="mb-3">Relaciones Laborales</h5>
        
        {/* Sección de Empresas */}
        {empresaContactos.length > 0 && (
          <div className="mb-4">
            <h6 className="text-muted mb-3">
              <LuBuilding2 className="me-2" />
              Empresas
            </h6>
            <Table responsive striped hover>
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Cargo</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {empresaContactos.map((ec: any) => {
                  const empresa = ec.empresa || (ec.attributes?.empresa?.data || ec.attributes?.empresa)
                  const empresaNombre = empresa?.empresa_nombre || empresa?.nombre || 'Sin nombre'
                  const empresaId = empresa?.documentId || empresa?.id
                  const cargo = ec.cargo || ec.attributes?.cargo || '-'
                  
                  return (
                    <tr key={ec.id || ec.documentId}>
                      <td>
                        {empresaId ? (
                          <Link 
                            href={`/crm/empresas/${empresaId}`}
                            className="text-decoration-none"
                          >
                            <strong>{empresaNombre}</strong>
                          </Link>
                        ) : (
                          <strong>{empresaNombre}</strong>
                        )}
                      </td>
                      <td>{cargo}</td>
                      <td>
                        {empresaId && (
                          <Link 
                            href={`/crm/empresas/${empresaId}`}
                            className="btn btn-sm btn-outline-primary"
                          >
                            Ver Empresa
                          </Link>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </Table>
          </div>
        )}
        
        {/* Sección de Colegios */}
        {trayectoriasActivas.length > 0 && (
          <div className="mb-4">
            <h6 className="text-muted mb-3">
              <LuGraduationCap className="me-2" />
              Trayectorias Activas en Colegios
            </h6>
            <Table responsive striped hover>
              <thead>
                <tr>
                  <th>Colegio</th>
                  <th>Cargo</th>
                  <th>Curso</th>
                  <th>Asignatura</th>
                  <th>Año</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {trayectoriasActivas.map((trayectoria) => (
                  <tr key={trayectoria.id}>
                    <td>
                      <Link 
                        href={`/crm/colegios/${trayectoria.colegio.documentId || trayectoria.colegio.id}`}
                        className="text-decoration-none"
                      >
                        <strong>{trayectoria.colegio.nombre}</strong>
                      </Link>
                      {trayectoria.colegio.dependencia && (
                        <div>
                          <Badge bg="info-subtle" text="info" className="mt-1">
                            {trayectoria.colegio.dependencia}
                          </Badge>
                        </div>
                      )}
                    </td>
                    <td>{trayectoria.cargo || '-'}</td>
                    <td>{trayectoria.curso.nombre || '-'}</td>
                    <td>{trayectoria.asignatura.nombre || '-'}</td>
                    <td>{trayectoria.anio || '-'}</td>
                    <td>
                      <Badge bg="success-subtle" text="success">Activo</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}

        {trayectoriasHistoricas.length > 0 && (
          <div>
            <h6 className="text-muted mb-3">
              <LuGraduationCap className="me-2" />
              Historial de Trayectorias en Colegios
            </h6>
            <Table responsive striped hover>
              <thead>
                <tr>
                  <th>Colegio</th>
                  <th>Cargo</th>
                  <th>Curso</th>
                  <th>Asignatura</th>
                  <th>Período</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {trayectoriasHistoricas.map((trayectoria) => (
                  <tr key={trayectoria.id}>
                    <td>
                      <Link 
                        href={`/crm/colegios/${trayectoria.colegio.documentId || trayectoria.colegio.id}`}
                        className="text-decoration-none"
                      >
                        {trayectoria.colegio.nombre}
                      </Link>
                    </td>
                    <td>{trayectoria.cargo || '-'}</td>
                    <td>{trayectoria.curso.nombre || '-'}</td>
                    <td>{trayectoria.asignatura.nombre || '-'}</td>
                    <td>
                      {trayectoria.fecha_inicio && trayectoria.fecha_fin ? (
                        <>
                          {format(new Date(trayectoria.fecha_inicio), 'dd/MM/yyyy', { locale: es })} -{' '}
                          {format(new Date(trayectoria.fecha_fin), 'dd/MM/yyyy', { locale: es })}
                        </>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>
                      <Badge bg="secondary-subtle" text="secondary">Inactivo</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}

        {/* Mensaje cuando no hay relaciones */}
        {empresaContactos.length === 0 && trayectoriasActivas.length === 0 && trayectoriasHistoricas.length === 0 && (
          <Alert variant="info">
            <LuUsers className="me-2" />
            Este contacto no tiene relaciones laborales registradas (empresas o colegios).
          </Alert>
        )}
      </div>
    )
  }

  const renderEquiposTab = () => {
    if (!contact) return null

    return (
      <div>
        <h5 className="mb-3">Equipos de Trabajo</h5>
        
        {contact.equipos && contact.equipos.length > 0 ? (
          <Row>
            {contact.equipos.map((equipo) => (
              <Col md={6} key={equipo.id} className="mb-3">
                <Card>
                  <CardBody>
                    <div className="d-flex align-items-start justify-content-between mb-2">
                      <div>
                        <h6 className="mb-1">{equipo.nombre}</h6>
                        {equipo.descripcion && (
                          <p className="text-muted small mb-2">{equipo.descripcion}</p>
                        )}
                      </div>
                      {equipo.activo ? (
                        <Badge bg="success-subtle" text="success">Activo</Badge>
                      ) : (
                        <Badge bg="secondary-subtle" text="secondary">Inactivo</Badge>
                      )}
                    </div>
                    <div className="text-muted small">
                      {equipo.colegio && (
                        <div className="mb-1">
                          <LuBuilding2 size={14} className="me-1" />
                          <Link 
                            href={`/crm/colegios/${equipo.colegio.documentId || equipo.colegio.id}`}
                            className="text-decoration-none"
                          >
                            {equipo.colegio.nombre}
                          </Link>
                        </div>
                      )}
                      {equipo.lider && (
                        <div className="mb-1">
                          <LuUser size={14} className="me-1" />
                          <strong>Líder:</strong> {equipo.lider.nombre}
                        </div>
                      )}
                    </div>
                  </CardBody>
                </Card>
              </Col>
            ))}
          </Row>
        ) : (
          <Alert variant="info">Este contacto no pertenece a ningún equipo de trabajo.</Alert>
        )}
      </div>
    )
  }

  const renderColegioTab = () => {
    if (!contact) return null

    return (
      <div>
        <h5 className="mb-3">Colegios Asociados</h5>
        
        {contact.colegios.length > 0 ? (
          <Row>
            {contact.colegios.map((colegio) => (
              <Col md={6} key={colegio.id} className="mb-3">
                <Card>
                  <CardBody>
                    <div className="d-flex align-items-start justify-content-between mb-2">
                      <Link 
                        href={`/crm/colegios/${colegio.documentId || colegio.id}`}
                        className="text-decoration-none"
                      >
                        <h6 className="mb-1">{colegio.nombre}</h6>
                      </Link>
                    </div>
                    <div className="text-muted small">
                      {colegio.rbd && (
                        <div className="mb-1">
                          <strong>RBD:</strong> {colegio.rbd}
                        </div>
                      )}
                      {colegio.dependencia && (
                        <div className="mb-1">
                          <Badge bg="info-subtle" text="info">{colegio.dependencia}</Badge>
                        </div>
                      )}
                      {(colegio.region || colegio.comuna) && (
                        <div className="mb-1">
                          <LuMapPin size={14} className="me-1" />
                          {colegio.comuna && `${colegio.comuna}`}
                          {colegio.comuna && colegio.region && ', '}
                          {colegio.region && colegio.region}
                        </div>
                      )}
                    </div>
                  </CardBody>
                </Card>
              </Col>
            ))}
          </Row>
        ) : (
          <Alert variant="info">No hay colegios asociados a este contacto.</Alert>
        )}
      </div>
    )
  }

  const renderHistorialTab = () => {
    if (!contact) return null

    const actividadesOrdenadas = [...contact.actividades].sort((a, b) => {
      const fechaA = a.fecha ? new Date(a.fecha).getTime() : 0
      const fechaB = b.fecha ? new Date(b.fecha).getTime() : 0
      return fechaB - fechaA
    })

    return (
      <div>
        <h5 className="mb-3">Historial de Actividades</h5>
        
        {actividadesOrdenadas.length > 0 ? (
          <div className="timeline">
            {actividadesOrdenadas.map((actividad, index) => (
              <div key={actividad.id} className="d-flex mb-4">
                <div className="flex-shrink-0 me-3">
                  <div className="avatar-sm rounded-circle bg-primary-subtle d-flex align-items-center justify-content-center">
                    <LuFileText size={18} className="text-primary" />
                  </div>
                  {index < actividadesOrdenadas.length - 1 && (
                    <div className="border-start border-2 border-primary-subtle ms-2" style={{ height: '60px' }} />
                  )}
                </div>
                <div className="flex-grow-1">
                  <div className="d-flex align-items-start justify-content-between mb-1">
                    <div>
                      <h6 className="mb-1">{actividad.titulo}</h6>
                      {actividad.descripcion && (
                        <p className="text-muted small mb-2">{actividad.descripcion}</p>
                      )}
                    </div>
                    <div className="d-flex gap-2">
                      {getTipoActividadBadge(actividad.tipo)}
                      {getEstadoActividadBadge(actividad.estado)}
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-3 text-muted small">
                    {actividad.fecha && (
                      <span>
                        <LuCalendar size={14} className="me-1" />
                        {format(new Date(actividad.fecha), 'dd/MM/yyyy HH:mm', { locale: es })}
                      </span>
                    )}
                    {actividad.creado_por && (
                      <span>
                        <LuUser size={14} className="me-1" />
                        {actividad.creado_por.nombre}
                      </span>
                    )}
                  </div>
                  {actividad.notas && (
                    <div className="mt-2 p-2 bg-light rounded">
                      <small className="text-muted">{actividad.notas}</small>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Alert variant="info">No hay actividades registradas para este contacto.</Alert>
        )}
      </div>
    )
  }

  const renderLogsTab = () => {
    if (!contact) return null

    // Filtrar solo actividades creadas por administradores (actividades con creado_por)
    const actividadesAdmin = contact.actividades.filter(a => a.creado_por)

    const actividadesOrdenadas = [...actividadesAdmin].sort((a, b) => {
      const fechaA = a.fecha ? new Date(a.fecha).getTime() : 0
      const fechaB = b.fecha ? new Date(b.fecha).getTime() : 0
      return fechaB - fechaA
    })

    return (
      <div>
        <h5 className="mb-3">Logs de Acciones Administrativas</h5>
        <p className="text-muted small mb-3">
          Registro de todas las acciones realizadas por administradores sobre este contacto.
        </p>
        
        {actividadesOrdenadas.length > 0 ? (
          <Table responsive striped hover>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Acción</th>
                <th>Tipo</th>
                <th>Estado</th>
                <th>Administrador</th>
                <th>Descripción</th>
              </tr>
            </thead>
            <tbody>
              {actividadesOrdenadas.map((actividad) => (
                <tr key={actividad.id}>
                  <td>
                    {actividad.fecha ? (
                      format(new Date(actividad.fecha), 'dd/MM/yyyy HH:mm', { locale: es })
                    ) : (
                      '-'
                    )}
                  </td>
                  <td>
                    <strong>{actividad.titulo}</strong>
                  </td>
                  <td>{getTipoActividadBadge(actividad.tipo)}</td>
                  <td>{getEstadoActividadBadge(actividad.estado)}</td>
                  <td>
                    {actividad.creado_por ? (
                      <div>
                        <div>{actividad.creado_por.nombre}</div>
                        {actividad.creado_por.email && (
                          <small className="text-muted">{actividad.creado_por.email}</small>
                        )}
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td>
                    {actividad.descripcion ? (
                      <small className="text-muted">{actividad.descripcion}</small>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <Alert variant="info">No hay logs de acciones administrativas registradas.</Alert>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Detalle de Contacto" subtitle="CRM" />
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2 text-muted">Cargando contacto...</p>
        </div>
      </Container>
    )
  }

  if (error || !contact) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Detalle de Contacto" subtitle="CRM" />
        <Alert variant="danger">
          <strong>Error:</strong> {error || 'Contacto no encontrado'}
        </Alert>
        <Link href="/crm/contacts" className="btn btn-primary">
          <LuArrowLeft className="me-1" />
          Volver a Contactos
        </Link>
      </Container>
    )
  }

  const avatarUrl = typeof contact.imagen === 'string' 
    ? contact.imagen 
    : contact.imagen?.media?.data?.attributes?.url || contact.imagen?.url

  const emailPrincipal = contact.emails.find(e => e.principal) || contact.emails[0]
  const telefonoPrincipal = contact.telefonos.find(t => t.principal) || contact.telefonos[0]

  return (
    <Container fluid>
      <PageBreadcrumb title="Detalle de Contacto" subtitle="CRM" />
      
      <div className="mb-3 d-flex justify-content-between align-items-center">
        <Link href="/crm/contacts" className="btn btn-outline-secondary btn-sm">
          <LuArrowLeft className="me-1" />
          Volver a Contactos
        </Link>
        {contact && (
          <Button 
            variant="primary" 
            size="sm"
            onClick={() => setEditModal(true)}
          >
            <LuPencil className="me-1" />
            Editar Contacto
          </Button>
        )}
      </div>

      {/* Información Principal del Contacto */}
      <Card className="mb-4">
        <CardBody>
          <Row>
            <Col md="auto">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={contact.nombre_completo}
                  className="rounded-circle"
                  width={80}
                  height={80}
                />
              ) : (
                <div className="avatar-lg rounded-circle bg-secondary-subtle d-flex align-items-center justify-content-center">
                  <span className="avatar-title text-secondary fw-semibold fs-24">
                    {generateInitials(contact.nombre_completo)}
                  </span>
                </div>
              )}
            </Col>
            <Col>
              <div className="d-flex align-items-start justify-content-between mb-2">
                <div>
                  <h4 className="mb-1">{contact.nombre_completo}</h4>
                  {contact.rut && (
                    <p className="text-muted mb-2">RUT: {contact.rut}</p>
                  )}
                  <div className="d-flex gap-2 mb-2">
                    {getConfidenceBadge(contact.nivel_confianza)}
                    {getOrigenBadge(contact.origen)}
                    {contact.activo ? (
                      <Badge bg="success-subtle" text="success">Activo</Badge>
                    ) : (
                      <Badge bg="danger-subtle" text="danger">Inactivo</Badge>
                    )}
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </CardBody>
      </Card>

      {/* Información Completa del Contacto */}
      <Row className="mb-4">
        <Col md={6}>
          <Card>
            <CardHeader>
              <h5 className="mb-0">Información Personal</h5>
            </CardHeader>
            <CardBody>
              <Table borderless className="mb-0">
                <tbody>
                  <tr>
                    <td className="text-muted" style={{ width: '40%' }}><strong>Nombre Completo:</strong></td>
                    <td>{contact.nombre_completo}</td>
                  </tr>
                  {contact.nombres && (
                    <tr>
                      <td className="text-muted"><strong>Nombres:</strong></td>
                      <td>{contact.nombres}</td>
                    </tr>
                  )}
                  {contact.primer_apellido && (
                    <tr>
                      <td className="text-muted"><strong>Primer Apellido:</strong></td>
                      <td>{contact.primer_apellido}</td>
                    </tr>
                  )}
                  {contact.segundo_apellido && (
                    <tr>
                      <td className="text-muted"><strong>Segundo Apellido:</strong></td>
                      <td>{contact.segundo_apellido}</td>
                    </tr>
                  )}
                  {contact.rut && (
                    <tr>
                      <td className="text-muted"><strong>RUT:</strong></td>
                      <td>{contact.rut}</td>
                    </tr>
                  )}
                  <tr>
                    <td className="text-muted"><strong>Nivel de Confianza:</strong></td>
                    <td>{getConfidenceBadge(contact.nivel_confianza)}</td>
                  </tr>
                  <tr>
                    <td className="text-muted"><strong>Origen:</strong></td>
                    <td>{getOrigenBadge(contact.origen)}</td>
                  </tr>
                  <tr>
                    <td className="text-muted"><strong>Estado:</strong></td>
                    <td>
                      {contact.activo ? (
                        <Badge bg="success-subtle" text="success">Activo</Badge>
                      ) : (
                        <Badge bg="danger-subtle" text="danger">Inactivo</Badge>
                      )}
                    </td>
                  </tr>
                  {contact.createdAt && (
                    <tr>
                      <td className="text-muted"><strong>Fecha de Creación:</strong></td>
                      <td>{format(new Date(contact.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}</td>
                    </tr>
                  )}
                  {contact.updatedAt && (
                    <tr>
                      <td className="text-muted"><strong>Última Actualización:</strong></td>
                      <td>{format(new Date(contact.updatedAt), 'dd/MM/yyyy HH:mm', { locale: es })}</td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </CardBody>
          </Card>
        </Col>
        <Col md={6}>
          <Card>
            <CardHeader>
              <h5 className="mb-0">Información de Contacto</h5>
            </CardHeader>
            <CardBody>
              {contact.emails && contact.emails.length > 0 ? (
                <div className="mb-3">
                  <h6 className="mb-2">
                    <LuMail className="me-1" />
                    Emails ({contact.emails.length})
                  </h6>
                  <ul className="list-unstyled mb-0">
                    {contact.emails.map((email, idx) => (
                      <li key={idx} className="mb-2">
                        <a href={`mailto:${email.email}`} className="text-decoration-none">
                          {email.email}
                        </a>
                        {email.principal && (
                          <Badge bg="primary-subtle" text="primary" className="ms-2">Principal</Badge>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="mb-3">
                  <h6 className="mb-2">
                    <LuMail className="me-1" />
                    Emails
                  </h6>
                  <p className="text-muted">No hay emails registrados</p>
                </div>
              )}

              {contact.telefonos && contact.telefonos.length > 0 ? (
                <div>
                  <h6 className="mb-2">
                    <LuPhone className="me-1" />
                    Teléfonos ({contact.telefonos.length})
                  </h6>
                  <ul className="list-unstyled mb-0">
                    {contact.telefonos.map((telefono, idx) => (
                      <li key={idx} className="mb-2">
                        <a href={`tel:${telefono.telefono_norm || telefono.telefono_raw}`} className="text-decoration-none">
                          {telefono.telefono_norm || telefono.telefono_raw}
                        </a>
                        {telefono.principal && (
                          <Badge bg="primary-subtle" text="primary" className="ms-2">Principal</Badge>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div>
                  <h6 className="mb-2">
                    <LuPhone className="me-1" />
                    Teléfonos
                  </h6>
                  <p className="text-muted">No hay teléfonos registrados</p>
                </div>
              )}

              {contact.tags && contact.tags.length > 0 && (
                <div className="mt-3">
                  <h6 className="mb-2">Tags</h6>
                  <div>
                    {contact.tags.map((tag, idx) => (
                      <Badge key={idx} bg="secondary-subtle" text="secondary" className="me-1 mb-1">
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Resumen de Relaciones */}
      <Row className="mb-4">
        <Col md={4}>
          <Card className="text-center">
            <CardBody>
              <h3 className="mb-1">{contact.trayectorias.length}</h3>
              <p className="text-muted mb-0">Trayectorias</p>
            </CardBody>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="text-center">
            <CardBody>
              <h3 className="mb-1">{contact.equipos?.length || 0}</h3>
              <p className="text-muted mb-0">Equipos</p>
            </CardBody>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="text-center">
            <CardBody>
              <h3 className="mb-1">{contact.colegios.length}</h3>
              <p className="text-muted mb-0">Colegios</p>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Card>
        <CardHeader>
          <Nav variant="tabs" className="card-header-tabs">
            <NavItem>
              <NavLink 
                active={activeTab === 'equipo'} 
                onClick={() => setActiveTab('equipo')}
                style={{ cursor: 'pointer' }}
              >
                <LuUsers className="me-1" />
                Trayectorias
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink 
                active={activeTab === 'equipos'} 
                onClick={() => setActiveTab('equipos')}
                style={{ cursor: 'pointer' }}
              >
                <LuUsers className="me-1" />
                Equipos
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink 
                active={activeTab === 'colegio'} 
                onClick={() => setActiveTab('colegio')}
                style={{ cursor: 'pointer' }}
              >
                <LuBuilding2 className="me-1" />
                Colegios
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink 
                active={activeTab === 'historial'} 
                onClick={() => setActiveTab('historial')}
                style={{ cursor: 'pointer' }}
              >
                <LuHistory className="me-1" />
                Historial
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink 
                active={activeTab === 'logs'} 
                onClick={() => setActiveTab('logs')}
                style={{ cursor: 'pointer' }}
              >
                <LuFileText className="me-1" />
                Logs Administrativos
              </NavLink>
            </NavItem>
          </Nav>
        </CardHeader>
        <CardBody>
          {activeTab === 'equipo' && renderEquipoTab()}
          {activeTab === 'equipos' && renderEquiposTab()}
          {activeTab === 'colegio' && renderColegioTab()}
          {activeTab === 'historial' && renderHistorialTab()}
          {activeTab === 'logs' && renderLogsTab()}
        </CardBody>
      </Card>

      {contact && (
        <>
          {contactType === 'colegio' ? (
            <EditContactColegioModal
              show={editModal}
              onHide={() => setEditModal(false)}
              contact={contact as unknown as ContactType}
              onSuccess={() => {
                const fetchContact = async () => {
                  try {
                    const response = await fetch(`/api/crm/contacts/${contactId}`)
                    const result = await response.json()
                    if (result.success) {
                      setContact(result.data)
                    }
                  } catch (err) {
                    console.error('Error al recargar contacto:', err)
                  }
                }
                fetchContact()
              }}
            />
          ) : contactType === 'empresa' ? (
            <EditContactEmpresaModal
              show={editModal}
              onHide={() => setEditModal(false)}
              contact={contact as unknown as ContactType}
              onSuccess={() => {
                const fetchContact = async () => {
                  try {
                    const response = await fetch(`/api/crm/contacts/${contactId}`)
                    const result = await response.json()
                    if (result.success) {
                      setContact(result.data)
                    }
                  } catch (err) {
                    console.error('Error al recargar contacto:', err)
                  }
                }
                fetchContact()
              }}
            />
          ) : (
            <EditContactModal
              show={editModal}
              onHide={() => setEditModal(false)}
              contact={contact as unknown as ContactType}
              onSuccess={() => {
                const fetchContact = async () => {
                  try {
                    const response = await fetch(`/api/crm/contacts/${contactId}`)
                    const result = await response.json()
                    if (result.success) {
                      setContact(result.data)
                    }
                  } catch (err) {
                    console.error('Error al recargar contacto:', err)
                  }
                }
                fetchContact()
              }}
            />
          )}
        </>
      )}
    </Container>
  )
}

export default ContactDetailPage
