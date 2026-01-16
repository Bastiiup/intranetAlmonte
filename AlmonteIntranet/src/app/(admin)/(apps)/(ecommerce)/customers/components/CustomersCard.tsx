'use client'

import {
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
import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, CardFooter, CardHeader, Dropdown, DropdownItem, DropdownMenu, DropdownToggle, Alert, Modal } from 'react-bootstrap'
import { LuDownload, LuPlus, LuSearch } from 'react-icons/lu'
import { TbChevronDown, TbEdit, TbTrash } from 'react-icons/tb'

import { customers, CustomerType } from '@/app/(admin)/(apps)/(ecommerce)/customers/data'
import DataTable from '@/components/table/DataTable'
import DeleteConfirmationModal from '@/components/table/DeleteConfirmationModal'
import TablePagination from '@/components/table/TablePagination'
import EditClienteModal from '@/app/(admin)/(apps)/(ecommerce)/clientes/components/EditClienteModal'
import AddClienteForm from '@/app/(admin)/(apps)/(ecommerce)/clientes/components/AddClienteForm'
import { currency } from '@/helpers'
import { format } from 'date-fns'
import Link from 'next/link'
import user1 from '@/assets/images/users/user-1.jpg'
import usFlag from '@/assets/images/flags/us.svg'
import { StaticImageData } from 'next/image'

// Avatar por defecto
const defaultAvatar = user1
const defaultCountryFlag = usFlag

// Extender CustomerType para incluir datos de WooCommerce
type ExtendedCustomerType = CustomerType & {
  id?: number
  woocommerce_id?: number | string
  correo_electronico?: string
  telefono?: string
}

// Función para mapear clientes de WooCommerce al formato CustomerType
const mapWooCommerceCustomerToCustomerType = (cliente: any): ExtendedCustomerType => {
  const name = `${cliente.first_name || ''} ${cliente.last_name || ''}`.trim() || 'Sin nombre'
  const email = cliente.email || 'Sin email'
  const phone = cliente.billing?.phone || cliente.phone || 'Sin teléfono'
  const country = cliente.billing?.country || 'CL'
  
  // Mapear país a nombre completo y flag (simplificado, usar CL por defecto)
  const countryName = country === 'CL' ? 'Chile' : country
  
  // Parsear fecha de creación
  const dateCreated = cliente.date_created ? new Date(cliente.date_created) : new Date()
  const joinedDate = format(dateCreated, 'dd MMM, yyyy')
  const joinedTime = format(dateCreated, 'h:mm a')
  
  // Obtener orders_count y total_spent de WooCommerce
  const orders = cliente.orders_count || 0
  const totalSpends = parseFloat(cliente.total_spent || '0')

  // Extraer teléfono real (sin el texto "Sin teléfono")
  const telefonoReal = phone === 'Sin teléfono' ? '' : phone

  return {
    name,
    email,
    avatar: defaultAvatar as StaticImageData,
    phone,
    country: countryName,
    countryFlag: defaultCountryFlag as StaticImageData,
    joined: {
      date: joinedDate,
      time: joinedTime,
    },
    orders,
    totalSpends,
    id: cliente.id,
    woocommerce_id: cliente.id,
    correo_electronico: email,
    telefono: telefonoReal,
  }
}

interface CustomersCardProps {
  clientes?: any[]
  error?: string | null
}

const columnHelper = createColumnHelper<ExtendedCustomerType>()

const CustomersCard = ({ clientes, error }: CustomersCardProps = {}) => {
  const router = useRouter()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedCliente, setSelectedCliente] = useState<ExtendedCustomerType | null>(null)
  const [deleting, setDeleting] = useState(false)
  const columns = [
    {
      id: 'select',
      header: ({ table }: { table: TableType<ExtendedCustomerType> }) => (
        <input
          type="checkbox"
          className="form-check-input form-check-input-light fs-14"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row }: { row: TableRow<ExtendedCustomerType> }) => (
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
      header: 'Nombre del Cliente',
      cell: ({ row }) => {
        const clienteId = row.original.id || row.original.woocommerce_id
        return (
          <div className="d-flex align-items-center gap-2">
            <div className="avatar avatar-sm">
              <Image src={row.original.avatar.src} alt="" height={32} width={32} className="img-fluid rounded-circle" />
            </div>
            <div>
              <h5 className="mb-0">
                {clienteId ? (
                  <Link 
                    href={`/clientes/${clienteId}`}
                    className="text-reset hover-underline"
                    title="Ver detalle del cliente"
                  >
                    {row.original.name}
                  </Link>
                ) : (
                  row.original.name
                )}
              </h5>
            </div>
          </div>
        )
      },
    }),
    columnHelper.accessor('email', { header: 'Email' }),
    columnHelper.accessor('phone', { header: 'Teléfono' }),
    columnHelper.accessor('country', {
      header: 'País',
      cell: ({ row }) => (
        <>
          <Image src={row.original.countryFlag.src} alt="" className="rounded-circle me-1" height={16} width={16} /> {row.original.country}
        </>
      ),
    }),
    columnHelper.accessor('joined.date', {
      header: 'Fecha de Registro',
      cell: ({ row }) => (
        <>
          {row.original.joined.date} <small className="text-muted">{row.original.joined.time}</small>
        </>
      ),
    }),
    columnHelper.accessor('orders', { header: 'Pedidos' }),
    columnHelper.accessor('totalSpends', {
      header: 'Total Gastado',
      cell: ({ row }) => (
        <>
          {currency}
          {row.original.totalSpends}
        </>
      ),
    }),
    {
      header: 'Acciones',
      cell: ({ row }: { row: TableRow<ExtendedCustomerType> }) => (
        <div className="d-flex gap-1">
          <Button
            variant="default"
            size="sm"
            className="btn-icon rounded-circle"
            onClick={() => {
              setSelectedCliente(row.original)
              setShowEditModal(true)
            }}>
            <TbEdit className="fs-lg" />
          </Button>
          <Button
            variant="default"
            size="sm"
            className="btn-icon rounded-circle"
            onClick={() => {
              setSelectedCliente(row.original)
              toggleDeleteModal()
            }}>
            <TbTrash className="fs-lg" />
          </Button>
        </div>
      ),
    },
  ]

  // Mapear clientes de WooCommerce al formato CustomerType si están disponibles
  const mappedCustomers = useMemo(() => {
    if (clientes && clientes.length > 0) {
      console.log('[CustomersCard] Clientes recibidos:', clientes.length)
      return clientes.map(mapWooCommerceCustomerToCustomerType)
    }
    console.log('[CustomersCard] No hay clientes de WooCommerce, usando datos de ejemplo')
    return customers
  }, [clientes])

  const [data, setData] = useState<ExtendedCustomerType[]>(() => mappedCustomers)
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 })

  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({})

  // Actualizar datos cuando cambien los clientes de WooCommerce
  useEffect(() => {
    setData(mappedCustomers)
  }, [mappedCustomers])

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, pagination, rowSelection: selectedRowIds },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
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
    if (!selectedCliente) return

    setDeleting(true)
    try {
      // Usar ID o email como identificador
      const identifier = selectedCliente.id || selectedCliente.email
      if (!identifier) {
        throw new Error('No se puede eliminar: el cliente no tiene ID ni email')
      }

      const response = await fetch(`/api/woocommerce/customers/${identifier}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al eliminar el cliente')
      }

      // Refrescar la página para actualizar la lista
      router.refresh()
      setSelectedCliente(null)
      setShowDeleteModal(false)
    } catch (err: any) {
      console.error('Error al eliminar cliente:', err)
      alert(err.message || 'Error al eliminar el cliente')
    } finally {
      setDeleting(false)
    }
  }

  const handleEditSave = () => {
    // Refrescar la página después de editar
    router.refresh()
  }

  // Si hay error, mostrarlo
  if (error) {
    return (
      <Card>
        <CardHeader>
          <Alert variant="danger">
            <strong>Error al cargar clientes desde WooCommerce:</strong> {error}
            <br />
            <small>
              Verifica que:
              <ul className="mb-0 mt-2">
                <li>WOOCOMMERCE_CONSUMER_KEY y WOOCOMMERCE_CONSUMER_SECRET estén configurados</li>
                <li>El servidor de WooCommerce esté disponible</li>
              </ul>
            </small>
          </Alert>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="border-light d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div className="d-flex gap-2">
          <div className="app-search">
            <input
              type="search"
              className="form-control"
              placeholder="Buscar cliente..."
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
            />
            <LuSearch className="app-search-icon text-muted" />
          </div>
          {Object.keys(selectedRowIds).length > 0 && (
            <Button variant="danger" size="sm" onClick={toggleDeleteModal}>
              Delete
            </Button>
          )}
        </div>
        <div className="d-flex align-items-center gap-2">
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

          <Dropdown align="end">
            <DropdownToggle className="btn-default drop-arrow-none">
              <LuDownload className="me-1" /> Export <TbChevronDown className="align-middle ms-1" />
            </DropdownToggle>
            <DropdownMenu>
              <DropdownItem>Export as PDF</DropdownItem>
              <DropdownItem>Export as CSV</DropdownItem>
              <DropdownItem>Export as Excel</DropdownItem>
            </DropdownMenu>
          </Dropdown>

          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            <LuPlus className="fs-sm me-1" /> Agregar Cliente
          </Button>
        </div>
      </CardHeader>
      <DataTable<CustomerType> table={table} emptyMessage="No records found" />

      {table.getRowModel().rows.length > 0 && (
        <CardFooter className="border-0">
          <TablePagination
            totalItems={totalItems}
            start={start}
            end={end}
            itemsName="customers"
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
        onHide={() => {
          toggleDeleteModal()
          setSelectedCliente(null)
        }}
        onConfirm={handleDelete}
        selectedCount={selectedCliente ? 1 : 0}
        itemName="cliente"
      />

      {/* Modal para crear cliente */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Agregar Cliente</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <AddClienteForm
            showCard={false}
            onSave={() => {
              setShowCreateModal(false)
              router.refresh()
            }}
            onCancel={() => setShowCreateModal(false)}
          />
        </Modal.Body>
      </Modal>

      {/* Modal para editar cliente */}
      {selectedCliente && (
        <EditClienteModal
          show={showEditModal}
          onHide={() => {
            setShowEditModal(false)
            setSelectedCliente(null)
          }}
          cliente={{
            id: selectedCliente.id || 0,
            woocommerce_id: selectedCliente.woocommerce_id,
            nombre: selectedCliente.name,
            correo_electronico: selectedCliente.correo_electronico || selectedCliente.email,
            telefono: selectedCliente.telefono || (selectedCliente.phone && selectedCliente.phone !== 'Sin teléfono' ? selectedCliente.phone : ''),
          }}
          onSave={handleEditSave}
        />
      )}
    </Card>
  )
}

export default CustomersCard
