'use client'

import {
  ColumnDef,
  ColumnFiltersState,
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  Row as TableRow,
  Table as TableType,
  useReactTable,
} from '@tanstack/react-table'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useMemo } from 'react'
import { Button, Card, CardFooter, CardHeader, Col, Row, Alert, Badge, Spinner, OverlayTrigger, Tooltip } from 'react-bootstrap'
import { LuSearch, LuFileText, LuDownload, LuEye, LuPlus, LuUpload, LuRefreshCw, LuFileCode, LuPackageSearch, LuSparkles } from 'react-icons/lu'
import { TbEdit, TbTrash } from 'react-icons/tb'

import DataTable from '@/components/table/DataTable'
import DeleteConfirmationModal from '@/components/table/DeleteConfirmationModal'
import TablePagination from '@/components/table/TablePagination'
// import ListaModal from './ListaModal' // Temporalmente deshabilitado - TODO: Crear modal para colegios
import ImportacionMasivaModal from './ImportacionMasivaModal'
import ImportacionMasivaColegiosModal from './ImportacionMasivaColegiosModal'
import ImportacionCompletaModal from './ImportacionCompletaModal'
import CargaMasivaPDFsPorColegioModal from './CargaMasivaPDFsPorColegioModal'
import DetalleListasModal from './DetalleListasModal'
import EdicionColegioModal from './EdicionColegioModal'
import CursosColegioModal from './CursosColegioModal'

interface ColegioType {
  id: number | string
  documentId?: string
  nombre: string
  rbd?: string | number
  comuna?: string
  region?: string
  direccion?: string
  telefono?: string
  email?: string
  total_matriculados?: number | null
  cantidadCursos?: number
  cantidadPDFs?: number
  cantidadListas?: number
  updatedAt?: string
  cursos?: CursoType[]
}

interface CursoType {
  id: number | string
  documentId?: string
  nombre: string
  nivel?: string
  grado?: number
  año?: number
  versiones?: number
  materiales?: number
  pdf_id?: number | string
  pdf_url?: string
  updatedAt?: string
}

// Legacy interface para compatibilidad
interface ListaType extends ColegioType {}

const columnHelper = createColumnHelper<ColegioType>()

interface ListasListingProps {
  listas: any[]
  error: string | null
}

export default function ListasListing({ listas: listasProp, error }: ListasListingProps) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [editingLista, setEditingLista] = useState<ColegioType | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedListaId, setSelectedListaId] = useState<string | number | null>(null)
  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showImportColegiosModal, setShowImportColegiosModal] = useState(false)
  const [showImportCompletaModal, setShowImportCompletaModal] = useState(false)
  const [showCargaMasivaPDFsModal, setShowCargaMasivaPDFsModal] = useState(false)
  const [showDetalleListasModal, setShowDetalleListasModal] = useState(false)
  const [colegioSeleccionado, setColegioSeleccionado] = useState<ColegioType | null>(null)
  const [showEdicionColegioModal, setShowEdicionColegioModal] = useState(false)
  const [showCursosModal, setShowCursosModal] = useState(false)
  const [colegioIdModal, setColegioIdModal] = useState<string | number | null>(null)
  const [colegioNombreModal, setColegioNombreModal] = useState<string>('')
  const [navegandoA, setNavegandoA] = useState<string | number | null>(null)

  // Los datos ya vienen transformados desde la API /api/crm/listas/por-colegio
  const mappedListas = useMemo(() => {
    if (!listasProp || !Array.isArray(listasProp)) return []
    
    return listasProp.map((colegio: any) => ({
      id: colegio.id || colegio.documentId,
      documentId: colegio.documentId || String(colegio.id || ''),
      nombre: colegio.nombre || '',
      rbd: colegio.rbd || undefined,
      comuna: colegio.comuna || '',
      region: colegio.region || '',
      direccion: colegio.direccion || '',
      telefono: colegio.telefono || '',
      email: colegio.email || '',
      total_matriculados: colegio.total_matriculados !== undefined ? colegio.total_matriculados : null,
      cantidadCursos: colegio.cantidadCursos || 0,
      cantidadPDFs: colegio.cantidadPDFs || 0,
      cantidadListas: colegio.cantidadListas || 0,
      updatedAt: colegio.updatedAt || null,
      cursos: colegio.cursos || [],
    } as ColegioType))
  }, [listasProp])

  const columns: ColumnDef<ColegioType, any>[] = [
    {
      id: 'select',
      maxSize: 45,
      size: 45,
      header: ({ table }: { table: TableType<ColegioType> }) => (
        <input
          type="checkbox"
          className="form-check-input form-check-input-light fs-14"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row }: { row: TableRow<ColegioType> }) => (
        <input
          type="checkbox"
          className="form-check-input form-check-input-light fs-14"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
        />
      ),
      enableSorting: false,
      enableColumnFilter: false,
    },
    {
      id: 'institucion',
      header: 'INSTITUCIÓN',
      accessorKey: 'nombre',
      enableSorting: true,
      enableColumnFilter: true,
      cell: ({ row }) => (
        <div>
          <div 
            className="fw-bold text-primary" 
            style={{ cursor: 'pointer', textDecoration: 'underline' }}
            onClick={() => {
              setColegioSeleccionado(row.original)
              setShowEdicionColegioModal(true)
            }}
            title="Clic para editar colegio"
          >
            {row.original.nombre || 'Sin nombre'}
          </div>
          {row.original.rbd && (
            <small className="text-muted">RBD: {row.original.rbd}</small>
          )}
        </div>
      ),
    },
    {
      id: 'comuna',
      header: 'COMUNA',
      accessorKey: 'comuna',
      enableSorting: true,
      enableColumnFilter: true,
      cell: ({ row }) => row.original.comuna || '-',
    },
    {
      id: 'region',
      header: 'REGIÓN',
      accessorKey: 'region',
      enableSorting: true,
      enableColumnFilter: true,
      cell: ({ row }) => row.original.region || '-',
    },
    {
      id: 'cursos',
      header: 'CURSO',
      accessorKey: 'cantidadCursos',
      enableSorting: true,
      cell: ({ row }) => {
        const cantidad = row.original.cantidadCursos || 0
        return (
          <Badge bg="primary" className="fs-13">
            {cantidad} {cantidad === 1 ? 'curso' : 'cursos'}
          </Badge>
        )
      },
    },
    {
      id: 'pdfs',
      header: 'PDF',
      accessorKey: 'cantidadPDFs',
      enableSorting: true,
      cell: ({ row }) => {
        const cantidad = row.original.cantidadPDFs || 0
        const tienePDF = cantidad > 0
        return (
          <Badge
            bg={tienePDF ? 'success' : 'secondary'}
            className="fs-13"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            {tienePDF ? (
              <>
                <LuFileText size={12} />
                Si
              </>
            ) : (
              'No'
            )}
          </Badge>
        )
      },
    },
    {
      id: 'listas',
      header: 'CANTIDAD DE LISTAS POR CURSOS',
      accessorKey: 'cantidadListas',
      enableSorting: true,
      cell: ({ row }) => {
        const cantidad = row.original.cantidadListas || 0
        return (
          <Badge 
            bg="info" 
            className="fs-13 cursor-pointer" 
            style={{ cursor: 'pointer' }}
            onClick={() => {
              setColegioSeleccionado(row.original)
              setShowDetalleListasModal(true)
            }}
            title="Clic para ver detalle de listas"
          >
            {cantidad} {cantidad === 1 ? 'lista' : 'listas'}
          </Badge>
        )
      },
    },
    {
      id: 'matriculados',
      header: 'MATRICULADOS',
      accessorKey: 'total_matriculados',
      enableSorting: true,
      cell: ({ row }) => {
        const cantidad = row.original.total_matriculados
        if (cantidad === null || cantidad === undefined) {
          return (
            <Badge bg="secondary" className="fs-13">
              No disponible
            </Badge>
          )
        }
        if (cantidad > 0) {
          return (
            <Badge bg="warning" text="dark" className="fs-13">
              {cantidad.toLocaleString('es-CL')} estudiantes
            </Badge>
          )
        }
        return (
          <Badge bg="secondary" className="fs-13">
            0 estudiantes
          </Badge>
        )
      },
    },
    {
      id: 'fecha',
      header: 'FECHA DE ÚLTIMA ACTUALIZACIÓN',
      enableSorting: true,
      accessorKey: 'updatedAt',
      cell: ({ row }) => {
        const updatedAt = row.original.updatedAt
        
        if (!updatedAt) return '-'
        
        try {
          const date = new Date(updatedAt)
          return (
            <div className="small">
              <div>{date.toLocaleDateString('es-CL', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric' 
              })}</div>
              <div className="text-muted">{date.toLocaleTimeString('es-CL', {
                hour: '2-digit',
                minute: '2-digit'
              })}</div>
            </div>
          )
        } catch {
          return '-'
        }
      },
    },
    {
      id: 'acciones',
      header: 'ACCIONES',
      cell: ({ row }) => {
        const colegioId = row.original.documentId || row.original.id
        
        return (
          <div className="d-flex gap-1">
            <Button
              variant="info"
              size="sm"
              title="Ver cursos en modal (sin salir de esta página)"
              onClick={() => {
                setColegioIdModal(colegioId)
                setColegioNombreModal(row.original.nombre)
                setShowCursosModal(true)
              }}
            >
              <LuEye className="me-1" />
              Modal
            </Button>
            <Button
              variant="primary"
              size="sm"
              title="Ver cursos en pantalla completa"
              disabled={navegandoA === colegioId}
              onClick={() => {
                setNavegandoA(colegioId)
                router.push(`/crm/listas/colegio/${colegioId}`)
              }}
              style={{
                minWidth: '70px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
            >
              {navegandoA === colegioId ? (
                <>
                  <Spinner animation="border" size="sm" style={{ width: '14px', height: '14px' }} />
                  <span>Cargando...</span>
                </>
              ) : (
                <>
                  <LuEye />
                  <span>Ver</span>
                </>
              )}
            </Button>
            <Button
              variant="outline-primary"
              size="sm"
              className="btn-icon rounded-circle"
              onClick={() => {
                setColegioSeleccionado(row.original)
                setShowEdicionColegioModal(true)
              }}
              title="Editar colegio"
            >
              <TbEdit className="fs-lg" />
            </Button>
          </div>
        )
      },
    },
  ]

  const [data, setData] = useState<ColegioType[]>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'fecha', desc: true }, // Cambiado de 'updatedAt' a 'fecha' (id de la columna)
  ])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [filtroListas, setFiltroListas] = useState<'todos' | 'con' | 'sin'>('todos')

  useEffect(() => {
    let filtered = mappedListas

    // Aplicar filtro de listas
    if (filtroListas === 'con') {
      filtered = filtered.filter(colegio => (colegio.cantidadListas || 0) > 0)
    } else if (filtroListas === 'sin') {
      filtered = filtered.filter(colegio => (colegio.cantidadListas || 0) === 0)
    }

    setData(filtered)
  }, [mappedListas, filtroListas])

  // Función de filtro global personalizada que busca en nombre, colegio.nombre y colegio.rbd
  const globalFilterFn = (row: any, columnId: string, filterValue: string) => {
    if (!filterValue) return true
    
    // Normalizar el valor de búsqueda: eliminar espacios y convertir a minúsculas
    const searchValue = String(filterValue).toLowerCase().trim().replace(/\s+/g, '')
    
    if (!searchValue) return true
    
    // Buscar en nombre del colegio (normalizado)
    const nombre = String(row.original.nombre || '').toLowerCase().trim().replace(/\s+/g, '')
    if (nombre.includes(searchValue)) return true
    
    // Buscar en RBD del colegio (normalizado, sin espacios)
    const rbd = row.original.rbd
    if (rbd !== undefined && rbd !== null) {
      // Convertir a string, eliminar espacios y convertir a minúsculas
      const rbdStr = String(rbd).trim().replace(/\s+/g, '').toLowerCase()
      // También buscar coincidencia exacta o parcial
      if (rbdStr === searchValue || rbdStr.includes(searchValue)) return true
    }
    
    // Buscar en comuna (normalizado)
    const comuna = String(row.original.comuna || '').toLowerCase().trim().replace(/\s+/g, '')
    if (comuna.includes(searchValue)) return true
    
    // Buscar en región (normalizado)
    const region = String(row.original.region || '').toLowerCase().trim().replace(/\s+/g, '')
    if (region.includes(searchValue)) return true
    
    return false
  }

  const table = useReactTable<ListaType>({
    data,
    columns,
    getRowId: (row) => String(row.id || row.documentId || Math.random()), // Usar el ID real de la fila
    state: { sorting, globalFilter, columnFilters, pagination, rowSelection: selectedRowIds },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    onRowSelectionChange: setSelectedRowIds,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: globalFilterFn as any,
    enableColumnFilters: true,
    enableRowSelection: true,
  })

  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const totalItems = table.getFilteredRowModel().rows.length

  const start = pageIndex * pageSize + 1
  const end = Math.min(start + pageSize - 1, totalItems)

  const handleDelete = async () => {
    // Obtener IDs seleccionados (puede ser uno solo o múltiples)
    const selectedIds: (string | number)[] = []
    
    if (selectedListaId) {
      // Eliminación individual (desde el botón de eliminar de una fila)
      selectedIds.push(selectedListaId)
    } else {
      // Eliminación múltiple (desde checkboxes)
      const selectedRows = table.getSelectedRowModel().rows
      console.log('[ListasListing] Filas seleccionadas en modelo:', selectedRows.length)
      console.log('[ListasListing] selectedRowIds:', selectedRowIds)
      console.log('[ListasListing] Total filas en tabla:', table.getRowModel().rows.length)
      
      if (selectedRows.length > 0) {
        // Usar las filas seleccionadas del modelo
        selectedIds.push(...selectedRows.map(row => row.original.id))
        console.log('[ListasListing] IDs desde getSelectedRowModel:', selectedIds)
      } else {
        // Si no hay filas en el modelo, usar selectedRowIds directamente
        const rowIds = Object.keys(selectedRowIds).filter(key => selectedRowIds[key])
        console.log('[ListasListing] Usando selectedRowIds directamente:', rowIds)
        
        // Buscar los IDs reales de los datos usando los IDs de fila
        rowIds.forEach((rowId) => {
          const row = table.getRowModel().rows.find(r => String(r.id) === String(rowId))
          if (row && row.original) {
            selectedIds.push(row.original.id)
            console.log('[ListasListing] ID encontrado:', row.original.id, 'para rowId:', rowId)
          } else {
            console.warn('[ListasListing] No se encontró fila para rowId:', rowId)
          }
        })
      }
    }

    console.log('[ListasListing] IDs a eliminar:', selectedIds)

    if (selectedIds.length === 0) {
      alert('No hay cursos seleccionados para eliminar')
      setShowDeleteModal(false)
      return
    }

    setLoading(true)
    try {
      console.log('[ListasListing] Eliminando curso(s):', selectedIds)
      
      // Eliminar cada curso secuencialmente para evitar problemas
      const results: Array<{ id: string | number; success: boolean; error?: string }> = []
      
      for (const id of selectedIds) {
        try {
          // Usar documentId si está disponible, sino usar id numérico
          const row = data.find(r => r.id === id || r.documentId === id || String(r.id) === String(id) || String(r.documentId) === String(id))
          const idParaEliminar = row?.documentId || row?.id || id
          
          console.log('[ListasListing] 🗑️ Eliminando curso:', {
            idOriginal: id,
            idParaEliminar: idParaEliminar,
            tieneDocumentId: !!row?.documentId,
            nombre: row?.nombre
          })
          
          const response = await fetch(`/api/crm/listas/${idParaEliminar}`, {
            method: 'DELETE',
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache',
            },
          })
          
          if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
          }
          
          const result = await response.json()
          console.log('[ListasListing] ✅ Resultado eliminación:', { 
            idOriginal: id,
            idParaEliminar: idParaEliminar,
            success: result.success, 
            error: result.error,
            message: result.message 
          })
          
          if (!result.success) {
            throw new Error(result.error || 'Error desconocido al eliminar')
          }
          
          results.push({ id: idParaEliminar, success: true, error: undefined })
        } catch (err: any) {
          console.error('[ListasListing] ❌ Error al eliminar curso:', id, err)
          results.push({ id, success: false, error: err.message || 'Error desconocido' })
        }
      }

      const successful = results.filter(r => r.success)
      const failed = results.filter(r => !r.success)

      console.log('[ListasListing] Resultados de eliminación:', { 
        total: results.length,
        successful: successful.length, 
        failed: failed.length,
        successfulIds: successful.map(r => r.id),
        failedIds: failed.map(r => r.id)
      })

      if (successful.length > 0) {
        // Limpiar selección primero
        setSelectedRowIds({})
        setSelectedListaId(null)
        setShowDeleteModal(false)
        
        // Mostrar mensaje
        if (failed.length > 0) {
          alert(`${successful.length} curso(s) eliminado(s) exitosamente. ${failed.length} curso(s) fallaron: ${failed.map(f => f.error || 'Error desconocido').join(', ')}`)
        } else {
          alert(`${successful.length} curso(s) eliminado(s) exitosamente.`)
        }
        
        // Recargar datos desde la API PRIMERO (antes de actualizar estado local)
        try {
          console.log('[ListasListing] 🔄 Recargando datos desde la API después de eliminar...')
          console.log('[ListasListing] IDs eliminados exitosamente:', successful.map(r => r.id))
          
          // Esperar un momento para que Strapi procese la eliminación completamente
          // Aumentar el tiempo de espera para asegurar que la eliminación se haya propagado
          console.log('[ListasListing] ⏳ Esperando 1 segundo para que Strapi procese la eliminación...')
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          // Agregar timestamp para evitar caché
          const timestamp = Date.now()
          const response = await fetch(`/api/crm/listas?_t=${timestamp}`, {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache',
            },
          })
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          
          const result = await response.json()
          console.log('[ListasListing] Respuesta de API:', { 
            success: result.success, 
            count: result.data?.length || 0,
            data: result.data 
          })
          
          if (result.success && Array.isArray(result.data)) {
            const nuevasListas = result.data.map((lista: any) => ({
              id: lista.id || lista.documentId,
              documentId: lista.documentId || String(lista.id || ''),
              nombre: lista.nombre || '',
              nivel: lista.nivel || 'Basica',
              grado: lista.grado || 1,
              año: lista.año || lista.ano || new Date().getFullYear(),
              descripcion: lista.descripcion || '',
              activo: lista.activo !== false,
              pdf_id: lista.pdf_id || undefined,
              pdf_url: lista.pdf_url || undefined,
              pdf_nombre: lista.pdf_nombre || undefined,
              colegio: lista.colegio || undefined,
              curso: lista.curso || undefined,
              materiales: lista.materiales || [],
              createdAt: lista.createdAt || null,
              updatedAt: lista.updatedAt || null,
              versiones: lista.versiones || 0,
            } as ListaType))
            
            console.log('[ListasListing] ✅ Datos recargados desde API:', nuevasListas.length, 'cursos')
            console.log('[ListasListing] IDs en nuevos datos:', nuevasListas.map((l: ListaType) => l.id))
            console.log('[ListasListing] IDs eliminados que NO deberían aparecer:', successful.map((r: any) => r.id))
            
            // Verificar que los eliminados no estén en los nuevos datos
            const eliminadosAunPresentes = nuevasListas.filter((l: ListaType) => 
              successful.some(r => 
                r.id === l.id || 
                r.id === l.documentId || 
                String(r.id) === String(l.id) || 
                String(r.id) === String(l.documentId)
              )
            )
            
            if (eliminadosAunPresentes.length > 0) {
              console.warn('[ListasListing] ⚠️ ADVERTENCIA: Algunos cursos eliminados aún aparecen en la respuesta:', eliminadosAunPresentes.map((l: ListaType) => l.id))
            }
            
            // Actualizar estado con los nuevos datos
            setData(nuevasListas)
            console.log('[ListasListing] ✅ Estado actualizado con', nuevasListas.length, 'cursos')
            
            // Notificar cambio a otras páginas
            // Si solo se eliminó uno, pasar el ID; si son múltiples, solo el tipo
            if (successful.length === 1) {
              notificarCambio('eliminado', successful[0].id)
            } else {
              notificarCambio('eliminado') // Sin ID para múltiples eliminaciones
            }
          } else {
            console.error('[ListasListing] ❌ Respuesta de API no válida:', result)
            // Si la API falla, al menos remover los eliminados del estado local
            setData((old) => {
              const nuevos = old.filter((l) => !successful.some(r => {
                const match = r.id === l.id || r.id === l.documentId || String(r.id) === String(l.id) || String(r.id) === String(l.documentId)
                return match
              }))
              console.log('[ListasListing] Datos actualizados localmente (fallback):', old.length, '→', nuevos.length)
              return nuevos
            })
          }
        } catch (refreshError: any) {
          console.error('[ListasListing] ❌ Error al recargar datos:', refreshError)
          // Si falla la recarga, remover los eliminados del estado local como fallback
          setData((old) => {
            const nuevos = old.filter((l) => !successful.some(r => {
              const match = r.id === l.id || r.id === l.documentId || String(r.id) === String(l.id) || String(r.id) === String(l.documentId)
              return match
            }))
            console.log('[ListasListing] Datos actualizados localmente (fallback por error):', old.length, '→', nuevos.length)
            return nuevos
          })
        }
      } else {
        alert('Error al eliminar cursos: ' + (failed[0]?.error || 'Error desconocido'))
        setShowDeleteModal(false)
      }
    } catch (error: any) {
      console.error('[ListasListing] Error al eliminar curso(s):', error)
      alert('Error al eliminar curso(s): ' + error.message)
      setShowDeleteModal(false)
    } finally {
      setLoading(false)
    }
  }

  const handleModalClose = () => {
    setShowModal(false)
    setEditingLista(null)
  }

  const recargarListas = async (retryCount = 0): Promise<void> => {
    setLoading(true)
    try {
      console.log(`[ListasListing] 🔄 Recargando listas desde API... (intento ${retryCount + 1})`)
      // Usar la misma API que usa la página principal: /api/crm/listas/por-colegio
      const timestamp = Date.now()
      const random = Math.random()
      const response = await fetch(`/api/crm/listas/por-colegio?_t=${timestamp}&_r=${random}`, {
        cache: 'no-store',
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      })
      
      if (!response.ok) {
        // Intentar leer el error de la respuesta
        let errorText = ''
        try {
          errorText = await response.text()
        } catch (e) {
          errorText = 'No se pudo leer el error'
        }
        
        console.error('[ListasListing] ❌ Error HTTP al recargar listas:', {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText.substring(0, 500),
          retryCount,
        })
        
        // Si es error 500 y es el primer o segundo intento, reintentar después de 1 segundo
        if (response.status === 500 && retryCount < 2) {
          console.log(`[ListasListing] ⏳ Reintentando en 1 segundo... (intento ${retryCount + 1}/2)`)
          setTimeout(() => {
            recargarListas(retryCount + 1)
          }, 1000)
          return
        }
        
        throw new Error(`HTTP error! status: ${response.status}${errorText ? ` - ${errorText.substring(0, 200)}` : ''}`)
      }
      
      const result = await response.json()
      console.log('[ListasListing] ✅ Respuesta de API:', { 
        success: result.success, 
        count: result.data?.length || 0,
        ids: result.data?.map((l: any) => l.id || l.documentId) || [],
        colegiosConRBD24508: result.data?.filter((c: any) => c.rbd === 24508 || c.rbd === '24508').length || 0,
      })
      
      // Debug: Verificar si hay colegios con RBD 24508 en la respuesta
      if (result.success && Array.isArray(result.data)) {
        const colegiosRBD24508 = result.data.filter((c: any) => c.rbd === 24508 || c.rbd === '24508')
        if (colegiosRBD24508.length > 0) {
          console.log('[ListasListing] ✅ Encontrado colegio RBD 24508 en respuesta:', colegiosRBD24508)
        } else {
          console.warn('[ListasListing] ⚠️ No se encontró colegio RBD 24508 en la respuesta de la API')
          console.log('[ListasListing] 🔍 Colegios en respuesta:', result.data.map((c: any) => ({
            nombre: c.nombre,
            rbd: c.rbd,
            cantidadListas: c.cantidadListas,
          })))
        }
      }
      
      if (result.success && Array.isArray(result.data)) {
        // Mapear los datos correctamente según la estructura de la API /api/crm/listas/por-colegio
        const nuevasListas = result.data.map((colegio: any) => ({
          id: colegio.id || colegio.documentId,
          documentId: colegio.documentId || String(colegio.id || ''),
          nombre: colegio.nombre || colegio.colegio_nombre || '',
          rbd: colegio.rbd || undefined,
          comuna: colegio.comuna || '',
          region: colegio.region || '',
          direccion: colegio.direccion || '',
          telefono: colegio.telefono || '',
          email: colegio.email || '',
          total_matriculados: colegio.total_matriculados !== undefined ? colegio.total_matriculados : null,
          cantidadCursos: colegio.cantidadCursos || 0,
          cantidadPDFs: colegio.cantidadPDFs || 0,
          cantidadListas: colegio.cantidadListas || 0,
          updatedAt: colegio.updatedAt || null,
          cursos: colegio.cursos || [],
        } as ColegioType))
        
        console.log('[ListasListing] ✅ Listas actualizadas en la UI:', nuevasListas.length, 'colegios')
        
        // Debug: Verificar si el colegio RBD 24508 está en los datos mapeados
        const colegioEnDatos = nuevasListas.find((c: ColegioType) => c.rbd === 24508 || c.rbd === '24508')
        if (colegioEnDatos) {
          console.log('[ListasListing] ✅ Colegio RBD 24508 encontrado en datos mapeados:', colegioEnDatos)
        } else {
          console.warn('[ListasListing] ⚠️ Colegio RBD 24508 NO encontrado en datos mapeados')
        }
        
        setData(nuevasListas)
      } else {
        console.error('[ListasListing] ❌ Respuesta de API no válida:', result)
        // Solo mostrar alert si no es un reintento
        if (retryCount >= 2) {
          alert('Error al recargar listas: ' + (result.error || 'Error desconocido'))
        }
      }
    } catch (refreshError: any) {
      console.error('[ListasListing] ❌ Error al recargar listas:', refreshError)
      // Solo mostrar alert si no es un reintento
      if (retryCount >= 2) {
        alert('Error al recargar listas: ' + refreshError.message)
      }
    } finally {
      setLoading(false)
    }
  }

  // Función para notificar cambios a otras páginas
  const notificarCambio = (tipo: 'eliminado' | 'creado' | 'editado', cursoId?: string | number) => {
    // Usar CustomEvent para notificar a otras pestañas/ventanas
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('curso-cambiado', {
        detail: { tipo, cursoId, timestamp: Date.now() }
      }))
      
      // También usar localStorage como backup
      localStorage.setItem('curso-cambio-notificacion', JSON.stringify({
        tipo,
        cursoId,
        timestamp: Date.now()
      }))
    }
  }

  // Listener para cambios desde otras páginas
  useEffect(() => {
    const handleCambioCurso = (event: any) => {
      console.log('[ListasListing] 🔔 Cambio detectado desde otra página:', event.detail)
      // Recargar después de un pequeño delay
      setTimeout(() => {
        recargarListas()
      }, 500)
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'curso-cambio-notificacion' && e.newValue) {
        try {
          const cambio = JSON.parse(e.newValue)
          console.log('[ListasListing] 🔔 Cambio detectado desde localStorage:', cambio)
          setTimeout(() => {
            recargarListas()
          }, 500)
        } catch (err) {
          console.error('[ListasListing] Error al parsear notificación:', err)
        }
      }
    }

    window.addEventListener('curso-cambiado', handleCambioCurso)
    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('curso-cambiado', handleCambioCurso)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  const handleModalSuccess = () => {
    console.log('[ListasListing] ✅ handleModalSuccess llamado, recargando listas...')
    // Notificar cambio
    notificarCambio('creado')
    
    // Función para forzar recarga múltiple
    const forzarRecarga = () => {
      console.log('[ListasListing] 🔄 Forzando recarga de listas...')
      recargarListas()
    }
    
    // Recargar inmediatamente (igual que el botón "Agregar Lista")
    forzarRecarga()
    
    // Recargar de nuevo después de delays progresivos para asegurar que Strapi haya procesado todo
    setTimeout(() => forzarRecarga(), 1000)  // 1 segundo
    setTimeout(() => forzarRecarga(), 2000)  // 2 segundos
    setTimeout(() => forzarRecarga(), 3500)  // 3.5 segundos
    setTimeout(() => forzarRecarga(), 5000)   // 5 segundos (última recarga)
  }

  if (error && mappedListas.length === 0) {
    return (
      <Row>
        <Col xs={12}>
          <Alert variant="warning">
            <strong>Error al cargar listas:</strong> {error}
          </Alert>
        </Col>
      </Row>
    )
  }

  return (
    <Row>
      <Col xs={12}>
        <Card className="mb-4">
          <CardHeader className="d-flex justify-content-between align-items-center">
            <div className="d-flex gap-2">
              <div className="app-search">
                <input
                  type="search"
                  className="form-control"
                  placeholder="Buscar por nombre, colegio o RBD..."
                  value={globalFilter ?? ''}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                />
                <LuSearch className="app-search-icon text-muted" />
              </div>
            </div>

            <div className="d-flex align-items-center gap-2 flex-wrap">
              <div className="app-search">
                <select
                  className="form-select form-control my-1 my-md-0"
                  value={(table.getColumn('region')?.getFilterValue() as string) ?? ''}
                  onChange={(e) => {
                    const value = e.target.value
                    table.getColumn('region')?.setFilterValue(value === '' ? undefined : value)
                  }}>
                  <option value="">Todas las Regiones</option>
                  {Array.from(new Set(data.map(l => l.region).filter(Boolean))).sort().map((region) => {
                    const filteredRows = table.getFilteredRowModel().rows
                    const count = filteredRows.filter(row => row.original.region === region).length
                    return (
                      <option key={region} value={region}>
                        {region} {count > 0 ? `(${count})` : ''}
                      </option>
                    )
                  })}
                </select>
              </div>

              <div className="app-search">
                <select
                  className="form-select form-control my-1 my-md-0"
                  value={(table.getColumn('comuna')?.getFilterValue() as string) ?? ''}
                  onChange={(e) => {
                    const value = e.target.value
                    table.getColumn('comuna')?.setFilterValue(value === '' ? undefined : value)
                  }}>
                  <option value="">Todas las Comunas</option>
                  {Array.from(new Set(data.map(l => l.comuna).filter(Boolean))).sort().map((comuna) => {
                    const filteredRows = table.getFilteredRowModel().rows
                    const count = filteredRows.filter(row => row.original.comuna === comuna).length
                    return (
                      <option key={comuna} value={comuna}>
                        {comuna} {count > 0 ? `(${count})` : ''}
                      </option>
                    )
                  })}
                </select>
              </div>

              <div className="app-search">
                <select
                  className="form-select form-control my-1 my-md-0"
                  value={filtroListas}
                  onChange={(e) => setFiltroListas(e.target.value as 'todos' | 'con' | 'sin')}
                >
                  <option value="todos">Todos los Colegios</option>
                  <option value="con">Con Listas</option>
                  <option value="sin">Sin Listas</option>
                </select>
              </div>

              <div>
                <select
                  className="form-select form-control my-1 my-md-0"
                  value={table.getState().pagination.pageSize}
                  onChange={(e) => table.setPageSize(Number(e.target.value))}>
                  {[5, 10, 15, 20, 25].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="d-flex gap-1">
              {data.length > 0 && (
                <Button 
                  variant="outline-danger" 
                  onClick={() => {
                    // Seleccionar todos los cursos para eliminación masiva
                    const allRowIds: Record<string, boolean> = {}
                    table.getRowModel().rows.forEach((row) => {
                      allRowIds[row.id] = true
                    })
                    setSelectedRowIds(allRowIds)
                    setSelectedListaId(null) // Limpiar selección individual
                    setShowDeleteModal(true)
                  }}
                  title="Eliminar todos los cursos y listas"
                >
                  <TbTrash className="fs-sm me-2" /> Vaciar Todo ({data.length})
                </Button>
              )}
              {Object.keys(selectedRowIds).length > 0 && (
                <Button 
                  variant="danger" 
                  onClick={() => {
                    setSelectedListaId(null) // Limpiar selección individual
                    setShowDeleteModal(true)
                  }}
                >
                  <TbTrash className="fs-sm me-2" /> Eliminar Seleccionados ({Object.keys(selectedRowIds).length})
                </Button>
              )}
              <Link href="/crm/listas/buscar-producto">
                <Button 
                  variant="info"
                  title="Buscar un producto en todos los colegios y cursos"
                >
                  <LuPackageSearch className="fs-sm me-2" /> 
                  Buscar Producto
                </Button>
              </Link>
              {/* Ocultado: Botón Recargar */}
              {/* <Button 
                variant="outline-secondary" 
                onClick={() => recargarListas()}
                disabled={loading}
                title="Recargar listas"
              >
                <LuRefreshCw className={`fs-sm me-2 ${loading ? 'spinning' : ''}`} style={loading ? { animation: 'spin 1s linear infinite' } : {}} /> 
                {loading ? 'Recargando...' : 'Recargar'}
              </Button> */}
              {/* Ocultado: Botón Importación Masiva */}
              {/* <Button variant="success" onClick={() => setShowImportModal(true)}>
                <LuUpload className="fs-sm me-2" /> Importación Masiva
              </Button> */}
              {/* Ocultado: Botón Agregar Lista */}
              {/* <Button variant="primary" onClick={() => setShowModal(true)}>
                <LuPlus className="fs-sm me-2" /> Agregar Lista
              </Button> */}
              {/* Ocultado: Importar Colegios y Cursos */}
              {/* <Button variant="outline-primary" onClick={() => setShowImportColegiosModal(true)}>
                <LuUpload className="fs-sm me-2" /> Importar Colegios y Cursos
              </Button> */}
              {/* Ocultado: Logs Importación */}
              {/* <Link href="/crm/listas/importacion-completa-logs" className="btn btn-outline-info me-2">
                <LuFileCode className="me-1" />
                Logs Importación
              </Link> */}
              <OverlayTrigger
                placement="top"
                overlay={
                  <Tooltip>
                    <div className="text-start">
                      <strong>Importación Completa (Plantilla)</strong>
                      <br />
                      Permite cargar masivamente colegios, cursos, asignaturas y productos/libros desde un archivo Excel/CSV usando una plantilla predefinida.
                      <br />
                      <small className="d-block mt-1">• Importa colegios, cursos y asignaturas</small>
                      <small className="d-block">• Permite subir PDFs de listas de útiles</small>
                      <small className="d-block">• Procesa múltiples registros de forma masiva</small>
                    </div>
                  </Tooltip>
                }
              >
                <Button variant="outline-success" onClick={() => setShowImportCompletaModal(true)}>
                  <LuUpload className="fs-sm me-2" /> Importación Completa (Plantilla)
                </Button>
              </OverlayTrigger>
              <OverlayTrigger
                placement="top"
                overlay={
                  <Tooltip>
                    <div className="text-start">
                      <strong>Carga Masiva PDFs por Colegio</strong>
                      <br />
                      Permite subir múltiples PDFs de listas de útiles para un colegio específico y procesarlos automáticamente con Inteligencia Artificial.
                      <br />
                      <small className="d-block mt-1">• Sube múltiples PDFs a la vez</small>
                      <small className="d-block">• Procesa automáticamente con IA (Claude AI)</small>
                      <small className="d-block">• Extrae productos y materiales automáticamente</small>
                      <small className="d-block">• Asocia PDFs a cursos específicos</small>
                    </div>
                  </Tooltip>
                }
              >
                <Button variant="outline-primary" onClick={() => setShowCargaMasivaPDFsModal(true)}>
                  <LuSparkles className="fs-sm me-2" /> Carga Masiva PDFs por Colegio
                </Button>
              </OverlayTrigger>
              {/* Ocultado: Ver Logs */}
              {/* <Link href="/crm/listas/logs">
                <Button variant="outline-info" title="Ver logs de procesamiento">
                  <LuFileCode className="fs-sm me-2" /> Ver Logs
                </Button>
              </Link> */}
              {/* Ocultado: Logs Importación Completa */}
              {/* <Link href="/crm/listas/importacion-completa-logs">
                <Button variant="outline-warning" title="Ver logs de importación completa">
                  <LuFileCode className="fs-sm me-2" /> Logs Importación Completa
                </Button>
              </Link> */}
            </div>
          </CardHeader>

          <DataTable<ListaType>
            table={table}
            emptyMessage="No se encontraron listas"
          />

          {table.getRowModel().rows.length > 0 && (
            <CardFooter className="border-0">
              <TablePagination
                totalItems={totalItems}
                start={start}
                end={end}
                itemsName="listas"
                showInfo
                previousPage={table.previousPage}
                canPreviousPage={table.getCanPreviousPage()}
                pageCount={table.getPageCount()}
                pageIndex={table.getState().pagination.pageIndex}
                setPageIndex={table.setPageIndex}
                nextPage={table.nextPage}
                canNextPage={table.getCanNextPage()}
              />
            </CardFooter>
          )}

          <DeleteConfirmationModal
            show={showDeleteModal}
            onHide={() => {
              setShowDeleteModal(false)
              setSelectedListaId(null)
            }}
            onConfirm={handleDelete}
            selectedCount={
              selectedListaId 
                ? 1 
                : Object.keys(selectedRowIds).length
            }
            itemName="curso"
            modalTitle="Confirmar Eliminación"
            confirmButtonText="Eliminar"
            cancelButtonText="Cancelar"
            loading={loading}
          />
        </Card>

        {/* <ListaModal
          show={showModal}
          onHide={handleModalClose}
          lista={editingLista}
          onSuccess={handleModalSuccess}
        /> */}

        <ImportacionMasivaModal
          show={showImportModal}
          onHide={() => setShowImportModal(false)}
          onSuccess={handleModalSuccess}
        />

        {/* Ocultado: Modal de Importación Masiva de Colegios */}
        {/* <ImportacionMasivaColegiosModal
          show={showImportColegiosModal}
          onHide={() => setShowImportColegiosModal(false)}
          onSuccess={handleModalSuccess}
        /> */}

        <ImportacionCompletaModal
          show={showImportCompletaModal}
          onHide={() => setShowImportCompletaModal(false)}
          onSuccess={() => {
            console.log('[ListasListing] ✅ Importación completa exitosa, recargando listas...')
            // Recargar listas sin hacer redirect, solo actualizar el estado local
            setTimeout(() => {
              console.log('[ListasListing] 🔄 Primera recarga (después de 2s)...')
              recargarListas()
            }, 2000)
            // Recargar de nuevo después de más tiempo para asegurar que se reflejen todos los cambios
            setTimeout(() => {
              console.log('[ListasListing] 🔄 Segunda recarga (después de 5s)...')
              recargarListas()
            }, 5000)
            // Tercera recarga final para asegurar que todo esté sincronizado
            setTimeout(() => {
              console.log('[ListasListing] 🔄 Tercera recarga final (después de 8s)...')
              recargarListas()
            }, 8000)
            // No hacer router.push ni router.refresh - solo actualizar datos localmente
          }}
        />

        <CargaMasivaPDFsPorColegioModal
          show={showCargaMasivaPDFsModal}
          onHide={() => setShowCargaMasivaPDFsModal(false)}
          onSuccess={() => {
            console.log('[ListasListing] ✅ Carga masiva de PDFs exitosa, recargando listas...')
            // Recargar listas sin hacer redirect, solo actualizar el estado local
            setTimeout(() => {
              recargarListas()
            }, 2000)
            setTimeout(() => {
              recargarListas()
            }, 5000)
            // No hacer router.push ni router.refresh - solo actualizar datos localmente
          }}
        />

        <DetalleListasModal
          show={showDetalleListasModal}
          onHide={() => {
            setShowDetalleListasModal(false)
            setColegioSeleccionado(null)
          }}
          colegio={colegioSeleccionado as any}
        />

        <EdicionColegioModal
          show={showEdicionColegioModal}
          onHide={() => {
            setShowEdicionColegioModal(false)
            setColegioSeleccionado(null)
          }}
          colegio={colegioSeleccionado as any}
          onSuccess={() => {
            recargarListas()
            setShowEdicionColegioModal(false)
            setColegioSeleccionado(null)
          }}
        />

        <CursosColegioModal
          show={showCursosModal}
          onHide={() => {
            setShowCursosModal(false)
            setColegioIdModal(null)
            setColegioNombreModal('')
          }}
          colegioId={colegioIdModal}
          colegioNombre={colegioNombreModal}
        />
      </Col>
    </Row>
  )
}
