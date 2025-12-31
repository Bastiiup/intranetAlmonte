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
import { LuSearch, LuUser, LuCalendar } from 'react-icons/lu'
import { TbEye } from 'react-icons/tb'
import DataTable from '@/components/table/DataTable'
import TablePagination from '@/components/table/TablePagination'

interface PersonaType {
  id: string
  nombre_completo: string
  rut?: string
  nombres?: string
  primer_apellido?: string
  segundo_apellido?: string
  genero?: string
  cumpleagno?: string
  activo?: boolean
  createdAt?: string
}

const columnHelper = createColumnHelper<PersonaType>()

const PersonasListing = ({ personas, error }: { personas: any[]; error: string | null }) => {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'createdAt', desc: true } // Ordenar por más recientes primero
  ])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  // Mapear datos de Strapi al formato esperado
  const mappedPersonas: PersonaType[] = useMemo(() => {
    if (!personas || !Array.isArray(personas)) return []
    
    return personas.map((persona: any) => {
      const attrs = persona.attributes || {}
      const data = Object.keys(attrs).length > 0 ? attrs : persona
      
      // Construir nombre completo si no existe
      let nombreCompleto = data.nombre_completo || data.NOMBRE_COMPLETO || ''
      if (!nombreCompleto) {
        const nombres = data.nombres || data.NOMBRES || ''
        const primerApellido = data.primer_apellido || data.PRIMER_APELLIDO || ''
        const segundoApellido = data.segundo_apellido || data.SEGUNDO_APELLIDO || ''
        nombreCompleto = [nombres, primerApellido, segundoApellido].filter(Boolean).join(' ') || 'Sin nombre'
      }
      
      return {
        id: persona.id?.toString() || '',
        nombre_completo: nombreCompleto,
        rut: data.rut || data.RUT || '',
        nombres: data.nombres || data.NOMBRES || '',
        primer_apellido: data.primer_apellido || data.PRIMER_APELLIDO || '',
        segundo_apellido: data.segundo_apellido || data.SEGUNDO_APELLIDO || '',
        genero: data.genero || data.GENERO || '',
        cumpleagno: data.cumpleagno || data.CUMPLEAGNO || '',
        activo: data.activo !== undefined ? data.activo : true,
        createdAt: data.createdAt || persona.createdAt || '',
      }
    })
  }, [personas])

  const columns = useMemo<ColumnDef<PersonaType>[]>(
    () => [
      columnHelper.accessor('nombre_completo', {
        header: 'NOMBRE COMPLETO',
        cell: ({ row }) => {
          const nombre = row.original.nombre_completo
          return (
            <div className="d-flex align-items-center">
              <LuUser className="me-2 text-muted" size={18} />
              <h5 className="mb-0">
                <Link href={`/crm/personas/${row.original.id}`} className="link-reset fw-semibold">
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
      columnHelper.accessor('genero', {
        header: 'GÉNERO',
        cell: ({ getValue }) => {
          const genero = getValue()
          if (!genero) return <span className="text-muted">-</span>
          return <span>{genero === 'M' ? 'Masculino' : genero === 'F' ? 'Femenino' : genero}</span>
        },
      }),
      columnHelper.accessor('cumpleagno', {
        header: 'FECHA DE NACIMIENTO',
        cell: ({ row }) => {
          const cumpleagno = row.original.cumpleagno
          return cumpleagno ? (
            <div className="d-flex align-items-center">
              <LuCalendar className="me-1 text-muted" size={16} />
              <span>{cumpleagno}</span>
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
            <Link href={`/crm/personas/${row.original.id}`} passHref>
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
    data: mappedPersonas,
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
        <h4 className="mb-0">Listado de Personas</h4>
        <div className="d-flex gap-2" style={{ maxWidth: '400px', width: '100%' }}>
          <div className="app-search">
            <input
              type="search"
              className="form-control"
              placeholder="Buscar por nombre o RUT..."
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
            itemsName="personas"
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

export default PersonasListing

