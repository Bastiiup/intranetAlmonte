'use client'

import {
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { useState, useEffect, useCallback } from 'react'
import { Button, Card, CardFooter, CardHeader, Alert, Spinner } from 'react-bootstrap'
import { Col, Row } from 'react-bootstrap'
import { LuSearch, LuRefreshCw, LuPlus } from 'react-icons/lu'
import Link from 'next/link'

import DataTable from '@/components/table/DataTable'
import TablePagination from '@/components/table/TablePagination'

export interface TrayectoriaType {
  id: number | string
  documentId?: string
  profesor_nombre: string
  colegio_nombre: string
  curso_nombre: string
  cargo: string
  anio: number | null
}

const columnHelper = createColumnHelper<TrayectoriaType>()

export default function AsignacionesListing() {
  const [data, setData] = useState<TrayectoriaType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])

  const fetchTrayectorias = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/mira/trayectorias?pageSize=200')
      const result = await res.json()
      if (result.success && Array.isArray(result.data)) {
        const mapped: TrayectoriaType[] = result.data.map((t: any) => {
          const profesorNombre = t.persona?.nombre_completo || 'Sin profesor'
          const colegioNombre = t.colegio?.colegio_nombre || 'Sin colegio'
          const cursoNombreBase = t.curso?.nombre_curso || ''
          const letra = t.curso?.letra || ''
          const cursoNombre =
            cursoNombreBase || letra ? `${cursoNombreBase}${letra ? ` ${letra}` : ''}` : 'Sin curso'
          return {
            id: t.id,
            documentId: t.documentId,
            profesor_nombre: profesorNombre,
            colegio_nombre: colegioNombre,
            curso_nombre: cursoNombre,
            cargo: t.cargo || '',
            anio: t.anio ?? null,
          }
        })
        setData(mapped)
      } else {
        setError(result.error ?? 'Error al obtener asignaciones')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTrayectorias()
  }, [fetchTrayectorias])

  const filteredData = searchTerm
    ? data.filter((t) => {
        const term = searchTerm.toLowerCase()
        return (
          t.profesor_nombre.toLowerCase().includes(term) ||
          t.colegio_nombre.toLowerCase().includes(term) ||
          t.curso_nombre.toLowerCase().includes(term) ||
          t.cargo.toLowerCase().includes(term) ||
          String(t.anio ?? '').includes(term)
        )
      })
    : data

  const columns = [
    columnHelper.accessor('profesor_nombre', {
      header: 'Profesor',
      cell: (info) => info.getValue() || '-',
      enableSorting: true,
    }),
    columnHelper.accessor('colegio_nombre', {
      header: 'Colegio',
      cell: (info) => info.getValue() || '-',
      enableSorting: true,
    }),
    columnHelper.accessor('curso_nombre', {
      header: 'Curso',
      cell: (info) => info.getValue() || '-',
      enableSorting: true,
    }),
    columnHelper.accessor('cargo', {
      header: 'Cargo',
      cell: (info) => info.getValue() || '-',
      enableSorting: true,
    }),
    columnHelper.accessor('anio', {
      header: 'Año',
      cell: (info) => info.getValue() ?? '-',
      enableSorting: true,
    }),
  ]

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      globalFilter: searchTerm,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 25 },
    },
  })

  return (
    <Card>
      <CardHeader className="d-flex flex-wrap align-items-center justify-content-between gap-2">
        <div className="d-flex align-items-center gap-2">
          <h5 className="card-title mb-0">Asignación de Docentes</h5>
          <Link href="/mira/asignaciones/crear">
            <Button variant="primary" size="sm" className="d-flex align-items-center gap-1">
              <LuPlus size={18} />
              Nueva Asignación
            </Button>
          </Link>
        </div>
        <div className="d-flex align-items-center gap-2">
          <div className="input-group input-group-sm" style={{ width: 260 }}>
            <span className="input-group-text">
              <LuSearch size={16} />
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Buscar por profesor, colegio, curso..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline-secondary" size="sm" onClick={fetchTrayectorias} disabled={loading}>
            <LuRefreshCw size={16} className={loading ? 'spin' : ''} />
          </Button>
        </div>
      </CardHeader>

      {error && (
        <div className="px-4">
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        </div>
      )}

      {loading ? (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      ) : (
        <>
          <Card.Body>
            {filteredData.length === 0 ? (
              <Row>
                <Col>
                  <p className="text-muted text-center my-4">No se encontraron asignaciones.</p>
                </Col>
              </Row>
            ) : (
              <DataTable table={table} />
            )}
          </Card.Body>
          {filteredData.length > 0 && (
            <CardFooter>
              <TablePagination
                totalItems={table.getFilteredRowModel().rows.length}
                start={
                  table.getFilteredRowModel().rows.length === 0
                    ? 0
                    : table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1
                }
                end={Math.min(
                  (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                  table.getFilteredRowModel().rows.length
                )}
                itemsName="asignaciones"
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
        </>
      )}
    </Card>
  )
}

