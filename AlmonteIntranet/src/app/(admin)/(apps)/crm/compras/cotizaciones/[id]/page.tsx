'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Container, Card, CardBody, CardHeader, Button, Row, Col, Alert, Spinner, Badge, Table, Modal, Form } from 'react-bootstrap'
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
    aprobada: { variant: 'success', label: 'Aprobada' },
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
  const [showEmpresaModal, setShowEmpresaModal] = useState(false)
  const [empresasPropias, setEmpresasPropias] = useState<any[]>([])
  const [loadingEmpresas, setLoadingEmpresas] = useState(false)
  const [empresaPropiaSeleccionada, setEmpresaPropiaSeleccionada] = useState<string | number | null>(null)
  const [procesandoAccion, setProcesandoAccion] = useState(false)
  
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
  
  const handleAbrirModalEmpresa = async () => {
    if (!cotizacion) return
    
    console.log('[Cotización] Abriendo modal de empresa propia')
    
    setShowEmpresaModal(true)
    setLoadingEmpresas(true)
    setEmpresaPropiaSeleccionada(null)
    
    try {
      // Cargar empresas propias
      const url = '/api/crm/empresas?es_empresa_propia=true&pagination[pageSize]=100'
      console.log('[Cotización] Cargando empresas propias desde:', url)
      
      const response = await fetch(url)
      const result = await response.json()
      
      console.log('[Cotización] Resultado de cargar empresas propias:', { 
        success: result.success, 
        count: Array.isArray(result.data) ? result.data.length : (result.data ? 1 : 0),
        data: result.data 
      })
      
      if (result.success && result.data) {
        const empresas = Array.isArray(result.data) ? result.data : [result.data]
        setEmpresasPropias(empresas)
        
        console.log('[Cotización] Empresas propias cargadas:', empresas.length)
        
        // Si solo hay una empresa propia, seleccionarla automáticamente
        if (empresas.length === 1) {
          const empresa = empresas[0]
          const empresaId = empresa.documentId || empresa.id
          setEmpresaPropiaSeleccionada(empresaId)
          console.log('[Cotización] Empresa única seleccionada automáticamente:', empresaId)
        }
      } else {
        console.warn('[Cotización] No se encontraron empresas propias')
        showNotification({
          title: 'Advertencia',
          message: 'No se encontraron empresas propias. Se usará la primera disponible automáticamente.',
          variant: 'warning',
        })
      }
    } catch (err: any) {
      console.error('[Cotización] Error al cargar empresas propias:', err)
      showNotification({
        title: 'Error',
        message: 'Error al cargar empresas propias. Se intentará crear la PO sin selección.',
        variant: 'warning',
      })
    } finally {
      setLoadingEmpresas(false)
    }
  }
  
  const handleCrearPO = async (empresaPropiaId?: string | number) => {
    if (!cotizacion) return
    
    setCreatingPO(true)
    setShowEmpresaModal(false)
    
    try {
      const body: any = {}
      if (empresaPropiaId) {
        body.empresa_propia_id = empresaPropiaId
      }
      
      const response = await fetch(`/api/compras/cotizaciones/${cotizacionId}/crear-po`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
      setEmpresaPropiaSeleccionada(null)
    }
  }
  
  const handleConfirmarCrearPO = () => {
    if (empresaPropiaSeleccionada) {
      handleCrearPO(empresaPropiaSeleccionada)
    } else {
      // Si no hay selección, crear sin empresa específica (usará la primera disponible)
      handleCrearPO()
    }
  }
  
  const handleAceptarCotizacion = async () => {
    if (!cotizacion) return
    
    setProcesandoAccion(true)
    try {
      const cotizacionIdFinal = cotizacion.documentId || cotizacion.id || cotizacionId
      
      console.log('[Cotización] Aceptando cotización:', { cotizacionIdFinal, cotizacionId })
      
      const response = await fetch(`/api/compras/cotizaciones/${cotizacionIdFinal}/aprobar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      })
      
      const result = await response.json()
      
      console.log('[Cotización] Resultado de aprobar:', result)
      
      if (!result.success) {
        throw new Error(result.error || 'Error al aceptar cotización')
      }
      
      showNotification({
        title: 'Éxito',
        message: result.message || 'Cotización aprobada exitosamente',
        variant: 'success',
      })
      
      // Recargar la cotización para actualizar el estado
      await loadCotizacion()
      
      console.log('[Cotización] Cotización recargada después de aprobar')
    } catch (err: any) {
      console.error('[Cotización] Error al aceptar:', err)
      showNotification({
        title: 'Error',
        message: err.message || 'Error al aceptar cotización',
        variant: 'danger',
      })
    } finally {
      setProcesandoAccion(false)
    }
  }
  
  const handleRechazarCotizacion = async () => {
    if (!cotizacion) return
    
    // Pedir confirmación
    const motivo = prompt('Ingrese el motivo del rechazo (opcional):')
    if (motivo === null) return // Usuario canceló
    
    setProcesandoAccion(true)
    try {
      const cotizacionIdFinal = cotizacion.documentId || cotizacion.id || cotizacionId
      
      const response = await fetch(`/api/compras/cotizaciones/${cotizacionIdFinal}/rechazar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo: motivo || undefined }),
      })
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Error al rechazar cotización')
      }
      
      showNotification({
        title: 'Éxito',
        message: result.message || 'Cotización rechazada exitosamente',
        variant: 'success',
      })
      
      // Recargar la cotización para actualizar el estado
      await loadCotizacion()
    } catch (err: any) {
      showNotification({
        title: 'Error',
        message: err.message || 'Error al rechazar cotización',
        variant: 'danger',
      })
    } finally {
      setProcesandoAccion(false)
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
  
  // Items pueden venir de dos lugares:
  // 1. Directamente en attrs.items (si existe un componente repeatable)
  // 2. Generados desde productos de la RFQ (si no hay items directos)
  let items = attrs.items || []
  
  // Si no hay items pero hay RFQ con productos, generar items desde productos de la RFQ
  if (items.length === 0 && rfq) {
    const rfqAttrs = rfq?.attributes || rfq
    let productosRFQ: any[] = []
    
    if (rfqAttrs?.productos) {
      if (Array.isArray(rfqAttrs.productos)) {
        productosRFQ = rfqAttrs.productos
      } else if (rfqAttrs.productos.data) {
        if (Array.isArray(rfqAttrs.productos.data)) {
          productosRFQ = rfqAttrs.productos.data
        } else if (rfqAttrs.productos.data && typeof rfqAttrs.productos.data === 'object') {
          productosRFQ = [rfqAttrs.productos.data]
        }
      }
    }
    
    // Obtener cantidades de la RFQ
    const productosCantidades = rfqAttrs.productos_cantidades
      ? (typeof rfqAttrs.productos_cantidades === 'string' 
          ? JSON.parse(rfqAttrs.productos_cantidades) 
          : rfqAttrs.productos_cantidades)
      : {}
    
    // Generar items desde productos de la RFQ
    items = productosRFQ.map((producto: any) => {
      const prodAttrs = producto.attributes || producto
      const productoId = producto.documentId || producto.id
      const cantidad = productosCantidades[productoId] || productosCantidades[String(productoId)] || 1
      const precioUnitario = attrs.precio_unitario || attrs.monto_unitario || 0
      
      return {
        producto: producto,
        producto_nombre: prodAttrs.nombre_libro || prodAttrs.nombre || 'Producto',
        cantidad: cantidad,
        precio_unitario: precioUnitario,
        subtotal: precioUnitario ? Number(precioUnitario) * Number(cantidad) : null,
        precio_total: precioUnitario ? Number(precioUnitario) * Number(cantidad) : null,
      }
    })
  }
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
        {estado === 'aprobada' && (
          <Button variant="primary" onClick={handleAbrirModalEmpresa} disabled={creatingPO}>
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
                    <strong>Precio Unitario:</strong>{' '}
                    {attrs.precio_unitario || attrs.monto_unitario
                      ? `${attrs.moneda || 'CLP'} ${Number(attrs.precio_unitario || attrs.monto_unitario).toLocaleString()}`
                      : '-'}
                  </p>
                  <p className="mb-2">
                    <strong>Precio Total:</strong>{' '}
                    {attrs.precio_total || attrs.monto_total
                      ? `${attrs.moneda || 'CLP'} ${Number(attrs.precio_total || attrs.monto_total).toLocaleString()}`
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
                        {attrs.precio_total || attrs.monto_total
                          ? `${attrs.moneda || 'CLP'} ${Number(attrs.precio_total || attrs.monto_total).toLocaleString()}`
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
                    <Button 
                      variant="success" 
                      size="sm"
                      onClick={handleAceptarCotizacion}
                      disabled={procesandoAccion}
                    >
                      <LuCheck className="me-1" />
                      {procesandoAccion ? 'Procesando...' : 'Aceptar Cotización'}
                    </Button>
                    <Button 
                      variant="danger" 
                      size="sm"
                      onClick={handleRechazarCotizacion}
                      disabled={procesandoAccion}
                    >
                      {procesandoAccion ? 'Procesando...' : 'Rechazar Cotización'}
                    </Button>
                  </>
                )}
                {estado === 'aprobada' && (
                  <Button variant="primary" onClick={handleAbrirModalEmpresa} disabled={creatingPO}>
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
      
      {/* Modal de Selección de Empresa Propia */}
      <Modal show={showEmpresaModal} onHide={() => setShowEmpresaModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Seleccionar Empresa Compradora</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-muted mb-3">
            Selecciona la empresa propia (Almonte, Moraleja, Escolar) que realizará la compra. 
            Los datos de facturación de esta empresa se usarán en la orden de compra.
          </p>
          
          {loadingEmpresas ? (
            <div className="text-center py-4">
              <Spinner animation="border" variant="primary" />
              <p className="text-muted mt-2">Cargando empresas...</p>
            </div>
          ) : empresasPropias.length === 0 ? (
            <Alert variant="warning">
              No se encontraron empresas propias. Se usará la primera disponible automáticamente.
            </Alert>
          ) : (
            <Form>
              {empresasPropias.map((empresa: any) => {
                const empAttrs = empresa.attributes || empresa
                const empresaId = empresa.documentId || empresa.id
                const empresaNombre = empAttrs.empresa_nombre || empAttrs.nombre || 'Empresa'
                const razonSocial = empAttrs.razon_social || ''
                const rut = empAttrs.rut || ''
                
                return (
                  <div key={empresaId} className="mb-3">
                    <Form.Check
                      type="radio"
                      id={`empresa-${empresaId}`}
                      name="empresaPropia"
                      label={
                        <div>
                          <strong>{empresaNombre}</strong>
                          {razonSocial && (
                            <small className="text-muted d-block">{razonSocial}</small>
                          )}
                          {rut && (
                            <small className="text-muted d-block">RUT: {rut}</small>
                          )}
                        </div>
                      }
                      checked={empresaPropiaSeleccionada === empresaId}
                      onChange={() => setEmpresaPropiaSeleccionada(empresaId)}
                    />
                  </div>
                )
              })}
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEmpresaModal(false)}>
            Cancelar
          </Button>
          <Button 
            variant="primary" 
            onClick={handleConfirmarCrearPO}
            disabled={loadingEmpresas || creatingPO}
          >
            <LuShoppingCart className="me-1" />
            {creatingPO ? 'Creando...' : 'Crear Orden de Compra'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  )
}

