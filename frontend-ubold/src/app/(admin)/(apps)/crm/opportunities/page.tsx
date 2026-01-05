'use client'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { CardBody, CardFooter, Col, Row, Spinner } from 'react-bootstrap'
import {
  ColumnFiltersState,
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { OpportunitiesType } from '@/app/(admin)/(apps)/crm/types'
import Image from 'next/image'
import Link from 'next/link'
import { toPascalCase } from '@/helpers/casing'
import { useState, useEffect, useCallback } from 'react'
import clsx from 'clsx'
import { getOpportunities, type OpportunitiesQuery } from './data'
import { LuCircleAlert, LuSearch, LuShuffle, LuPlus } from 'react-icons/lu'
import { LiaCheckCircle } from 'react-icons/lia'
import DataTable from '@/components/table/DataTable'
import TablePagination from '@/components/table/TablePagination'
import AddOpportunityModal from './components/AddOpportunityModal'
import { Button } from 'react-bootstrap'

const columnHelper = createColumnHelper<OpportunitiesType>()

const Opportunities = () => {
  // Estados de datos
  const [opportunitiesData, setOpportunitiesData] = useState<OpportunitiesType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalRows, setTotalRows] = useState(0)
  
  // Estados de tabla
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 })
  const [filtroStage, setFiltroStage] = useState<string>('')
  const [filtroStatus, setFiltroStatus] = useState<string>('')
  const [filtroPriority, setFiltroPriority] = useState<string>('')
  const [addModal, setAddModal] = useState(false)

  // Función para cargar oportunidades
  const loadOpportunities = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const query: OpportunitiesQuery = {
        page: pagination.pageIndex + 1, // Strapi usa página 1-indexed
        pageSize: pagination.pageSize,
        search: globalFilter || undefined,
        stage: filtroStage || undefined,
        status: filtroStatus || undefined,
        priority: filtroPriority || undefined,
      }
      
      const result = await getOpportunities(query)
      setOpportunitiesData(result.opportunities)
      setTotalRows(result.pagination.total)
    } catch (err: any) {
      console.error('Error loading opportunities:', err)
      setError(err.message || 'Error al cargar oportunidades')
    } finally {
      setLoading(false)
    }
  }, [pagination.pageIndex, pagination.pageSize, globalFilter, filtroStage, filtroStatus, filtroPriority])

  const handleOpportunityCreated = () => {
    loadOpportunities()
  }

  // Cargar datos cuando cambian los filtros o paginación
  useEffect(() => {
    loadOpportunities()
  }, [loadOpportunities])

  const columns = [
    columnHelper.accessor('id', { header: 'ID' }),
    columnHelper.accessor('productBy', {
      header: 'Oportunidad',
      enableSorting:false,
      cell: ({ row }) => (
        <div className="d-flex align-items-center">
          <div className="avatar-sm border flex-shrink-0 border-dashed rounded me-2 justify-content-center d-flex align-items-center">
            <Image src={row.original.productLogo} alt="Producto" height="20" />
          </div>
          <div>
            <p className="mb-0 fw-medium">
              <Link href="" className="link-reset">
                {row.original.productName}
              </Link>
            </p>
            <p className="text-muted mb-0 small">Por: {row.original.productBy}</p>
          </div>
        </div>
      ),
    }),
    columnHelper.accessor('customerName', {
      header: 'Contacto',
      enableSorting:false,
      cell: ({ row }) => (
        <div className="d-flex align-items-center">
          <div className="avatar-sm me-2">
            <Image src={row.original.customerAvatar} alt="Contacto" className="img-fluid rounded-circle" />
          </div>
          <div>
            <p className="mb-0 fw-medium">
              <Link data-sort="product" href="" className="link-reset">
                {row.original.customerName}
              </Link>
            </p>
            <p className="text-muted mb-0 small">{row.original.customerEmail}</p>
          </div>
        </div>
      ),
    }),
    columnHelper.accessor('stage', { header: 'Etapa', enableColumnFilter: true }),

    columnHelper.accessor('amount', { header: 'Valor (USD)' }),
    columnHelper.accessor('closeDate', { header: 'Fecha de Cierre' }),
    columnHelper.accessor('source', { header: 'Origen' }),
    columnHelper.accessor('owner', { header: 'Propietario', enableSorting:false, }),

    columnHelper.accessor('status', {
      header: 'Estado',
      filterFn: 'equalsString',
      enableColumnFilter: true,
      cell: ({ row }) => {
        const statusLabels: Record<string, string> = {
          'open': 'Abierto',
          'in-progress': 'En Progreso',
          'closed': 'Cerrado'
        }
        return (
          <span
            className={clsx(
              'badge badge-label  fs-xs',
              row.original.status == 'closed'
                ? 'badge-soft-danger'
                : row.original.status == 'in-progress'
                  ? 'badge-soft-warning'
                  : 'badge-soft-success',
            )}>
            {statusLabels[row.original.status] || toPascalCase(row.original.status)}
          </span>
        )
      },
    }),
    columnHelper.accessor('priority', {
      header: 'Prioridad',
      filterFn: 'equalsString',
      enableColumnFilter: true,
      cell: ({ row }) => {
        const priorityLabels: Record<string, string> = {
          'low': 'Baja',
          'medium': 'Media',
          'high': 'Alta'
        }
        return (
          <span
            className={clsx(
              'badge fs-xs',
              row.original.priority == 'low' ? 'text-bg-danger' : row.original.priority == 'medium' ? 'text-bg-warning' : 'text-bg-success',
            )}>
            {priorityLabels[row.original.priority] || toPascalCase(row.original.priority)}
          </span>
        )
      },
    }),
  ]

  const table = useReactTable({
    data: opportunitiesData,
    columns,
    pageCount: Math.ceil(totalRows / pagination.pageSize),
    state: { sorting, globalFilter, columnFilters, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true, // Paginación del servidor
    globalFilterFn: 'includesString',
    enableColumnFilters: true,
  })

  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const start = pageIndex * pageSize + 1
  const end = Math.min(start + pageSize - 1, totalRows)

  if (loading && opportunitiesData.length === 0) {
    return (
      <div className="container-fluid">
        <PageBreadcrumb title={'Oportunidades'} subtitle={'CRM'} />
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2 text-muted">Cargando oportunidades...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container-fluid">
      <PageBreadcrumb title={'Oportunidades'} subtitle={'CRM'} />

      {error && (
        <div className="alert alert-warning" role="alert">
          <strong>Advertencia:</strong> {error}
          <div className="mt-2">
            <small>
              Si el content-type "Oportunidad" no existe en Strapi, necesitas crearlo primero con los siguientes campos:
              <ul className="mt-2 mb-0">
                <li><code>nombre</code> (Text)</li>
                <li><code>descripcion</code> (Text/Rich Text)</li>
                <li><code>monto</code> (Number)</li>
                <li><code>moneda</code> (Enum: USD, CLP, etc.)</li>
                <li><code>etapa</code> (Enum: Qualification, Proposal Sent, Negotiation, Won, Lost)</li>
                <li><code>estado</code> (Enum: open, in-progress, closed)</li>
                <li><code>prioridad</code> (Enum: low, medium, high)</li>
                <li><code>fecha_cierre</code> (Date)</li>
                <li><code>fuente</code> (Text)</li>
                <li><code>activo</code> (Boolean)</li>
                <li>Relaciones: <code>producto</code>, <code>contacto</code> (Persona), <code>propietario</code> (Intranet-colaboradores)</li>
              </ul>
            </small>
          </div>
        </div>
      )}

      <Row>
        <Col xs={12}>
          <div data-table data-table-rows-per-page="8" className="card">
            <div className="card-header border-light justify-content-between">
              <div className="d-flex gap-2">
                <div className="app-search">
                  <input
                    data-table-search
                    type="search"
                    className="form-control"
                    placeholder="Buscar oportunidad..."
                    value={globalFilter ?? ''}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                  />
                  <LuSearch className="app-search-icon text-muted" />
                </div>
                <Button 
                  variant="primary" 
                  className="d-flex align-items-center gap-1"
                  onClick={() => setAddModal(true)}
                >
                  <LuPlus size={18} />
                  Agregar Oportunidad
                </Button>
              </div>

              <div className="d-flex align-items-center gap-2">
                <span className="me-2 fw-semibold">Filtrar por:</span>

                <div className="app-search">
                  <select
                    value={filtroStage}
                    onChange={(e) => setFiltroStage(e.target.value)}
                    className="form-select form-control my-1 my-md-0">
                    <option value="">Todas las Etapas</option>
                    <option value="Qualification">Calificación</option>
                    <option value="Proposal Sent">Propuesta Enviada</option>
                    <option value="Negotiation">Negociación</option>
                    <option value="Won">Ganada</option>
                    <option value="Lost">Perdida</option>
                  </select>
                  <LuShuffle className="app-search-icon text-muted" />
                </div>

                <div className="app-search">
                  <select
                    value={filtroStatus}
                    onChange={(e) => setFiltroStatus(e.target.value)}
                    className="form-select form-control my-1 my-md-0">
                    <option value="">Todos los Estados</option>
                    <option value="open">Abierto</option>
                    <option value="in-progress">En Progreso</option>
                    <option value="closed">Cerrado</option>
                  </select>
                  <LiaCheckCircle className="app-search-icon text-muted" />
                </div>

                <div className="app-search">
                  <select
                    value={filtroPriority}
                    onChange={(e) => setFiltroPriority(e.target.value)}
                    className="form-select form-control my-1 my-md-0">
                    <option value="">Todas las Prioridades</option>
                    <option value="high">Alta</option>
                    <option value="medium">Media</option>
                    <option value="low">Baja</option>
                  </select>
                  <LuCircleAlert className="app-search-icon text-muted" />
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
            </div>

            <CardBody className="p-0">
              <DataTable<OpportunitiesType> table={table} emptyMessage="No se encontraron oportunidades" />
            </CardBody>

            {table.getRowModel().rows.length > 0 && (
              <CardFooter className="border-0">
                <TablePagination
                  totalItems={totalRows}
                  start={start}
                  end={end}
                  itemsName="Oportunidades"
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
          </div>
        </Col>
      </Row>

      {/* Modal de agregar oportunidad */}
      <AddOpportunityModal
        show={addModal}
        onHide={() => setAddModal(false)}
        onSuccess={handleOpportunityCreated}
      />
    </div>
  )
}

export default Opportunities
