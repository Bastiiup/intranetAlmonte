'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Container, Card, CardHeader, CardBody, Alert, Spinner, Row, Col, Badge, Nav, NavItem, NavLink, Button } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { LuArrowLeft, LuPhone, LuMail, LuMapPin, LuGlobe, LuBuilding2, LuUsers, LuPencil, LuTrash2 } from 'react-icons/lu'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface EmpresaData {
  id: string
  documentId?: string
  empresa_nombre?: string
  nombre?: string
  razon_social?: string
  rut?: string
  giro?: string
  estado?: string
  es_empresa_propia?: boolean
  region?: string
  comuna?: {
    comuna_nombre?: string
    region_nombre?: string
  }
  telefonos?: Array<{ telefono_raw?: string; tipo?: string; principal?: boolean }>
  emails?: Array<{ email?: string; tipo?: string; principal?: boolean }>
  website?: string
  direcciones?: Array<{
    nombre_calle?: string
    numero_calle?: string
    complemento_direccion?: string
    tipo_direccion?: string
    direccion_principal_envio_facturacion?: string
    comuna?: {
      comuna_nombre?: string
    }
  }>
  datos_facturacion?: {
    first_name?: string
    last_name?: string
    company?: string
    email?: string
    phone?: string
    address_1?: string
    address_2?: string
    city?: string
    state?: string
    postcode?: string
    country?: string
  }
  createdAt?: string
  updatedAt?: string
}

type TabType = 'informacion' | 'contactos' | 'oportunidades' | 'rfqs' | 'cotizaciones-recibidas' | 'ordenes-compra' | 'inventario'

export default function EmpresaDetailPage() {
  const params = useParams()
  const router = useRouter()
  const empresaId = params.id as string

  const [empresa, setEmpresa] = useState<EmpresaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('informacion')
  const [contactos, setContactos] = useState<any[]>([])
  const [loadingContactos, setLoadingContactos] = useState(false)
  const [rfqs, setRfqs] = useState<any[]>([])
  const [loadingRfqs, setLoadingRfqs] = useState(false)
  const [cotizacionesRecibidas, setCotizacionesRecibidas] = useState<any[]>([])
  const [loadingCotizacionesRecibidas, setLoadingCotizacionesRecibidas] = useState(false)
  const [ordenesCompra, setOrdenesCompra] = useState<any[]>([])
  const [loadingOrdenesCompra, setLoadingOrdenesCompra] = useState(false)

  useEffect(() => {
    const fetchEmpresa = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/crm/empresas/${empresaId}`)
        const result = await response.json()

        if (!result.success) {
          throw new Error(result.error || 'Error al cargar empresa')
        }

        // Transformar datos de Strapi
        const data = result.data
        const attrs = data.attributes || data
        
        setEmpresa({
          id: data.documentId || data.id || empresaId,
          documentId: data.documentId,
          empresa_nombre: attrs.empresa_nombre || attrs.nombre,
          nombre: attrs.nombre,
          razon_social: attrs.razon_social,
          rut: attrs.rut,
          giro: attrs.giro,
          estado: attrs.estado,
          es_empresa_propia: attrs.es_empresa_propia || false,
          region: attrs.region,
          comuna: attrs.comuna?.data?.attributes || attrs.comuna,
          telefonos: attrs.telefonos || [],
          emails: attrs.emails || [],
          website: attrs.website,
          direcciones: attrs.direcciones || [],
          datos_facturacion: attrs.datos_facturacion,
          createdAt: attrs.createdAt || data.createdAt,
          updatedAt: attrs.updatedAt || data.updatedAt,
        })
      } catch (err: any) {
        console.error('Error fetching empresa:', err)
        setError(err.message || 'Error al cargar empresa')
      } finally {
        setLoading(false)
      }
    }

    if (empresaId) {
      fetchEmpresa()
    }
  }, [empresaId])

  // Cargar órdenes de compra cuando se activa la pestaña (solo para empresas propias)
  useEffect(() => {
    if (activeTab === 'ordenes-compra' && empresaId && empresa?.es_empresa_propia && ordenesCompra.length === 0 && !loadingOrdenesCompra) {
      const loadOrdenesCompra = async () => {
        setLoadingOrdenesCompra(true)
        try {
          const response = await fetch(`/api/compras/ordenes-compra?empresaPropiaId=${empresaId}`)
          const result = await response.json()
          
          if (result.success && result.data) {
            setOrdenesCompra(Array.isArray(result.data) ? result.data : [result.data])
          }
        } catch (err: any) {
          console.error('Error al cargar órdenes de compra:', err)
        } finally {
          setLoadingOrdenesCompra(false)
        }
      }
      loadOrdenesCompra()
    }
  }, [activeTab, empresaId, empresa?.es_empresa_propia, ordenesCompra.length, loadingOrdenesCompra])

  // Cargar contactos cuando se activa la pestaña
  useEffect(() => {
    if (activeTab === 'contactos' && empresaId && contactos.length === 0 && !loadingContactos) {
      const loadContactos = async () => {
        setLoadingContactos(true)
        try {
          const response = await fetch(`/api/crm/empresas/${empresaId}/contacts`)
          const result = await response.json()
          
          if (result.success && result.data) {
            setContactos(Array.isArray(result.data) ? result.data : [result.data])
          }
        } catch (err: any) {
          console.error('Error al cargar contactos:', err)
        } finally {
          setLoadingContactos(false)
        }
      }
      loadContactos()
    }
  }, [activeTab, empresaId, contactos.length, loadingContactos])

  // Cargar RFQs cuando se activa la pestaña
  useEffect(() => {
    if (activeTab === 'rfqs' && empresaId && rfqs.length === 0 && !loadingRfqs) {
      const loadRfqs = async () => {
        setLoadingRfqs(true)
        try {
          const response = await fetch(`/api/compras/rfqs?empresaId=${empresaId}`)
          const result = await response.json()
          
          if (result.success && result.data) {
            setRfqs(Array.isArray(result.data) ? result.data : [result.data])
          }
        } catch (err: any) {
          console.error('Error al cargar RFQs:', err)
        } finally {
          setLoadingRfqs(false)
        }
      }
      loadRfqs()
    }
  }, [activeTab, empresaId, rfqs.length, loadingRfqs])

  // Cargar cotizaciones recibidas cuando se activa la pestaña
  useEffect(() => {
    if (activeTab === 'cotizaciones-recibidas' && empresaId && cotizacionesRecibidas.length === 0 && !loadingCotizacionesRecibidas) {
      const loadCotizacionesRecibidas = async () => {
        setLoadingCotizacionesRecibidas(true)
        try {
          const response = await fetch(`/api/compras/cotizaciones?empresaId=${empresaId}`)
          const result = await response.json()
          
          if (result.success && result.data) {
            setCotizacionesRecibidas(Array.isArray(result.data) ? result.data : [result.data])
          }
        } catch (err: any) {
          console.error('Error al cargar cotizaciones recibidas:', err)
        } finally {
          setLoadingCotizacionesRecibidas(false)
        }
      }
      loadCotizacionesRecibidas()
    }
  }, [activeTab, empresaId, cotizacionesRecibidas.length, loadingCotizacionesRecibidas])

  const getEstadoBadge = (estado?: string) => {
    if (!estado) return null
    const variants: Record<string, { variant: string }> = {
      Activa: { variant: 'success' },
      Inactiva: { variant: 'danger' },
      Pendiente: { variant: 'warning' },
      Suspendida: { variant: 'secondary' },
    }
    const estadoConfig = variants[estado] || { variant: 'secondary' }
    return <Badge bg={estadoConfig.variant}>{estado}</Badge>
  }

  if (loading) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Empresa" subtitle="CRM" />
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2 text-muted">Cargando empresa...</p>
        </div>
      </Container>
    )
  }

  if (error || !empresa) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Empresa" subtitle="CRM" />
        <Alert variant="danger">
          <h4>Error</h4>
          <p>{error || 'No se pudo cargar la empresa'}</p>
          <Link href="/crm/empresas" className="btn btn-outline-secondary">
            <LuArrowLeft className="me-1" />
            Volver a Empresas
          </Link>
        </Alert>
      </Container>
    )
  }

  const empresaNombre = empresa.empresa_nombre || empresa.nombre || 'Empresa'
  const direccionPrincipal = empresa.direcciones?.find(
    (d) => d.direccion_principal_envio_facturacion === 'Facturación' || d.direccion_principal_envio_facturacion === 'Ambas'
  ) || empresa.direcciones?.[0]
  const emailPrincipal = empresa.emails?.find((e) => e.principal) || empresa.emails?.[0]
  const telefonoPrincipal = empresa.telefonos?.find((t) => t.principal) || empresa.telefonos?.[0]

  // Renderizar contenido de cada tab
  const renderInformacionTab = () => (
    <Row>
      <Col xl={8}>
        <Card>
          <CardHeader>
            <h5 className="mb-0">Información General</h5>
          </CardHeader>
          <CardBody>
            <Row>
              <Col md={6}>
                <div className="mb-3">
                  <label className="text-muted small">Nombre de la Empresa</label>
                  <p className="mb-0 fw-semibold">{empresaNombre}</p>
                </div>
              </Col>
              {empresa.razon_social && (
                <Col md={6}>
                  <div className="mb-3">
                    <label className="text-muted small">Razón Social</label>
                    <p className="mb-0">{empresa.razon_social}</p>
                  </div>
                </Col>
              )}
              {empresa.rut && (
                <Col md={6}>
                  <div className="mb-3">
                    <label className="text-muted small">RUT</label>
                    <p className="mb-0">{empresa.rut}</p>
                  </div>
                </Col>
              )}
              {empresa.giro && (
                <Col md={6}>
                  <div className="mb-3">
                    <label className="text-muted small">Giro</label>
                    <p className="mb-0">{empresa.giro}</p>
                  </div>
                </Col>
              )}
              <Col md={6}>
                <div className="mb-3">
                  <label className="text-muted small">Estado</label>
                  <div className="mb-0">
                    {getEstadoBadge(empresa.estado)}
                  </div>
                </div>
              </Col>
            </Row>

            {(direccionPrincipal || empresa.comuna) && (
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
                      {direccionPrincipal.comuna?.comuna_nombre && (
                        <span className="text-muted">, {direccionPrincipal.comuna.comuna_nombre}</span>
                      )}
                    </>
                  )}
                  {!direccionPrincipal && empresa.comuna?.comuna_nombre && (
                    <span>{empresa.comuna.comuna_nombre}</span>
                  )}
                  {empresa.region && (
                    <span className="text-muted">, {empresa.region}</span>
                  )}
                </p>
              </div>
            )}

            {empresa.telefonos && empresa.telefonos.length > 0 && (
              <div className="mb-3">
                <label className="text-muted small d-flex align-items-center">
                  <LuPhone className="me-1" size={14} />
                  Teléfonos
                </label>
                <div>
                  {empresa.telefonos.map((tel, idx) => (
                    <p key={idx} className="mb-1">
                      {tel.telefono_raw}
                      {tel.principal && <Badge bg="primary" className="ms-2">Principal</Badge>}
                      {tel.tipo && <span className="text-muted ms-2">({tel.tipo})</span>}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {empresa.emails && empresa.emails.length > 0 && (
              <div className="mb-3">
                <label className="text-muted small d-flex align-items-center">
                  <LuMail className="me-1" size={14} />
                  Emails
                </label>
                <div>
                  {empresa.emails.map((email, idx) => (
                    <p key={idx} className="mb-1">
                      <a href={`mailto:${email.email}`}>{email.email}</a>
                      {email.principal && <Badge bg="primary" className="ms-2">Principal</Badge>}
                      {email.tipo && <span className="text-muted ms-2">({email.tipo})</span>}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {empresa.website && (
              <div className="mb-3">
                <label className="text-muted small d-flex align-items-center">
                  <LuGlobe className="me-1" size={14} />
                  Sitio Web
                </label>
                <p className="mb-0">
                  <a href={empresa.website} target="_blank" rel="noopener noreferrer">
                    {empresa.website}
                  </a>
                </p>
              </div>
            )}
          </CardBody>
        </Card>

        {empresa.datos_facturacion && (
          <Card className="mt-3">
            <CardHeader>
              <h5 className="mb-0">Datos de Facturación</h5>
            </CardHeader>
            <CardBody>
              <Row>
                {empresa.datos_facturacion.first_name && (
                  <Col md={6}>
                    <div className="mb-3">
                      <label className="text-muted small">Nombre</label>
                      <p className="mb-0">{empresa.datos_facturacion.first_name} {empresa.datos_facturacion.last_name}</p>
                    </div>
                  </Col>
                )}
                {empresa.datos_facturacion.company && (
                  <Col md={6}>
                    <div className="mb-3">
                      <label className="text-muted small">Empresa</label>
                      <p className="mb-0">{empresa.datos_facturacion.company}</p>
                    </div>
                  </Col>
                )}
                {empresa.datos_facturacion.email && (
                  <Col md={6}>
                    <div className="mb-3">
                      <label className="text-muted small">Email</label>
                      <p className="mb-0">
                        <a href={`mailto:${empresa.datos_facturacion.email}`}>{empresa.datos_facturacion.email}</a>
                      </p>
                    </div>
                  </Col>
                )}
                {empresa.datos_facturacion.phone && (
                  <Col md={6}>
                    <div className="mb-3">
                      <label className="text-muted small">Teléfono</label>
                      <p className="mb-0">{empresa.datos_facturacion.phone}</p>
                    </div>
                  </Col>
                )}
                {empresa.datos_facturacion.address_1 && (
                  <Col md={12}>
                    <div className="mb-3">
                      <label className="text-muted small">Dirección</label>
                      <p className="mb-0">
                        {empresa.datos_facturacion.address_1}
                        {empresa.datos_facturacion.address_2 && `, ${empresa.datos_facturacion.address_2}`}
                        {empresa.datos_facturacion.city && `, ${empresa.datos_facturacion.city}`}
                        {empresa.datos_facturacion.state && `, ${empresa.datos_facturacion.state}`}
                        {empresa.datos_facturacion.postcode && ` ${empresa.datos_facturacion.postcode}`}
                        {empresa.datos_facturacion.country && `, ${empresa.datos_facturacion.country}`}
                      </p>
                    </div>
                  </Col>
                )}
              </Row>
            </CardBody>
          </Card>
        )}
      </Col>

      <Col xl={4}>
        <Card>
          <CardHeader>
            <h5 className="mb-0">Información Adicional</h5>
          </CardHeader>
          <CardBody>
            {empresa.createdAt && (
              <div className="mb-3">
                <label className="text-muted small">Fecha de Creación</label>
                <p className="mb-0">
                  {format(new Date(empresa.createdAt), 'dd MMMM yyyy', { locale: es })}
                </p>
              </div>
            )}
            {empresa.updatedAt && (
              <div className="mb-3">
                <label className="text-muted small">Última Actualización</label>
                <p className="mb-0">
                  {format(new Date(empresa.updatedAt), 'dd MMMM yyyy', { locale: es })}
                </p>
              </div>
            )}
          </CardBody>
        </Card>

        <Card className="mt-3">
          <CardHeader>
            <h5 className="mb-0">Acciones</h5>
          </CardHeader>
          <CardBody>
            <div className="d-grid gap-2">
              <Link href={`/crm/empresas/${empresaId}/editar`} className="btn btn-primary">
                <LuPencil className="me-1" />
                Editar Empresa
              </Link>
              <Button variant="outline-danger" onClick={() => {
                if (confirm('¿Está seguro de eliminar esta empresa?')) {
                  // TODO: Implementar eliminación
                  alert('Funcionalidad de eliminación pendiente')
                }
              }}>
                <LuTrash2 className="me-1" />
                Eliminar Empresa
              </Button>
            </div>
          </CardBody>
        </Card>
      </Col>
    </Row>
  )

  const renderContactosTab = () => (
    <Card>
      <CardHeader className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">
          Contactos
          {contactos.length > 0 && (
            <Badge bg="primary" className="ms-2">{contactos.length}</Badge>
          )}
        </h5>
        <Link href="/crm/contacts" className="btn btn-primary btn-sm">
          <LuUsers className="me-1" />
          Ver Todos
        </Link>
      </CardHeader>
      <CardBody>
        {loadingContactos ? (
          <div className="text-center py-4">
            <Spinner animation="border" size="sm" />
            <p className="text-muted mt-2 mb-0">Cargando contactos...</p>
          </div>
        ) : contactos.length === 0 ? (
          <Alert variant="info">
            <p className="mb-0">No hay contactos asociados a esta empresa.</p>
          </Alert>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead className="table-light">
                <tr>
                  <th>Nombre</th>
                  <th>Cargo</th>
                  <th>Email</th>
                  <th>Teléfono</th>
                  <th className="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {contactos.map((contacto) => {
                  const emailPrincipal = contacto.emails?.find((e: any) => e.principal) || contacto.emails?.[0]
                  const telefonoPrincipal = contacto.telefonos?.find((t: any) => t.principal) || contacto.telefonos?.[0]
                  const cargo = contacto.cargo || contacto._cargo || '-'
                  
                  return (
                    <tr key={contacto.id || contacto.documentId}>
                      <td>
                        <Link 
                          href={`/crm/contacts/${contacto.id || contacto.documentId}`}
                          className="text-decoration-none fw-semibold"
                        >
                          {contacto.nombre_completo || 'Sin nombre'}
                        </Link>
                      </td>
                      <td>
                        {cargo !== '-' && (
                          <Badge bg="info">{cargo}</Badge>
                        )}
                        {cargo === '-' && <span className="text-muted">-</span>}
                      </td>
                      <td>
                        {emailPrincipal?.email ? (
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
                      <td className="text-end">
                        <Link
                          href={`/crm/contacts/${contacto.id || contacto.documentId}`}
                          className="btn btn-sm btn-outline-primary"
                          title="Ver detalle"
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  )

  const formatCurrency = (monto?: number, moneda?: string) => {
    if (!monto) return '-'
    const currency = moneda || 'CLP'
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: currency === 'CLP' ? 'CLP' : currency === 'USD' ? 'USD' : 'EUR',
    }).format(monto)
  }

  const getEstadoColor = (estado?: string) => {
    switch (estado) {
      case 'Aprobada':
        return 'success'
      case 'Enviada':
        return 'info'
      case 'Rechazada':
        return 'danger'
      case 'Vencida':
        return 'warning'
      default:
        return 'secondary'
    }
  }

  const renderOrdenesCompraTab = () => (
    <Card>
      <CardHeader className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">
          Órdenes de Compra Generadas
          {ordenesCompra.length > 0 && (
            <Badge bg="primary" className="ms-2">{ordenesCompra.length}</Badge>
          )}
        </h5>
        <Link href="/crm/compras/ordenes-compra" className="btn btn-primary btn-sm">
          Ver Todas
        </Link>
      </CardHeader>
      <CardBody>
        {loadingOrdenesCompra ? (
          <div className="text-center py-4">
            <Spinner animation="border" size="sm" />
            <p className="text-muted mt-2 mb-0">Cargando órdenes de compra...</p>
          </div>
        ) : ordenesCompra.length === 0 ? (
          <Alert variant="info">
            <p className="mb-0">Esta empresa no ha generado órdenes de compra aún.</p>
          </Alert>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>Número PO</th>
                  <th>Proveedor</th>
                  <th>Cotización</th>
                  <th>Monto Total</th>
                  <th>Fecha Emisión</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {ordenesCompra.map((po: any) => {
                  const attrs = po.attributes || po
                  const empresaProveedora = attrs.empresa?.data || attrs.empresa
                  const empProveedoraAttrs = empresaProveedora?.attributes || empresaProveedora || {}
                  const cotizacion = attrs.cotizacion_recibida?.data || attrs.cotizacion_recibida
                  const cotAttrs = cotizacion?.attributes || cotizacion || {}
                  
                  const getEstadoBadgePO = (estado?: string) => {
                    const estados: Record<string, { variant: string; label: string }> = {
                      pendiente: { variant: 'warning', label: 'Pendiente' },
                      emitida: { variant: 'info', label: 'Emitida' },
                      confirmada: { variant: 'primary', label: 'Confirmada' },
                      en_transito: { variant: 'info', label: 'En Tránsito' },
                      recibida: { variant: 'success', label: 'Recibida' },
                      cancelada: { variant: 'danger', label: 'Cancelada' },
                    }
                    const estadoData = estados[estado || 'pendiente'] || estados.pendiente
                    return <Badge bg={estadoData.variant}>{estadoData.label}</Badge>
                  }
                  
                  return (
                    <tr key={po.id || po.documentId}>
                      <td>
                        <Link
                          href={`/crm/compras/ordenes-compra/${po.id || po.documentId}`}
                          className="text-decoration-none fw-semibold"
                        >
                          {attrs.numero_po || '-'}
                        </Link>
                      </td>
                      <td>{empProveedoraAttrs.empresa_nombre || empProveedoraAttrs.nombre || '-'}</td>
                      <td>
                        {cotAttrs.numero_cotizacion ? (
                          <Link
                            href={`/crm/compras/cotizaciones/${cotizacion?.id || cotizacion?.documentId}`}
                            className="text-decoration-none"
                          >
                            {cotAttrs.numero_cotizacion}
                          </Link>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td>
                        {attrs.monto_total
                          ? `${attrs.moneda || 'CLP'} ${Number(attrs.monto_total).toLocaleString()}`
                          : '-'}
                      </td>
                      <td>
                        {attrs.fecha_emision
                          ? format(new Date(attrs.fecha_emision), 'dd MMM yyyy', { locale: es })
                          : '-'}
                      </td>
                      <td>{getEstadoBadgePO(attrs.estado)}</td>
                      <td>
                        <Link
                          href={`/crm/compras/ordenes-compra/${po.id || po.documentId}`}
                          className="btn btn-sm btn-outline-primary"
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  )

  const renderOportunidadesTab = () => (
    <Card>
      <CardHeader>
        <h5 className="mb-0">Oportunidades</h5>
      </CardHeader>
      <CardBody>
        <Alert variant="info">
          <p className="mb-0">Funcionalidad de oportunidades próximamente disponible.</p>
        </Alert>
      </CardBody>
    </Card>
  )

  const renderRfqsTab = () => (
    <Card>
      <CardHeader className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">
          RFQs Enviadas a esta Empresa (como Proveedor)
          {rfqs.length > 0 && (
            <Badge bg="primary" className="ms-2">{rfqs.length}</Badge>
          )}
        </h5>
        <Link href="/crm/compras/rfqs" className="btn btn-primary btn-sm">
          Ver Todas
        </Link>
      </CardHeader>
      <CardBody>
        {loadingRfqs ? (
          <div className="text-center py-4">
            <Spinner animation="border" size="sm" />
            <p className="text-muted mt-2 mb-0">Cargando RFQs...</p>
          </div>
        ) : rfqs.length === 0 ? (
          <Alert variant="info">
            <p className="mb-0">No se han enviado solicitudes de cotización (RFQ) a esta empresa como proveedor.</p>
          </Alert>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>Número RFQ</th>
                  <th>Nombre</th>
                  <th>Fecha Solicitud</th>
                  <th>Estado</th>
                  <th>Productos</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rfqs.map((rfq: any) => {
                  const attrs = rfq.attributes || rfq
                  const productos = attrs.productos?.data || attrs.productos || []
                  return (
                    <tr key={rfq.id || rfq.documentId}>
                      <td>{attrs.numero_rfq || '-'}</td>
                      <td>
                        <Link
                          href={`/crm/compras/rfqs/${rfq.id || rfq.documentId}`}
                          className="text-decoration-none fw-semibold"
                        >
                          {attrs.nombre || 'Sin nombre'}
                        </Link>
                      </td>
                      <td>
                        {attrs.fecha_solicitud
                          ? format(new Date(attrs.fecha_solicitud), 'dd MMM yyyy', { locale: es })
                          : '-'}
                      </td>
                      <td>
                        <Badge bg={attrs.estado === 'sent' ? 'info' : attrs.estado === 'converted' ? 'success' : 'secondary'}>
                          {attrs.estado || 'draft'}
                        </Badge>
                      </td>
                      <td>
                        <span className="text-muted">{productos.length} producto{productos.length !== 1 ? 's' : ''}</span>
                      </td>
                      <td>
                        <Link
                          href={`/crm/compras/rfqs/${rfq.id || rfq.documentId}`}
                          className="btn btn-sm btn-outline-primary"
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  )

  const renderCotizacionesRecibidasTab = () => (
    <Card>
      <CardHeader className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">
          Cotizaciones Enviadas por esta Empresa (como Proveedor)
          {cotizacionesRecibidas.length > 0 && (
            <Badge bg="primary" className="ms-2">{cotizacionesRecibidas.length}</Badge>
          )}
        </h5>
        <Link href="/crm/compras/cotizaciones" className="btn btn-primary btn-sm">
          Ver Todas
        </Link>
      </CardHeader>
      <CardBody>
        {loadingCotizacionesRecibidas ? (
          <div className="text-center py-4">
            <Spinner animation="border" size="sm" />
            <p className="text-muted mt-2 mb-0">Cargando cotizaciones...</p>
          </div>
        ) : cotizacionesRecibidas.length === 0 ? (
          <Alert variant="info">
            <p className="mb-0">Esta empresa no ha enviado cotizaciones aún.</p>
          </Alert>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>RFQ</th>
                  <th>Monto Total</th>
                  <th>Fecha Recepción</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cotizacionesRecibidas.map((cot: any) => {
                  const attrs = cot.attributes || cot
                  const rfq = attrs.rfq?.data || attrs.rfq
                  const rfqAttrs = rfq?.attributes || rfq || {}
                  return (
                    <tr key={cot.id || cot.documentId}>
                      <td>{attrs.numero_cotizacion || '-'}</td>
                      <td>
                        {rfqAttrs.numero_rfq || rfqAttrs.nombre ? (
                          <Link
                            href={`/crm/compras/rfqs/${rfq?.id || rfq?.documentId}`}
                            className="text-decoration-none"
                          >
                            {rfqAttrs.numero_rfq || rfqAttrs.nombre}
                          </Link>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td>
                        {attrs.precio_total || attrs.monto_total
                          ? `${attrs.moneda || 'CLP'} ${Number(attrs.precio_total || attrs.monto_total).toLocaleString()}`
                          : '-'}
                      </td>
                      <td>
                        {attrs.fecha_recepcion
                          ? format(new Date(attrs.fecha_recepcion), 'dd MMM yyyy', { locale: es })
                          : '-'}
                      </td>
                      <td>
                        <Badge bg={attrs.estado === 'aprobada' ? 'success' : attrs.estado === 'rechazada' ? 'danger' : 'warning'}>
                          {attrs.estado || 'pendiente'}
                        </Badge>
                      </td>
                      <td>
                        <Link
                          href={`/crm/compras/cotizaciones/${cot.id || cot.documentId}`}
                          className="btn btn-sm btn-outline-primary"
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  )

  return (
    <Container fluid>
      <PageBreadcrumb title={empresaNombre} subtitle="CRM · Empresas" />
      
      <div className="mb-3">
        <Link href="/crm/empresas" className="btn btn-outline-secondary btn-sm">
          <LuArrowLeft className="me-1" />
          Volver a Empresas
        </Link>
      </div>

      {/* Información Principal */}
      <Card className="mb-4">
        <CardBody>
          <Row>
            <Col md="auto">
              <div className="avatar-lg rounded-circle bg-primary-subtle d-flex align-items-center justify-content-center">
                <LuBuilding2 className="text-primary" size={40} />
              </div>
            </Col>
            <Col>
              <div className="d-flex align-items-start justify-content-between mb-2">
                <div>
                  <h4 className="mb-1">{empresaNombre}</h4>
                  {empresa.razon_social && empresa.razon_social !== empresaNombre && (
                    <p className="text-muted mb-2">{empresa.razon_social}</p>
                  )}
                  {empresa.rut && (
                    <p className="text-muted mb-2">RUT: {empresa.rut}</p>
                  )}
                  <div className="d-flex gap-2 mb-2">
                    {getEstadoBadge(empresa.estado)}
                  </div>
                  <div className="d-flex gap-3 mt-2">
                    {emailPrincipal && (
                      <div className="d-flex align-items-center text-muted">
                        <LuMail className="me-1" size={16} />
                        <a href={`mailto:${emailPrincipal.email}`} className="text-reset">
                          {emailPrincipal.email}
                        </a>
                      </div>
                    )}
                    {telefonoPrincipal && (
                      <div className="d-flex align-items-center text-muted">
                        <LuPhone className="me-1" size={16} />
                        {telefonoPrincipal.telefono_raw}
                      </div>
                    )}
                    {empresa.website && (
                      <div className="d-flex align-items-center text-muted">
                        <LuGlobe className="me-1" size={16} />
                        <a href={empresa.website} target="_blank" rel="noopener noreferrer" className="text-reset">
                          Sitio Web
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </CardBody>
      </Card>

      {/* Tabs */}
      <Card>
        <CardHeader>
          <Nav variant="tabs" defaultActiveKey="informacion">
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
                Contactos
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink
                active={activeTab === 'oportunidades'}
                onClick={() => setActiveTab('oportunidades')}
                style={{ cursor: 'pointer' }}
              >
                Oportunidades
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink
                active={activeTab === 'rfqs'}
                onClick={() => setActiveTab('rfqs')}
                style={{ cursor: 'pointer' }}
              >
                RFQs Enviadas
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink
                active={activeTab === 'cotizaciones-recibidas'}
                onClick={() => setActiveTab('cotizaciones-recibidas')}
                style={{ cursor: 'pointer' }}
              >
                Cotizaciones Enviadas
              </NavLink>
            </NavItem>
            {empresa?.es_empresa_propia && (
              <NavItem>
                <NavLink
                  active={activeTab === 'ordenes-compra'}
                  onClick={() => setActiveTab('ordenes-compra')}
                  style={{ cursor: 'pointer' }}
                >
                  Órdenes de Compra
                </NavLink>
              </NavItem>
            )}
          </Nav>
        </CardHeader>
        <CardBody>
          {activeTab === 'informacion' && renderInformacionTab()}
          {activeTab === 'contactos' && renderContactosTab()}
          {activeTab === 'oportunidades' && renderOportunidadesTab()}
          {activeTab === 'rfqs' && renderRfqsTab()}
          {activeTab === 'cotizaciones-recibidas' && renderCotizacionesRecibidasTab()}
          {activeTab === 'ordenes-compra' && renderOrdenesCompraTab()}
        </CardBody>
      </Card>
    </Container>
  )
}
