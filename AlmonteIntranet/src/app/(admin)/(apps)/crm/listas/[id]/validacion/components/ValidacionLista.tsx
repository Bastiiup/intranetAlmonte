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
import AddProductQuickAccessModal from './Modals/AddProductQuickAccessModal'
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
  const [showAddProductQuickAccessModal, setShowAddProductQuickAccessModal] = useState(false)
  const [productoParaAltaCatalogo, setProductoParaAltaCatalogo] = useState<ProductoIdentificado | null>(null)
  const [showExcelModal, setShowExcelModal] = useState(false)
  const [showLogsModal, setShowLogsModal] = useState(false)
  const [logs, setLogs] = useState<Array<{ timestamp: string; level: string; message: string; data?: any }>>([])
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [sugiriendoIA, setSugiriendoIA] = useState(false)
  const [verificandoDisponibilidad, setVerificandoDisponibilidad] = useState(false)
  const [navegandoAColegio, setNavegandoAColegio] = useState(false)

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

  // Determinar versión actual (solo versiones activas)
  const versionActual = useMemo(() => {
    if (!lista?.versiones_materiales || lista.versiones_materiales.length === 0) return null
    
    // Filtrar solo versiones activas (activo !== false)
    const versionesActivas = lista.versiones_materiales.filter((v: any) => v.activo !== false)
    
    if (versionesActivas.length === 0) return null
    
    const versionesOrdenadas = [...versionesActivas].sort((a: any, b: any) => {
      const fechaA = new Date(a.fecha_actualizacion || a.fecha_subida || 0).getTime()
      const fechaB = new Date(b.fecha_actualizacion || b.fecha_subida || 0).getTime()
      return fechaB - fechaA
    })
    
    // Si hay una versión seleccionada, buscar su índice en las versiones activas
    if (versionSeleccionada !== null) {
      // Mapear el índice seleccionado al índice en versiones activas
      const todasVersiones = [...lista.versiones_materiales].sort((a: any, b: any) => {
        const fechaA = new Date(a.fecha_actualizacion || a.fecha_subida || 0).getTime()
        const fechaB = new Date(b.fecha_actualizacion || b.fecha_subida || 0).getTime()
        return fechaB - fechaA
      })
      const versionSeleccionadaOriginal = todasVersiones[versionSeleccionada]
      if (versionSeleccionadaOriginal && versionSeleccionadaOriginal.activo !== false) {
        const indexEnActivas = versionesOrdenadas.findIndex((v: any) => 
          v.id === versionSeleccionadaOriginal.id || 
          (v.fecha_subida === versionSeleccionadaOriginal.fecha_subida && 
           v.nombre_archivo === versionSeleccionadaOriginal.nombre_archivo)
        )
        if (indexEnActivas >= 0) {
          return versionesOrdenadas[indexEnActivas]
        }
      }
    }
    
    // Por defecto, usar la primera versión activa (más reciente)
    return versionesOrdenadas[0] || null
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

    // Cerrar modal y actualizar localmente primero (optimistic update)
    const productosAnteriores = [...productos]
    const productoIndex = productos.findIndex(p => p.id === productoEditando.id)
    setProductos(prev => prev.map(p =>
      p.id === productoEditando.id ? { ...p, ...formData } : p
    ))
    setShowEditModal(false)
    setProductoEditando(null)

    try {
      const response = await fetch(`/api/crm/listas/${idParaUsar}/productos/${productoEditando.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          _originalNombre: productoEditando.nombre,
          _productoIndex: productoIndex,
        }),
      })

      let data: any
      try {
        data = await response.json()
      } catch {
        throw new Error(`Error del servidor (${response.status})`)
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al editar el producto')
      }

      toast.success('Producto editado', 'Los cambios se guardaron correctamente')
    } catch (error: any) {
      // Revertir cambios locales si falla
      setProductos(productosAnteriores)
      toast.error('Error al editar', error.message)
      console.error('[handleGuardarEdicion] Error:', error)
    }
  }

  const handleAgregarProducto = async (formData: any) => {
    const idParaUsar = listaIdFromUrl || lista?.id || lista?.documentId
    if (!idParaUsar) {
      toast.error('Error', 'No se puede agregar: ID de lista no encontrado')
      return
    }

    // Cerrar modal y agregar localmente (optimistic update)
    const productosAnteriores = [...productos]
    const nuevoId = `producto-${productos.length + 1}-nuevo`
    const nuevoProducto: ProductoIdentificado = {
      id: nuevoId,
      nombre: formData.nombre,
      cantidad: formData.cantidad || 1,
      isbn: formData.isbn || '',
      marca: formData.marca || '',
      precio: formData.precio || 0,
      orden: formData.orden || productos.length + 1,
      categoria: formData.categoria || '',
      asignatura: formData.asignatura || '',
      descripcion: formData.descripcion || '',
      comprar: formData.comprar !== false,
      validado: false,
      disponibilidad: 'no_encontrado',
      encontrado_en_woocommerce: false,
    }

    // Insertar en posición correcta según orden
    const insertIndex = Math.min(Math.max((nuevoProducto.orden! - 1), 0), productos.length)
    const nuevosProductos = [...productos]
    nuevosProductos.splice(insertIndex, 0, nuevoProducto)
    nuevosProductos.forEach((p, i) => { p.orden = i + 1 })

    setProductos(nuevosProductos)
    setShowAddModal(false)

    try {
      const response = await fetch(`/api/crm/listas/${idParaUsar}/productos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      let data: any
      try {
        data = await response.json()
      } catch {
        throw new Error(`Error del servidor (${response.status})`)
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al agregar el producto')
      }

      toast.success('Producto agregado', `"${formData.nombre}" se agregó correctamente`)
      // Recargar para obtener los IDs reales de Strapi
      cargarProductos(true)
    } catch (error: any) {
      setProductos(productosAnteriores)
      toast.error('Error al agregar', error.message)
      console.error('[handleAgregarProducto] Error:', error)
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
    // El índice viene del VersionSelector que ya filtra versiones activas
    // Necesitamos encontrar la versión correspondiente en todas las versiones
    if (!lista?.versiones_materiales) return
    
    // Filtrar versiones activas y ordenarlas
    const versionesActivas = lista.versiones_materiales.filter((v: any) => v.activo !== false)
    const versionesActivasOrdenadas = [...versionesActivas].sort((a: any, b: any) => {
      const fechaA = new Date(a.fecha_actualizacion || a.fecha_subida || 0).getTime()
      const fechaB = new Date(b.fecha_actualizacion || b.fecha_subida || 0).getTime()
      return fechaB - fechaA
    })
    
    // Obtener la versión seleccionada de las versiones activas
    const versionSeleccionadaActiva = versionesActivasOrdenadas[index]
    if (!versionSeleccionadaActiva) return
    
    // Encontrar el índice de esta versión en todas las versiones ordenadas
    const todasVersionesOrdenadas = [...lista.versiones_materiales].sort((a: any, b: any) => {
      const fechaA = new Date(a.fecha_actualizacion || a.fecha_subida || 0).getTime()
      const fechaB = new Date(b.fecha_actualizacion || b.fecha_subida || 0).getTime()
      return fechaB - fechaA
    })
    
    const indexEnTodas = todasVersionesOrdenadas.findIndex((v: any) => 
      v.id === versionSeleccionadaActiva.id || 
      (v.fecha_subida === versionSeleccionadaActiva.fecha_subida && 
       v.nombre_archivo === versionSeleccionadaActiva.nombre_archivo)
    )
    
    setVersionSeleccionada(indexEnTodas >= 0 ? indexEnTodas : null)
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

  // Helper para obtener el colegioId/documentId del colegio
  const obtenerColegioId = (): string | null => {
    if (!lista?.colegio) return null
    
    // Intentar diferentes estructuras posibles
    const colegio = lista.colegio as any
    
    // Caso 1: colegio.id o colegio.documentId directo
    if (colegio.id) return String(colegio.id)
    if (colegio.documentId) return String(colegio.documentId)
    
    // Caso 2: colegio.data.id o colegio.data.documentId
    if (colegio.data?.id) return String(colegio.data.id)
    if (colegio.data?.documentId) return String(colegio.data.documentId)
    
    // Caso 3: colegio.data.attributes.id (Strapi v5)
    if (colegio.data?.attributes?.id) return String(colegio.data.attributes.id)
    if (colegio.data?.attributes?.documentId) return String(colegio.data.attributes.documentId)
    
    // Caso 4: colegio.attributes.id (Strapi v5)
    if (colegio.attributes?.id) return String(colegio.attributes.id)
    if (colegio.attributes?.documentId) return String(colegio.attributes.documentId)
    
    return null
  }

  const colegioId = obtenerColegioId()

  // Helper para obtener el RBD del colegio (para fallback cuando no hay colegioId)
  const obtenerRbdColegio = (): string | null => {
    if (!lista?.colegio) return null
    const colegio = lista.colegio as any
    const rbd = colegio.rbd ?? colegio.data?.attributes?.rbd ?? colegio.data?.rbd ?? colegio.attributes?.rbd ?? null
    return rbd != null ? String(rbd) : null
  }

  const rbdColegio = obtenerRbdColegio()

  const handleIrAListasDelCurso = async () => {
    // Priorizar siempre el RBD mostrado en pantalla para evitar ir al colegio equivocado
    // (lista.colegio a veces trae un ID que no coincide con el RBD del header)
    if (rbdColegio) {
      setNavegandoAColegio(true)
      try {
        const res = await fetch(`/api/crm/colegios?search=${encodeURIComponent(rbdColegio)}&pagination[pageSize]=1`)
        const json = await res.json()
        if (!res.ok || !json.success || !json.data?.length) {
          toast.error('No se pudo cargar el colegio para ver los cursos.')
          return
        }
        const colegio = json.data[0]
        const id = colegio.documentId ?? colegio.id ?? colegio.attributes?.documentId ?? colegio.attributes?.id
        if (id) {
          router.push(`/crm/listas/colegio/${id}`)
        } else {
          toast.error('No se encontró el colegio.')
        }
      } catch {
        toast.error('Error al cargar los cursos del colegio.')
      } finally {
        setNavegandoAColegio(false)
      }
      return
    }
    if (colegioId) {
      router.push(`/crm/listas/colegio/${colegioId}`)
    }
  }

  const puedeIrAListasDelCurso = Boolean(colegioId || rbdColegio)

  // Estados de error y carga
  if (error) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Validacion de Lista de Utiles" subtitle="CRM" />
        <Alert variant="danger">
          <strong>Error:</strong> {error}
        </Alert>
        <div className="d-flex gap-2 mt-3">
          <Button variant="primary" onClick={() => router.push('/crm/listas')}>
            <TbArrowLeft className="me-2" />
            Volver a Colegios
          </Button>
        </div>
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
        <div className="d-flex gap-2 mt-3">
          <Button variant="primary" onClick={() => router.push('/crm/listas')}>
            <TbArrowLeft className="me-2" />
            Volver a Colegios
          </Button>
        </div>
      </Container>
    )
  }

  // Filtrar solo versiones activas para pasar al componente
  const versiones = useMemo(() => {
    if (!lista?.versiones_materiales) return []
    return lista.versiones_materiales.filter((v: any) => v.activo !== false)
  }, [lista?.versiones_materiales])

  // Panel izquierdo: Tabla de productos
  const leftPanel = (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: 'white'
    }}>
      <ProductosTable
        productos={productos}
        loading={loading}
        selectedProduct={selectedProduct}
        searchStatus={pdfViewer.searchState.searchStatus}
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
        onAgregarProducto={() => setShowAddModal(true)}
        onAltaProductoCatalogo={(producto) => {
          setProductoParaAltaCatalogo(producto)
          setShowAddProductQuickAccessModal(true)
        }}
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
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
                (() => {
                  // Intentar obtener nombre del colegio desde diferentes estructuras posibles
                  const colegio = lista.colegio
                  if (!colegio) return 'N/A'
                  
                  // Estructura normalizada (después de normalizarCursoStrapi)
                  const nombre = colegio.colegio_nombre || 
                                 colegio.nombre ||
                                 (colegio as any)?.data?.attributes?.colegio_nombre ||
                                 (colegio as any)?.data?.attributes?.nombre ||
                                 (colegio as any)?.data?.colegio_nombre ||
                                 (colegio as any)?.data?.nombre ||
                                 (colegio as any)?.attributes?.colegio_nombre ||
                                 (colegio as any)?.attributes?.nombre ||
                                 null
                  
                  // Obtener RBD
                  const rbd = colegio.rbd ||
                              (colegio as any)?.data?.attributes?.rbd ||
                              (colegio as any)?.data?.rbd ||
                              (colegio as any)?.attributes?.rbd ||
                              null
                  
                  if (nombre) {
                    return rbd ? `${nombre} (RBD: ${rbd})` : nombre
                  }
                  return 'N/A'
                })()
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
          <div className="d-flex gap-2">
            {puedeIrAListasDelCurso && (
              <Button
                variant="outline-light"
                size="sm"
                onClick={handleIrAListasDelCurso}
                disabled={navegandoAColegio}
                className="d-flex align-items-center"
                title="Ver cursos de este colegio (RBD)"
              >
                <TbArrowLeft className="me-1" />
                {navegandoAColegio ? 'Cargando cursos...' : 'Listas del Curso'}
              </Button>
            )}
            <Button
              variant="light"
              size="sm"
              onClick={() => router.push('/crm/listas')}
              className="d-flex align-items-center"
              title="Volver a la lista de colegios"
            >
              <TbArrowLeft className="me-1" />
              Volver a Colegios
            </Button>
          </div>
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
        onAdd={handleAgregarProducto}
        loading={loading}
        nextOrden={productos.length + 1}
      />

      <AddProductQuickAccessModal
        show={showAddProductQuickAccessModal}
        onHide={() => {
          setShowAddProductQuickAccessModal(false)
          setProductoParaAltaCatalogo(null)
        }}
        productPrecargado={productoParaAltaCatalogo}
        onSuccess={() => {
          toast.success('Producto creado en catálogo')
          cargarProductos(true)
        }}
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
