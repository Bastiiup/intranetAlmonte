'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  ColumnDef,
  ColumnFiltersState,
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { Container, Card, CardBody, CardHeader, Button, Row, Col, Alert, Spinner, Badge } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { LuSearch, LuEye, LuFileText, LuUpload, LuCheck, LuClock } from 'react-icons/lu'
import DataTable from '@/components/table/DataTable'
import TablePagination from '@/components/table/TablePagination'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'

interface POType {
  id: string | number
  documentId?: string
  numero_po?: string
  monto_total?: number
  moneda?: string
  fecha_emision?: string
  fecha_entrega_esperada?: string
  estado?: 'pendiente' | 'confirmada' | 'en_transito' | 'recibida' | 'cancelada'
  empresa?: any
  cotizacion?: any
  items?: Array<any>
  createdAt?: string
}

const columnHelper = createColumnHelper<POType>()

const ESTADOS = [
  { value: '', label: 'Todos los estados' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'confirmada', label: 'Confirmada' },
  { value: 'en_transito', label: 'En Tránsito' },
  { value: 'recibida', label: 'Recibida' },
  { value: 'cancelada', label: 'Cancelada' },
]

const getEstadoBadge = (estado?: string) => {
  const estados: Record<string, { variant: string; label: string }> = {
    pendiente: { variant: 'warning', label: 'Pendiente' },
    confirmada: { variant: 'info', label: 'Confirmada' },
    en_transito: { variant: 'primary', label: 'En Tránsito' },
    recibida: { variant: 'success', label: 'Recibida' },
    cancelada: { variant: 'danger', label: 'Cancelada' },
  }
  const estadoData = estados[estado || 'pendiente'] || estados.pendiente
  return <Badge bg={estadoData.variant}>{estadoData.label}</Badge>
}

export default function OrdenesCompraPage() {
  const router = useRouter()
  
  const [pos, setPos] = useState<POType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalRows, setTotalRows] = useState(0)
  
  // Estados de tabla
  const [sorting, setSorting] = useState<SortingState>([{ id: 'fecha_emision', desc: true }])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [globalFilter, setGlobalFilter] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  
  // Cargar órdenes de compra
  const loadPOs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        pageSize: String(pagination.pageSize),
        ...(globalFilter && { search: globalFilter }),
        ...(filtroEstado && { estado: filtroEstado }),
      })
      
      const response = await fetch(`/api/compras/ordenes-compra?${params.toString()}`)
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Error al cargar órdenes de compra')
      }
      
      const posData = Array.isArray(result.data) ? result.data : [result.data]
      setPos(posData)
      setTotalRows(result.meta?.pagination?.total || posData.length)
    } catch (err: any) {
      console.error('Error al cargar órdenes de compra:', err)
      setError(err.message || 'Error al cargar órdenes de compra')
    } finally {
      setLoading(false)
    }
  }, [pagination.pageIndex, pagination.pageSize, globalFilter, filtroEstado])
  
  useEffect(() => {
    loadPOs()
  }, [loadPOs])
  
  // Definición de columnas
  const columns = useMemo<ColumnDef<POType>[]>(() => [
    {
      id: 'numero_po',
      header: 'Número PO',
      accessorKey: 'numero_po',
      cell: ({ row }) => {
        const attrs = row.original as any
        return (
          <span className="fw-semibold">
            {attrs.numero_po || attrs.attributes?.numero_po || '-'}
          </span>
        )
      },
    },
    {
      id: 'empresa',
      header: 'Proveedor',
      cell: ({ row }) => {
        const attrs = row.original as any
        const empresa = attrs.empresa?.data || attrs.empresa || attrs.attributes?.empresa?.data
        if (!empresa) return <span className="text-muted">-</span>
        const empAttrs = empresa.attributes || empresa
        return <span>{empAttrs.empresa_nombre || empAttrs.nombre || 'Proveedor'}</span>
      },
    },
    {
      id: 'cotizacion',
      header: 'Cotización',
      cell: ({ row }) => {
        const attrs = row.original as any
        const cotizacion = attrs.cotizacion_recibida?.data || attrs.cotizacion?.data || attrs.cotizacion || attrs.cotizacion_recibida || attrs.attributes?.cotizacion_recibida?.data || attrs.attributes?.cotizacion?.data
        if (!cotizacion) return <span className="text-muted">-</span>
        const cotAttrs = cotizacion.attributes || cotizacion
        return (
          <Link
            href={`/crm/compras/cotizaciones/${cotizacion.id || cotizacion.documentId}`}
            className="text-decoration-none"
          >
            {cotAttrs.numero_cotizacion || 'Cotización'}
          </Link>
        )
      },
    },
    {
      id: 'monto_total',
      header: 'Monto Total',
      cell: ({ row }) => {
        const attrs = row.original as any
        const monto = attrs.monto_total || attrs.attributes?.monto_total
        const moneda = attrs.moneda || attrs.attributes?.moneda || 'CLP'
        if (!monto) return <span className="text-muted">-</span>
        return (
          <span className="fw-semibold">
            {moneda} {Number(monto).toLocaleString()}
          </span>
        )
      },
    },
    {
      id: 'fecha_emision',
      header: 'Fecha Emisión',
      cell: ({ row }) => {
        const attrs = row.original as any
        const fecha = attrs.fecha_emision || attrs.attributes?.fecha_emision
        if (!fecha) return <span className="text-muted">-</span>
        return format(new Date(fecha), 'dd MMM yyyy', { locale: es })
      },
    },
    {
      id: 'fecha_entrega_esperada',
      header: 'Entrega Esperada',
      cell: ({ row }) => {
        const attrs = row.original as any
        const fecha = attrs.fecha_entrega_esperada || attrs.attributes?.fecha_entrega_esperada
        if (!fecha) return <span className="text-muted">-</span>
        return format(new Date(fecha), 'dd MMM yyyy', { locale: es })
      },
    },
    {
      id: 'estado',
      header: 'Estado',
      cell: ({ row }) => {
        const attrs = row.original as any
        const estado = attrs.estado || attrs.attributes?.estado || 'pendiente'
        return getEstadoBadge(estado)
      },
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => {
        const po = row.original
        const poId = po.id || po.documentId
        
        return (
          <div className="d-flex gap-1">
            <Button
              variant="default"
              size="sm"
              className="btn-icon"
              onClick={() => router.push(`/crm/compras/ordenes-compra/${poId}`)}
              title="Ver detalle"
            >
              <LuEye size={18} />
            </Button>
          </div>
        )
      },
    },
  ], [router])
  
  // Aplicar filtros
  useEffect(() => {
    const filters: ColumnFiltersState = []
    if (filtroEstado) {
      filters.push({ id: 'estado', value: filtroEstado })
    }
    setColumnFilters(filters)
  }, [filtroEstado])
  
  const table = useReactTable({
    data: pos,
    columns,
    state: {
      sorting,
      columnFilters,
      pagination,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(totalRows / pagination.pageSize),
  })
  
  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const start = pageIndex * pageSize + 1
  const end = Math.min(start + pageSize - 1, totalRows)
  
  const setPageIndex = (index: number) => {
    setPagination({ ...pagination, pageIndex: index })
  }
  
  return (
    <Container fluid>
      <PageBreadcrumb 
        title="Órdenes de Compra" 
        subtitle="CRM · Compras"
        infoText="Gestiona las órdenes de compra generadas a partir de cotizaciones aceptadas. Realiza seguimiento del estado de entrega y sube documentos relacionados."
      />
      
      <Card className="mb-4">
        <CardHeader>
          <h5 className="mb-0">Órdenes de Compra</h5>
        </CardHeader>
        <CardBody>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          
          <Row className="mb-3">
            <Col md={6}>
              <div className="position-relative">
                <LuSearch className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" size={18} />
                <input
                  type="text"
                  className="form-control ps-5"
                  placeholder="Buscar por número, proveedor o cotización..."
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                />
              </div>
            </Col>
            <Col md={3}>
              <select
                className="form-select"
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
              >
                {ESTADOS.map((estado) => (
                  <option key={estado.value} value={estado.value}>
                    {estado.label}
                  </option>
                ))}
              </select>
            </Col>
          </Row>
          
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="text-muted mt-2">Cargando órdenes de compra...</p>
            </div>
          ) : pos.length === 0 ? (
            <Alert variant="info">
              <p className="mb-0">No hay órdenes de compra.</p>
            </Alert>
          ) : (
            <>
              <DataTable table={table} />
              <TablePagination
                totalItems={totalRows}
                start={start}
                end={end}
                itemsName="órdenes de compra"
                showInfo
                previousPage={table.previousPage}
                canPreviousPage={table.getCanPreviousPage()}
                pageCount={table.getPageCount()}
                pageIndex={pageIndex}
                setPageIndex={setPageIndex}
                nextPage={table.nextPage}
                canNextPage={table.getCanNextPage()}
              />
            </>
          )}
        </CardBody>
      </Card>
    </Container>
  )
}

