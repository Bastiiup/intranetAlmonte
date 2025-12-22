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
import Link from 'next/link'
import { useState, useMemo, useEffect } from 'react'
import { Button, Card, CardFooter, CardHeader, Dropdown, DropdownItem, DropdownMenu, DropdownToggle, Alert } from 'react-bootstrap'
import { LuDownload, LuPlus, LuSearch } from 'react-icons/lu'
import { TbChevronDown, TbEdit, TbEye, TbTrash } from 'react-icons/tb'

import { customers, CustomerType } from '@/app/(admin)/(apps)/(ecommerce)/customers/data'
import DataTable from '@/components/table/DataTable'
import DeleteConfirmationModal from '@/components/table/DeleteConfirmationModal'
import TablePagination from '@/components/table/TablePagination'
import { currency } from '@/helpers'
import { format } from 'date-fns'
import user1 from '@/assets/images/users/user-1.jpg'
import usFlag from '@/assets/images/flags/us.svg'

// Avatar por defecto
const defaultAvatar = user1
const defaultCountryFlag = usFlag

// Función para mapear clientes de WooCommerce al formato CustomerType
const mapWooCommerceCustomerToCustomerType = (cliente: any): CustomerType => {
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

  return {
    name,
    email,
    avatar: defaultAvatar,
    phone,
    country: countryName,
    countryFlag: defaultCountryFlag,
    joined: {
      date: joinedDate,
      time: joinedTime,
    },
    orders,
    totalSpends,
  }
}

interface CustomersCardProps {
  clientes?: any[]
  error?: string | null
}

const columnHelper = createColumnHelper<CustomerType>()

const CustomersCard = ({ clientes, error }: CustomersCardProps = {}) => {
  const columns = [
    {
      id: 'select',
      header: ({ table }: { table: TableType<CustomerType> }) => (
        <input
          type="checkbox"
          className="form-check-input form-check-input-light fs-14"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row }: { row: TableRow<CustomerType> }) => (
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
      cell: ({ row }) => (
        <div className="d-flex align-items-center gap-2">
          <div className="avatar avatar-sm">
            <Image src={row.original.avatar.src} alt="" height={32} width={32} className="img-fluid rounded-circle" />
          </div>
          <div>
            <h5 className="mb-0">
              <Link href="/users/profile" className="link-reset">
                {row.original.name}
              </Link>
            </h5>
          </div>
        </div>
      ),
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
      cell: ({ row }: { row: TableRow<CustomerType> }) => (
        <div className="d-flex  gap-1">
          <Button variant="default" size="sm" className="btn-icon rounded-circle">
            <TbEye className="fs-lg" />
          </Button>
          <Button variant="default" size="sm" className="btn-icon rounded-circle">
            <TbEdit className="fs-lg" />
          </Button>
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

  // Mapear clientes de WooCommerce al formato CustomerType si están disponibles
  const mappedCustomers = useMemo(() => {
    if (clientes && clientes.length > 0) {
      console.log('[CustomersCard] Clientes recibidos:', clientes.length)
      return clientes.map(mapWooCommerceCustomerToCustomerType)
    }
    console.log('[CustomersCard] No hay clientes de WooCommerce, usando datos de ejemplo')
    return customers
  }, [clientes])

  const [data, setData] = useState<CustomerType[]>(() => mappedCustomers)
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

  const handleDelete = () => {
    const selectedIds = new Set(Object.keys(selectedRowIds))
    setData((old) => old.filter((_, idx) => !selectedIds.has(idx.toString())))
    setSelectedRowIds({})
    setPagination({ ...pagination, pageIndex: 0 })
    setShowDeleteModal(false)
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

          <Button variant="primary">
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
        onHide={toggleDeleteModal}
        onConfirm={handleDelete}
        selectedCount={Object.keys(selectedRowIds).length}
        itemName="customers"
      />
    </Card>
  )
}

export default CustomersCard
