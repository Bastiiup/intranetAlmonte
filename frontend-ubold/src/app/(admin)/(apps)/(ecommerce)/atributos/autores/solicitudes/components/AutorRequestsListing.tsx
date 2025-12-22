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
import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect, useMemo } from 'react'
import { Button, Card, CardFooter, CardHeader, Col, Row, Alert, Badge } from 'react-bootstrap'
import { LuBox, LuSearch } from 'react-icons/lu'
import { TbCheck, TbEdit, TbEye, TbList, TbPlus, TbTrash, TbX } from 'react-icons/tb'

import DataTable from '@/components/table/DataTable'
import DeleteConfirmationModal from '@/components/table/DeleteConfirmationModal'
import ConfirmStatusModal from '@/components/table/ConfirmStatusModal'
import TablePagination from '@/components/table/TablePagination'
import { STRAPI_API_URL } from '@/lib/strapi/config'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'

// Tipo para solicitudes de autores
type AutorRequestType = {
  id: number
  nombre_completo_autor: string
  tipo_autor: string
  website: string
  foto: { src: string | null }
  estado: 'pendiente' | 'aprobada' | 'rechazada'
  fecha_solicitud: string
  time: string
  url: string
  strapiId?: number
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

// Función para mapear solicitudes de Strapi al formato AutorRequestType
const mapStrapiSolicitudToRequestType = (solicitud: any): AutorRequestType => {
  const attrs = solicitud.attributes || {}
  const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (solicitud as any)

  // Obtener URL de foto
  const getFotoUrl = (): string | null => {
    let foto = data.foto || data.FOTO
    if (foto?.data) {
      foto = foto.data
    }
    if (!foto || foto === null) {
      return null
    }
    const url = foto.attributes?.url || foto.attributes?.URL || foto.url || foto.URL
    if (!url) {
      return null
    }
    if (url.startsWith('http')) {
      return url
    }
    const baseUrl = STRAPI_API_URL.replace(/\/$/, '')
    return `${baseUrl}${url.startsWith('/') ? url : `/${url}`}`
  }

  const nombreCompleto = getField(
    data,
    'nombre_completo_autor',
    'nombreCompletoAutor',
    'nombre_autor',
    'nombre',
    'NOMBRE_AUTOR',
    'NAME',
  ) || 'Sin nombre'

  const tipoAutor = getField(data, 'tipo_autor', 'tipoAutor', 'TIPO_AUTOR') || 'Persona'
  const website = getField(data, 'website', 'WEBSITE') || ''
  
  // Leer estado_publicacion: 'pendiente' -> 'pendiente', 'publicado' -> 'aprobada'
  const estadoPublicacion = getField(data, 'estado_publicacion', 'estadoPublicacion', 'ESTADO_PUBLICACION') || 'pendiente'
  const estado = estadoPublicacion === 'publicado' ? 'aprobada' : estadoPublicacion === 'pendiente' ? 'pendiente' : 'pendiente'

  const createdAt = attrs.createdAt || (solicitud as any).createdAt || new Date().toISOString()
  const createdDate = new Date(createdAt)
  const fotoUrl = getFotoUrl()

  return {
    id: solicitud.id || solicitud.documentId || solicitud.id,
    nombre_completo_autor: nombreCompleto,
    tipo_autor: tipoAutor,
    website,
    foto: { src: fotoUrl || '' },
    estado: estado as 'pendiente' | 'aprobada' | 'rechazada',
    fecha_solicitud: format(createdDate, 'dd MMM, yyyy'),
    time: format(createdDate, 'h:mm a'),
    url: `/atributos/autores/${solicitud.id || solicitud.documentId || solicitud.id}`,
    strapiId: solicitud.id,
  }
}

interface AutorRequestsListingProps {
  solicitudes?: any[]
  error?: string | null
}

const columnHelper = createColumnHelper<AutorRequestType>()

const AutorRequestsListing = ({ solicitudes, error }: AutorRequestsListingProps = {}) => {
  const router = useRouter()

  const mappedSolicitudes = useMemo(() => {
    if (solicitudes && solicitudes.length > 0) {
      console.log('[AutorRequestsListing] Solicitudes recibidas:', solicitudes.length)
      const mapped = solicitudes.map(mapStrapiSolicitudToRequestType)
      console.log('[AutorRequestsListing] Solicitudes mapeadas:', mapped.length)
      return mapped
    }
    console.log('[AutorRequestsListing] No hay solicitudes de Strapi')
    return []
  }, [solicitudes])

  const columns: ColumnDef<AutorRequestType, any>[] = [
    {
      id: 'select',
      maxSize: 45,
      size: 45,
      header: ({ table }: { table: TableType<AutorRequestType> }) => (
        <input
          type="checkbox"
          className="form-check-input form-check-input-light fs-14"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row }: { row: TableRow<AutorRequestType> }) => (
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
    columnHelper.accessor('nombre_completo_autor', {
      header: 'Autor',
      cell: ({ row }) => {
        const fotoSrc = row.original.foto?.src

        if (!fotoSrc) {
          return (
            <div className="d-flex">
              <div className="avatar-md me-3 bg-light d-flex align-items-center justify-content-center rounded">
                <span className="text-muted fs-xs">👤</span>
              </div>
              <div>
                <h5 className="mb-0">
                  <Link href={row.original.url} className="link-reset">
                    {row.original.nombre_completo_autor}
                  </Link>
                </h5>
                <p className="text-muted mb-0 fs-xxs">{row.original.tipo_autor}</p>
              </div>
            </div>
          )
        }

        return (
          <div className="d-flex">
            <div className="avatar-md me-3">
              <Image
                src={fotoSrc}
                alt={row.original.nombre_completo_autor || 'Autor'}
                height={36}
                width={36}
                className="img-fluid rounded-circle"
                unoptimized={fotoSrc.startsWith('http')}
              />
            </div>
            <div>
              <h5 className="mb-0">
                <Link href={row.original.url} className="link-reset">
                  {row.original.nombre_completo_autor || 'Sin nombre'}
                </Link>
              </h5>
              <p className="text-muted mb-0 fs-xxs">{row.original.tipo_autor || 'Persona'}</p>
            </div>
          </div>
        )
      },
    }),
    columnHelper.accessor('tipo_autor', {
      header: 'Tipo',
      filterFn: 'equalsString',
      enableColumnFilter: true,
    }),
    columnHelper.accessor('website', {
      header: 'Website',
      cell: ({ row }) =>
        row.original.website ? (
          <a
            href={row.original.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary"
          >
            {row.original.website}
          </a>
        ) : (
          <span className="text-muted">-</span>
        ),
    }),
    columnHelper.accessor('estado', {
      header: 'Estado',
      filterFn: 'equalsString',
      enableColumnFilter: true,
      cell: ({ row }) => {
        const estadoColors: Record<string, string> = {
          pendiente: 'warning',
          aprobada: 'success',
          rechazada: 'danger',
        }
        const estadoLabels: Record<string, string> = {
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
      cell: ({ row }: { row: TableRow<AutorRequestType> }) => (
        <div className="d-flex gap-1">
          <Link href={row.original.url}>
            <Button variant="default" size="sm" className="btn-icon rounded-circle">
              <TbEye className="fs-lg" />
            </Button>
          </Link>
          {row.original.estado === 'pendiente' && (
            <>
              <Button
                variant="success"
                size="sm"
                className="btn-icon rounded-circle"
                onClick={() => handleApproveClick(row.original.id)}
                title="Aprobar"
              >
                <TbCheck className="fs-lg" />
              </Button>
              <Button
                variant="danger"
                size="sm"
                className="btn-icon rounded-circle"
                onClick={() => handleRejectClick(row.original.id)}
                title="Rechazar"
              >
                <TbX className="fs-lg" />
              </Button>
            </>
          )}
          <Button
            variant="default"
            size="sm"
            className="btn-icon rounded-circle"
            onClick={() => {
              toggleDeleteModal()
              setSelectedRowIds({ [row.id]: true })
            }}
          >
            <TbTrash className="fs-lg" />
          </Button>
        </div>
      ),
    },
  ]

  const [data, setData] = useState<AutorRequestType[]>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 })

  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({})

  useEffect(() => {
    console.log(
      '[AutorRequestsListing] useEffect - solicitudes:',
      solicitudes?.length,
      'mappedSolicitudes:',
      mappedSolicitudes.length,
    )
    setData(mappedSolicitudes)
    console.log('[AutorRequestsListing] Datos actualizados. Total:', mappedSolicitudes.length)
  }, [mappedSolicitudes, solicitudes])

  const table = useReactTable<AutorRequestType>({
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
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false)
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject'>('approve')
  const [pendingId, setPendingId] = useState<number | null>(null)

  const toggleDeleteModal = () => {
    setShowDeleteModal(!showDeleteModal)
  }

  const handleApproveClick = (id: number) => {
    setPendingId(id)
    setConfirmAction('approve')
    setShowConfirmModal(true)
  }

  const handleRejectClick = (id: number) => {
    setPendingId(id)
    setConfirmAction('reject')
    setShowConfirmModal(true)
  }

  const handleApprove = async () => {
    if (!pendingId) return
    
    try {
      console.log('[AutorRequestsListing] Aprobando solicitud:', pendingId)
      const response = await fetch(`/api/tienda/autores/${pendingId}`, {
        method: 'PUT',
        credentials: 'include', // Incluir cookies
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          estado_publicacion: 'publicado',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al aprobar la solicitud')
      }

      setData((old) =>
        old.map((item) => (item.id === pendingId ? { ...item, estado: 'aprobada' as const } : item)),
      )
      
      router.refresh()
    } catch (error: any) {
      console.error('Error al aprobar solicitud:', error)
      alert(error.message || 'Error al aprobar la solicitud')
    } finally {
      setPendingId(null)
    }
  }

  const handleReject = async () => {
    if (!pendingId) return
    
    try {
      console.log('[AutorRequestsListing] Rechazando solicitud:', pendingId)
      const response = await fetch(`/api/tienda/autores/${pendingId}`, {
        method: 'PUT',
        credentials: 'include', // Incluir cookies
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          estado_publicacion: 'pendiente',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al rechazar la solicitud')
      }

      setData((old) =>
        old.map((item) => (item.id === pendingId ? { ...item, estado: 'pendiente' as const } : item)),
      )
      
      router.refresh()
    } catch (error: any) {
      console.error('Error al rechazar solicitud:', error)
      alert(error.message || 'Error al rechazar la solicitud')
    } finally {
      setPendingId(null)
    }
  }

  const handleDelete = async () => {
    const selectedIds = Object.keys(selectedRowIds)
    const idsToDelete = selectedIds.map((id) => data[parseInt(id)]?.id).filter(Boolean)

    try {
      for (const solicitudId of idsToDelete) {
        const response = await fetch(`/api/tienda/autores/${solicitudId}`, {
          method: 'DELETE',
          credentials: 'include', // Incluir cookies
        })
        if (!response.ok) {
          throw new Error(`Error al eliminar solicitud ${solicitudId}`)
        }
      }

      setData((old) => old.filter((_, idx) => !selectedIds.includes(idx.toString())))
      setSelectedRowIds({})
      setPagination({ ...pagination, pageIndex: 0 })
      setShowDeleteModal(false)

      router.refresh()
    } catch (error) {
      console.error('Error al eliminar solicitudes:', error)
      alert('Error al eliminar las solicitudes seleccionadas')
    }
  }

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

  if (hasError && hasData) {
    console.warn(
      '[AutorRequestsListing] Error al cargar desde Strapi, usando datos disponibles:',
      error,
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
                  placeholder="Buscar solicitud de autor..."
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
                  value={(table.getColumn('tipo_autor')?.getFilterValue() as string) ?? 'All'}
                  onChange={(e) =>
                    table
                      .getColumn('tipo_autor')
                      ?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)
                  }
                >
                  <option value="All">Tipo</option>
                  <option value="Persona">Persona</option>
                  <option value="Organización">Organización</option>
                </select>
                <LuBox className="app-search-icon text-muted" />
              </div>

              <div className="app-search">
                <select
                  className="form-select form-control my-1 my-md-0"
                  value={(table.getColumn('estado')?.getFilterValue() as string) ?? 'All'}
                  onChange={(e) =>
                    table
                      .getColumn('estado')
                      ?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)
                  }
                >
                  <option value="All">Estado</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="aprobada">Aprobada</option>
                  <option value="rechazada">Rechazada</option>
                </select>
                <LuBox className="app-search-icon text-muted" />
              </div>

              <div>
                <select
                  className="form-select form-control my-1 my-md-0"
                  value={table.getState().pagination.pageSize}
                  onChange={(e) => table.setPageSize(Number(e.target.value))}
                >
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
              <Link href="/atributos/autores/agregar" passHref>
                <Button variant="danger" className="ms-1">
                  <TbPlus className="fs-sm me-2" /> Nueva Solicitud
                </Button>
              </Link>
            </div>
          </CardHeader>

          <DataTable<AutorRequestType>
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

          <ConfirmStatusModal
            show={showConfirmModal}
            onHide={() => {
              setShowConfirmModal(false)
              setPendingId(null)
            }}
            onConfirm={confirmAction === 'approve' ? handleApprove : handleReject}
            action={confirmAction}
            itemName="solicitud"
          />
        </Card>
      </Col>
    </Row>
  )
}

export default AutorRequestsListing

