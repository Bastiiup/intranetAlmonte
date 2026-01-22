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
import { LuPlus, LuSearch, LuSend, LuEye, LuPencil, LuTrash2, LuFileText } from 'react-icons/lu'
import DataTable from '@/components/table/DataTable'
import TablePagination from '@/components/table/TablePagination'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import RFQModal from './components/RFQModal'
import DeleteConfirmationModal from '@/components/table/DeleteConfirmationModal'
import { useNotificationContext } from '@/context/useNotificationContext'

interface RFQType {
  id: string | number
  documentId?: string
  numero_rfq?: string
  nombre?: string
  descripcion?: string
  fecha_solicitud?: string
  fecha_vencimiento?: string
  estado?: 'draft' | 'sent' | 'received' | 'converted' | 'cancelled'
  moneda?: string
  empresas?: Array<{ id: string | number; nombre?: string; empresa_nombre?: string }>
  productos?: Array<{ id: string | number; nombre?: string; nombre_libro?: string }>
  cotizaciones_recibidas?: Array<any>
  createdAt?: string
}

const columnHelper = createColumnHelper<RFQType>()

const ESTADOS = [
  { value: '', label: 'Todos los estados' },
  { value: 'draft', label: 'Borrador' },
  { value: 'sent', label: 'Enviada' },
  { value: 'received', label: 'Recibida' },
  { value: 'converted', label: 'Convertida' },
  { value: 'cancelled', label: 'Cancelada' },
]

const getEstadoBadge = (estado?: string) => {
  const estados: Record<string, { variant: string; label: string }> = {
    draft: { variant: 'secondary', label: 'Borrador' },
    sent: { variant: 'info', label: 'Enviada' },
    received: { variant: 'warning', label: 'Recibida' },
    converted: { variant: 'success', label: 'Convertida' },
    cancelled: { variant: 'danger', label: 'Cancelada' },
  }
  const estadoData = estados[estado || 'draft'] || estados.draft
  return <Badge bg={estadoData.variant}>{estadoData.label}</Badge>
}

export default function RFQsPage() {
  const router = useRouter()
  const { showNotification } = useNotificationContext()
  
  const [rfqs, setRfqs] = useState<RFQType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalRows, setTotalRows] = useState(0)
  
  // Estados de modales
  const [rfqModal, setRfqModal] = useState<{ open: boolean; rfq: RFQType | null }>({ open: false, rfq: null })
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; rfq: RFQType | null }>({ open: false, rfq: null })
  const [sendingModal, setSendingModal] = useState<{ open: boolean; rfq: RFQType | null }>({ open: false, rfq: null })
  const [sending, setSending] = useState(false)
  
  // Estados de tabla
  const [sorting, setSorting] = useState<SortingState>([{ id: 'fecha_solicitud', desc: true }])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [globalFilter, setGlobalFilter] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  
  // Cargar RFQs
  const loadRFQs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        pageSize: String(pagination.pageSize),
        ...(globalFilter && { search: globalFilter }),
        ...(filtroEstado && { estado: filtroEstado }),
      })
      
      const response = await fetch(`/api/compras/rfqs?${params.toString()}`)
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Error al cargar RFQs')
      }
      
      const rfqsData = Array.isArray(result.data) ? result.data : [result.data]
      setRfqs(rfqsData)
      setTotalRows(result.meta?.pagination?.total || rfqsData.length)
    } catch (err: any) {
      console.error('Error al cargar RFQs:', err)
      setError(err.message || 'Error al cargar RFQs')
    } finally {
      setLoading(false)
    }
  }, [pagination.pageIndex, pagination.pageSize, globalFilter, filtroEstado])
  
  useEffect(() => {
    loadRFQs()
  }, [loadRFQs])
  
  // Definición de columnas
  const columns = useMemo<ColumnDef<RFQType>[]>(() => [
    {
      id: 'numero_rfq',
      header: 'Número',
      accessorKey: 'numero_rfq',
      cell: ({ row }) => {
        const attrs = row.original as any
        return (
          <span className="fw-semibold">
            {attrs.numero_rfq || attrs.attributes?.numero_rfq || '-'}
          </span>
        )
      },
    },
    {
      id: 'nombre',
      header: 'Nombre',
      accessorKey: 'nombre',
      cell: ({ row }) => {
        const attrs = row.original as any
        const nombre = attrs.nombre || attrs.attributes?.nombre || 'Sin nombre'
        return (
          <Link 
            href={`/crm/compras/rfqs/${row.original.id || row.original.documentId}`}
            className="text-decoration-none fw-medium"
          >
            {nombre}
          </Link>
        )
      },
    },
    {
      id: 'empresas',
      header: 'Proveedores',
      cell: ({ row }) => {
        const attrs = row.original as any
        const empresas = attrs.empresas?.data || attrs.empresas || attrs.attributes?.empresas?.data || []
        if (empresas.length === 0) return <span className="text-muted">-</span>
        return (
          <div>
            {empresas.slice(0, 2).map((emp: any, idx: number) => {
              const empAttrs = emp.attributes || emp
              const nombre = empAttrs.empresa_nombre || empAttrs.nombre || 'Empresa'
              return (
                <Badge key={idx} bg="primary-subtle" text="primary" className="me-1">
                  {nombre}
                </Badge>
              )
            })}
            {empresas.length > 2 && (
              <Badge bg="secondary-subtle" text="secondary">
                +{empresas.length - 2}
              </Badge>
            )}
          </div>
        )
      },
    },
    {
      id: 'productos',
      header: 'Productos',
      cell: ({ row }) => {
        const attrs = row.original as any
        const productos = attrs.productos?.data || attrs.productos || attrs.attributes?.productos?.data || []
        return (
          <span className="text-muted">
            {productos.length} producto{productos.length !== 1 ? 's' : ''}
          </span>
        )
      },
    },
    {
      id: 'fecha_solicitud',
      header: 'Fecha Solicitud',
      cell: ({ row }) => {
        const attrs = row.original as any
        const fecha = attrs.fecha_solicitud || attrs.attributes?.fecha_solicitud
        if (!fecha) return <span className="text-muted">-</span>
        return format(new Date(fecha), 'dd MMM yyyy', { locale: es })
      },
    },
    {
      id: 'estado',
      header: 'Estado',
      cell: ({ row }) => {
        const attrs = row.original as any
        const estado = attrs.estado || attrs.attributes?.estado || 'draft'
        return getEstadoBadge(estado)
      },
    },
    {
      id: 'cotizaciones',
      header: 'Cotizaciones',
      cell: ({ row }) => {
        const attrs = row.original as any
        const cotizaciones = attrs.cotizaciones_recibidas?.data || attrs.cotizaciones_recibidas || attrs.attributes?.cotizaciones_recibidas?.data || []
        return (
          <span className="text-muted">
            {cotizaciones.length} recibida{cotizaciones.length !== 1 ? 's' : ''}
          </span>
        )
      },
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => {
        const rfq = row.original
        const rfqId = rfq.id || rfq.documentId
        const attrs = rfq as any
        const estado = attrs.estado || attrs.attributes?.estado || 'draft'
        
        return (
          <div className="d-flex gap-1">
            <Button
              variant="default"
              size="sm"
              className="btn-icon"
              onClick={() => router.push(`/crm/compras/rfqs/${rfqId}`)}
              title="Ver detalle"
            >
              <LuEye size={18} />
            </Button>
            <Button
              variant="default"
              size="sm"
              className="btn-icon"
              onClick={() => setRfqModal({ open: true, rfq })}
              title="Editar"
            >
              <LuPencil size={18} />
            </Button>
            {estado === 'draft' && (
              <Button
                variant="default"
                size="sm"
                className="btn-icon text-info"
                onClick={() => setSendingModal({ open: true, rfq })}
                title="Enviar a proveedores"
              >
                <LuSend size={18} />
              </Button>
            )}
            <Button
              variant="default"
              size="sm"
              className="btn-icon text-danger"
              onClick={() => setDeleteModal({ open: true, rfq })}
              title="Eliminar"
            >
              <LuTrash2 size={18} />
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
    data: rfqs,
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
  
  const handleEnviarRFQ = async () => {
    if (!sendingModal.rfq) return
    
    setSending(true)
    try {
      const rfqId = sendingModal.rfq.id || sendingModal.rfq.documentId
      const response = await fetch(`/api/compras/rfqs/${rfqId}/enviar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Error al enviar RFQ')
      }
      
      showNotification({
        title: 'Éxito',
        message: result.message || 'RFQ enviada exitosamente',
        variant: 'success',
      })
      
      setSendingModal({ open: false, rfq: null })
      loadRFQs()
    } catch (err: any) {
      showNotification({
        title: 'Error',
        message: err.message || 'Error al enviar RFQ',
        variant: 'danger',
      })
    } finally {
      setSending(false)
    }
  }
  
  const handleDelete = async () => {
    if (!deleteModal.rfq) return
    
    try {
      const rfqId = deleteModal.rfq.id || deleteModal.rfq.documentId
      const response = await fetch(`/api/compras/rfqs/${rfqId}`, {
        method: 'DELETE',
      })
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Error al eliminar RFQ')
      }
      
      showNotification({
        title: 'Éxito',
        message: 'RFQ eliminada exitosamente',
        variant: 'success',
      })
      
      setDeleteModal({ open: false, rfq: null })
      loadRFQs()
    } catch (err: any) {
      showNotification({
        title: 'Error',
        message: err.message || 'Error al eliminar RFQ',
        variant: 'danger',
      })
    }
  }
  
  return (
    <Container fluid>
      <PageBreadcrumb 
        title="Solicitudes de Cotización" 
        subtitle="CRM · Compras"
        infoText="Gestiona las solicitudes de cotización enviadas a proveedores. Crea nuevas RFQs, envíalas por email y revisa las cotizaciones recibidas."
      />
      
      <Card className="mb-4">
        <CardHeader className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Solicitudes de Cotización (RFQ)</h5>
          <Button
            variant="primary"
            onClick={() => setRfqModal({ open: true, rfq: null })}
          >
            <LuPlus className="me-1" />
            Nueva RFQ
          </Button>
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
                  placeholder="Buscar por número, nombre o descripción..."
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
              <p className="text-muted mt-2">Cargando RFQs...</p>
            </div>
          ) : rfqs.length === 0 ? (
            <Alert variant="info">
              <p className="mb-0">No hay solicitudes de cotización. Crea una nueva para comenzar.</p>
            </Alert>
          ) : (
            <>
              <DataTable table={table} />
              <TablePagination
                totalItems={totalRows}
                start={start}
                end={end}
                itemsName="RFQs"
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
      
      {/* Modal de RFQ */}
      <RFQModal
        show={rfqModal.open}
        onHide={() => setRfqModal({ open: false, rfq: null })}
        rfq={rfqModal.rfq}
        onSuccess={() => {
          loadRFQs()
          setRfqModal({ open: false, rfq: null })
        }}
      />
      
      {/* Modal de confirmación de envío */}
      {sendingModal.open && sendingModal.rfq && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => !sending && setSendingModal({ open: false, rfq: null })}>
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Enviar RFQ a Proveedores</h5>
                <button type="button" className="btn-close" onClick={() => !sending && setSendingModal({ open: false, rfq: null })}></button>
              </div>
              <div className="modal-body">
                <p>¿Está seguro de enviar esta RFQ a los proveedores asociados?</p>
                <p className="text-muted small mb-0">
                  Se enviará un email a cada proveedor con un enlace para responder la cotización.
                </p>
              </div>
              <div className="modal-footer">
                <Button variant="secondary" onClick={() => setSendingModal({ open: false, rfq: null })} disabled={sending}>
                  Cancelar
                </Button>
                <Button variant="primary" onClick={handleEnviarRFQ} disabled={sending}>
                  {sending ? (
                    <>
                      <Spinner size="sm" className="me-2" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <LuSend className="me-1" />
                      Enviar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de confirmación de eliminación */}
      <DeleteConfirmationModal
        show={deleteModal.open}
        onHide={() => setDeleteModal({ open: false, rfq: null })}
        onConfirm={handleDelete}
        selectedCount={1}
        itemName="RFQ"
        modalTitle="Eliminar RFQ"
        confirmButtonText="Eliminar"
        cancelButtonText="Cancelar"
      >
        ¿Está seguro de eliminar esta solicitud de cotización? Esta acción no se puede deshacer.
      </DeleteConfirmationModal>
    </Container>
  )
}

