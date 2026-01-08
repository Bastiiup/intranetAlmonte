'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Container, Card, CardHeader, CardBody, Alert, Spinner, Row, Col, Button, Badge, Nav, NavItem, NavLink, Table } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { LuMapPin, LuPhone, LuMail, LuGlobe, LuUsers, LuPencil, LuArrowLeft, LuShoppingCart, LuTrendingUp, LuActivity, LuPackage, LuGraduationCap } from 'react-icons/lu'
import Link from 'next/link'

interface ColegioData {
  id: string
  documentId?: string
  colegio_nombre: string
  rbd?: string | number
  dependencia?: string
  estado?: string
  region?: string
  comuna?: {
    comuna_nombre?: string
    region_nombre?: string
  }
  telefonos?: Array<{ telefono_raw?: string; telefono_norm?: string; tipo?: string; principal?: boolean }>
  emails?: Array<{ email?: string; tipo?: string; principal?: boolean }>
  website?: string
  direcciones?: Array<{
    nombre_calle?: string
    numero_calle?: string
    complemento_direccion?: string
    tipo_direccion?: string
  }>
  cartera_asignaciones?: Array<{
    ejecutivo?: {
      nombre_completo?: string
    }
    rol?: string
    estado?: string
  }>
}

interface ContactoData {
  id: string
  documentId?: string
  nombre_completo?: string
  rut?: string
  emails?: Array<{ email?: string; principal?: boolean }>
  telefonos?: Array<{ telefono_norm?: string; telefono_raw?: string; principal?: boolean }>
  trayectorias?: Array<{
    cargo?: string
    is_current?: boolean
  }>
}

interface PedidoData {
  id: string
  documentId?: string
  numero_pedido?: string
  fecha_pedido?: string
  estado?: string
  total?: number
  subtotal?: number
  cliente?: {
    nombre?: string
    correo_electronico?: string
  }
  items?: Array<{
    name?: string
    quantity?: number
    total?: number
    sku?: string
  }>
}

interface LeadData {
  id: string
  documentId?: string
  nombre?: string
  email?: string
  telefono?: string
  estado?: string
  monto_estimado?: number
  fecha_creacion?: string
}

interface ActivityData {
  id: string
  documentId?: string
  tipo_actividad?: string
  titulo?: string
  descripcion?: string
  fecha_actividad?: string
  creado_por?: {
    nombre_completo?: string
  }
}

type TabType = 'informacion' | 'contactos' | 'pedidos' | 'leads' | 'actividades' | 'materiales'

export default function ColegioDetailPage() {
  const params = useParams()
  const router = useRouter()
  const colegioId = params?.id as string

  const [activeTab, setActiveTab] = useState<TabType>('informacion')
  const [loading, setLoading] = useState(true)
  const [loadingContacts, setLoadingContacts] = useState(true)
  const [loadingPedidos, setLoadingPedidos] = useState(true)
  const [loadingLeads, setLoadingLeads] = useState(true)
  const [loadingActivities, setLoadingActivities] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [colegio, setColegio] = useState<ColegioData | null>(null)
  const [contactos, setContactos] = useState<ContactoData[]>([])
  const [pedidos, setPedidos] = useState<PedidoData[]>([])
  const [leads, setLeads] = useState<LeadData[]>([])
  const [activities, setActivities] = useState<ActivityData[]>([])

  useEffect(() => {
    const fetchColegio = async () => {
      if (!colegioId) return

      setLoading(true)
      setError(null)

      try {
        console.log('[ColegioDetailPage] Buscando colegio con ID:', colegioId)
        const response = await fetch(`/api/crm/colegios/${colegioId}`)
        const result = await response.json()

        console.log('[ColegioDetailPage] Respuesta de la API:', {
          ok: response.ok,
          success: result.success,
          hasData: !!result.data,
          error: result.error
        })

        if (!response.ok || !result.success) {
          console.error('[ColegioDetailPage] Error al obtener colegio:', result)
          throw new Error(result.error || 'Error al cargar el colegio')
        }

        const colegioData = result.data
        const attrs = colegioData.attributes || colegioData

        const colegioTransformed: ColegioData = {
          id: colegioId,
          documentId: colegioData.documentId || colegioData.id,
          colegio_nombre: attrs.colegio_nombre || 'Sin nombre',
          rbd: attrs.rbd,
          dependencia: attrs.dependencia,
          estado: attrs.estado,
          region: attrs.region || attrs.comuna?.region_nombre,
          comuna: attrs.comuna?.data?.attributes || attrs.comuna?.attributes || attrs.comuna,
          telefonos: attrs.telefonos || [],
          emails: attrs.emails || [],
          website: attrs.website,
          direcciones: attrs.direcciones || [],
          cartera_asignaciones: attrs.cartera_asignaciones || [],
        }

        setColegio(colegioTransformed)
      } catch (err: any) {
        console.error('Error al cargar colegio:', err)
        setError(err.message || 'Error al cargar el colegio')
      } finally {
        setLoading(false)
      }
    }

    fetchColegio()
  }, [colegioId])

  useEffect(() => {
    const fetchContactos = async () => {
      if (!colegioId) return
      setLoadingContacts(true)
      try {
        const response = await fetch(`/api/crm/colegios/${colegioId}/contacts`)
        const result = await response.json()
        if (response.ok && result.success) {
          const contactosData = Array.isArray(result.data) ? result.data : [result.data]
          const contactosTransformed: ContactoData[] = contactosData.map((contacto: any) => {
            const attrs = contacto.attributes || contacto
            return {
              id: contacto.documentId || contacto.id,
              documentId: contacto.documentId,
              nombre_completo: attrs.nombre_completo,
              rut: attrs.rut,
              emails: attrs.emails || [],
              telefonos: attrs.telefonos || [],
              trayectorias: attrs.trayectorias || [],
            }
          })
          setContactos(contactosTransformed)
        }
      } catch (err: any) {
        console.error('Error al cargar contactos:', err)
      } finally {
        setLoadingContacts(false)
      }
    }
    if (colegioId) fetchContactos()
  }, [colegioId])

  useEffect(() => {
    const fetchPedidos = async () => {
      if (!colegioId) return
      setLoadingPedidos(true)
      try {
        const response = await fetch(`/api/crm/colegios/${colegioId}/pedidos`)
        const result = await response.json()
        if (response.ok && result.success) {
          const pedidosData = Array.isArray(result.data) ? result.data : [result.data]
          const pedidosTransformed: PedidoData[] = pedidosData.map((pedido: any) => {
            const attrs = pedido.attributes || pedido
            return {
              id: pedido.documentId || pedido.id,
              documentId: pedido.documentId,
              numero_pedido: attrs.numero_pedido,
              fecha_pedido: attrs.fecha_pedido,
              estado: attrs.estado,
              total: attrs.total,
              subtotal: attrs.subtotal,
              cliente: attrs.cliente?.data?.attributes || attrs.cliente?.attributes || attrs.cliente,
              items: attrs.items || [],
            }
          })
          setPedidos(pedidosTransformed)
        }
      } catch (err: any) {
        console.error('Error al cargar pedidos:', err)
      } finally {
        setLoadingPedidos(false)
      }
    }
    if (colegioId && activeTab === 'pedidos') fetchPedidos()
  }, [colegioId, activeTab])

  useEffect(() => {
    const fetchLeads = async () => {
      if (!colegioId) return
      setLoadingLeads(true)
      try {
        const response = await fetch(`/api/crm/colegios/${colegioId}/leads`)
        const result = await response.json()
        if (response.ok && result.success) {
          const leadsData = Array.isArray(result.data) ? result.data : [result.data]
          const leadsTransformed: LeadData[] = leadsData.map((lead: any) => {
            const attrs = lead.attributes || lead
            return {
              id: lead.documentId || lead.id,
              documentId: lead.documentId,
              nombre: attrs.nombre,
              email: attrs.email,
              telefono: attrs.telefono,
              estado: attrs.estado,
              monto_estimado: attrs.monto_estimado,
              fecha_creacion: attrs.fecha_creacion,
            }
          })
          setLeads(leadsTransformed)
        }
      } catch (err: any) {
        console.error('Error al cargar leads:', err)
      } finally {
        setLoadingLeads(false)
      }
    }
    if (colegioId && activeTab === 'leads') fetchLeads()
  }, [colegioId, activeTab])

  useEffect(() => {
    const fetchActivities = async () => {
      if (!colegioId) return
      setLoadingActivities(true)
      try {
        const response = await fetch(`/api/crm/colegios/${colegioId}/activities`)
        const result = await response.json()
        if (response.ok && result.success) {
          const activitiesData = Array.isArray(result.data) ? result.data : [result.data]
          const activitiesTransformed: ActivityData[] = activitiesData.map((activity: any) => {
            const attrs = activity.attributes || activity
            return {
              id: activity.documentId || activity.id,
              documentId: activity.documentId,
              tipo_actividad: attrs.tipo_actividad,
              titulo: attrs.titulo,
              descripcion: attrs.descripcion,
              fecha_actividad: attrs.fecha_actividad,
              creado_por: attrs.creado_por?.data?.attributes || attrs.creado_por?.attributes || attrs.creado_por,
            }
          })
          setActivities(activitiesTransformed)
        }
      } catch (err: any) {
        console.error('Error al cargar actividades:', err)
      } finally {
        setLoadingActivities(false)
      }
    }
    if (colegioId && activeTab === 'actividades') fetchActivities()
  }, [colegioId, activeTab])

  // Calcular materiales más pedidos
  const materialesMasPedidos = useMemo(() => {
    const materialesMap = new Map<string, { nombre: string; cantidad: number; total: number; sku?: string }>()
    
    pedidos.forEach((pedido) => {
      pedido.items?.forEach((item) => {
        const nombre = item.name || 'Sin nombre'
        const cantidad = item.quantity || 0
        const total = item.total || 0
        
        if (materialesMap.has(nombre)) {
          const existente = materialesMap.get(nombre)!
          materialesMap.set(nombre, {
            nombre,
            cantidad: existente.cantidad + cantidad,
            total: existente.total + total,
            sku: item.sku || existente.sku,
          })
        } else {
          materialesMap.set(nombre, { nombre, cantidad, total, sku: item.sku })
        }
      })
    })
    
    return Array.from(materialesMap.values())
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 10) // Top 10
  }, [pedidos])

  // Agrupar contactos por cargo/curso
  const contactosPorCargo = useMemo(() => {
    const grupos = new Map<string, ContactoData[]>()
    
    contactos.forEach((contacto) => {
      const trayectoriaActual = contacto.trayectorias?.find((t) => t.is_current) || contacto.trayectorias?.[0]
      const cargo = trayectoriaActual?.cargo || 'Sin cargo'
      
      if (!grupos.has(cargo)) {
        grupos.set(cargo, [])
      }
      grupos.get(cargo)!.push(contacto)
    })
    
    return Array.from(grupos.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [contactos])

  if (loading) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Detalles del Colegio" subtitle="CRM" />
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2 text-muted">Cargando información del colegio...</p>
        </div>
      </Container>
    )
  }

  if (error || !colegio) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Detalles del Colegio" subtitle="CRM" />
        <Alert variant="danger">
          <strong>Error:</strong> {error || 'Colegio no encontrado'}
          <div className="mt-3">
            <Link href="/crm/colegios" className="text-decoration-none">
              <Button variant="outline-primary" size="sm">
                <LuArrowLeft className="me-1" /> Volver a la lista
              </Button>
            </Link>
          </div>
        </Alert>
      </Container>
    )
  }

  const asignacionComercial = colegio.cartera_asignaciones?.find(
    (ca) => ca.rol === 'comercial' && ca.estado === 'activa'
  )
  const representante = asignacionComercial?.ejecutivo?.nombre_completo
  const direccionPrincipal = colegio.direcciones?.find(
    (d) => d.tipo_direccion === 'Principal' || d.tipo_direccion === 'Colegio'
  ) || colegio.direcciones?.[0]

  // Contenido de cada tab
  const renderInformacionTab = () => (
    <Row>
      <Col xl={8}>
        <Card>
          <CardHeader>
            <h4 className="mb-0">Información del Colegio</h4>
          </CardHeader>
          <CardBody>
            <Row>
              <Col md={6}>
                <div className="mb-3">
                  <label className="text-muted small">Nombre</label>
                  <h5 className="mb-0">{colegio.colegio_nombre}</h5>
                </div>
              </Col>
              {colegio.rbd && (
                <Col md={6}>
                  <div className="mb-3">
                    <label className="text-muted small">RBD</label>
                    <p className="mb-0">{colegio.rbd}</p>
                  </div>
                </Col>
              )}
              {colegio.dependencia && (
                <Col md={6}>
                  <div className="mb-3">
                    <label className="text-muted small">Dependencia</label>
                    <p className="mb-0">
                      <Badge bg="info">{colegio.dependencia}</Badge>
                    </p>
                  </div>
                </Col>
              )}
              {colegio.estado && (
                <Col md={6}>
                  <div className="mb-3">
                    <label className="text-muted small">Estado</label>
                    <p className="mb-0">
                      <Badge bg={colegio.estado === 'Aprobado' ? 'success' : colegio.estado === 'Verificado' ? 'warning' : 'secondary'}>
                        {colegio.estado}
                      </Badge>
                    </p>
                  </div>
                </Col>
              )}
            </Row>

            {(direccionPrincipal || colegio.comuna) && (
              <div className="mb-3">
                <label className="text-muted small d-flex align-items-center">
                  <LuMapPin className="me-1" size={14} />
                  Dirección
                </label>
                <p className="mb-0">
                  {direccionPrincipal && (
                    <>
                      {direccionPrincipal.nombre_calle} {direccionPrincipal.numero_calle}
                      {direccionPrincipal.complemento_direccion && `, ${direccionPrincipal.complemento_direccion}`}
                      {colegio.comuna?.comuna_nombre && (
                        <span className="text-muted">, {colegio.comuna.comuna_nombre}</span>
                      )}
                    </>
                  )}
                  {!direccionPrincipal && colegio.comuna?.comuna_nombre && (
                    <span>{colegio.comuna.comuna_nombre}</span>
                  )}
                  {colegio.region && (
                    <span className="text-muted">, {colegio.region}</span>
                  )}
                </p>
              </div>
            )}

            {colegio.telefonos && colegio.telefonos.length > 0 && (
              <div className="mb-3">
                <label className="text-muted small d-flex align-items-center">
                  <LuPhone className="me-1" size={14} />
                  Teléfonos
                </label>
                <div>
                  {colegio.telefonos.map((tel, idx) => (
                    <p key={idx} className="mb-1">
                      {tel.telefono_raw || tel.telefono_norm}
                      {tel.principal && <Badge bg="primary" className="ms-2">Principal</Badge>}
                      {tel.tipo && <span className="text-muted ms-2">({tel.tipo})</span>}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {colegio.emails && colegio.emails.length > 0 && (
              <div className="mb-3">
                <label className="text-muted small d-flex align-items-center">
                  <LuMail className="me-1" size={14} />
                  Emails
                </label>
                <div>
                  {colegio.emails.map((email, idx) => (
                    <p key={idx} className="mb-1">
                      <a href={`mailto:${email.email}`} className="text-decoration-none">
                        {email.email}
                      </a>
                      {email.principal && <Badge bg="primary" className="ms-2">Principal</Badge>}
                      {email.tipo && <span className="text-muted ms-2">({email.tipo})</span>}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {colegio.website && (
              <div className="mb-3">
                <label className="text-muted small d-flex align-items-center">
                  <LuGlobe className="me-1" size={14} />
                  Sitio Web
                </label>
                <p className="mb-0">
                  <a href={colegio.website} target="_blank" rel="noopener noreferrer" className="text-decoration-none">
                    {colegio.website}
                  </a>
                </p>
              </div>
            )}

            {representante && (
              <div className="mb-3">
                <label className="text-muted small">Representante Comercial</label>
                <p className="mb-0">{representante}</p>
              </div>
            )}
          </CardBody>
        </Card>
      </Col>
    </Row>
  )

  const renderContactosTab = () => (
    <Card>
      <CardHeader>
        <h4 className="mb-0 d-flex align-items-center">
          <LuUsers className="me-2" />
          Contactos del Colegio
          <Badge bg="primary" className="ms-2">{contactos.length}</Badge>
        </h4>
      </CardHeader>
      <CardBody>
        {loadingContacts ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2 text-muted">Cargando contactos...</p>
          </div>
        ) : contactos.length === 0 ? (
          <p className="text-muted text-center py-5">No hay contactos asociados a este colegio</p>
        ) : (
          <div>
            {contactosPorCargo.map(([cargo, contactosGrupo]) => (
              <div key={cargo} className="mb-4">
                <h5 className="d-flex align-items-center mb-3">
                  <LuGraduationCap className="me-2" />
                  {cargo}
                  <Badge bg="secondary" className="ms-2">{contactosGrupo.length}</Badge>
                </h5>
                <div className="row g-3">
                  {contactosGrupo.map((contacto) => {
                    const emailPrincipal = contacto.emails?.find((e) => e.principal) || contacto.emails?.[0]
                    const telefonoPrincipal = contacto.telefonos?.find((t) => t.principal) || contacto.telefonos?.[0]
                    
                    return (
                      <Col md={6} lg={4} key={contacto.id}>
                        <Card className="h-100">
                          <CardBody>
                            <Link 
                              href={`/crm/contacts/${contacto.id}`}
                              className="text-decoration-none fw-semibold d-block mb-2"
                            >
                              {contacto.nombre_completo || 'Sin nombre'}
                            </Link>
                            {emailPrincipal?.email && (
                              <p className="mb-1 small">
                                <LuMail size={12} className="me-1" />
                                <a href={`mailto:${emailPrincipal.email}`} className="text-decoration-none">
                                  {emailPrincipal.email}
                                </a>
                              </p>
                            )}
                            {telefonoPrincipal && (
                              <p className="mb-0 small text-muted">
                                <LuPhone size={12} className="me-1" />
                                {telefonoPrincipal.telefono_norm || telefonoPrincipal.telefono_raw}
                              </p>
                            )}
                          </CardBody>
                        </Card>
                      </Col>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  )

  const renderPedidosTab = () => (
    <Card>
      <CardHeader>
        <h4 className="mb-0 d-flex align-items-center">
          <LuShoppingCart className="me-2" />
          Pedidos de Alumnos
          <Badge bg="primary" className="ms-2">{pedidos.length}</Badge>
        </h4>
      </CardHeader>
      <CardBody>
        {loadingPedidos ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2 text-muted">Cargando pedidos...</p>
          </div>
        ) : pedidos.length === 0 ? (
          <p className="text-muted text-center py-5">No hay pedidos relacionados con este colegio</p>
        ) : (
          <div className="table-responsive">
            <Table hover>
              <thead>
                <tr>
                  <th>N° Pedido</th>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Estado</th>
                  <th>Total</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pedidos.map((pedido) => (
                  <tr key={pedido.id}>
                    <td>{pedido.numero_pedido || pedido.id}</td>
                    <td>{pedido.fecha_pedido ? new Date(pedido.fecha_pedido).toLocaleDateString() : '-'}</td>
                    <td>
                      {pedido.cliente?.nombre || pedido.cliente?.correo_electronico || 'Sin cliente'}
                    </td>
                    <td>
                      <Badge bg={
                        pedido.estado === 'completed' ? 'success' :
                        pedido.estado === 'processing' ? 'warning' :
                        pedido.estado === 'pending' ? 'info' : 'secondary'
                      }>
                        {pedido.estado || 'N/A'}
                      </Badge>
                    </td>
                    <td>${pedido.total?.toLocaleString('es-CL') || '0'}</td>
                    <td>
                      <Link href={`/atributos/pedidos/${pedido.documentId || pedido.id}`}>
                        <Button variant="outline-primary" size="sm">Ver</Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </CardBody>
    </Card>
  )

  const renderLeadsTab = () => (
    <Card>
      <CardHeader>
        <h4 className="mb-0 d-flex align-items-center">
          <LuTrendingUp className="me-2" />
          Leads y Prospectos
          <Badge bg="primary" className="ms-2">{leads.length}</Badge>
        </h4>
      </CardHeader>
      <CardBody>
        {loadingLeads ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2 text-muted">Cargando leads...</p>
          </div>
        ) : leads.length === 0 ? (
          <p className="text-muted text-center py-5">No hay leads relacionados con este colegio</p>
        ) : (
          <div className="table-responsive">
            <Table hover>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Teléfono</th>
                  <th>Estado</th>
                  <th>Monto Estimado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id}>
                    <td>{lead.nombre || 'Sin nombre'}</td>
                    <td>{lead.email || '-'}</td>
                    <td>{lead.telefono || '-'}</td>
                    <td>
                      <Badge bg={
                        lead.estado === 'in-progress' ? 'primary' :
                        lead.estado === 'negotiation' ? 'warning' :
                        lead.estado === 'rejected' ? 'danger' : 'secondary'
                      }>
                        {lead.estado || 'N/A'}
                      </Badge>
                    </td>
                    <td>${lead.monto_estimado?.toLocaleString('es-CL') || '0'}</td>
                    <td>
                      <Link href={`/crm/leads/${lead.documentId || lead.id}`}>
                        <Button variant="outline-primary" size="sm">Ver</Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </CardBody>
    </Card>
  )

  const renderActividadesTab = () => (
    <Card>
      <CardHeader>
        <h4 className="mb-0 d-flex align-items-center">
          <LuActivity className="me-2" />
          Actividades
          <Badge bg="primary" className="ms-2">{activities.length}</Badge>
        </h4>
      </CardHeader>
      <CardBody>
        {loadingActivities ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2 text-muted">Cargando actividades...</p>
          </div>
        ) : activities.length === 0 ? (
          <p className="text-muted text-center py-5">No hay actividades relacionadas con este colegio</p>
        ) : (
          <div className="list-group">
            {activities.map((activity) => (
              <div key={activity.id} className="list-group-item">
                <div className="d-flex justify-content-between align-items-start">
                  <div className="flex-grow-1">
                    <h6 className="mb-1">{activity.titulo || activity.tipo_actividad || 'Sin título'}</h6>
                    {activity.descripcion && (
                      <p className="mb-1 text-muted">{activity.descripcion}</p>
                    )}
                    <small className="text-muted">
                      {activity.fecha_actividad ? new Date(activity.fecha_actividad).toLocaleString('es-CL') : ''}
                      {activity.creado_por?.nombre_completo && ` • Por: ${activity.creado_por.nombre_completo}`}
                    </small>
                  </div>
                  <Badge bg="info">{activity.tipo_actividad || 'Actividad'}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  )

  const renderMaterialesTab = () => (
    <Card>
      <CardHeader>
        <h4 className="mb-0 d-flex align-items-center">
          <LuPackage className="me-2" />
          Materiales Más Pedidos
        </h4>
      </CardHeader>
      <CardBody>
        {materialesMasPedidos.length === 0 ? (
          <p className="text-muted text-center py-5">
            No hay materiales pedidos aún. Los materiales aparecerán aquí cuando se registren pedidos.
          </p>
        ) : (
          <div className="table-responsive">
            <Table hover>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Material</th>
                  <th>SKU</th>
                  <th>Cantidad Total</th>
                  <th>Total Vendido</th>
                </tr>
              </thead>
              <tbody>
                {materialesMasPedidos.map((material, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td className="fw-semibold">{material.nombre}</td>
                    <td>{material.sku || '-'}</td>
                    <td>
                      <Badge bg="primary">{material.cantidad}</Badge>
                    </td>
                    <td>${material.total.toLocaleString('es-CL')}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </CardBody>
    </Card>
  )

  return (
    <Container fluid>
      <PageBreadcrumb 
        title={colegio.colegio_nombre} 
        subtitle="CRM - Colegios"
      />

      <div className="d-flex justify-content-between align-items-center mb-3">
        <Link href="/crm/colegios">
          <Button variant="outline-secondary" size="sm">
            <LuArrowLeft className="me-1" /> Volver a la lista
          </Button>
        </Link>
        <Link href={`/crm/colegios/${colegioId}/editar`}>
          <Button variant="primary" size="sm">
            <LuPencil className="me-1" /> Editar Colegio
          </Button>
        </Link>
      </div>

      <Nav variant="tabs" className="mb-4 border-bottom">
        <NavItem>
          <NavLink
            active={activeTab === 'informacion'}
            onClick={() => setActiveTab('informacion')}
            style={{ cursor: 'pointer' }}
          >
            Información
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink
            active={activeTab === 'contactos'}
            onClick={() => setActiveTab('contactos')}
            style={{ cursor: 'pointer' }}
          >
            <LuUsers className="me-1" size={16} />
            Contactos ({contactos.length})
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink
            active={activeTab === 'pedidos'}
            onClick={() => setActiveTab('pedidos')}
            style={{ cursor: 'pointer' }}
          >
            <LuShoppingCart className="me-1" size={16} />
            Pedidos ({pedidos.length})
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink
            active={activeTab === 'leads'}
            onClick={() => setActiveTab('leads')}
            style={{ cursor: 'pointer' }}
          >
            <LuTrendingUp className="me-1" size={16} />
            Leads ({leads.length})
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink
            active={activeTab === 'actividades'}
            onClick={() => setActiveTab('actividades')}
            style={{ cursor: 'pointer' }}
          >
            <LuActivity className="me-1" size={16} />
            Actividades ({activities.length})
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink
            active={activeTab === 'materiales'}
            onClick={() => setActiveTab('materiales')}
            style={{ cursor: 'pointer' }}
          >
            <LuPackage className="me-1" size={16} />
            Materiales
          </NavLink>
        </NavItem>
      </Nav>

      <div>
        {activeTab === 'informacion' && renderInformacionTab()}
        {activeTab === 'contactos' && renderContactosTab()}
        {activeTab === 'pedidos' && renderPedidosTab()}
        {activeTab === 'leads' && renderLeadsTab()}
        {activeTab === 'actividades' && renderActividadesTab()}
        {activeTab === 'materiales' && renderMaterialesTab()}
      </div>
    </Container>
  )
}
