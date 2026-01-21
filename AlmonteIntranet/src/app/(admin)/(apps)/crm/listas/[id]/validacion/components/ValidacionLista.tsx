'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button, Card, CardBody, Col, Row, Badge, Table, FormCheck, Spinner, Alert, Container, Modal, Form } from 'react-bootstrap'
import { TbArrowLeft, TbArrowRight, TbZoomIn, TbZoomOut, TbCheck, TbX, TbSparkles, TbRefresh, TbChecklist, TbEdit, TbTrash, TbFileText } from 'react-icons/tb'
import { Document, Page as PDFPage, pdfjs } from 'react-pdf'
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import 'react-pdf/dist/esm/Page/TextLayer.css'
import PageBreadcrumb from '@/components/PageBreadcrumb'

pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs'

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

interface CoordenadasProducto {
  pagina: number
  posicion_x?: number
  posicion_y?: number
  region?: string
}

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
  descripcion?: string
  woocommerce_id?: number
  woocommerce_sku?: string
  stock_quantity?: number
  encontrado_en_woocommerce?: boolean
  coordenadas?: CoordenadasProducto
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
  const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [processingPDF, setProcessingPDF] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<string | number | null>(null)
  const [selectedProductData, setSelectedProductData] = useState<ProductoIdentificado | null>(null)
  const [tabActivo, setTabActivo] = useState<'todos' | 'disponibles' | 'no-disponibles'>('todos')
  const [showEditModal, setShowEditModal] = useState(false)
  const [productoEditando, setProductoEditando] = useState<ProductoIdentificado | null>(null)
  const [formEditData, setFormEditData] = useState<any>({})
  const [showLogsModal, setShowLogsModal] = useState(false)
  const [logs, setLogs] = useState<Array<{ timestamp: string; level: string; message: string; data?: any }>>([])
  const [loadingLogs, setLoadingLogs] = useState(false)
  
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
        materiales: materiales.slice(0, 3).map((m: any) => ({
          nombre: m.nombre,
          nombre_producto: m.nombre_producto,
          imagen: m.imagen,
          imagen_url: m.imagen_url,
          image: m.image,
          todas_las_keys: Object.keys(m),
          disponibilidad: m.disponibilidad,
          encontrado_en_woocommerce: m.encontrado_en_woocommerce,
          stock_quantity: m.stock_quantity,
        }))
      })
      
      // Transformar materiales a productos identificados
      const productosTransformados: ProductoIdentificado[] = materiales.map((material: any, index: number) => {
        // Intentar obtener el nombre de múltiples campos posibles
        const nombreProducto = material.nombre || 
                              material.nombre_producto || 
                              material.NOMBRE || 
                              material.Nombre || 
                              material.producto_nombre ||
                              material.descripcion || // Fallback a descripción si no hay nombre
                              `Producto ${index + 1}`
        
        console.log(`[ValidacionLista] Producto ${index + 1}:`, {
          nombre_original: material.nombre,
          nombre_producto: material.nombre_producto,
          nombre_final: nombreProducto,
          todas_las_keys: Object.keys(material)
        })
        
        // Normalizar coordenadas si existen
        let coordenadas: CoordenadasProducto | undefined = undefined
        if (material.coordenadas) {
          coordenadas = {
            pagina: parseInt(String(material.coordenadas.pagina)) || 1,
            posicion_x: material.coordenadas.posicion_x !== undefined 
              ? parseFloat(String(material.coordenadas.posicion_x)) 
              : undefined,
            posicion_y: material.coordenadas.posicion_y !== undefined 
              ? parseFloat(String(material.coordenadas.posicion_y)) 
              : undefined,
            region: material.coordenadas.region || undefined,
          }
        } else if (material.pagina !== undefined) {
          // Fallback: si viene como campo directo "pagina"
          coordenadas = {
            pagina: parseInt(String(material.pagina)) || 1,
          }
        }
        
        return {
          id: material.id || `producto-${index + 1}`,
          validado: material.aprobado !== undefined ? material.aprobado : (material.validado || false),
          imagen: material.imagen || material.imagen_url || material.image || material.image_url || undefined,
          isbn: material.isbn || material.sku || material.woocommerce_sku || undefined,
          nombre: nombreProducto,
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
          coordenadas: coordenadas,
        }
      })

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

  // Función para navegar al producto en el PDF usando coordenadas
  const navegarAProductoEnPDF = (producto: ProductoIdentificado) => {
    if (producto.coordenadas && producto.coordenadas.pagina) {
      const paginaProducto = producto.coordenadas.pagina
      if (paginaProducto >= 1 && paginaProducto <= numPages) {
        setPageNumber(paginaProducto)
        // Scroll suave al visor de PDF si está en la misma página
        setTimeout(() => {
          const pdfViewer = document.querySelector('.pdf-viewer-container')
          if (pdfViewer) {
            pdfViewer.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }, 100)
      }
    }
  }

  const handleProductoClick = (productoId: string | number) => {
    const producto = productos.find(p => p.id === productoId)
    if (producto) {
      const isAlreadySelected = selectedProduct === productoId
      setSelectedProduct(isAlreadySelected ? null : productoId)
      setSelectedProductData(isAlreadySelected ? null : producto)
      
      // Si el producto tiene coordenadas, navegar a esa página
      if (!isAlreadySelected && producto.coordenadas) {
        navegarAProductoEnPDF(producto)
      }
    } else {
      setSelectedProduct(null)
      setSelectedProductData(null)
    }
  }

  const toggleValidado = async (productoId: string | number) => {
    const producto = productos.find(p => p.id === productoId)
    if (!producto) {
      console.error('[ValidacionLista] Producto no encontrado:', productoId)
      return
    }

    const nuevoEstado = !producto.validado
    const idParaUsar = listaIdFromUrl || lista?.id || lista?.documentId

    if (!idParaUsar) {
      alert('No se puede aprobar: ID de lista no encontrado')
      return
    }

    // Actualizar estado local inmediatamente (optimistic update)
    setProductos(prev => prev.map(p => 
      p.id === productoId ? { ...p, validado: nuevoEstado } : p
    ))

    try {
      // Enviar tanto el ID como el nombre para mayor confiabilidad
      const response = await fetch(`/api/crm/listas/${idParaUsar}/aprobar-producto`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productoId: productoId,
          productoNombre: producto.nombre, // Enviar nombre como respaldo
          productoIndex: productos.findIndex(p => p.id === productoId), // Enviar índice como respaldo
          aprobado: nuevoEstado,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al aprobar el producto')
      }

      // Si todos los productos están aprobados, mostrar mensaje
      if (data.data.listaAprobada) {
        console.log('[ValidacionLista] ✅ Todos los productos aprobados, lista marcada como aprobada')
        // Recargar datos para obtener el estado actualizado
        await cargarProductos(true)
      }

      console.log('[ValidacionLista] ✅ Producto aprobado:', { productoId, aprobado: nuevoEstado })
    } catch (error: any) {
      console.error('[ValidacionLista] ❌ Error al aprobar producto:', error)
      // Revertir cambio local si falla
      setProductos(prev => prev.map(p => 
        p.id === productoId ? { ...p, validado: !nuevoEstado } : p
      ))
      alert(`Error al ${nuevoEstado ? 'aprobar' : 'desaprobar'} el producto: ${error.message}`)
    }
  }

  const aprobarListaCompleta = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    console.log('[ValidacionLista] 🚀 Iniciando aprobación de lista completa...', {
      loading,
      totalProductos,
      productosLength: productos.length,
      idParaUsar: listaIdFromUrl || lista?.id || lista?.documentId
    })
    
    // Validaciones tempranas
    if (loading) {
      console.warn('[ValidacionLista] ⚠️ Ya hay una aprobación en proceso')
      return
    }

    if (productos.length === 0) {
      console.warn('[ValidacionLista] ⚠️ No hay productos para aprobar')
      alert('No hay productos para aprobar')
      return
    }
    
    const idParaUsar = listaIdFromUrl || lista?.id || lista?.documentId

    if (!idParaUsar) {
      console.error('[ValidacionLista] ❌ ID de lista no encontrado')
      alert('No se puede aprobar: ID de lista no encontrado')
      return
    }

    if (!confirm(`¿Estás seguro de que deseas aprobar todos los ${productos.length} productos de esta lista?`)) {
      console.log('[ValidacionLista] ❌ Usuario canceló la aprobación')
      return
    }

    console.log('[ValidacionLista] ✅ Usuario confirmó, iniciando aprobación...')
    setLoading(true)
    
    try {
      console.log('[ValidacionLista] 📤 Enviando solicitud a /api/crm/listas/aprobar-lista...', {
        listaId: idParaUsar
      })
      
      const response = await fetch('/api/crm/listas/aprobar-lista', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          listaId: idParaUsar,
        }),
      })

      console.log('[ValidacionLista] 📥 Respuesta recibida:', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText
      })

      const data = await response.json()
      console.log('[ValidacionLista] 📥 Datos de respuesta:', data)

      if (!response.ok || !data.success) {
        const errorMsg = data.error || data.details || 'Error al aprobar la lista'
        console.error('[ValidacionLista] ❌ Error en respuesta:', errorMsg)
        throw new Error(errorMsg)
      }

      console.log('[ValidacionLista] ✅ Lista aprobada exitosamente')
      alert('✅ Lista aprobada exitosamente. Todos los productos han sido marcados como aprobados.')
      
      // Recargar datos
      console.log('[ValidacionLista] 🔄 Recargando productos...')
      await cargarProductos(true)
    } catch (error: any) {
      console.error('[ValidacionLista] ❌ Error al aprobar lista:', error)
      console.error('[ValidacionLista] ❌ Stack:', error.stack)
      alert(`Error al aprobar la lista: ${error.message}`)
    } finally {
      setLoading(false)
      console.log('[ValidacionLista] ✅ Proceso de aprobación finalizado')
    }
  }

  const handleEditarProducto = (producto: ProductoIdentificado) => {
    console.log('[ValidacionLista] 📝 Editando producto:', producto)
    setProductoEditando(producto)
    const datosIniciales = {
      nombre: producto.nombre,
      cantidad: producto.cantidad,
      isbn: producto.isbn || '',
      marca: producto.marca || '',
      precio: producto.precio || 0,
      asignatura: producto.asignatura || '',
      descripcion: producto.descripcion || '',
      comprar: producto.comprar !== false,
      stock_quantity: producto.stock_quantity !== undefined ? producto.stock_quantity : undefined,
    }
    console.log('[ValidacionLista] 📝 Datos iniciales del formulario:', datosIniciales)
    setFormEditData(datosIniciales)
    setShowEditModal(true)
  }

  const handleEliminarProducto = async (producto: ProductoIdentificado) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar "${producto.nombre}" de la lista?`)) {
      return
    }

    const idParaUsar = listaIdFromUrl || lista?.id || lista?.documentId
    if (!idParaUsar) {
      alert('No se puede eliminar: ID de lista no encontrado')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/crm/listas/${idParaUsar}/productos/${producto.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al eliminar el producto')
      }

      alert('✅ Producto eliminado exitosamente')
      
      // Recargar datos
      await cargarProductos(true)
    } catch (error: any) {
      console.error('[ValidacionLista] ❌ Error al eliminar producto:', error)
      alert(`Error al eliminar el producto: ${error.message}`)
    } finally {
      setLoading(false)
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
      console.error('[ValidacionLista] ❌ Error al cargar logs:', error)
      alert(`Error al cargar logs: ${error.message}`)
    } finally {
      setLoadingLogs(false)
    }
  }

  const handleGuardarEdicion = async () => {
    if (!productoEditando) {
      console.error('[ValidacionLista] ❌ No hay producto seleccionado para editar')
      alert('Error: No hay producto seleccionado')
      return
    }

    const idParaUsar = listaIdFromUrl || lista?.id || lista?.documentId
    if (!idParaUsar) {
      console.error('[ValidacionLista] ❌ ID de lista no encontrado')
      alert('No se puede editar: ID de lista no encontrado')
      return
    }

    console.log('[ValidacionLista] 💾 Guardando edición:', {
      listaId: idParaUsar,
      productoId: productoEditando.id,
      productoNombre: productoEditando.nombre,
      formData: formEditData,
    })

    setLoading(true)
    try {
      const productoIndex = productos.findIndex(p => p.id === productoEditando.id)
      console.log('[ValidacionLista] 📍 Índice del producto:', productoIndex)
      
      const payload = {
        ...formEditData,
        nombre: formEditData.nombre, // Asegurar que el nombre esté presente
        index: productoIndex,
      }
      
      console.log('[ValidacionLista] 📤 Enviando payload:', payload)
      
      const response = await fetch(`/api/crm/listas/${idParaUsar}/productos/${productoEditando.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      console.log('[ValidacionLista] 📥 Respuesta recibida:', response.status, response.statusText)

      const data = await response.json()
      console.log('[ValidacionLista] 📥 Datos de respuesta:', data)

      if (!response.ok || !data.success) {
        const errorMsg = data.error || data.details || 'Error al editar el producto'
        console.error('[ValidacionLista] ❌ Error en respuesta:', errorMsg)
        throw new Error(errorMsg)
      }

      // Mostrar mensaje con información de actualización
      let mensaje = '✅ Producto editado exitosamente'
      if (data.data?.actualizadoEnWooCommerce) {
        mensaje += '\n\n🔄 También se actualizó en WooCommerce'
        if (data.data.actualizacionesWooCommerce && data.data.actualizacionesWooCommerce.length > 0) {
          mensaje += `:\n${data.data.actualizacionesWooCommerce.map((a: string) => `  • ${a}`).join('\n')}`
        }
      } else if (productoEditando?.woocommerce_id) {
        mensaje += '\n\n⚠️ No se pudo actualizar en WooCommerce (el producto tiene woocommerce_id pero hubo un error)'
      } else {
        mensaje += '\n\nℹ️ Solo se actualizó en la lista (el producto no está vinculado a WooCommerce)'
      }
      
      alert(mensaje)
      setShowEditModal(false)
      setProductoEditando(null)
      setFormEditData({})
      
      // Recargar datos
      console.log('[ValidacionLista] 🔄 Recargando productos...')
      await cargarProductos(true)
    } catch (error: any) {
      console.error('[ValidacionLista] ❌ Error al editar producto:', error)
      console.error('[ValidacionLista] ❌ Stack:', error.stack)
      alert(`Error al editar el producto: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Separar productos por disponibilidad
  const productosDisponibles = productos.filter(p => 
    p.encontrado_en_woocommerce === true && p.disponibilidad === 'disponible'
  )
  const productosNoDisponibles = productos.filter(p => 
    p.encontrado_en_woocommerce === false || p.disponibilidad !== 'disponible'
  )
  
  const totalProductos = productos.length
  const disponibles = productosDisponibles.length
  const noDisponibles = productosNoDisponibles.length
  const paraComprar = productos.filter(p => p.comprar).length
  const validados = productos.filter(p => p.validado).length
  const encontradosEnWooCommerce = productos.filter(p => p.encontrado_en_woocommerce === true).length
  const noEncontradosEnWooCommerce = productos.filter(p => p.encontrado_en_woocommerce === false).length
  
  // Productos a mostrar según el tab
  const productosAMostrar = tabActivo === 'disponibles' 
    ? productosDisponibles 
    : tabActivo === 'no-disponibles' 
    ? productosNoDisponibles 
    : productos

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
                  {/* Tabs de filtrado */}
                  <div style={{ 
                    padding: '0.75rem 1rem', 
                    borderBottom: '1px solid #dee2e6',
                    background: '#f8f9fa'
                  }}>
                    <div className="btn-group" role="group">
                      <button
                        type="button"
                        className={`btn btn-sm ${tabActivo === 'todos' ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => setTabActivo('todos')}
                      >
                        Todos ({productos.length})
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${tabActivo === 'disponibles' ? 'btn-success' : 'btn-outline-success'}`}
                        onClick={() => setTabActivo('disponibles')}
                      >
                        Disponibles ({disponibles})
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${tabActivo === 'no-disponibles' ? 'btn-warning' : 'btn-outline-warning'}`}
                        onClick={() => setTabActivo('no-disponibles')}
                      >
                        No Disponibles ({noDisponibles})
                      </button>
                    </div>
                  </div>
                  
                  <div style={{ 
                    overflowY: 'auto', 
                    flexGrow: 1,
                    maxHeight: 'calc(100vh - 300px)'
                  }}>
                    <Table hover responsive className="mb-0">
                      <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
                        <tr>
                          <th style={{ width: '50px' }}>Validado</th>
                          <th style={{ width: '100px' }}>Imagen</th>
                          <th>ISBN</th>
                          <th>Nombre Producto</th>
                          <th>Marca</th>
                          <th style={{ width: '80px' }}>Cantidad</th>
                          <th style={{ width: '100px' }}>Comprar</th>
                          <th style={{ width: '140px' }}>Disponibilidad</th>
                          <th style={{ width: '100px' }}>Precio</th>
                          <th>Asignatura</th>
                          <th style={{ width: '120px' }}>Ubicación PDF</th>
                          <th style={{ width: '100px' }}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productosAMostrar.length === 0 ? (
                          <tr>
                            <td colSpan={12} className="text-center py-4">
                              <Alert variant="info" className="mb-0">
                                No hay productos en esta categoría
                              </Alert>
                            </td>
                          </tr>
                        ) : (
                          productosAMostrar.map((producto) => (
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
                                <div 
                                  style={{ 
                                    position: 'relative',
                                    width: '80px', 
                                    height: '80px',
                                    cursor: 'pointer',
                                    borderRadius: '4px',
                                    overflow: 'hidden',
                                    border: '1px solid #dee2e6'
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    window.open(producto.imagen, '_blank')
                                  }}
                                  title="Click para ver imagen completa"
                                >
                                  <img 
                                    src={producto.imagen} 
                                    alt={producto.nombre}
                                    style={{ 
                                      width: '100%', 
                                      height: '100%', 
                                      objectFit: 'cover',
                                      transition: 'transform 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.transform = 'scale(1.1)'
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.transform = 'scale(1)'
                                    }}
                                    onError={(e) => {
                                      console.warn('[ValidacionLista] ⚠️ Error cargando imagen:', producto.imagen, 'para producto:', producto.nombre)
                                      e.currentTarget.style.display = 'none'
                                      const parent = e.currentTarget.parentElement
                                      if (parent) {
                                        parent.innerHTML = '<div style="width: 100%; height: 100%; background: #f0f0f0; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; color: #999;">Sin imagen</div>'
                                      }
                                    }}
                                    onLoad={() => {
                                      console.log('[ValidacionLista] ✅ Imagen cargada exitosamente:', producto.imagen, 'para producto:', producto.nombre)
                                    }}
                                  />
                                </div>
                              ) : (
                                <div style={{ 
                                  width: '80px', 
                                  height: '80px', 
                                  background: '#f0f0f0',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.7rem',
                                  color: '#999',
                                  borderRadius: '4px',
                                  border: '1px solid #dee2e6'
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
                              {producto.encontrado_en_woocommerce === true ? (
                                <Badge bg={producto.disponibilidad === 'disponible' ? 'success' : 'danger'}>
                                  {producto.disponibilidad === 'disponible' ? '✅ Disponible' : '❌ No disponible'}
                                  {producto.stock_quantity !== undefined && producto.stock_quantity > 0 && (
                                    <span className="ms-1">({producto.stock_quantity})</span>
                                  )}
                                </Badge>
                              ) : (
                                <Badge bg="warning" text="dark">
                                  ⚠️ No encontrado
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
                            <td>
                              {producto.coordenadas ? (
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    navegarAProductoEnPDF(producto)
                                  }}
                                  title={`Ir a página ${producto.coordenadas.pagina} del PDF`}
                                  style={{ fontSize: '0.75rem' }}
                                >
                                  📄 Pág. {producto.coordenadas.pagina}
                                  {producto.coordenadas.region && (
                                    <small className="d-block" style={{ fontSize: '0.65rem', opacity: 0.7 }}>
                                      {producto.coordenadas.region}
                                    </small>
                                  )}
                                </Button>
                              ) : (
                                <span className="text-muted" style={{ fontSize: '0.75rem' }}>-</span>
                              )}
                            </td>
                            <td>
                              <div className="d-flex gap-1">
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleEditarProducto(producto)
                                  }}
                                  title="Editar producto"
                                >
                                  <TbEdit />
                                </Button>
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleEliminarProducto(producto)
                                  }}
                                  title="Eliminar producto"
                                >
                                  <TbTrash />
                                </Button>
                              </div>
                            </td>
                          </tr>
                          ))
                        )}
                      </tbody>
                    </Table>
                  </div>

                  {/* Resumen */}
                  <div style={{ 
                    padding: '1rem', 
                    borderTop: '1px solid #dee2e6',
                    background: '#f8f9fa'
                  }}>
                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                      <div>
                        <strong>Total productos:</strong> {totalProductos} | 
                        <strong className="ms-2">Para comprar:</strong> {paraComprar} | 
                        <strong className="ms-2">Disponibles:</strong> {disponibles} |
                        <strong className={`ms-2 ${validados === totalProductos && totalProductos > 0 ? 'text-success' : ''}`}>
                          Aprobados: {validados}/{totalProductos}
                        </strong>
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
                      <div className="d-flex gap-2 align-items-center">
                        {validados === totalProductos && totalProductos > 0 && (
                          <Badge bg="success" className="d-flex align-items-center" style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}>
                            <TbChecklist className="me-2" />
                            Lista Aprobada
                          </Badge>
                        )}
                        <Button
                          variant="success"
                          size="sm"
                          onClick={aprobarListaCompleta}
                          disabled={loading || totalProductos === 0}
                          className="d-flex align-items-center"
                          title={totalProductos === 0 ? 'No hay productos para aprobar' : loading ? 'Aprobando...' : 'Aprobar todos los productos de la lista'}
                        >
                          {loading ? (
                            <>
                              <Spinner size="sm" className="me-2" />
                              Aprobando...
                            </>
                          ) : (
                            <>
                              <TbChecklist className="me-2" />
                              Aprobar Lista Completa
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardBody>
          </Card>
        </Col>

        {/* Columna Derecha: PDF Viewer */}
        <Col xs={12} md={6} className="pdf-viewer-container" style={{ 
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
                    <div className="d-flex gap-2">
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
                      <Button 
                        variant="outline-info" 
                        size="sm"
                        onClick={cargarLogs}
                        disabled={loadingLogs}
                        className="d-flex align-items-center"
                        title="Ver logs del procesamiento"
                      >
                        {loadingLogs ? (
                          <>
                            <Spinner size="sm" className="me-2" />
                            Cargando...
                          </>
                        ) : (
                          <>
                            <TbFileText className="me-2" />
                            Ver Logs
                          </>
                        )}
                      </Button>
                    </div>
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
                    <div style={{ position: 'relative', display: 'inline-block' }}>
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
                          onRenderSuccess={(page) => {
                            // Guardar las dimensiones de la página renderizada
                            if (page.width && page.height) {
                              setPageDimensions({
                                width: page.width,
                                height: page.height
                              })
                            }
                          }}
                        />
                      </Document>
                      
                      {/* Overlay para resaltar productos */}
                      {selectedProductData?.coordenadas && 
                       selectedProductData.coordenadas.pagina === pageNumber && (
                        <div
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            pointerEvents: 'none',
                            zIndex: 10,
                          }}
                        >
                          {/* Resaltado amarillo con coordenadas precisas - Ajustado para apuntar exactamente al título */}
                          {selectedProductData.coordenadas.posicion_x !== undefined && 
                           selectedProductData.coordenadas.posicion_y !== undefined ? (
                            <>
                              {/* Resaltado principal - más pequeño y preciso para el título del producto */}
                              <div
                                style={{
                                  position: 'absolute',
                                  left: `${selectedProductData.coordenadas.posicion_x}%`,
                                  top: `${selectedProductData.coordenadas.posicion_y}%`,
                                  // Tamaño ajustado dinámicamente al largo del nombre del producto
                                  width: `${Math.min(selectedProductData.nombre.length * 0.75 + 5, 45)}%`, // Ajustado al largo del nombre
                                  minWidth: '100px', // Mínimo para títulos cortos
                                  maxWidth: '55%', // Máximo para títulos largos
                                  height: '30px', // Altura fija para una línea de texto típica
                                  backgroundColor: 'rgba(255, 235, 59, 0.7)', // Más opaco para mejor visibilidad
                                  border: '3px solid rgba(255, 193, 7, 1)', // Borde más visible y sólido
                                  borderRadius: '5px',
                                  boxShadow: '0 4px 16px rgba(255, 193, 7, 0.9), inset 0 0 10px rgba(255, 235, 59, 0.5)',
                                  transform: 'translate(-50%, -50%)', // Centrado exacto en las coordenadas
                                  pointerEvents: 'none',
                                  animation: 'pulse 2s ease-in-out infinite',
                                  zIndex: 11,
                                }}
                              />
                              {/* Etiqueta con nombre del producto - posicionada arriba del resaltado */}
                              <div
                                style={{
                                  position: 'absolute',
                                  top: `${selectedProductData.coordenadas.posicion_y}%`,
                                  left: `${selectedProductData.coordenadas.posicion_x}%`,
                                  transform: 'translate(-50%, calc(-100% - 12px))', // Arriba del resaltado con espacio
                                  backgroundColor: 'rgba(255, 193, 7, 0.98)',
                                  color: '#000',
                                  padding: '6px 14px',
                                  borderRadius: '6px',
                                  fontSize: '0.85rem',
                                  fontWeight: 'bold',
                                  boxShadow: '0 4px 10px rgba(0,0,0,0.4)',
                                  maxWidth: '400px',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  zIndex: 12,
                                  border: '2px solid rgba(255, 152, 0, 0.9)',
                                }}
                                title={selectedProductData.nombre}
                              >
                                📍 {selectedProductData.nombre}
                              </div>
                              {/* Indicador de posición exacta - punto pequeño en el centro exacto */}
                              <div
                                style={{
                                  position: 'absolute',
                                  left: `${selectedProductData.coordenadas.posicion_x}%`,
                                  top: `${selectedProductData.coordenadas.posicion_y}%`,
                                  width: '10px',
                                  height: '10px',
                                  backgroundColor: '#FF6F00',
                                  border: '3px solid #FFF',
                                  borderRadius: '50%',
                                  transform: 'translate(-50%, -50%)',
                                  pointerEvents: 'none',
                                  zIndex: 13,
                                  boxShadow: '0 0 12px rgba(255, 111, 0, 1), 0 0 6px rgba(255, 193, 7, 0.8)',
                                  animation: 'pulse 1.5s ease-in-out infinite',
                                }}
                              />
                            </>
                          ) : (
                            // Si no hay coordenadas X/Y precisas, mostrar un resaltado general en la región
                            <div
                              style={{
                                position: 'absolute',
                                top: '5%',
                                left: '5%',
                                right: '5%',
                                bottom: '5%',
                                backgroundColor: 'rgba(255, 235, 59, 0.25)',
                                border: '4px dashed rgba(255, 193, 7, 0.7)',
                                borderRadius: '10px',
                                pointerEvents: 'none',
                                animation: 'pulse 2s ease-in-out infinite',
                              }}
                            >
                              <div
                                style={{
                                  position: 'absolute',
                                  top: '15px',
                                  left: '15px',
                                  backgroundColor: 'rgba(255, 193, 7, 0.98)',
                                  color: '#000',
                                  padding: '6px 14px',
                                  borderRadius: '6px',
                                  fontSize: '0.9rem',
                                  fontWeight: 'bold',
                                  boxShadow: '0 3px 6px rgba(0,0,0,0.3)',
                                  maxWidth: '400px',
                                }}
                              >
                                📍 {selectedProductData.nombre}
                                {selectedProductData.coordenadas.region && (
                                  <span style={{ fontSize: '0.75rem', marginLeft: '10px', opacity: 0.8, display: 'block', marginTop: '4px' }}>
                                    Región: {selectedProductData.coordenadas.region}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
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

      {/* Modal para editar producto */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Editar Producto</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Nombre del Producto *</Form.Label>
            <Form.Control
              type="text"
              value={formEditData.nombre || ''}
              onChange={(e) => setFormEditData({ ...formEditData, nombre: e.target.value })}
              required
            />
          </Form.Group>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Cantidad *</Form.Label>
                <Form.Control
                  type="number"
                  min="1"
                  value={formEditData.cantidad || 1}
                  onChange={(e) => setFormEditData({ ...formEditData, cantidad: parseInt(e.target.value) || 1 })}
                  required
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Precio</Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  step="0.01"
                  value={formEditData.precio || 0}
                  onChange={(e) => setFormEditData({ ...formEditData, precio: parseFloat(e.target.value) || 0 })}
                />
                {productoEditando?.woocommerce_id && (
                  <Form.Text className="text-muted">
                    💰 Este precio se actualizará también en WooCommerce
                  </Form.Text>
                )}
              </Form.Group>
            </Col>
          </Row>

          {/* Mostrar información de WooCommerce si el producto está vinculado */}
          {productoEditando?.woocommerce_id && (
            <>
              <Alert variant="info" className="mb-3">
                <strong>🔄 Sincronización con WooCommerce:</strong>
                <br />
                Este producto está vinculado a WooCommerce (ID: {productoEditando.woocommerce_id}).
                <br />
                Los cambios en <strong>nombre</strong>, <strong>precio</strong>, <strong>ISBN/SKU</strong>, <strong>descripción</strong> y <strong>stock</strong> se actualizarán también en WooCommerce.
              </Alert>
              
              {/* Campo para editar stock si está vinculado a WooCommerce */}
              <Form.Group className="mb-3">
                <Form.Label>
                  Stock en WooCommerce
                  {productoEditando.stock_quantity !== undefined && (
                    <Badge bg={productoEditando.stock_quantity > 0 ? 'success' : 'danger'} className="ms-2">
                      Actual: {productoEditando.stock_quantity}
                    </Badge>
                  )}
                </Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  value={formEditData.stock_quantity !== undefined ? formEditData.stock_quantity : (productoEditando.stock_quantity || 0)}
                  onChange={(e) => setFormEditData({ ...formEditData, stock_quantity: parseInt(e.target.value) || 0 })}
                  placeholder="Ingrese la cantidad en stock"
                />
                <Form.Text className="text-muted">
                  📦 Este stock se actualizará en WooCommerce. Si el stock es 0 o negativo, el producto se marcará como "outofstock".
                </Form.Text>
                {productoEditando.stock_quantity !== undefined && productoEditando.stock_quantity < 0 && (
                  <Alert variant="warning" className="mt-2 mb-0">
                    ⚠️ <strong>Stock negativo detectado:</strong> El producto tiene stock negativo ({productoEditando.stock_quantity}). 
                    Actualice el stock a un valor positivo para que el producto se marque como disponible.
                  </Alert>
                )}
              </Form.Group>
            </>
          )}

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>ISBN / SKU</Form.Label>
                <Form.Control
                  type="text"
                  value={formEditData.isbn || ''}
                  onChange={(e) => setFormEditData({ ...formEditData, isbn: e.target.value })}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Marca</Form.Label>
                <Form.Control
                  type="text"
                  value={formEditData.marca || ''}
                  onChange={(e) => setFormEditData({ ...formEditData, marca: e.target.value })}
                />
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Label>Asignatura</Form.Label>
            <Form.Control
              type="text"
              value={formEditData.asignatura || ''}
              onChange={(e) => setFormEditData({ ...formEditData, asignatura: e.target.value })}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Descripción</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={formEditData.descripcion || ''}
              onChange={(e) => setFormEditData({ ...formEditData, descripcion: e.target.value })}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Check
              type="checkbox"
              label="Marcar para comprar"
              checked={formEditData.comprar !== false}
              onChange={(e) => setFormEditData({ ...formEditData, comprar: e.target.checked })}
            />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={() => setShowEditModal(false)}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={handleGuardarEdicion} disabled={loading}>
          {loading ? (
            <>
              <Spinner size="sm" className="me-2" />
              Guardando...
            </>
          ) : (
            'Guardar Cambios'
          )}
        </Button>
      </Modal.Footer>
      </Modal>

      {/* Modal para ver logs */}
      <Modal show={showLogsModal} onHide={() => setShowLogsModal(false)} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>Logs del Procesamiento</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div style={{ 
            maxHeight: '60vh', 
            overflowY: 'auto',
            fontFamily: 'monospace',
            fontSize: '0.85rem',
            background: '#1e1e1e',
            color: '#d4d4d4',
            padding: '1rem',
            borderRadius: '4px'
          }}>
            {logs.length === 0 ? (
              <div className="text-center text-muted py-4">
                No hay logs disponibles. Procesa un PDF para ver los logs.
              </div>
            ) : (
              logs.map((log, index) => (
                <div 
                  key={index}
                  style={{
                    marginBottom: '0.5rem',
                    padding: '0.25rem 0',
                    borderBottom: index < logs.length - 1 ? '1px solid #333' : 'none',
                    color: log.level === 'error' ? '#f48771' : 
                           log.level === 'warn' ? '#dcdcaa' : '#4ec9b0'
                  }}
                >
                  <span style={{ color: '#858585', marginRight: '0.5rem' }}>
                    {new Date(log.timestamp).toLocaleTimeString('es-CL')}
                  </span>
                  <span style={{ 
                    fontWeight: 'bold',
                    marginRight: '0.5rem',
                    color: log.level === 'error' ? '#f48771' : 
                           log.level === 'warn' ? '#dcdcaa' : '#4ec9b0'
                  }}>
                    [{log.level.toUpperCase()}]
                  </span>
                  <span>{log.message}</span>
                  {log.data && (
                    <pre style={{ 
                      marginTop: '0.25rem',
                      marginLeft: '2rem',
                      fontSize: '0.75rem',
                      color: '#858585',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}>
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowLogsModal(false)}>
            Cerrar
          </Button>
          <Button variant="primary" onClick={cargarLogs} disabled={loadingLogs}>
            {loadingLogs ? (
              <>
                <Spinner size="sm" className="me-2" />
                Actualizando...
              </>
            ) : (
              <>
                <TbRefresh className="me-2" />
                Actualizar Logs
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}
