'use client'

import {
  ColumnDef,
  ColumnFiltersState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  Row as TableRow,
  Table as TableType,
  useReactTable,
} from '@tanstack/react-table'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useMemo } from 'react'
import { Button, Card, CardFooter, CardHeader, Col, Row, Alert, Badge } from 'react-bootstrap'
import { LuSearch, LuFileText, LuEye, LuArrowLeft } from 'react-icons/lu'

import DataTable from '@/components/table/DataTable'
import TablePagination from '@/components/table/TablePagination'

interface CursoType {
  id: number | string
  documentId?: string
  nombre: string
  nivel: string
  grado: number
  año: number
  pdf_id?: number | string
  pdf_url?: string
  cantidadProductos: number
  cantidadVersiones: number
  matriculados?: number
  updatedAt?: string
}

interface CursosColegioListingProps {
  colegio: any
  cursos: any[]
  error: string | null
}

export default function CursosColegioListing({ colegio, cursos: cursosProp, error }: CursosColegioListingProps) {
  const router = useRouter()

  const mappedCursos = useMemo(() => {
    if (!cursosProp || !Array.isArray(cursosProp)) return []
    
    return cursosProp.map((curso: any) => ({
      id: curso.id || curso.documentId,
      documentId: curso.documentId || String(curso.id || ''),
      nombre: curso.nombre || '',
      nivel: curso.nivel || 'Basica',
      grado: curso.grado || 1,
      año: curso.año || curso.ano || new Date().getFullYear(),
      pdf_id: curso.pdf_id || undefined,
      pdf_url: curso.pdf_url || undefined,
      cantidadProductos: curso.cantidadProductos || 0,
      cantidadVersiones: curso.cantidadVersiones || 0,
      matriculados: curso.matriculados || 0,
      updatedAt: curso.updatedAt || null,
    } as CursoType))
  }, [cursosProp])

  const columns: ColumnDef<CursoType, any>[] = [
    {
      id: 'curso',
      header: 'CURSO',
      accessorKey: 'nombre',
      enableSorting: true,
      cell: ({ row }) => (
        <div>
          <h6 className="mb-0 fw-bold">{row.original.nombre || 'Sin nombre'}</h6>
          <small className="text-muted">
            {row.original.nivel} - {row.original.grado}° - {row.original.año}
          </small>
        </div>
      ),
    },
    {
      id: 'productos',
      header: 'PRODUCTOS',
      accessorKey: 'cantidadProductos',
      enableSorting: true,
      cell: ({ row }) => {
        const cantidad = row.original.cantidadProductos || 0
        if (cantidad > 0) {
          return (
            <Badge bg="success" className="fs-13">
              {cantidad} {cantidad === 1 ? 'producto' : 'productos'}
            </Badge>
          )
        }
        return <Badge bg="secondary">Sin productos</Badge>
      },
    },
    {
      id: 'versiones',
      header: 'VERSIONES',
      accessorKey: 'cantidadVersiones',
      enableSorting: true,
      cell: ({ row }) => {
        const cantidad = row.original.cantidadVersiones || 0
        if (cantidad > 0) {
          return (
            <Badge bg="info" className="fs-13">
              {cantidad} {cantidad === 1 ? 'versión' : 'versiones'}
            </Badge>
          )
        }
        return <Badge bg="secondary">0</Badge>
      },
    },
    {
      id: 'pdf',
      header: 'PDF',
      cell: ({ row }) => {
        if (row.original.pdf_id) {
          return (
            <Badge bg="success">
              <LuFileText className="me-1" size={14} />
              Disponible
            </Badge>
          )
        }
        return <Badge bg="secondary">Sin PDF</Badge>
      },
    },
    {
      id: 'matriculados',
      header: 'MATRICULADOS',
      accessorKey: 'matriculados',
      enableSorting: true,
      cell: ({ row }) => {
        const cantidad = row.original.matriculados || 0
        if (cantidad > 0) {
          return (
            <Badge bg="warning" text="dark" className="fs-13">
              {cantidad.toLocaleString('es-CL')} estudiantes
            </Badge>
          )
        }
        return <Badge bg="secondary">Sin datos</Badge>
      },
    },
    {
      id: 'acciones',
      header: 'ACCIONES',
      cell: ({ row }) => {
        const cursoId = row.original.documentId || row.original.id
        
        return (
          <div className="d-flex gap-1">
            <Link href={`/crm/listas/${cursoId}/validacion`}>
              <Button
                variant="primary"
                size="sm"
                title="Ver validación"
              >
                <LuEye className="me-1" />
                Ver Validación
              </Button>
            </Link>
          </div>
        )
      },
    },
  ]

  const [data, setData] = useState<CursoType[]>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'curso', desc: false },
  ])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 })

  useEffect(() => {
    setData(mappedCursos)
  }, [mappedCursos])

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  if (error) {
    return (
      <Alert variant="danger">
        <h5>Error al cargar cursos</h5>
        <p>{error}</p>
      </Alert>
    )
  }

  if (!colegio) {
    return (
      <Alert variant="warning">
        <h5>Colegio no encontrado</h5>
        <p>No se pudo cargar la información del colegio</p>
      </Alert>
    )
  }

  return (
    <>
      <Row>
        <Col lg={12}>
          <Card>
            <CardHeader className="d-flex justify-content-between align-items-center">
              <div>
                <h4 className="mb-2">{colegio.nombre}</h4>
                <div className="text-muted">
                  <span className="me-3">RBD: {colegio.rbd}</span>
                  {colegio.comuna && <span className="me-3">• {colegio.comuna}</span>}
                  {colegio.region && <span>• {colegio.region}</span>}
                </div>
                {colegio.total_matriculados > 0 && (
                  <Badge bg="warning" text="dark" className="mt-2">
                    {colegio.total_matriculados.toLocaleString('es-CL')} estudiantes matriculados
                  </Badge>
                )}
              </div>
              <Button
                variant="outline-secondary"
                onClick={() => router.back()}
              >
                <LuArrowLeft className="me-2" />
                Volver
              </Button>
            </CardHeader>

            <Card.Body>
              <Row className="mb-3">
                <Col sm={12} md={6}>
                  <div className="app-search position-relative">
                    <input
                      type="search"
                      className="form-control"
                      placeholder="Buscar curso..."
                      value={globalFilter ?? ''}
                      onChange={(e) => setGlobalFilter(e.target.value)}
                    />
                    <span className="mdi mdi-magnify search-icon"></span>
                  </div>
                </Col>
                <Col sm={12} md={6} className="d-flex justify-content-end align-items-center gap-2">
                  <div>
                    <select
                      className="form-select form-control"
                      value={table.getState().pagination.pageSize}
                      onChange={(e) => table.setPageSize(Number(e.target.value))}>
                      {[10, 25, 50, 100].map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </div>
                </Col>
              </Row>

              {data.length === 0 ? (
                <div className="text-center py-5">
                  <p className="text-muted">No se encontraron cursos con listas para este colegio</p>
                </div>
              ) : (
                <>
                  <DataTable table={table} />
                  <CardFooter className="border-top py-3">
                    <TablePagination table={table} />
                  </CardFooter>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  )
}
