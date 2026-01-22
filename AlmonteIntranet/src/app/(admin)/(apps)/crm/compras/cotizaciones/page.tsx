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
import { LuSearch, LuEye, LuCheck, LuX, LuFileText, LuShoppingCart } from 'react-icons/lu'
import DataTable from '@/components/table/DataTable'
import TablePagination from '@/components/table/TablePagination'
import { useRouter, useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'

interface CotizacionRecibidaType {
  id: string | number
  documentId?: string
  numero_cotizacion?: string
  monto_total?: number
  moneda?: string
  fecha_recepcion?: string
  fecha_vencimiento?: string
  estado?: 'pendiente' | 'aceptada' | 'rechazada' | 'convertida'
  empresa?: any
  rfq?: any
  items?: Array<any>
  notas?: string
  createdAt?: string
}

const columnHelper = createColumnHelper<CotizacionRecibidaType>()

const ESTADOS = [
  { value: '', label: 'Todos los estados' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'aceptada', label: 'Aceptada' },
  { value: 'rechazada', label: 'Rechazada' },
  { value: 'convertida', label: 'Convertida' },
]

const getEstadoBadge = (estado?: string) => {
  const estados: Record<string, { variant: string; label: string }> = {
    pendiente: { variant: 'warning', label: 'Pendiente' },
    aceptada: { variant: 'success', label: 'Aceptada' },
    rechazada: { variant: 'danger', label: 'Rechazada' },
    convertida: { variant: 'info', label: 'Convertida' },
  }
  const estadoData = estados[estado || 'pendiente'] || estados.pendiente
  return <Badge bg={estadoData.variant}>{estadoData.label}</Badge>
}

export default function CotizacionesRecibidasPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rfqFilter = searchParams?.get('rfq')
  
  const [cotizaciones, setCotizaciones] = useState<CotizacionRecibidaType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalRows, setTotalRows] = useState(0)
  
  // Estados de tabla
  const [sorting, setSorting] = useState<SortingState>([{ id: 'fecha_recepcion', desc: true }])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [globalFilter, setGlobalFilter] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  
  // Cargar cotizaciones
  const loadCotizaciones = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        pageSize: String(pagination.pageSize),
        ...(globalFilter && { search: globalFilter }),
        ...(filtroEstado && { estado: filtroEstado }),
        ...(rfqFilter && { rfq: rfqFilter }),
      })
      
      const response = await fetch(`/api/compras/cotizaciones?${params.toString()}`)
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Error al cargar cotizaciones')
      }
      
      const cotizacionesData = Array.isArray(result.data) ? result.data : [result.data]
      setCotizaciones(cotizacionesData)
      setTotalRows(result.meta?.pagination?.total || cotizacionesData.length)
    } catch (err: any) {
      console.error('Error al cargar cotizaciones:', err)
      setError(err.message || 'Error al cargar cotizaciones')
    } finally {
      setLoading(false)
    }
  }, [pagination.pageIndex, pagination.pageSize, globalFilter, filtroEstado, rfqFilter])
  
  useEffect(() => {
    loadCotizaciones()
  }, [loadCotizaciones])
  
  // Definición de columnas
  const columns = useMemo<ColumnDef<CotizacionRecibidaType>[]>(() => [
    {
      id: 'numero_cotizacion',
      header: 'Número',
      accessorKey: 'numero_cotizacion',
      cell: ({ row }) => {
        const attrs = row.original as any
        return (
          <span className="fw-semibold">
            {attrs.numero_cotizacion || attrs.attributes?.numero_cotizacion || '-'}
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
      id: 'rfq',
      header: 'RFQ',
      cell: ({ row }) => {
        const attrs = row.original as any
        const rfq = attrs.rfq?.data || attrs.rfq || attrs.attributes?.rfq?.data
        if (!rfq) return <span className="text-muted">-</span>
        const rfqAttrs = rfq.attributes || rfq
        return (
          <Link
            href={`/crm/compras/rfqs/${rfq.id || rfq.documentId}`}
            className="text-decoration-none"
          >
            {rfqAttrs.numero_rfq || rfqAttrs.nombre || 'RFQ'}
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
      id: 'fecha_recepcion',
      header: 'Fecha Recepción',
      cell: ({ row }) => {
        const attrs = row.original as any
        const fecha = attrs.fecha_recepcion || attrs.attributes?.fecha_recepcion
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
        const cotizacion = row.original
        const cotizacionId = cotizacion.id || cotizacion.documentId
        
        return (
          <div className="d-flex gap-1">
            <Button
              variant="default"
              size="sm"
              className="btn-icon"
              onClick={() => router.push(`/crm/compras/cotizaciones/${cotizacionId}`)}
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
    data: cotizaciones,
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
        title="Cotizaciones Recibidas" 
        subtitle="CRM · Compras"
        infoText="Revisa y gestiona las cotizaciones recibidas de proveedores en respuesta a las solicitudes de cotización (RFQ)."
      />
      
      <Card className="mb-4">
        <CardHeader>
          <h5 className="mb-0">Cotizaciones Recibidas</h5>
        </CardHeader>
        <CardBody>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          
          {rfqFilter && (
            <Alert variant="info" className="mb-3">
              Filtrando cotizaciones de la RFQ seleccionada.{' '}
              <Link href="/crm/compras/cotizaciones" className="text-decoration-none">
                Ver todas
              </Link>
            </Alert>
          )}
          
          <Row className="mb-3">
            <Col md={6}>
              <div className="position-relative">
                <LuSearch className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" size={18} />
                <input
                  type="text"
                  className="form-control ps-5"
                  placeholder="Buscar por número, proveedor o RFQ..."
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
              <p className="text-muted mt-2">Cargando cotizaciones...</p>
            </div>
          ) : cotizaciones.length === 0 ? (
            <Alert variant="info">
              <p className="mb-0">No hay cotizaciones recibidas.</p>
            </Alert>
          ) : (
            <>
              <DataTable table={table} />
              <TablePagination
                totalItems={totalRows}
                start={start}
                end={end}
                itemsName="cotizaciones"
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

