'use client'
import { Button, Card, CardBody, CardFooter, CardHeader, Col, Container, OverlayTrigger, Row, Spinner, Tooltip, Alert } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { TbEdit, TbEye, TbPlus, TbTrash } from 'react-icons/tb'
import { LuArrowRight, LuDollarSign, LuSearch, LuShuffle } from 'react-icons/lu'
import {
  ColumnFiltersState,
  createColumnHelper,
  FilterFn,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { LeadType } from '@/app/(admin)/(apps)/crm/types'
import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { Row as TableRow, type Table as TableType } from '@tanstack/table-core'
import DataTable from '@/components/table/DataTable'
import TablePagination from '@/components/table/TablePagination'
import DeleteConfirmationModal from '@/components/table/DeleteConfirmationModal'
import { currency } from '@/helpers'
import { useToggle } from 'usehooks-ts'
import AddNewLeadModal from '@/app/(admin)/(apps)/crm/leads/components/AddNewLeadModal'
import EditLeadModal from '@/app/(admin)/(apps)/crm/leads/components/EditLeadModal'
import ConvertToOpportunityModal from '@/app/(admin)/(apps)/crm/leads/components/ConvertToOpportunityModal'
import { getLeads, type LeadsQuery } from './data'

const columnHelper = createColumnHelper<LeadType>()

const priceRangeFilterFn: FilterFn<any> = (row, columnId, value) => {
  const amount = row.getValue<number>(columnId)
  if (!value) return true
  if (value === '500000+') return amount > 500000
  const [min, max] = value.split('-').map(Number)
  return amount >= min && amount <= max
}

const Leads = () => {
  // Estados de datos
  const [leadsData, setLeadsData] = useState<LeadType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalRows, setTotalRows] = useState(0)
  
  // Estados de tabla
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 })
  const [filtroEtiqueta, setFiltroEtiqueta] = useState<string>('')
  const [filtroEstado, setFiltroEstado] = useState<string>('')
  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({})
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false)
  const [showDealModal, toggleDealModal] = useToggle(false)
  const [showEditModal, setShowEditModal] = useState<{ open: boolean; lead: LeadType | null }>({ open: false, lead: null })
  const [showConvertModal, setShowConvertModal] = useState(false)
  const [selectedLead, setSelectedLead] = useState<LeadType | null>(null)

  // Función para cargar leads
  const loadLeads = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const query: LeadsQuery = {
        page: pagination.pageIndex + 1, // Strapi usa página 1-indexed
        pageSize: pagination.pageSize,
        search: globalFilter || undefined,
        etiqueta: filtroEtiqueta || undefined,
        estado: filtroEstado || undefined,
      }
      
      const result = await getLeads(query)
      setLeadsData(result.leads)
      setTotalRows(result.pagination.total)
    } catch (err: any) {
      setError(err.message || 'Error al cargar leads')
    } finally {
      setLoading(false)
    }
  }, [pagination.pageIndex, pagination.pageSize, globalFilter, filtroEtiqueta, filtroEstado])

  const handleLeadCreated = () => {
    loadLeads()
  }

  const handleConvertToOpportunity = (lead: LeadType) => {
    setSelectedLead(lead)
    setShowConvertModal(true)
  }

  const handleConversionSuccess = () => {
    loadLeads()
    setShowConvertModal(false)
    setSelectedLead(null)
  }

  // Cargar datos cuando cambian los filtros o paginación
  useEffect(() => {
    loadLeads()
  }, [loadLeads])

  const columns = [
    {
      id: 'select',
      maxSize: 45,
      size: 45,
      header: ({ table }: { table: TableType<LeadType> }) => (
        <input
          type="checkbox"
          className="form-check-input form-check-input-light fs-14"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row }: { row: TableRow<LeadType> }) => (
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
      header: 'Lead Id',
    }),
    columnHelper.accessor('customer', {
      header: 'Customer',
    }),
    columnHelper.accessor('company', {
      header: 'Company',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="d-flex align-items-center">
          <div className="avatar-sm border flex-shrink-0 border-dashed rounded-circle me-2 justify-content-center d-flex align-items-center">
            <Image src={row.original.logo} alt="Product" height="20" />
          </div>
          <Link href="" className="link-reset">
            {row.original.company}
          </Link>
        </div>
      ),
    }),
    columnHelper.accessor('email', { header: 'Email' }),
    columnHelper.accessor('phone', { header: 'Phone' }),
    columnHelper.accessor('amount', {
      header: 'amount (usd)',
      enableColumnFilter: true,
      filterFn: priceRangeFilterFn,
      cell: ({ row }) => (
        <>
          {currency}
          {row.original.amount}
        </>
      ),
    }),
    columnHelper.accessor('tag', {
      header: 'Tags',
      cell: ({ row }) => (
        <span className={`badge badge-label bg-${row.original.tag.color}-subtle text-${row.original.tag.color}`}>{row.original.tag.label}</span>
      ),
    }),
    columnHelper.accessor('assigned', {
      header: 'Assigned',
      cell: ({ row }) =>
        <OverlayTrigger overlay={<Tooltip>{row.original.assigned.name}</Tooltip>}>
        <Image src={row.original.assigned.avatar} alt="Product" className="avatar-xs rounded-circle" />
      </OverlayTrigger>
      ,
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: ({ row }) => (
        <span className={`badge bg-${row.original.statusVariant}-subtle text-${row.original.statusVariant}`}>{row.original.status}</span>
      ),
    }),
    columnHelper.accessor('created', { header: 'Created' }),
      {
      header: 'Actions',
      cell: ({ row }: { row: TableRow<LeadType> }) => (
        <div className="d-flex  gap-1">
          <Button variant="default" size="sm" className="btn-icon">
            <TbEye className="fs-lg" />
          </Button>
          <Button 
            variant="default" 
            size="sm" 
            className="btn-icon"
            onClick={() => setShowEditModal({ open: true, lead: row.original })}>
            <TbEdit className="fs-lg" />
          </Button>
          <OverlayTrigger overlay={<Tooltip>Convertir a Oportunidad</Tooltip>}>
            <Button
              variant="success"
              size="sm"
              className="btn-icon"
              onClick={() => handleConvertToOpportunity(row.original)}>
              <LuArrowRight className="fs-lg" />
            </Button>
          </OverlayTrigger>
          <Button
            variant="default"
            size="sm"
            className="btn-icon"
            onClick={() => {
              setShowDeleteModal(true)
              setSelectedRowIds({ [row.id]: true })
            }}>
            <TbTrash className="fs-lg" />
          </Button>
        </div>
      ),
    },
  ]

  const table = useReactTable({
    data: leadsData,
    columns,
    pageCount: Math.ceil(totalRows / pagination.pageSize),
    state: { sorting, globalFilter, columnFilters, pagination, rowSelection: selectedRowIds },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setSelectedRowIds,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true, // Paginación del servidor
    globalFilterFn: 'includesString',
    enableColumnFilters: true,
    enableRowSelection: true,
    filterFns: {
      priceRange: priceRangeFilterFn,
    },
  })

  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const start = pageIndex * pageSize + 1
  const end = Math.min(start + pageSize - 1, totalRows)

  const toggleDeleteModal = () => {
    setShowDeleteModal(!showDeleteModal)
  }

  const handleDelete = async () => {
    const selectedIds = Object.keys(selectedRowIds)
    try {
      // Eliminar cada lead seleccionado
      for (const rowId of selectedIds) {
        const lead = leadsData[parseInt(rowId)]
        if (lead) {
          // Usar realId si está disponible, sino limpiar el id formateado
          const cleanId = lead.realId 
            ? lead.realId.replace(/^#LD/, '').replace(/^#/, '')
            : lead.id.replace(/^#LD/, '').replace(/^#/, '')
          
          const response = await fetch(`/api/crm/leads/${cleanId}`, {
            method: 'DELETE',
          })
          
          const result = await response.json()
          if (!response.ok || !result.success) {
            throw new Error(result.error || 'Error al eliminar lead')
          }
        }
      }
      // Recargar leads
      await loadLeads()
      setSelectedRowIds({})
      setShowDeleteModal(false)
    } catch (err: any) {
      setError(err.message || 'Error al eliminar leads')
    }
  }

  if (loading && leadsData.length === 0) {
    return (
      <Container fluid>
        <PageBreadcrumb 
          title={'Leads'} 
          subtitle={'CRM'} 
          infoText="Los Leads son posibles clientes o contactos interesados en tus productos o servicios. Aquí puedes gestionar leads potenciales, clasificarlos por etiqueta (Cold Lead, Prospect, Hot Lead), asignarlos a colaboradores, y convertirlos en Oportunidades cuando estén listos para avanzar en el proceso de venta."
        />
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2 text-muted">Cargando leads...</p>
        </div>
      </Container>
    )
  }
  return (
    <Container fluid>
        <PageBreadcrumb 
          title={'Leads'} 
          subtitle={'CRM'} 
          infoText="Los Leads son posibles clientes o contactos interesados en tus productos o servicios. Aquí puedes gestionar leads potenciales, clasificarlos por etiqueta (Cold Lead, Prospect, Hot Lead), asignarlos a colaboradores, y convertirlos en Oportunidades cuando estén listos para avanzar en el proceso de venta."
        />

      {error && (
        <Alert variant="warning" className="mb-3">
          <strong>Advertencia:</strong> {error}
        </Alert>
      )}

      <Row>
        <Col xs={12}>
          <Card>
            <CardHeader className="border-light justify-content-between">
              <div className="d-flex gap-2">
                <div className="app-search">
                  <input
                    type="search"
                    className="form-control"
                    placeholder="Buscar leads..."
                    value={globalFilter ?? ''}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                  />
                  <LuSearch className="app-search-icon text-muted" />
                </div>
                <Button variant="primary" onClick={toggleDealModal}>
                  <TbPlus className="me-1" /> Nuevo Lead
                </Button>
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
                    value={filtroEtiqueta}
                    onChange={(e) => setFiltroEtiqueta(e.target.value)}>
                    <option value="">Todas las Etiquetas</option>
                    <option value="baja">Cold Lead</option>
                    <option value="media">Prospect</option>
                    <option value="alta">Hot Lead</option>
                  </select>
                  <LuShuffle className="app-search-icon text-muted" />
                </div>

                <div className="app-search">
                  <select
                    className="form-select form-control my-1 my-md-0"
                    value={filtroEstado}
                    onChange={(e) => setFiltroEstado(e.target.value)}>
                    <option value="">Todos los Estados</option>
                    <option value="in-progress">In Progress</option>
                    <option value="proposal-sent">Proposal Sent</option>
                    <option value="follow-up">Follow Up</option>
                    <option value="pending">Pending</option>
                    <option value="negotiation">Negotiation</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <LuShuffle className="app-search-icon text-muted" />
                </div>

                <div className="app-search">
                  <select
                    value={(table.getColumn('amount')?.getFilterValue() as string) ?? 'All'}
                    onChange={(e) => table.getColumn('amount')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)}
                    className="form-select form-control my-1 my-md-0">
                    <option value="All">Amount Range</option>
                    <option value="0-100000">$0 - $100000</option>
                    <option value="100001-250000">$100001 - $250000</option>
                    <option value="250001-500000">$250001 - $500000</option>
                    <option value="500000+">$500000+</option>
                  </select>
                  <LuDollarSign className="app-search-icon text-muted" />
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
            </CardHeader>

            <CardBody className="p-0">
              <DataTable<LeadType> table={table} emptyMessage="No records found" />
            </CardBody>

            {table.getRowModel().rows.length > 0 && (
              <CardFooter className="border-0">
                <TablePagination
                  totalItems={totalRows}
                  start={start}
                  end={end}
                  itemsName="leads"
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
              itemName="lead"
            />

            <AddNewLeadModal show={showDealModal} toggleModal={toggleDealModal} onLeadCreated={handleLeadCreated} />
            
            <EditLeadModal
              show={showEditModal.open}
              onHide={() => setShowEditModal({ open: false, lead: null })}
              lead={showEditModal.lead}
              onSuccess={() => {
                setShowEditModal({ open: false, lead: null })
                loadLeads()
              }}
            />
            
            <ConvertToOpportunityModal
              show={showConvertModal}
              onHide={() => {
                setShowConvertModal(false)
                setSelectedLead(null)
              }}
              lead={selectedLead}
              onSuccess={handleConversionSuccess}
            />
          </Card>
        </Col>
      </Row>
    </Container>
  )
}

export default Leads
