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
  useReactTable,
} from '@tanstack/react-table'
import Link from 'next/link'
import { useState, useMemo } from 'react'
import { Button, Card, CardBody, CardFooter, CardHeader, Alert } from 'react-bootstrap'
import { LuSearch, LuMapPin, LuPhone, LuMail } from 'react-icons/lu'
import { TbEye } from 'react-icons/tb'
import DataTable from '@/components/table/DataTable'
import TablePagination from '@/components/table/TablePagination'

interface ColegioType {
  id: string
  nombre: string
  rut?: string
  direccion?: string
  comuna?: string
  region?: string
  telefono?: string
  email?: string
  activo?: boolean
  createdAt?: string
}

const columnHelper = createColumnHelper<ColegioType>()

const ColegiosListing = ({ colegios, error }: { colegios: any[]; error: string | null }) => {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'createdAt', desc: true } // Ordenar por más recientes primero
  ])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  // Mapear datos de Strapi al formato esperado
  const mappedColegios: ColegioType[] = useMemo(() => {
    if (!colegios || !Array.isArray(colegios)) return []
    
    return colegios.map((colegio: any) => {
      const attrs = colegio.attributes || {}
      const data = Object.keys(attrs).length > 0 ? attrs : colegio
      
      return {
        id: colegio.id?.toString() || '',
        nombre: data.nombre || data.NOMBRE || 'Sin nombre',
        rut: data.rut || data.RUT || '',
        direccion: data.direccion || data.DIRECCION || '',
        comuna: data.comuna?.nombre || data.comuna?.NOMBRE || data.comuna || data.COMUNA || '',
        region: data.region || data.REGION || '',
        telefono: data.telefono || data.TELEFONO || '',
        email: data.email || data.EMAIL || '',
        activo: data.activo !== undefined ? data.activo : true,
        createdAt: data.createdAt || colegio.createdAt || '',
      }
    })
  }, [colegios])

  const columns = useMemo<ColumnDef<ColegioType>[]>(
    () => [
      columnHelper.accessor('nombre', {
        header: 'NOMBRE',
        cell: ({ row }) => {
          const nombre = row.original.nombre
          return (
            <div>
              <h5 className="mb-0">
                <Link href={`/crm/colegios/${row.original.id}`} className="link-reset fw-semibold">
                  {nombre}
                </Link>
              </h5>
            </div>
          )
        },
      }),
      columnHelper.accessor('rut', {
        header: 'RUT',
        cell: ({ getValue }) => getValue() || <span className="text-muted">-</span>,
      }),
      columnHelper.accessor('direccion', {
        header: 'DIRECCIÓN',
        cell: ({ row }) => {
          const direccion = row.original.direccion
          const comuna = row.original.comuna
          return (
            <div className="d-flex align-items-center">
              <LuMapPin className="me-1 text-muted" size={16} />
              <span>
                {direccion || '-'}
                {comuna && `, ${comuna}`}
              </span>
            </div>
          )
        },
      }),
      columnHelper.accessor('telefono', {
        header: 'TELÉFONO',
        cell: ({ row }) => {
          const telefono = row.original.telefono
          return telefono ? (
            <div className="d-flex align-items-center">
              <LuPhone className="me-1 text-muted" size={16} />
              <span>{telefono}</span>
            </div>
          ) : (
            <span className="text-muted">-</span>
          )
        },
      }),
      columnHelper.accessor('email', {
        header: 'EMAIL',
        cell: ({ row }) => {
          const email = row.original.email
          return email ? (
            <div className="d-flex align-items-center">
              <LuMail className="me-1 text-muted" size={16} />
              <span>{email}</span>
            </div>
          ) : (
            <span className="text-muted">-</span>
          )
        },
      }),
      columnHelper.accessor('activo', {
        header: 'ESTADO',
        cell: ({ getValue }) => {
          const activo = getValue()
          return (
            <span className={`badge badge-soft-${activo ? 'success' : 'danger'}`}>
              {activo ? 'Activo' : 'Inactivo'}
            </span>
          )
        },
      }),
      {
        header: 'ACCIONES',
        cell: ({ row }) => (
          <div className="d-flex gap-1">
            <Link href={`/crm/colegios/${row.original.id}`} passHref>
              <Button variant="default" size="sm" className="btn-icon rounded-circle" title="Ver detalle">
                <TbEye className="fs-lg" />
              </Button>
            </Link>
          </div>
        ),
      },
    ],
    []
  )

  const table = useReactTable({
    data: mappedColegios,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const totalItems = table.getFilteredRowModel().rows.length
  const start = pageIndex * pageSize + 1
  const end = Math.min(start + pageSize - 1, totalItems)

  if (error) {
    return (
      <Alert variant="danger">
        <strong>Error:</strong> {error}
      </Alert>
    )
  }

  return (
    <Card>
      <CardHeader className="d-flex justify-content-between align-items-center">
        <h4 className="mb-0">Listado de Colegios</h4>
        <div className="d-flex gap-2" style={{ maxWidth: '400px', width: '100%' }}>
          <div className="app-search">
            <input
              type="search"
              className="form-control"
              placeholder="Buscar por nombre..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
            />
            <LuSearch className="app-search-icon text-muted" />
          </div>
        </div>
      </CardHeader>
      <CardBody>
        <DataTable table={table} />
      </CardBody>
      {table.getFilteredRowModel().rows.length > 0 && (
        <CardFooter className="border-0">
          <TablePagination
            totalItems={totalItems}
            start={start}
            end={end}
            itemsName="colegios"
            showInfo
            previousPage={table.previousPage}
            canPreviousPage={table.getCanPreviousPage()}
            pageCount={table.getPageCount()}
            pageIndex={pageIndex}
            setPageIndex={table.setPageIndex}
            nextPage={table.nextPage}
            canNextPage={table.getCanNextPage()}
          />
        </CardFooter>
      )}
    </Card>
  )
}

export default ColegiosListing

