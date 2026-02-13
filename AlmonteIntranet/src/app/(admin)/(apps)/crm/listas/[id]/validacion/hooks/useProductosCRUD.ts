/**
 * Hook para manejar operaciones CRUD de productos
 * Extrae la lógica de aprobar, editar, eliminar productos
 * Usa react-hot-toast para notificaciones
 */

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Swal from 'sweetalert2'
import type { ProductoIdentificado, ListaData } from '../types'
import { toast } from './useToast'

interface UseProductosCRUDParams {
  lista: ListaData | null
  listaIdFromUrl: string
  productos: ProductoIdentificado[]
  onSuccess?: () => Promise<void> | void
  setProductos: React.Dispatch<React.SetStateAction<ProductoIdentificado[]>>
  setEstadoRevision: React.Dispatch<React.SetStateAction<'borrador' | 'revisado' | 'publicado' | null>>
  normalizarLista?: (listaData: any) => ListaData | null
  setLista?: React.Dispatch<React.SetStateAction<ListaData | null>>
  setSelectedProduct?: React.Dispatch<React.SetStateAction<string | number | null>>
  setSelectedProductData?: React.Dispatch<React.SetStateAction<ProductoIdentificado | null>>
}

// Función de confirmación usando SweetAlert2 (solo para diálogos)
const confirmar = async (options: {
  title: string
  text?: string
  confirmText?: string
  cancelText?: string
  type?: 'warning' | 'question' | 'info'
}): Promise<boolean> => {
  const result = await Swal.fire({
    title: options.title,
    text: options.text,
    icon: options.type || 'question',
    showCancelButton: true,
    confirmButtonColor: '#667eea',
    cancelButtonColor: '#6c757d',
    confirmButtonText: options.confirmText || 'Confirmar',
    cancelButtonText: options.cancelText || 'Cancelar',
    reverseButtons: true
  })
  return result.isConfirmed
}

export function useProductosCRUD({
  lista,
  listaIdFromUrl,
  productos,
  onSuccess,
  setProductos,
  setEstadoRevision,
  normalizarLista,
  setLista,
  setSelectedProduct,
  setSelectedProductData
}: UseProductosCRUDParams) {
  const router = useRouter()
  const [isApprovingProduct, setIsApprovingProduct] = useState<string | number | null>(null)
  const [isApproving, setIsApproving] = useState(false)
  const [loading, setLoading] = useState(false)

  const aprobarProducto = useCallback(async (productoId: string | number) => {
    const producto = productos.find(p => p.id === productoId)
    if (!producto) {
      toast.error('Producto no encontrado')
      return
    }

    const nuevoEstado = !producto.validado
    const idParaUsar = listaIdFromUrl || lista?.id || lista?.documentId

    if (!idParaUsar) {
      toast.error('ID de lista no encontrado')
      return
    }

    setIsApprovingProduct(productoId)

    // Optimistic update
    setProductos(prev => prev.map(p =>
      p.id === productoId ? { ...p, validado: nuevoEstado } : p
    ))

    try {
      const response = await fetch(`/api/crm/listas/${idParaUsar}/aprobar-producto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productoId: productoId,
          productoNombre: producto.nombre,
          productoIndex: productos.findIndex(p => p.id === productoId),
          aprobado: nuevoEstado,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setProductos(prev => prev.map(p =>
          p.id === productoId ? { ...p, validado: !nuevoEstado } : p
        ))
        throw new Error(data.error || 'Error al aprobar')
      }

      if (data.data.listaAprobada) {
        setEstadoRevision('revisado')
        toast.success('Lista completa validada')
        if (onSuccess) await onSuccess()
        router.refresh()
      } else if (!nuevoEstado) {
        setEstadoRevision('borrador')
        router.refresh()
      }

    } catch (error: any) {
      setProductos(prev => prev.map(p =>
        p.id === productoId ? { ...p, validado: !nuevoEstado } : p
      ))
      toast.error(error.message || 'Error al aprobar')
    } finally {
      setIsApprovingProduct(null)
    }
  }, [productos, listaIdFromUrl, lista, setProductos, setEstadoRevision, onSuccess, router])

  const aprobarListaCompleta = useCallback(async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    if (loading || isApproving) return

    if (productos.length === 0) {
      toast.warning('No hay productos para aprobar')
      return
    }

    const idParaUsar = listaIdFromUrl || lista?.id || lista?.documentId
    if (!idParaUsar) {
      toast.error('ID de lista no encontrado')
      return
    }

    const confirmado = await confirmar({
      title: 'Aprobar lista completa',
      text: `Se aprobaran ${productos.length} productos`,
      type: 'question',
      confirmText: 'Si, aprobar',
      cancelText: 'Cancelar'
    })

    if (!confirmado) return

    setLoading(true)
    setIsApproving(true)
    const loadingToast = toast.loading('Aprobando productos...')

    try {
      const response = await fetch('/api/crm/listas/aprobar-lista', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listaId: idParaUsar }),
      })

      const data = await response.json()
      toast.dismiss(loadingToast)

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al aprobar')
      }

      if (onSuccess) await onSuccess()

      if (listaIdFromUrl && normalizarLista && setLista) {
        try {
          const listaResponse = await fetch(`/api/crm/listas/${listaIdFromUrl}`, { cache: 'no-store' })
          const listaData = await listaResponse.json()
          if (listaData.success && listaData.data) {
            const listaNormalizada = normalizarLista(listaData.data)
            setLista(listaNormalizada)
            // ⚠️ IMPORTANTE: El estado ahora es "publicado" (lista para exportación)
            setEstadoRevision((listaNormalizada as any)?.estado_revision || 'publicado')
          }
        } catch {
          setEstadoRevision('publicado')
        }
      } else {
        setEstadoRevision('publicado')
      }

      toast.success('Lista aprobada correctamente', 'El estado ha cambiado a "Lista para Exportar"')

      // ⚠️ IMPORTANTE: NO redirigir, solo refrescar la página actual para actualizar el estado
      // El usuario debe permanecer en la página de validación para ver los cambios
      router.refresh()
    } catch (error: any) {
      toast.dismiss(loadingToast)
      toast.error(error.message || 'Error al aprobar')
    } finally {
      setLoading(false)
      setIsApproving(false)
    }
  }, [productos, listaIdFromUrl, lista, loading, isApproving, onSuccess, normalizarLista, setLista, setEstadoRevision, router])

  const eliminarProducto = useCallback(async (producto: ProductoIdentificado) => {
    const confirmado = await confirmar({
      title: 'Eliminar producto',
      text: `"${producto.nombre}"`,
      type: 'warning',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar'
    })

    if (!confirmado) return

    const idParaUsar = listaIdFromUrl || lista?.id || lista?.documentId
    if (!idParaUsar) {
      toast.error('ID de lista no encontrado')
      return
    }

    setLoading(true)
    const productosAnteriores = [...productos]
    setProductos(prev => prev.filter(p => p.id !== producto.id))

    if (setSelectedProduct && setSelectedProductData) {
      setSelectedProduct(null)
      setSelectedProductData(null)
    }

    try {
      const response = await fetch(`/api/crm/listas/${idParaUsar}/productos/${producto.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: producto.nombre,
          index: productosAnteriores.findIndex(p => p.id === producto.id),
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setProductos(productosAnteriores)
        throw new Error(data.error || 'Error al eliminar')
      }

      toast.success('Producto eliminado')

    } catch (error: any) {
      setProductos(productosAnteriores)
      if (setSelectedProduct && setSelectedProductData) {
        setSelectedProduct(producto.id)
        setSelectedProductData(producto)
      }
      toast.error(error.message || 'Error al eliminar')
    } finally {
      setLoading(false)
    }
  }, [productos, listaIdFromUrl, lista, setProductos, setSelectedProduct, setSelectedProductData])

  return {
    aprobarProducto,
    aprobarListaCompleta,
    eliminarProducto,
    isApprovingProduct,
    isApproving,
    loading
  }
}
