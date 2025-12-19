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
import { TbEdit, TbEye, TbLayoutGrid, TbList, TbPlus, TbTrash } from 'react-icons/tb'

import Rating from '@/components/Rating'
import DataTable from '@/components/table/DataTable'
import DeleteConfirmationModal from '@/components/table/DeleteConfirmationModal'
import TablePagination from '@/components/table/TablePagination'
import { currency } from '@/helpers'
import { toPascalCase } from '@/helpers/casing'
import { productData, type ProductType } from '@/app/(admin)/(apps)/(ecommerce)/products/data'
import { STRAPI_API_URL } from '@/lib/strapi/config'
import { format } from 'date-fns'

// Tipo extendido para productos que pueden tener imagen como URL o StaticImageData
type ProductTypeExtended = Omit<ProductType, 'image'> & {
  image: StaticImageData | { src: string | null }
  strapiId?: number
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

// Función para mapear productos de Strapi al formato ProductType (igual que ProductosGrid)
const mapStrapiProductToProductType = (producto: any): ProductTypeExtended => {
  // Los datos pueden venir en attributes o directamente (igual que ProductosGrid)
  const attrs = producto.attributes || {}
  const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (producto as any)

  // Obtener URL de imagen (manejar datos directos o en attributes - igual que Products Grid)
  const getImageUrl = (): string | null => {
    // Acceder a portada_libro - puede venir como objeto directo o con .data
    let portada = data.portada_libro || data.PORTADA_LIBRO || data.portadaLibro
    
    // Si portada tiene .data, acceder a eso
    if (portada?.data) {
      portada = portada.data
    }
    
    // Si portada es null o undefined, retornar null (no usar imagen por defecto inexistente)
    if (!portada || portada === null) {
      return null
    }

    // Obtener la URL - puede estar en attributes o directamente
    const url = portada.attributes?.url || portada.attributes?.URL || portada.url || portada.URL
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

  // Calcular stock total (igual que ProductosGrid)
  const getStockTotal = (): number => {
    const stocks = data.STOCKS?.data || data.stocks?.data || []
    return stocks.reduce((total: number, stock: any) => {
      const cantidad = stock.attributes?.CANTIDAD || stock.attributes?.cantidad || 0
      return total + (typeof cantidad === 'number' ? cantidad : 0)
    }, 0)
  }

  // Obtener precio mínimo (igual que ProductosGrid)
  const getPrecioMinimo = (): number => {
    const precios = data.PRECIOS?.data || data.precios?.data || []
    if (precios.length === 0) return 0
    
    const preciosNumeros = precios
      .map((p: any) => p.attributes?.PRECIO || p.attributes?.precio)
      .filter((p: any): p is number => typeof p === 'number' && p > 0)
    
    return preciosNumeros.length > 0 ? Math.min(...preciosNumeros) : 0
  }

  // Buscar nombre con múltiples variaciones (igual que ProductosGrid)
  const nombre = getField(data, 'NOMBRE_LIBRO', 'nombre_libro', 'nombreLibro', 'NOMBRE', 'nombre', 'name', 'NAME') || 'Sin nombre'
  const isbn = getField(data, 'ISBN_LIBRO', 'isbn_libro', 'isbnLibro', 'ISBN', 'isbn') || ''
  const autor = data.autor_relacion?.data?.attributes?.nombre || data.autor_relacion?.data?.attributes?.NOMBRE || 'Sin autor'
  const editorial = data.editorial?.data?.attributes?.nombre || data.editorial?.data?.attributes?.NOMBRE || 'Sin editorial'
  const tipoLibro = getField(data, 'TIPO_LIBRO', 'tipo_libro', 'tipoLibro') || 'Sin categoría'
  const isPublished = !!(attrs.publishedAt || (producto as any).publishedAt)
  const createdAt = attrs.createdAt || (producto as any).createdAt || new Date().toISOString()
  const createdDate = new Date(createdAt)

  // Obtener estado_publicacion
  const estadoPublicacion = getField(data, 'estado_publicacion', 'ESTADO_PUBLICACION', 'estadoPublicacion') || 'Pendiente'

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
    // Usar el ID numérico si existe, sino documentId, sino el id tal cual
    url: `/products/${producto.id || producto.documentId || producto.id}`,
    strapiId: producto.id,
    estadoPublicacion: estadoPublicacion as 'Publicado' | 'Pendiente' | 'Borrador',
  }
}

interface ProductsListingProps {
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

const ProductsListing = ({ productos, error }: ProductsListingProps = {}) => {
  // Mapear productos de Strapi al formato ProductType si están disponibles
  const mappedProducts = useMemo(() => {
    if (productos && productos.length > 0) {
      console.log('[ProductsListing] Productos recibidos:', productos.length)
      console.log('[ProductsListing] Primer producto estructura completa:', JSON.stringify(productos[0], null, 2))
      const mapped = productos.map(mapStrapiProductToProductType)
      console.log('[ProductsListing] Productos mapeados:', mapped.length)
      console.log('[ProductsListing] Primer producto mapeado:', mapped[0])
      console.log('[ProductsListing] Imagen del primer producto:', mapped[0]?.image)
      return mapped
    }
    console.log('[ProductsListing] No hay productos de Strapi, usando datos de ejemplo')
    return productData
  }, [productos])

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
                onError={(e) => {
                  console.error('[ProductsListing] Error al cargar imagen:', imageSrc, e)
                }}
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
      cell: ({ row }: { row: TableRow<ProductTypeExtended> }) => (
        <div className="d-flex  gap-1">
          <Link href={row.original.url}>
            <Button variant="default" size="sm" className="btn-icon rounded-circle">
              <TbEye className="fs-lg" />
            </Button>
          </Link>
          <Link href={`/products/${row.original.strapiId || row.original.code}`}>
            <Button variant="default" size="sm" className="btn-icon rounded-circle">
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

  const [data, setData] = useState<ProductTypeExtended[]>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 })

  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({})

  // Estado para el orden de columnas
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('products-column-order')
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
      localStorage.setItem('products-column-order', JSON.stringify(newOrder))
    }
  }

  // Actualizar datos cuando cambien los productos de Strapi
  useEffect(() => {
    console.log('[ProductsListing] useEffect - productos:', productos?.length, 'mappedProducts:', mappedProducts.length)
    setData(mappedProducts)
    console.log('[ProductsListing] Datos actualizados. Total:', mappedProducts.length)
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

  // Mostrar error si existe, pero continuar mostrando los datos de ejemplo si hay
  // Esto permite que la aplicación siga funcionando aunque Strapi falle
  const hasError = !!error
  const hasData = mappedProducts.length > 0
  
  if (hasError && !hasData) {
    return (
      <Row>
        <Col xs={12}>
          <Alert variant="warning">
            <strong>Error al cargar productos desde Strapi:</strong> {error}
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
    console.warn('[ProductsListing] Error al cargar desde Strapi, usando datos disponibles:', error)
  }

  // Debug: mostrar información sobre los datos
  console.log('[ProductsListing] Render - data.length:', data.length, 'mappedProducts.length:', mappedProducts.length, 'productos:', productos?.length)

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
                  <option value="Electronics">Electrónica</option>
                  <option value="Fashion">Moda</option>
                  <option value="Home">Hogar</option>
                  <option value="Sports">Deportes</option>
                  <option value="Beauty">Belleza</option>
                </select>
                <LuTag className="app-search-icon text-muted" />
              </div>

              <div className="app-search">
                <select
                  className="form-select form-control my-1 my-md-0"
                  value={(table.getColumn('status')?.getFilterValue() as string) ?? 'All'}
                  onChange={(e) => table.getColumn('status')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)}>
                  <option value="All">Estado</option>
                  <option value="published">Publicado</option>
                  <option value="pending">Pendiente</option>
                  <option value="rejected">Rechazado</option>
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
                  {[5, 8,10, 15, 20].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="d-flex gap-1">
              <Link passHref href="/products-grid">
                <Button variant="outline-primary" className="btn-icon btn-soft-primary">
                  <TbLayoutGrid className="fs-lg" />
                </Button>
              </Link>
              <Button variant="primary" className="btn-icon">
                <TbList className="fs-lg" />
              </Button>
              <Link href="/add-product" passHref>
                <Button variant="danger" className="ms-1">
                  <TbPlus className="fs-sm me-2" /> Agregar Producto
                </Button>
              </Link>
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
            itemName="product"
          />
        </Card>
      </Col>
    </Row>
  )
}

export default ProductsListing
