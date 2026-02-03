/**
 * Hook para manejar operaciones CRUD de productos
 * Extrae la lógica de aprobar, editar, eliminar productos
 */

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { ProductoIdentificado, ListaData } from '../types'

interface UseProductosCRUDParams {
  lista: ListaData | null
  listaIdFromUrl: string
  productos: ProductoIdentificado[]
  onSuccess?: () => Promise<void> | void
  setProductos: React.Dispatch<React.SetStateAction<ProductoIdentificado[]>>
  setEstadoRevision: React.Dispatch<React.SetStateAction<'borrador' | 'revisado' | 'publicado' | null>>
  normalizarLista?: (listaData: any) => ListaData | null
  setLista?: React.Dispatch<React.SetStateAction<ListaData | null>>
}

export function useProductosCRUD({
  lista,
  listaIdFromUrl,
  productos,
  onSuccess,
  setProductos,
  setEstadoRevision,
  normalizarLista,
  setLista
}: UseProductosCRUDParams) {
  const router = useRouter()
  const [isApprovingProduct, setIsApprovingProduct] = useState<string | number | null>(null)
  const [isApproving, setIsApproving] = useState(false)
  const [loading, setLoading] = useState(false)

  const aprobarProducto = useCallback(async (productoId: string | number) => {
    const producto = productos.find(p => p.id === productoId)
    if (!producto) {
      console.error('[useProductosCRUD] Producto no encontrado:', productoId)
      alert('Error: Producto no encontrado')
      return
    }

    const nuevoEstado = !producto.validado
    const idParaUsar = listaIdFromUrl || lista?.id || lista?.documentId

    if (!idParaUsar) {
      alert('Error: No se puede aprobar. ID de lista no encontrado.')
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productoId: productoId,
          productoNombre: producto.nombre,
          productoIndex: productos.findIndex(p => p.id === productoId),
          aprobado: nuevoEstado,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        // Revertir cambio optimista
        setProductos(prev => prev.map(p => 
          p.id === productoId ? { ...p, validado: !nuevoEstado } : p
        ))
        throw new Error(data.error || data.detalles || 'Error al aprobar el producto')
      }

      // Si todos los productos están aprobados, actualizar estado
      if (data.data.listaAprobada) {
        console.log('[useProductosCRUD] ✅ Todos los productos aprobados')
        setEstadoRevision('revisado')
        if (onSuccess) await onSuccess()
        router.refresh()
      } else if (!nuevoEstado) {
        // Si se desaprueba, volver a borrador
        setEstadoRevision('borrador')
        router.refresh()
      }

      console.log('[useProductosCRUD] ✅ Producto aprobado:', { productoId, aprobado: nuevoEstado })
    } catch (error: any) {
      console.error('[useProductosCRUD] ❌ Error al aprobar producto:', error)
      // Revertir cambio local
      setProductos(prev => prev.map(p => 
        p.id === productoId ? { ...p, validado: !nuevoEstado } : p
      ))
      alert(`Error al ${nuevoEstado ? 'aprobar' : 'desaprobar'} el producto: ${error.message || error.detalles || 'Error desconocido'}`)
    } finally {
      setIsApprovingProduct(null)
    }
  }, [productos, listaIdFromUrl, lista, setProductos, setEstadoRevision, onSuccess, router])

  const aprobarListaCompleta = useCallback(async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    if (loading || isApproving) {
      console.warn('[useProductosCRUD] ⚠️ Ya hay una aprobación en proceso')
      return
    }

    if (productos.length === 0) {
      alert('No hay productos para aprobar')
      return
    }

    const idParaUsar = listaIdFromUrl || lista?.id || lista?.documentId

    if (!idParaUsar) {
      alert('No se puede aprobar: ID de lista no encontrado')
      return
    }

    if (!confirm(`¿Estás seguro de que deseas aprobar todos los ${productos.length} productos de esta lista?`)) {
      return
    }

    setLoading(true)
    setIsApproving(true)

    try {
      const response = await fetch('/api/crm/listas/aprobar-lista', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          listaId: idParaUsar,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.details || 'Error al aprobar la lista')
      }

      console.log('[useProductosCRUD] ✅ Lista aprobada exitosamente')

      // Recargar datos
      if (onSuccess) await onSuccess()

      // Recargar la lista completa para obtener el estado_revision actualizado
      if (listaIdFromUrl && normalizarLista && setLista) {
        try {
          const listaResponse = await fetch(`/api/crm/listas/${listaIdFromUrl}`, {
            cache: 'no-store',
          })
          const listaData = await listaResponse.json()

          if (listaData.success && listaData.data) {
            const listaNormalizada = normalizarLista(listaData.data)
            setLista(listaNormalizada)
            const nuevoEstado = (listaNormalizada as any)?.estado_revision || 'revisado'
            setEstadoRevision(nuevoEstado)
            console.log('[useProductosCRUD] 🔄 Estado recargado desde API:', nuevoEstado)
          }
        } catch (err: any) {
          console.warn('[useProductosCRUD] ⚠️ Error al recargar estado:', err.message)
          setEstadoRevision('revisado')
        }
      } else {
        setEstadoRevision('revisado')
      }

      // Obtener colegioId para redirección
      const colegioId = lista?.colegio?.id || (lista?.colegio as any)?.data?.id || (lista?.colegio as any)?.data?.documentId

      // Redirigir al listado del colegio
      if (colegioId) {
        router.refresh()
        router.push(`/crm/listas/colegio/${colegioId}?t=${Date.now()}`)
        setTimeout(() => {
          alert('✅ Lista aprobada exitosamente. El estado se ha actualizado.')
        }, 500)
      } else {
        alert('✅ Lista aprobada exitosamente')
      }
    } catch (error: any) {
      console.error('[useProductosCRUD] ❌ Error al aprobar lista:', error)
      alert(`Error al aprobar la lista: ${error.message || error.details || 'Error desconocido'}`)
    } finally {
      setLoading(false)
      setIsApproving(false)
    }
  }, [productos, listaIdFromUrl, lista, loading, isApproving, onSuccess, normalizarLista, setLista, setEstadoRevision, router])

  const eliminarProducto = useCallback(async (producto: ProductoIdentificado) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar "${producto.nombre}" de la lista?`)) {
      return
    }

    const idParaUsar = listaIdFromUrl || lista?.id || lista?.documentId
    if (!idParaUsar) {
      alert('No se puede eliminar: ID de lista no encontrado')
      return
    }

    setLoading(true)

    // Optimistic update - Actualizar UI inmediatamente
    const productosAnteriores = [...productos]
    setProductos(prev => prev.filter(p => p.id !== producto.id))

    try {
      const productoIndex = productosAnteriores.findIndex(p => p.id === producto.id)

      console.log('[useProductosCRUD] 🗑️ Eliminando producto:', {
        productoId: producto.id,
        productoNombre: producto.nombre,
        productoIndex,
      })

      const response = await fetch(`/api/crm/listas/${idParaUsar}/productos/${producto.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre: producto.nombre,
          index: productoIndex,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        // Revertir cambio optimista si hay error
        setProductos(productosAnteriores)
        throw new Error(data.error || 'Error al eliminar el producto')
      }

      console.log('[useProductosCRUD] ✅ Producto eliminado exitosamente')

      // NO recargar - el estado local ya está actualizado con optimistic update
      // Solo sincronizar en background si es necesario
    } catch (error: any) {
      console.error('[useProductosCRUD] ❌ Error al eliminar producto:', error)
      // Revertir cambio optimista
      setProductos(productosAnteriores)
      alert(`Error al eliminar el producto: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }, [productos, listaIdFromUrl, lista, onSuccess, setProductos])

  return {
    aprobarProducto,
    aprobarListaCompleta,
    eliminarProducto,
    isApprovingProduct,
    isApproving,
    loading
  }
}
