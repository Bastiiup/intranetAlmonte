/**
 * ValidacionLista - Componente refactorizado
 * Usa hooks y componentes modulares para mantener el código limpio
 * Con paneles redimensionables y toast notifications
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Container, Alert, Button, Badge } from 'react-bootstrap'
import { TbArrowLeft } from 'react-icons/tb'
import { Toaster } from 'react-hot-toast'
import PageBreadcrumb from '@/components/PageBreadcrumb'

// Hooks
import { useProductos } from '../hooks/useProductos'
import { usePDFViewer } from '../hooks/usePDFViewer'
import { useProductosCRUD } from '../hooks/useProductosCRUD'
import { useToast } from '../hooks/useToast'

// Componentes
import ProductosTable from './ProductosTable/ProductosTable'
import PDFViewer from './PDFViewer/PDFViewer'
import ResizablePanels from './ResizablePanels'
import EditProductModal from './Modals/EditProductModal'
import AddProductModal from './Modals/AddProductModal'
import ExcelImportModal from './Modals/ExcelImportModal'
import LogsModal from './Modals/LogsModal'

// Tipos
import type { ListaData, ProductoIdentificado } from '../types'

interface ValidacionListaProps {
  lista: ListaData | null
  error: string | null
}

export default function ValidacionLista({ lista: initialLista, error: initialError }: ValidacionListaProps) {
  const router = useRouter()
  const params = useParams()
  const listaIdFromUrl = params?.id as string
  const toast = useToast()

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
  const [sugiriendoIA, setSugiriendoIA] = useState(false)
  const [verificandoDisponibilidad, setVerificandoDisponibilidad] = useState(false)

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
    setLista,
    setSelectedProduct,
    setSelectedProductData
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
    const producto = productos.find(p => p.id === productoId)

    if (!producto) {
      console.error('[ValidacionLista] Producto no encontrado:', productoId)
      return
    }

    // Toggle: si ya está seleccionado, deseleccionar
    const isAlreadySelected = selectedProduct === productoId

    if (isAlreadySelected) {
      setSelectedProduct(null)
      setSelectedProductData(null)
    } else {
      setSelectedProduct(productoId)
      setSelectedProductData(producto)

      // Navegar a la página del producto si tiene coordenadas
      if (producto.coordenadas?.pagina) {
        pdfViewer.navegarAPagina(producto.coordenadas.pagina)
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
      toast.error('Error', 'No se puede editar: ID de lista no encontrado')
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

      toast.success('Producto editado', 'Los cambios se guardaron correctamente')
      setShowEditModal(false)
      setProductoEditando(null)
      await cargarProductos(true)
    } catch (error: any) {
      toast.error('Error al editar', error.message)
    }
  }

  const handleReorder = async (orderedProductos: ProductoIdentificado[]) => {
    const idParaUsar = listaIdFromUrl || lista?.id || lista?.documentId
    if (!idParaUsar) {
      toast.error('Error', 'No se puede reordenar: ID de lista no encontrado')
      return
    }
    setProductos(orderedProductos)
    try {
      const response = await fetch(`/api/crm/listas/${idParaUsar}/productos/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderedIds: orderedProductos.map((p) => p.id),
          productos: orderedProductos.map((p) => ({
            id: p.id,
            orden: p.orden,
            categoria: p.categoria,
            asignatura: p.asignatura,
          })),
        }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al reordenar')
      }
      toast.success('Orden actualizado', 'El orden se guardó correctamente')
    } catch (error: any) {
      cargarProductos(true)
      toast.error('Error al reordenar', error.message)
    }
  }

  const handleVerificarDisponibilidad = async () => {
    const idParaUsar = listaIdFromUrl || lista?.id || lista?.documentId
    if (!idParaUsar) {
      toast.error('Error', 'No se puede verificar: ID de lista no encontrado')
      return
    }
    setVerificandoDisponibilidad(true)
    const loadingId = toast.loading('Consultando disponibilidad en WooCommerce y Strapi...', 'bottom-center')
    try {
      const response = await fetch(`/api/crm/listas/${idParaUsar}/verificar-disponibilidad`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await response.json()
      toast.dismiss(loadingId)
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al verificar disponibilidad')
      }
      const resumen = data.resumen || {}
      await cargarProductos(true)
      toast.success(
        'Disponibilidad actualizada',
        `${resumen.disponibles ?? 0} disponibles, ${resumen.noDisponibles ?? 0} sin stock, ${resumen.noEncontrados ?? 0} no encontrados`
      )
    } catch (error: any) {
      toast.dismiss(loadingId)
      toast.error('Error', error.message)
    } finally {
      setVerificandoDisponibilidad(false)
    }
  }

  const handleSugerirAsignaturasIA = async () => {
    if (productos.length === 0) return
    setSugiriendoIA(true)
    try {
      const response = await fetch('/api/crm/listas/detectar-asignaturas-ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productos: productos.map((p) => ({ id: p.id, nombre: p.nombre })),
        }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al sugerir')
      }
      const suggestions = data.suggestions || {}
      const actualizados = productos.map((p) => {
        const s = suggestions[String(p.id)]
        return {
          ...p,
          asignatura: s?.asignatura ?? p.asignatura,
          categoria: s?.categoria ?? p.categoria,
        }
      })
      setProductos(actualizados)
      await handleReorder(actualizados)
      toast.success('Asignaturas sugeridas', 'Se aplicaron las sugerencias de la IA. Puedes editarlas en cada producto.')
    } catch (error: any) {
      toast.error('Error al sugerir', error.message)
    } finally {
      setSugiriendoIA(false)
    }
  }

  const solicitarProcesarPDF = async () => {
    if (productos.length > 0) {
      const confirmado = await toast.confirm({
        title: 'Reprocesar PDF',
        text: 'Este PDF ya fue procesado. ¿Deseas reprocesarlo? Se reemplazarán los productos actuales.',
        type: 'warning',
        confirmText: 'Si, reprocesar',
        cancelText: 'Cancelar'
      })
      if (!confirmado) return
    }
    procesarPDFConIA(true)
  }

  const procesarPDFConIA = async (forzarReprocesar: boolean = false) => {
    const idParaUsar = listaIdFromUrl || lista?.id || lista?.documentId
    if (!idParaUsar) {
      toast.error('Error', 'No se puede procesar el PDF: ID de lista no encontrado')
      return
    }

    setProcessingPDF(true)
    toast.info('Procesando', 'Analizando el PDF con IA...')

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

      toast.success(
        'PDF procesado',
        `Se identificaron ${data.productos?.length || 0} productos`
      )
      await cargarProductos(true)
    } catch (error: any) {
      toast.error('Error al procesar', error.message)
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
      toast.error('Error', `No se pudieron cargar los logs: ${error.message}`)
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
        <PageBreadcrumb title="Validacion de Lista de Utiles" subtitle="CRM" />
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
        <PageBreadcrumb title="Validacion de Lista de Utiles" subtitle="CRM" />
        <Alert variant="warning">
          No se encontro la lista solicitada.
        </Alert>
        <Button variant="primary" onClick={() => router.push('/crm/listas')}>
          <TbArrowLeft className="me-2" />
          Volver a Listas
        </Button>
      </Container>
    )
  }

  const versiones = lista.versiones_materiales || []

  // Panel izquierdo: Tabla de productos
  const leftPanel = (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
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
        onReorder={handleReorder}
        listaIdFromUrl={listaIdFromUrl}
        onSugerirAsignaturasIA={handleSugerirAsignaturasIA}
        sugiriendoIA={sugiriendoIA}
        onVerificarDisponibilidad={handleVerificarDisponibilidad}
        verificandoDisponibilidad={verificandoDisponibilidad}
      />
    </div>
  )

  // Panel derecho: Visor de PDF
  const rightPanel = (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: '#f5f5f5'
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
        onClearSelection={() => {
          setSelectedProduct(null)
          setSelectedProductData(null)
        }}
      />
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '1rem 1.5rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        flexShrink: 0
      }}>
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h2 className="mb-1" style={{ fontSize: '1.5rem', fontWeight: 600 }}>
              Validacion de Lista de Utiles
            </h2>
            <div className="d-flex gap-2 flex-wrap align-items-center" style={{ fontSize: '0.9rem' }}>
              <span><strong>Colegio:</strong> {
                lista.colegio?.nombre ||
                (lista.colegio as any)?.data?.attributes?.nombre ||
                (lista.colegio as any)?.data?.nombre ||
                (lista.colegio as any)?.attributes?.nombre ||
                'N/A'
              }</span>
              <Badge bg="light" text="dark" style={{ fontSize: '0.8rem' }}>
                {lista.nombre}
              </Badge>
              {estadoRevision && (
                <Badge
                  bg={
                    estadoRevision === 'publicado' ? 'success' :
                    estadoRevision === 'revisado' ? 'info' :
                    estadoRevision === 'borrador' ? 'warning' :
                    'secondary'
                  }
                  style={{ fontSize: '0.8rem' }}
                >
                  {estadoRevision === 'publicado' ? 'Publicado' :
                   estadoRevision === 'revisado' ? 'En Revision' :
                   estadoRevision === 'borrador' ? 'Borrador' :
                   'Sin Validar'}
                </Badge>
              )}
              <Badge bg="light" text="dark" style={{ fontSize: '0.8rem' }}>
                {lista.año || new Date().getFullYear()}
              </Badge>
            </div>
          </div>
          <Button
            variant="light"
            size="sm"
            onClick={() => router.push('/crm/listas')}
            className="d-flex align-items-center"
          >
            <TbArrowLeft className="me-1" />
            Volver
          </Button>
        </div>
      </div>

      {/* Main Content con paneles redimensionables */}
      <ResizablePanels
        leftPanel={leftPanel}
        rightPanel={rightPanel}
        defaultLeftWidth={50}
        minLeftWidth={30}
        maxLeftWidth={70}
        storageKey="validacion-panel-width"
      />

      {/* Footer */}
      <div style={{
        padding: '0.4rem 1rem',
        background: '#f8f9fa',
        borderTop: '1px solid #dee2e6',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '0.8rem',
        color: '#6c757d',
        flexShrink: 0
      }}>
        <span>Arrastra el separador central para redimensionar los paneles</span>
        <span>Sistema de validacion con IA</span>
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

      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: '8px',
            fontSize: '14px',
          },
        }}
      />
    </div>
  )
}
