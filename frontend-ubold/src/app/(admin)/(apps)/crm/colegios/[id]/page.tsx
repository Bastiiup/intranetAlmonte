'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Container, Card, CardHeader, CardBody, Alert, Spinner, Row, Col, Button, Badge } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { LuMapPin, LuPhone, LuMail, LuGlobe, LuUsers, LuEdit, LuArrowLeft } from 'react-icons/lu'
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

export default function ColegioDetailPage() {
  const params = useParams()
  const router = useRouter()
  const colegioId = params?.id as string

  const [loading, setLoading] = useState(true)
  const [loadingContacts, setLoadingContacts] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [colegio, setColegio] = useState<ColegioData | null>(null)
  const [contactos, setContactos] = useState<ContactoData[]>([])

  useEffect(() => {
    const fetchColegio = async () => {
      if (!colegioId) return

      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/crm/colegios/${colegioId}`)
        const result = await response.json()

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Error al cargar el colegio')
        }

        const colegioData = result.data
        const attrs = colegioData.attributes || colegioData

        // Transformar datos
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
        // No mostrar error si falla, solo no mostrar contactos
      } finally {
        setLoadingContacts(false)
      }
    }

    if (colegioId) {
      fetchContactos()
    }
  }, [colegioId])

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

  // Obtener representante comercial
  const asignacionComercial = colegio.cartera_asignaciones?.find(
    (ca) => ca.rol === 'comercial' && ca.estado === 'activa'
  )
  const representante = asignacionComercial?.ejecutivo?.nombre_completo

  // Obtener dirección principal
  const direccionPrincipal = colegio.direcciones?.find(
    (d) => d.tipo_direccion === 'Principal' || d.tipo_direccion === 'Colegio'
  ) || colegio.direcciones?.[0]

  return (
    <Container fluid>
      <PageBreadcrumb 
        title={colegio.colegio_nombre} 
        subtitle="CRM - Colegios"
        breadcrumbItems={[
          { label: 'CRM', path: '/crm' },
          { label: 'Colegios', path: '/crm/colegios' },
          { label: colegio.colegio_nombre, path: `/crm/colegios/${colegioId}` },
        ]}
      />

      {/* Botones de acción */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <Link href="/crm/colegios">
          <Button variant="outline-secondary" size="sm">
            <LuArrowLeft className="me-1" /> Volver a la lista
          </Button>
        </Link>
        <Link href={`/crm/colegios/${colegioId}/editar`}>
          <Button variant="primary" size="sm">
            <LuEdit className="me-1" /> Editar Colegio
          </Button>
        </Link>
      </div>

      <Row>
        {/* Información del Colegio */}
        <Col xl={8}>
          <Card className="mb-3">
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

              {/* Dirección */}
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

              {/* Teléfonos */}
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

              {/* Emails */}
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

              {/* Website */}
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

              {/* Representante Comercial */}
              {representante && (
                <div className="mb-3">
                  <label className="text-muted small">Representante Comercial</label>
                  <p className="mb-0">{representante}</p>
                </div>
              )}
            </CardBody>
          </Card>
        </Col>

        {/* Contactos Asociados */}
        <Col xl={4}>
          <Card>
            <CardHeader>
              <h5 className="mb-0 d-flex align-items-center">
                <LuUsers className="me-2" />
                Contactos Asociados
                <Badge bg="primary" className="ms-2">{contactos.length}</Badge>
              </h5>
            </CardHeader>
            <CardBody>
              {loadingContacts ? (
                <div className="text-center py-3">
                  <Spinner animation="border" size="sm" variant="primary" />
                  <p className="mt-2 text-muted small">Cargando contactos...</p>
                </div>
              ) : contactos.length === 0 ? (
                <p className="text-muted text-center py-3">
                  No hay contactos asociados a este colegio
                </p>
              ) : (
                <div className="list-group list-group-flush">
                  {contactos.map((contacto) => {
                    const emailPrincipal = contacto.emails?.find((e) => e.principal) || contacto.emails?.[0]
                    const telefonoPrincipal = contacto.telefonos?.find((t) => t.principal) || contacto.telefonos?.[0]
                    const trayectoriaActual = contacto.trayectorias?.find((t) => t.is_current) || contacto.trayectorias?.[0]

                    return (
                      <div key={contacto.id} className="list-group-item px-0 py-2 border-bottom">
                        <div className="d-flex justify-content-between align-items-start">
                          <div className="flex-grow-1">
                            <Link 
                              href={`/crm/contacts/${contacto.id}`}
                              className="text-decoration-none fw-semibold"
                            >
                              {contacto.nombre_completo || 'Sin nombre'}
                            </Link>
                            {trayectoriaActual?.cargo && (
                              <p className="mb-1 text-muted small">{trayectoriaActual.cargo}</p>
                            )}
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
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </Container>
  )
}
