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
import { Button, Card, CardBody, CardFooter, CardHeader, Col, Nav, NavItem, NavLink, Row, Alert, TabContainer, TabContent, TabPane } from 'react-bootstrap'
import { LuBox, LuSearch, LuTag } from 'react-icons/lu'
import { TbEdit, TbEye, TbLayoutGrid, TbList, TbPlus, TbTrash, TbCheck } from 'react-icons/tb'

import DataTable from '@/components/table/DataTable'
import DeleteConfirmationModal from '@/components/table/DeleteConfirmationModal'
import TablePagination from '@/components/table/TablePagination'
import { toPascalCase } from '@/helpers/casing'
import { STRAPI_API_URL } from '@/lib/strapi/config'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import dynamic from 'next/dynamic'
import CategoriaRequestsListing from '../solicitudes/components/CategoriaRequestsListing'

// Cargar el formulario de agregar categoría dinámicamente
const AddCategoryForm = dynamic(
  () => import('../components/AddCategoryForm').then((mod) => ({ default: mod.default })),
  { ssr: false }
)

interface Categoria {
  id: number
  nombre?: string
  name?: string
  slug?: string
  descripcion?: string
  description?: string
  activo?: boolean
  isActive?: boolean
  imagen?: any
  image?: any
  productos?: any[]
  products?: any[]
  createdAt?: string
  updatedAt?: string
}

// Tipo para la tabla
type CategoryType = {
  id: number
  name: string
  slug: string
  description: string
  image: string | null
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

// Función para mapear categorías de Strapi al formato CategoryType
const mapStrapiCategoryToCategoryType = (categoria: any): CategoryType => {
  // Los datos pueden venir en attributes o directamente
  const attrs = categoria.attributes || {}
  const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (categoria as any)

  // Obtener URL de imagen
  const getImageUrl = (): string | null => {
    let imagen = data.imagen || data.image || data.IMAGEN || data.IMAGE
    
    // Si imagen tiene .data, acceder a eso
    if (imagen?.data) {
      imagen = Array.isArray(imagen.data) ? imagen.data[0] : imagen.data
    }
    
    if (!imagen || imagen === null) {
      return null
    }

    // Obtener la URL - puede estar en attributes o directamente
    const url = imagen.attributes?.url || imagen.attributes?.URL || imagen.url || imagen.URL
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

  // Obtener nombre
  const nombre = getField(data, 'nombre', 'name', 'NOMBRE', 'NAME') || 'Sin nombre'
  
  // Obtener slug
  const slug = getField(data, 'slug', 'SLUG') || ''
  
  // Obtener descripción
  const descripcion = getField(data, 'descripcion', 'description', 'DESCRIPCION', 'DESCRIPTION') || ''
  
  // Obtener estado
  const activo = data.activo !== undefined ? data.activo : (data.isActive !== undefined ? data.isActive : true)
  
  // Obtener estado_publicacion (Strapi devuelve en minúsculas: "pendiente", "publicado", "borrador")
  const estadoPublicacionRaw = getField(data, 'estado_publicacion', 'ESTADO_PUBLICACION', 'estadoPublicacion') || 'pendiente'
  // Normalizar y capitalizar para mostrar (pero Strapi espera minúsculas)
  const estadoPublicacion = typeof estadoPublicacionRaw === 'string' 
    ? estadoPublicacionRaw.toLowerCase() 
    : estadoPublicacionRaw
  
  // Contar productos
  const productos = data.productos?.data || data.products?.data || data.productos || data.products || []
  const productosCount = Array.isArray(productos) ? productos.length : 0
  
  // Obtener fechas
  const createdAt = attrs.createdAt || (categoria as any).createdAt || new Date().toISOString()
  const createdDate = new Date(createdAt)

  const imageUrl = getImageUrl()
  
  return {
    id: categoria.id || categoria.documentId || categoria.id,
    name: nombre,
    slug: slug,
    description: descripcion,
    image: imageUrl,
    products: productosCount,
    status: activo ? 'active' : 'inactive',
    date: format(createdDate, 'dd MMM, yyyy'),
    time: format(createdDate, 'h:mm a'),
    url: `/products/categorias/${categoria.id || categoria.documentId || categoria.id}`,
    estadoPublicacion: (estadoPublicacion === 'publicado' ? 'Publicado' : 
                       estadoPublicacion === 'borrador' ? 'Borrador' : 
                       'Pendiente') as 'Publicado' | 'Pendiente' | 'Borrador',
  }
}

interface CategoriesListingProps {
  categorias?: any[]
  error?: string | null
}

const columnHelper = createColumnHelper<CategoryType>()

type TabType = 'categorias' | 'solicitudes' | 'agregar'

const CategoriesListing = ({ categorias, error }: CategoriesListingProps = {}) => {
  const router = useRouter()
  // Obtener rol del usuario autenticado
  const { colaborador } = useAuth()
  const canDelete = colaborador?.rol === 'super_admin'
  const canViewRequests = ['super_admin', 'encargado_adquisiciones', 'supervisor'].includes(colaborador?.rol || '')
  
  // Estado para controlar el tab activo
  const [activeTab, setActiveTab] = useState<TabType>('categorias')
  
  // Mapear categorías de Strapi al formato CategoryType si están disponibles
  const mappedCategories = useMemo(() => {
    if (categorias && categorias.length > 0) {
      console.log('[CategoriesListing] Categorías recibidas:', categorias.length)
      const mapped = categorias.map(mapStrapiCategoryToCategoryType)
      console.log('[CategoriesListing] Categorías mapeadas:', mapped.length)
      return mapped
    }
    console.log('[CategoriesListing] No hay categorías de Strapi')
    return []
  }, [categorias])

  const columns: ColumnDef<CategoryType, any>[] = [
    {
      id: 'select',
      maxSize: 45,
      size: 45,
      header: ({ table }: { table: TableType<CategoryType> }) => (
        <input
          type="checkbox"
          className="form-check-input form-check-input-light fs-14"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row }: { row: TableRow<CategoryType> }) => (
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
      header: 'Category',
      cell: ({ row }) => {
        const imageSrc = row.original.image
        
        // Si no hay imagen, mostrar placeholder
        if (!imageSrc) {
          return (
            <div className="d-flex">
              <div className="avatar-md me-3 bg-light d-flex align-items-center justify-content-center rounded">
                <span className="text-muted fs-xs">Sin imagen</span>
              </div>
              <div>
                <h5 className="mb-0">
                  <Link href={row.original.url} className="link-reset">
                    {row.original.name}
                  </Link>
                </h5>
                <p className="text-muted mb-0 fs-xxs">Slug: {row.original.slug || 'N/A'}</p>
              </div>
            </div>
          )
        }
        
        return (
          <div className="d-flex">
            <div className="avatar-md me-3">
              <Image 
                src={imageSrc} 
                alt={row.original.name || 'Category'} 
                height={36} 
                width={36} 
                className="img-fluid rounded"
                unoptimized={imageSrc.startsWith('http')}
                onError={(e) => {
                  console.error('[CategoriesListing] Error al cargar imagen:', imageSrc, e)
                }}
              />
            </div>
            <div>
              <h5 className="mb-0">
                <Link href={row.original.url} className="link-reset">
                  {row.original.name || 'Sin nombre'}
                </Link>
              </h5>
              <p className="text-muted mb-0 fs-xxs">Slug: {row.original.slug || 'N/A'}</p>
            </div>
          </div>
        )
      },
    }),
    columnHelper.accessor('slug', { 
      header: 'Slug',
      cell: ({ row }) => (
        <code className="text-muted">{row.original.slug || 'N/A'}</code>
      ),
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
      cell: ({ row }: { row: TableRow<CategoryType> }) => (
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

  const [data, setData] = useState<CategoryType[]>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 })

  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({})

  // Estado para el orden de columnas
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('categories-column-order')
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
      localStorage.setItem('categories-column-order', JSON.stringify(newOrder))
    }
  }

  // Actualizar datos cuando cambien las categorías de Strapi
  useEffect(() => {
    console.log('[CategoriesListing] useEffect - categorias:', categorias?.length, 'mappedCategories:', mappedCategories.length)
    setData(mappedCategories)
    console.log('[CategoriesListing] Datos actualizados. Total:', mappedCategories.length)
  }, [mappedCategories, categorias])

  const table = useReactTable<CategoryType>({
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
      // Eliminar cada categoría seleccionada
      for (const categoryId of idsToDelete) {
        const response = await fetch(`/api/tienda/categorias/${categoryId}`, {
          method: 'DELETE',
        })
        if (!response.ok) {
          throw new Error(`Error al eliminar categoría ${categoryId}`)
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
      console.error('Error al eliminar categorías:', error)
      alert('Error al eliminar las categorías seleccionadas')
    }
  }

  // Mostrar error si existe
  const hasError = !!error
  const hasData = mappedCategories.length > 0
  
  if (hasError && !hasData) {
    return (
      <Row>
        <Col xs={12}>
          <Alert variant="warning">
            <strong>Error al cargar categorías desde Strapi:</strong> {error}
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
    console.warn('[CategoriesListing] Error al cargar desde Strapi, usando datos disponibles:', error)
  }

  // Obtener categorías únicas para el filtro
  const uniqueCategories = useMemo(() => {
    const categories = new Set(data.map(cat => cat.name))
    return Array.from(categories).sort()
  }, [data])

  // Renderizar el contenido del tab de categorías
  const renderCategoriasContent = () => (
    <Card className="mb-4">
      <CardHeader className="d-flex justify-content-between align-items-center">
        <div className="d-flex gap-2">
          <div className="app-search">
            <input
              type="search"
              className="form-control"
              placeholder="Buscar categoría..."
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

      <DataTable<CategoryType>
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
            itemsName="categorías"
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
        itemName="category"
      />
    </Card>
  )

  return (
    <Row>
      <Col xs={12}>
        <TabContainer defaultActiveKey="categorias" activeKey={activeTab} onSelect={(k) => setActiveTab(k as TabType)}>
          <Card className="mb-4">
            <CardHeader>
              <Nav variant="tabs" className="card-header-tabs nav-bordered">
                <NavItem>
                  <NavLink eventKey="categorias" className="d-flex align-items-center gap-2">
                    <TbList size={18} />
                    <span>Todas las Categorías</span>
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
                    <span>Agregar Categoría</span>
                  </NavLink>
                </NavItem>
              </Nav>
            </CardHeader>
            <CardBody>
              <TabContent>
                <TabPane eventKey="categorias">
                  {renderCategoriasContent()}
                </TabPane>
                {canViewRequests && (
                  <TabPane eventKey="solicitudes">
                    <CategoriaRequestsListing categorias={categorias} error={error} />
                  </TabPane>
                )}
                <TabPane eventKey="agregar">
                  <AddCategoryForm />
                </TabPane>
              </TabContent>
            </CardBody>
          </Card>
        </TabContainer>
      </Col>
    </Row>
  )
}

export default CategoriesListing
