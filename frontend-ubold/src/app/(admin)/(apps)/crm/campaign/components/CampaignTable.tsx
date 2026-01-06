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
} from '@tanstack/react-table'
import Image from 'next/image'
import { useState } from 'react'
import { Button, Card, CardBody, CardFooter, CardHeader } from 'react-bootstrap'
import { LuDollarSign, LuSearch, LuShuffle } from 'react-icons/lu'
import { TbEdit, TbEye, TbPlus, TbTrash } from 'react-icons/tb'

import DataTable from '@/components/table/DataTable'
import DeleteConfirmationModal from '@/components/table/DeleteConfirmationModal'
import TablePagination from '@/components/table/TablePagination'
import { getCampaigns, type CampaignType, type CampaignsQuery } from '../data'
import CampaignModal from './CampaignModal'
import { useEffect, useCallback } from 'react'
import { Spinner, Alert } from 'react-bootstrap'

const columnHelper = createColumnHelper<CampaignType>()

interface CampaignTableProps {
    onCampaignCreated?: () => void
}

const CampaignTable = ({ onCampaignCreated }: CampaignTableProps) => {
    const [showModal, setShowModal] = useState(false);
    const [editingCampaign, setEditingCampaign] = useState<CampaignType | null>(null)
    const [campaignsData, setCampaignsData] = useState<CampaignType[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [totalRows, setTotalRows] = useState(0)

    const columns = [
        {
            id: 'select',
            header: ({ table }: { table: TableType<CampaignType> }) => (
                <input
                    type="checkbox"
                    className="form-check-input form-check-input-light fs-14"
                    checked={table.getIsAllRowsSelected()}
                    onChange={table.getToggleAllRowsSelectedHandler()}
                />
            ),
            cell: ({ row }: { row: TableRow<CampaignType> }) => (
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

        columnHelper.accessor('name', { header: 'Nombre de Campaña' }),

        columnHelper.accessor('creator', {
            header: 'Creador'
            , cell: ({ row }) => (
                <div className="d-flex gap-2 align-items-center">
                    <Image
                        src={row.original.creator.avatar}
                        alt={row.original.creator.name}
                        height={20}
                        className="avatar-xs rounded-circle"
                    />
                    <span className="link-reset">{row.original.creator.name}</span>
                </div>
            ),
        }),
        columnHelper.accessor('budget', { header: 'Presupuesto' }),
        columnHelper.accessor('goals', { header: 'Objetivo' }),

        columnHelper.accessor('status', {
            header: 'Estado',
            cell: ({ row }) => {
                const statusMap: Record<string, { label: string; color: string }> = {
                    'In Progress': { label: 'En Progreso', color: 'bg-warning-subtle text-warning' },
                    'Success': { label: 'Exitosa', color: 'bg-success-subtle text-success' },
                    'Scheduled': { label: 'Programada', color: 'bg-info-subtle text-info' },
                    'Failed': { label: 'Fallida', color: 'bg-danger-subtle text-danger' },
                    'Ongoing': { label: 'En Curso', color: 'bg-primary-subtle text-primary' },
                }
                const statusInfo = statusMap[row.original.status] || { label: row.original.status, color: 'bg-secondary-subtle text-secondary' }
                return <span className={`badge ${statusInfo.color}`}>{statusInfo.label}</span>
            },
        }),

        columnHelper.accessor('tags', {
            header: 'Etiquetas',
            cell: ({ row }) => (
                <div className="d-flex gap-1 flex-wrap">
                    {row.original.tags.map((tag, index) => (
                        <span key={index} className="badge badge-label text-bg-light">
                            {tag}
                        </span>
                    ))}
                </div>
            ),
        }),
        columnHelper.accessor('dateCreated', {
            header: 'Fecha de Creación',
            cell: ({ row }) => (
                <>
                    {row.original.dateCreated} <small className="text-muted">{row.original.dateCreatedTime}</small>
                </>
            ),
        }),

        {
            header: 'Acciones',
            cell: ({ row }: { row: TableRow<CampaignType> }) => (
                <div className="d-flex  gap-1">
                    <Button variant="default" size="sm" className="btn btn-default btn-icon btn-sm rounded">
                        <TbEye className="fs-lg" />
                    </Button>
                    <Button 
                        variant="default" 
                        size="sm" 
                        className="btn btn-default btn-icon btn-sm rounded"
                        onClick={async () => {
                            // Cargar datos completos de la campaña
                            if (row.original.realId) {
                                const cleanId = row.original.realId.replace(/^#CAMP/, '').replace(/^#/, '')
                                try {
                                    const response = await fetch(`/api/crm/campaigns/${cleanId}`)
                                    const result = await response.json()
                                    if (result.success && result.data) {
                                        // Los datos ya vienen transformados desde la API
                                        // Solo necesitamos usar los datos que tenemos
                                        setEditingCampaign(row.original)
                                        setShowModal(true)
                                    } else {
                                        // Si falla, usar los datos que ya tenemos
                                        setEditingCampaign(row.original)
                                        setShowModal(true)
                                    }
                                } catch (err) {
                                    console.error('Error loading campaign:', err)
                                    // Si falla, usar los datos que ya tenemos
                                    setEditingCampaign(row.original)
                                    setShowModal(true)
                                }
                            } else {
                                setEditingCampaign(row.original)
                                setShowModal(true)
                            }
                        }}
                    >
                        <TbEdit className="fs-lg" />
                    </Button>
                    <Button
                        variant="default"
                        size="sm"
                        className="btn btn-default btn-icon btn-sm rounded"
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


    const [globalFilter, setGlobalFilter] = useState('')
    const [sorting, setSorting] = useState<SortingState>([])
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 })
    const [filtroEstado, setFiltroEstado] = useState<string>('')

    const loadCampaigns = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const query: CampaignsQuery = {
                page: pagination.pageIndex + 1,
                pageSize: pagination.pageSize,
                search: globalFilter || undefined,
                estado: filtroEstado || undefined,
            }
            
            const result = await getCampaigns(query)
            setCampaignsData(result.campaigns)
            setTotalRows(result.pagination.total)
        } catch (err: any) {
            setError(err.message || 'Error al cargar campañas')
        } finally {
            setLoading(false)
        }
    }, [pagination.pageIndex, pagination.pageSize, globalFilter, filtroEstado])

    useEffect(() => {
        loadCampaigns()
    }, [loadCampaigns])

    const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({})

    const table = useReactTable({
        data: campaignsData,
        columns,
        state: { sorting, globalFilter, pagination, rowSelection: selectedRowIds },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        onPaginationChange: setPagination,
        onRowSelectionChange: setSelectedRowIds,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        globalFilterFn: 'includesString',
        enableColumnFilters: true,
        enableRowSelection: true,
        manualPagination: true,
        pageCount: Math.ceil(totalRows / pagination.pageSize),
    })

    const pageIndex = table.getState().pagination.pageIndex
    const pageSize = table.getState().pagination.pageSize

    const start = pageIndex * pageSize + 1
    const end = Math.min(start + pageSize - 1, totalRows)

    const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false)

    const toggleDeleteModal = () => {
        setShowDeleteModal(!showDeleteModal)
    }

    const handleDelete = async () => {
        const selectedIds = Object.keys(selectedRowIds)
        try {
            for (const rowId of selectedIds) {
                const campaign = campaignsData[parseInt(rowId)]
                if (campaign?.realId) {
                    const cleanId = campaign.realId.replace(/^#CAMP/, '').replace(/^#/, '')
                    const response = await fetch(`/api/crm/campaigns/${cleanId}`, {
                        method: 'DELETE',
                    })
                    const result = await response.json()
                    if (!response.ok || !result.success) {
                        throw new Error(result.error || 'Error al eliminar campaña')
                    }
                }
            }
            await loadCampaigns()
            setSelectedRowIds({})
            setShowDeleteModal(false)
        } catch (err: any) {
            setError(err.message || 'Error al eliminar campañas')
        }
    }

    if (loading && campaignsData.length === 0) {
        return (
            <Card>
                <CardBody className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-2 text-muted">Cargando campañas...</p>
                </CardBody>
            </Card>
        )
    }

    return (
        <Card>
            {error && (
                <Alert variant="danger" className="m-3">
                    <strong>Error:</strong> {error}
                </Alert>
            )}
            <CardHeader className="border-light justify-content-between">
                <div className="d-flex gap-2">
                    <div className="app-search">
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Buscar campaña..."
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

                    <Button className="btn btn-primary" onClick={() => {
                        setEditingCampaign(null)
                        setShowModal(true)
                    }}>
                        <TbPlus className="fs-lg" /> Crear Campaña
                    </Button>
                    <CampaignModal 
                        show={showModal} 
                        campaign={editingCampaign}
                        onHide={() => {
                            setShowModal(false)
                            setEditingCampaign(null)
                        }}
                        onSuccess={() => {
                            setShowModal(false)
                            setEditingCampaign(null)
                            loadCampaigns()
                            if (onCampaignCreated) {
                                onCampaignCreated()
                            }
                        }}
                    />
                </div>

                <div className="d-flex align-items-center gap-2">
                    <span className="me-2 fw-semibold">Filtrar por:</span>

                    <div className="app-search">
                        <select
                            className="form-select form-control my-1 my-md-0"
                            value={(() => {
                                // Mapear estado Strapi a estado UI para mostrar
                                const estadoMap: Record<string, string> = {
                                    'en_progreso': 'In Progress',
                                    'exitosa': 'Success',
                                    'programada': 'Scheduled',
                                    'fallida': 'Failed',
                                    'en_curso': 'Ongoing',
                                }
                                return estadoMap[filtroEstado] || 'All'
                            })()}
                            onChange={(e) => {
                                const value = e.target.value
                                // Mapear estado UI a estado Strapi
                                const estadoMap: Record<string, string> = {
                                    'In Progress': 'en_progreso',
                                    'Success': 'exitosa',
                                    'Scheduled': 'programada',
                                    'Failed': 'fallida',
                                    'Ongoing': 'en_curso',
                                }
                                setFiltroEstado(value === 'All' ? '' : (estadoMap[value] || value))
                            }}>
                            <option value="All">Estado</option>
                            <option value="Success">Success</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Scheduled">Scheduled</option>
                            <option value="Failed">Failed</option>
                            <option value="Ongoing">Ongoing</option>
                        </select>
                        <LuShuffle className="app-search-icon text-muted" />
                    </div>

                    <div className="app-search">
                        <select
                            className="form-select form-control my-1 my-md-0"
                            value={(table.getColumn('budget')?.getFilterValue() as string) ?? 'All'}
                            onChange={(e) => table.getColumn('budget')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)}>
                            <option value="All">Rango de Presupuesto</option>
                            <option value="0-5000">$0 - $5,000</option>
                            <option value="5001-10000">$5,001 - $10,000</option>
                            <option value="10001-20000">$10,001 - $20,000</option>
                            <option value="20001-50000">$20,001 - $50,000</option>
                            <option value="50000+">$50,000+</option>
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
            </CardHeader>
            <DataTable<CampaignType> table={table} emptyMessage="No se encontraron campañas" />

            {table.getRowModel().rows.length > 0 && (
                <CardFooter className="border-0">
                    <TablePagination
                        totalItems={totalRows}
                        start={start}
                        end={end}
                        itemsName="campañas"
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
                itemName="campaña"
            />
        </Card>

    )
}

export default CampaignTable

