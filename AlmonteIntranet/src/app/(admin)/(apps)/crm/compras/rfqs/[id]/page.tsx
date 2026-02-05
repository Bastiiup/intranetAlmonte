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
      
      // Verificar si la respuesta es exitosa antes de parsear JSON
      if (!response.ok) {
        const status = response.status ?? 0
        const statusText = response.statusText || 'No status text'
        let errorMessage = `Error HTTP ${status}: ${statusText}`
        let errorDetails: any = null
        
        // Intentar obtener mensaje de error del body
        try {
          const errorText = await response.text()
          if (errorText && errorText.trim().length > 0) {
            try {
              const errorData = JSON.parse(errorText)
              errorMessage = errorData.error || errorData.message || errorMessage
              errorDetails = errorData.details || null
            } catch {
              errorMessage = errorText || errorMessage
            }
          }
        } catch {
          // Si falla obtener el texto, usar el mensaje por defecto
        }
        
        // Mensajes específicos por código de estado (solo si no hay mensaje personalizado)
        if (status === 404 && errorMessage.includes('HTTP')) {
          errorMessage = errorDetails?.hint 
            ? `RFQ no encontrada. ${errorDetails.hint}`
            : `RFQ no encontrada con ID: ${rfqId}. Verifica que el ID sea correcto.`
        } else if (status === 500 && errorMessage.includes('HTTP')) {
          errorMessage = 'Error interno del servidor al cargar RFQ'
        }
        
        const error = new Error(errorMessage) as any
        error.status = status
        error.details = errorDetails
        throw error
      }
      
      // Parsear JSON de forma segura
      const contentType = response.headers.get('content-type')
      const contentLength = response.headers.get('content-length')
      
      let result: any = {}
      
      // Verificar que sea JSON válido
      if (contentType && contentType.includes('application/json')) {
        const text = await response.text()
        
        if (text && text.trim().length > 0) {
          try {
            result = JSON.parse(text)
          } catch (parseError) {
            throw new Error(`Error al parsear respuesta del servidor: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`)
          }
        }
      } else if (response.status !== 204 && contentLength !== '0') {
        throw new Error(`Respuesta no es JSON. Content-Type: ${contentType || 'unknown'}`)
      }
      
      if (!result.success) {
        throw new Error(result.error || 'Error al cargar RFQ')
      }
      
      if (!result.data) {
        throw new Error('RFQ no encontrada: la respuesta no contiene datos')
      }
      
      // Normalizar RFQ para asegurar que tenga id y documentId
      const rfqData = result.data
      const normalizedRFQ = {
        ...rfqData,
        id: rfqData.id || rfqData.documentId,
        documentId: rfqData.documentId || rfqData.id,
      }
      
      setRfq(normalizedRFQ)
    } catch (err: any) {
      // Construir mensaje de error con información útil
      const errorMessage = err.message || 'Error desconocido al cargar RFQ'
      const is404 = err.status === 404
      
      // Para errores 404 (RFQ no encontrada), usar console.warn en lugar de console.error
      // ya que es un caso esperado cuando la RFQ no existe
      if (is404) {
        console.warn(`[RFQ Detail] ⚠️ RFQ no encontrada - ID: ${rfqId || 'unknown'}`)
      } else {
        // Para otros errores, mostrar información detallada
        const logParts: string[] = [
          `[RFQ Detail] ❌ Error al cargar RFQ`,
          `  RFQ ID: ${rfqId || 'unknown'}`,
          `  Error: ${errorMessage}`,
        ]
        
        if (err.status) {
          logParts.push(`  HTTP Status: ${err.status}`)
        }
        
        // Agregar detalles si existen
        if (err.details) {
          if (typeof err.details === 'object') {
            if (err.details.hint) {
              logParts.push(`  Hint: ${err.details.hint}`)
            }
            if (err.details.isNumericId !== undefined) {
              logParts.push(`  ID Type: ${err.details.isNumericId ? 'numérico' : 'documentId'}`)
            }
          }
        }
        
        console.error(logParts.join('\n'))
      }
      
      // Usar el mensaje completo del error (que ya incluye detalles si están disponibles)
      setError(errorMessage)
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
      
      // Verificar si la respuesta es exitosa antes de parsear JSON
      if (!response.ok) {
        const status = response.status ?? 0
        let errorMessage = `Error HTTP ${status}`
        
        try {
          const errorText = await response.text()
          if (errorText && errorText.trim().length > 0) {
            try {
              const errorData = JSON.parse(errorText)
              errorMessage = errorData.error || errorData.message || errorMessage
            } catch {
              errorMessage = errorText || errorMessage
            }
          }
        } catch {
          // Si falla obtener el texto, usar el mensaje por defecto
        }
        
        throw new Error(errorMessage)
      }
      
      // Parsear JSON de forma segura
      const contentType = response.headers.get('content-type')
      let result: any = {}
      
      if (contentType && contentType.includes('application/json')) {
        const text = await response.text()
        if (text && text.trim().length > 0) {
          try {
            result = JSON.parse(text)
          } catch (parseError) {
            throw new Error(`Error al parsear respuesta del servidor: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`)
          }
        }
      }
      
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
      // Construir mensaje de log con información útil
      const errorMessage = err.message || 'Error desconocido al enviar RFQ'
      const logParts: string[] = [
        `[RFQ Detail] ❌ Error al enviar RFQ`,
        `  RFQ ID: ${rfqId || 'unknown'}`,
        `  Error: ${errorMessage}`,
      ]
      
      if (err.status) {
        logParts.push(`  HTTP Status: ${err.status}`)
      }
      
      console.error(logParts.join('\n'))
      
      // Si hay stack trace, mostrarlo por separado
      if (err.stack) {
        console.error('[RFQ Detail] Stack trace:', err.stack.substring(0, 300))
      }
      
      showNotification({
        title: 'Error',
        message: errorMessage,
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
  
  // Extraer relaciones con manejo robusto de diferentes estructuras de Strapi v5
  // En Strapi v5, las relaciones manyToMany pueden venir en diferentes formatos:
  // 1. Array directo: [{id, documentId, ...}]
  // 2. Objeto con data: {data: [{id, documentId, ...}]}
  // 3. En el nivel superior de rfq, no en attributes
  
  // Función helper para extraer relaciones
  const extractRelation = (source: any, fieldName: string): any[] => {
    // Intentar desde el nivel superior primero
    let relation = (rfq as any)[fieldName] || attrs[fieldName]
    
    if (!relation) return []
    
    if (Array.isArray(relation)) {
      return relation.length > 0 ? relation : []
    }
    
    if (relation && typeof relation === 'object') {
      // Si tiene data, extraer de ahí
      if (relation.data) {
        if (Array.isArray(relation.data)) {
          return relation.data.length > 0 ? relation.data : []
        } else if (relation.data && typeof relation.data === 'object') {
          return [relation.data]
        }
      }
      // Si es un objeto único (oneToOne), convertirlo a array
      if (relation.id || relation.documentId) {
        return [relation]
      }
    }
    
    return []
  }
  
  let empresas: any[] = extractRelation(attrs, 'empresas')
  let productos: any[] = extractRelation(attrs, 'productos')
  let cotizaciones: any[] = extractRelation(attrs, 'cotizaciones_recibidas')
  
  // Si no encontramos productos en attrs, buscar en el nivel superior
  if (productos.length === 0 && (rfq as any).productos) {
    productos = extractRelation(rfq, 'productos')
  }
  
  // Si no encontramos empresas en attrs, buscar en el nivel superior
  if (empresas.length === 0 && (rfq as any).empresas) {
    empresas = extractRelation(rfq, 'empresas')
  }
  
  // Extraer productos_cantidades (puede estar en attrs o en el nivel superior)
  const productosCantidades = attrs.productos_cantidades || (rfq as any).productos_cantidades || {}
  let cantidadesParsed: Record<string, number> = {}
  
  if (productosCantidades) {
    try {
      cantidadesParsed = typeof productosCantidades === 'string' 
        ? JSON.parse(productosCantidades) 
        : productosCantidades
    } catch (e) {
      console.warn('[RFQ Detail] Error al parsear productos_cantidades:', e)
    }
  }
  
  // Función helper para obtener la cantidad de un producto por su documentId o ID
  const getProductoCantidad = (producto: any): number => {
    const prodAttrs = producto.attributes || producto
    const docId = producto.documentId || prodAttrs.documentId
    const id = producto.id || prodAttrs.id
    
    // Buscar por documentId primero (más confiable)
    if (docId && cantidadesParsed[docId]) {
      return cantidadesParsed[docId]
    }
    
    // Fallback: buscar por ID numérico
    if (id && cantidadesParsed[String(id)]) {
      return cantidadesParsed[String(id)]
    }
    
    return 0
  }
  
  const estado = attrs.estado || 'draft'
  
  // Log para debugging - estructura completa
  console.log('[RFQ Detail] Estructura completa de RFQ:', {
    rfqKeys: Object.keys(rfq || {}),
    attrsKeys: Object.keys(attrs || {}),
    rfqProductos: (rfq as any).productos,
    attrsProductos: attrs.productos,
    rfqEmpresas: (rfq as any).empresas,
    attrsEmpresas: attrs.empresas,
    empresasCount: empresas.length,
    productosCount: productos.length,
    cotizacionesCount: cotizaciones.length,
    empresasStructure: empresas.length > 0 ? {
      firstItem: empresas[0],
      hasAttributes: !!(empresas[0]?.attributes),
      keys: Object.keys(empresas[0] || {}),
    } : null,
    productosStructure: productos.length > 0 ? {
      firstItem: productos[0],
      hasAttributes: !!(productos[0]?.attributes),
      keys: Object.keys(productos[0] || {}),
    } : null,
  })
  
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
              <h5 className="mb-0">Empresas Asociadas ({empresas.length})</h5>
            </CardHeader>
            <CardBody>
              {empresas.length === 0 ? (
                <p className="text-muted">No hay empresas asociadas</p>
              ) : (
                <>
                  {/* Función helper para extraer email */}
                  {(() => {
                    const extractEmail = (emp: any, idx: number) => {
                      const empAttrs = emp.attributes || emp
                      let emails: any[] = []
                      const emailsSource = empAttrs.emails || emp.emails
                      
                      if (emailsSource) {
                        if (Array.isArray(emailsSource)) {
                          emails = emailsSource
                        } else if (emailsSource.data) {
                          if (Array.isArray(emailsSource.data)) {
                            emails = emailsSource.data
                          } else if (emailsSource.data && typeof emailsSource.data === 'object') {
                            emails = [emailsSource.data]
                          }
                        } else if (typeof emailsSource === 'object' && emailsSource.email) {
                          emails = [emailsSource]
                        }
                      }
                      
                      let emailValue = '-'
                      if (emails.length > 0) {
                        const firstEmail = emails[0]
                        if (typeof firstEmail === 'string') {
                          emailValue = firstEmail
                        } else if (firstEmail.email) {
                          emailValue = firstEmail.email
                        } else if (firstEmail.attributes?.email) {
                          emailValue = firstEmail.attributes.email
                        } else if (firstEmail.data?.email) {
                          emailValue = firstEmail.data.email
                        } else if (firstEmail.data?.attributes?.email) {
                          emailValue = firstEmail.data.attributes.email
                        }
                      }
                      
                      if (emailValue !== '-' && (!emailValue || typeof emailValue !== 'string' || !emailValue.includes('@'))) {
                        emailValue = '-'
                      }
                      
                      return emailValue
                    }
                    
                    // Separar empresas en proveedoras y propias
                    const empresasProveedoras = empresas.filter((emp: any) => {
                      const empAttrs = emp.attributes || emp
                      return !empAttrs.es_empresa_propia
                    })
                    
                    const empresasPropias = empresas.filter((emp: any) => {
                      const empAttrs = emp.attributes || emp
                      return empAttrs.es_empresa_propia === true
                    })
                    
                    return (
                      <>
                        {/* Sección de Empresas Proveedoras */}
                        {empresasProveedoras.length > 0 && (
                          <div className="mb-4">
                            <h6 className="text-info mb-3">
                              <Badge bg="info-subtle" text="info" className="me-2">Proveedoras</Badge>
                              Empresas que recibieron la RFQ por email ({empresasProveedoras.length})
                            </h6>
                            <Table responsive hover>
                              <thead>
                                <tr>
                                  <th>Nombre</th>
                                  <th>Email</th>
                                </tr>
                              </thead>
                              <tbody>
                                {empresasProveedoras.map((emp: any, idx: number) => {
                                  const empAttrs = emp.attributes || emp
                                  const emailValue = extractEmail(emp, idx)
                                  
                                  return (
                                    <tr key={emp.id || emp.documentId || idx}>
                                      <td>
                                        <div className="d-flex align-items-center gap-2">
                                          <strong>{empAttrs.empresa_nombre || empAttrs.nombre || empAttrs.nombre_corto || 'Empresa'}</strong>
                                          <Badge bg="info-subtle" text="info" style={{ fontSize: '0.7rem' }}>
                                            Proveedora
                                          </Badge>
                                        </div>
                                        {empAttrs.nombre_corto && empAttrs.nombre_corto !== (empAttrs.empresa_nombre || empAttrs.nombre) && (
                                          <small className="text-muted d-block">{empAttrs.nombre_corto}</small>
                                        )}
                                      </td>
                                      <td>
                                        {emailValue !== '-' ? (
                                          <a href={`mailto:${emailValue}`} className="text-decoration-none">
                                            {emailValue}
                                          </a>
                                        ) : (
                                          <span className="text-muted">-</span>
                                        )}
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </Table>
                          </div>
                        )}
                        
                        {/* Sección de Empresas Propias */}
                        {empresasPropias.length > 0 && (
                          <div>
                            <h6 className="text-success mb-3">
                              <Badge bg="success-subtle" text="success" className="me-2">Propias</Badge>
                              Empresas vinculadas sin recibir email ({empresasPropias.length})
                            </h6>
                            <Table responsive hover>
                              <thead>
                                <tr>
                                  <th>Nombre</th>
                                  <th>Email</th>
                                </tr>
                              </thead>
                              <tbody>
                                {empresasPropias.map((emp: any, idx: number) => {
                                  const empAttrs = emp.attributes || emp
                                  const emailValue = extractEmail(emp, idx)
                                  
                                  return (
                                    <tr key={emp.id || emp.documentId || idx}>
                                      <td>
                                        <div className="d-flex align-items-center gap-2">
                                          <strong>{empAttrs.empresa_nombre || empAttrs.nombre || empAttrs.nombre_corto || 'Empresa'}</strong>
                                          <Badge bg="success-subtle" text="success" style={{ fontSize: '0.7rem' }}>
                                            Empresa Propia
                                          </Badge>
                                        </div>
                                        {empAttrs.nombre_corto && empAttrs.nombre_corto !== (empAttrs.empresa_nombre || empAttrs.nombre) && (
                                          <small className="text-muted d-block">{empAttrs.nombre_corto}</small>
                                        )}
                                      </td>
                                      <td>
                                        {emailValue !== '-' ? (
                                          <a href={`mailto:${emailValue}`} className="text-decoration-none">
                                            {emailValue}
                                          </a>
                                        ) : (
                                          <span className="text-muted">-</span>
                                        )}
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </Table>
                          </div>
                        )}
                      </>
                    )
                  })()}
                </>
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
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>ISBN</th>
                      <th className="text-end">Cantidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productos.map((prod: any, idx: number) => {
                      const prodAttrs = prod.attributes || prod
                      const nombre = prodAttrs.nombre_libro || prodAttrs.nombre || 'Producto'
                      const isbn = prodAttrs.isbn_libro || prodAttrs.isbn || prodAttrs.sku || '-'
                      const cantidad = getProductoCantidad(prod)
                      
                      return (
                        <tr key={prod.id || prod.documentId || idx}>
                          <td>
                            <strong>{nombre}</strong>
                            {prodAttrs.sku && isbn !== prodAttrs.sku && (
                              <small className="text-muted d-block">SKU: {prodAttrs.sku}</small>
                            )}
                          </td>
                          <td>
                            {isbn !== '-' ? (
                              <code className="text-primary">{isbn}</code>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td className="text-end">
                            {cantidad > 0 ? (
                              <Badge bg="primary" className="fs-6">{cantidad}</Badge>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
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

