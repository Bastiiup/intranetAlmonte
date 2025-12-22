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
type ObraType = {
  id: number
  name: string
  description: string
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

// Función para mapear obras de Strapi al formato ObraType
const mapStrapiObraToObraType = (obra: any): ObraType => {
  // Los datos pueden venir en attributes o directamente
  const attrs = obra.attributes || {}
  const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (obra as any)

  // Obtener nombre
  const nombre = getField(data, 'name', 'nombre', 'NOMBRE', 'NAME') || 'Sin nombre'
  
  // Obtener descripción
  const descripcion = getField(data, 'descripcion', 'description', 'DESCRIPCION', 'DESCRIPTION') || ''
  
  // Obtener estado (usa publishedAt para determinar si está publicado)
  const isPublished = !!(attrs.publishedAt || (obra as any).publishedAt)
  
  // Contar productos (si hay relación)
  const productos = data.productos?.data || data.products?.data || data.productos || data.products || []
  const productosCount = Array.isArray(productos) ? productos.length : 0
  
  // Obtener fechas
  const createdAt = attrs.createdAt || (obra as any).createdAt || new Date().toISOString()
  const createdDate = new Date(createdAt)
  
  return {
    id: obra.id || obra.documentId || obra.id,
    name: nombre,
    description: descripcion,
    products: productosCount,
    status: isPublished ? 'active' : 'inactive',
    date: format(createdDate, 'dd MMM, yyyy'),
    time: format(createdDate, 'h:mm a'),
    url: `/products/atributos/obras/${obra.id || obra.documentId || obra.id}`, // URL actualizada
  }
}

interface ObrasListingProps {
  obras?: any[]
  error?: string | null
}

const columnHelper = createColumnHelper<ObraType>()

const ObrasListing = ({ obras, error }: ObrasListingProps = {}) => {
  const router = useRouter()
  
  // Mapear obras de Strapi al formato ObraType si están disponibles
  const mappedObras = useMemo(() => {
    if (obras && obras.length > 0) {
      console.log('[ObrasListing] Obras recibidas:', obras.length)
      const mapped = obras.map(mapStrapiObraToObraType)
      console.log('[ObrasListing] Obras mapeadas:', mapped.length)
      return mapped
    }
    console.log('[ObrasListing] No hay obras de Strapi')
    return []
  }, [obras])

  const columns: ColumnDef<ObraType, any>[] = [
    {
      id: 'select',
      maxSize: 45,
      size: 45,
      header: ({ table }: { table: TableType<ObraType> }) => (
        <input
          type="checkbox"
          className="form-check-input form-check-input-light fs-14"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row }: { row: TableRow<ObraType> }) => (
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
      header: 'Obra',
      cell: ({ row }) => {
        return (
          <div className="d-flex">
            <div className="avatar-md me-3 bg-light d-flex align-items-center justify-content-center rounded">
              <span className="text-muted fs-xs">📚</span>
            </div>
            <div>
              <h5 className="mb-0">
                <Link href={`/products/atributos/obras/${row.original.id}`} className="link-reset">
                  {row.original.name || 'Sin nombre'}
                </Link>
              </h5>
            </div>
          </div>
        )
      },
    }),
    columnHelper.accessor('description', {
      header: 'Descripción',
      cell: ({ row }) => (
        <p className="text-muted mb-0 small">
          {row.original.description || 'Sin descripción'}
        </p>
      ),
    }),
    columnHelper.accessor('products', {
      header: 'Productos',
      cell: ({ row }) => (
        <span className="badge badge-soft-info">{row.original.products}</span>
      ),
    }),
    columnHelper.accessor('status', {
      header: 'Estado',
      filterFn: 'equalsString',
      enableColumnFilter: true,
      cell: ({ row }) => (
        <span
          className={`badge ${row.original.status === 'active' ? 'badge-soft-success' : 'badge-soft-danger'} fs-xxs`}>
          {row.original.status === 'active' ? 'Activo' : 'Inactivo'}
        </span>
      ),
    }),
    columnHelper.accessor('date', {
      header: 'Fecha',
      cell: ({ row }) => (
        <>
          {row.original.date} <small className="text-muted">{row.original.time}</small>
        </>
      ),
    }),
    {
      header: 'Acciones',
      cell: ({ row }: { row: TableRow<ObraType> }) => (
        <div className="d-flex gap-1">
          <Link href={`/products/atributos/obras/${row.original.id}`}>
            <Button variant="default" size="sm" className="btn-icon rounded-circle">
              <TbEye className="fs-lg" />
            </Button>
          </Link>
          <Link href={`/products/atributos/obras/${row.original.id}`}>
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

  const [data, setData] = useState<ObraType[]>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 })

  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({})

  // Estado para el orden de columnas
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('obras-column-order')
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
      localStorage.setItem('obras-column-order', JSON.stringify(newOrder))
    }
  }

  // Actualizar datos cuando cambien las obras de Strapi
  useEffect(() => {
    console.log('[ObrasListing] useEffect - obras:', obras?.length, 'mappedObras:', mappedObras.length)
    setData(mappedObras)
    console.log('[ObrasListing] Datos actualizados. Total:', mappedObras.length)
  }, [mappedObras, obras])

  const table = useReactTable<ObraType>({
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
      // Eliminar cada obra seleccionada
      for (const obraId of idsToDelete) {
        const response = await fetch(`/api/tienda/obras/${obraId}`, {
          method: 'DELETE',
        })
        if (!response.ok) {
          throw new Error(`Error al eliminar obra ${obraId}`)
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
      console.error('Error al eliminar obras:', error)
      alert('Error al eliminar las obras seleccionadas')
    }
  }

  // Mostrar error si existe
  const hasError = !!error
  const hasData = mappedObras.length > 0
  
  if (hasError && !hasData) {
    return (
      <Row>
        <Col xs={12}>
          <Alert variant="warning">
            <strong>Error al cargar obras desde Strapi:</strong> {error}
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
    console.warn('[ObrasListing] Error al cargar desde Strapi, usando datos disponibles:', error)
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
                  placeholder="Buscar nombre de obra..."
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
              <Link passHref href="/products/atributos/obras">
                <Button variant="outline-primary" className="btn-icon btn-soft-primary">
                  <TbLayoutGrid className="fs-lg" />
                </Button>
              </Link>
              <Button variant="primary" className="btn-icon">
                <TbList className="fs-lg" />
              </Button>
              <Link href="/products/atributos/obras/agregar" passHref>
                <Button variant="danger" className="ms-1">
                  <TbPlus className="fs-sm me-2" /> Agregar Obra
                </Button>
              </Link>
            </div>
          </CardHeader>

          <DataTable<ObraType>
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
                itemsName="obras"
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
            itemName="obra"
          />
        </Card>
      </Col>
    </Row>
  )
}

export default ObrasListing

