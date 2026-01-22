'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Container, Card, CardBody, CardHeader, Button, Row, Col, Alert, Spinner, Badge, Table, Form, FormGroup, FormLabel, FormControl } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { LuArrowLeft, LuUpload, LuFileText, LuDownload, LuCheck, LuClock, LuTruck } from 'react-icons/lu'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useNotificationContext } from '@/context/useNotificationContext'

interface POType {
  id: string | number
  documentId?: string
  numero_po?: string
  monto_total?: number
  moneda?: string
  fecha_emision?: string
  fecha_entrega_esperada?: string
  fecha_entrega_real?: string
  estado?: string
  empresa?: any
  cotizacion?: any
  items?: Array<any>
  factura?: any
  despacho?: any
  notas?: string
  createdAt?: string
}

const getEstadoBadge = (estado?: string) => {
  const estados: Record<string, { variant: string; label: string; icon: any }> = {
    pendiente: { variant: 'warning', label: 'Pendiente', icon: LuClock },
    confirmada: { variant: 'info', label: 'Confirmada', icon: LuCheck },
    en_transito: { variant: 'primary', label: 'En Tránsito', icon: LuTruck },
    recibida: { variant: 'success', label: 'Recibida', icon: LuCheck },
    cancelada: { variant: 'danger', label: 'Cancelada', icon: LuFileText },
  }
  const estadoData = estados[estado || 'pendiente'] || estados.pendiente
  const Icon = estadoData.icon
  return (
    <Badge bg={estadoData.variant} className="d-flex align-items-center gap-1" style={{ width: 'fit-content' }}>
      <Icon size={14} />
      {estadoData.label}
    </Badge>
  )
}

export default function PODetailPage() {
  const params = useParams()
  const router = useRouter()
  const { showNotification } = useNotificationContext()
  const poId = params.id as string
  
  const [po, setPo] = useState<POType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploadingFactura, setUploadingFactura] = useState(false)
  const [uploadingDespacho, setUploadingDespacho] = useState(false)
  const facturaFileRef = useRef<HTMLInputElement>(null)
  const despachoFileRef = useRef<HTMLInputElement>(null)
  
  useEffect(() => {
    loadPO()
  }, [poId])
  
  const loadPO = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/compras/ordenes-compra/${poId}`)
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Error al cargar orden de compra')
      }
      
      setPo(result.data)
    } catch (err: any) {
      console.error('Error al cargar orden de compra:', err)
      setError(err.message || 'Error al cargar orden de compra')
    } finally {
      setLoading(false)
    }
  }
  
  const handleFileUpload = async (type: 'factura' | 'despacho', file: File) => {
    if (!po) return
    
    const setUploading = type === 'factura' ? setUploadingFactura : setUploadingDespacho
    setUploading(true)
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', type)
      
      const response = await fetch(`/api/compras/ordenes-compra/${poId}/upload`, {
        method: 'POST',
        body: formData,
      })
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || `Error al subir ${type}`)
      }
      
      showNotification({
        title: 'Éxito',
        message: `${type === 'factura' ? 'Factura' : 'Despacho'} subido exitosamente`,
        variant: 'success',
      })
      
      loadPO()
    } catch (err: any) {
      showNotification({
        title: 'Error',
        message: err.message || `Error al subir ${type}`,
        variant: 'danger',
      })
    } finally {
      setUploading(false)
    }
  }
  
  const handleFacturaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload('factura', file)
    }
  }
  
  const handleDespachoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload('despacho', file)
    }
  }
  
  if (loading) {
    return (
      <Container fluid>
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="text-muted mt-2">Cargando orden de compra...</p>
        </div>
      </Container>
    )
  }
  
  if (error || !po) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Orden de Compra" subtitle="CRM · Compras" />
        <Alert variant="danger">
          {error || 'Orden de compra no encontrada'}
        </Alert>
        <Button variant="primary" onClick={() => router.push('/crm/compras/ordenes-compra')}>
          <LuArrowLeft className="me-1" />
          Volver al listado
        </Button>
      </Container>
    )
  }
  
  const attrs = (po as any).attributes || po
  const empresa = attrs.empresa?.data || attrs.empresa
  const cotizacion = attrs.cotizacion_recibida?.data || attrs.cotizacion?.data || attrs.cotizacion || attrs.cotizacion_recibida
  const items = attrs.items || []
  const estado = attrs.estado || 'pendiente'
  const empAttrs = empresa?.attributes || empresa || {}
  const cotAttrs = cotizacion?.attributes || cotizacion || {}
  const factura = attrs.factura?.data || attrs.factura || attrs.attributes?.factura
  const despacho = attrs.orden_despacho?.data || attrs.despacho?.data || attrs.despacho || attrs.orden_despacho || attrs.attributes?.orden_despacho
  const cotizacionId = cotizacion?.id || cotizacion?.documentId
  
  return (
    <Container fluid>
      <PageBreadcrumb 
        title={`PO ${attrs.numero_po || ''}`.trim() || 'Orden de Compra'} 
        subtitle="CRM · Compras"
      />
      
      <div className="d-flex justify-content-between align-items-center mb-3">
        <Button variant="secondary" onClick={() => router.push('/crm/compras/ordenes-compra')}>
          <LuArrowLeft className="me-1" />
          Volver
        </Button>
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
                    <strong>Número PO:</strong> {attrs.numero_po || '-'}
                  </p>
                  <p className="mb-2">
                    <strong>Proveedor:</strong> {empAttrs.empresa_nombre || empAttrs.nombre || '-'}
                  </p>
                  <p className="mb-2">
                    <strong>Cotización:</strong>{' '}
                    {cotAttrs.numero_cotizacion ? (
                      <Button
                        variant="link"
                        className="p-0"
                        onClick={() => router.push(`/crm/compras/cotizaciones/${cotizacionId}`)}
                      >
                        {cotAttrs.numero_cotizacion}
                      </Button>
                    ) : (
                      '-'
                    )}
                  </p>
                  <p className="mb-2">
                    <strong>Fecha de Emisión:</strong>{' '}
                    {attrs.fecha_emision
                      ? format(new Date(attrs.fecha_emision), 'dd MMMM yyyy', { locale: es })
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
                    <strong>Entrega Esperada:</strong>{' '}
                    {attrs.fecha_entrega_esperada
                      ? format(new Date(attrs.fecha_entrega_esperada), 'dd MMMM yyyy', { locale: es })
                      : '-'}
                  </p>
                  {attrs.fecha_entrega_real && (
                    <p className="mb-2">
                      <strong>Entrega Real:</strong>{' '}
                      {format(new Date(attrs.fecha_entrega_real), 'dd MMMM yyyy', { locale: es })}
                    </p>
                  )}
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
              <h5 className="mb-0">Items de la Orden ({items.length})</h5>
            </CardHeader>
            <CardBody>
              {items.length === 0 ? (
                <p className="text-muted">No hay items en esta orden</p>
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
                      const itemAttrs = item.attributes || item
                      const producto = itemAttrs.producto?.data || itemAttrs.producto
                      const prodAttrs = producto?.attributes || producto || {}
                      return (
                        <tr key={idx}>
                          <td>{prodAttrs.nombre_libro || prodAttrs.nombre || 'Producto'}</td>
                          <td>{itemAttrs.cantidad || '-'}</td>
                          <td>
                            {itemAttrs.precio_unitario
                              ? `${attrs.moneda || 'CLP'} ${Number(itemAttrs.precio_unitario).toLocaleString()}`
                              : '-'}
                          </td>
                          <td>
                            {itemAttrs.subtotal
                              ? `${attrs.moneda || 'CLP'} ${Number(itemAttrs.subtotal).toLocaleString()}`
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
          <Card className="mb-4">
            <CardHeader>
              <h5 className="mb-0">Documentos</h5>
            </CardHeader>
            <CardBody>
              <FormGroup className="mb-3">
                <FormLabel>Factura</FormLabel>
                {factura ? (
                  <div>
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <LuFileText size={20} />
                      <span>{factura.name || 'Factura'}</span>
                    </div>
                    {factura.url && (
                      <Button
                        variant="link"
                        size="sm"
                        href={factura.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <LuDownload className="me-1" />
                        Descargar
                      </Button>
                    )}
                  </div>
                ) : (
                  <div>
                    <FormControl
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      ref={facturaFileRef}
                      onChange={handleFacturaChange}
                      disabled={uploadingFactura}
                    />
                    {uploadingFactura && (
                      <Spinner size="sm" className="mt-2" />
                    )}
                  </div>
                )}
              </FormGroup>
              
              <FormGroup>
                <FormLabel>Despacho/Guía de Despacho</FormLabel>
                {despacho ? (
                  <div>
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <LuFileText size={20} />
                      <span>{despacho.name || 'Despacho'}</span>
                    </div>
                    {despacho.url && (
                      <Button
                        variant="link"
                        size="sm"
                        href={despacho.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <LuDownload className="me-1" />
                        Descargar
                      </Button>
                    )}
                  </div>
                ) : (
                  <div>
                    <FormControl
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      ref={despachoFileRef}
                      onChange={handleDespachoChange}
                      disabled={uploadingDespacho}
                    />
                    {uploadingDespacho && (
                      <Spinner size="sm" className="mt-2" />
                    )}
                  </div>
                )}
              </FormGroup>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </Container>
  )
}

