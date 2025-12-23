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
import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect, useMemo } from 'react'
import { Button, Card, CardFooter, CardHeader, Col, Row, Alert } from 'react-bootstrap'
import { LuBox, LuSearch, LuTag } from 'react-icons/lu'
import { TbEdit, TbEye, TbList, TbTrash, TbCheck } from 'react-icons/tb'

import DataTable from '@/components/table/DataTable'
import DeleteConfirmationModal from '@/components/table/DeleteConfirmationModal'
import ChangeStatusModal from '@/components/table/ChangeStatusModal'
import TablePagination from '@/components/table/TablePagination'
import { STRAPI_API_URL } from '@/lib/strapi/config'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'

// Tipo extendido para autores con estado_publicacion
type AutorTypeExtended = {
  id: number
  name: string
  idAutor: number | null
  tipoAutor: string
  foto: string | null
  libros: number
  status: 'active' | 'inactive'
  date: string
  time: string
  url: string
  strapiId?: number
  estadoPublicacion?: 'Publicado' | 'Pendiente' | 'Borrador'
  autorOriginal?: any
}

// Helper para obtener campo con múltiples variaciones
const getField = (obj: any, ...fieldNames: string[]): any => {
  for (const fieldName of fieldNames) {
    if (obj[fieldName] !== undefined && obj[fieldName] !== null && obj[fieldName] !== '') {
      return obj[fieldName]
    }
  }
  return undefined
}

// Función para mapear autores de Strapi al formato AutorTypeExtended
const mapStrapiAutorToAutorType = (autor: any): AutorTypeExtended => {
  const attrs = autor.attributes || {}
  const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (autor as any)

  // Obtener URL de foto
  const getFotoUrl = (): string | null => {
    let foto = data.foto || data.FOTO || data.photo || data.PHOTO
    
    if (foto?.data) {
      foto = Array.isArray(foto.data) ? foto.data[0] : foto.data
    }
    
    if (!foto || foto === null) {
      return null
    }

    const url = foto.attributes?.url || foto.attributes?.URL || foto.url || foto.URL
    if (!url) {
      return null
    }
    
    if (url.startsWith('http')) {
      return url
    }
    
    const baseUrl = STRAPI_API_URL.replace(/\/$/, '')
    return `${baseUrl}${url.startsWith('/') ? url : `/${url}`}`
  }

  const nombreCompleto = getField(data, 'nombre_completo_autor', 'nombreCompletoAutor', 'NOMBRE_COMPLETO_AUTOR', 'nombre', 'name') || 'Sin nombre'
  const idAutor = getField(data, 'id_autor', 'idAutor', 'ID_AUTOR') || null
  const tipoAutor = getField(data, 'tipo_autor', 'tipoAutor', 'TIPO_AUTOR') || 'Persona'
  
  const libros = data.libros?.data || data.books || []
  const librosCount = Array.isArray(libros) ? libros.length : 0
  
  const isPublished = !!(attrs.publishedAt || autor.publishedAt)
  const createdAt = attrs.createdAt || (autor as any).createdAt || new Date().toISOString()
  const createdDate = new Date(createdAt)

  // Obtener estado_publicacion (Strapi devuelve en minúsculas: "pendiente", "publicado", "borrador")
  const estadoPublicacionRaw = getField(data, 'estado_publicacion', 'ESTADO_PUBLICACION', 'estadoPublicacion') || 'pendiente'
  // Normalizar y capitalizar para mostrar (pero Strapi espera minúsculas)
  const estadoPublicacion = typeof estadoPublicacionRaw === 'string' 
    ? estadoPublicacionRaw.toLowerCase() 
    : estadoPublicacionRaw

  const fotoUrl = getFotoUrl()
  
  return {
    id: autor.id || autor.documentId || autor.id,
    name: nombreCompleto,
    idAutor: idAutor,
    tipoAutor: tipoAutor,
    foto: fotoUrl,
    libros: librosCount,
    status: isPublished ? 'active' : 'inactive',
    date: format(createdDate, 'dd MMM, yyyy'),
    time: format(createdDate, 'h:mm a'),
    url: `/products/atributos/autores/${autor.id || autor.documentId || autor.id}`,
    strapiId: autor.id,
    estadoPublicacion: (estadoPublicacion === 'publicado' ? 'Publicado' : 
                       estadoPublicacion === 'borrador' ? 'Borrador' : 
                       'Pendiente') as 'Publicado' | 'Pendiente' | 'Borrador',
    autorOriginal: autor,
  }
}

interface AutorRequestsListingProps {
  autores?: any[]
  error?: string | null
}

const columnHelper = createColumnHelper<AutorTypeExtended>()

const AutorRequestsListing = ({ autores, error }: AutorRequestsListingProps = {}) => {
  const router = useRouter()
  
  const mappedAutores = useMemo(() => {
    if (autores && autores.length > 0) {
      console.log('[AutorRequestsListing] Autores recibidos:', autores.length)
      const mapped = autores.map(mapStrapiAutorToAutorType)
      console.log('[AutorRequestsListing] Autores mapeados:', mapped.length)
      return mapped
    }
    return []
  }, [autores])

  // Estado para el modal de cambio de estado
  const [showChangeStatusModal, setShowChangeStatusModal] = useState(false)
  const [selectedAutor, setSelectedAutor] = useState<AutorTypeExtended | null>(null)

  const columns: ColumnDef<AutorTypeExtended, any>[] = [
    {
      id: 'select',
      maxSize: 45,
      size: 45,
      header: ({ table }: { table: TableType<AutorTypeExtended> }) => (
        <input
          type="checkbox"
          className="form-check-input form-check-input-light fs-14"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row }: { row: TableRow<AutorTypeExtended> }) => (
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
      header: 'Autor',
      cell: ({ row }) => {
        const fotoSrc = row.original.foto
        
        if (!fotoSrc) {
          return (
            <div className="d-flex">
              <div className="avatar-md me-3 bg-light d-flex align-items-center justify-content-center rounded">
                <span className="text-muted fs-xs">Sin foto</span>
              </div>
              <div>
                <h5 className="mb-0">
                  <Link href={row.original.url} className="link-reset">
                    {row.original.name}
                  </Link>
                </h5>
                <p className="text-muted mb-0 fs-xxs">ID: {row.original.idAutor || 'N/A'}</p>
              </div>
            </div>
          )
        }
        
        return (
          <div className="d-flex">
            <div className="avatar-md me-3">
              <Image 
                src={fotoSrc} 
                alt={row.original.name || 'Autor'} 
                height={36} 
                width={36} 
                className="img-fluid rounded"
                unoptimized={fotoSrc.startsWith('http')}
              />
            </div>
            <div>
              <h5 className="mb-0">
                <Link href={row.original.url} className="link-reset">
                  {row.original.name || 'Sin nombre'}
                </Link>
              </h5>
              <p className="text-muted mb-0 fs-xxs">ID: {row.original.idAutor || 'N/A'}</p>
            </div>
          </div>
        )
      },
    }),
    columnHelper.accessor('idAutor', { 
      header: 'ID Autor',
      cell: ({ row }) => (
        <code className="text-muted">{row.original.idAutor || 'N/A'}</code>
      ),
    }),
    columnHelper.accessor('tipoAutor', {
      header: 'Tipo',
      filterFn: 'equalsString',
      enableColumnFilter: true,
      cell: ({ row }) => (
        <span className="badge badge-soft-info">{row.original.tipoAutor}</span>
      ),
    }),
    columnHelper.accessor('libros', {
      header: 'Libros',
      cell: ({ row }) => (
        <span className="badge badge-soft-info">{row.original.libros}</span>
      ),
    }),
    columnHelper.accessor('estadoPublicacion', {
      header: 'Estado Publicación',
      filterFn: 'equalsString',
      enableColumnFilter: true,
      cell: ({ row }) => {
        const estado = row.original.estadoPublicacion || 'Pendiente'
        const badgeClass = estado === 'Publicado' ? 'badge-soft-success' :
                          estado === 'Pendiente' ? 'badge-soft-warning' :
                          'badge-soft-secondary'
        return (
          <span className={`badge ${badgeClass} fs-xxs`}>
            {estado}
          </span>
        )
      },
    }),
    columnHelper.accessor('date', {
      header: 'Fecha',
      cell: ({ row }) => (
        <>
          {row.original.date} <small className="text-muted">{row.original.time}</small>
        </>
      ),
    }),
    {
      header: 'Acciones',
      cell: ({ row }: { row: TableRow<AutorTypeExtended> }) => (
        <div className="d-flex gap-1">
          <Link href={row.original.url}>
            <Button variant="default" size="sm" className="btn-icon rounded-circle" title="Ver">
              <TbEye className="fs-lg" />
            </Button>
          </Link>
          <Link href={row.original.url}>
            <Button variant="default" size="sm" className="btn-icon rounded-circle" title="Editar">
              <TbEdit className="fs-lg" />
            </Button>
          </Link>
          <Button
            variant="default"
            size="sm"
            className="btn-icon rounded-circle"
            title="Cambiar Estado"
            onClick={() => {
              setSelectedAutor(row.original)
              setShowChangeStatusModal(true)
            }}>
            <TbCheck className="fs-lg" />
          </Button>
          <Button
            variant="default"
            size="sm"
            className="btn-icon rounded-circle"
            title="Eliminar"
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

  const [data, setData] = useState<AutorTypeExtended[]>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 })
  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({})

  // Estado para el orden de columnas
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('autor-requests-column-order')
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch (e) {
          console.error('Error al cargar orden de columnas:', e)
        }
      }
    }
    return []
  })

  // Guardar orden de columnas en localStorage
  const handleColumnOrderChange = (newOrder: string[]) => {
    setColumnOrder(newOrder)
    if (typeof window !== 'undefined') {
      localStorage.setItem('autor-requests-column-order', JSON.stringify(newOrder))
    }
  }

  useEffect(() => {
    setData(mappedAutores)
  }, [mappedAutores])

  const table = useReactTable<AutorTypeExtended>({
    data,
    columns,
    state: { sorting, globalFilter, columnFilters, pagination, rowSelection: selectedRowIds, columnOrder },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    onRowSelectionChange: setSelectedRowIds,
    onColumnOrderChange: setColumnOrder,
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
    const selectedIds = Object.keys(selectedRowIds)
    const idsToDelete = selectedIds.map(id => data[parseInt(id)]?.id).filter(Boolean)
    
    try {
      for (const autorId of idsToDelete) {
        const response = await fetch(`/api/tienda/autores/${autorId}`, {
          method: 'DELETE',
        })
        if (!response.ok) {
          throw new Error(`Error al eliminar autor ${autorId}`)
        }
      }
      
      setData((old) => old.filter((_, idx) => !selectedIds.includes(idx.toString())))
      setSelectedRowIds({})
      setPagination({ ...pagination, pageIndex: 0 })
      setShowDeleteModal(false)
      
      router.refresh()
    } catch (error) {
      console.error('Error al eliminar autores:', error)
      alert('Error al eliminar los autores seleccionados')
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedAutor?.strapiId) return

    // IMPORTANTE: Strapi espera valores en minúsculas: "pendiente", "publicado", "borrador"
    const newStatusLower = newStatus.toLowerCase()

    try {
      const response = await fetch(`/api/tienda/autores/${selectedAutor.strapiId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: { estado_publicacion: newStatusLower } }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al actualizar el estado del autor')
      }

      // Actualizar el estado local del autor (capitalizar para mostrar)
      const estadoMostrar = newStatusLower === 'publicado' ? 'Publicado' : 
                           newStatusLower === 'borrador' ? 'Borrador' : 
                           'Pendiente'
      setData((prevData) =>
        prevData.map((a) =>
          a.strapiId === selectedAutor.strapiId ? { ...a, estadoPublicacion: estadoMostrar as any } : a
        )
      )
      console.log(`[AutorRequestsListing] Estado de autor ${selectedAutor.strapiId} actualizado a ${newStatus}`)
    } catch (err: any) {
      console.error('[AutorRequestsListing] Error al cambiar estado:', err)
      alert(`Error al cambiar estado: ${err.message}`)
    }
  }

  const hasError = !!error
  const hasData = mappedAutores.length > 0
  
  if (hasError && !hasData) {
    return (
      <Row>
        <Col xs={12}>
          <Alert variant="warning">
            <strong>Error al cargar autores desde Strapi:</strong> {error}
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
                  placeholder="Buscar nombre de autor..."
                  value={globalFilter ?? ''}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                />
                <LuSearch className="app-search-icon text-muted" />
              </div>

              {Object.keys(selectedRowIds).length > 0 && (
                <Button variant="danger" size="sm" onClick={toggleDeleteModal}>
                  Eliminar
                </Button>
              )}
            </div>

            <div className="d-flex align-items-center gap-2">
              <span className="me-2 fw-semibold">Filtrar por:</span>

              <div className="app-search">
                <select
                  className="form-select form-control my-1 my-md-0"
                  value={(table.getColumn('estadoPublicacion')?.getFilterValue() as string) ?? 'All'}
                  onChange={(e) => table.getColumn('estadoPublicacion')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)}>
                  <option value="All">Estado Publicación</option>
                  <option value="Publicado">Publicado</option>
                  <option value="Pendiente">Pendiente</option>
                  <option value="Borrador">Borrador</option>
                </select>
                <LuBox className="app-search-icon text-muted" />
              </div>

              <div className="app-search">
                <select
                  className="form-select form-control my-1 my-md-0"
                  value={(table.getColumn('tipoAutor')?.getFilterValue() as string) ?? 'All'}
                  onChange={(e) => table.getColumn('tipoAutor')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)}>
                  <option value="All">Tipo</option>
                  <option value="Persona">Persona</option>
                  <option value="Empresa">Empresa</option>
                </select>
                <LuTag className="app-search-icon text-muted" />
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

            <div className="d-flex gap-1">
              <Button variant="primary" className="btn-icon">
                <TbList className="fs-lg" />
              </Button>
            </div>
          </CardHeader>

          <DataTable<AutorTypeExtended>
            table={table}
            emptyMessage="No se encontraron registros"
            enableColumnReordering={true}
            onColumnOrderChange={handleColumnOrderChange}
          />

          {table.getRowModel().rows.length > 0 && (
            <CardFooter className="border-0">
              <TablePagination
                totalItems={totalItems}
                start={start}
                end={end}
                itemsName="autores"
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
            itemName="author"
          />

          {selectedAutor && (
            <ChangeStatusModal
              show={showChangeStatusModal}
              onHide={() => {
                setShowChangeStatusModal(false)
                setSelectedAutor(null)
              }}
              onConfirm={handleStatusChange}
              currentStatus={selectedAutor.estadoPublicacion || 'Pendiente'}
              productName={selectedAutor.name || 'Autor'}
            />
          )}
        </Card>
      </Col>
    </Row>
  )
}

export default AutorRequestsListing

