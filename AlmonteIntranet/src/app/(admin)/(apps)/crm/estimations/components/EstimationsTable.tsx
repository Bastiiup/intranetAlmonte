'use client'
import {
    createColumnHelper,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    SortingState,
    Row as TableRow,
    Table as TableType,
    useReactTable,
    ColumnFiltersState,
} from '@tanstack/react-table'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Button, Card, CardFooter, CardHeader, CardBody, Badge, Alert, Spinner } from 'react-bootstrap'
import { LuDollarSign, LuSearch, LuShuffle, LuMail, LuSend } from 'react-icons/lu'
import { TbEdit, TbEye, TbPlus, TbTrash } from 'react-icons/tb'

import DataTable from '@/components/table/DataTable'
import DeleteConfirmationModal from '@/components/table/DeleteConfirmationModal'
import TablePagination from '@/components/table/TablePagination'
import CotizacionModal from './CotizacionModal'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface CotizacionType {
    id: string
    documentId?: string
    nombre: string
    descripcion?: string
    monto?: number
    moneda?: string
    estado: string
    fecha_envio?: string
    fecha_vencimiento?: string
    empresas?: Array<{ id?: string; documentId?: string; empresa_nombre?: string; nombre?: string }>
    productos?: Array<{ id?: string; documentId?: string; nombre_libro?: string; nombre?: string }>
    creado_por?: { persona?: { nombre_completo?: string } }
    createdAt?: string
    updatedAt?: string
}

const columnHelper = createColumnHelper<CotizacionType>()

const ESTADOS = [
    { value: '', label: 'Todos los Estados' },
    { value: 'Borrador', label: 'Borrador' },
    { value: 'Enviada', label: 'Enviada' },
    { value: 'Aprobada', label: 'Aprobada' },
    { value: 'Rechazada', label: 'Rechazada' },
    { value: 'Vencida', label: 'Vencida' },
]

const EstimationsTable = () => {
    const [data, setData] = useState<CotizacionType[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [totalRows, setTotalRows] = useState(0)
    const [globalFilter, setGlobalFilter] = useState('')
    const [sorting, setSorting] = useState<SortingState>([])
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 })
    const [filtroEstado, setFiltroEstado] = useState('')
    const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({})
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [showModal, setShowModal] = useState(false)
    const [editingCotizacion, setEditingCotizacion] = useState<CotizacionType | null>(null)

    // Función para cargar cotizaciones
    const loadCotizaciones = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const params = new URLSearchParams({
                page: (pagination.pageIndex + 1).toString(),
                pageSize: pagination.pageSize.toString(),
            })
            if (globalFilter) params.append('search', globalFilter)
            if (filtroEstado) params.append('estado', filtroEstado)

            const response = await fetch(`/api/crm/cotizaciones?${params.toString()}`)
            const result = await response.json()

            if (result.success && result.data) {
                // Transformar datos de Strapi al formato esperado
                const cotizaciones = Array.isArray(result.data) ? result.data : [result.data]
                const transformed = cotizaciones.map((cot: any) => {
                    const attrs = cot.attributes || cot
                    const docId = cot.documentId || cot.id
                    return {
                        id: docId ? String(docId) : String(cot.id || ''),
                        documentId: docId,
                        nombre: attrs.nombre || 'Sin nombre',
                        descripcion: attrs.descripcion,
                        monto: attrs.monto,
                        moneda: attrs.moneda || 'CLP',
                        estado: attrs.estado || 'Borrador',
                        fecha_envio: attrs.fecha_envio,
                        fecha_vencimiento: attrs.fecha_vencimiento,
                        empresas: attrs.empresas?.data || attrs.empresas || [],
                        productos: attrs.productos?.data || attrs.productos || [],
                        creado_por: attrs.creado_por?.data || attrs.creado_por,
                        createdAt: attrs.createdAt || cot.createdAt,
                        updatedAt: attrs.updatedAt || cot.updatedAt,
                    }
                })
                setData(transformed)
                setTotalRows(result.meta?.pagination?.total || 0)
            } else {
                setError(result.error || result.message || 'Error al obtener cotizaciones')
                setData([])
                setTotalRows(0)
            }
        } catch (err: any) {
            console.error('Error al cargar cotizaciones:', err)
            setError(err.message || 'Error al conectar con la API')
            setData([])
        } finally {
            setLoading(false)
        }
    }, [pagination.pageIndex, pagination.pageSize, globalFilter, filtroEstado])

    useEffect(() => {
        loadCotizaciones()
    }, [loadCotizaciones])

    const handleEnviarEmail = async (cotizacion: CotizacionType) => {
        if (!cotizacion.documentId && !cotizacion.id) {
            alert('Error: No se pudo identificar la cotización')
            return
        }

        const cotizacionId = cotizacion.documentId || cotizacion.id
        try {
            const response = await fetch(`/api/crm/cotizaciones/${cotizacionId}/enviar-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({}),
            })

            const result = await response.json()

            if (result.success) {
                alert(`Correos enviados: ${result.message}`)
                loadCotizaciones()
            } else {
                alert(`Error: ${result.error || 'Error al enviar correos'}`)
            }
        } catch (err: any) {
            console.error('Error al enviar email:', err)
            alert(`Error: ${err.message || 'Error al enviar correos'}`)
        }
    }

    const handleDelete = async () => {
        const selectedIds = Object.keys(selectedRowIds)
        if (selectedIds.length === 0) return

        try {
            for (const id of selectedIds) {
                const cotizacion = data.find((c) => c.id === id)
                if (cotizacion?.documentId || cotizacion?.id) {
                    const cotizacionId = cotizacion.documentId || cotizacion.id
                    await fetch(`/api/crm/cotizaciones/${cotizacionId}`, {
                        method: 'DELETE',
                    })
                }
            }
            setSelectedRowIds({})
            setShowDeleteModal(false)
            loadCotizaciones()
        } catch (err: any) {
            console.error('Error al eliminar cotizaciones:', err)
            alert(`Error: ${err.message || 'Error al eliminar cotizaciones'}`)
        }
    }

    const getEstadoColor = (estado: string) => {
        switch (estado) {
            case 'Aprobada':
                return 'success'
            case 'Enviada':
                return 'info'
            case 'Rechazada':
                return 'danger'
            case 'Vencida':
                return 'warning'
            default:
                return 'secondary'
        }
    }

    const formatCurrency = (monto?: number, moneda?: string) => {
        if (!monto) return '-'
        const currency = moneda || 'CLP'
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: currency === 'CLP' ? 'CLP' : currency === 'USD' ? 'USD' : 'EUR',
        }).format(monto)
    }

    const columns = useMemo(() => [
        {
            id: 'select',
            header: ({ table }: { table: TableType<CotizacionType> }) => (
                <input
                    type="checkbox"
                    className="form-check-input form-check-input-light fs-14"
                    checked={table.getIsAllRowsSelected()}
                    onChange={table.getToggleAllRowsSelectedHandler()}
                />
            ),
            cell: ({ row }: { row: TableRow<CotizacionType> }) => (
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
            header: 'Nombre',
            cell: ({ row }) => (
                <div>
                    <div className="fw-semibold">{row.original.nombre}</div>
                    {row.original.descripcion && (
                        <small className="text-muted">{row.original.descripcion.substring(0, 50)}...</small>
                    )}
                </div>
            ),
        }),
        columnHelper.accessor('empresas', {
            header: 'Empresas',
            cell: ({ row }) => {
                const empresas = row.original.empresas || []
                if (empresas.length === 0) return <span className="text-muted">-</span>
                return (
                    <div>
                        {empresas.slice(0, 2).map((emp: any, idx: number) => {
                            const nombre = emp.attributes?.empresa_nombre || emp.empresa_nombre || emp.attributes?.nombre || emp.nombre || 'Empresa'
                            return (
                                <div key={idx} className="small">
                                    {nombre}
                                </div>
                            )
                        })}
                        {empresas.length > 2 && (
                            <small className="text-muted">+{empresas.length - 2} más</small>
                        )}
                    </div>
                )
            },
        }),
        columnHelper.accessor('productos', {
            header: 'Productos',
            cell: ({ row }) => {
                const productos = row.original.productos || []
                if (productos.length === 0) return <span className="text-muted">-</span>
                return (
                    <div>
                        {productos.slice(0, 2).map((prod: any, idx: number) => {
                            const nombre = prod.attributes?.nombre_libro || prod.nombre_libro || prod.attributes?.nombre || prod.nombre || 'Producto'
                            return (
                                <div key={idx} className="small">
                                    {nombre}
                                </div>
                            )
                        })}
                        {productos.length > 2 && (
                            <small className="text-muted">+{productos.length - 2} más</small>
                        )}
                    </div>
                )
            },
        }),
        columnHelper.accessor('monto', {
            header: 'Monto',
            cell: ({ row }) => formatCurrency(row.original.monto, row.original.moneda),
        }),
        columnHelper.accessor('estado', {
            header: 'Estado',
            cell: ({ row }) => (
                <Badge bg={getEstadoColor(row.original.estado)}>
                    {row.original.estado}
                </Badge>
            ),
        }),
        columnHelper.accessor('fecha_vencimiento', {
            header: 'Vencimiento',
            cell: ({ row }) => {
                if (!row.original.fecha_vencimiento) return '-'
                return format(new Date(row.original.fecha_vencimiento), 'dd MMM yyyy', { locale: es })
            },
        }),
        {
            id: 'actions',
            header: 'Acciones',
            cell: ({ row }: { row: TableRow<CotizacionType> }) => (
                <div className="d-flex gap-1">
                    <Button
                        variant="default"
                        size="sm"
                        className="btn-icon"
                        onClick={() => handleEnviarEmail(row.original)}
                        title="Enviar por email"
                    >
                        <LuMail className="fs-lg" />
                    </Button>
                    <Button
                        variant="default"
                        size="sm"
                        className="btn-icon"
                        onClick={() => {
                            setEditingCotizacion(row.original)
                            setShowModal(true)
                        }}
                        title="Editar"
                    >
                        <TbEdit className="fs-lg" />
                    </Button>
                    <Button
                        variant="default"
                        size="sm"
                        className="btn-icon text-danger"
                        onClick={() => {
                            setSelectedRowIds({ [row.id]: true })
                            setShowDeleteModal(true)
                        }}
                        title="Eliminar"
                    >
                        <TbTrash className="fs-lg" />
                    </Button>
                </div>
            ),
        },
    ], [])

    const table = useReactTable({
        data,
        columns,
        pageCount: Math.ceil(totalRows / pagination.pageSize),
        state: { sorting, globalFilter, columnFilters, pagination, rowSelection: selectedRowIds },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        onColumnFiltersChange: setColumnFilters,
        onPaginationChange: setPagination,
        onRowSelectionChange: setSelectedRowIds,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        manualPagination: true,
        globalFilterFn: 'includesString',
        enableColumnFilters: true,
        enableRowSelection: true,
    })

    const pageIndex = table.getState().pagination.pageIndex
    const pageSize = table.getState().pagination.pageSize
    const start = pageIndex * pageSize + 1
    const end = Math.min(start + pageSize - 1, totalRows)

    if (loading && data.length === 0) {
        return (
            <Card>
                <CardBody className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-2 text-muted">Cargando cotizaciones...</p>
                </CardBody>
            </Card>
        )
    }

    return (
        <>
            <Card>
                <CardHeader className="border-light justify-content-between">
                    <div className="d-flex gap-2">
                        <div className="app-search">
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Buscar cotizaciones..."
                                value={globalFilter ?? ''}
                                onChange={(e) => setGlobalFilter(e.target.value)}
                            />
                            <LuSearch className="app-search-icon text-muted" />
                        </div>

                        {Object.keys(selectedRowIds).length > 0 && (
                            <Button variant="danger" size="sm" onClick={() => setShowDeleteModal(true)}>
                                Eliminar
                            </Button>
                        )}

                        <Button className="btn btn-primary" onClick={() => {
                            setEditingCotizacion(null)
                            setShowModal(true)
                        }}>
                            <TbPlus className="fs-lg" /> Nueva Cotización
                        </Button>
                    </div>

                    <div className="d-flex align-items-center gap-2">
                        <span className="me-2 fw-semibold">Filtrar por:</span>

                        <div className="app-search">
                            <select
                                className="form-select form-control my-1 my-md-0"
                                value={filtroEstado}
                                onChange={(e) => setFiltroEstado(e.target.value)}
                            >
                                {ESTADOS.map((estado) => (
                                    <option key={estado.value} value={estado.value}>
                                        {estado.label}
                                    </option>
                                ))}
                            </select>
                            <LuShuffle className="app-search-icon text-muted" />
                        </div>

                        <div>
                            <select
                                className="form-select form-control my-1 my-md-0"
                                value={table.getState().pagination.pageSize}
                                onChange={(e) => table.setPageSize(Number(e.target.value))}
                            >
                                {[5, 8, 10, 15, 20].map((size) => (
                                    <option key={size} value={size}>
                                        {size}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </CardHeader>

                {error && (
                    <CardBody>
                        <Alert variant="warning">
                            <strong>Advertencia:</strong> {error}
                            {error.includes('no existe en Strapi') && (
                                <div className="mt-2">
                                    <small>
                                        Por favor, crea el content-type "Cotización" en Strapi según la documentación en{' '}
                                        <code>docs/crm/STRAPI-SCHEMA-COTIZACIONES.md</code>
                                    </small>
                                </div>
                            )}
                        </Alert>
                    </CardBody>
                )}

                <CardBody className="p-0">
                    <DataTable<CotizacionType> table={table} emptyMessage="No se encontraron cotizaciones" />
                </CardBody>

                {table.getRowModel().rows.length > 0 && (
                    <CardFooter className="border-0">
                        <TablePagination
                            totalItems={totalRows}
                            start={start}
                            end={end}
                            itemsName="cotizaciones"
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
            </Card>

            <CotizacionModal
                show={showModal}
                onHide={() => {
                    setShowModal(false)
                    setEditingCotizacion(null)
                }}
                onSuccess={() => {
                    loadCotizaciones()
                    setShowModal(false)
                    setEditingCotizacion(null)
                }}
                cotizacion={editingCotizacion}
            />

            <DeleteConfirmationModal
                show={showDeleteModal}
                onHide={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                selectedCount={Object.keys(selectedRowIds).length}
                itemName="cotizaciones"
            />
        </>
    )
}

export default EstimationsTable
