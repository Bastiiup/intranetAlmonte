'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Container, Card, CardHeader, CardBody, Alert, Spinner, Row, Col, Button, Badge, Nav, NavItem, NavLink, Table, Form, FormGroup, FormLabel, FormControl } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { LuMapPin, LuPhone, LuMail, LuGlobe, LuUsers, LuPencil, LuArrowLeft, LuShoppingCart, LuTrendingUp, LuActivity, LuPackage, LuGraduationCap, LuDownload, LuEye, LuTrash2 } from 'react-icons/lu'
import Link from 'next/link'
import CursoModal from './components/CursoModal'
import { exportarMaterialesAExcel } from '@/helpers/excel'

// Helper para logs condicionales de debugging (cliente)
const DEBUG = process.env.NODE_ENV === 'development' || (typeof window !== 'undefined' && (window as any).DEBUG_CRM === 'true')
const debugLog = (...args: any[]) => {
  if (DEBUG) {
    console.log(...args)
  }
}

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
    cursoNombre?: string
    cursoId?: number | string
    asignaturaNombre?: string
    asignaturaId?: number | string
    anio?: number | string | null
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

type TabType = 'informacion' | 'contactos' | 'pedidos' | 'leads' | 'actividades' | 'materiales' | 'cursos'

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
  const [loadingCursos, setLoadingCursos] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [colegio, setColegio] = useState<ColegioData | null>(null)
  const [contactos, setContactos] = useState<ContactoData[]>([])
  const [pedidos, setPedidos] = useState<PedidoData[]>([])
  const [leads, setLeads] = useState<LeadData[]>([])
  const [activities, setActivities] = useState<ActivityData[]>([])
  const [cursos, setCursos] = useState<any[]>([])
  const [showCursoModal, setShowCursoModal] = useState(false)
  const [cursoSeleccionado, setCursoSeleccionado] = useState<any>(null)
  const [añoFiltro, setAñoFiltro] = useState<number | null>(null) // Filtro de año para cursos

  useEffect(() => {
    const fetchColegio = async () => {
      if (!colegioId) return

      setLoading(true)
      setError(null)

      try {
        debugLog('[ColegioDetailPage] Buscando colegio con ID:', colegioId)
        const response = await fetch(`/api/crm/colegios/${colegioId}`)
        const result = await response.json()

        debugLog('[ColegioDetailPage] Respuesta de la API:', {
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
        debugLog('🔍 [ColegioDetailPage] Buscando contactos para colegio:', colegioId)
        const response = await fetch(`/api/crm/colegios/${colegioId}/contacts`)
        const result = await response.json()
        
        debugLog('📥 [ColegioDetailPage] Respuesta de contactos:', {
          ok: response.ok,
          success: result.success,
          total: result.data?.length || 0,
          meta: result.meta,
        })
        
        if (response.ok && result.success) {
          const contactosData = Array.isArray(result.data) ? result.data : [result.data]
          debugLog('📊 [ColegioDetailPage] Transformando', contactosData.length, 'contactos')
          
          const contactosTransformed: ContactoData[] = contactosData.map((contacto: any) => {
            const attrs = contacto.attributes || contacto
            const trayectorias = attrs.trayectorias || []
            
            debugLog('👤 [ColegioDetailPage] Contacto:', {
              id: contacto.documentId || contacto.id,
              nombre: attrs.nombre_completo,
              trayectorias: trayectorias.length,
            })
            
            return {
              id: contacto.documentId || contacto.id,
              documentId: contacto.documentId,
              nombre_completo: attrs.nombre_completo,
              rut: attrs.rut,
              emails: attrs.emails || [],
              telefonos: attrs.telefonos || [],
              trayectorias: trayectorias,
            }
          })
          
          debugLog('✅ [ColegioDetailPage] Contactos transformados:', contactosTransformed.length)
          setContactos(contactosTransformed)
        } else {
          console.error('❌ [ColegioDetailPage] Error en respuesta:', result)
        }
      } catch (err: any) {
        console.error('❌ [ColegioDetailPage] Error al cargar contactos:', err)
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
    if (colegioId && (activeTab === 'pedidos' || activeTab === 'materiales')) fetchPedidos()
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

  useEffect(() => {
    const fetchCursos = async () => {
      if (!colegioId) return
      setLoadingCursos(true)
      try {
        const response = await fetch(`/api/crm/colegios/${colegioId}/cursos`)
        const result = await response.json()
        if (response.ok && result.success) {
          const cursosData = Array.isArray(result.data) ? result.data : [result.data]
          setCursos(cursosData)
        }
      } catch (err: any) {
        console.error('Error al cargar cursos:', err)
      } finally {
        setLoadingCursos(false)
      }
    }
    if (colegioId && activeTab === 'cursos') {
      fetchCursos()
    } else if (activeTab !== 'cursos') {
      // Resetear filtro de año cuando se cambia de tab
      setAñoFiltro(null)
    }
  }, [colegioId, activeTab])

  // Función helper para extraer el año de un curso desde Strapi
  const obtenerAñoDelCurso = (curso: any): number => {
    const attrs = curso.attributes || curso
    
    // Obtener el año directamente de Strapi (campo ya configurado)
    if (attrs.año !== undefined && attrs.año !== null) {
      return Number(attrs.año)
    }
    // Mantener compatibilidad con 'ano' (sin tilde) por si acaso
    if (attrs.ano !== undefined && attrs.ano !== null) {
      return Number(attrs.ano)
    }
    
    // Fallback: año actual (solo si Strapi no devuelve el campo)
    return new Date().getFullYear()
  }

  // Obtener años únicos de los cursos para el filtro
  const añosDisponibles = useMemo(() => {
    const años = new Set<number>()
    cursos.forEach((curso: any) => {
      const año = obtenerAñoDelCurso(curso)
      años.add(año)
    })
    return Array.from(años).sort((a, b) => b - a) // Ordenar de mayor a menor
  }, [cursos])

  // Cursos filtrados por año
  const cursosFiltrados = useMemo(() => {
    if (añoFiltro === null) return cursos
    return cursos.filter((curso: any) => {
      const año = obtenerAñoDelCurso(curso)
      return año === añoFiltro
    })
  }, [cursos, añoFiltro])

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
      // Priorizar cursoNombre, luego cargo
      const grupo = trayectoriaActual?.cursoNombre || trayectoriaActual?.cargo || 'Sin cargo/curso'
      
      if (!grupos.has(grupo)) {
        grupos.set(grupo, [])
      }
      grupos.get(grupo)!.push(contacto)
    })
    
    return Array.from(grupos.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [contactos])

  // Calcular estadísticas
  const estadisticas = useMemo(() => {
    const colaboradoresActivos = contactos.length
    const clientesUnicos = new Set(pedidos.map(p => p.cliente?.nombre || p.cliente?.correo_electronico || '').filter(Boolean)).size
    const totalPedidos = pedidos.length
    const valorTotalVendido = pedidos.reduce((sum, p) => sum + (p.total || 0), 0)

    return {
      colaboradoresActivos,
      clientesUnicos,
      totalPedidos,
      valorTotalVendido,
    }
  }, [contactos, pedidos])

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
          Colaboradores del Colegio
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
          <p className="text-muted text-center py-5">No hay colaboradores asociados a este colegio</p>
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
                    const trayectoriaActual = contacto.trayectorias?.find((t) => t.is_current) || contacto.trayectorias?.[0]
                    const telefonoPrincipal = contacto.telefonos?.find((t) => t.principal) || contacto.telefonos?.[0]
                    const todosLosEmails = contacto.emails || []
                    
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
                            
                            {/* Mostrar cargo si no es el mismo que el grupo */}
                            {trayectoriaActual?.cargo && trayectoriaActual.cargo !== cargo && (
                              <p className="mb-1 small text-muted">
                                <Badge bg="info" className="me-1">{trayectoriaActual.cargo}</Badge>
                              </p>
                            )}
                            
                            {/* Mostrar todos los correos */}
                            {todosLosEmails.length > 0 && (
                              <div className="mb-2">
                                <label className="text-muted small d-block mb-1">
                                  <LuMail size={12} className="me-1" />
                                  Correos:
                                </label>
                                {todosLosEmails.map((email, idx) => (
                                  <p key={idx} className="mb-1 small">
                                    <a href={`mailto:${email.email}`} className="text-decoration-none">
                                      {email.email}
                                    </a>
                                    {email.principal && <Badge bg="primary" className="ms-1" style={{ fontSize: '0.65rem' }}>Principal</Badge>}
                                  </p>
                                ))}
                              </div>
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
                  <th>Alumno/Cliente</th>
                  <th>Materiales</th>
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
                      <div>
                        <div className="fw-semibold">{pedido.cliente?.nombre || 'Sin nombre'}</div>
                        {pedido.cliente?.correo_electronico && (
                          <small className="text-muted">{pedido.cliente.correo_electronico}</small>
                        )}
                      </div>
                    </td>
                    <td>
                      {pedido.items && pedido.items.length > 0 ? (
                        <div>
                          {pedido.items.slice(0, 3).map((item, idx) => (
                            <div key={idx} className="small mb-1">
                              <Badge bg="light" text="dark" className="me-1">
                                {item.quantity || 0}x
                              </Badge>
                              {item.name || 'Sin nombre'}
                            </div>
                          ))}
                          {pedido.items.length > 3 && (
                            <small className="text-muted">+{pedido.items.length - 3} más</small>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted">Sin materiales</span>
                      )}
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

  const renderCursosTab = () => (
    <Card>
      <CardHeader>
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
          <div className="d-flex align-items-center gap-3">
            <h4 className="mb-0 d-flex align-items-center">
              <LuGraduationCap className="me-2" />
              Cursos del Colegio
              <Badge bg="primary" className="ms-2">{cursosFiltrados.length}</Badge>
            </h4>
            {añosDisponibles.length > 0 && (
              <FormGroup className="mb-0" style={{ minWidth: '150px' }}>
                <FormControl
                  as="select"
                  value={añoFiltro || ''}
                  onChange={(e) => {
                    const valor = e.target.value
                    setAñoFiltro(valor === '' ? null : Number(valor))
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="">Todos los años</option>
                  {añosDisponibles.map((año) => (
                    <option key={año} value={año}>
                      Año {año}
                    </option>
                  ))}
                </FormControl>
              </FormGroup>
            )}
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setCursoSeleccionado(null)
              setShowCursoModal(true)
            }}
          >
            <LuGraduationCap className="me-1" />
            Agregar Curso
          </Button>
        </div>
      </CardHeader>
      <CardBody>
        {loadingCursos ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2 text-muted">Cargando cursos...</p>
          </div>
        ) : cursosFiltrados.length === 0 ? (
          <p className="text-muted text-center py-5">
            {añoFiltro 
              ? `No hay cursos registrados para el año ${añoFiltro}. Haz clic en "Agregar Curso" para comenzar.`
              : 'No hay cursos registrados para este colegio. Haz clic en "Agregar Curso" para comenzar.'}
          </p>
        ) : (
          // Vista de tabla siempre (con o sin filtro de año)
          (() => {
            // Agrupar cursos por año si no hay filtro
            const cursosPorAño = añoFiltro === null 
              ? cursosFiltrados.reduce((acc: Record<string, any[]>, curso: any) => {
                  const attrs = curso.attributes || curso
                  const año = obtenerAñoDelCurso(curso)
                  const añoKey = String(año)
                  if (!acc[añoKey]) {
                    acc[añoKey] = []
                  }
                  acc[añoKey].push(curso)
                  return acc
                }, {})
              : { [String(añoFiltro)]: cursosFiltrados }

            // Ordenar años de mayor a menor
            const añosOrdenados = Object.keys(cursosPorAño).sort((a, b) => parseInt(b) - parseInt(a))

            return (
              <div>
                {añosOrdenados.map((añoKey) => {
                  const cursosDelAño = cursosPorAño[añoKey]
                  return (
                    <div key={añoKey} className={añoFiltro === null ? 'mb-4' : ''}>
                      {añoFiltro === null && (
                        <div className="d-flex align-items-center mb-3">
                          <h5 className="mb-0 me-2">Año {añoKey}</h5>
                          <Badge bg="secondary">{cursosDelAño.length} {cursosDelAño.length === 1 ? 'curso' : 'cursos'}</Badge>
                        </div>
                      )}
                      <div className="table-responsive">
                        <Table hover className="align-middle">
                          <thead className="table-light">
                            <tr>
                              <th style={{ width: '20%' }}>CURSO</th>
                              <th style={{ width: '8%' }}>AÑO</th>
                              <th style={{ width: '10%' }}>NIVEL</th>
                              <th style={{ width: '8%' }}>GRADO</th>
                              <th style={{ width: '8%' }}>PARALELO</th>
                              <th style={{ width: '15%' }}>LISTA DE ÚTILES</th>
                              <th style={{ width: '10%' }}>MATERIALES</th>
                              <th style={{ width: '8%' }}>ESTADO</th>
                              <th style={{ width: '13%' }} className="text-end">ACCIONES</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cursosDelAño.map((curso: any) => {
                              const attrs = curso.attributes || curso
                              const materialesDirectos = attrs.materiales || []
                              const materialesLista = attrs.lista_utiles?.data?.attributes?.materiales || 
                                                     attrs.lista_utiles?.attributes?.materiales || 
                                                     attrs.lista_utiles?.materiales || []
                              const materiales = [...materialesDirectos, ...(Array.isArray(materialesLista) ? materialesLista : [])]
                              const nombreLista = attrs.lista_utiles?.data?.attributes?.nombre || 
                                                 attrs.lista_utiles?.attributes?.nombre || 
                                                 attrs.lista_utiles?.nombre || null
                              const año = obtenerAñoDelCurso(curso)
                              
                              return (
                                <tr key={curso.id || curso.documentId}>
                                  <td>
                                    <div>
                                      <div className="fw-semibold">
                                        {attrs.nombre_curso || attrs.curso_nombre || attrs.titulo || attrs.nombre || 'Sin nombre'}
                                      </div>
                                    </div>
                                  </td>
                                  <td>
                                    <Badge bg="primary">{año}</Badge>
                                  </td>
                                  <td>
                                    <Badge bg="info">{attrs.nivel || '-'}</Badge>
                                  </td>
                                  <td>
                                    <span className="text-muted">{attrs.grado ? `${attrs.grado}°` : '-'}</span>
                                  </td>
                                  <td>
                                    <span className="text-muted">{attrs.paralelo || '-'}</span>
                                  </td>
                                  <td>
                                    {nombreLista ? (
                                      <Badge bg="secondary">{nombreLista}</Badge>
                                    ) : (
                                      <span className="text-muted">Sin lista</span>
                                    )}
                                  </td>
                                  <td>
                                    <div className="d-flex align-items-center gap-2">
                                      <LuPackage size={16} className="text-muted" />
                                      <span className="text-muted">{materiales.length}</span>
                                    </div>
                                  </td>
                                  <td>
                                    {attrs.activo !== false ? (
                                      <Badge bg="success">Activo</Badge>
                                    ) : (
                                      <Badge bg="secondary">Inactivo</Badge>
                                    )}
                                  </td>
                                  <td>
                                    <div className="d-flex justify-content-end gap-2">
                                      <Button
                                        variant="link"
                                        size="sm"
                                        className="p-1 text-success"
                                        onClick={() => {
                                          // Intentar obtener el ID del curso
                                          // IMPORTANTE: Con draftAndPublish: true, Strapi usa:
                                          // - id (numérico): Para documentos publicados
                                          // - documentId (string UUID): Identificador único (draft o publicado)
                                          // Preferir documentId si está disponible porque es más confiable
                                          const cursoId = curso.documentId || // Preferir documentId
                                                         curso.id || 
                                                         (curso.attributes && (curso.attributes.documentId || curso.attributes.id)) ||
                                                         (curso.data && (curso.data.documentId || curso.data.id))
                                          
                                          debugLog('[ColegioDetailPage] Navegando a detalle de curso:', { 
                                            cursoId, 
                                            cursoIdType: typeof cursoId,
                                            curso: {
                                              id: curso.id,
                                              documentId: curso.documentId,
                                              hasAttributes: !!curso.attributes,
                                              attrsId: curso.attributes?.id,
                                              attrsDocumentId: curso.attributes?.documentId,
                                            }
                                          })
                                          
                                          if (cursoId) {
                                            // Convertir a string para la URL
                                            router.push(`/crm/colegios/${colegioId}/cursos/${String(cursoId)}`)
                                          } else {
                                            console.error('No se pudo obtener el ID del curso:', curso)
                                            alert('Error: No se pudo obtener el ID del curso. Por favor, intente editar el curso para ver sus detalles.')
                                          }
                                        }}
                                        title="Ver detalle del curso"
                                      >
                                        <LuEye size={18} />
                                      </Button>
                                      {materiales.length > 0 && (
                                        <Button
                                          variant="link"
                                          size="sm"
                                          className="p-1 text-info"
                                          onClick={async () => {
                                            try {
                                              const materialesFormateados = materiales.map((m: any) => ({
                                                material_nombre: m.material_nombre || 'Sin nombre',
                                                tipo: (m.tipo || 'util') as 'util' | 'libro' | 'cuaderno' | 'otro',
                                                cantidad: parseInt(String(m.cantidad)) || 1,
                                                obligatorio: m.obligatorio !== false,
                                                descripcion: m.descripcion || undefined,
                                              }))
                                              const nombreCurso = attrs.nombre_curso || attrs.curso_nombre || 'materiales_curso'
                                              const nombreArchivo = nombreCurso.replace(/\s+/g, '_')
                                              await exportarMaterialesAExcel(materialesFormateados, nombreArchivo)
                                            } catch (error: any) {
                                              console.error('Error al exportar materiales:', error)
                                              alert('Error al exportar materiales: ' + (error.message || 'Error desconocido'))
                                            }
                                          }}
                                          title="Exportar materiales a Excel"
                                        >
                                          <LuDownload size={18} />
                                        </Button>
                                      )}
                                      <Button
                                        variant="link"
                                        size="sm"
                                        className="p-1 text-primary"
                                        onClick={() => {
                                          setCursoSeleccionado(curso)
                                          setShowCursoModal(true)
                                        }}
                                        title="Editar curso"
                                      >
                                        <LuPencil size={18} />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </Table>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()
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

      {/* Estadísticas Rápidas */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="text-center">
            <CardBody>
              <h3 className="mb-1 text-primary">{estadisticas.colaboradoresActivos}</h3>
              <p className="text-muted mb-0 small">Colaboradores Activos</p>
            </CardBody>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <CardBody>
              <h3 className="mb-1 text-success">{estadisticas.clientesUnicos}</h3>
              <p className="text-muted mb-0 small">Alumnos Comprando</p>
            </CardBody>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <CardBody>
              <h3 className="mb-1 text-info">{estadisticas.totalPedidos}</h3>
              <p className="text-muted mb-0 small">Total de Pedidos</p>
            </CardBody>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <CardBody>
              <h3 className="mb-1 text-warning">${estadisticas.valorTotalVendido.toLocaleString('es-CL')}</h3>
              <p className="text-muted mb-0 small">Valor Total Vendido</p>
            </CardBody>
          </Card>
        </Col>
      </Row>

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
            Colaboradores ({contactos.length})
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
        <NavItem>
          <NavLink
            active={activeTab === 'cursos'}
            onClick={() => setActiveTab('cursos')}
            style={{ cursor: 'pointer' }}
          >
            <LuGraduationCap className="me-1" size={16} />
            Cursos ({cursos.length})
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
        {activeTab === 'cursos' && renderCursosTab()}
      </div>

      <CursoModal
        show={showCursoModal}
        onHide={() => {
          setShowCursoModal(false)
          setCursoSeleccionado(null)
        }}
        colegioId={colegioId}
        curso={cursoSeleccionado}
        onSuccess={() => {
          // Recargar cursos
          if (colegioId && activeTab === 'cursos') {
            fetch(`/api/crm/colegios/${colegioId}/cursos`)
              .then((res) => res.json())
              .then((result) => {
                if (result.success) {
                  const cursosData = Array.isArray(result.data) ? result.data : [result.data]
                  setCursos(cursosData)
                }
              })
              .catch((err) => console.error('Error al recargar cursos:', err))
          }
        }}
      />
    </Container>
  )
}
