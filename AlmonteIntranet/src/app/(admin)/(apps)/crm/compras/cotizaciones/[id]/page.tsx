'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Container, Card, CardBody, CardHeader, Button, Row, Col, Alert, Spinner, Badge, Table } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { LuArrowLeft, LuCheck, LuShoppingCart, LuFileText } from 'react-icons/lu'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useNotificationContext } from '@/context/useNotificationContext'

interface CotizacionRecibidaType {
  id: string | number
  documentId?: string
  numero_cotizacion?: string
  monto_total?: number
  moneda?: string
  fecha_recepcion?: string
  fecha_vencimiento?: string
  estado?: string
  empresa?: any
  rfq?: any
  items?: Array<any>
  notas?: string
  createdAt?: string
}

const getEstadoBadge = (estado?: string) => {
  const estados: Record<string, { variant: string; label: string }> = {
    pendiente: { variant: 'warning', label: 'Pendiente' },
    aceptada: { variant: 'success', label: 'Aceptada' },
    rechazada: { variant: 'danger', label: 'Rechazada' },
    convertida: { variant: 'info', label: 'Convertida' },
  }
  const estadoData = estados[estado || 'pendiente'] || estados.pendiente
  return <Badge bg={estadoData.variant}>{estadoData.label}</Badge>
}

export default function CotizacionRecibidaDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { showNotification } = useNotificationContext()
  const cotizacionId = params.id as string
  
  const [cotizacion, setCotizacion] = useState<CotizacionRecibidaType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creatingPO, setCreatingPO] = useState(false)
  
  useEffect(() => {
    loadCotizacion()
  }, [cotizacionId])
  
  const loadCotizacion = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/compras/cotizaciones/${cotizacionId}`)
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Error al cargar cotización')
      }
      
      setCotizacion(result.data)
    } catch (err: any) {
      console.error('Error al cargar cotización:', err)
      setError(err.message || 'Error al cargar cotización')
    } finally {
      setLoading(false)
    }
  }
  
  const handleCrearPO = async () => {
    if (!cotizacion) return
    
    setCreatingPO(true)
    try {
      const response = await fetch(`/api/compras/cotizaciones/${cotizacionId}/crear-po`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Error al crear orden de compra')
      }
      
      showNotification({
        title: 'Éxito',
        message: result.message || 'Orden de compra creada exitosamente',
        variant: 'success',
      })
      
      // Redirigir a la orden de compra creada
      if (result.data?.id || result.data?.documentId) {
        router.push(`/crm/compras/ordenes-compra/${result.data.id || result.data.documentId}`)
      } else {
        router.push('/crm/compras/ordenes-compra')
      }
    } catch (err: any) {
      showNotification({
        title: 'Error',
        message: err.message || 'Error al crear orden de compra',
        variant: 'danger',
      })
    } finally {
      setCreatingPO(false)
    }
  }
  
  if (loading) {
    return (
      <Container fluid>
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="text-muted mt-2">Cargando cotización...</p>
        </div>
      </Container>
    )
  }
  
  if (error || !cotizacion) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Cotización Recibida" subtitle="CRM · Compras" />
        <Alert variant="danger">
          {error || 'Cotización no encontrada'}
        </Alert>
        <Button variant="primary" onClick={() => router.push('/crm/compras/cotizaciones')}>
          <LuArrowLeft className="me-1" />
          Volver al listado
        </Button>
      </Container>
    )
  }
  
  const attrs = (cotizacion as any).attributes || cotizacion
  const empresa = attrs.empresa?.data || attrs.empresa
  const rfq = attrs.rfq?.data || attrs.rfq
  // items es un componente repeatable, no una relación, así que viene directamente en attrs
  const items = attrs.items || []
  const estado = attrs.estado || 'pendiente'
  const empAttrs = empresa?.attributes || empresa || {}
  const rfqAttrs = rfq?.attributes || rfq || {}
  const rfqId = rfq?.id || rfq?.documentId
  
  return (
    <Container fluid>
      <PageBreadcrumb 
        title={`Cotización ${attrs.numero_cotizacion || ''}`.trim() || 'Cotización Recibida'} 
        subtitle="CRM · Compras"
      />
      
      <div className="d-flex justify-content-between align-items-center mb-3">
        <Button variant="secondary" onClick={() => router.push('/crm/compras/cotizaciones')}>
          <LuArrowLeft className="me-1" />
          Volver
        </Button>
        {estado === 'aceptada' && (
          <Button variant="primary" onClick={handleCrearPO} disabled={creatingPO}>
            <LuShoppingCart className="me-1" />
            {creatingPO ? 'Creando...' : 'Crear Orden de Compra'}
          </Button>
        )}
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
                    <strong>Número:</strong> {attrs.numero_cotizacion || '-'}
                  </p>
                  <p className="mb-2">
                    <strong>Proveedor:</strong> {empAttrs.empresa_nombre || empAttrs.nombre || '-'}
                  </p>
                  <p className="mb-2">
                    <strong>RFQ:</strong>{' '}
                    {rfqAttrs.numero_rfq || rfqAttrs.nombre ? (
                      <Button
                        variant="link"
                        className="p-0"
                        onClick={() => router.push(`/crm/compras/rfqs/${rfqId}`)}
                      >
                        {rfqAttrs.numero_rfq || rfqAttrs.nombre}
                      </Button>
                    ) : (
                      '-'
                    )}
                  </p>
                  <p className="mb-2">
                    <strong>Fecha de Recepción:</strong>{' '}
                    {attrs.fecha_recepcion
                      ? format(new Date(attrs.fecha_recepcion), 'dd MMMM yyyy', { locale: es })
                      : '-'}
                  </p>
                </Col>
                <Col md={6}>
                  <p className="mb-2">
                    <strong>Monto Total:</strong>{' '}
                    {attrs.monto_total
                      ? `${attrs.moneda || 'CLP'} ${Number(attrs.monto_total).toLocaleString()}`
                      : '-'}
                  </p>
                  <p className="mb-2">
                    <strong>Moneda:</strong> {attrs.moneda || 'CLP'}
                  </p>
                  <p className="mb-2">
                    <strong>Fecha de Vencimiento:</strong>{' '}
                    {attrs.fecha_vencimiento
                      ? format(new Date(attrs.fecha_vencimiento), 'dd MMMM yyyy', { locale: es })
                      : '-'}
                  </p>
                  <p className="mb-2">
                    <strong>Estado:</strong> {getEstadoBadge(estado)}
                  </p>
                </Col>
              </Row>
              
              {attrs.notas && (
                <div className="mt-3">
                  <strong>Notas:</strong>
                  <p className="text-muted mt-1">{attrs.notas}</p>
                </div>
              )}
            </CardBody>
          </Card>
          
          <Card className="mb-4">
            <CardHeader>
              <h5 className="mb-0">Items de la Cotización ({items.length})</h5>
            </CardHeader>
            <CardBody>
              {items.length === 0 ? (
                <p className="text-muted">No hay items en esta cotización</p>
              ) : (
                <Table responsive>
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Cantidad</th>
                      <th>Precio Unitario</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item: any, idx: number) => {
                      // items es un componente repeatable, puede venir como objeto directo o con estructura
                      const producto = item.producto?.data || item.producto
                      const prodAttrs = producto?.attributes || producto || {}
                      const productoNombre = prodAttrs.nombre_libro || prodAttrs.nombre || item.producto_nombre || 'Producto'
                      return (
                        <tr key={idx}>
                          <td>{productoNombre}</td>
                          <td>{item.cantidad || '-'}</td>
                          <td>
                            {item.precio_unitario
                              ? `${attrs.moneda || 'CLP'} ${Number(item.precio_unitario).toLocaleString()}`
                              : '-'}
                          </td>
                          <td>
                            {item.subtotal || item.precio_total
                              ? `${attrs.moneda || 'CLP'} ${Number(item.subtotal || item.precio_total).toLocaleString()}`
                              : '-'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th colSpan={3}>Total</th>
                      <th>
                        {attrs.monto_total
                          ? `${attrs.moneda || 'CLP'} ${Number(attrs.monto_total).toLocaleString()}`
                          : '-'}
                      </th>
                    </tr>
                  </tfoot>
                </Table>
              )}
            </CardBody>
          </Card>
        </Col>
        
        <Col md={4}>
          <Card>
            <CardHeader>
              <h5 className="mb-0">Acciones</h5>
            </CardHeader>
            <CardBody>
              <div className="d-grid gap-2">
                {estado === 'pendiente' && (
                  <>
                    <Button variant="success" size="sm">
                      <LuCheck className="me-1" />
                      Aceptar Cotización
                    </Button>
                    <Button variant="danger" size="sm">
                      Rechazar Cotización
                    </Button>
                  </>
                )}
                {estado === 'aceptada' && (
                  <Button variant="primary" onClick={handleCrearPO} disabled={creatingPO}>
                    <LuShoppingCart className="me-1" />
                    {creatingPO ? 'Creando...' : 'Crear Orden de Compra'}
                  </Button>
                )}
                {estado === 'convertida' && (
                  <Alert variant="info" className="mb-0">
                    Esta cotización ya fue convertida en una orden de compra.
                  </Alert>
                )}
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </Container>
  )
}

