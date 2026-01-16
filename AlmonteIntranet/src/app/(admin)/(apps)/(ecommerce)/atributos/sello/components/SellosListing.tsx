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
import { useState, useEffect, useMemo } from 'react'
import { Button, Card, CardFooter, CardHeader, Col, Row, Alert } from 'react-bootstrap'
import { LuBox, LuSearch } from 'react-icons/lu'
import { TbEdit, TbEye, TbLayoutGrid, TbList, TbPlus, TbTrash } from 'react-icons/tb'

import DataTable from '@/components/table/DataTable'
import DeleteConfirmationModal from '@/components/table/DeleteConfirmationModal'
import TablePagination from '@/components/table/TablePagination'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

// Tipo para la tabla
type SelloType = {
  id: number
  name: string
  acronimo: string
  editorial: string
  products: number
  status: 'active' | 'inactive'
  date: string
  time: string
  url: string
  selloId?: string
  estadoPublicacion?: 'Publicado' | 'Pendiente' | 'Borrador'
}

// Helper para obtener campo con múltiples variaciones
const getField = (obj: any, ...fieldNames: string[]): any => {
  for (const fieldName of fieldNames) {
    if (obj[fieldName] !== undefined && obj[fieldName] !== null && obj[fieldName] !== '') {
      return obj[fieldName]
    }
  }
  return undefined
}

// Función para mapear sellos de Strapi al formato SelloType
const mapStrapiSelloToSelloType = (sello: any): SelloType => {
  // Los datos pueden venir en attributes o directamente
  const attrs = sello.attributes || {}
  const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (sello as any)

  // Obtener nombre_sello (schema real de Strapi)
  const nombre = getField(data, 'nombre_sello', 'nombreSello', 'nombre', 'NOMBRE_SELLO', 'NAME') || 'Sin nombre'
  
  // Obtener acronimo
  const acronimo = getField(data, 'acronimo', 'acronimo', 'ACRONIMO') || ''
  
  // Obtener editorial (relation)
  const editorial = data.editorial?.data?.attributes?.nombre || 
                     data.editorial?.data?.nombre ||
                     data.editorial?.nombre ||
                     data.editorial?.id ||
                     '-'
  
  // Obtener estado (usa publishedAt para determinar si está publicado)
  const isPublished = !!(attrs.publishedAt || (sello as any).publishedAt)
  
  // Obtener estado_publicacion (Strapi devuelve en minúsculas: "pendiente", "publicado", "borrador")
  const estadoPublicacionRaw = getField(data, 'estado_publicacion', 'ESTADO_PUBLICACION', 'estadoPublicacion') || 'pendiente'
  // Normalizar y capitalizar para mostrar (pero Strapi espera minúsculas)
  const estadoPublicacion = typeof estadoPublicacionRaw === 'string' 
    ? estadoPublicacionRaw.toLowerCase() 
    : estadoPublicacionRaw
  
  // Contar productos asociados (libros según schema)
  const libros = data.libros?.data || data.libros || []
  const colecciones = data.colecciones?.data || data.colecciones || []
  const librosCount = Array.isArray(libros) ? libros.length : 0
  const coleccionesCount = Array.isArray(colecciones) ? colecciones.length : 0
  const productosCount = librosCount + coleccionesCount
  
  // Obtener fechas
  const createdAt = attrs.createdAt || (sello as any).createdAt || new Date().toISOString()
  const createdDate = new Date(createdAt)
  
  const selloIdStr = String(sello.id || sello.documentId || sello.id)
  return {
    id: sello.id || sello.documentId || sello.id,
    name: nombre,
    acronimo: acronimo,
    editorial: typeof editorial === 'string' ? editorial : '-',
    products: productosCount,
    status: isPublished ? 'active' : 'inactive',
    date: format(createdDate, 'dd MMM, yyyy'),
    time: format(createdDate, 'h:mm a'),
    url: `/atributos/sello/${selloIdStr}`,
    selloId: selloIdStr,
    estadoPublicacion: (estadoPublicacion === 'publicado' ? 'Publicado' : 
                       estadoPublicacion === 'borrador' ? 'Borrador' : 
                       'Pendiente') as 'Publicado' | 'Pendiente' | 'Borrador',
  }
}

interface SellosListingProps {
  sellos?: any[]
  error?: string | null
  onSelloSelect?: (selloId: string) => void
  onSwitchToGrid?: () => void
}

const columnHelper = createColumnHelper<SelloType>()

const SellosListing = ({ sellos, error, onSelloSelect, onSwitchToGrid }: SellosListingProps = {}) => {
  const router = useRouter()
  // Obtener rol del usuario autenticado
  const { colaborador } = useAuth()
  const canDelete = colaborador?.rol === 'super_admin'
  
  // Mapear sellos de Strapi al formato SelloType si están disponibles
  const mappedSellos = useMemo(() => {
    if (sellos && sellos.length > 0) {
      console.log('[SellosListing] Sellos recibidos:', sellos.length)
      const mapped = sellos.map(mapStrapiSelloToSelloType)
      console.log('[SellosListing] Sellos mapeados:', mapped.length)
      return mapped
    }
    console.log('[SellosListing] No hay sellos de Strapi')
    return []
  }, [sellos])

  const columns: ColumnDef<SelloType, any>[] = [
    {
      id: 'select',
      maxSize: 45,
      size: 45,
      header: ({ table }: { table: TableType<SelloType> }) => (
        <input
          type="checkbox"
          className="form-check-input form-check-input-light fs-14"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row }: { row: TableRow<SelloType> }) => (
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
    columnHelper.accessor('name', {
      header: 'NOMBRE_SELLO',
      cell: ({ row }) => {
        return (
          <div className="d-flex">
            <div className="avatar-md me-3 bg-light d-flex align-items-center justify-content-center rounded">
              <span className="text-muted fs-xs">🏷️</span>
            </div>
            <div>
              <h5 className="mb-0">
                {onSelloSelect && row.original.selloId ? (
                  <a 
                    href="#" 
                    className="link-reset" 
                    onClick={(e) => {
                      e.preventDefault()
                      onSelloSelect(row.original.selloId!)
                    }}
                  >
                    {row.original.name || 'Sin nombre'}
                  </a>
                ) : (
                  <Link href={`/atributos/sello/${row.original.id}`} className="link-reset">
                    {row.original.name || 'Sin nombre'}
                  </Link>
                )}
              </h5>
            </div>
          </div>
        )
      },
    }),
    columnHelper.accessor('editorial', {
      header: 'EDITORIAL',
      cell: ({ row }) => (
        <span className="text-muted">{row.original.editorial || '-'}</span>
      ),
    }),
    columnHelper.accessor('status', {
      header: 'STATUS',
      filterFn: 'equalsString',
      enableColumnFilter: true,
      cell: ({ row }) => (
        <span
          className={`badge ${row.original.status === 'active' ? 'badge-soft-success' : 'badge-soft-danger'} fs-xxs`}>
          {row.original.status === 'active' ? 'Published' : 'Draft'}
        </span>
      ),
    }),
    columnHelper.accessor('estadoPublicacion', {
      header: 'Estado Publicación',
      filterFn: 'equalsString',
      enableColumnFilter: true,
      cell: ({ row }) => {
        const estado = row.original.estadoPublicacion || 'Pendiente'
        const badgeClass = estado === 'Publicado' ? 'badge-soft-success' :
                          estado === 'Pendiente' ? 'badge-soft-warning' :
                          'badge-soft-secondary'
        return (
          <span className={`badge ${badgeClass} fs-xxs`}>
            {estado}
          </span>
        )
      },
    }),
    {
      header: 'Acciones',
      cell: ({ row }: { row: TableRow<SelloType> }) => (
        <div className="d-flex gap-1">
          {onSelloSelect && row.original.selloId ? (
            <>
              <Button 
                variant="default" 
                size="sm" 
                className="btn-icon rounded-circle"
                onClick={(e) => {
                  e.preventDefault()
                  onSelloSelect(row.original.selloId!)
                }}
              >
                <TbEye className="fs-lg" />
              </Button>
              <Button
                variant="default"
                size="sm"
                className="btn-icon rounded-circle"
                onClick={(e) => {
                  e.preventDefault()
                  onSelloSelect(row.original.selloId!)
                }}
              >
                <TbEdit className="fs-lg" />
              </Button>
            </>
          ) : (
            <>
              <Link href={`/atributos/sello/${row.original.id}`}>
                <Button variant="default" size="sm" className="btn-icon rounded-circle">
                  <TbEye className="fs-lg" />
                </Button>
              </Link>
              <Link href={`/atributos/sello/${row.original.id}`}>
                <Button
                  variant="default"
                  size="sm"
                  className="btn-icon rounded-circle"
                >
                  <TbEdit className="fs-lg" />
                </Button>
              </Link>
            </>
          )}
          {canDelete && (
            <Button
              variant="default"
              size="sm"
              className="btn-icon rounded-circle"
              onClick={() => {
                toggleDeleteModal()
                setSelectedRowIds({ [row.id]: true })
              }}>
              <TbTrash className="fs-lg" />
            </Button>
          )}
        </div>
      ),
    },
  ]

  const [data, setData] = useState<SelloType[]>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 })

  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({})

  // Estado para el orden de columnas
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sellos-column-order')
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch (e) {
          console.error('Error al cargar orden de columnas:', e)
        }
      }
    }
    return []
  })

  // Guardar orden de columnas en localStorage
  const handleColumnOrderChange = (newOrder: string[]) => {
    setColumnOrder(newOrder)
    if (typeof window !== 'undefined') {
      localStorage.setItem('sellos-column-order', JSON.stringify(newOrder))
    }
  }

  // Actualizar datos cuando cambien los sellos de Strapi
  useEffect(() => {
    console.log('[SellosListing] useEffect - sellos:', sellos?.length, 'mappedSellos:', mappedSellos.length)
    setData(mappedSellos)
    console.log('[SellosListing] Datos actualizados. Total:', mappedSellos.length)
  }, [mappedSellos, sellos])

  const table = useReactTable<SelloType>({
    data,
    columns,
    state: { sorting, globalFilter, columnFilters, pagination, rowSelection: selectedRowIds, columnOrder },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    onRowSelectionChange: setSelectedRowIds,
    onColumnOrderChange: setColumnOrder,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: 'includesString',
    enableColumnFilters: true,
    enableRowSelection: true,
  })

  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const totalItems = table.getFilteredRowModel().rows.length

  const start = pageIndex * pageSize + 1
  const end = Math.min(start + pageSize - 1, totalItems)

  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false)

  const toggleDeleteModal = () => {
    setShowDeleteModal(!showDeleteModal)
  }

  const handleDelete = async () => {
    const selectedIds = Object.keys(selectedRowIds)
    const idsToDelete = selectedIds.map(id => data[parseInt(id)]?.id).filter(Boolean)
    
    try {
      // Eliminar cada sello seleccionado
      for (const selloId of idsToDelete) {
        const response = await fetch(`/api/tienda/sello/${selloId}`, {
          method: 'DELETE',
        })
        if (!response.ok) {
          console.warn(`Error al eliminar sello ${selloId}:`, response.status, response.statusText)
        }
      }
      
      // Actualizar datos localmente
      setData((old) => old.filter((_, idx) => !selectedIds.includes(idx.toString())))
      setSelectedRowIds({})
      setPagination({ ...pagination, pageIndex: 0 })
      setShowDeleteModal(false)
      
      // Recargar la página para reflejar cambios
      router.refresh()
    } catch (error) {
      console.error('Error al eliminar sellos:', error)
      // No mostrar alert, solo log en consola
    }
  }

  // Mostrar error si existe
  const hasError = !!error
  const hasData = mappedSellos.length > 0
  
  if (hasError && !hasData) {
    return (
      <Row>
        <Col xs={12}>
          <Alert variant="warning">
            <strong>Error al cargar sellos desde Strapi:</strong> {error}
            <br />
            <small className="text-muted">
              Verifica que:
              <ul className="mt-2 mb-0">
                <li>STRAPI_API_TOKEN esté configurado en Railway</li>
                <li>El servidor de Strapi esté disponible</li>
                <li>Las variables de entorno estén correctas</li>
              </ul>
            </small>
          </Alert>
        </Col>
      </Row>
    )
  }
  
  // Si hay error pero también hay datos, mostrar advertencia pero continuar
  if (hasError && hasData) {
    console.warn('[SellosListing] Error al cargar desde Strapi, usando datos disponibles:', error)
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
                  placeholder="Buscar sello..."
                  value={globalFilter ?? ''}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                />
                <LuSearch className="app-search-icon text-muted" />
              </div>

              {Object.keys(selectedRowIds).length > 0 && canDelete && (
                <Button variant="danger" size="sm" onClick={toggleDeleteModal}>
                  Eliminar
                </Button>
              )}
            </div>

            <div className="d-flex align-items-center gap-2">
              <span className="me-2 fw-semibold">Filtrar por:</span>

              <div className="app-search">
                <select
                  className="form-select form-control my-1 my-md-0"
                  value={(table.getColumn('status')?.getFilterValue() as string) ?? 'All'}
                  onChange={(e) => table.getColumn('status')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)}>
                  <option value="All">Estado</option>
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                </select>
                <LuBox className="app-search-icon text-muted" />
              </div>

              <div className="app-search">
                <select
                  className="form-select form-control my-1 my-md-0"
                  value={(table.getColumn('estadoPublicacion')?.getFilterValue() as string) ?? 'All'}
                  onChange={(e) => table.getColumn('estadoPublicacion')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)}>
                  <option value="All">Estado Publicación</option>
                  <option value="Publicado">Publicado</option>
                  <option value="Pendiente">Pendiente</option>
                  <option value="Borrador">Borrador</option>
                </select>
                <LuBox className="app-search-icon text-muted" />
              </div>

              <div>
                <select
                  className="form-select form-control my-1 my-md-0"
                  value={table.getState().pagination.pageSize}
                  onChange={(e) => table.setPageSize(Number(e.target.value))}>
                  {[5, 8, 10, 15, 20].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="d-flex gap-1">
              {onSwitchToGrid ? (
                <Button 
                  variant="outline-primary" 
                  className="btn-icon btn-soft-primary"
                  onClick={onSwitchToGrid}
                >
                  <TbLayoutGrid className="fs-lg" />
                </Button>
              ) : (
                <Link passHref href="/atributos/sello">
                  <Button variant="outline-primary" className="btn-icon btn-soft-primary">
                    <TbLayoutGrid className="fs-lg" />
                  </Button>
                </Link>
              )}
              <Button variant="primary" className="btn-icon">
                <TbList className="fs-lg" />
              </Button>
              <Link href="/atributos/sello/agregar" passHref>
                <Button variant="danger" className="ms-1">
                  <TbPlus className="fs-sm me-2" /> Agregar Sello
                </Button>
              </Link>
            </div>
          </CardHeader>

          <DataTable<SelloType>
            table={table}
            emptyMessage="No se encontraron registros"
            enableColumnReordering={true}
            onColumnOrderChange={handleColumnOrderChange}
          />

          {table.getRowModel().rows.length > 0 && (
            <CardFooter className="border-0">
              <TablePagination
                totalItems={totalItems}
                start={start}
                end={end}
                itemsName="sellos"
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
            onHide={toggleDeleteModal}
            onConfirm={handleDelete}
            selectedCount={Object.keys(selectedRowIds).length}
            itemName="sello"
          />
        </Card>
      </Col>
    </Row>
  )
}

export default SellosListing

