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
  Row as TableRow,
  Table as TableType,
  useReactTable,
} from '@tanstack/react-table'
import Link from 'next/link'
import { useState, useEffect, useMemo } from 'react'
import { Button, Card, CardFooter, CardHeader, Col, Row, Alert, Badge } from 'react-bootstrap'
import { LuSearch, LuFileText, LuDownload, LuEye, LuPlus } from 'react-icons/lu'
import { TbEdit, TbTrash } from 'react-icons/tb'

import DataTable from '@/components/table/DataTable'
import DeleteConfirmationModal from '@/components/table/DeleteConfirmationModal'
import TablePagination from '@/components/table/TablePagination'
import ListaModal from './ListaModal'

interface ListaType {
  id: number | string
  documentId?: string
  nombre: string
  nivel: 'Basica' | 'Media'
  grado: number
  año?: number
  descripcion?: string
  activo: boolean
  pdf_id?: number | string
  pdf_url?: string
  pdf_nombre?: string
  colegio?: {
    id: number | string
    nombre: string
  }
  curso?: {
    id: number | string
    nombre: string
  }
  materiales?: any[]
}

const columnHelper = createColumnHelper<ListaType>()

interface ListasListingProps {
  listas: any[]
  error: string | null
}

export default function ListasListing({ listas: listasProp, error }: ListasListingProps) {
  const [showModal, setShowModal] = useState(false)
  const [editingLista, setEditingLista] = useState<ListaType | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedListaId, setSelectedListaId] = useState<string | number | null>(null)
  const [loading, setLoading] = useState(false)

  // Mapear listas de Strapi al formato ListaType
  const mappedListas = useMemo(() => {
    if (!listasProp || !Array.isArray(listasProp)) return []
    
    return listasProp.map((lista: any) => {
      const attrs = lista.attributes || lista
      const id = lista.id || lista.documentId
      
      // Obtener PDF si existe
      let pdf_id: number | string | undefined
      let pdf_url: string | undefined
      let pdf_nombre: string | undefined
      
      if (attrs.pdf) {
        const pdfData = attrs.pdf?.data || attrs.pdf
        pdf_id = pdfData?.id || pdfData?.documentId
        pdf_url = pdfData?.attributes?.url || pdfData?.url
        pdf_nombre = pdfData?.attributes?.name || pdfData?.name
      }
      
      // Obtener colegio si existe
      let colegio: any = undefined
      if (attrs.colegio) {
        const colegioData = attrs.colegio?.data || attrs.colegio
        colegio = {
          id: colegioData?.id || colegioData?.documentId,
          nombre: colegioData?.attributes?.colegio_nombre || colegioData?.colegio_nombre || '',
        }
      }
      
      // Obtener curso si existe
      let curso: any = undefined
      if (attrs.curso) {
        const cursoData = attrs.curso?.data || attrs.curso
        curso = {
          id: cursoData?.id || cursoData?.documentId,
          nombre: cursoData?.attributes?.nombre_curso || cursoData?.nombre_curso || '',
        }
      }
      
      return {
        id,
        documentId: lista.documentId || String(id),
        nombre: attrs.nombre || '',
        nivel: attrs.nivel || 'Basica',
        grado: attrs.grado || 1,
        año: attrs.año || attrs.ano || new Date().getFullYear(),
        descripcion: attrs.descripcion || '',
        activo: attrs.activo !== false,
        pdf_id,
        pdf_url,
        pdf_nombre,
        colegio,
        curso,
        materiales: attrs.materiales || [],
      } as ListaType
    })
  }, [listasProp])

  const columns: ColumnDef<ListaType, any>[] = [
    {
      id: 'nombre',
      header: 'Nombre',
      accessorKey: 'nombre',
      enableSorting: true,
      cell: ({ row }) => (
        <div>
          <h6 className="mb-0">{row.original.nombre || 'Sin nombre'}</h6>
          {row.original.descripcion && (
            <small className="text-muted">{row.original.descripcion}</small>
          )}
        </div>
      ),
    },
    {
      id: 'nivel',
      header: 'Nivel',
      accessorKey: 'nivel',
      enableSorting: true,
      enableColumnFilter: true,
      cell: ({ row }) => (
        <Badge bg={row.original.nivel === 'Basica' ? 'primary' : 'info'}>
          {row.original.nivel}
        </Badge>
      ),
    },
    {
      id: 'grado',
      header: 'Grado',
      accessorKey: 'grado',
      enableSorting: true,
      cell: ({ row }) => `${row.original.grado}°`,
    },
    {
      id: 'año',
      header: 'Año',
      accessorKey: 'año',
      enableSorting: true,
      cell: ({ row }) => row.original.año || '-',
    },
    {
      id: 'colegio',
      header: 'Colegio',
      cell: ({ row }) => row.original.colegio?.nombre || '-',
    },
    {
      id: 'curso',
      header: 'Curso',
      cell: ({ row }) => row.original.curso?.nombre || '-',
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
      id: 'activo',
      header: 'Estado',
      accessorKey: 'activo',
      enableSorting: true,
      enableColumnFilter: true,
      cell: ({ row }) => (
        <Badge bg={row.original.activo ? 'success' : 'secondary'}>
          {row.original.activo ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      id: 'acciones',
      header: 'Acciones',
      cell: ({ row }) => (
        <div className="d-flex gap-1">
          {row.original.pdf_id && (
            <>
              <Button
                variant="outline-primary"
                size="sm"
                className="btn-icon rounded-circle"
                onClick={() => {
                  const pdfUrl = `/api/crm/listas/pdf/${row.original.pdf_id}`
                  window.open(pdfUrl, '_blank')
                }}
                title="Visualizar PDF"
              >
                <LuEye className="fs-lg" />
              </Button>
              <Button
                variant="outline-success"
                size="sm"
                className="btn-icon rounded-circle"
                onClick={() => {
                  const pdfUrl = `/api/crm/listas/pdf/${row.original.pdf_id}`
                  const link = document.createElement('a')
                  link.href = pdfUrl
                  link.download = row.original.pdf_nombre || `${row.original.nombre}.pdf`
                  link.target = '_blank'
                  document.body.appendChild(link)
                  link.click()
                  document.body.removeChild(link)
                }}
                title="Descargar PDF"
              >
                <LuDownload className="fs-lg" />
              </Button>
            </>
          )}
          <Button
            variant="outline-primary"
            size="sm"
            className="btn-icon rounded-circle"
            onClick={() => {
              setEditingLista(row.original)
              setShowModal(true)
            }}
            title="Editar"
          >
            <TbEdit className="fs-lg" />
          </Button>
          <Button
            variant="outline-danger"
            size="sm"
            className="btn-icon rounded-circle"
            onClick={() => {
              setSelectedListaId(row.original.id)
              setShowDeleteModal(true)
            }}
            title="Eliminar"
          >
            <TbTrash className="fs-lg" />
          </Button>
        </div>
      ),
    },
  ]

  const [data, setData] = useState<ListaType[]>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'año', desc: true },
  ])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })

  useEffect(() => {
    setData(mappedListas)
  }, [mappedListas])

  const table = useReactTable<ListaType>({
    data,
    columns,
    state: { sorting, globalFilter, columnFilters, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: 'includesString',
    enableColumnFilters: true,
  })

  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const totalItems = table.getFilteredRowModel().rows.length

  const start = pageIndex * pageSize + 1
  const end = Math.min(start + pageSize - 1, totalItems)

  const handleDelete = async () => {
    if (!selectedListaId) return

    setLoading(true)
    try {
      const response = await fetch(`/api/crm/listas-utiles/${selectedListaId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (result.success) {
        setData((old) => old.filter((l) => l.id !== selectedListaId))
        setShowDeleteModal(false)
        setSelectedListaId(null)
        window.location.reload()
      } else {
        alert('Error al eliminar: ' + (result.error || 'Error desconocido'))
      }
    } catch (error: any) {
      console.error('Error al eliminar lista:', error)
      alert('Error al eliminar lista: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleModalClose = () => {
    setShowModal(false)
    setEditingLista(null)
  }

  const handleModalSuccess = () => {
    handleModalClose()
    window.location.reload()
  }

  if (error && mappedListas.length === 0) {
    return (
      <Row>
        <Col xs={12}>
          <Alert variant="warning">
            <strong>Error al cargar listas:</strong> {error}
          </Alert>
        </Col>
      </Row>
    )
  }

  return (
    <Row>
      <Col xs={12}>
        <Card className="mb-4">
          <CardHeader className="d-flex justify-content-between align-items-center">
            <div className="d-flex gap-2">
              <div className="app-search">
                <input
                  type="search"
                  className="form-control"
                  placeholder="Buscar por nombre..."
                  value={globalFilter ?? ''}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                />
                <LuSearch className="app-search-icon text-muted" />
              </div>
            </div>

            <div className="d-flex align-items-center gap-2">
              <div className="app-search">
                <select
                  className="form-select form-control my-1 my-md-0"
                  value={(table.getColumn('nivel')?.getFilterValue() as string) ?? 'All'}
                  onChange={(e) =>
                    table.getColumn('nivel')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)
                  }>
                  <option value="All">Nivel</option>
                  <option value="Basica">Básica</option>
                  <option value="Media">Media</option>
                </select>
              </div>

              <div className="app-search">
                <select
                  className="form-select form-control my-1 my-md-0"
                  value={(table.getColumn('activo')?.getFilterValue() as boolean | string) ?? 'All'}
                  onChange={(e) => {
                    const value = e.target.value
                    table.getColumn('activo')?.setFilterValue(value === 'All' ? undefined : value === 'true')
                  }}>
                  <option value="All">Estado</option>
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
              </div>

              <div>
                <select
                  className="form-select form-control my-1 my-md-0"
                  value={table.getState().pagination.pageSize}
                  onChange={(e) => table.setPageSize(Number(e.target.value))}>
                  {[5, 10, 15, 20, 25].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="d-flex gap-1">
              <Button variant="primary" onClick={() => setShowModal(true)}>
                <LuPlus className="fs-sm me-2" /> Agregar Lista
              </Button>
            </div>
          </CardHeader>

          <DataTable<ListaType>
            table={table}
            emptyMessage="No se encontraron listas"
          />

          {table.getRowModel().rows.length > 0 && (
            <CardFooter className="border-0">
              <TablePagination
                totalItems={totalItems}
                start={start}
                end={end}
                itemsName="listas"
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
              setShowDeleteModal(false)
              setSelectedListaId(null)
            }}
            onConfirm={handleDelete}
            selectedCount={1}
            itemName="lista"
          />
        </Card>

        <ListaModal
          show={showModal}
          onHide={handleModalClose}
          lista={editingLista}
          onSuccess={handleModalSuccess}
        />
      </Col>
    </Row>
  )
}
