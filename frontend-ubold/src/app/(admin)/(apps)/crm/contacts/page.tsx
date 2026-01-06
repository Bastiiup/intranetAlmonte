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
import { Alert, Button, Card, CardBody, CardFooter, CardHeader, Col, Container, OverlayTrigger, Row, Spinner, Tooltip } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { TbEdit, TbEye, TbMail, TbPhone, TbWorld } from 'react-icons/tb'
import { LuSearch, LuShuffle, LuPlus } from 'react-icons/lu'
import { getContacts, type ContactsQuery } from './data'
import type { ContactType } from '@/app/(admin)/(apps)/crm/types'
import Image from 'next/image'
import Link from 'next/link'
import { generateInitials } from '@/helpers/casing'
import DataTable from '@/components/table/DataTable'
import TablePagination from '@/components/table/TablePagination'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import AddContactModal from './components/AddContactModal'
import EditContactModal from './components/EditContactModal'
import { useRouter } from 'next/navigation'

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
  const router = useRouter()
  // Estados de datos
  const [contactsData, setContactsData] = useState<ContactType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalRows, setTotalRows] = useState(0)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  
  // Estados de modales
  const [addModal, setAddModal] = useState(false)
  const [editModal, setEditModal] = useState<{ open: boolean; contact: ContactType | null }>({ open: false, contact: null })
  
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
      header: 'CONTACTO',
      cell: ({ row }) => {
        const contact = row.original
        return (
          <div className="d-flex align-items-center">
            {contact.avatar ? (
              <Image
                src={typeof contact.avatar === 'string' ? contact.avatar : contact.avatar}
                alt={contact.name}
                className="rounded-circle me-2"
                width="40"
                height="40"
              />
            ) : (
              <div className="avatar-sm rounded-circle me-2 flex-shrink-0 bg-secondary-subtle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                <span className="avatar-title text-secondary fw-semibold fs-12">
                  {generateInitials(contact.name)}
                </span>
              </div>
            )}
            <div>
              <div className="fw-medium mb-1">{contact.name}</div>
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
      header: 'INSTITUCIÓN',
      cell: ({ row }) => {
        const contact = row.original
        return (
          <div>
            {contact.empresa && (
              <div className="fw-medium mb-1">{contact.empresa}</div>
            )}
            {contact.dependencia && (
              <span className={`badge badge-soft-${contact.dependencia === 'Municipal' ? 'info' : contact.dependencia === 'Particular Subvencionado' ? 'info' : 'success'}`}>
                {contact.dependencia}
              </span>
            )}
            {!contact.empresa && !contact.dependencia && (
              <span className="text-muted">-</span>
            )}
          </div>
        )
      },
    },
    {
      id: 'ubicacion',
      header: 'UBICACIÓN',
      cell: ({ row }) => {
        const contact = row.original
        return (
          <div className="fs-xs">
            {contact.comuna && <div className="mb-1">{contact.comuna}</div>}
            {contact.region && <div className="text-muted mb-1">{contact.region}</div>}
            {contact.zona && (
              <span className="badge badge-soft-info">{contact.zona}</span>
            )}
            {!contact.comuna && !contact.region && !contact.zona && (
              <span className="text-muted">-</span>
            )}
          </div>
        )
      },
    },
    {
      id: 'datosColegio',
      header: 'DATOS COLEGIO',
      cell: ({ row }) => {
        const contact = row.original
        const telefonos = contact.telefonosColegio?.filter(t => t) || []
        const emails = contact.emailsColegio?.filter(e => e) || []
        return (
          <div className="fs-xs">
            {telefonos.length > 0 && (
              <div className="mb-1 d-flex align-items-center">
                <TbPhone className="me-1" size={12} />
                <span>{telefonos.join(', ')}</span>
              </div>
            )}
            {emails.length > 0 && (
              <div className="mb-1 d-flex align-items-center">
                <TbMail className="me-1" size={12} />
                <span>{emails.join(', ')}</span>
              </div>
            )}
            {contact.websiteColegio && (
              <div className="d-flex align-items-center">
                <TbWorld className="me-1" size={12} />
                <Link href={contact.websiteColegio} target="_blank" rel="noopener noreferrer" className="link-reset text-truncate" style={{ maxWidth: '150px' }}>
                  {contact.websiteColegio}
                </Link>
              </div>
            )}
            {telefonos.length === 0 && emails.length === 0 && !contact.websiteColegio && (
              <span className="text-muted">-</span>
            )}
          </div>
        )
      },
    },
    {
      id: 'contactoInfo',
      header: 'COMUNICACIÓN',
      cell: ({ row }) => {
        const contact = row.original
        return (
          <div className="fs-xs">
            {contact.email && (
              <div className="mb-1 d-flex align-items-center">
                <TbMail className="me-1" size={12} />
                <Link href={`mailto:${contact.email}`} className="link-reset">
                  {contact.email}
                </Link>
              </div>
            )}
            {contact.phone && (
              <div className="d-flex align-items-center">
                <TbPhone className="me-1" size={12} />
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
      header: 'REPRESENTANTE COMERCIAL',
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
      header: 'FECHA / ORIGEN',
      cell: ({ row }) => {
        const contact = row.original
        const isNew = contact.createdAt && 
          (Date.now() - new Date(contact.createdAt).getTime()) <= 7 * 24 * 60 * 60 * 1000
        
        const daysAgo = contact.createdAt 
          ? Math.floor((Date.now() - new Date(contact.createdAt).getTime()) / (24 * 60 * 60 * 1000))
          : null
        
        const origenLabel = contact.origen 
          ? ORIGENES.find(o => o.value === contact.origen)?.label || contact.origen
          : null
        
        return (
          <div className="fs-xs">
            {isNew && (
              <span className="badge bg-success-subtle text-success mb-1 d-block" style={{ width: 'fit-content' }}>Nuevo</span>
            )}
            {daysAgo !== null && (
              <div className={isNew ? '' : 'mb-1'}>
                {daysAgo === 0 ? 'Hoy' : daysAgo === 1 ? '1 día' : `${daysAgo} días`}
              </div>
            )}
            {origenLabel && (
              <span className="badge badge-soft-primary">{origenLabel}</span>
            )}
            {!contact.createdAt && !contact.origen && (
              <span className="text-muted">-</span>
            )}
          </div>
        )
      },
    },
    {
      id: 'label',
      header: 'ETIQUETA',
      cell: ({ row }) => {
        const contact = row.original
        const variantMap: Record<string, string> = {
          'success': 'bg-success-subtle text-success',
          'warning': 'bg-warning-subtle text-warning',
          'info': 'bg-info-subtle text-info',
        }
        return (
          <span className={`badge ${variantMap[contact.label.variant] || 'badge-soft-secondary'}`}>
            {contact.label.text}
          </span>
        )
      },
    },
    {
      id: 'categories',
      header: 'CATEGORÍAS',
      cell: ({ row }) => {
        const contact = row.original
        return (
          <div className="d-flex flex-wrap gap-1">
            {contact.categories && contact.categories.length > 0 ? (
              contact.categories.map((category, idx) => (
                <span
                  key={idx}
                  className={`badge badge-soft-${category.variant || 'primary'}`}
                >
                  {category.name}
                </span>
              ))
            ) : (
              <span className="text-muted">-</span>
            )}
          </div>
        )
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="d-flex gap-1">
          <Button 
            variant="default" 
            size="sm" 
            className="btn-icon"
            onClick={() => setEditModal({ open: true, contact: row.original })}
          >
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
        <PageBreadcrumb 
        title={'Contactos'} 
        subtitle={'CRM'} 
        infoText="Los Contactos son personas o instituciones con las que tu empresa tiene relación. Aquí puedes gestionar toda la información de contacto, incluyendo emails, teléfonos, direcciones y datos adicionales. Los contactos pueden estar relacionados con colegios, personas o ser independientes."
      />
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2 text-muted">Cargando contactos...</p>
        </div>
      </Container>
    )
  }

  return (
    <Container fluid>
      <PageBreadcrumb 
        title={'Contactos'} 
        subtitle={'CRM'} 
        infoText="Los Contactos son personas o instituciones con las que tu empresa tiene relación. Aquí puedes gestionar toda la información de contacto, incluyendo emails, teléfonos, direcciones y datos adicionales. Los contactos pueden estar relacionados con colegios, personas o ser independientes."
      />

      {successMessage && (
        <Alert variant="success" dismissible onClose={() => setSuccessMessage(null)} className="mb-3">
          {successMessage}
        </Alert>
      )}
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-3">
          <strong>Error:</strong> {error}
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
                    placeholder="Buscar contacto..."
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
                  Agregar Contacto
                </Button>
              </div>

              <div className="d-flex align-items-center gap-2">
                <span className="me-2 fw-semibold">Filtrar por:</span>

                <div className="app-search">
                  <select
                    className="form-select form-control my-1 my-md-0"
                    value=""
                    onChange={(e) => {}}
                  >
                    <option value="">Comuna</option>
                  </select>
                  <LuShuffle className="app-search-icon text-muted" />
                </div>

                <div className="app-search">
                  <select
                    className="form-select form-control my-1 my-md-0"
                    value=""
                    onChange={(e) => {}}
                  >
                    <option value="">Región</option>
                  </select>
                  <LuShuffle className="app-search-icon text-muted" />
                </div>

                <div className="app-search">
                  <select
                    className="form-select form-control my-1 my-md-0"
                    value=""
                    onChange={(e) => {}}
                  >
                    <option value="">Cargo</option>
                  </select>
                  <LuShuffle className="app-search-icon text-muted" />
                </div>

                <div className="app-search">
                  <select
                    className="form-select form-control my-1 my-md-0"
                    value={filtroConfianza}
                    onChange={(e) => setFiltroConfianza(e.target.value)}
                  >
                    <option value="">Etiqueta</option>
                    {CONFIANZA.filter(c => c.value).map((conf) => (
                      <option key={conf.value} value={conf.value}>
                        {conf.label}
                      </option>
                    ))}
                  </select>
                  <LuShuffle className="app-search-icon text-muted" />
                </div>

                <div className="app-search">
                  <select
                    className="form-select form-control my-1 my-md-0"
                    value={filtroOrigen}
                    onChange={(e) => setFiltroOrigen(e.target.value)}
                  >
                    <option value="">Categoría</option>
                    {ORIGENES.filter(o => o.value).map((origen) => (
                      <option key={origen.value} value={origen.value}>
                        {origen.label}
                      </option>
                    ))}
                  </select>
                  <LuShuffle className="app-search-icon text-muted" />
                </div>

                <Button variant="primary" className="btn-icon">
                  <LuShuffle size={18} />
                </Button>

                <Button variant="primary" className="btn-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  </svg>
                </Button>
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

      {/* Modales */}
      <AddContactModal
        show={addModal}
        onHide={() => setAddModal(false)}
        onSuccess={() => {
          setAddModal(false)
          // Forzar recarga de datos
          setTimeout(() => {
            router.refresh()
            loadContacts()
          }, 500)
        }}
      />

      <EditContactModal
        show={editModal.open}
        onHide={() => setEditModal({ open: false, contact: null })}
        contact={editModal.contact}
        onSuccess={() => {
          setEditModal({ open: false, contact: null })
          router.refresh()
          loadContacts()
        }}
      />
    </Container>
  )
}

export default Contacts
