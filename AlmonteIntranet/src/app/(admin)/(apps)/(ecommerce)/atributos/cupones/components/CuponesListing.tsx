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
import { Button, Card, CardFooter, CardHeader, Col, Row, Alert, Badge } from 'react-bootstrap'
import { LuSearch } from 'react-icons/lu'
import { TbEdit, TbEye, TbList, TbPlus, TbTrash } from 'react-icons/tb'

import DataTable from '@/components/table/DataTable'
import DeleteConfirmationModal from '@/components/table/DeleteConfirmationModal'
import TablePagination from '@/components/table/TablePagination'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'

// Tipo para la tabla
type CuponType = {
  id: number
  codigo: string
  tipo_cupon: string
  importe_cupon: number | null
  descripcion: string
  uso_limite: number | null
  fecha_caducidad: string | null
  originPlatform: string
  status: 'active' | 'expired' | 'inactive'
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

// Función para mapear cupones de Strapi al formato CuponType
const mapStrapiCuponToCuponType = (cupon: any): CuponType => {
  const attrs = cupon.attributes || {}
  const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (cupon as any)

  const codigo = getField(data, 'codigo', 'CODIGO', 'CODE') || 'Sin código'
  const tipoCupon = getField(data, 'tipo_cupon', 'tipoCupon', 'TIPO_CUPON') || 'fixed_cart'
  const importeCupon = getField(data, 'importe_cupon', 'importeCupon', 'IMPORTE_CUPON')
  const descripcion = getField(data, 'descripcion', 'DESCRIPCION', 'DESCRIPTION') || ''
  const usoLimite = getField(data, 'uso_limite', 'usoLimite', 'USO_LIMITE')
  const fechaCaducidad = getField(data, 'fecha_caducidad', 'fechaCaducidad', 'FECHA_CADUCIDAD')
  // originPlatform es un campo directo en Strapi (Enumeration)
  const originPlatform = getField(data, 'originPlatform', 'origin_platform', 'ORIGIN_PLATFORM') || 'woo_moraleja'
  
  // Determinar estado
  let status: 'active' | 'expired' | 'inactive' = 'active'
  if (fechaCaducidad) {
    const expiryDate = new Date(fechaCaducidad)
    const now = new Date()
    if (expiryDate < now) {
      status = 'expired'
    }
  }
  const isPublished = !!(attrs.publishedAt || (cupon as any).publishedAt)
  if (!isPublished) {
    status = 'inactive'
  }
  
  // Obtener fechas
  const createdAt = attrs.createdAt || (cupon as any).createdAt || new Date().toISOString()
  const createdDate = new Date(createdAt)
  
  return {
    id: cupon.id || cupon.documentId || cupon.id,
    codigo,
    tipo_cupon: tipoCupon,
    importe_cupon: importeCupon ? parseFloat(importeCupon) : null,
    descripcion,
    uso_limite: usoLimite ? parseInt(usoLimite) : null,
    fecha_caducidad: fechaCaducidad || null,
    originPlatform,
    status,
    date: format(createdDate, 'dd MMM, yyyy'),
    time: format(createdDate, 'h:mm a'),
    url: `/atributos/cupones/${cupon.id || cupon.documentId || cupon.id}`,
  }
}

interface CuponesListingProps {
  cupones?: any[]
  error?: string | null
}

const columnHelper = createColumnHelper<CuponType>()

const CuponesListing = ({ cupones, error }: CuponesListingProps = {}) => {
  const router = useRouter()
  
  const mappedCupones = useMemo(() => {
    if (cupones && cupones.length > 0) {
      console.log('[CuponesListing] Cupones recibidos:', cupones.length)
      const mapped = cupones.map(mapStrapiCuponToCuponType)
      console.log('[CuponesListing] Cupones mapeados:', mapped.length)
      return mapped
    }
    console.log('[CuponesListing] No hay cupones de Strapi')
    return []
  }, [cupones])

  const columns: ColumnDef<CuponType, any>[] = [
    {
      id: 'select',
      maxSize: 45,
      size: 45,
      header: ({ table }: { table: TableType<CuponType> }) => (
        <input
          type="checkbox"
          className="form-check-input form-check-input-light fs-14"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row }: { row: TableRow<CuponType> }) => (
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
    columnHelper.accessor('codigo', {
      header: 'Código',
      cell: ({ row }) => {
        return (
          <div className="d-flex">
            <div className="avatar-md me-3 bg-light d-flex align-items-center justify-content-center rounded">
              <span className="text-muted fs-xs">🎟️</span>
            </div>
            <div>
              <h5 className="mb-0">
                <Link href={`/atributos/cupones/${row.original.id}`} className="link-reset">
                  {row.original.codigo || 'Sin código'}
                </Link>
              </h5>
            </div>
          </div>
        )
      },
    }),
    columnHelper.accessor('tipo_cupon', {
      header: 'Tipo',
      cell: ({ row }) => {
        const tipo = row.original.tipo_cupon || 'fixed_cart'
        const tipoLabels: Record<string, string> = {
          'fixed_cart': 'Fijo Carrito',
          'fixed_product': 'Fijo Producto',
          'percent': 'Porcentaje',
          'percent_product': 'Porcentaje Producto',
        }
        return <span className="text-muted">{tipoLabels[tipo] || tipo}</span>
      },
    }),
    columnHelper.accessor('importe_cupon', {
      header: 'Importe',
      cell: ({ row }) => {
        const importe = row.original.importe_cupon
        const tipo = row.original.tipo_cupon || 'fixed_cart'
        if (!importe) return <span className="text-muted">-</span>
        if (tipo === 'percent' || tipo === 'percent_product') {
          return <span className="fw-semibold">{importe}%</span>
        }
        return <span className="fw-semibold">${importe.toLocaleString()}</span>
      },
    }),
    columnHelper.accessor('uso_limite', {
      header: 'Uso Límite',
      cell: ({ row }) => (
        <span className="text-muted">{row.original.uso_limite || 'Ilimitado'}</span>
      ),
    }),
    columnHelper.accessor('fecha_caducidad', {
      header: 'Fecha Caducidad',
      cell: ({ row }) => {
        if (!row.original.fecha_caducidad) return <span className="text-muted">-</span>
        const fecha = new Date(row.original.fecha_caducidad)
        return <span className="text-muted">{format(fecha, 'dd MMM, yyyy')}</span>
      },
    }),
    columnHelper.accessor('originPlatform', {
      header: 'Plataforma',
      cell: ({ row }) => {
        const platform = row.original.originPlatform
        let variant: string
        switch (platform) {
          case 'woo_moraleja':
            variant = 'info'
            break
          case 'woo_escolar':
            variant = 'primary'
            break
          case 'otros':
          default:
            variant = 'secondary'
            break
        }
        return <Badge bg={variant}>{platform.replace('woo_', 'WooCommerce ').replace('_', ' ').toUpperCase()}</Badge>
      },
    }),
    columnHelper.accessor('status', {
      header: 'Estado',
      filterFn: 'equalsString',
      enableColumnFilter: true,
      cell: ({ row }) => {
        const status = row.original.status
        let variant: string
        let label: string
        switch (status) {
          case 'active':
            variant = 'success'
            label = 'Activo'
            break
          case 'expired':
            variant = 'danger'
            label = 'Expirado'
            break
          case 'inactive':
          default:
            variant = 'secondary'
            label = 'Inactivo'
            break
        }
        return <Badge bg={variant}>{label}</Badge>
      },
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
      cell: ({ row }: { row: TableRow<CuponType> }) => (
        <div className="d-flex gap-1">
          <Link href={`/atributos/cupones/${row.original.id}`}>
            <Button variant="default" size="sm" className="btn-icon rounded-circle">
              <TbEye className="fs-lg" />
            </Button>
          </Link>
          <Link href={`/atributos/cupones/${row.original.id}`}>
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

  const [data, setData] = useState<CuponType[]>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 })

  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({})

  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cupones-column-order')
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

  const handleColumnOrderChange = (newOrder: string[]) => {
    setColumnOrder(newOrder)
    if (typeof window !== 'undefined') {
      localStorage.setItem('cupones-column-order', JSON.stringify(newOrder))
    }
  }

  useEffect(() => {
    console.log('[CuponesListing] useEffect - cupones:', cupones?.length, 'mappedCupones:', mappedCupones.length)
    setData(mappedCupones)
    console.log('[CuponesListing] Datos actualizados. Total:', mappedCupones.length)
  }, [mappedCupones, cupones])

  const table = useReactTable<CuponType>({
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
    const selectedRowIdsArray = Object.keys(selectedRowIds)
    const idsToDelete = selectedRowIdsArray
      .map(rowId => {
        const row = table.getRow(rowId)
        return row?.original?.id
      })
      .filter(Boolean)
    
    if (idsToDelete.length === 0) {
      alert('No se seleccionaron cupones para eliminar')
      return
    }
    
    try {
      for (const cuponId of idsToDelete) {
        const response = await fetch(`/api/tienda/cupones/${cuponId}`, {
          method: 'DELETE',
        })
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `Error al eliminar cupón ${cuponId}`)
        }
      }
      
      // Actualizar datos eliminando los cupones eliminados
      setData((old) => old.filter(cupon => !idsToDelete.includes(cupon.id)))
      setSelectedRowIds({})
      setPagination({ ...pagination, pageIndex: 0 })
      setShowDeleteModal(false)
      
      // Recargar la página para obtener datos actualizados
      router.refresh()
    } catch (error: any) {
      console.error('Error al eliminar cupones:', error)
      alert(`Error al eliminar los cupones seleccionados: ${error.message || 'Error desconocido'}`)
    }
  }

  const hasError = !!error
  const hasData = mappedCupones.length > 0
  
  if (hasError && !hasData) {
    return (
      <Row>
        <Col xs={12}>
          <Alert variant="warning">
            <strong>Error al cargar cupones desde Strapi:</strong> {error}
          </Alert>
        </Col>
      </Row>
    )
  }
  
  if (hasError && hasData) {
    console.warn('[CuponesListing] Error al cargar desde Strapi, usando datos disponibles:', error)
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
                  placeholder="Buscar código de cupón..."
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
                  <option value="expired">Expirado</option>
                  <option value="inactive">Inactivo</option>
                </select>
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
              <Button variant="primary" className="btn-icon">
                <TbList className="fs-lg" />
              </Button>
              <Link href="/atributos/cupones/agregar" passHref>
                <Button variant="danger" className="ms-1">
                  <TbPlus className="fs-sm me-2" /> Agregar Cupón
                </Button>
              </Link>
            </div>
          </CardHeader>

          <DataTable<CuponType>
            table={table}
            emptyMessage="No se encontraron cupones"
            enableColumnReordering={true}
            onColumnOrderChange={handleColumnOrderChange}
          />

          {table.getRowModel().rows.length > 0 && (
            <CardFooter className="border-0">
              <TablePagination
                totalItems={totalItems}
                start={start}
                end={end}
                itemsName="cupones"
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
            itemName="cupón"
          />
        </Card>
      </Col>
    </Row>
  )
}

export default CuponesListing
