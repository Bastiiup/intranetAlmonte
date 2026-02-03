/**
 * ValidacionLista - Componente refactorizado
 * Usa hooks y componentes modulares para mantener el código limpio
 * Reducido de 3,736 líneas a ~450 líneas
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Container, Row, Col, Alert, Button, Badge } from 'react-bootstrap'
import { TbArrowLeft } from 'react-icons/tb'
import PageBreadcrumb from '@/components/PageBreadcrumb'

// Hooks
import { useProductos } from '../hooks/useProductos'
import { usePDFViewer } from '../hooks/usePDFViewer'
import { useProductosCRUD } from '../hooks/useProductosCRUD'

// Componentes
import ProductosTable from './ProductosTable/ProductosTable'
import PDFViewer from './PDFViewer/PDFViewer'
import EditProductModal from './Modals/EditProductModal'
import AddProductModal from './Modals/AddProductModal'
import ExcelImportModal from './Modals/ExcelImportModal'
import LogsModal from './Modals/LogsModal'

// Tipos
import type { ListaData, ProductoIdentificado } from '../types'

// Estilos para animación de pulso del resaltado
const highlightStyles = `
  @keyframes pulse {
    0%, 100% {
      opacity: 0.5;
      box-shadow: 0 4px 12px rgba(255, 193, 7, 0.6), inset 0 0 10px rgba(255, 235, 59, 0.3);
    }
    50% {
      opacity: 0.7;
      box-shadow: 0 6px 16px rgba(255, 193, 7, 0.8), inset 0 0 15px rgba(255, 235, 59, 0.5);
    }
  }
`

// Inyectar estilos si no existen
if (typeof document !== 'undefined') {
  const styleId = 'pdf-highlight-styles'
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style')
    style.id = styleId
    style.textContent = highlightStyles
    document.head.appendChild(style)
  }
}

interface ValidacionListaProps {
  lista: ListaData | null
  error: string | null
}

export default function ValidacionLista({ lista: initialLista, error: initialError }: ValidacionListaProps) {
  const router = useRouter()
  const params = useParams()
  const listaIdFromUrl = params?.id as string

  // Normalizar datos de Strapi
  const normalizarLista = (listaData: any): ListaData | null => {
    if (!listaData) return null
    if (listaData.attributes) {
      return {
        ...listaData.attributes,
        id: listaData.id,
        documentId: listaData.documentId,
        updatedAt: listaData.updatedAt,
        createdAt: listaData.createdAt,
      } as ListaData
    }
    return listaData as ListaData
  }

  const listaNormalizada = normalizarLista(initialLista)
  const [lista, setLista] = useState<ListaData | null>(listaNormalizada)
  const [error, setError] = useState<string | null>(initialError)
  const [versionSeleccionada, setVersionSeleccionada] = useState<number | null>(null)
  const [mostrarTodosLosProductos, setMostrarTodosLosProductos] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<string | number | null>(null)
  const [selectedProductData, setSelectedProductData] = useState<ProductoIdentificado | null>(null)
  const [estadoRevision, setEstadoRevision] = useState<'borrador' | 'revisado' | 'publicado' | null>(null)
  const [processingPDF, setProcessingPDF] = useState(false)
  const [autoProcessAttempted, setAutoProcessAttempted] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [productoEditando, setProductoEditando] = useState<ProductoIdentificado | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showExcelModal, setShowExcelModal] = useState(false)
  const [showLogsModal, setShowLogsModal] = useState(false)
  const [logs, setLogs] = useState<Array<{ timestamp: string; level: string; message: string; data?: any }>>([])
  const [loadingLogs, setLoadingLogs] = useState(false)

  // Cargar lista desde API si no viene del servidor
  useEffect(() => {
    const cargarListaDesdeAPI = async () => {
      if (!lista && listaIdFromUrl) {
        try {
          const response = await fetch(`/api/crm/listas/${listaIdFromUrl}`, { cache: 'no-store' })
          const data = await response.json()
          if (data.success && data.data) {
            setLista(normalizarLista(data.data))
          } else {
            setError(data.error || 'Error al cargar la lista')
          }
        } catch (err: any) {
          setError(err.message || 'Error al conectar con la API')
        }
      }
    }
    cargarListaDesdeAPI()
  }, [listaIdFromUrl, lista])

  // Cargar estado_revision inicial
  useEffect(() => {
    if (lista && estadoRevision === null) {
      const estado = (lista as any).estado_revision || null
      setEstadoRevision(estado)
    }
  }, [lista, estadoRevision])

  // Hooks personalizados
  const {
    productos,
    setProductos,
    loading: loadingProductos,
    cargarProductos
  } = useProductos({
    lista,
    listaIdFromUrl,
    versionSeleccionada,
    mostrarTodosLosProductos
  })

  const pdfViewer = usePDFViewer()

  const {
    aprobarProducto,
    aprobarListaCompleta,
    eliminarProducto,
    isApprovingProduct,
    isApproving,
    loading: loadingCRUD
  } = useProductosCRUD({
    lista,
    listaIdFromUrl,
    productos,
    onSuccess: cargarProductos,
    setProductos,
    setEstadoRevision,
    normalizarLista,
    setLista
  })

  // Determinar versión actual
  const versionActual = useMemo(() => {
    if (!lista?.versiones_materiales || lista.versiones_materiales.length === 0) return null
    const versionesOrdenadas = [...lista.versiones_materiales].sort((a: any, b: any) => {
      const fechaA = new Date(a.fecha_actualizacion || a.fecha_subida || 0).getTime()
      const fechaB = new Date(b.fecha_actualizacion || b.fecha_subida || 0).getTime()
      return fechaB - fechaA
    })
    const index = versionSeleccionada !== null ? versionSeleccionada : 0
    return versionesOrdenadas[index] || versionesOrdenadas[0] || null
  }, [lista, versionSeleccionada])

  // Handlers
  const handleProductoClick = (productoId: string | number) => {
    console.log('[ValidacionLista] 🖱️ Click en producto:', productoId)
    console.log('[ValidacionLista] 📊 Estado actual:', {
      selectedProduct,
      selectedProductData: selectedProductData?.nombre || null,
      totalProductos: productos.length
    })
    
    const producto = productos.find(p => p.id === productoId)
    
    if (!producto) {
      console.error('[ValidacionLista] ❌ Producto no encontrado:', productoId)
      console.log('[ValidacionLista] 📦 Productos disponibles:', productos.map(p => ({ id: p.id, nombre: p.nombre })))
      return
    }

    console.log('[ValidacionLista] 📦 Producto encontrado:', {
      id: producto.id,
      nombre: producto.nombre,
      tieneCoordenadas: !!producto.coordenadas,
      coordenadas: producto.coordenadas,
      pagina: producto.coordenadas?.pagina,
      posicion_x: producto.coordenadas?.posicion_x,
      posicion_y: producto.coordenadas?.posicion_y
    })

    // Toggle: si ya está seleccionado, deseleccionar
    const isAlreadySelected = selectedProduct === productoId
    
    if (isAlreadySelected) {
      console.log('[ValidacionLista] ⚪ Deseleccionando producto')
      setSelectedProduct(null)
      setSelectedProductData(null) // ✅ CRÍTICO: Limpiar también selectedProductData
    } else {
      console.log('[ValidacionLista] 🟢 Seleccionando producto')
      setSelectedProduct(productoId)
      setSelectedProductData(producto) // ✅ CRÍTICO: Actualizar selectedProductData
      
      console.log('[ValidacionLista] ✅ Estados actualizados:', {
        selectedProduct: productoId,
        selectedProductDataNombre: producto.nombre,
        coordenadas: producto.coordenadas
      })
      
      // Navegar a la página del producto si tiene coordenadas
      if (producto.coordenadas?.pagina) {
        console.log('[ValidacionLista] 📄 Navegando a página:', producto.coordenadas.pagina)
        pdfViewer.navegarAPagina(producto.coordenadas.pagina)
      } else {
        console.warn('[ValidacionLista] ⚠️ Producto NO tiene página en coordenadas:', {
          nombre: producto.nombre,
          coordenadas: producto.coordenadas
        })
      }
    }
  }

  const handleEditarProducto = (producto: ProductoIdentificado) => {
    setProductoEditando(producto)
    setShowEditModal(true)
  }

  const handleGuardarEdicion = async (formData: any) => {
    if (!productoEditando) return

    const idParaUsar = listaIdFromUrl || lista?.id || lista?.documentId
    if (!idParaUsar) {
      alert('No se puede editar: ID de lista no encontrado')
      return
    }

    try {
      const response = await fetch(`/api/crm/listas/${idParaUsar}/productos/${productoEditando.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al editar el producto')
      }

      alert('✅ Producto editado exitosamente')
      setShowEditModal(false)
      setProductoEditando(null)
      await cargarProductos(true)
    } catch (error: any) {
      alert(`Error al editar el producto: ${error.message}`)
    }
  }

  const solicitarProcesarPDF = () => {
    if (productos.length > 0) {
      if (!confirm('Este PDF ya fue procesado. ¿Deseas reprocesarlo?')) {
        return
      }
    }
    procesarPDFConIA(true)
  }

  const procesarPDFConIA = async (forzarReprocesar: boolean = false) => {
    const idParaUsar = listaIdFromUrl || lista?.id || lista?.documentId
    if (!idParaUsar) {
      alert('No se puede procesar el PDF: ID de lista no encontrado')
      return
    }

    setProcessingPDF(true)
    try {
      const response = await fetch(`/api/crm/listas/${idParaUsar}/procesar-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forzarReprocesar }),
      })

      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al procesar el PDF')
      }

      alert(`✅ PDF procesado exitosamente: ${data.productos?.length || 0} productos identificados`)
      await cargarProductos(true)
    } catch (error: any) {
      alert(`Error al procesar PDF: ${error.message}`)
    } finally {
      setProcessingPDF(false)
    }
  }

  const cargarLogs = async () => {
    setLoadingLogs(true)
    try {
      const response = await fetch('/api/crm/listas/debug-logs?limit=100')
      const data = await response.json()
      if (data.success && data.data) {
        setLogs(data.data.logs || [])
        setShowLogsModal(true)
      }
    } catch (error: any) {
      alert(`Error al cargar logs: ${error.message}`)
    } finally {
      setLoadingLogs(false)
    }
  }

  const cambiarVersion = (index: number) => {
    setVersionSeleccionada(index)
    setMostrarTodosLosProductos(false)
  }

  // Procesamiento automático con IA si no hay productos
  useEffect(() => {
    const intentarProcesamientoAutomatico = async () => {
      if (autoProcessAttempted || !lista || loadingProductos) return

      const tienePDF = lista.pdf_id || versionActual?.pdf_id
      if (!tienePDF) {
        setAutoProcessAttempted(true)
        return
      }

      const tieneProductos = lista.versiones_materiales && 
        lista.versiones_materiales.length > 0 && 
        lista.versiones_materiales[0]?.materiales &&
        lista.versiones_materiales[0].materiales.length > 0

      if (tieneProductos || productos.length > 0) {
        setAutoProcessAttempted(true)
        return
      }

      await new Promise(resolve => setTimeout(resolve, 2000))
      if (productos.length === 0) {
        setAutoProcessAttempted(true)
        await procesarPDFConIA(false)
      }
    }

    intentarProcesamientoAutomatico()
  }, [lista, productos.length, loadingProductos, autoProcessAttempted, versionActual])

  const loading = loadingProductos || loadingCRUD

  // Estados de error y carga
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

  const versiones = lista.versiones_materiales || []

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '1.5rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        flexShrink: 0
      }}>
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h2 className="mb-2" style={{ fontSize: '1.75rem', fontWeight: 600 }}>
              Validación de Lista de Útiles Escolares
            </h2>
            <div className="d-flex gap-2 flex-wrap align-items-center">
              <span><strong>Colegio:</strong> {
                lista.colegio?.nombre || 
                (lista.colegio as any)?.data?.attributes?.nombre || 
                (lista.colegio as any)?.data?.nombre ||
                (lista.colegio as any)?.attributes?.nombre ||
                'N/A'
              }</span>
              <Badge bg="light" text="dark" className="ms-2">
                Curso: {lista.nombre}
              </Badge>
              {estadoRevision && (
                <Badge 
                  bg={
                    estadoRevision === 'publicado' ? 'success' :
                    estadoRevision === 'revisado' ? 'info' :
                    estadoRevision === 'borrador' ? 'warning' :
                    'secondary'
                  }
                  className="ms-2"
                  style={{ fontSize: '0.875rem', padding: '0.5rem 0.75rem' }}
                >
                  {estadoRevision === 'publicado' ? '✓ Publicado' :
                   estadoRevision === 'revisado' ? '👁 En Revisión' :
                   estadoRevision === 'borrador' ? '✏ Borrador' :
                   '✗ Sin Validar'}
                </Badge>
              )}
              <Badge bg="light" text="dark">
                Año: {lista.año || new Date().getFullYear()}
              </Badge>
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
      <Row className="g-0" style={{ flex: '1 1 auto', minHeight: 0 }}>
        {/* Columna Izquierda: Productos */}
        <Col xs={12} md={6} style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          minHeight: 'calc(100vh - 200px)',
          borderRight: '1px solid #dee2e6',
          position: 'relative',
          zIndex: 10,
          backgroundColor: 'white'
        }}>
          <ProductosTable
            productos={productos}
            loading={loading}
            selectedProduct={selectedProduct}
            onProductoClick={handleProductoClick}
            onToggleValidado={aprobarProducto}
            onEditarProducto={handleEditarProducto}
            onEliminarProducto={eliminarProducto}
            onNavegarAPDF={(producto) => pdfViewer.navegarAProducto(producto)}
            isApprovingProduct={isApprovingProduct}
            estadoRevision={estadoRevision}
            isApproving={isApproving}
            onAprobarListaCompleta={aprobarListaCompleta}
            lista={lista}
            versionActual={versionActual}
            processingPDF={processingPDF}
            autoProcessAttempted={autoProcessAttempted}
          />
        </Col>

        {/* Columna Derecha: PDF Viewer */}
        <Col xs={12} md={6} className="pdf-viewer-container" style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          minHeight: 'calc(100vh - 200px)',
          background: '#f5f5f5',
          position: 'relative',
          zIndex: 0
        }}>
          <PDFViewer
            lista={lista}
            versionActual={versionActual}
            versiones={versiones}
            versionSeleccionada={versionSeleccionada}
            mostrarTodosLosProductos={mostrarTodosLosProductos}
            onChangeVersion={cambiarVersion}
            onChangeMostrarTodos={setMostrarTodosLosProductos}
            onRecargarProductos={() => cargarProductos(true)}
            pdfViewer={pdfViewer}
            selectedProductData={selectedProductData}
            processingPDF={processingPDF}
            onProcesarPDF={solicitarProcesarPDF}
            loadingLogs={loadingLogs}
            onCargarLogs={cargarLogs}
          />
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

      {/* Modales */}
      <EditProductModal
        show={showEditModal}
        producto={productoEditando}
        onHide={() => {
          setShowEditModal(false)
          setProductoEditando(null)
        }}
        onSave={handleGuardarEdicion}
        loading={loading}
      />

      <AddProductModal
        show={showAddModal}
        onHide={() => setShowAddModal(false)}
        onAdd={async () => {}}
        loading={loading}
      />

      <ExcelImportModal
        show={showExcelModal}
        onHide={() => setShowExcelModal(false)}
        onImport={async () => {}}
        loading={loading}
      />

      <LogsModal
        show={showLogsModal}
        logs={logs}
        onHide={() => setShowLogsModal(false)}
      />
    </div>
  )
}
