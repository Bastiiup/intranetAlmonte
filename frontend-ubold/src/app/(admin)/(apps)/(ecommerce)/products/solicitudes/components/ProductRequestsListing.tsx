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
import Image, { type StaticImageData } from 'next/image'
import Link from 'next/link'
import { useState, useEffect, useMemo } from 'react'
import { Button, Card, CardFooter, CardHeader, Col, Row, Alert } from 'react-bootstrap'
import { LuBox, LuDollarSign, LuSearch, LuTag } from 'react-icons/lu'
import { TbEdit, TbEye, TbList, TbTrash, TbCheck } from 'react-icons/tb'

import Rating from '@/components/Rating'
import DataTable from '@/components/table/DataTable'
import DeleteConfirmationModal from '@/components/table/DeleteConfirmationModal'
import ChangeStatusModal from '@/components/table/ChangeStatusModal'
import TablePagination from '@/components/table/TablePagination'
import { currency } from '@/helpers'
import { productData, type ProductType } from '@/app/(admin)/(apps)/(ecommerce)/products/data'
import { STRAPI_API_URL } from '@/lib/strapi/config'
import { format } from 'date-fns'

// Tipo extendido para productos con estado_publicacion
type ProductTypeExtended = Omit<ProductType, 'image'> & {
  image: StaticImageData | { src: string | null }
  strapiId?: number
  estadoPublicacion?: 'Publicado' | 'Pendiente' | 'Borrador'
  productoOriginal?: any // Guardar el producto original de Strapi
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

// Función para mapear productos de Strapi al formato ProductType
const mapStrapiProductToProductType = (producto: any): ProductTypeExtended => {
  const attrs = producto.attributes || {}
  const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (producto as any)

  // Obtener URL de imagen
  const getImageUrl = (): string | null => {
    let portada = data.portada_libro || data.PORTADA_LIBRO || data.portadaLibro
    if (portada?.data) {
      portada = portada.data
    }
    if (!portada || portada === null) {
      return null
    }
    const url = portada.attributes?.url || portada.attributes?.URL || portada.url || portada.URL
    if (!url) {
      return null
    }
    if (url.startsWith('http')) {
      return url
    }
    const baseUrl = STRAPI_API_URL.replace(/\/$/, '')
    return `${baseUrl}${url.startsWith('/') ? url : `/${url}`}`
  }

  // Calcular stock total
  const getStockTotal = (): number => {
    const stocks = data.STOCKS?.data || data.stocks?.data || []
    return stocks.reduce((total: number, stock: any) => {
      const cantidad = stock.attributes?.CANTIDAD || stock.attributes?.cantidad || 0
      return total + (typeof cantidad === 'number' ? cantidad : 0)
    }, 0)
  }

  // Obtener precio mínimo
  const getPrecioMinimo = (): number => {
    const precios = data.PRECIOS?.data || data.precios?.data || []
    if (precios.length === 0) return 0
    const preciosNumeros = precios
      .map((p: any) => p.attributes?.PRECIO || p.attributes?.precio)
      .filter((p: any): p is number => typeof p === 'number' && p > 0)
    return preciosNumeros.length > 0 ? Math.min(...preciosNumeros) : 0
  }

  const nombre = getField(data, 'NOMBRE_LIBRO', 'nombre_libro', 'nombreLibro', 'NOMBRE', 'nombre', 'name', 'NAME') || 'Sin nombre'
  const isbn = getField(data, 'ISBN_LIBRO', 'isbn_libro', 'isbnLibro', 'ISBN', 'isbn') || ''
  const autor = data.autor_relacion?.data?.attributes?.nombre || data.autor_relacion?.data?.attributes?.NOMBRE || 'Sin autor'
  const tipoLibro = getField(data, 'TIPO_LIBRO', 'tipo_libro', 'tipoLibro') || 'Sin categoría'
  const isPublished = !!(attrs.publishedAt || (producto as any).publishedAt)
  const createdAt = attrs.createdAt || (producto as any).createdAt || new Date().toISOString()
  const createdDate = new Date(createdAt)

  // Obtener estado_publicacion (Strapi devuelve en minúsculas: "pendiente", "publicado", "borrador")
  const estadoPublicacionRaw = getField(data, 'estado_publicacion', 'ESTADO_PUBLICACION', 'estadoPublicacion') || 'pendiente'
  // Normalizar y capitalizar para mostrar (pero Strapi espera minúsculas)
  const estadoPublicacion = typeof estadoPublicacionRaw === 'string' 
    ? estadoPublicacionRaw.toLowerCase() 
    : estadoPublicacionRaw

  const imageUrl = getImageUrl()
  return {
    image: { src: imageUrl || '' },
    name: nombre,
    brand: autor,
    code: isbn || `STRAPI-${producto.id}`,
    category: tipoLibro,
    stock: getStockTotal(),
    price: getPrecioMinimo(),
    sold: 0,
    rating: 4,
    reviews: 0,
    status: isPublished ? 'published' : 'pending',
    date: format(createdDate, 'dd MMM, yyyy'),
    time: format(createdDate, 'h:mm a'),
    url: `/products/${producto.id || producto.documentId || producto.id}`,
    strapiId: producto.id,
    estadoPublicacion: (estadoPublicacion === 'publicado' ? 'Publicado' : 
                       estadoPublicacion === 'borrador' ? 'Borrador' : 
                       'Pendiente') as 'Publicado' | 'Pendiente' | 'Borrador',
    productoOriginal: producto, // Guardar producto original para actualizar
  }
}

interface ProductRequestsListingProps {
  productos?: any[]
  error?: string | null
}

const priceRangeFilterFn: FilterFn<any> = (row, columnId, value) => {
  const price = row.getValue<number>(columnId)
  if (!value) return true
  if (value === '500+') return price > 500
  const [min, max] = value.split('-').map(Number)
  return price >= min && price <= max
}

const columnHelper = createColumnHelper<ProductTypeExtended>()

const ProductRequestsListing = ({ productos, error }: ProductRequestsListingProps = {}) => {
  const mappedProducts = useMemo(() => {
    if (productos && productos.length > 0) {
      console.log('[ProductRequestsListing] Productos recibidos:', productos.length)
      const mapped = productos.map(mapStrapiProductToProductType)
      console.log('[ProductRequestsListing] Productos mapeados:', mapped.length)
      return mapped
    }
    console.log('[ProductRequestsListing] No hay productos de Strapi, usando datos de ejemplo')
    return productData.map((p) => ({ ...p, estadoPublicacion: 'Pendiente' as const }))
  }, [productos])

  // Estado para el modal de cambio de estado
  const [showChangeStatusModal, setShowChangeStatusModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<ProductTypeExtended | null>(null)

  const columns: ColumnDef<ProductTypeExtended, any>[] = [
    {
      id: 'select',
      maxSize: 45,
      size: 45,
      header: ({ table }: { table: TableType<ProductTypeExtended> }) => (
        <input
          type="checkbox"
          className="form-check-input form-check-input-light fs-14"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row }: { row: TableRow<ProductTypeExtended> }) => (
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
      header: 'Product',
      cell: ({ row }) => {
        const imageSrc = typeof row.original.image === 'object' && 'src' in row.original.image
          ? row.original.image.src
          : null
        
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
                <p className="text-muted mb-0 fs-xxs">by: {row.original.brand}</p>
              </div>
            </div>
          )
        }
        
        return (
          <div className="d-flex">
            <div className="avatar-md me-3">
              <Image 
                src={imageSrc} 
                alt={row.original.name || 'Product'} 
                height={36} 
                width={36} 
                className="img-fluid rounded"
                unoptimized={imageSrc.startsWith('http')}
              />
            </div>
            <div>
              <h5 className="mb-0">
                <Link href={row.original.url} className="link-reset">
                  {row.original.name || 'Sin nombre'}
                </Link>
              </h5>
              <p className="text-muted mb-0 fs-xxs">by: {row.original.brand || 'Sin autor'}</p>
            </div>
          </div>
        )
      },
    }),
    columnHelper.accessor('code', { header: 'SKU' }),
    columnHelper.accessor('category', {
      header: 'Categoría',
      filterFn: 'equalsString',
      enableColumnFilter: true,
    }),
    columnHelper.accessor('stock', { header: 'Stock' }),
    columnHelper.accessor('price', {
      header: 'Precio',
      filterFn: priceRangeFilterFn,
      enableColumnFilter: true,
      cell: ({ row }) => (
        <>
          {currency}
          {row.original.price}
        </>
      ),
    }),
    columnHelper.accessor('sold', { header: 'Vendidos' }),
    columnHelper.accessor('rating', {
      header: 'Calificación',
      cell: ({ row }) => (
        <>
          <Rating rating={row.original.rating} />
          <span className="ms-1">
            <Link href="" className="link-reset fw-semibold">
              ({row.original.reviews})
            </Link>
          </span>
        </>
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
    columnHelper.accessor('status', {
      header: 'Estado',
      filterFn: 'equalsString',
      enableColumnFilter: true,
      cell: ({ row }) => {
        const statusText = row.original.status === 'published' ? 'Publicado' : 
                          row.original.status === 'pending' ? 'Pendiente' : 'Rechazado'
        return (
          <span
            className={`badge ${row.original.status === 'published' ? 'badge-soft-success' : row.original.status === 'pending' ? 'badge-soft-warning' : 'badge-soft-danger'} fs-xxs`}>
            {statusText}
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
      cell: ({ row }: { row: TableRow<ProductTypeExtended> }) => (
        <div className="d-flex gap-1">
          <Link href={row.original.url}>
            <Button variant="default" size="sm" className="btn-icon rounded-circle" title="Ver">
              <TbEye className="fs-lg" />
            </Button>
          </Link>
          <Link href={`/products/${row.original.strapiId || row.original.code}`}>
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
              setSelectedProduct(row.original)
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

  const [data, setData] = useState<ProductTypeExtended[]>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 })

  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({})

  // Estado para el orden de columnas
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('product-requests-column-order')
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
      localStorage.setItem('product-requests-column-order', JSON.stringify(newOrder))
    }
  }

  // Actualizar datos cuando cambien los productos de Strapi
  useEffect(() => {
    setData(mappedProducts)
  }, [mappedProducts])

  const table = useReactTable<ProductTypeExtended>({
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
    filterFns: {
      priceRange: priceRangeFilterFn,
    },
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

  const handleDelete = () => {
    const selectedIds = new Set(Object.keys(selectedRowIds))
    setData((old) => old.filter((_, idx) => !selectedIds.has(idx.toString())))
    setSelectedRowIds({})
    setPagination({ ...pagination, pageIndex: 0 })
    setShowDeleteModal(false)
  }

  // Manejar cambio de estado
  const handleChangeStatus = async (newStatus: string) => {
    if (!selectedProduct || !selectedProduct.strapiId) {
      throw new Error('Producto no válido')
    }

    // IMPORTANTE: Strapi espera valores en minúsculas: "pendiente", "publicado", "borrador"
    const newStatusLower = newStatus.toLowerCase()

    try {
      const response = await fetch(`/api/tienda/productos/${selectedProduct.strapiId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          estado_publicacion: newStatusLower, // Enviar en minúsculas
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al actualizar el estado')
      }

      // Actualizar el estado local (capitalizar para mostrar)
      const estadoMostrar = newStatusLower === 'publicado' ? 'Publicado' : 
                           newStatusLower === 'borrador' ? 'Borrador' : 
                           'Pendiente'
      setData((old) => old.map((p) => {
        if (p.strapiId === selectedProduct.strapiId) {
          return { ...p, estadoPublicacion: estadoMostrar as 'Publicado' | 'Pendiente' | 'Borrador' }
        }
        return p
      }))

      // Recargar la página para obtener datos actualizados desde Strapi
      window.location.reload()
    } catch (error: any) {
      console.error('[ProductRequestsListing] Error al cambiar estado:', error)
      throw error
    }
  }

  const hasError = !!error
  const hasData = mappedProducts.length > 0
  
  if (hasError && !hasData) {
    return (
      <Row>
        <Col xs={12}>
          <Alert variant="warning">
            <strong>Error al cargar productos desde Strapi:</strong> {error}
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
                  placeholder="Buscar nombre de producto..."
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
                  value={(table.getColumn('category')?.getFilterValue() as string) ?? 'All'}
                  onChange={(e) => table.getColumn('category')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)}>
                  <option value="All">Categoría</option>
                  <option value="Plan Lector">Plan Lector</option>
                  <option value="Texto Curricular">Texto Curricular</option>
                  <option value="Texto PAES">Texto PAES</option>
                  <option value="Texto Complementario">Texto Complementario</option>
                </select>
                <LuTag className="app-search-icon text-muted" />
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

              <div className="app-search">
                <select
                  className="form-select form-control my-1 my-md-0"
                  value={(table.getColumn('price')?.getFilterValue() as string) ?? ''}
                  onChange={(e) => table.getColumn('price')?.setFilterValue(e.target.value || undefined)}>
                  <option value="">Rango de Precio</option>
                  <option value="0-50">$0 - $50</option>
                  <option value="51-150">$51 - $150</option>
                  <option value="151-500">$151 - $500</option>
                  <option value="500+">$500+</option>
                </select>
                <LuDollarSign className="app-search-icon text-muted" />
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

          <DataTable<ProductTypeExtended>
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
                itemsName="productos"
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
            itemName="producto"
          />

          {selectedProduct && (
            <ChangeStatusModal
              show={showChangeStatusModal}
              onHide={() => {
                setShowChangeStatusModal(false)
                setSelectedProduct(null)
              }}
              onConfirm={handleChangeStatus}
              currentStatus={selectedProduct.estadoPublicacion || 'Pendiente'}
              productName={selectedProduct.name || 'Sin nombre'}
            />
          )}
        </Card>
      </Col>
    </Row>
  )
}

export default ProductRequestsListing

