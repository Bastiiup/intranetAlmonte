'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button, Card, CardBody, Col, Row, Badge, Table, FormCheck, Spinner, Alert, Container } from 'react-bootstrap'
import { TbArrowLeft, TbArrowRight, TbZoomIn, TbZoomOut, TbCheck, TbX, TbSparkles, TbRefresh } from 'react-icons/tb'
import { Document, Page as PDFPage, pdfjs } from 'react-pdf'
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import 'react-pdf/dist/esm/Page/TextLayer.css'
import PageBreadcrumb from '@/components/PageBreadcrumb'

pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs'

interface ProductoIdentificado {
  id: string | number
  validado: boolean
  imagen?: string
  isbn?: string
  nombre: string
  marca?: string
  cantidad: number
  comprar: boolean
  disponibilidad: 'disponible' | 'no_disponible'
  precio: number
  precio_woocommerce?: number
  asignatura?: string
  woocommerce_id?: number
  woocommerce_sku?: string
  stock_quantity?: number
  encontrado_en_woocommerce?: boolean
}

interface ListaData {
  id: number | string
  documentId?: string
  nombre: string
  nivel: 'Basica' | 'Media'
  grado: number
  año?: number
  pdf_id?: number | string
  pdf_url?: string
  pdf_nombre?: string
  colegio?: {
    id: number | string
    nombre: string
  }
  materiales?: any[]
  versiones_materiales?: any[]
}

interface ValidacionListaProps {
  lista: ListaData | null
  error: string | null
}

export default function ValidacionLista({ lista: initialLista, error: initialError }: ValidacionListaProps) {
  const router = useRouter()
  const params = useParams()
  const listaIdFromUrl = params?.id as string
  
  const [lista, setLista] = useState<ListaData | null>(initialLista)
  const [error, setError] = useState<string | null>(initialError)
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [scale, setScale] = useState<number>(1.0)
  const [loading, setLoading] = useState(false)
  const [processingPDF, setProcessingPDF] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<string | number | null>(null)
  
  // Productos identificados
  const [productos, setProductos] = useState<ProductoIdentificado[]>([])

  // Función para cargar productos desde la lista
  const cargarProductos = async (forzarRecarga: boolean = false) => {
    if (!lista && !listaIdFromUrl) {
      console.warn('[ValidacionLista] No hay lista ni ID para cargar productos')
      return
    }

    setLoading(true)
    try {
      let versiones: any[] = []
      let listaActualizada = lista
      
      // Si se fuerza recarga, obtener datos frescos desde la API
      if (forzarRecarga && listaIdFromUrl) {
        console.log('[ValidacionLista] Recargando datos desde la API...')
        try {
          const response = await fetch(`/api/crm/listas/${listaIdFromUrl}`, {
            cache: 'no-store',
          })
          const data = await response.json()
          
          if (data.success && data.data) {
            listaActualizada = data.data
            versiones = data.data.versiones_materiales || data.data.versiones || []
            console.log('[ValidacionLista] Datos recargados, versiones:', versiones.length)
            console.log('[ValidacionLista] Materiales en última versión:', versiones.length > 0 ? (versiones[0]?.materiales?.length || 0) : 0)
            
            // Actualizar el estado de lista para futuras recargas
            setLista(listaActualizada)
          }
        } catch (err: any) {
          console.error('[ValidacionLista] Error al recargar datos:', err)
          // Continuar con los datos existentes si falla la recarga
          if (lista) {
            versiones = lista.versiones_materiales || []
          }
        }
      } else {
        // Usar datos de la lista actual
        versiones = lista?.versiones_materiales || []
      }
      
      // Obtener materiales de la última versión
      const ultimaVersion = versiones.length > 0 
        ? versiones.sort((a: any, b: any) => {
            const fechaA = new Date(a.fecha_actualizacion || a.fecha_subida || 0).getTime()
            const fechaB = new Date(b.fecha_actualizacion || b.fecha_subida || 0).getTime()
            return fechaB - fechaA
          })[0]
        : null

      const materiales = ultimaVersion?.materiales || listaActualizada?.materiales || []
      
      console.log('[ValidacionLista] Materiales encontrados:', {
        totalVersiones: versiones.length,
        ultimaVersion: ultimaVersion ? 'sí' : 'no',
        totalMateriales: materiales.length,
        materiales: materiales.slice(0, 3).map((m: any) => m.nombre || m.nombre_producto)
      })
      
      // Transformar materiales a productos identificados
      const productosTransformados: ProductoIdentificado[] = materiales.map((material: any, index: number) => ({
        id: material.id || `producto-${index + 1}`,
        validado: material.validado || false,
        imagen: material.imagen || undefined,
        isbn: material.isbn || material.sku || material.woocommerce_sku || undefined,
        nombre: material.nombre || material.nombre_producto || 'Producto sin nombre',
        marca: material.marca || material.editorial || undefined,
        cantidad: material.cantidad || 1,
        comprar: material.comprar !== false,
        disponibilidad: material.disponibilidad === 'no_disponible' ? 'no_disponible' : 'disponible',
        precio: parseFloat(material.precio || 0),
        precio_woocommerce: material.precio_woocommerce ? parseFloat(material.precio_woocommerce) : undefined,
        asignatura: material.asignatura || material.materia || undefined,
        woocommerce_id: material.woocommerce_id || undefined,
        woocommerce_sku: material.woocommerce_sku || undefined,
        stock_quantity: material.stock_quantity || undefined,
        encontrado_en_woocommerce: material.encontrado_en_woocommerce !== undefined ? material.encontrado_en_woocommerce : undefined,
      }))

      setProductos(productosTransformados)
    } catch (err: any) {
      console.error('[ValidacionLista] Error al cargar productos:', err)
    } finally {
      setLoading(false)
    }
  }

  // Obtener productos del curso al cargar o cuando la lista cambie
  useEffect(() => {
    if (lista) {
      const versionesCount = lista.versiones_materiales?.length || 0
      const ultimaVersionMateriales = versionesCount > 0 && lista.versiones_materiales
        ? (lista.versiones_materiales.sort((a: any, b: any) => {
            const fechaA = new Date(a.fecha_actualizacion || a.fecha_subida || 0).getTime()
            const fechaB = new Date(b.fecha_actualizacion || b.fecha_subida || 0).getTime()
            return fechaB - fechaA
          })[0]?.materiales?.length || 0)
        : 0
      
      console.log('[ValidacionLista] Cargando productos...', {
        listaId: lista.id,
        tieneVersiones: !!lista.versiones_materiales,
        versionesCount: versionesCount,
        materialesEnUltimaVersion: ultimaVersionMateriales
      })
      cargarProductos(false) // Cargar desde datos actuales
      
      // Si no hay productos pero hay PDF, intentar recargar desde API después de un delay
      if (lista.pdf_id && (!lista.versiones_materiales || lista.versiones_materiales.length === 0)) {
        console.log('[ValidacionLista] No hay versiones, recargando desde API en 1 segundo...')
        setTimeout(() => {
          cargarProductos(true)
        }, 1000)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lista?.id, lista?.versiones_materiales?.length])

  // Función para procesar PDF con Gemini AI
  const procesarPDFConGemini = async () => {
    // Usar el ID de la URL primero, luego el de la lista como fallback
    const idParaUsar = listaIdFromUrl || lista?.id || lista?.documentId
    
    if (!idParaUsar) {
      alert('No se puede procesar el PDF: ID de lista no encontrado')
      return
    }

    if (!lista?.pdf_id) {
      alert('No se puede procesar: la lista no tiene PDF asociado')
      return
    }

    setProcessingPDF(true)
    try {
      console.log('[ValidacionLista] Procesando PDF con Gemini AI...', {
        idUsado: idParaUsar,
        listaId: lista?.id,
        documentId: lista?.documentId,
        idFromUrl: listaIdFromUrl
      })
      
      const response = await fetch(`/api/crm/listas/${idParaUsar}/procesar-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      console.log('[ValidacionLista] Respuesta del servidor:', {
        ok: response.ok,
        status: response.status,
        success: data.success,
        hasData: !!data.data,
        error: data.error,
        errorGuardado: data.data?.errorGuardado,
      })

      // Si hay un error crítico (no se pudo procesar el PDF)
      if (!response.ok || (data.success === false && !data.data)) {
        // Construir mensaje de error más detallado
        let errorMessage = data.error || 'Error al procesar el PDF'
        if (data.details) {
          errorMessage += `\n\nDetalles: ${data.details}`
        }
        if (data.sugerencia) {
          errorMessage += `\n\nSugerencia: ${data.sugerencia}`
        }
        throw new Error(errorMessage)
      }

      // Verificar que tenemos datos
      if (!data.data || !data.data.productos) {
        throw new Error('La respuesta del servidor no contiene datos de productos')
      }

      console.log('[ValidacionLista] PDF procesado exitosamente:', data.data.productos.length, 'productos')
      console.log('[ValidacionLista] Guardado en Strapi:', data.data.guardadoEnStrapi)
      console.log('[ValidacionLista] Error de guardado:', data.data.errorGuardado)

      // Si el guardado fue exitoso, esperar un momento y recargar
      if (data.data.guardadoEnStrapi) {
        // Esperar un momento para que Strapi procese el cambio antes de recargar
        await new Promise(resolve => setTimeout(resolve, 500))

        // Recargar productos después del procesamiento (forzar recarga desde API)
        console.log('[ValidacionLista] Recargando productos desde Strapi...')
        await cargarProductos(true)
        
        // Verificar que se cargaron los productos
        console.log('[ValidacionLista] Productos cargados después del procesamiento:', productos.length)
      }

      const encontrados = data.data.encontrados || 0
      const noEncontrados = data.data.noEncontrados || 0
      const total = data.data.total || 0
      
      // Construir mensaje según el resultado
      let mensaje = `✅ PDF procesado exitosamente.\n\nSe identificaron ${total} productos:\n- ${encontrados} encontrados en WooCommerce Escolar\n- ${noEncontrados} no encontrados`
      
      if (data.data.guardadoEnStrapi) {
        mensaje += '\n\n✅ Productos guardados en Strapi correctamente.'
      } else {
        mensaje += '\n\n⚠️ Productos extraídos pero no se pudieron guardar en Strapi.'
        if (data.data.errorGuardado) {
          mensaje += `\n\nError: ${data.data.errorGuardado}`
        }
      }
      
      alert(mensaje)
    } catch (err: any) {
      console.error('[ValidacionLista] Error al procesar PDF:', err)
      alert(`Error al procesar el PDF: ${err.message}`)
    } finally {
      setProcessingPDF(false)
    }
  }

  const pdfUrl = lista?.pdf_id 
    ? `/api/crm/listas/pdf/${lista.pdf_id}`
    : lista?.pdf_url || null

  function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
    setNumPages(numPages)
  }

  const nextPage = () => {
    if (pageNumber < numPages) {
      setPageNumber(pageNumber + 1)
    }
  }

  const prevPage = () => {
    if (pageNumber > 1) {
      setPageNumber(pageNumber - 1)
    }
  }

  const onZoomIn = () => {
    if (scale >= 3) {
      return
    }
    setScale(scale + 0.2)
  }

  const onZoomOut = () => {
    if (scale <= 0.5) {
      return
    }
    setScale(scale - 0.2)
  }

  const onZoomReset = () => {
    setScale(1.0)
  }

  const handleProductoClick = (productoId: string | number) => {
    setSelectedProduct(productoId === selectedProduct ? null : productoId)
    // Aquí se podría implementar la lógica para resaltar el producto en el PDF
  }

  const toggleValidado = (productoId: string | number) => {
    setProductos(prev => prev.map(p => 
      p.id === productoId ? { ...p, validado: !p.validado } : p
    ))
  }

  const totalProductos = productos.length
  const paraComprar = productos.filter(p => p.comprar).length
  const disponibles = productos.filter(p => p.disponibilidad === 'disponible').length
  const validados = productos.filter(p => p.validado).length
  const encontradosEnWooCommerce = productos.filter(p => p.encontrado_en_woocommerce === true).length
  const noEncontradosEnWooCommerce = productos.filter(p => p.encontrado_en_woocommerce === false).length

  if (error) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Validación de Lista de Útiles" subtitle="CRM" />
        <Alert variant="danger">
          <strong>Error:</strong> {error}
        </Alert>
        <Button variant="primary" onClick={() => router.push('/crm/listas')}>
          <TbArrowLeft className="me-2" />
          Volver a Listas
        </Button>
      </Container>
    )
  }

  if (!lista) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Validación de Lista de Útiles" subtitle="CRM" />
        <Alert variant="warning">
          No se encontró la lista solicitada.
        </Alert>
        <Button variant="primary" onClick={() => router.push('/crm/listas')}>
          <TbArrowLeft className="me-2" />
          Volver a Listas
        </Button>
      </Container>
    )
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '1.5rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h2 className="mb-2" style={{ fontSize: '1.75rem', fontWeight: 600 }}>
              Validación de Lista de Útiles Escolares
            </h2>
            <div className="d-flex gap-2 flex-wrap align-items-center">
              <span><strong>Colegio:</strong> {lista.colegio?.nombre || 'N/A'}</span>
              <Badge bg="light" text="dark" className="ms-2">
                Curso: {lista.nombre}
              </Badge>
              <Badge bg="light" text="dark">
                Año: {lista.año || new Date().getFullYear()}
              </Badge>
              <span className="ms-2">
                <strong>Fecha Publicación:</strong> {new Date().toLocaleDateString('es-CL', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </span>
            </div>
          </div>
          <Button 
            variant="light" 
            onClick={() => router.push('/crm/listas')}
            className="d-flex align-items-center"
          >
            <TbArrowLeft className="me-2" />
            Volver
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Row className="g-0 flex-grow-1" style={{ overflow: 'hidden' }}>
        {/* Columna Izquierda: Productos Identificados */}
        <Col xs={12} md={6} style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden',
          borderRight: '1px solid #dee2e6'
        }}>
          <Card className="h-100 border-0 rounded-0">
            <CardBody className="d-flex flex-column h-100 p-0">
              <div style={{ 
                padding: '1rem', 
                borderBottom: '1px solid #dee2e6',
                background: '#f8f9fa'
              }}>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h5 className="mb-1">
                      Productos Identificados ({totalProductos})
                    </h5>
                    <p className="text-muted mb-0 small">
                      Selecciona un producto para ver su ubicación en el PDF
                    </p>
                  </div>
                  <Button 
                    variant="outline-primary" 
                    size="sm"
                    onClick={() => cargarProductos(true)}
                    disabled={loading}
                    className="d-flex align-items-center"
                  >
                    {loading ? (
                      <>
                        <Spinner size="sm" className="me-2" />
                        Cargando...
                      </>
                    ) : (
                      <>
                        <TbRefresh className="me-2" />
                        Recargar
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {loading ? (
                <div className="d-flex justify-content-center align-items-center flex-grow-1">
                  <Spinner animation="border" />
                </div>
              ) : productos.length === 0 ? (
                <div className="d-flex justify-content-center align-items-center flex-grow-1">
                  <Alert variant="info" className="m-3">
                    No hay productos identificados aún. Los productos se cargarán automáticamente desde el PDF.
                  </Alert>
                </div>
              ) : (
                <>
                  <div style={{ 
                    overflowY: 'auto', 
                    flexGrow: 1,
                    maxHeight: 'calc(100vh - 250px)'
                  }}>
                    <Table hover responsive className="mb-0">
                      <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
                        <tr>
                          <th style={{ width: '50px' }}>Validado</th>
                          <th style={{ width: '80px' }}>Imagen</th>
                          <th>ISBN</th>
                          <th>Nombre Producto</th>
                          <th>Marca</th>
                          <th style={{ width: '80px' }}>Cantidad</th>
                          <th style={{ width: '100px' }}>Comprar</th>
                          <th style={{ width: '120px' }}>Disponibilidad</th>
                          <th style={{ width: '100px' }}>Precio</th>
                          <th>Asignatura</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productos.map((producto) => (
                          <tr 
                            key={producto.id}
                            onClick={() => handleProductoClick(producto.id)}
                            style={{ 
                              cursor: 'pointer',
                              backgroundColor: selectedProduct === producto.id ? '#e7f3ff' : 'transparent'
                            }}
                          >
                            <td>
                              <FormCheck
                                checked={producto.validado}
                                onChange={() => toggleValidado(producto.id)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </td>
                            <td>
                              {producto.imagen ? (
                                <img 
                                  src={producto.imagen} 
                                  alt={producto.nombre}
                                  style={{ width: '50px', height: '50px', objectFit: 'cover' }}
                                />
                              ) : (
                                <div style={{ 
                                  width: '50px', 
                                  height: '50px', 
                                  background: '#f0f0f0',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.75rem',
                                  color: '#999'
                                }}>
                                  Sin imagen
                                </div>
                              )}
                            </td>
                            <td>{producto.isbn || '-'}</td>
                            <td><strong>{producto.nombre}</strong></td>
                            <td>{producto.marca || '-'}</td>
                            <td className="text-center">{producto.cantidad}</td>
                            <td className="text-center">
                              <Badge bg={producto.comprar ? 'dark' : 'secondary'}>
                                {producto.comprar ? 'Sí' : 'No'}
                              </Badge>
                            </td>
                            <td>
                              {producto.encontrado_en_woocommerce === false ? (
                                <Badge bg="warning" text="dark">
                                  No encontrado
                                </Badge>
                              ) : (
                                <Badge bg={producto.disponibilidad === 'disponible' ? 'success' : 'danger'}>
                                  {producto.disponibilidad === 'disponible' ? 'disponible' : 'no disponible'}
                                  {producto.stock_quantity !== undefined && ` (${producto.stock_quantity})`}
                                </Badge>
                              )}
                            </td>
                            <td>
                              {producto.precio_woocommerce && producto.precio_woocommerce > 0 ? (
                                <div>
                                  <strong>${producto.precio_woocommerce.toLocaleString('es-CL')}</strong>
                                  {producto.precio !== producto.precio_woocommerce && (
                                    <small className="text-muted d-block">
                                      PDF: ${producto.precio.toLocaleString('es-CL')}
                                    </small>
                                  )}
                                </div>
                              ) : producto.precio > 0 ? (
                                `$${producto.precio.toLocaleString('es-CL')}`
                              ) : (
                                '-'
                              )}
                            </td>
                            <td>{producto.asignatura || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>

                  {/* Resumen */}
                  <div style={{ 
                    padding: '1rem', 
                    borderTop: '1px solid #dee2e6',
                    background: '#f8f9fa'
                  }}>
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <strong>Total productos:</strong> {totalProductos} | 
                        <strong className="ms-2">Para comprar:</strong> {paraComprar} | 
                        <strong className="ms-2">Disponibles:</strong> {disponibles} |
                        <strong className="ms-2">Validados:</strong> {validados}
                        {encontradosEnWooCommerce > 0 && (
                          <>
                            <br className="d-md-none" />
                            <span className="ms-2">
                              <strong className="text-success">En WooCommerce:</strong> {encontradosEnWooCommerce}
                            </span>
                            {noEncontradosEnWooCommerce > 0 && (
                              <span className="ms-2">
                                <strong className="text-warning">No encontrados:</strong> {noEncontradosEnWooCommerce}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardBody>
          </Card>
        </Col>

        {/* Columna Derecha: PDF Viewer */}
        <Col xs={12} md={6} style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden',
          background: '#f5f5f5'
        }}>
          <Card className="h-100 border-0 rounded-0">
            <CardBody className="d-flex flex-column h-100 p-0">
              <div style={{ 
                padding: '1rem', 
                borderBottom: '1px solid #dee2e6',
                background: 'white'
              }}>
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <h5 className="mb-1">Lista de Útiles Original (PDF)</h5>
                    <p className="text-muted mb-0 small">
                      Documento proporcionado por el colegio
                    </p>
                  </div>
                  {pdfUrl && (
                    <Button 
                      variant="primary" 
                      size="sm"
                      onClick={procesarPDFConGemini}
                      disabled={processingPDF}
                      className="d-flex align-items-center"
                    >
                      {processingPDF ? (
                        <>
                          <Spinner size="sm" className="me-2" />
                          Procesando...
                        </>
                      ) : (
                        <>
                          <TbSparkles className="me-2" />
                          Procesar con IA
                        </>
                      )}
                    </Button>
                  )}
                </div>
                
                {pdfUrl && (
                  <div className="d-flex gap-2 align-items-center flex-wrap mt-2">
                    <Button 
                      variant="outline-secondary" 
                      size="sm"
                      onClick={prevPage}
                      disabled={pageNumber <= 1}
                    >
                      <TbArrowLeft />
                    </Button>
                    <span className="small">
                      Página {pageNumber} de {numPages || '---'}
                    </span>
                    <Button 
                      variant="outline-secondary" 
                      size="sm"
                      onClick={nextPage}
                      disabled={pageNumber >= numPages}
                    >
                      <TbArrowRight />
                    </Button>
                    <div className="ms-auto d-flex gap-1">
                      <Button variant="outline-secondary" size="sm" onClick={onZoomOut}>
                        <TbZoomOut />
                      </Button>
                      <Button variant="outline-secondary" size="sm" onClick={onZoomReset}>
                        {Math.round(scale * 100)}%
                      </Button>
                      <Button variant="outline-secondary" size="sm" onClick={onZoomIn}>
                        <TbZoomIn />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ 
                flexGrow: 1, 
                overflow: 'auto',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-start',
                padding: '1rem',
                background: '#e5e5e5'
              }}>
                {pdfUrl ? (
                  <div style={{ 
                    background: 'white',
                    padding: '1rem',
                    borderRadius: '4px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}>
                    <Document
                      file={pdfUrl}
                      onLoadSuccess={onDocumentLoadSuccess}
                      loading={
                        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
                          <Spinner animation="border" />
                        </div>
                      }
                    >
                      <PDFPage 
                        pageNumber={pageNumber} 
                        scale={scale} 
                        className="border rounded"
                        renderTextLayer={true}
                        renderAnnotationLayer={true}
                      />
                    </Document>
                  </div>
                ) : (
                  <div className="d-flex justify-content-center align-items-center flex-grow-1">
                    <Alert variant="warning" className="m-3">
                      No hay PDF disponible para este curso.
                    </Alert>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Footer */}
      <div style={{ 
        padding: '0.5rem 1rem', 
        background: '#f8f9fa',
        borderTop: '1px solid #dee2e6',
        textAlign: 'right',
        fontSize: '0.875rem',
        color: '#6c757d'
      }}>
        Sistema de validación con IA
      </div>
    </div>
  )
}
