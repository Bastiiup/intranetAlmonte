'use client'

import {
  ColumnDef,
  ColumnFiltersState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  RowSelectionState,
  Row as TableRow,
  Table as TableType,
  useReactTable,
} from '@tanstack/react-table'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useMemo } from 'react'
import { Button, Card, CardFooter, CardHeader, Col, Row, Alert, Badge } from 'react-bootstrap'
import { LuSearch, LuFileText, LuEye, LuArrowLeft, LuDownload, LuFileSpreadsheet, LuCheck, LuPencil, LuX } from 'react-icons/lu'

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
  estado_revision?: 'borrador' | 'revisado' | 'publicado' | null
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
      matriculados: curso.matricula || curso.matriculados || 0, // Usar "matricula" de Strapi
      updatedAt: curso.updatedAt || null,
      estado_revision: curso.estado_revision || null,
    } as CursoType))
  }, [cursosProp])

  // Calcular años únicos para el filtro
  const añosDisponibles = useMemo(() => {
    const años = new Set<number>()
    mappedCursos.forEach(curso => años.add(curso.año))
    return Array.from(años).sort((a, b) => b - a) // Orden descendente
  }, [mappedCursos])

  // Calcular niveles únicos para el filtro
  const nivelesDisponibles = useMemo(() => {
    const niveles = new Set<string>()
    mappedCursos.forEach(curso => niveles.add(curso.nivel))
    return Array.from(niveles).sort()
  }, [mappedCursos])

  const [data, setData] = useState<CursoType[]>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'año', desc: true }, // Ordenar por año descendente por defecto
  ])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 })
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [exportando, setExportando] = useState(false)
  const [filtroAño, setFiltroAño] = useState<string>('todos')
  const [filtroNivel, setFiltroNivel] = useState<string>('todos')

  const columns: ColumnDef<CursoType, any>[] = [
    {
      id: 'select',
      maxSize: 45,
      size: 45,
      header: ({ table }: { table: TableType<CursoType> }) => (
        <input
          type="checkbox"
          className="form-check-input form-check-input-light fs-14"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row }: { row: TableRow<CursoType> }) => (
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
      id: 'año',
      header: 'AÑO',
      accessorKey: 'año',
      enableSorting: true,
      cell: ({ row }) => (
        <Badge bg="primary" className="fs-13">
          {row.original.año}
        </Badge>
      ),
    },
    {
      id: 'nivel',
      header: 'NIVEL',
      accessorKey: 'nivel',
      enableSorting: true,
      cell: ({ row }) => (
        <Badge bg={row.original.nivel === 'Media' ? 'info' : 'success'} className="fs-13">
          {row.original.nivel}
        </Badge>
      ),
    },
    {
      id: 'curso',
      header: 'CURSO',
      accessorKey: 'nombre',
      enableSorting: true,
      cell: ({ row }) => (
        <div>
          <h6 className="mb-0 fw-bold">{row.original.nombre || 'Sin nombre'}</h6>
          <small className="text-muted">
            {row.original.grado}°
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
      id: 'estado',
      header: 'ESTADO',
      accessorKey: 'estado_revision',
      enableSorting: true,
      cell: ({ row }) => {
        const estado = row.original.estado_revision
        
        if (estado === 'publicado') {
          return (
            <Badge bg="success" className="fs-13">
              <LuCheck className="me-1" size={14} />
              ✓ Lista para Exportar
            </Badge>
          )
        } else if (estado === 'revisado') {
          return (
            <Badge bg="info" className="fs-13">
              <LuEye className="me-1" size={14} />
              En Revisión
            </Badge>
          )
        } else if (estado === 'borrador') {
          return (
            <Badge bg="warning" text="dark" className="fs-13">
              <LuPencil className="me-1" size={14} />
              Borrador
            </Badge>
          )
        } else {
          return (
            <Badge bg="secondary" className="fs-13">
              <LuX className="me-1" size={14} />
              Sin Validar
            </Badge>
          )
        }
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

  useEffect(() => {
    let cursosFiltrados = [...mappedCursos]

    // Filtrar por año
    if (filtroAño !== 'todos') {
      cursosFiltrados = cursosFiltrados.filter(curso => curso.año === parseInt(filtroAño))
    }

    // Filtrar por nivel
    if (filtroNivel !== 'todos') {
      cursosFiltrados = cursosFiltrados.filter(curso => curso.nivel === filtroNivel)
    }

    setData(cursosFiltrados)
  }, [mappedCursos, filtroAño, filtroNivel])

  const exportarCSV = async () => {
    const selectedRows = table.getSelectedRowModel().rows
    if (selectedRows.length === 0) {
      alert('Por favor selecciona al menos un curso para exportar')
      return
    }

    setExportando(true)
    try {
      const cursosIds = selectedRows.map(row => row.original.documentId || row.original.id)
      const colegioId = colegio?.documentId || colegio?.id
      
      const response = await fetch('/api/crm/listas/exportar-cursos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          cursosIds, 
          colegioId,
          formato: 'csv' 
        }),
      })

      if (!response.ok) throw new Error('Error al exportar')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `listas_${colegio?.nombre || 'colegio'}_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error al exportar CSV:', error)
      alert('Error al exportar CSV. Por favor intenta de nuevo.')
    } finally {
      setExportando(false)
    }
  }

  const exportarEscolar = async () => {
    const selectedRows = table.getSelectedRowModel().rows
    if (selectedRows.length === 0) {
      alert('Por favor selecciona al menos un curso para exportar')
      return
    }

    setExportando(true)
    try {
      const cursosIds = selectedRows.map(row => row.original.documentId || row.original.id)
      const colegioId = colegio?.documentId || colegio?.id
      
      const response = await fetch('/api/crm/listas/exportar-cursos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          cursosIds, 
          colegioId,
          formato: 'escolar' 
        }),
      })

      if (!response.ok) throw new Error('Error al exportar')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `escolar_${colegio?.nombre || 'colegio'}_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error al exportar para escolar.cl:', error)
      alert('Error al exportar. Por favor intenta de nuevo.')
    } finally {
      setExportando(false)
    }
  }

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination,
      rowSelection,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableRowSelection: true,
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
                <Col sm={12} md={4}>
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
                <Col sm={6} md={2}>
                  <select
                    className="form-select form-control"
                    value={filtroAño}
                    onChange={(e) => setFiltroAño(e.target.value)}
                  >
                    <option value="todos">Todos los años</option>
                    {añosDisponibles.map(año => (
                      <option key={año} value={año}>{año}</option>
                    ))}
                  </select>
                </Col>
                <Col sm={6} md={2}>
                  <select
                    className="form-select form-control"
                    value={filtroNivel}
                    onChange={(e) => setFiltroNivel(e.target.value)}
                  >
                    <option value="todos">Todos los niveles</option>
                    {nivelesDisponibles.map(nivel => (
                      <option key={nivel} value={nivel}>{nivel}</option>
                    ))}
                  </select>
                </Col>
                <Col sm={12} md={4} className="d-flex justify-content-end align-items-center gap-2">
                  <small className="text-muted">Mostrar:</small>
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

              {Object.keys(rowSelection).length > 0 && (
                <Row className="mb-3">
                  <Col xs={12}>
                    <Alert variant="info" className="d-flex justify-content-between align-items-center mb-0">
                      <span>
                        <strong>{Object.keys(rowSelection).length}</strong> curso(s) seleccionado(s)
                      </span>
                      <div className="d-flex gap-2">
                        <Button 
                          variant="success" 
                          size="sm"
                          onClick={exportarCSV}
                          disabled={exportando}
                        >
                          <LuDownload className="me-1" />
                          {exportando ? 'Exportando...' : 'Exportar CSV'}
                        </Button>
                        <Button 
                          variant="primary" 
                          size="sm"
                          onClick={exportarEscolar}
                          disabled={exportando}
                        >
                          <LuFileSpreadsheet className="me-1" />
                          {exportando ? 'Exportando...' : 'Exportar para escolar.cl'}
                        </Button>
                      </div>
                    </Alert>
                  </Col>
                </Row>
              )}

              {data.length === 0 ? (
                <div className="text-center py-5">
                  <p className="text-muted">No se encontraron cursos con listas para este colegio</p>
                </div>
              ) : (
                <>
                  <DataTable table={table} />
                  <CardFooter className="border-top py-3">
                    <TablePagination
                      totalItems={table.getFilteredRowModel().rows.length}
                      start={table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
                      end={Math.min(
                        (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                        table.getFilteredRowModel().rows.length
                      )}
                      itemsName="cursos"
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
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  )
}
