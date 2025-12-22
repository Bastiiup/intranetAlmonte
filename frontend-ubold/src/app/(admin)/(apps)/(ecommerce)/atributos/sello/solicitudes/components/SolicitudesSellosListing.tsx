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
type SolicitudSelloType = {
  id: number
  id_sello: number
  nombre_sello: string
  acronimo: string
  editorial: string
  estado: 'pendiente' | 'aprobada' | 'rechazada'
  fecha_solicitud: string
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

// Función para mapear solicitudes de Strapi al formato SolicitudSelloType
const mapStrapiSolicitudToSolicitudType = (solicitud: any): SolicitudSelloType => {
  const attrs = solicitud.attributes || {}
  const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (solicitud as any)

  const idSello = getField(data, 'id_sello', 'idSello', 'ID_SELLO') || 0
  const nombre = getField(data, 'nombre_sello', 'nombreSello', 'nombre', 'NOMBRE_SELLO', 'NAME') || 'Sin nombre'
  const acronimo = getField(data, 'acronimo', 'acronimo', 'ACRONIMO') || ''
  
  // Obtener editorial (relation)
  const editorial = data.editorial?.data?.attributes?.nombre || 
                   data.editorial?.data?.nombre ||
                   data.editorial?.nombre ||
                   data.editorial?.id ||
                   '-'
  
  // Por defecto todas las solicitudes están pendientes hasta que tengamos el campo específico
  const estado = getField(data, 'estado', 'estado_solicitud', 'ESTADO') || 'pendiente'
  
  const createdAt = attrs.createdAt || (solicitud as any).createdAt || new Date().toISOString()
  const createdDate = new Date(createdAt)
  
  return {
    id: solicitud.id || solicitud.documentId || solicitud.id,
    id_sello: typeof idSello === 'string' ? parseInt(idSello) : idSello,
    nombre_sello: nombre,
    acronimo: acronimo,
    editorial: typeof editorial === 'string' ? editorial : '-',
    estado: estado as 'pendiente' | 'aprobada' | 'rechazada',
    fecha_solicitud: format(createdDate, 'dd MMM, yyyy'),
    time: format(createdDate, 'h:mm a'),
    url: `/atributos/sello/${solicitud.id || solicitud.documentId || solicitud.id}`,
  }
}

interface SolicitudesSellosListingProps {
  solicitudes?: any[]
  error?: string | null
}

const columnHelper = createColumnHelper<SolicitudSelloType>()

const SolicitudesSellosListing = ({ solicitudes, error }: SolicitudesSellosListingProps = {}) => {
  const router = useRouter()
  
  // Mapear solicitudes de Strapi al formato SolicitudSelloType si están disponibles
  const mappedSolicitudes = useMemo(() => {
    if (solicitudes && solicitudes.length > 0) {
      console.log('[SolicitudesSellosListing] Solicitudes recibidas:', solicitudes.length)
      const mapped = solicitudes.map(mapStrapiSolicitudToSolicitudType)
      console.log('[SolicitudesSellosListing] Solicitudes mapeadas:', mapped.length)
      return mapped
    }
    console.log('[SolicitudesSellosListing] No hay solicitudes de Strapi')
    return []
  }, [solicitudes])

  const columns: ColumnDef<SolicitudSelloType, any>[] = [
    {
      id: 'select',
      maxSize: 45,
      size: 45,
      header: ({ table }: { table: TableType<SolicitudSelloType> }) => (
        <input
          type="checkbox"
          className="form-check-input form-check-input-light fs-14"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row }: { row: TableRow<SolicitudSelloType> }) => (
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
    columnHelper.accessor('id_sello', {
      header: 'ID_SELLO',
      cell: ({ row }) => (
        <span className="fw-semibold">{row.original.id_sello?.toLocaleString() || '-'}</span>
      ),
    }),
    columnHelper.accessor('nombre_sello', {
      header: 'Sello',
      cell: ({ row }) => {
        return (
          <div className="d-flex">
            <div className="avatar-md me-3 bg-light d-flex align-items-center justify-content-center rounded">
              <span className="text-muted fs-xs">🏷️</span>
            </div>
            <div>
              <h5 className="mb-0">
                <Link href={row.original.url} className="link-reset">
                  {row.original.nombre_sello || 'Sin nombre'}
                </Link>
              </h5>
              {row.original.acronimo && (
                <p className="text-muted mb-0 small">Acrónimo: {row.original.acronimo}</p>
              )}
            </div>
          </div>
        )
      },
    }),
    columnHelper.accessor('editorial', {
      header: 'Editorial',
      cell: ({ row }) => (
        <span className="text-muted">{row.original.editorial || '-'}</span>
      ),
    }),
    columnHelper.accessor('estado', {
      header: 'Estado',
      filterFn: 'equalsString',
      enableColumnFilter: true,
      cell: ({ row }) => {
        const estadoColors = {
          pendiente: 'warning',
          aprobada: 'success',
          rechazada: 'danger',
        }
        const estadoLabels = {
          pendiente: 'Pendiente',
          aprobada: 'Aprobada',
          rechazada: 'Rechazada',
        }
        return (
          <Badge bg={estadoColors[row.original.estado] || 'secondary'} className="fs-xxs">
            {estadoLabels[row.original.estado] || row.original.estado}
          </Badge>
        )
      },
    }),
    columnHelper.accessor('fecha_solicitud', {
      header: 'Fecha de Solicitud',
      cell: ({ row }) => (
        <>
          {row.original.fecha_solicitud} <small className="text-muted">{row.original.time}</small>
        </>
      ),
    }),
    {
      header: 'Acciones',
      cell: ({ row }: { row: TableRow<SolicitudSelloType> }) => (
        <div className="d-flex gap-1">
          <Link href={row.original.url}>
            <Button variant="default" size="sm" className="btn-icon rounded-circle">
              <TbEye className="fs-lg" />
            </Button>
          </Link>
          <Link href={row.original.url}>
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

  const [data, setData] = useState<SolicitudSelloType[]>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 })

  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({})

  // Actualizar datos cuando cambien las solicitudes de Strapi
  useEffect(() => {
    console.log('[SolicitudesSellosListing] useEffect - solicitudes:', solicitudes?.length, 'mappedSolicitudes:', mappedSolicitudes.length)
    setData(mappedSolicitudes)
    console.log('[SolicitudesSellosListing] Datos actualizados. Total:', mappedSolicitudes.length)
  }, [mappedSolicitudes, solicitudes])

  const table = useReactTable<SolicitudSelloType>({
    data,
    columns,
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
      // Eliminar cada solicitud seleccionada
      for (const solicitudId of idsToDelete) {
        const response = await fetch(`/api/tienda/sello/${solicitudId}`, {
          method: 'DELETE',
        })
        if (!response.ok) {
          throw new Error(`Error al eliminar solicitud ${solicitudId}`)
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
      console.error('Error al eliminar solicitudes:', error)
      alert('Error al eliminar las solicitudes seleccionadas')
    }
  }

  // Mostrar error si existe
  const hasError = !!error
  const hasData = mappedSolicitudes.length > 0
  
  if (hasError && !hasData) {
    return (
      <Row>
        <Col xs={12}>
          <Alert variant="warning">
            <strong>Error al cargar solicitudes desde Strapi:</strong> {error}
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
    console.warn('[SolicitudesSellosListing] Error al cargar desde Strapi, usando datos disponibles:', error)
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
                  placeholder="Buscar solicitud de sello..."
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
                  value={(table.getColumn('estado')?.getFilterValue() as string) ?? 'All'}
                  onChange={(e) => table.getColumn('estado')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)}>
                  <option value="All">Estado</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="aprobada">Aprobada</option>
                  <option value="rechazada">Rechazada</option>
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
              <Link href="/atributos/sello/agregar" passHref>
                <Button variant="danger" className="ms-1">
                  <TbPlus className="fs-sm me-2" /> Nueva Solicitud
                </Button>
              </Link>
            </div>
          </CardHeader>

          <DataTable<SolicitudSelloType>
            table={table}
            emptyMessage="No se encontraron solicitudes"
            enableColumnReordering={true}
          />

          {table.getRowModel().rows.length > 0 && (
            <CardFooter className="border-0">
              <TablePagination
                totalItems={totalItems}
                start={start}
                end={end}
                itemsName="solicitudes"
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
            itemName="solicitud"
          />
        </Card>
      </Col>
    </Row>
  )
}

export default SolicitudesSellosListing

