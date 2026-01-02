'use client'
import Link from 'next/link'
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardTitle,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownToggle,
  Image,
} from 'react-bootstrap'
import { TbCircleFilled, TbDotsVertical, TbFileExport, TbPlus } from 'react-icons/tb'

import TablePagination from '@/components/table/TablePagination'
import type { DashboardOrder } from '../lib/getDashboardData'

// Tipo compatible con OrderType pero usando DashboardOrder
type OrderType = Omit<DashboardOrder, 'userImage'> & {
  userImage?: string | { src: string }
}
import {
  ColumnFiltersState,
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useState } from 'react'
import DataTable from '@/components/table/DataTable'

const columnHelper = createColumnHelper<OrderType>()

// Helper para obtener la URL de la imagen del usuario
function getUserImageSrc(userImage: string | { src: string } | undefined, userName: string): string {
  if (userImage) {
    if (typeof userImage === 'string') return userImage
    if (typeof userImage === 'object' && userImage !== null && 'src' in userImage) {
      return userImage.src
    }
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=random&size=128`
}

interface RecentOrdersProps {
  orders?: OrderType[]
}

const RecentOrders = ({ orders: propsOrders }: RecentOrdersProps) => {
  // Usar pedidos de props o datos estáticos como fallback
  const defaultOrders: OrderType[] = []
  const ordersToUse = propsOrders && propsOrders.length > 0 ? propsOrders : defaultOrders
  const columns = [
    columnHelper.accessor('userName', {
      cell: ({ row }) => {
        const imageSrc = getUserImageSrc(row.original.userImage, row.original.userName)
        return (
          <div className="d-flex align-items-center">
            <Image src={imageSrc} className="avatar-sm rounded-circle me-2" alt={row.original.userName} />
            <div>
              <span className="text-muted fs-xs">{row.original.userName}</span>
              <h5 className="fs-base mb-0">
                <Link href={`/orders/${row.original.id.replace('ORD-', '')}`} className="text-body">
                  #{row.original.id}
                </Link>
              </h5>
            </div>
          </div>
        )
      },
    }),
    columnHelper.accessor('product', {
      cell: ({ row }) => (
        <>
          <span className="text-muted fs-xs">Product</span>
          <h5 className="fs-base mb-0 fw-normal">{row.original.product}</h5>
        </>
      ),
    }),
    columnHelper.accessor('date', {
      cell: ({ row }) => (
        <>
          <span className="text-muted fs-xs">Date</span>
          <h5 className="fs-base mb-0 fw-normal">{row.original.date}</h5>
        </>
      ),
    }),
    columnHelper.accessor('amount', {
      cell: ({ row }) => (
        <>
          <span className="text-muted fs-xs">Amount</span>
          <h5 className="fs-base mb-0 fw-normal">{row.original.amount}</h5>
        </>
      ),
    }),
    columnHelper.accessor('status', {
      cell: ({ row }) => (
        <>
          <span className="text-muted fs-xs">Status</span>
          <h5 className="fs-base mb-0 fw-normal">
            <TbCircleFilled className={`fs-xs text-${row.original.statusVariant}`} /> {row.original.status}
          </h5>
        </>
      ),
    }),
    columnHelper.accessor('id', {
      cell: ({ row }) => (
        <Dropdown>
          <DropdownToggle as="button" className="bg-transparent border-transparent border-0 text-muted drop-arrow-none card-drop p-0">
            <TbDotsVertical className="fs-lg" />
          </DropdownToggle>
          <DropdownMenu align={'start'} className="dropdown-menu-end">
            <DropdownItem href="#">View Details</DropdownItem>
            <DropdownItem href="#">Cancel Order</DropdownItem>
          </DropdownMenu>
        </Dropdown>
      ),
    }),
  ]

  const [data, setData] = useState<OrderType[]>(() => [...ordersToUse])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 7 })

  const table = useReactTable({
    data,
    columns,
    state: { columnFilters, pagination },
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const totalItems = table.getFilteredRowModel().rows.length

  const start = pageIndex * pageSize + 1
  const end = Math.min(start + pageSize - 1, totalItems)
  return (
    <Card>
      <CardHeader className="justify-content-between align-items-center border-dashed">
        <CardTitle as="h4" className="mb-0">
          Recent Orders
        </CardTitle>
        <div className="d-flex gap-2">
          <Button variant="soft-secondary" size="sm">
            <TbPlus className="me-1" /> Add Order
          </Button>
          <Button variant="primary" size="sm">
            <TbFileExport className="me-1" /> Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardBody className="p-0">
        <DataTable<OrderType> table={table} emptyMessage="No records found" showHeaders={false} />
      </CardBody>
      {table.getRowModel().rows.length > 0 && (
        <CardFooter className="border-0">
          <TablePagination
            totalItems={totalItems}
            start={start}
            end={end}
            className={'pagination-sm'}
            showInfo
            itemsName="orders"
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
  )
}

export default RecentOrders
