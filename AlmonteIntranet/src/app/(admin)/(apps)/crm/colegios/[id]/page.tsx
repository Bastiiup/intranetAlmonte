'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Container, Card, CardHeader, CardBody, Alert, Spinner, Row, Col, Button, Badge, Nav, NavItem, NavLink, Table, Form, FormGroup, FormLabel, FormControl } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { LuMapPin, LuPhone, LuMail, LuGlobe, LuUsers, LuPencil, LuArrowLeft, LuPackage, LuGraduationCap, LuDownload, LuEye, LuTrash2 } from 'react-icons/lu'
import Link from 'next/link'
import CursoModal from './components/CursoModal'
import DeleteConfirmationModal from '@/components/table/DeleteConfirmationModal'
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

type TabType = 'informacion' | 'contactos' | 'materiales' | 'cursos'

export default function ColegioDetailPage() {
  const params = useParams()
  const router = useRouter()
  const colegioId = params?.id as string

  const [activeTab, setActiveTab] = useState<TabType>('informacion')
  const [loading, setLoading] = useState(true)
  const [loadingContacts, setLoadingContacts] = useState(true)
  const [loadingCursos, setLoadingCursos] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [colegio, setColegio] = useState<ColegioData | null>(null)
  const [contactos, setContactos] = useState<ContactoData[]>([])
  const [cursos, setCursos] = useState<any[]>([])
  const [showCursoModal, setShowCursoModal] = useState(false)
  const [cursoSeleccionado, setCursoSeleccionado] = useState<any>(null)
  const [añoFiltro, setAñoFiltro] = useState<number | null>(null) // Filtro de año para cursos
  const [listasUtilesCount, setListasUtilesCount] = useState(0)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [cursoAEliminar, setCursoAEliminar] = useState<any>(null)
  const [eliminando, setEliminando] = useState(false)

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


  // Función para recargar cursos (reutilizable)
  const recargarCursosDesdeAPI = async () => {
    if (!colegioId) return
    setLoadingCursos(true)
    try {
      // Agregar timestamp para evitar caché
      const timestamp = Date.now()
      const response = await fetch(`/api/crm/colegios/${colegioId}/cursos?_t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      })
      const result = await response.json()
      if (response.ok && result.success) {
        const cursosData = Array.isArray(result.data) ? result.data : [result.data]
        
        // Filtrar cursos que tengan un ID válido (los eliminados pueden no tenerlo)
        const cursosValidos = cursosData.filter((curso: any) => {
          return curso.id || curso.documentId || (curso.attributes && (curso.attributes.id || curso.attributes.documentId))
        })
        
        debugLog('[ColegioDetailPage] Cursos cargados:', {
          total: cursosData.length,
          validos: cursosValidos.length,
          ids: cursosValidos.map((c: any) => c.id || c.documentId),
        })
        
        setCursos(cursosValidos)
        
        // Contar listas de útiles únicas
        const listasUtilesSet = new Set<string>()
        cursosValidos.forEach((curso: any) => {
          const attrs = curso.attributes || curso
          const listaId = attrs.lista_utiles?.data?.id || 
                         attrs.lista_utiles?.id || 
                         attrs.lista_utiles?.data?.documentId ||
                         attrs.lista_utiles?.documentId
          if (listaId) {
            listasUtilesSet.add(String(listaId))
          }
        })
        setListasUtilesCount(listasUtilesSet.size)
      }
    } catch (err: any) {
      console.error('Error al cargar cursos:', err)
    } finally {
      setLoadingCursos(false)
    }
  }

  useEffect(() => {
    if (colegioId) {
      recargarCursosDesdeAPI()
      if (activeTab !== 'cursos') {
        // Resetear filtro de año cuando se cambia de tab
        setAñoFiltro(null)
      }
    }
  }, [colegioId]) // Solo recargar cuando cambia el colegioId, no cuando cambia el tab
  
  // Recargar cuando se cambia al tab de cursos (con delay para evitar recargas múltiples)
  useEffect(() => {
    if (colegioId && activeTab === 'cursos') {
      const timeoutId = setTimeout(() => {
        debugLog('[ColegioDetailPage] Cambió al tab de cursos, recargando...')
        recargarCursosDesdeAPI()
      }, 300) // Pequeño delay para evitar recargas múltiples
      
      return () => clearTimeout(timeoutId)
    }
  }, [activeTab]) // Solo cuando cambia el tab
  
  // Agregar listener para recargar cursos cuando se vuelve a la página
  useEffect(() => {
    const handleFocus = () => {
      // Cuando la ventana recupera el foco, recargar cursos si estamos en el tab de cursos
      if (colegioId && activeTab === 'cursos') {
        debugLog('[ColegioDetailPage] Ventana recuperó foco, recargando cursos...')
        recargarCursosDesdeAPI()
      }
    }
    
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [colegioId, activeTab])

  // Función para notificar cambios a otras páginas
  const notificarCambio = (tipo: 'eliminado' | 'creado' | 'editado', cursoId?: string | number) => {
    // Usar CustomEvent para notificar a otras pestañas/ventanas
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('curso-cambiado', {
        detail: { tipo, cursoId, timestamp: Date.now() }
      }))
      
      // También usar localStorage como backup
      localStorage.setItem('curso-cambio-notificacion', JSON.stringify({
        tipo,
        cursoId,
        timestamp: Date.now()
      }))
    }
  }

  // Listener para cambios desde otras páginas
  useEffect(() => {
    const handleCambioCurso = (event: any) => {
      debugLog('[ColegioDetailPage] 🔔 Cambio detectado desde otra página:', event.detail)
      // Recargar cursos si estamos en el tab de cursos
      if (activeTab === 'cursos') {
        setTimeout(() => {
          recargarCursosDesdeAPI()
        }, 500)
      }
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'curso-cambio-notificacion' && e.newValue) {
        try {
          const cambio = JSON.parse(e.newValue)
          debugLog('[ColegioDetailPage] 🔔 Cambio detectado desde localStorage:', cambio)
          if (activeTab === 'cursos') {
            setTimeout(() => {
              recargarCursosDesdeAPI()
            }, 500)
          }
        } catch (err) {
          console.error('[ColegioDetailPage] Error al parsear notificación:', err)
        }
      }
    }

    window.addEventListener('curso-cambiado', handleCambioCurso)
    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('curso-cambiado', handleCambioCurso)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [activeTab])

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


  // Calcular estadísticas
  const estadisticas = useMemo(() => {
    const colaboradoresActivos = contactos.length
    const totalCursos = cursos.length

    return {
      colaboradoresActivos,
      totalCursos,
      listasUtilesCount,
    }
  }, [contactos, cursos, listasUtilesCount])

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
          <div className="table-responsive">
            <Table hover className="align-middle">
              <thead className="table-light">
                <tr>
                  <th style={{ width: '25%' }}>NOMBRE</th>
                  <th style={{ width: '20%' }}>CARGO / CURSO</th>
                  <th style={{ width: '20%' }}>EMAIL</th>
                  <th style={{ width: '15%' }}>TELÉFONO</th>
                  <th style={{ width: '20%' }} className="text-end">ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {contactos.map((contacto) => {
                  const trayectoriaActual = contacto.trayectorias?.find((t) => t.is_current) || contacto.trayectorias?.[0]
                  const telefonoPrincipal = contacto.telefonos?.find((t) => t.principal) || contacto.telefonos?.[0]
                  const emailPrincipal = contacto.emails?.find((e) => e.principal) || contacto.emails?.[0]
                  const cargoCurso = trayectoriaActual?.cursoNombre || trayectoriaActual?.cargo || '-'
                  
                  return (
                    <tr key={contacto.id}>
                      <td>
                        <Link 
                          href={`/crm/contacts/${contacto.id}`}
                          className="text-decoration-none fw-semibold"
                        >
                          {contacto.nombre_completo || 'Sin nombre'}
                        </Link>
                      </td>
                      <td>
                        <Badge bg="info">{cargoCurso}</Badge>
                      </td>
                      <td>
                        {emailPrincipal ? (
                          <a href={`mailto:${emailPrincipal.email}`} className="text-decoration-none">
                            {emailPrincipal.email}
                          </a>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td>
                        {telefonoPrincipal ? (
                          <span>{telefonoPrincipal.telefono_norm || telefonoPrincipal.telefono_raw}</span>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td>
                        <div className="d-flex justify-content-end gap-2">
                          <Button
                            variant="link"
                            size="sm"
                            className="p-1 text-primary"
                            onClick={() => router.push(`/crm/contacts/${contacto.id}`)}
                            title="Ver detalle"
                          >
                            <LuEye size={18} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </Table>
          </div>
        )}
      </CardBody>
    </Card>
  )


  const recargarCursos = async () => {
    if (!colegioId) return
    setLoadingCursos(true)
    try {
      const timestamp = Date.now()
      const response = await fetch(`/api/crm/colegios/${colegioId}/cursos?_t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      })
      const result = await response.json()
      if (response.ok && result.success) {
        const cursosData = Array.isArray(result.data) ? result.data : [result.data]
        const cursosValidos = cursosData.filter((curso: any) => {
          return curso.id || curso.documentId || (curso.attributes && (curso.attributes.id || curso.attributes.documentId))
        })
        setCursos(cursosValidos)
        
        // Actualizar contador de listas
        const listasUtilesSet = new Set<string>()
        cursosValidos.forEach((curso: any) => {
          const attrs = curso.attributes || curso
          const listaId = attrs.lista_utiles?.data?.id || 
                         attrs.lista_utiles?.id || 
                         attrs.lista_utiles?.data?.documentId ||
                         attrs.lista_utiles?.documentId
          if (listaId) {
            listasUtilesSet.add(String(listaId))
          }
        })
        setListasUtilesCount(listasUtilesSet.size)
        debugLog('[ColegioDetailPage] ✅ Cursos recargados:', cursosValidos.length)
      }
    } catch (err: any) {
      console.error('Error al recargar cursos:', err)
    } finally {
      setLoadingCursos(false)
    }
  }

  const handleEliminarCurso = async () => {
    if (!cursoAEliminar) return

    setEliminando(true)
    try {
      // Obtener el ID del curso (documentId o id numérico)
      const cursoId = cursoAEliminar.documentId || cursoAEliminar.id || 
                     (cursoAEliminar.attributes && (cursoAEliminar.attributes.documentId || cursoAEliminar.attributes.id))
      
      if (!cursoId) {
        alert('Error: No se pudo obtener el ID del curso')
        setShowDeleteModal(false)
        setCursoAEliminar(null)
        return
      }

      debugLog('[ColegioDetailPage] Eliminando curso:', cursoId)

      const response = await fetch(`/api/crm/listas/${cursoId}`, {
        method: 'DELETE',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
      }

      const result = await response.json()

      if (result.success) {
        debugLog('[ColegioDetailPage] ✅ Curso eliminado exitosamente')
        
        // Notificar cambio a otras páginas
        notificarCambio('eliminado', cursoId)
        
        // Esperar un momento para que Strapi procese la eliminación
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Recargar cursos
        await recargarCursos()
        
        alert('Curso eliminado exitosamente')
      } else {
        throw new Error(result.error || 'Error desconocido al eliminar')
      }
    } catch (error: any) {
      console.error('[ColegioDetailPage] Error al eliminar curso:', error)
      alert('Error al eliminar curso: ' + (error.message || 'Error desconocido'))
    } finally {
      setEliminando(false)
      setShowDeleteModal(false)
      setCursoAEliminar(null)
    }
  }

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
          <div className="d-flex gap-2">
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={recargarCursos}
              disabled={loadingCursos}
            >
              <LuArrowLeft className="me-1" style={{ transform: 'rotate(180deg)' }} />
              {loadingCursos ? 'Recargando...' : 'Recargar'}
            </Button>
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
                                      <Button
                                        variant="link"
                                        size="sm"
                                        className="p-1 text-danger"
                                        onClick={() => {
                                          setCursoAEliminar(curso)
                                          setShowDeleteModal(true)
                                        }}
                                        title="Eliminar curso"
                                      >
                                        <LuTrash2 size={18} />
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
          Materiales
        </h4>
      </CardHeader>
      <CardBody>
        <p className="text-muted text-center py-5">
          Los materiales se gestionan desde los cursos. Ve a la pestaña "Cursos" para ver y gestionar los materiales de cada curso.
        </p>
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
        <Col md={4}>
          <Card className="text-center">
            <CardBody>
              <h3 className="mb-1 text-primary">{estadisticas.colaboradoresActivos}</h3>
              <p className="text-muted mb-0 small">Colaboradores Activos</p>
            </CardBody>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="text-center">
            <CardBody>
              <h3 className="mb-1 text-success">{estadisticas.totalCursos}</h3>
              <p className="text-muted mb-0 small">Cursos</p>
            </CardBody>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="text-center">
            <CardBody>
              <h3 className="mb-1 text-info">{estadisticas.listasUtilesCount}</h3>
              <p className="text-muted mb-0 small">Listas de Útiles</p>
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
        onSuccess={(cursoCreado?: any) => {
          // Notificar cambio
          const cursoId = cursoCreado?.id || cursoCreado?.documentId
          notificarCambio(cursoSeleccionado ? 'editado' : 'creado', cursoId)
          
          // Recargar cursos usando la función helper
          if (colegioId && activeTab === 'cursos') {
            setTimeout(() => {
              recargarCursos()
            }, 500)
          }
        }}
      />

      <DeleteConfirmationModal
        show={showDeleteModal}
        onHide={() => {
          setShowDeleteModal(false)
          setCursoAEliminar(null)
        }}
        onConfirm={handleEliminarCurso}
        title="Eliminar Curso"
        message={
          cursoAEliminar
            ? `¿Está seguro de que desea eliminar el curso "${cursoAEliminar.attributes?.nombre_curso || cursoAEliminar.attributes?.curso_nombre || 'Sin nombre'}"? Esta acción también eliminará todas las listas de útiles asociadas y no se puede deshacer.`
            : '¿Está seguro de que desea eliminar este curso?'
        }
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
        loading={eliminando}
      />
    </Container>
  )
}
