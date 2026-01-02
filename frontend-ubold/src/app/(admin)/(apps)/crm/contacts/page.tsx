'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  ColumnDef,
  ColumnFiltersState,
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from '@tanstack/react-table'
import { Button, Card, CardBody, CardFooter, CardHeader, Col, Container, OverlayTrigger, Row, Spinner, Tooltip } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { TbEdit, TbEye, TbMail, TbPhone, TbWorld } from 'react-icons/tb'
import { LuSearch, LuShuffle } from 'react-icons/lu'
import { getContacts, type ContactsQuery } from './data'
import type { ContactType } from '@/app/(admin)/(apps)/crm/types'
import Image from 'next/image'
import Link from 'next/link'
import { generateInitials } from '@/helpers/casing'
import DataTable from '@/components/table/DataTable'
import TablePagination from '@/components/table/TablePagination'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const columnHelper = createColumnHelper<ContactType>()

const ORIGENES = [
  { value: '', label: 'Todos los orígenes' },
  { value: 'mineduc', label: 'MINEDUC' },
  { value: 'csv', label: 'CSV' },
  { value: 'manual', label: 'Manual' },
  { value: 'crm', label: 'CRM' },
  { value: 'web', label: 'Web' },
  { value: 'otro', label: 'Otro' },
]

const CONFIANZA = [
  { value: '', label: 'Todos' },
  { value: 'baja', label: 'Cold Lead' },
  { value: 'media', label: 'Prospect' },
  { value: 'alta', label: 'Hot Lead' },
]

const Contacts = () => {
  // Estados de datos
  const [contactsData, setContactsData] = useState<ContactType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalRows, setTotalRows] = useState(0)
  
  // Estados de tabla
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 })
  const [filtroOrigen, setFiltroOrigen] = useState<string>('')
  const [filtroConfianza, setFiltroConfianza] = useState<string>('')
  const [columnOrder, setColumnOrder] = useState<string[]>([
    'select',
    'contacto',
    'empresa',
    'ubicacion',
    'datosColegio',
    'contactoInfo',
    'representanteComercial',
    'fechaOrigen',
    'label',
    'categories',
    'actions',
  ])

  // Definición de columnas
  const columns = useMemo<ColumnDef<ContactType>[]>(() => [
    {
      id: 'select',
      maxSize: 45,
      size: 45,
      header: ({ table }) => (
        <input
          type="checkbox"
          className="form-check-input form-check-input-light fs-14"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row }) => (
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
      id: 'contacto',
      header: 'Contacto',
      cell: ({ row }) => {
        const contact = row.original
        return (
          <div className="d-flex align-items-center">
            {contact.avatar ? (
              <Image
                src={typeof contact.avatar === 'string' ? contact.avatar : contact.avatar}
                alt={contact.name}
                className="rounded-circle me-2"
                width="32"
                height="32"
              />
            ) : (
              <div className="avatar-sm rounded-circle me-2 flex-shrink-0 bg-primary-subtle d-flex align-items-center justify-content-center">
                <span className="avatar-title text-primary fw-semibold fs-12">
                  {generateInitials(contact.name)}
                </span>
              </div>
            )}
            <div>
              <div className="fw-medium">{contact.name}</div>
              {contact.cargo && (
                <div className="text-muted fs-xs">{contact.cargo}</div>
              )}
            </div>
          </div>
        )
      },
    },
    {
      id: 'empresa',
      header: 'Empresa',
      cell: ({ row }) => {
        const contact = row.original
        return (
          <div>
            {contact.empresa && (
              <div className="fw-medium">{contact.empresa}</div>
            )}
            {contact.dependencia && (
              <div className="text-muted fs-xs">{contact.dependencia}</div>
            )}
          </div>
        )
      },
    },
    {
      id: 'ubicacion',
      header: 'Ubicación',
      cell: ({ row }) => {
        const contact = row.original
        const parts = [
          contact.comuna,
          contact.region,
          contact.zona,
        ].filter(Boolean)
        return parts.length > 0 ? (
          <div className="fs-xs">
            {parts.join(', ')}
          </div>
        ) : (
          <span className="text-muted">-</span>
        )
      },
    },
    {
      id: 'datosColegio',
      header: 'Datos Colegio',
      cell: ({ row }) => {
        const contact = row.original
        return (
          <div className="fs-xs">
            {contact.telefonosColegio && contact.telefonosColegio.length > 0 && (
              <div className="d-flex align-items-center mb-1">
                <TbPhone className="me-1" size={14} />
                <span>{contact.telefonosColegio[0]}</span>
              </div>
            )}
            {contact.emailsColegio && contact.emailsColegio.length > 0 && (
              <div className="d-flex align-items-center mb-1">
                <TbMail className="me-1" size={14} />
                <span>{contact.emailsColegio[0]}</span>
              </div>
            )}
            {contact.websiteColegio && (
              <div className="d-flex align-items-center">
                <TbWorld className="me-1" size={14} />
                <Link href={contact.websiteColegio} target="_blank" rel="noopener noreferrer" className="link-reset">
                  {contact.websiteColegio}
                </Link>
              </div>
            )}
            {!contact.telefonosColegio?.length && !contact.emailsColegio?.length && !contact.websiteColegio && (
              <span className="text-muted">-</span>
            )}
          </div>
        )
      },
    },
    {
      id: 'contactoInfo',
      header: 'Contacto',
      cell: ({ row }) => {
        const contact = row.original
        return (
          <div className="fs-xs">
            {contact.email && (
              <div className="d-flex align-items-center mb-1">
                <TbMail className="me-1" size={14} />
                <Link href={`mailto:${contact.email}`} className="link-reset">
                  {contact.email}
                </Link>
              </div>
            )}
            {contact.phone && (
              <div className="d-flex align-items-center">
                <TbPhone className="me-1" size={14} />
                <Link href={`tel:${contact.phone}`} className="link-reset">
                  {contact.phone}
                </Link>
              </div>
            )}
            {!contact.email && !contact.phone && (
              <span className="text-muted">-</span>
            )}
          </div>
        )
      },
    },
    {
      id: 'representanteComercial',
      header: 'Representante Comercial',
      cell: ({ row }) => {
        const contact = row.original
        return contact.representanteComercial ? (
          <span>{contact.representanteComercial}</span>
        ) : (
          <span className="text-muted">-</span>
        )
      },
    },
    {
      id: 'fechaOrigen',
      header: 'Fecha / Origen',
      cell: ({ row }) => {
        const contact = row.original
        const isNew = contact.createdAt && 
          (Date.now() - new Date(contact.createdAt).getTime()) <= 7 * 24 * 60 * 60 * 1000
        return (
          <div>
            {contact.createdAt && (
              <div className="mb-1">
                {format(new Date(contact.createdAt), 'dd/MM/yyyy', { locale: es })}
                {isNew && (
                  <span className="badge bg-success-subtle text-success ms-1">Nuevo</span>
                )}
              </div>
            )}
            {contact.origen && (
              <div className="text-muted fs-xs">{ORIGENES.find(o => o.value === contact.origen)?.label || contact.origen}</div>
            )}
          </div>
        )
      },
    },
    {
      id: 'label',
      header: 'Label',
      cell: ({ row }) => {
        const contact = row.original
        return (
          <span className={`badge badge-label bg-${contact.label.variant}`}>
            {contact.label.text}
          </span>
        )
      },
    },
    {
      id: 'categories',
      header: 'Categorías',
      cell: ({ row }) => {
        const contact = row.original
        return (
          <div className="d-flex flex-wrap gap-1">
            {contact.categories.map((category, idx) => (
              <span
                key={idx}
                className={`badge ${category.variant === 'light' ? `text-bg-${category.variant}` : `badge-soft-${category.variant}`}`}
              >
                {category.name}
              </span>
            ))}
          </div>
        )
      },
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => (
        <div className="d-flex gap-1">
          <Button variant="default" size="sm" className="btn-icon">
            <TbEye className="fs-lg" />
          </Button>
          <Button variant="default" size="sm" className="btn-icon">
            <TbEdit className="fs-lg" />
          </Button>
        </div>
      ),
    },
  ], [])

  // Función para cargar contactos
  const loadContacts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const query: ContactsQuery = {
        page: pagination.pageIndex + 1, // Strapi usa página 1-indexed
        pageSize: pagination.pageSize,
        search: globalFilter || undefined,
        origin: filtroOrigen ? [filtroOrigen] : undefined,
        confidence: filtroConfianza || undefined,
      }
      
      const result = await getContacts(query)
      setContactsData(result.contacts)
      setTotalRows(result.pagination.total)
    } catch (err: any) {
      console.error('Error loading contacts:', err)
      setError(err.message || 'Error al cargar contactos')
    } finally {
      setLoading(false)
    }
  }, [pagination.pageIndex, pagination.pageSize, globalFilter, filtroOrigen, filtroConfianza])

  // Cargar datos cuando cambian los filtros o paginación
  useEffect(() => {
    loadContacts()
  }, [loadContacts])

  // Configuración de la tabla
  const table = useReactTable({
    data: contactsData,
    columns,
    pageCount: Math.ceil(totalRows / pagination.pageSize),
    state: {
      sorting,
      globalFilter,
      columnFilters,
      columnVisibility,
      pagination,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true, // Paginación del servidor
    globalFilterFn: 'includesString',
    enableColumnFilters: true,
    enableRowSelection: true,
  })

  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const start = pageIndex * pageSize + 1
  const end = Math.min(start + pageSize - 1, totalRows)

  if (loading && contactsData.length === 0) {
    return (
      <Container fluid>
        <PageBreadcrumb title={'Contacts'} subtitle={'CRM'} />
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2 text-muted">Cargando contactos...</p>
        </div>
      </Container>
    )
  }

  return (
    <Container fluid>
      <PageBreadcrumb title={'Contacts'} subtitle={'CRM'} />

      {error && (
        <div className="alert alert-danger" role="alert">
          <strong>Error:</strong> {error}
        </div>
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
                    placeholder="Buscar contactos..."
                    value={globalFilter ?? ''}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                  />
                  <LuSearch className="app-search-icon text-muted" />
                </div>
              </div>

              <div className="d-flex align-items-center gap-2">
                <span className="me-2 fw-semibold">Filtros:</span>

                <div className="app-search">
                  <select
                    className="form-select form-control my-1 my-md-0"
                    value={filtroOrigen}
                    onChange={(e) => setFiltroOrigen(e.target.value)}
                  >
                    {ORIGENES.map((origen) => (
                      <option key={origen.value} value={origen.value}>
                        {origen.label}
                      </option>
                    ))}
                  </select>
                  <LuShuffle className="app-search-icon text-muted" />
                </div>

                <div className="app-search">
                  <select
                    className="form-select form-control my-1 my-md-0"
                    value={filtroConfianza}
                    onChange={(e) => setFiltroConfianza(e.target.value)}
                  >
                    {CONFIANZA.map((conf) => (
                      <option key={conf.value} value={conf.value}>
                        {conf.label}
                      </option>
                    ))}
                  </select>
                  <LuShuffle className="app-search-icon text-muted" />
                </div>

                <div>
                  <select
                    className="form-select form-control my-1 my-md-0"
                    value={table.getState().pagination.pageSize}
                    onChange={(e) => table.setPageSize(Number(e.target.value))}
                  >
                    {[10, 25, 50, 100].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardHeader>

            <CardBody className="p-0">
              <DataTable<ContactType>
                table={table}
                emptyMessage="No se encontraron contactos"
                onColumnOrderChange={setColumnOrder}
              />
            </CardBody>

            {table.getRowModel().rows.length > 0 && (
              <CardFooter className="border-0">
                <TablePagination
                  totalItems={totalRows}
                  start={start}
                  end={end}
                  itemsName="contactos"
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
          </Card>
        </Col>
      </Row>
    </Container>
  )
}

export default Contacts
