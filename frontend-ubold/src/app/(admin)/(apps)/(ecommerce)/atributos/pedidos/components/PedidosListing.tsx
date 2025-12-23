'use client'

import {
  ColumnDef,
  ColumnFiltersState,
  createColumnHelper,
  ExpandedState,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  Row as TableRow,
  Table as TableType,
  useReactTable,
} from '@tanstack/react-table'
import Link from 'next/link'
import React, { useState, useEffect, useMemo } from 'react'
import { Button, Card, CardBody, CardFooter, CardHeader, Col, Row, Alert, Badge, FormControl, FormLabel, FormGroup } from 'react-bootstrap'
import { LuSearch } from 'react-icons/lu'
import { TbChevronDown, TbChevronRight, TbList, TbPlus, TbTrash } from 'react-icons/tb'

import DeleteConfirmationModal from '@/components/table/DeleteConfirmationModal'
import TablePagination from '@/components/table/TablePagination'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'

// Tipo para la tabla
type PedidoType = {
  id: number
  numero_pedido: string
  nombre_cliente: string
  fecha_pedido: string | null
  estado: string
  total: number | null
  subtotal: number | null
  impuestos: number | null
  envio: number | null
  descuento: number | null
  moneda: string
  origen: string
  originPlatform: string
  date: string
  time: string
  url: string
  // Datos completos del pedido original para la vista expandida
  rawData?: any
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

// Función helper para mapear estado de WooCommerce (inglés) a estado de Strapi (español)
const mapEstadoFromWoo = (wooStatus: string): string => {
  const mapping: Record<string, string> = {
    'pending': 'pendiente',
    'processing': 'procesando',
    'on-hold': 'en_espera',
    'completed': 'completado',
    'cancelled': 'cancelado',
    'refunded': 'reembolsado',
    'failed': 'fallido',
    'auto-draft': 'pendiente',
    'checkout-draft': 'pendiente',
  }
  
  const statusLower = wooStatus.toLowerCase().trim()
  return mapping[statusLower] || wooStatus // Si no está en el mapeo, devolver el original
}

// Función para mapear pedidos de Strapi al formato PedidoType
const mapStrapiPedidoToPedidoType = (pedido: any): PedidoType => {
  const attrs = pedido.attributes || {}
  const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (pedido as any)

  const numeroPedido = getField(data, 'numero_pedido', 'numeroPedido', 'NUMERO_PEDIDO') || 'Sin número'
  const fechaPedido = getField(data, 'fecha_pedido', 'fechaPedido', 'FECHA_PEDIDO')
  // Mapear estado de inglés (WooCommerce) a español para el frontend
  const estadoRaw = getField(data, 'estado', 'ESTADO') || 'pending'
  const estado = mapEstadoFromWoo(estadoRaw)
  const total = getField(data, 'total', 'TOTAL')
  const subtotal = getField(data, 'subtotal', 'SUBTOTAL')
  const impuestos = getField(data, 'impuestos', 'IMPUESTOS')
  const envio = getField(data, 'envio', 'ENVIO')
  const descuento = getField(data, 'descuento', 'DESCUENTO')
  const moneda = getField(data, 'moneda', 'MONEDA') || 'CLP'
  const origen = getField(data, 'origen', 'ORIGEN') || 'woocommerce'
  // originPlatform es un campo directo en Strapi (Enumeration)
  // Puede estar en: originPlatform, externalIds.originPlatform, o en el objeto raíz
  const originPlatformDirect = getField(data, 'originPlatform', 'origin_platform', 'ORIGIN_PLATFORM')
  const originPlatformFromExternalIds = data?.externalIds?.originPlatform || (data?.externalIds && typeof data.externalIds === 'object' ? (data.externalIds as any).originPlatform : null)
  const originPlatform = originPlatformDirect || originPlatformFromExternalIds || 'woo_moraleja'
  
  // Obtener nombre del cliente desde billing o cliente
  let nombreCliente = ''
  const billing = getField(data, 'billing', 'BILLING')
  const cliente = getField(data, 'cliente', 'CLIENTE')
  
  if (billing && typeof billing === 'object') {
    const firstName = billing.first_name || ''
    const lastName = billing.last_name || ''
    nombreCliente = `${firstName} ${lastName}`.trim()
  } else if (cliente) {
    if (typeof cliente === 'object') {
      nombreCliente = cliente.nombre || cliente.name || cliente.razon_social || ''
    } else {
      nombreCliente = String(cliente)
    }
  }
  
  // Si no hay nombre, intentar desde rawWooData
  if (!nombreCliente) {
    const rawWooData = getField(data, 'rawWooData', 'rawWooData')
    if (rawWooData && rawWooData.billing) {
      const firstName = rawWooData.billing.first_name || ''
      const lastName = rawWooData.billing.last_name || ''
      nombreCliente = `${firstName} ${lastName}`.trim()
    }
  }
  
  // Obtener fechas
  const createdAt = attrs.createdAt || (pedido as any).createdAt || fechaPedido || new Date().toISOString()
  const createdDate = new Date(createdAt)
  
  return {
    id: pedido.id || pedido.documentId || pedido.id,
    numero_pedido: numeroPedido,
    nombre_cliente: nombreCliente || 'Sin cliente',
    fecha_pedido: fechaPedido || null,
    estado,
    total: total ? parseFloat(total) : null,
    subtotal: subtotal ? parseFloat(subtotal) : null,
    impuestos: impuestos ? parseFloat(impuestos) : null,
    envio: envio ? parseFloat(envio) : null,
    descuento: descuento ? parseFloat(descuento) : null,
    moneda,
    origen,
    originPlatform,
    date: format(createdDate, 'dd MMM, yyyy'),
    time: format(createdDate, 'h:mm a'),
    url: `/atributos/pedidos/${pedido.id || pedido.documentId || pedido.id}`,
    rawData: pedido, // Guardar datos completos para la vista expandida
  }
}

interface PedidosListingProps {
  pedidos?: any[]
  error?: string | null
}

const columnHelper = createColumnHelper<PedidoType>()

const PedidosListing = ({ pedidos, error }: PedidosListingProps = {}) => {
  const router = useRouter()
  
  const mappedPedidos = useMemo(() => {
    if (pedidos && pedidos.length > 0) {
      console.log('[PedidosListing] Pedidos recibidos:', pedidos.length)
      const mapped = pedidos.map(mapStrapiPedidoToPedidoType)
      console.log('[PedidosListing] Pedidos mapeados:', mapped.length)
      return mapped
    }
    console.log('[PedidosListing] No hay pedidos de Strapi')
    return []
  }, [pedidos])

  const columns: ColumnDef<PedidoType, any>[] = [
    {
      id: 'expander',
      maxSize: 45,
      size: 45,
      header: () => null,
      cell: ({ row }: { row: TableRow<PedidoType> }) => (
        <Button
          variant="link"
          size="sm"
          className="p-0"
          onClick={() => row.toggleExpanded()}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {row.getIsExpanded() ? (
            <TbChevronDown className="fs-lg" />
          ) : (
            <TbChevronRight className="fs-lg" />
          )}
        </Button>
      ),
      enableSorting: false,
      enableColumnFilter: false,
    },
    {
      id: 'select',
      maxSize: 45,
      size: 45,
      header: ({ table }: { table: TableType<PedidoType> }) => (
        <input
          type="checkbox"
          className="form-check-input form-check-input-light fs-14"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row }: { row: TableRow<PedidoType> }) => (
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
    columnHelper.accessor((row) => `${row.numero_pedido || ''} ${row.nombre_cliente || ''}`.toLowerCase(), {
      id: 'numero_pedido',
      header: 'Pedido',
      cell: ({ row }) => {
        const numeroPedido = row.original.numero_pedido || 'Sin número'
        const nombreCliente = row.original.nombre_cliente || 'Sin cliente'
        return (
          <div className="d-flex align-items-center">
            <div className="avatar-md me-3 bg-light d-flex align-items-center justify-center rounded">
              <span className="text-muted fs-xs">📦</span>
            </div>
            <div>
              <h5 className="mb-0">
                <span className="link-reset" style={{ cursor: 'pointer' }} onClick={() => row.toggleExpanded()}>
                  #{numeroPedido} {nombreCliente}
                </span>
              </h5>
            </div>
          </div>
        )
      },
    }),
    columnHelper.accessor('fecha_pedido', {
      header: 'Fecha',
      cell: ({ row }) => {
        if (!row.original.fecha_pedido) return <span className="text-muted">-</span>
        const fecha = new Date(row.original.fecha_pedido)
        return <span className="text-muted">{format(fecha, 'dd MMM, yyyy')}</span>
      },
    }),
    columnHelper.accessor('estado', {
      header: 'Estado',
      filterFn: 'equalsString',
      enableColumnFilter: true,
      cell: ({ row }) => {
        const estado = row.original.estado
        let variant: string
        let label: string
        switch (estado) {
          case 'pendiente':
            variant = 'warning'
            label = 'Pendiente'
            break
          case 'procesando':
            variant = 'info'
            label = 'Procesando'
            break
          case 'en_espera':
            variant = 'secondary'
            label = 'En Espera'
            break
          case 'completado':
            variant = 'success'
            label = 'Completado'
            break
          case 'cancelado':
            variant = 'danger'
            label = 'Cancelado'
            break
          case 'reembolsado':
            variant = 'dark'
            label = 'Reembolsado'
            break
          case 'fallido':
            variant = 'danger'
            label = 'Fallido'
            break
          default:
            variant = 'secondary'
            label = estado
            break
        }
        return <Badge bg={variant}>{label}</Badge>
      },
    }),
    columnHelper.accessor('total', {
      header: 'Total',
      cell: ({ row }) => {
        const total = row.original.total
        const moneda = row.original.moneda || 'CLP'
        if (!total) return <span className="text-muted">-</span>
        return <span className="fw-semibold">${total.toLocaleString()} {moneda}</span>
      },
    }),
    columnHelper.accessor('originPlatform', {
      header: 'Plataforma',
      cell: ({ row }) => {
        const platform = row.original.originPlatform
        let variant: string
        switch (platform) {
          case 'woo_moraleja':
            variant = 'info'
            break
          case 'woo_escolar':
            variant = 'primary'
            break
          case 'otros':
          default:
            variant = 'secondary'
            break
        }
        return <Badge bg={variant}>{platform.replace('woo_', 'WooCommerce ').replace('_', ' ').toUpperCase()}</Badge>
      },
    }),
    columnHelper.accessor('date', {
      header: 'Creado',
      cell: ({ row }) => (
        <>
          {row.original.date} <small className="text-muted">{row.original.time}</small>
        </>
      ),
    }),
    {
      header: 'Acciones',
      cell: ({ row }: { row: TableRow<PedidoType> }) => (
        <div className="d-flex gap-1">
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

  const [data, setData] = useState<PedidoType[]>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 })
  const [expanded, setExpanded] = useState<ExpandedState>({})

  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({})
  const [updatingStates, setUpdatingStates] = useState<Record<string, boolean>>({})

  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pedidos-column-order')
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

  const handleColumnOrderChange = (newOrder: string[]) => {
    setColumnOrder(newOrder)
    if (typeof window !== 'undefined') {
      localStorage.setItem('pedidos-column-order', JSON.stringify(newOrder))
    }
  }

  useEffect(() => {
    console.log('[PedidosListing] useEffect - pedidos:', pedidos?.length, 'mappedPedidos:', mappedPedidos.length)
    setData(mappedPedidos)
    console.log('[PedidosListing] Datos actualizados. Total:', mappedPedidos.length)
  }, [mappedPedidos, pedidos])

  const table = useReactTable<PedidoType>({
    data,
    columns,
    state: { 
      sorting, 
      globalFilter, 
      columnFilters, 
      pagination, 
      rowSelection: selectedRowIds, 
      columnOrder,
      expanded,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    onRowSelectionChange: setSelectedRowIds,
    onColumnOrderChange: setColumnOrder,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
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
    const selectedRowIdsArray = Object.keys(selectedRowIds)
    const idsToDelete = selectedRowIdsArray
      .map(rowId => {
        const row = table.getRow(rowId)
        return row?.original?.id
      })
      .filter(Boolean)
    
    if (idsToDelete.length === 0) {
      alert('No se seleccionaron pedidos para eliminar')
      return
    }
    
    try {
      for (const pedidoId of idsToDelete) {
        const response = await fetch(`/api/tienda/pedidos/${pedidoId}`, {
          method: 'DELETE',
        })
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `Error al eliminar pedido ${pedidoId}`)
        }
      }
      
      // Actualizar datos eliminando los pedidos eliminados
      setData((old) => old.filter(pedido => !idsToDelete.includes(pedido.id)))
      setSelectedRowIds({})
      setPagination({ ...pagination, pageIndex: 0 })
      setShowDeleteModal(false)
      
      // Recargar la página para obtener datos actualizados
      router.refresh()
    } catch (error: any) {
      console.error('Error al eliminar pedidos:', error)
      alert(`Error al eliminar los pedidos seleccionados: ${error.message || 'Error desconocido'}`)
    }
  }

  const handleEstadoChange = async (pedidoId: number, nuevoEstado: string) => {
    setUpdatingStates((prev) => ({ ...prev, [pedidoId]: true }))
    
    try {
      const response = await fetch(`/api/tienda/pedidos/${pedidoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            estado: nuevoEstado,
          },
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al actualizar el estado')
      }

      // Actualizar el estado en los datos locales inmediatamente
      setData((old) =>
        old.map((pedido) =>
          pedido.id === pedidoId ? { ...pedido, estado: nuevoEstado } : pedido
        )
      )

      // Recargar los datos desde el servidor
      try {
        const refreshResponse = await fetch('/api/tienda/pedidos')
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json()
          if (refreshData.success && refreshData.data) {
            const refreshedMapped = refreshData.data.map(mapStrapiPedidoToPedidoType)
            setData(refreshedMapped)
          }
        }
      } catch (refreshError) {
        console.warn('Error al recargar datos, usando actualización local:', refreshError)
      }

      // También recargar la página para asegurar sincronización
      router.refresh()
    } catch (error: any) {
      console.error('Error al actualizar estado:', error)
      alert(`Error al actualizar el estado: ${error.message || 'Error desconocido'}`)
    } finally {
      setUpdatingStates((prev) => ({ ...prev, [pedidoId]: false }))
    }
  }

  // Componente para renderizar los detalles expandidos
  const renderExpandedContent = (row: TableRow<PedidoType>) => {
    const pedido = row.original
    const rawData = pedido.rawData
    const attrs = rawData?.attributes || {}
    const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (rawData || {})

    const cliente = getField(data, 'cliente', 'CLIENTE')
    const items = getField(data, 'items', 'ITEMS') || []
    const billing = getField(data, 'billing', 'BILLING') || {}
    const shipping = getField(data, 'shipping', 'SHIPPING') || {}
    const metodoPago = getField(data, 'metodo_pago', 'metodoPago', 'METODO_PAGO') || ''
    const metodoPagoTitulo = getField(data, 'metodo_pago_titulo', 'metodoPagoTitulo', 'METODO_PAGO_TITULO') || ''
    const notaCliente = getField(data, 'nota_cliente', 'notaCliente', 'NOTA_CLIENTE') || ''

    return (
      <div className="p-4 bg-light border-top">
        <Row className="g-4">
          <Col md={4}>
            <Card>
              <CardHeader>
                <h6 className="mb-0">General</h6>
              </CardHeader>
              <CardBody>
                <div className="mb-3">
                  <FormLabel className="fw-semibold">Fecha de creación</FormLabel>
                  <div className="d-flex align-items-center gap-2">
                    <FormControl
                      type="date"
                      value={pedido.fecha_pedido ? new Date(pedido.fecha_pedido).toISOString().split('T')[0] : ''}
                      disabled
                      size="sm"
                    />
                    {pedido.fecha_pedido && (
                      <span className="text-muted">
                        @ {format(new Date(pedido.fecha_pedido), 'HH:mm')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="mb-3">
                  <FormLabel className="fw-semibold">Estado</FormLabel>
                  <FormControl
                    as="select"
                    value={pedido.estado}
                    onChange={(e) => handleEstadoChange(pedido.id, e.target.value)}
                    disabled={updatingStates[pedido.id]}
                    size="sm"
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="procesando">Procesando</option>
                    <option value="en_espera">En Espera</option>
                    <option value="completado">Completado</option>
                    <option value="cancelado">Cancelado</option>
                    <option value="reembolsado">Reembolsado</option>
                    <option value="fallido">Fallido</option>
                  </FormControl>
                  {updatingStates[pedido.id] && (
                    <small className="text-muted d-block mt-1">Actualizando...</small>
                  )}
                </div>
                <div>
                  <FormLabel className="fw-semibold">Cliente</FormLabel>
                  <div className="text-muted">
                    {cliente ? (typeof cliente === 'object' ? cliente.nombre || 'Cliente' : cliente) : 'Sin cliente'}
                  </div>
                </div>
              </CardBody>
            </Card>
          </Col>

          <Col md={4}>
            <Card>
              <CardHeader>
                <h6 className="mb-0">Facturación</h6>
              </CardHeader>
              <CardBody>
                {billing && typeof billing === 'object' ? (
                  <>
                    <div className="mb-2">
                      <strong>Nombre:</strong> {billing.first_name || ''} {billing.last_name || ''}
                    </div>
                    <div className="mb-2">
                      <strong>Dirección:</strong> {billing.address_1 || ''}
                      {billing.address_2 && <>, {billing.address_2}</>}
                    </div>
                    <div className="mb-2">
                      {billing.city && <>{billing.city}, </>}
                      {billing.state && <>{billing.state}, </>}
                      {billing.postcode && <>{billing.postcode}</>}
                    </div>
                    {billing.email && (
                      <div className="mb-2">
                        <strong>Email:</strong> <a href={`mailto:${billing.email}`}>{billing.email}</a>
                      </div>
                    )}
                    {billing.phone && (
                      <div>
                        <strong>Teléfono:</strong> <a href={`tel:${billing.phone}`}>{billing.phone}</a>
                      </div>
                    )}
                  </>
                ) : (
                  <span className="text-muted">Sin información de facturación</span>
                )}
              </CardBody>
            </Card>
          </Col>

          <Col md={4}>
            <Card>
              <CardHeader>
                <h6 className="mb-0">Envío</h6>
              </CardHeader>
              <CardBody>
                {shipping && typeof shipping === 'object' ? (
                  <>
                    <div className="mb-2">
                      <strong>Nombre:</strong> {shipping.first_name || ''} {shipping.last_name || ''}
                    </div>
                    <div className="mb-2">
                      <strong>Dirección:</strong> {shipping.address_1 || ''}
                      {shipping.address_2 && <>, {shipping.address_2}</>}
                    </div>
                    <div className="mb-2">
                      {shipping.city && <>{shipping.city}, </>}
                      {shipping.state && <>{shipping.state}, </>}
                      {shipping.postcode && <>{shipping.postcode}</>}
                    </div>
                  </>
                ) : (
                  <span className="text-muted">Sin información de envío</span>
                )}
                {notaCliente && (
                  <div className="mt-3 pt-3 border-top">
                    <strong>Nota del cliente:</strong>
                    <div className="text-muted small">{notaCliente}</div>
                  </div>
                )}
              </CardBody>
            </Card>
          </Col>

          <Col md={12}>
            <Card>
              <CardHeader>
                <h6 className="mb-0">Artículos</h6>
              </CardHeader>
              <CardBody>
                {items && items.length > 0 ? (
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Artículo</th>
                        <th>Precio</th>
                        <th>Cantidad</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item: any, index: number) => (
                        <tr key={index}>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="me-2">
                                <span className="text-muted">📦</span>
                              </div>
                              <div>
                                <div className="fw-semibold">{item.nombre || 'Producto'}</div>
                                {item.sku && <small className="text-muted">SKU: {item.sku}</small>}
                              </div>
                            </div>
                          </td>
                          <td>${(item.precio_unitario || 0).toLocaleString()}</td>
                          <td>x {item.cantidad || 1}</td>
                          <td className="fw-semibold">${(item.total || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <span className="text-muted">No hay artículos en este pedido</span>
                )}
              </CardBody>
            </Card>
          </Col>

          <Col md={12}>
            <Card>
              <CardBody>
                <Row>
                  <Col md={6}>
                    <div className="d-flex justify-content-between mb-2">
                      <span>Subtotal de artículos:</span>
                      <strong>${(pedido.subtotal || 0).toLocaleString()} {pedido.moneda}</strong>
                    </div>
                    {pedido.impuestos && pedido.impuestos > 0 && (
                      <div className="d-flex justify-content-between mb-2">
                        <span>Impuestos:</span>
                        <strong>${pedido.impuestos.toLocaleString()} {pedido.moneda}</strong>
                      </div>
                    )}
                    {pedido.envio && pedido.envio > 0 && (
                      <div className="d-flex justify-content-between mb-2">
                        <span>Envío:</span>
                        <strong>${pedido.envio.toLocaleString()} {pedido.moneda}</strong>
                      </div>
                    )}
                    {pedido.descuento && pedido.descuento > 0 && (
                      <div className="d-flex justify-content-between mb-2">
                        <span>Descuento:</span>
                        <strong>-${pedido.descuento.toLocaleString()} {pedido.moneda}</strong>
                      </div>
                    )}
                    <hr />
                    <div className="d-flex justify-content-between">
                      <strong>Total del pedido:</strong>
                      <strong className="fs-5">${(pedido.total || 0).toLocaleString()} {pedido.moneda}</strong>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="mb-2">
                      <strong>Método de pago:</strong> {metodoPagoTitulo || metodoPago || 'No especificado'}
                    </div>
                    <div className="mb-2">
                      <strong>Origen:</strong> <Badge bg="info">{pedido.origen || 'woocommerce'}</Badge>
                    </div>
                    <div>
                      <strong>Plataforma:</strong>{' '}
                      <Badge bg={pedido.originPlatform === 'woo_moraleja' ? 'info' : pedido.originPlatform === 'woo_escolar' ? 'primary' : 'secondary'}>
                        {pedido.originPlatform.replace('woo_', 'WooCommerce ').replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                  </Col>
                </Row>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </div>
    )
  }

  const hasError = !!error
  const hasData = mappedPedidos.length > 0
  
  if (hasError && !hasData) {
    return (
      <Row>
        <Col xs={12}>
          <Alert variant="warning">
            <strong>Error al cargar pedidos desde Strapi:</strong> {error}
          </Alert>
        </Col>
      </Row>
    )
  }
  
  if (hasError && hasData) {
    console.warn('[PedidosListing] Error al cargar desde Strapi, usando datos disponibles:', error)
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
                  placeholder="Buscar número de pedido o cliente..."
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
                  value={(table.getColumn('estado')?.getFilterValue() as string) ?? 'All'}
                  onChange={(e) => table.getColumn('estado')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)}>
                  <option value="All">Estado</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="procesando">Procesando</option>
                  <option value="en_espera">En Espera</option>
                  <option value="completado">Completado</option>
                  <option value="cancelado">Cancelado</option>
                  <option value="reembolsado">Reembolsado</option>
                  <option value="fallido">Fallido</option>
                </select>
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
              <Link href="/atributos/pedidos/sync-missing" passHref>
                <Button variant="warning" className="ms-1">
                  Sincronizar Faltantes
                </Button>
              </Link>
              <Link href="/atributos/pedidos/agregar" passHref>
                <Button variant="danger" className="ms-1">
                  <TbPlus className="fs-sm me-2" /> Agregar Pedido
                </Button>
              </Link>
            </div>
          </CardHeader>

          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                        className={header.column.getCanSort() ? 'cursor-pointer' : ''}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {header.isPlaceholder ? null : (
                          <div className="d-flex align-items-center">
                            {header.column.getCanSort() && (
                              <span className="me-1">
                                {{
                                  asc: '↑',
                                  desc: '↓',
                                }[header.column.getIsSorted() as string] ?? '↕'}
                              </span>
                            )}
                            {typeof header.column.columnDef.header === 'function'
                              ? header.column.columnDef.header({
                                  header: header,
                                  table: table,
                                  column: header.column,
                                })
                              : header.column.columnDef.header}
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getFilteredRowModel().rows.map((row) => (
                  <>
                    <tr key={row.id} className={row.getIsSelected() ? 'table-active' : ''}>
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id}>
                          {typeof cell.column.columnDef.cell === 'function'
                            ? cell.column.columnDef.cell(cell.getContext())
                            : cell.getValue() as React.ReactNode}
                        </td>
                      ))}
                    </tr>
                    {row.getIsExpanded() && (
                      <tr key={`${row.id}-expanded`}>
                        <td colSpan={row.getVisibleCells().length}>
                          {renderExpandedContent(row)}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
                {table.getFilteredRowModel().rows.length === 0 && (
                  <tr>
                    <td colSpan={table.getAllColumns().length} className="text-center py-5">
                      <div className="text-muted">No se encontraron pedidos</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {table.getFilteredRowModel().rows.length > 0 && (
            <CardFooter className="border-0">
              <TablePagination
                totalItems={totalItems}
                start={start}
                end={end}
                itemsName="pedidos"
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
            itemName="pedido"
          />
        </Card>
      </Col>
    </Row>
  )
}

export default PedidosListing

