'use client'
import {
  ColumnFiltersState,
  createColumnHelper,
  FilterFn,
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
import { Button, Card, CardFooter, CardHeader, Alert } from 'react-bootstrap'
import { LuCalendar, LuCreditCard, LuSearch, LuTruck } from 'react-icons/lu'
import { TbEye, TbPointFilled } from 'react-icons/tb'

import { orders, OrderType } from '@/app/(admin)/(apps)/(ecommerce)/orders/data'
import DataTable from '@/components/table/DataTable'
import DeleteConfirmationModal from '@/components/table/DeleteConfirmationModal'
import TablePagination from '@/components/table/TablePagination'
import { currency } from '@/helpers'

// Función para traducir estados al español
const translatePaymentStatus = (status: string): string => {
  const translations: Record<string, string> = {
    paid: 'Pagado',
    pending: 'Pendiente',
    failed: 'Fallido',
    refunded: 'Reembolsado',
  }
  return translations[status] || status
}

const translateOrderStatus = (status: string): string => {
  const translations: Record<string, string> = {
    delivered: 'Entregado',
    processing: 'Procesando',
    cancelled: 'Cancelado',
    shipped: 'Enviado',
  }
  return translations[status] || status
}
import { format } from 'date-fns'
import user1 from '@/assets/images/users/user-1.jpg'
import visa from '@/assets/images/cards/visa.svg'

// Avatar y método de pago por defecto
const defaultAvatar = user1
const defaultPaymentMethod = visa

// Función para mapear pedidos de WooCommerce al formato OrderType
const mapWooCommerceOrderToOrderType = (pedido: any): OrderType => {
  // Usar el ID numérico de WooCommerce para el link (necesario para la API)
  // Pero mostrar el number en la UI si existe
  const displayId = pedido.number || pedido.id?.toString() || 'N/A'
  const id = pedido.id?.toString() || displayId // ID numérico para la URL
  
  // Parsear fecha
  const dateCreated = pedido.date_created ? new Date(pedido.date_created) : new Date()
  const date = format(dateCreated, 'dd MMM, yyyy')
  const time = format(dateCreated, 'h:mm a')
  
  // Información del cliente
  const customerName = `${pedido.billing?.first_name || ''} ${pedido.billing?.last_name || ''}`.trim() || 'Cliente sin nombre'
  const customerEmail = pedido.billing?.email || 'Sin email'
  
  // Monto
  const amount = parseFloat(pedido.total || '0')
  
  // Estado de pago (mapear estados de WooCommerce)
  let paymentStatus: 'paid' | 'pending' | 'failed' | 'refunded' = 'pending'
  if (pedido.date_paid) {
    paymentStatus = 'paid'
  } else if (pedido.status === 'refunded' || pedido.status === 'cancelled') {
    paymentStatus = pedido.status === 'refunded' ? 'refunded' : 'failed'
  }
  
  // Estado del pedido (mapear estados de WooCommerce)
  let orderStatus: 'delivered' | 'processing' | 'cancelled' | 'shipped' = 'processing'
  const wcStatus = pedido.status?.toLowerCase() || ''
  if (wcStatus === 'completed' || wcStatus === 'delivered') {
    orderStatus = 'delivered'
  } else if (wcStatus === 'shipped' || wcStatus === 'on-hold') {
    orderStatus = 'shipped'
  } else if (wcStatus === 'cancelled' || wcStatus === 'refunded') {
    orderStatus = 'cancelled'
  } else {
    orderStatus = 'processing'
  }
  
  // Método de pago
  const paymentMethodTitle = pedido.payment_method_title || pedido.payment_method || 'Otro'
  const paymentMethodType = paymentMethodTitle.toLowerCase().includes('card') || 
                           paymentMethodTitle.toLowerCase().includes('tarjeta') ? 'card' : 'other'
  
  return {
    id, // ID numérico de WooCommerce para usar en la URL
    date,
    time,
    customer: {
      name: customerName,
      avatar: defaultAvatar,
      email: customerEmail,
    },
    amount,
    paymentStatus,
    orderStatus,
    paymentMethod: {
      type: paymentMethodType,
      image: defaultPaymentMethod,
      ...(paymentMethodType === 'card' && { cardNumber: 'xxxx 0000' }),
    },
  }
}

interface OrdersListProps {
  pedidos?: any[]
  error?: string | null
}

const columnHelper = createColumnHelper<OrderType>()

const dateRangeFilterFn: FilterFn<any> = (row, columnId, selectedRange) => {
  if (!selectedRange || selectedRange === 'All') return true

  const text = row.getValue<string>(columnId)
  if (!text) return false

  const cellDate = new Date(text)
  if (isNaN(cellDate.getTime())) return false

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  let rangeStart, rangeEnd

  switch (selectedRange) {
    case 'Today':
      return cellDate >= startOfToday && cellDate < endOfToday
    case 'Last 7 Days':
      rangeStart = new Date(now)
      rangeStart.setDate(now.getDate() - 7)
      rangeEnd = endOfToday
      return cellDate >= rangeStart && cellDate < rangeEnd
    case 'Last 30 Days':
      rangeStart = new Date(now)
      rangeStart.setDate(now.getDate() - 30)
      rangeEnd = endOfToday
      return cellDate >= rangeStart && cellDate < rangeEnd
    case 'This Year':
      rangeStart = new Date(now.getFullYear(), 0, 1)
      rangeEnd = new Date(now.getFullYear() + 1, 0, 1)
      return cellDate >= rangeStart && cellDate < rangeEnd
    default:
      return true
  }
}

const OrdersList = ({ pedidos, error }: OrdersListProps = {}) => {
  const columns = [
    {
      id: 'select',
      header: ({ table }: { table: TableType<OrderType> }) => (
        <input
          type="checkbox"
          className="form-check-input form-check-input-light fs-14"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row }: { row: TableRow<OrderType> }) => (
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
      header: 'ID Pedido',
      cell: ({ row }) => {
        // El id en OrderType es el ID numérico de WooCommerce para el link
        // Pero podemos mostrar el number si está disponible
        const displayNumber = row.original.id
        return (
          <h5 className="fs-sm mb-0 fw-medium">
            <Link href={`/orders/${row.original.id}`} className="link-reset">
              #{displayNumber}
            </Link>
          </h5>
        )
      },
    }),
    columnHelper.accessor('date', {
      header: 'Fecha',
      filterFn: dateRangeFilterFn,
      enableColumnFilter: true,
      cell: ({ row }) => (
        <>
          {row.original.date} <small className="text-muted">{row.original.time}</small>
        </>
      ),
    }),
    columnHelper.accessor('customer', {
      header: 'Cliente',
      cell: ({ row }) => (
        <div className="d-flex justify-content-start align-items-center gap-2">
          <div className="avatar avatar-sm">
            <Image src={row.original.customer.avatar.src} alt="" height={32} width={32} className="img-fluid rounded-circle" />
          </div>
          <div>
            <h5 className="text-nowrap fs-base mb-0 lh-base">{row.original.customer.name}</h5>
            <p className="text-muted fs-xs mb-0">{row.original.customer.email}</p>
          </div>
        </div>
      ),
    }),
    columnHelper.accessor('amount', {
      header: 'Monto',
      cell: ({ row }) => (
        <>
          {currency}
          {row.original.amount}
        </>
      ),
    }),
    columnHelper.accessor('paymentStatus', {
      header: 'Estado de Pago',
      filterFn: 'equalsString',
      enableColumnFilter: true,
      cell: ({ row }) => (
        <span
          className={`fw-semibold text-${row.original.paymentStatus === 'paid' ? 'success' : row.original.paymentStatus === 'pending' ? 'warning' : 'danger'}`}>
          <TbPointFilled className="fs-sm" /> {translatePaymentStatus(row.original.paymentStatus)}
        </span>
      ),
    }),
    columnHelper.accessor('orderStatus', {
      header: 'Estado del Pedido',
      filterFn: 'equalsString',
      enableColumnFilter: true,
      cell: ({ row }) => (
        <span
          className={`badge fs-xxs badge-soft-${row.original.orderStatus === 'cancelled' ? 'danger' : row.original.orderStatus === 'processing' ? 'warning' : 'success'}`}>
          {translateOrderStatus(row.original.orderStatus)}
        </span>
      ),
    }),
    columnHelper.accessor('paymentMethod', {
      header: 'Método de Pago',
      cell: ({ row }) => (
        <>
          <Image src={row.original.paymentMethod.image} alt="" className="me-2" height={28} width={28} />{' '}
          {row.original.paymentMethod.type === 'card'
            ? row.original.paymentMethod.cardNumber
            : row.original.paymentMethod.type === 'upi'
              ? row.original.paymentMethod.upiId
              : row.original.paymentMethod.email}
        </>
      ),
    }),
    {
      header: 'Acciones',
      cell: ({ row }: { row: TableRow<OrderType> }) => (
        <div className="d-flex gap-1">
          <Link href={`/orders/${row.original.id}`}>
            <Button variant="default" size="sm" className="btn-icon rounded-circle">
              <TbEye className="fs-lg" />
            </Button>
          </Link>
        </div>
      ),
    },
  ]

  // Mapear pedidos de WooCommerce al formato OrderType si están disponibles
  const mappedOrders = useMemo(() => {
    if (pedidos && pedidos.length > 0) {
      console.log('[OrdersList] Pedidos recibidos:', pedidos.length)
      return pedidos.map(mapWooCommerceOrderToOrderType)
    }
    console.log('[OrdersList] No hay pedidos de WooCommerce, usando datos de ejemplo')
    return orders
  }, [pedidos])

  const [data, setData] = useState<OrderType[]>(() => mappedOrders)
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 })

  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({})

  // Actualizar datos cuando cambien los pedidos de WooCommerce
  useEffect(() => {
    setData(mappedOrders)
  }, [mappedOrders])

  const table = useReactTable({
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
    filterFns: {
      dateRange: dateRangeFilterFn,
    },
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
            <strong>Error al cargar pedidos desde WooCommerce:</strong> {error}
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
      <CardHeader className="border-light justify-content-between">
        <div className="d-flex gap-2">
          <div className="app-search">
            <input
              type="search"
              className="form-control"
              placeholder="Buscar pedido..."
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
          <span className="me-2 fw-semibold">Filter By:</span>

          <div className="app-search">
            <select
              className="form-select form-control my-1 my-md-0"
              value={(table.getColumn('paymentStatus')?.getFilterValue() as string) ?? 'All'}
              onChange={(e) => table.getColumn('paymentStatus')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)}>
              <option value="All">Estado de Pago</option>
              <option value="paid">Pagado</option>
              <option value="pending">Pendiente</option>
              <option value="failed">Fallido</option>
              <option value="refunded">Reembolsado</option>
            </select>
            <LuCreditCard className="app-search-icon text-muted" />
          </div>

          <div className="app-search">
            <select
              className="form-select form-control my-1 my-md-0"
              value={(table.getColumn('orderStatus')?.getFilterValue() as string) ?? 'All'}
              onChange={(e) => table.getColumn('orderStatus')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)}>
              <option value="All">Estado de Entrega</option>
              <option value="processing">Procesando</option>
              <option value="shipped">Enviado</option>
              <option value="delivered">Entregado</option>
              <option value="cancelled">Cancelado</option>
            </select>
            <LuTruck className="app-search-icon text-muted" />
          </div>

          <div className="app-search">
            <select
              className="form-select form-control my-1 my-md-0"
              value={(table.getColumn('date')?.getFilterValue() as string) ?? ''}
              onChange={(e) => table.getColumn('date')?.setFilterValue(e.target.value || undefined)}>
              <option value="All">Rango de Fechas</option>
              <option value="Today">Hoy</option>
              <option value="Last 7 Days">Últimos 7 Días</option>
              <option value="Last 30 Days">Últimos 30 Días</option>
              <option value="This Year">Este Año</option>
            </select>
            <LuCalendar className="app-search-icon text-muted" />
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

      <DataTable<OrderType> table={table} emptyMessage="No records found" />

      {table.getRowModel().rows.length > 0 && (
        <CardFooter className="border-0">
          <TablePagination
            totalItems={totalItems}
            start={start}
            end={end}
            itemsName="orders"
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
        itemName="orders"
      />
    </Card>
  )
}

export default OrdersList
