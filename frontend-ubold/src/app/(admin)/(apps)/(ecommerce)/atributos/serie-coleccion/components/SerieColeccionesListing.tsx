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

// Tipo para la tabla
type SerieColeccionType = {
  id: number
  id_coleccion: number
  name: string
  editorial: string
  sello: string
  products: number
  status: 'active' | 'inactive'
  date: string
  time: string
  url: string
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

// Función para mapear serie-colecciones de Strapi al formato SerieColeccionType
const mapStrapiSerieColeccionToSerieColeccionType = (serieColeccion: any): SerieColeccionType => {
  const attrs = serieColeccion.attributes || {}
  const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (serieColeccion as any)

  // Obtener id_coleccion (schema real de Strapi - Number)
  const idColeccion = getField(data, 'id_coleccion', 'idColeccion', 'ID_COLECCION') || 0
  
  // Obtener nombre_coleccion (schema real de Strapi)
  const nombre = getField(data, 'nombre_coleccion', 'nombreColeccion', 'nombre', 'NOMBRE_COLECCION', 'NAME') || 'Sin nombre'
  
  // Obtener editorial (relation manyToOne)
  const editorial = data.editorial?.data?.attributes?.nombre || 
                     data.editorial?.data?.nombre ||
                     data.editorial?.nombre ||
                     data.editorial?.id ||
                     '-'
  
  // Obtener sello (relation manyToOne)
  const sello = data.sello?.data?.attributes?.nombre_sello || 
                data.sello?.data?.attributes?.nombre ||
                data.sello?.data?.nombre_sello ||
                data.sello?.data?.nombre ||
                data.sello?.nombre_sello ||
                data.sello?.nombre ||
                data.sello?.id ||
                '-'
  
  // Obtener estado (usa publishedAt para determinar si está publicado)
  const isPublished = !!(attrs.publishedAt || (serieColeccion as any).publishedAt)
  
  // Contar productos asociados (libros según schema)
  const libros = data.libros?.data || data.libros || []
  const librosCount = Array.isArray(libros) ? libros.length : 0
  
  // Obtener fechas
  const createdAt = attrs.createdAt || (serieColeccion as any).createdAt || new Date().toISOString()
  const createdDate = new Date(createdAt)
  
  return {
    id: serieColeccion.id || serieColeccion.documentId || serieColeccion.id,
    id_coleccion: typeof idColeccion === 'string' ? parseInt(idColeccion) : idColeccion,
    name: nombre,
    editorial: typeof editorial === 'string' ? editorial : '-',
    sello: typeof sello === 'string' ? sello : '-',
    products: librosCount,
    status: isPublished ? 'active' : 'inactive',
    date: format(createdDate, 'dd MMM, yyyy'),
    time: format(createdDate, 'h:mm a'),
    url: `/atributos/serie-coleccion/${serieColeccion.id || serieColeccion.documentId || serieColeccion.id}`,
  }
}

interface SerieColeccionesListingProps {
  serieColecciones?: any[]
  error?: string | null
}

const columnHelper = createColumnHelper<SerieColeccionType>()

const SerieColeccionesListing = ({ serieColecciones, error }: SerieColeccionesListingProps = {}) => {
  const router = useRouter()
  
  const mappedSerieColecciones = useMemo(() => {
    if (serieColecciones && serieColecciones.length > 0) {
      console.log('[SerieColeccionesListing] Serie-colecciones recibidas:', serieColecciones.length)
      const mapped = serieColecciones.map(mapStrapiSerieColeccionToSerieColeccionType)
      console.log('[SerieColeccionesListing] Serie-colecciones mapeadas:', mapped.length)
      return mapped
    }
    console.log('[SerieColeccionesListing] No hay serie-colecciones de Strapi')
    return []
  }, [serieColecciones])

  const columns: ColumnDef<SerieColeccionType, any>[] = [
    {
      id: 'select',
      maxSize: 45,
      size: 45,
      header: ({ table }: { table: TableType<SerieColeccionType> }) => (
        <input
          type="checkbox"
          className="form-check-input form-check-input-light fs-14"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row }: { row: TableRow<SerieColeccionType> }) => (
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
    columnHelper.accessor('id', {
      header: 'ID',
      cell: ({ row }) => (
        <span className="text-muted">{row.original.id}</span>
      ),
    }),
    columnHelper.accessor('id_coleccion', {
      header: 'ID_COLECCIÓN',
      cell: ({ row }) => (
        <span className="fw-semibold">{row.original.id_coleccion?.toLocaleString() || '-'}</span>
      ),
    }),
    columnHelper.accessor('name', {
      header: 'NOMBRE_COLECCIÓN',
      cell: ({ row }) => {
        return (
          <div className="d-flex">
            <div className="avatar-md me-3 bg-light d-flex align-items-center justify-content-center rounded">
              <span className="text-muted fs-xs">📚</span>
            </div>
            <div>
              <h5 className="mb-0">
                <Link href={`/atributos/serie-coleccion/${row.original.id}`} className="link-reset">
                  {row.original.name || 'Sin nombre'}
                </Link>
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
    columnHelper.accessor('sello', {
      header: 'SELLO',
      cell: ({ row }) => (
        <span className="text-muted">{row.original.sello || '-'}</span>
      ),
    }),
    columnHelper.accessor('products', {
      header: 'LIBROS',
      cell: ({ row }) => (
        <span className="badge badge-soft-info">{row.original.products || 0}</span>
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
    {
      header: 'Acciones',
      cell: ({ row }: { row: TableRow<SerieColeccionType> }) => (
        <div className="d-flex gap-1">
          <Link href={`/atributos/serie-coleccion/${row.original.id}`}>
            <Button variant="default" size="sm" className="btn-icon rounded-circle">
              <TbEye className="fs-lg" />
            </Button>
          </Link>
          <Link href={`/atributos/serie-coleccion/${row.original.id}`}>
            <Button
              variant="default"
              size="sm"
              className="btn-icon rounded-circle"
            >
              <TbEdit className="fs-lg" />
            </Button>
          </Link>
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
        </div>
      ),
    },
  ]

  const [data, setData] = useState<SerieColeccionType[]>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 })

  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({})

  // Estado para el orden de columnas
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('serie-colecciones-column-order')
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
      localStorage.setItem('serie-colecciones-column-order', JSON.stringify(newOrder))
    }
  }

  // Actualizar datos cuando cambien las serie-colecciones de Strapi
  useEffect(() => {
    console.log('[SerieColeccionesListing] useEffect - serieColecciones:', serieColecciones?.length, 'mappedSerieColecciones:', mappedSerieColecciones.length)
    setData(mappedSerieColecciones)
    console.log('[SerieColeccionesListing] Datos actualizados. Total:', mappedSerieColecciones.length)
  }, [mappedSerieColecciones, serieColecciones])

  const table = useReactTable<SerieColeccionType>({
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
      // Eliminar cada serie-coleccion seleccionada
      for (const serieColeccionId of idsToDelete) {
        const response = await fetch(`/api/tienda/serie-coleccion/${serieColeccionId}`, {
          method: 'DELETE',
        })
        if (!response.ok) {
          throw new Error(`Error al eliminar serie/colección ${serieColeccionId}`)
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
      console.error('Error al eliminar serie-colecciones:', error)
      alert('Error al eliminar las series/colecciones seleccionadas')
    }
  }

  // Mostrar error si existe
  const hasError = !!error
  const hasData = mappedSerieColecciones.length > 0
  
  if (hasError && !hasData) {
    return (
      <Row>
        <Col xs={12}>
          <Alert variant="warning">
            <strong>Error al cargar series/colecciones desde Strapi:</strong> {error}
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
    console.warn('[SerieColeccionesListing] Error al cargar desde Strapi, usando datos disponibles:', error)
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
                  placeholder="Buscar serie/colección..."
                  value={globalFilter ?? ''}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                />
                <LuSearch className="app-search-icon text-muted" />
              </div>

              {Object.keys(selectedRowIds).length > 0 && (
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
              <Link passHref href="/atributos/serie-coleccion">
                <Button variant="outline-primary" className="btn-icon btn-soft-primary">
                  <TbLayoutGrid className="fs-lg" />
                </Button>
              </Link>
              <Button variant="primary" className="btn-icon">
                <TbList className="fs-lg" />
              </Button>
              <Link href="/atributos/serie-coleccion/agregar" passHref>
                <Button variant="danger" className="ms-1">
                  <TbPlus className="fs-sm me-2" /> Agregar Serie/Colección
                </Button>
              </Link>
            </div>
          </CardHeader>

          <DataTable<SerieColeccionType>
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
                itemsName="series/colecciones"
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
            itemName="serie/colección"
          />
        </Card>
      </Col>
    </Row>
  )
}

export default SerieColeccionesListing

