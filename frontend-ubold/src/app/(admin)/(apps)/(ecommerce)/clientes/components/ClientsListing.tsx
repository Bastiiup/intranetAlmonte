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
import { useState, useEffect, useMemo } from 'react'
import { Button, Card, CardFooter, CardHeader, Col, Row, Alert } from 'react-bootstrap'
import { LuDollarSign, LuSearch, LuUser } from 'react-icons/lu'
import { TbEdit, TbList, TbPlus, TbTrash } from 'react-icons/tb'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import DataTable from '@/components/table/DataTable'
import DeleteConfirmationModal from '@/components/table/DeleteConfirmationModal'
import TablePagination from '@/components/table/TablePagination'
import EditClienteModal from './EditClienteModal'
import { currency } from '@/helpers'
import { format } from 'date-fns'

// Tipo para clientes desde Strapi
type ClienteType = {
  id: number
  nombre: string
  correo_electronico: string
  telefono?: string
  direccion?: string
  pedidos: number
  gasto_total: number
  fecha_registro: string
  ultima_actividad?: string
  createdAt: string
  strapiId?: number
  woocommerce_id?: number | string
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

// Función para mapear clientes de Strapi al formato ClienteType
const mapStrapiClienteToClienteType = (cliente: any): ClienteType => {
  // Los datos pueden venir en attributes o directamente
  const attrs = cliente.attributes || {}
  const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (cliente as any)

  // Buscar nombre con múltiples variaciones
  const nombre = getField(data, 'nombre', 'NOMBRE', 'name', 'NAME') || 'Sin nombre'
  const correo = getField(data, 'correo_electronico', 'CORREO_ELECTRONICO', 'email', 'EMAIL') || 'Sin email'
  
  // Buscar teléfono primero en los datos directos, luego en Persona relacionada
  let telefono = getField(data, 'telefono', 'TELEFONO', 'phone', 'PHONE') || ''
  
  // Si no hay teléfono en los datos directos, buscarlo en la Persona relacionada
  if (!telefono) {
    const persona = attrs.persona?.data || attrs.persona || cliente.persona?.data || cliente.persona
    if (persona) {
      const personaAttrs = persona.attributes || persona
      const telefonos = personaAttrs.telefonos || persona.telefonos
      if (telefonos && Array.isArray(telefonos) && telefonos.length > 0) {
        // Tomar el primer teléfono disponible
        const primerTelefono = telefonos[0]
        telefono = typeof primerTelefono === 'string' 
          ? primerTelefono 
          : (primerTelefono.numero || primerTelefono.telefono || primerTelefono.value || '')
      }
    }
  }
  
  const direccion = getField(data, 'direccion', 'DIRECCION', 'address', 'ADDRESS') || ''
  
  // Obtener pedidos y gasto_total
  const pedidos = typeof data.pedidos === 'number' ? data.pedidos : (typeof data.pedidos === 'string' ? parseInt(data.pedidos) || 0 : 0)
  const gastoTotal = typeof data.gasto_total === 'number' ? data.gasto_total : (typeof data.gasto_total === 'string' ? parseFloat(data.gasto_total) || 0 : 0)
  
  // Fechas
  const fechaRegistro = getField(data, 'fecha_registro', 'FECHA_REGISTRO', 'fechaRegistro') || attrs.createdAt || cliente.createdAt || new Date().toISOString()
  const ultimaActividad = getField(data, 'ultima_actividad', 'ULTIMA_ACTIVIDAD', 'ultimaActividad') || ''
  const createdAt = attrs.createdAt || cliente.createdAt || new Date().toISOString()

  // Obtener woocommerce_id
  const woocommerceId = getField(data, 'woocommerce_id', 'woocommerceId', 'WOCOMMERCE_ID')

  return {
    id: cliente.id || cliente.documentId || 0,
    nombre,
    correo_electronico: correo,
    telefono,
    direccion,
    pedidos,
    gasto_total: gastoTotal,
    fecha_registro: fechaRegistro,
    ultima_actividad: ultimaActividad,
    createdAt,
    strapiId: cliente.id,
    woocommerce_id: woocommerceId,
  }
}

interface ClientsListingProps {
  clientes?: any[]
  error?: string | null
}

const gastoRangeFilterFn: FilterFn<any> = (row, columnId, value) => {
  const gasto = row.getValue<number>(columnId)
  if (!value) return true
  if (value === '1000+') return gasto > 1000
  const [min, max] = value.split('-').map(Number)
  return gasto >= min && gasto <= max
}

const columnHelper = createColumnHelper<ClienteType>()

const ClientsListing = ({ clientes, error }: ClientsListingProps = {}) => {
  const router = useRouter()
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedCliente, setSelectedCliente] = useState<ClienteType | null>(null)

  // Mapear clientes de Strapi al formato ClienteType si están disponibles
  const mappedClients = useMemo(() => {
    if (clientes && clientes.length > 0) {
      console.log('[ClientsListing] Clientes recibidos:', clientes.length)
      console.log('[ClientsListing] Primer cliente estructura completa:', JSON.stringify(clientes[0], null, 2))
      const mapped = clientes.map(mapStrapiClienteToClienteType)
      console.log('[ClientsListing] Clientes mapeados:', mapped.length)
      console.log('[ClientsListing] Primer cliente mapeado:', mapped[0])
      return mapped
    }
    console.log('[ClientsListing] No hay clientes de Strapi')
    return []
  }, [clientes])

  const columns: ColumnDef<ClienteType, any>[] = [
    {
      id: 'select',
      maxSize: 45,
      size: 45,
      header: ({ table }: { table: TableType<ClienteType> }) => (
        <input
          type="checkbox"
          className="form-check-input form-check-input-light fs-14"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row }: { row: TableRow<ClienteType> }) => (
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
    columnHelper.accessor('nombre', {
      header: 'Cliente',
      cell: ({ row }) => (
        <div className="d-flex">
          <div className="avatar-md me-3 bg-light d-flex align-items-center justify-content-center rounded">
            <LuUser className="text-muted fs-lg" />
          </div>
          <div>
            <h5 className="mb-0">
              {row.original.nombre || 'Sin nombre'}
            </h5>
            <p className="text-muted mb-0 fs-xxs">{row.original.correo_electronico}</p>
          </div>
        </div>
      ),
    }),
    columnHelper.accessor('correo_electronico', { 
      header: 'Email',
      cell: ({ row }) => (
        <a href={`mailto:${row.original.correo_electronico}`} className="text-reset">
          {row.original.correo_electronico}
        </a>
      ),
    }),
    columnHelper.accessor('telefono', { 
      header: 'Teléfono',
      cell: ({ row }) => row.original.telefono || 'N/A',
    }),
    columnHelper.accessor('pedidos', { 
      header: 'Pedidos',
      cell: ({ row }) => row.original.pedidos || 0,
    }),
    columnHelper.accessor('gasto_total', {
      header: 'Total Gastado',
      filterFn: gastoRangeFilterFn,
      enableColumnFilter: true,
      cell: ({ row }) => (
        <>
          {currency}
          {row.original.gasto_total || 0}
        </>
      ),
    }),
    columnHelper.accessor('fecha_registro', {
      header: 'Fecha Registro',
      cell: ({ row }) => {
        try {
          const fecha = new Date(row.original.fecha_registro)
          return (
            <>
              {format(fecha, 'dd MMM, yyyy')} <small className="text-muted">{format(fecha, 'h:mm a')}</small>
            </>
          )
        } catch {
          return row.original.fecha_registro || 'N/A'
        }
      },
    }),
    columnHelper.accessor('ultima_actividad', {
      header: 'Última Actividad',
      cell: ({ row }) => {
        if (!row.original.ultima_actividad) return 'N/A'
        try {
          const fecha = new Date(row.original.ultima_actividad)
          return format(fecha, 'dd MMM, yyyy')
        } catch {
          return row.original.ultima_actividad
        }
      },
    }),
    {
      header: 'Acciones',
      cell: ({ row }: { row: TableRow<ClienteType> }) => (
        <div className="d-flex gap-1">
          <Button
            variant="default"
            size="sm"
            className="btn-icon rounded-circle"
            title="Editar"
            onClick={() => {
              setSelectedCliente(row.original)
              setShowEditModal(true)
            }}>
            <TbEdit className="fs-lg" />
          </Button>
          <Button
            variant="default"
            size="sm"
            className="btn-icon rounded-circle"
            title="Eliminar"
            onClick={() => {
              setSelectedCliente(row.original)
              toggleDeleteModal()
              setSelectedRowIds({ [row.id]: true })
            }}>
            <TbTrash className="fs-lg" />
          </Button>
        </div>
      ),
    },
  ]

  const [data, setData] = useState<ClienteType[]>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 })

  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({})

  // Estado para el orden de columnas
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('clientes-column-order')
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
      localStorage.setItem('clientes-column-order', JSON.stringify(newOrder))
    }
  }

  // Actualizar datos cuando cambien los clientes de Strapi
  useEffect(() => {
    console.log('[ClientsListing] useEffect - clientes:', clientes?.length, 'mappedClients:', mappedClients.length)
    setData(mappedClients)
    console.log('[ClientsListing] Datos actualizados. Total:', mappedClients.length)
  }, [mappedClients])

  const table = useReactTable<ClienteType>({
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
      gastoRange: gastoRangeFilterFn,
    },
  })

  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const totalItems = table.getFilteredRowModel().rows.length

  const start = pageIndex * pageSize + 1
  const end = Math.min(start + pageSize - 1, totalItems)

  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false)
  const [deleting, setDeleting] = useState(false)

  const toggleDeleteModal = () => {
    setShowDeleteModal(!showDeleteModal)
  }

  const handleDelete = async () => {
    if (!selectedCliente) return

    // Usar email como identificador si no hay woocommerce_id (la API buscará por email)
    const clienteIdentifier = selectedCliente.woocommerce_id || selectedCliente.correo_electronico
    if (!clienteIdentifier) {
      alert('No se puede eliminar: el cliente no tiene email ni ID de WooCommerce')
      setShowDeleteModal(false)
      setSelectedCliente(null)
      return
    }

    setDeleting(true)
    try {
      // Usar email como identificador si no es un ID numérico
      const identifier = typeof clienteIdentifier === 'number' || (typeof clienteIdentifier === 'string' && !clienteIdentifier.includes('@'))
        ? clienteIdentifier.toString()
        : selectedCliente.correo_electronico
      
      const response = await fetch(`/api/woocommerce/customers/${identifier}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al eliminar el cliente')
      }

      // Refrescar la página para actualizar la lista
      router.refresh()
      setSelectedRowIds({})
      setSelectedCliente(null)
      setShowDeleteModal(false)
    } catch (err: any) {
      console.error('Error al eliminar cliente:', err)
      alert(err.message || 'Error al eliminar el cliente')
    } finally {
      setDeleting(false)
    }
  }

  const handleEditSave = () => {
    // Refrescar la página para actualizar la lista
    router.refresh()
  }

  // Mostrar error si existe
  const hasError = !!error
  const hasData = mappedClients.length > 0
  
  if (hasError && !hasData) {
    return (
      <Row>
        <Col xs={12}>
          <Alert variant="warning">
            <strong>Error al cargar clientes desde Strapi:</strong> {error}
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
    console.warn('[ClientsListing] Error al cargar desde Strapi, usando datos disponibles:', error)
  }

  // Debug: mostrar información sobre los datos
  console.log('[ClientsListing] Render - data.length:', data.length, 'mappedClients.length:', mappedClients.length, 'clientes:', clientes?.length)

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
                  placeholder="Buscar cliente por nombre o email..."
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
                  value={(table.getColumn('gasto_total')?.getFilterValue() as string) ?? ''}
                  onChange={(e) => table.getColumn('gasto_total')?.setFilterValue(e.target.value || undefined)}>
                  <option value="">Rango de Gasto</option>
                  <option value="0-100">$0 - $100</option>
                  <option value="101-500">$101 - $500</option>
                  <option value="501-1000">$501 - $1,000</option>
                  <option value="1000+">$1,000+</option>
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
              <Link href="/clientes/agregar">
                <Button variant="primary" className="btn-icon">
                  <TbPlus className="fs-lg" />
                </Button>
              </Link>
            </div>
          </CardHeader>

          <DataTable<ClienteType>
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
                itemsName="clientes"
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
            itemName="cliente"
          />

          <EditClienteModal
            show={showEditModal}
            onHide={() => {
              setShowEditModal(false)
              setSelectedCliente(null)
            }}
            cliente={selectedCliente}
            onSave={handleEditSave}
          />
        </Card>
      </Col>
    </Row>
  )
}

export default ClientsListing

