'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Container, Card, CardBody, CardHeader, Button, Row, Col, Alert, Spinner, Badge, Table, Tabs, Tab } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { LuArrowLeft, LuSend, LuPencil, LuFileText, LuCheck, LuX, LuClock } from 'react-icons/lu'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import RFQModal from '../components/RFQModal'
import { useNotificationContext } from '@/context/useNotificationContext'

interface RFQType {
  id: string | number
  documentId?: string
  numero_rfq?: string
  nombre?: string
  descripcion?: string
  fecha_solicitud?: string
  fecha_vencimiento?: string
  estado?: string
  moneda?: string
  notas_internas?: string
  empresas?: Array<any>
  productos?: Array<any>
  cotizaciones_recibidas?: Array<any>
  createdAt?: string
}

const getEstadoBadge = (estado?: string) => {
  const estados: Record<string, { variant: string; label: string; icon: any }> = {
    draft: { variant: 'secondary', label: 'Borrador', icon: LuFileText },
    sent: { variant: 'info', label: 'Enviada', icon: LuSend },
    received: { variant: 'warning', label: 'Recibida', icon: LuClock },
    converted: { variant: 'success', label: 'Convertida', icon: LuCheck },
    cancelled: { variant: 'danger', label: 'Cancelada', icon: LuX },
  }
  const estadoData = estados[estado || 'draft'] || estados.draft
  const Icon = estadoData.icon
  return (
    <Badge bg={estadoData.variant} className="d-flex align-items-center gap-1" style={{ width: 'fit-content' }}>
      <Icon size={14} />
      {estadoData.label}
    </Badge>
  )
}

export default function RFQDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { showNotification } = useNotificationContext()
  const rfqId = params.id as string
  
  const [rfq, setRfq] = useState<RFQType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rfqModal, setRfqModal] = useState<{ open: boolean; rfq: RFQType | null }>({ open: false, rfq: null })
  const [sending, setSending] = useState(false)
  
  useEffect(() => {
    loadRFQ()
  }, [rfqId])
  
  const loadRFQ = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/compras/rfqs/${rfqId}`)
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Error al cargar RFQ')
      }
      
      setRfq(result.data)
    } catch (err: any) {
      console.error('Error al cargar RFQ:', err)
      setError(err.message || 'Error al cargar RFQ')
    } finally {
      setLoading(false)
    }
  }
  
  const handleEnviarRFQ = async () => {
    if (!rfq) return
    
    setSending(true)
    try {
      const response = await fetch(`/api/compras/rfqs/${rfqId}/enviar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Error al enviar RFQ')
      }
      
      showNotification({
        title: 'Éxito',
        message: result.message || 'RFQ enviada exitosamente',
        variant: 'success',
      })
      
      loadRFQ()
    } catch (err: any) {
      showNotification({
        title: 'Error',
        message: err.message || 'Error al enviar RFQ',
        variant: 'danger',
      })
    } finally {
      setSending(false)
    }
  }
  
  if (loading) {
    return (
      <Container fluid>
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="text-muted mt-2">Cargando RFQ...</p>
        </div>
      </Container>
    )
  }
  
  if (error || !rfq) {
    return (
      <Container fluid>
        <PageBreadcrumb title="RFQ" subtitle="CRM · Compras" />
        <Alert variant="danger">
          {error || 'RFQ no encontrada'}
        </Alert>
        <Button variant="primary" onClick={() => router.push('/crm/compras/rfqs')}>
          <LuArrowLeft className="me-1" />
          Volver al listado
        </Button>
      </Container>
    )
  }
  
  const attrs = (rfq as any).attributes || rfq
  const empresas = attrs.empresas?.data || attrs.empresas || []
  const productos = attrs.productos?.data || attrs.productos || []
  const cotizaciones = attrs.cotizaciones_recibidas?.data || attrs.cotizaciones_recibidas || []
  const estado = attrs.estado || 'draft'
  
  return (
    <Container fluid>
      <PageBreadcrumb 
        title={attrs.nombre || 'RFQ'} 
        subtitle="CRM · Compras"
      />
      
      <div className="d-flex justify-content-between align-items-center mb-3">
        <Button variant="secondary" onClick={() => router.push('/crm/compras/rfqs')}>
          <LuArrowLeft className="me-1" />
          Volver
        </Button>
        <div className="d-flex gap-2">
          {estado === 'draft' && (
            <Button variant="info" onClick={handleEnviarRFQ} disabled={sending}>
              <LuSend className="me-1" />
              {sending ? 'Enviando...' : 'Enviar a Proveedores'}
            </Button>
          )}
          <Button variant="primary" onClick={() => setRfqModal({ open: true, rfq })}>
            <LuPencil className="me-1" />
            Editar
          </Button>
        </div>
      </div>
      
      <Row>
        <Col md={8}>
          <Card className="mb-4">
            <CardHeader>
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Información General</h5>
                {getEstadoBadge(estado)}
              </div>
            </CardHeader>
            <CardBody>
              <Row>
                <Col md={6}>
                  <p className="mb-2">
                    <strong>Número RFQ:</strong> {attrs.numero_rfq || '-'}
                  </p>
                  <p className="mb-2">
                    <strong>Fecha de Solicitud:</strong>{' '}
                    {attrs.fecha_solicitud
                      ? format(new Date(attrs.fecha_solicitud), 'dd MMMM yyyy', { locale: es })
                      : '-'}
                  </p>
                  <p className="mb-2">
                    <strong>Fecha de Vencimiento:</strong>{' '}
                    {attrs.fecha_vencimiento
                      ? format(new Date(attrs.fecha_vencimiento), 'dd MMMM yyyy', { locale: es })
                      : '-'}
                  </p>
                </Col>
                <Col md={6}>
                  <p className="mb-2">
                    <strong>Moneda:</strong> {attrs.moneda || 'CLP'}
                  </p>
                  <p className="mb-2">
                    <strong>Estado:</strong> {getEstadoBadge(estado)}
                  </p>
                  <p className="mb-2">
                    <strong>Creada:</strong>{' '}
                    {attrs.createdAt
                      ? format(new Date(attrs.createdAt), 'dd MMMM yyyy HH:mm', { locale: es })
                      : '-'}
                  </p>
                </Col>
              </Row>
              
              {attrs.descripcion && (
                <div className="mt-3">
                  <strong>Descripción:</strong>
                  <p className="text-muted mt-1">{attrs.descripcion}</p>
                </div>
              )}
              
              {attrs.notas_internas && (
                <div className="mt-3">
                  <strong>Notas Internas:</strong>
                  <p className="text-muted mt-1">{attrs.notas_internas}</p>
                </div>
              )}
            </CardBody>
          </Card>
          
          <Card className="mb-4">
            <CardHeader>
              <h5 className="mb-0">Proveedores ({empresas.length})</h5>
            </CardHeader>
            <CardBody>
              {empresas.length === 0 ? (
                <p className="text-muted">No hay proveedores asociados</p>
              ) : (
                <Table responsive>
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {empresas.map((emp: any, idx: number) => {
                      const empAttrs = emp.attributes || emp
                      return (
                        <tr key={idx}>
                          <td>{empAttrs.empresa_nombre || empAttrs.nombre || 'Empresa'}</td>
                          <td>
                            {empAttrs.emails && empAttrs.emails.length > 0
                              ? empAttrs.emails[0].email || '-'
                              : '-'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </Table>
              )}
            </CardBody>
          </Card>
          
          <Card className="mb-4">
            <CardHeader>
              <h5 className="mb-0">Productos ({productos.length})</h5>
            </CardHeader>
            <CardBody>
              {productos.length === 0 ? (
                <p className="text-muted">No hay productos asociados</p>
              ) : (
                <Table responsive>
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>SKU</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productos.map((prod: any, idx: number) => {
                      const prodAttrs = prod.attributes || prod
                      return (
                        <tr key={idx}>
                          <td>{prodAttrs.nombre_libro || prodAttrs.nombre || 'Producto'}</td>
                          <td>{prodAttrs.sku || '-'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </Table>
              )}
            </CardBody>
          </Card>
        </Col>
        
        <Col md={4}>
          <Card>
            <CardHeader>
              <h5 className="mb-0">Cotizaciones Recibidas</h5>
            </CardHeader>
            <CardBody>
              {cotizaciones.length === 0 ? (
                <p className="text-muted">No hay cotizaciones recibidas aún</p>
              ) : (
                <div>
                  <p className="mb-3">
                    <strong>{cotizaciones.length}</strong> cotización{cotizaciones.length !== 1 ? 'es' : ''} recibida{cotizaciones.length !== 1 ? 's' : ''}
                  </p>
                  {cotizaciones.slice(0, 5).map((cot: any, idx: number) => {
                    const cotAttrs = cot.attributes || cot
                    return (
                      <div key={idx} className="border rounded p-2 mb-2">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <strong>{cotAttrs.empresa?.data?.attributes?.empresa_nombre || cotAttrs.empresa?.data?.attributes?.nombre || 'Proveedor'}</strong>
                            <br />
                            <small className="text-muted">
                              {cotAttrs.monto_total
                                ? `${cotAttrs.moneda || 'CLP'} ${Number(cotAttrs.monto_total).toLocaleString()}`
                                : 'Sin monto'}
                            </small>
                          </div>
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => router.push(`/crm/compras/cotizaciones/${cot.id || cot.documentId}`)}
                          >
                            Ver
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                  {cotizaciones.length > 5 && (
                    <Button
                      variant="link"
                      className="p-0"
                      onClick={() => router.push(`/crm/compras/cotizaciones?rfq=${rfqId}`)}
                    >
                      Ver todas las cotizaciones
                    </Button>
                  )}
                </div>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
      
      {/* Modal de edición */}
      <RFQModal
        show={rfqModal.open}
        onHide={() => setRfqModal({ open: false, rfq: null })}
        rfq={rfqModal.rfq}
        onSuccess={() => {
          loadRFQ()
          setRfqModal({ open: false, rfq: null })
        }}
      />
    </Container>
  )
}

