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
import { Button, Card, CardBody, CardFooter, CardHeader, Col, Nav, NavItem, NavLink, Row, Alert, TabContainer, TabContent, TabPane } from 'react-bootstrap'
import { LuBox, LuSearch } from 'react-icons/lu'
import { TbEdit, TbEye, TbLayoutGrid, TbList, TbPlus, TbTrash, TbCheck } from 'react-icons/tb'

import DataTable from '@/components/table/DataTable'
import DeleteConfirmationModal from '@/components/table/DeleteConfirmationModal'
import TablePagination from '@/components/table/TablePagination'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import dynamic from 'next/dynamic'
import EtiquetaRequestsListing from '../solicitudes/components/EtiquetaRequestsListing'

// Cargar el formulario de agregar etiqueta dinámicamente
const AddTagForm = dynamic(
  () => import('../components/AddTagForm').then((mod) => ({ default: mod.default })),
  { ssr: false }
)

// Tipo para la tabla
type TagType = {
  id: number
  name: string
  description: string
  products: number
  status: 'active' | 'inactive'
  date: string
  time: string
  url: string
  estadoPublicacion?: 'Publicado' | 'Pendiente' | 'Borrador'
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

// Función para mapear etiquetas de Strapi al formato TagType
const mapStrapiTagToTagType = (etiqueta: any): TagType => {
  // Los datos pueden venir en attributes o directamente
  const attrs = etiqueta.attributes || {}
  const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (etiqueta as any)

  // Obtener nombre
  const nombre = getField(data, 'name', 'nombre', 'NOMBRE', 'NAME') || 'Sin nombre'
  
  // Obtener descripción
  const descripcion = getField(data, 'descripcion', 'description', 'DESCRIPCION', 'DESCRIPTION') || ''
  
  // Obtener estado (usa publishedAt para determinar si está publicado)
  const isPublished = !!(attrs.publishedAt || (etiqueta as any).publishedAt)
  
  // Obtener estado_publicacion (Strapi devuelve en minúsculas: "pendiente", "publicado", "borrador")
  const estadoPublicacionRaw = getField(data, 'estado_publicacion', 'ESTADO_PUBLICACION', 'estadoPublicacion') || 'pendiente'
  // Normalizar y capitalizar para mostrar (pero Strapi espera minúsculas)
  const estadoPublicacion = typeof estadoPublicacionRaw === 'string' 
    ? estadoPublicacionRaw.toLowerCase() 
    : estadoPublicacionRaw
  
  // Contar productos (si hay relación)
  const productos = data.productos?.data || data.products?.data || data.productos || data.products || []
  const productosCount = Array.isArray(productos) ? productos.length : 0
  
  // Obtener fechas
  const createdAt = attrs.createdAt || (etiqueta as any).createdAt || new Date().toISOString()
  const createdDate = new Date(createdAt)
  
  return {
    id: etiqueta.id || etiqueta.documentId || etiqueta.id,
    name: nombre,
    description: descripcion,
    products: productosCount,
    status: isPublished ? 'active' : 'inactive',
    date: format(createdDate, 'dd MMM, yyyy'),
    time: format(createdDate, 'h:mm a'),
    url: `/products/etiquetas/${etiqueta.id || etiqueta.documentId || etiqueta.id}`, // URL para edición
    estadoPublicacion: (estadoPublicacion === 'publicado' ? 'Publicado' : 
                       estadoPublicacion === 'borrador' ? 'Borrador' : 
                       'Pendiente') as 'Publicado' | 'Pendiente' | 'Borrador',
  }
}

interface TagsListingProps {
  etiquetas?: any[]
  error?: string | null
}

const columnHelper = createColumnHelper<TagType>()

type TabType = 'etiquetas' | 'solicitudes' | 'agregar'

const TagsListing = ({ etiquetas, error }: TagsListingProps = {}) => {
  const router = useRouter()
  // Obtener rol del usuario autenticado
  const { colaborador } = useAuth()
  const canDelete = colaborador?.rol === 'super_admin'
  const canViewRequests = ['super_admin', 'encargado_adquisiciones', 'supervisor'].includes(colaborador?.rol || '')
  
  // Estado para controlar el tab activo
  const [activeTab, setActiveTab] = useState<TabType>('etiquetas')
  
  // Mapear etiquetas de Strapi al formato TagType si están disponibles
  const mappedTags = useMemo(() => {
    if (etiquetas && etiquetas.length > 0) {
      console.log('[TagsListing] Etiquetas recibidas:', etiquetas.length)
      const mapped = etiquetas.map(mapStrapiTagToTagType)
      console.log('[TagsListing] Etiquetas mapeadas:', mapped.length)
      return mapped
    }
    console.log('[TagsListing] No hay etiquetas de Strapi')
    return []
  }, [etiquetas])

  const columns: ColumnDef<TagType, any>[] = [
    {
      id: 'select',
      maxSize: 45,
      size: 45,
      header: ({ table }: { table: TableType<TagType> }) => (
        <input
          type="checkbox"
          className="form-check-input form-check-input-light fs-14"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row }: { row: TableRow<TagType> }) => (
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
      header: 'Tag',
      cell: ({ row }) => {
        return (
          <div className="d-flex">
            <div className="avatar-md me-3 bg-light d-flex align-items-center justify-content-center rounded">
              <span className="text-muted fs-xs">#</span>
            </div>
            <div>
              <h5 className="mb-0">
                <Link href={`/products/etiquetas/${row.original.id}`} className="link-reset">
                  {row.original.name || 'Sin nombre'}
                </Link>
              </h5>
            </div>
          </div>
        )
      },
    }),
    columnHelper.accessor('description', {
      header: 'Descripción',
      cell: ({ row }) => (
        <p className="text-muted mb-0 small">
          {row.original.description || 'Sin descripción'}
        </p>
      ),
    }),
    columnHelper.accessor('products', {
      header: 'Productos',
      cell: ({ row }) => (
        <span className="badge badge-soft-info">{row.original.products}</span>
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
      cell: ({ row }: { row: TableRow<TagType> }) => (
        <div className="d-flex gap-1">
          <Link href={`/products/etiquetas/${row.original.id}`}>
            <Button variant="default" size="sm" className="btn-icon rounded-circle">
              <TbEye className="fs-lg" />
            </Button>
          </Link>
          <Link href={`/products/etiquetas/${row.original.id}`}>
            <Button
              variant="default"
              size="sm"
              className="btn-icon rounded-circle"
            >
              <TbEdit className="fs-lg" />
            </Button>
          </Link>
          {canDelete && (
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
          )}
        </div>
      ),
    },
  ]

  const [data, setData] = useState<TagType[]>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 })

  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({})

  // Estado para el orden de columnas
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tags-column-order')
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
      localStorage.setItem('tags-column-order', JSON.stringify(newOrder))
    }
  }

  // Actualizar datos cuando cambien las etiquetas de Strapi
  useEffect(() => {
    console.log('[TagsListing] useEffect - etiquetas:', etiquetas?.length, 'mappedTags:', mappedTags.length)
    setData(mappedTags)
    console.log('[TagsListing] Datos actualizados. Total:', mappedTags.length)
  }, [mappedTags, etiquetas])

  const table = useReactTable<TagType>({
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
      // Eliminar cada etiqueta seleccionada
      for (const tagId of idsToDelete) {
        const response = await fetch(`/api/tienda/etiquetas/${tagId}`, {
          method: 'DELETE',
        })
        if (!response.ok) {
          throw new Error(`Error al eliminar etiqueta ${tagId}`)
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
      console.error('Error al eliminar etiquetas:', error)
      alert('Error al eliminar las etiquetas seleccionadas')
    }
  }

  // Mostrar error si existe
  const hasError = !!error
  const hasData = mappedTags.length > 0
  
  if (hasError && !hasData) {
    return (
      <Row>
        <Col xs={12}>
          <Alert variant="warning">
            <strong>Error al cargar etiquetas desde Strapi:</strong> {error}
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
    console.warn('[TagsListing] Error al cargar desde Strapi, usando datos disponibles:', error)
  }

  // Renderizar el contenido del tab de etiquetas
  const renderEtiquetasContent = () => (
    <Card className="mb-4">
      <CardHeader className="d-flex justify-content-between align-items-center">
        <div className="d-flex gap-2">
          <div className="app-search">
            <input
              type="search"
              className="form-control"
              placeholder="Buscar etiqueta..."
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
            />
            <LuSearch className="app-search-icon text-muted" />
          </div>

          {Object.keys(selectedRowIds).length > 0 && canDelete && (
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
              value={(table.getColumn('estadoPublicacion')?.getFilterValue() as string) ?? 'All'}
              onChange={(e) => table.getColumn('estadoPublicacion')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)}>
              <option value="All">Estado Publicación</option>
              <option value="Publicado">Publicado</option>
              <option value="Pendiente">Pendiente</option>
              <option value="Borrador">Borrador</option>
            </select>
            <LuBox className="app-search-icon text-muted" />
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

      <DataTable<TagType>
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
            itemsName="etiquetas"
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
        itemName="tag"
      />
    </Card>
  )

  return (
    <Row>
      <Col xs={12}>
        <TabContainer defaultActiveKey="etiquetas" activeKey={activeTab} onSelect={(k) => setActiveTab(k as TabType)}>
          <Card className="mb-4">
            <CardHeader>
              <Nav variant="tabs" className="card-header-tabs nav-bordered">
                <NavItem>
                  <NavLink eventKey="etiquetas" className="d-flex align-items-center gap-2">
                    <TbList size={18} />
                    <span>Todas las Etiquetas</span>
                  </NavLink>
                </NavItem>
                {canViewRequests && (
                  <NavItem>
                    <NavLink eventKey="solicitudes" className="d-flex align-items-center gap-2">
                      <TbCheck size={18} />
                      <span>Solicitudes</span>
                    </NavLink>
                  </NavItem>
                )}
                <NavItem>
                  <NavLink eventKey="agregar" className="d-flex align-items-center gap-2">
                    <TbPlus size={18} />
                    <span>Agregar Etiqueta</span>
                  </NavLink>
                </NavItem>
              </Nav>
            </CardHeader>
            <CardBody>
              <TabContent>
                <TabPane eventKey="etiquetas">
                  {renderEtiquetasContent()}
                </TabPane>
                {canViewRequests && (
                  <TabPane eventKey="solicitudes">
                    <EtiquetaRequestsListing etiquetas={etiquetas} error={error} />
                  </TabPane>
                )}
                <TabPane eventKey="agregar">
                  <AddTagForm />
                </TabPane>
              </TabContent>
            </CardBody>
          </Card>
        </TabContainer>
      </Col>
    </Row>
  )
}

export default TagsListing

