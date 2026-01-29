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
    emitida: { variant: 'secondary', label: 'Emitida', icon: LuFileText },
    confirmada: { variant: 'info', label: 'Confirmada', icon: LuCheck },
    en_proceso: { variant: 'primary', label: 'En Proceso', icon: LuClock },
    despachada: { variant: 'primary', label: 'Despachada', icon: LuTruck },
    en_envio: { variant: 'warning', label: 'En Envío', icon: LuTruck },
    recibida: { variant: 'success', label: 'Recibida', icon: LuCheck },
    recibida_confirmada: { variant: 'success', label: 'Recibida y Confirmada', icon: LuCheck },
    facturada: { variant: 'success', label: 'Facturada', icon: LuCheck },
    cancelada: { variant: 'danger', label: 'Cancelada', icon: LuFileText },
  }
  const estadoData = estados[estado || 'emitida'] || estados.emitida
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
  const [uploadingPago, setUploadingPago] = useState(false)
  const [confirmingRecepcion, setConfirmingRecepcion] = useState(false)
  const facturaFileRef = useRef<HTMLInputElement>(null)
  const despachoFileRef = useRef<HTMLInputElement>(null)
  const pagoFileRef = useRef<HTMLInputElement>(null)
  
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
  
  const handleFileUpload = async (type: 'factura' | 'despacho' | 'pago', file: File) => {
    if (!po) return
    
    const setUploading = type === 'factura' ? setUploadingFactura : type === 'despacho' ? setUploadingDespacho : setUploadingPago
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
      
      const typeLabels: Record<string, string> = {
        factura: 'Factura',
        despacho: 'Despacho',
        pago: 'Documento de Pago'
      }
      
      showNotification({
        title: 'Éxito',
        message: `${typeLabels[type] || type} subido exitosamente`,
        variant: 'success',
      })
      
      await loadPO()
      
      // Verificar si todos los documentos están listos para cambiar estado a "en_envio"
      await checkAndUpdateEstado()
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
  
  const checkAndUpdateEstado = async () => {
    if (!po) return
    
    try {
      const response = await fetch(`/api/compras/ordenes-compra/${poId}`)
      const result = await response.json()
      
      if (result.success && result.data) {
        const poData = result.data
        const attrs = poData.attributes || poData
        
        // Verificar documentos de múltiples formas (pueden estar en diferentes estructuras)
        const factura = attrs.factura?.data || attrs.factura || attrs.factura?.id
        const despacho = attrs.orden_despacho?.data || attrs.orden_despacho || attrs.orden_despacho?.id
        const pago = attrs.documento_pago?.data || attrs.documento_pago || attrs.documento_pago?.id
        
        const estadoActual = attrs.estado
        
        console.log('[checkAndUpdateEstado] Verificando documentos:', {
          factura: !!factura,
          despacho: !!despacho,
          pago: !!pago,
          estadoActual,
        })
        
        // Si todos los documentos están listos y el estado es "despachada" o anterior, cambiar a "en_envio"
        if (factura && despacho && pago && estadoActual !== 'en_envio' && estadoActual !== 'recibida_confirmada') {
          console.log('[checkAndUpdateEstado] Todos los documentos están listos, cambiando estado a "en_envio"')
          const updateResponse = await fetch(`/api/compras/ordenes-compra/${poId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado: 'en_envio' }),
          })
          
          if (updateResponse.ok) {
            showNotification({
              title: 'Estado Actualizado',
              message: 'La orden ha sido marcada como "En Envío" porque todos los documentos están completos',
              variant: 'info',
            })
            await loadPO()
          } else {
            const errorData = await updateResponse.json().catch(() => ({}))
            console.error('[checkAndUpdateEstado] Error al actualizar estado:', errorData)
          }
        }
      }
    } catch (err) {
      console.error('Error al verificar estado:', err)
    }
  }
  
  const handleConfirmarRecepcion = async () => {
    if (!po || !window.confirm('¿Confirmar que los productos han llegado físicamente y están en buen estado?')) {
      return
    }
    
    setConfirmingRecepcion(true)
    try {
      const response = await fetch(`/api/compras/ordenes-compra/${poId}/confirmar-recepcion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Error al confirmar recepción')
      }
      
      showNotification({
        title: 'Recepción Confirmada',
        message: 'Los productos han sido agregados al inventario',
        variant: 'success',
      })
      
      await loadPO()
    } catch (err: any) {
      showNotification({
        title: 'Error',
        message: err.message || 'Error al confirmar recepción',
        variant: 'danger',
      })
    } finally {
      setConfirmingRecepcion(false)
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
  
  const handlePagoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload('pago', file)
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
  
  // Extraer empresa (proveedor)
  const empresa = attrs.empresa?.data || attrs.empresa
  const empAttrs = empresa?.attributes || empresa || {}
  
  // Extraer cotización recibida
  const cotizacion = attrs.cotizacion_recibida?.data || attrs.cotizacion?.data || attrs.cotizacion || attrs.cotizacion_recibida
  const cotAttrs = cotizacion?.attributes || cotizacion || {}
  const cotizacionId = cotizacion?.id || cotizacion?.documentId
  
  // Extraer RFQ desde la cotización
  const rfq = cotAttrs.rfq?.data || cotAttrs.rfq
  const rfqAttrs = rfq?.attributes || rfq || {}
  
  // Extraer items: primero desde la cotización, si no desde el RFQ
  // items es un componente, viene directamente en cotAttrs.items
  let items: any[] = []
  
  // Intentar obtener items desde la cotización (componente)
  if (cotAttrs.items && Array.isArray(cotAttrs.items)) {
    items = cotAttrs.items
  }
  
  // Si no hay items en la cotización, generarlos desde el RFQ
  if (items.length === 0 && rfqAttrs.productos) {
    const productos = Array.isArray(rfqAttrs.productos?.data) 
      ? rfqAttrs.productos.data 
      : (rfqAttrs.productos?.data ? [rfqAttrs.productos.data] : (Array.isArray(rfqAttrs.productos) ? rfqAttrs.productos : []))
    
    // Obtener cantidades desde productos_cantidades (JSON field)
    const productosCantidades = rfqAttrs.productos_cantidades || {}
    
    items = productos.map((producto: any) => {
      const prodAttrs = producto.attributes || producto
      const productoId = producto.documentId || producto.id
      const cantidad = productosCantidades[productoId] || productosCantidades[String(productoId)] || 1
      const precioUnitario = cotAttrs.precio_unitario || 0
      
      return {
        producto: producto,
        producto_nombre: prodAttrs.nombre_libro || prodAttrs.nombre || 'Producto',
        cantidad: cantidad,
        precio_unitario: precioUnitario,
        subtotal: cantidad * precioUnitario,
      }
    })
  } else if (items.length > 0) {
    // Si hay items en la cotización, necesitamos buscar los productos completos desde el RFQ
    // porque en el componente items, producto es solo un string (ID)
    const productosRFQ = Array.isArray(rfqAttrs.productos?.data) 
      ? rfqAttrs.productos.data 
      : (rfqAttrs.productos?.data ? [rfqAttrs.productos.data] : (Array.isArray(rfqAttrs.productos) ? rfqAttrs.productos : []))
    
    // Crear un mapa de productos por ID para búsqueda rápida
    const productosMap = new Map()
    productosRFQ.forEach((prod: any) => {
      const prodId = prod.documentId || prod.id
      productosMap.set(String(prodId), prod)
      productosMap.set(String(prod.id), prod)
    })
    
    // Enriquecer items con información completa del producto
    items = items.map((item: any) => {
      const productoId = item.producto || item.producto_id
      const productoCompleto = productoId ? productosMap.get(String(productoId)) : null
      
      return {
        ...item,
        producto: productoCompleto || null,
        producto_nombre: item.nombre || item.producto_nombre || (productoCompleto ? (productoCompleto.attributes || productoCompleto).nombre_libro || (productoCompleto.attributes || productoCompleto).nombre : 'Producto'),
      }
    })
  }
  
  const estado = attrs.estado || 'pendiente'
  const factura = attrs.factura?.data || attrs.factura || attrs.attributes?.factura
  const despacho = attrs.orden_despacho?.data || attrs.despacho?.data || attrs.despacho || attrs.orden_despacho || attrs.attributes?.orden_despacho
  const pago = attrs.documento_pago?.data || attrs.documento_pago || attrs.attributes?.documento_pago
  
  // Extraer emails de la empresa proveedora
  const empresaEmails = empAttrs.emails?.data || empAttrs.emails || []
  const emailPrincipal = Array.isArray(empresaEmails) && empresaEmails.length > 0
    ? (empresaEmails[0].attributes || empresaEmails[0]).email || empresaEmails[0].email
    : null
  
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
                    {empAttrs.empresa_nombre_corto && (
                      <span className="text-muted ms-2">({empAttrs.empresa_nombre_corto})</span>
                    )}
                  </p>
                  {emailPrincipal && (
                    <p className="mb-2">
                      <strong>Email Proveedor:</strong> {emailPrincipal}
                    </p>
                  )}
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
                      <th>SKU/ISBN</th>
                      <th>Cantidad</th>
                      <th>Precio Unitario</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item: any, idx: number) => {
                      // item puede venir directamente del componente o enriquecido
                      const producto = item.producto
                      const prodAttrs = producto?.attributes || producto || {}
                      
                      // Obtener nombre del producto (puede venir de diferentes lugares)
                      const nombreProducto = item.producto_nombre || item.nombre || prodAttrs.nombre_libro || prodAttrs.nombre || 'Producto'
                      
                      // Calcular subtotal si no existe
                      const cantidad = item.cantidad || 0
                      const precioUnitario = item.precio_unitario || 0
                      const subtotal = item.subtotal || item.total || (cantidad * precioUnitario)
                      
                      return (
                        <tr key={idx}>
                          <td>
                            <div>
                              <strong>{nombreProducto}</strong>
                              {prodAttrs.autor && (
                                <div className="text-muted small">{prodAttrs.autor}</div>
                              )}
                            </div>
                          </td>
                          <td>
                            {prodAttrs.sku && <div>{prodAttrs.sku}</div>}
                            {prodAttrs.isbn && (
                              <div className="text-muted small">ISBN: {prodAttrs.isbn}</div>
                            )}
                            {item.sku && !prodAttrs.sku && <div>{item.sku}</div>}
                            {!prodAttrs.sku && !prodAttrs.isbn && !item.sku && '-'}
                          </td>
                          <td>{cantidad || '-'}</td>
                          <td>
                            {precioUnitario > 0
                              ? `${attrs.moneda || 'CLP'} ${Number(precioUnitario).toLocaleString()}`
                              : '-'}
                          </td>
                          <td>
                            {subtotal > 0
                              ? `${attrs.moneda || 'CLP'} ${Number(subtotal).toLocaleString()}`
                              : '-'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th colSpan={4}>Total</th>
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
              
              <FormGroup className="mb-3">
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
              
              <FormGroup className="mb-3">
                <FormLabel>Documento de Pago</FormLabel>
                {pago ? (
                  <div>
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <LuFileText size={20} />
                      <span>{pago.name || 'Documento de Pago'}</span>
                    </div>
                    {pago.url && (
                      <Button
                        variant="link"
                        size="sm"
                        href={pago.url}
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
                      ref={pagoFileRef}
                      onChange={handlePagoChange}
                      disabled={uploadingPago}
                    />
                    {uploadingPago && (
                      <Spinner size="sm" className="mt-2" />
                    )}
                  </div>
                )}
              </FormGroup>
              
              {/* Botón para confirmar recepción */}
              {estado === 'en_envio' && (
                <div className="mt-3">
                  <Button
                    variant="success"
                    onClick={handleConfirmarRecepcion}
                    disabled={confirmingRecepcion}
                    className="w-100"
                  >
                    {confirmingRecepcion ? (
                      <>
                        <Spinner size="sm" className="me-2" />
                        Confirmando...
                      </>
                    ) : (
                      <>
                        <LuCheck className="me-1" />
                        Confirmar Recepción de Productos
                      </>
                    )}
                  </Button>
                  <small className="text-muted d-block mt-2">
                    Al confirmar, los productos serán agregados al inventario
                  </small>
                </div>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </Container>
  )
}

