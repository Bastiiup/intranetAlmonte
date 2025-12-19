'use client'

import {
  ColumnDef,
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
import { useState, useEffect, useMemo } from 'react'
import { Button, Card, CardFooter, CardHeader, Col, Row, Alert } from 'react-bootstrap'
import { LuBox, LuSearch, LuTag } from 'react-icons/lu'
import { TbEdit, TbEye, TbLayoutGrid, TbList, TbPlus, TbTrash } from 'react-icons/tb'

import DataTable from '@/components/table/DataTable'
import DeleteConfirmationModal from '@/components/table/DeleteConfirmationModal'
import TablePagination from '@/components/table/TablePagination'
import { STRAPI_API_URL } from '@/lib/strapi/config'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'

// Tipo para la tabla
type AutorType = {
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

// Función para mapear autores de Strapi al formato AutorType
const mapStrapiAutorToAutorType = (autor: any): AutorType => {
  // Los datos pueden venir en attributes o directamente
  const attrs = autor.attributes || {}
  const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (autor as any)

  // Obtener URL de foto
  const getFotoUrl = (): string | null => {
    let foto = data.foto || data.FOTO || data.photo || data.PHOTO
    
    // Si foto tiene .data, acceder a eso
    if (foto?.data) {
      foto = Array.isArray(foto.data) ? foto.data[0] : foto.data
    }
    
    if (!foto || foto === null) {
      return null
    }

    // Obtener la URL - puede estar en attributes o directamente
    const url = foto.attributes?.url || foto.attributes?.URL || foto.url || foto.URL
    if (!url) {
      return null
    }
    
    // Si la URL ya es completa, retornarla tal cual
    if (url.startsWith('http')) {
      return url
    }
    
    // Si no, construir la URL completa con la base de Strapi
    const baseUrl = STRAPI_API_URL.replace(/\/$/, '')
    return `${baseUrl}${url.startsWith('/') ? url : `/${url}`}`
  }

  // Obtener nombre completo
  const nombreCompleto = getField(data, 'nombre_completo_autor', 'nombreCompletoAutor', 'NOMBRE_COMPLETO_AUTOR', 'nombre', 'name') || 'Sin nombre'
  
  // Obtener ID autor
  const idAutor = getField(data, 'id_autor', 'idAutor', 'ID_AUTOR') || null
  
  // Obtener tipo autor
  const tipoAutor = getField(data, 'tipo_autor', 'tipoAutor', 'TIPO_AUTOR') || 'Persona'
  
  // Contar libros
  const libros = data.libros?.data || data.books || []
  const librosCount = Array.isArray(libros) ? libros.length : 0
  
  // Obtener estado (publishedAt indica si está publicado)
  const isPublished = !!(attrs.publishedAt || autor.publishedAt)
  
  // Obtener fechas
  const createdAt = attrs.createdAt || (autor as any).createdAt || new Date().toISOString()
  const createdDate = new Date(createdAt)

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
  }
}

interface AutoresListingProps {
  autores?: any[]
  error?: string | null
}

const columnHelper = createColumnHelper<AutorType>()

const AutoresListing = ({ autores, error }: AutoresListingProps = {}) => {
  const router = useRouter()
  
  // Mapear autores de Strapi al formato AutorType si están disponibles
  const mappedAutores = useMemo(() => {
    if (autores && autores.length > 0) {
      console.log('[AutoresListing] Autores recibidos:', autores.length)
      const mapped = autores.map(mapStrapiAutorToAutorType)
      console.log('[AutoresListing] Autores mapeados:', mapped.length)
      return mapped
    }
    console.log('[AutoresListing] No hay autores de Strapi')
    return []
  }, [autores])

  const columns: ColumnDef<AutorType, any>[] = [
    {
      id: 'select',
      maxSize: 45,
      size: 45,
      header: ({ table }: { table: TableType<AutorType> }) => (
        <input
          type="checkbox"
          className="form-check-input form-check-input-light fs-14"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row }: { row: TableRow<AutorType> }) => (
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
        
        // Si no hay foto, mostrar placeholder
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
                onError={(e) => {
                  console.error('[AutoresListing] Error al cargar foto:', fotoSrc, e)
                }}
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
    columnHelper.accessor('status', {
      header: 'Estado',
      filterFn: 'equalsString',
      enableColumnFilter: true,
      cell: ({ row }) => (
        <span
          className={`badge ${row.original.status === 'active' ? 'badge-soft-success' : 'badge-soft-danger'} fs-xxs`}>
          {row.original.status === 'active' ? 'Activo' : 'Inactivo'}
        </span>
      ),
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
      cell: ({ row }: { row: TableRow<AutorType> }) => (
        <div className="d-flex gap-1">
          <Link href={row.original.url}>
            <Button variant="default" size="sm" className="btn-icon rounded-circle">
              <TbEye className="fs-lg" />
            </Button>
          </Link>
          <Link href={row.original.url}>
            <Button
              variant="default"
              size="sm"
              className="btn-icon rounded-circle"
            >
              <TbEdit className="fs-lg" />
            </Button>
          </Link>
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

  const [data, setData] = useState<AutorType[]>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 })

  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({})

  // Estado para el orden de columnas
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('autores-column-order')
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
      localStorage.setItem('autores-column-order', JSON.stringify(newOrder))
    }
  }

  // Actualizar datos cuando cambien los autores de Strapi
  useEffect(() => {
    console.log('[AutoresListing] useEffect - autores:', autores?.length, 'mappedAutores:', mappedAutores.length)
    setData(mappedAutores)
    console.log('[AutoresListing] Datos actualizados. Total:', mappedAutores.length)
  }, [mappedAutores, autores])

  const table = useReactTable<AutorType>({
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
      // Eliminar cada autor seleccionado
      for (const autorId of idsToDelete) {
        const response = await fetch(`/api/tienda/autores/${autorId}`, {
          method: 'DELETE',
        })
        if (!response.ok) {
          throw new Error(`Error al eliminar autor ${autorId}`)
        }
      }
      
      // Actualizar datos localmente
      setData((old) => old.filter((_, idx) => !selectedIds.includes(idx.toString())))
      setSelectedRowIds({})
      setPagination({ ...pagination, pageIndex: 0 })
      setShowDeleteModal(false)
      
      // Recargar la página para reflejar cambios
      router.refresh()
    } catch (error) {
      console.error('Error al eliminar autores:', error)
      alert('Error al eliminar los autores seleccionados')
    }
  }

  // Mostrar error si existe
  const hasError = !!error
  const hasData = mappedAutores.length > 0
  
  if (hasError && !hasData) {
    return (
      <Row>
        <Col xs={12}>
          <Alert variant="warning">
            <strong>Error al cargar autores desde Strapi:</strong> {error}
            <br />
            <small className="text-muted">
              Verifica que:
              <ul className="mt-2 mb-0">
                <li>STRAPI_API_TOKEN esté configurado en Railway</li>
                <li>El servidor de Strapi esté disponible</li>
                <li>Las variables de entorno estén correctas</li>
              </ul>
            </small>
          </Alert>
        </Col>
      </Row>
    )
  }
  
  // Si hay error pero también hay datos, mostrar advertencia pero continuar
  if (hasError && hasData) {
    console.warn('[AutoresListing] Error al cargar desde Strapi, usando datos disponibles:', error)
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
                  value={(table.getColumn('status')?.getFilterValue() as string) ?? 'All'}
                  onChange={(e) => table.getColumn('status')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)}>
                  <option value="All">Estado</option>
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
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
              <Link passHref href="/products/atributos/autores">
                <Button variant="outline-primary" className="btn-icon btn-soft-primary">
                  <TbLayoutGrid className="fs-lg" />
                </Button>
              </Link>
              <Button variant="primary" className="btn-icon">
                <TbList className="fs-lg" />
              </Button>
              <Link href="/products/atributos/autores/agregar" passHref>
                <Button variant="danger" className="ms-1">
                  <TbPlus className="fs-sm me-2" /> Agregar Autor
                </Button>
              </Link>
            </div>
          </CardHeader>

          <DataTable<AutorType>
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
        </Card>
      </Col>
    </Row>
  )
}

export default AutoresListing

