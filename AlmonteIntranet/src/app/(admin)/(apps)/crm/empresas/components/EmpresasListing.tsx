'use client'
import {
  ColumnDef,
  ColumnFiltersState,
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
import Link from 'next/link'
import { useState, useMemo, useEffect, useCallback } from 'react'
import { Button, Card, CardFooter, CardHeader, CardBody, Col, Row, Alert, ProgressBar } from 'react-bootstrap'
import { LuSearch, LuPhone, LuMail, LuUsers, LuPlus, LuTrendingUp, LuShoppingCart } from 'react-icons/lu'
import { TbEye, TbEdit, TbTrash, TbList, TbArrowUp, TbArrowDown, TbCurrencyDollar } from 'react-icons/tb'

import DataTable from '@/components/table/DataTable'
import DeleteConfirmationModal from '@/components/table/DeleteConfirmationModal'
import TablePagination from '@/components/table/TablePagination'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'

interface EmpresaType {
  id: string
  nombre: string
  razon_social?: string
  rut?: string
  giro?: string
  direccion?: string
  comuna?: string
  region?: string
  telefonos?: string[]
  emails?: string[]
  website?: string
  contactosCount?: number
  createdAt?: string
  estado?: string
  createdAtTimestamp?: number
}

const columnHelper = createColumnHelper<EmpresaType>()

// Lista de regiones de Chile
export const REGIONES = [
  'Arica y Parinacota',
  'Tarapacá',
  'Antofagasta',
  'Atacama',
  'Coquimbo',
  'Valparaíso',
  'Metropolitana',
  "O'Higgins",
  'Maule',
  'Ñuble',
  'Biobío',
  'Araucanía',
  'Los Ríos',
  'Los Lagos',
  'Aysén',
  'Magallanes',
]

const EmpresasListing = ({ empresas: initialEmpresas, error: initialError }: { empresas: any[]; error: string | null }) => {
  const router = useRouter()
  const [empresas, setEmpresas] = useState<any[]>(initialEmpresas)
  const [error, setError] = useState<string | null>(initialError)
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  
  // Estados de búsqueda y filtros
  const [globalFilter, setGlobalFilter] = useState('')
  const [region, setRegion] = useState('')
  
  // Estados de tabla
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'empresa', desc: false }
  ])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 })
  const [totalRows, setTotalRows] = useState(0)
  
  // Estados de modales
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; empresa: any | null }>({ open: false, empresa: null })
  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({})
  
  // Calcular métricas
  const metrics = useMemo(() => {
    const totalEmpresas = empresas.length
    const empresasActivas = empresas.filter((e: any) => {
      const attrs = e.attributes || e
      return attrs.estado === 'Activa' || !attrs.estado
    }).length
    const totalContactos = empresas.reduce((sum, e: any) => sum + ((e as any)._contactosCount || 0), 0)
    const empresasConOportunidades = empresas.length // Simplificado, se puede mejorar con llamada API
    
    return {
      total: totalEmpresas,
      activas: empresasActivas,
      totalContactos,
      empresasConOportunidades,
    }
  }, [empresas])

  // Función para obtener datos
  const fetchEmpresas = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams()
      params.append('page', (pagination.pageIndex + 1).toString())
      params.append('pageSize', pagination.pageSize.toString())
      if (globalFilter) params.append('search', globalFilter)
      if (region) params.append('region', region)

      const response = await fetch(`/api/crm/empresas?${params.toString()}`)
      const data = await response.json()
      
      if (data.success && data.data) {
        const empresasData = Array.isArray(data.data) ? data.data : [data.data]
        setEmpresas(empresasData)
        setTotalRows(data.meta?.pagination?.total || 0)
        
        // Obtener conteo de contactos para cada empresa
        const empresasConContactos = await Promise.all(
          empresasData.map(async (empresa: any) => {
            const empresaId = empresa.documentId || empresa.id
            if (!empresaId) return empresa
            
            try {
              const contactosResponse = await fetch(`/api/crm/empresas/${empresaId}/contacts`)
              const contactosData = await contactosResponse.json()
              if (contactosData.success && contactosData.data) {
                const contactosArray = Array.isArray(contactosData.data) ? contactosData.data : [contactosData.data]
                empresa._contactosCount = contactosArray.length
              } else {
                empresa._contactosCount = 0
              }
            } catch (err) {
              empresa._contactosCount = 0
            }
            return empresa
          })
        )
        setEmpresas(empresasConContactos)
      } else {
        setError(data.error || 'Error al obtener empresas')
      }
    } catch (err: any) {
      setError(err.message || 'Error al conectar con la API')
    } finally {
      setLoading(false)
    }
  }, [globalFilter, region, pagination.pageIndex, pagination.pageSize])

  // Debounce para búsqueda
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchEmpresas()
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [fetchEmpresas])

  // Función para generar iniciales
  const generarIniciales = (nombre: string) => {
    const palabras = nombre.split(' ')
    if (palabras.length >= 2) {
      return (palabras[0][0] + palabras[1][0]).toUpperCase()
    }
    return nombre.substring(0, 2).toUpperCase()
  }

  // Mapear datos de Strapi al formato esperado
  const mappedEmpresas: EmpresaType[] = useMemo(() => {
    if (!empresas || !Array.isArray(empresas)) return []
    
    return empresas.map((empresa: any) => {
      const attrs = empresa.attributes || {}
      const data = Object.keys(attrs).length > 0 ? attrs : empresa
      
      // Obtener teléfonos y emails
      const telefonosArray = data.telefonos || []
      const emailsArray = data.emails || []
      const telefonos = telefonosArray.map((t: any) => t.telefono_norm || t.telefono_raw || t.numero || t.telefono || '').filter(Boolean)
      const emails = emailsArray.map((e: any) => e.email || '').filter(Boolean)
      
      // Obtener comuna y región
      let comunaNombre = ''
      let regionNombre = ''
      if (data.comuna) {
        if (data.comuna.data?.attributes) {
          comunaNombre = data.comuna.data.attributes.comuna_nombre || data.comuna.data.attributes.nombre || ''
          regionNombre = data.comuna.data.attributes.region_nombre || ''
        } else if (data.comuna.attributes) {
          comunaNombre = data.comuna.attributes.comuna_nombre || data.comuna.attributes.nombre || ''
          regionNombre = data.comuna.attributes.region_nombre || ''
        } else if (typeof data.comuna === 'string') {
          comunaNombre = data.comuna
        } else if (data.comuna.comuna_nombre || data.comuna.nombre) {
          comunaNombre = data.comuna.comuna_nombre || data.comuna.nombre || ''
          regionNombre = data.comuna.region_nombre || ''
        }
      }
      
      // Obtener dirección
      let direccionStr = ''
      if (Array.isArray(data.direcciones) && data.direcciones.length > 0) {
        const primeraDireccion = data.direcciones[0]
        direccionStr = `${primeraDireccion.nombre_calle || ''} ${primeraDireccion.numero_calle || ''}`.trim()
        if (!direccionStr && comunaNombre) {
          direccionStr = comunaNombre
        }
      } else if (comunaNombre) {
        direccionStr = comunaNombre
      }
      
      // Obtener fecha de creación
      const createdAt = data.createdAt || empresa.createdAt || new Date().toISOString()
      const createdDate = new Date(createdAt)
      
      return {
        id: empresa.documentId || empresa.id?.toString() || '',
        nombre: data.empresa_nombre || data.nombre || 'Sin nombre',
        razon_social: data.razon_social || '',
        rut: data.rut || '',
        giro: data.giro || '',
        direccion: direccionStr,
        comuna: comunaNombre,
        region: regionNombre || data.region || '',
        telefonos,
        emails,
        website: data.website || '',
        contactosCount: (empresa as any)._contactosCount || 0,
        estado: data.estado || '',
        createdAt,
        createdAtTimestamp: createdDate.getTime(),
      }
    })
  }, [empresas])

  const columns: ColumnDef<EmpresaType, any>[] = useMemo(() => [
    {
      id: 'select',
      maxSize: 45,
      size: 45,
      header: ({ table }: { table: TableType<EmpresaType> }) => (
        <input
          type="checkbox"
          className="form-check-input form-check-input-light fs-14"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row }: { row: TableRow<EmpresaType> }) => (
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
    {
      id: 'empresa',
      header: 'EMPRESA',
      accessorKey: 'nombre',
      enableSorting: true,
      cell: ({ row }) => {
        const empresa = row.original
        const iniciales = generarIniciales(empresa.nombre)
        return (
          <div className="d-flex align-items-center">
            <div className="avatar-sm rounded-circle me-2 flex-shrink-0 bg-primary-subtle d-flex align-items-center justify-content-center">
              <span className="avatar-title text-primary fw-semibold fs-12">
                {iniciales}
              </span>
            </div>
            <div>
              <Link 
                href={`/crm/empresas/${empresa.id}`}
                className="text-decoration-none"
              >
                <h5 className="mb-0 fw-semibold text-primary" style={{ cursor: 'pointer' }}>
                  {empresa.nombre}
                </h5>
              </Link>
              {empresa.razon_social && empresa.razon_social !== empresa.nombre && (
                <div className="text-muted small">{empresa.razon_social}</div>
              )}
              {empresa.rut && (
                <span className="badge badge-soft-info fs-xxs me-1">RUT: {empresa.rut}</span>
              )}
            </div>
          </div>
        )
      },
    },
    {
      id: 'comunicacion',
      header: 'COMUNICACIÓN',
      filterFn: 'includesString',
      enableColumnFilter: true,
      cell: ({ row }) => {
        const empresa = row.original
        const emails = empresa.emails?.filter(e => e) || []
        const telefonos = empresa.telefonos?.filter(t => t) || []
        return (
          <div className="fs-xs">
            {emails.length > 0 && (
              <div className="mb-1 d-flex align-items-center">
                <LuMail className="me-1" size={12} />
                <span>{emails.join(', ')}</span>
              </div>
            )}
            {telefonos.length > 0 && (
              <div className="d-flex align-items-center">
                <LuPhone className="me-1" size={12} />
                <span>{telefonos.join(', ')}</span>
              </div>
            )}
            {emails.length === 0 && telefonos.length === 0 && (
              <span className="text-muted">-</span>
            )}
          </div>
        )
      },
    },
    {
      id: 'direccion',
      header: 'DIRECCIÓN',
      filterFn: 'includesString',
      enableColumnFilter: true,
      cell: ({ row }) => {
        const empresa = row.original
        return (
          <div className="fs-xs">
            {empresa.direccion && (
              <div>{empresa.direccion}</div>
            )}
            {empresa.comuna && (
              <div className="text-muted">{empresa.comuna}</div>
            )}
            {!empresa.direccion && !empresa.comuna && (
              <span className="text-muted">-</span>
            )}
          </div>
        )
      },
    },
    {
      id: 'region',
      header: 'REGIÓN',
      accessorKey: 'region',
      filterFn: 'includesString',
      enableColumnFilter: true,
      cell: ({ row }) => {
        const empresa = row.original
        return empresa.region ? (
          <span>{empresa.region}</span>
        ) : (
          <span className="text-muted">-</span>
        )
      },
    },
    {
      id: 'contactos',
      header: 'CONTACTOS',
      accessorFn: (row) => row.contactosCount || 0,
      enableColumnFilter: true,
      cell: ({ row }) => {
        const empresa = row.original
        return (
          <div className="d-flex align-items-center">
            <LuUsers className="me-1 text-muted" size={16} />
            <span>{empresa.contactosCount || 0}</span>
          </div>
        )
      },
    },
    {
      id: 'actions',
      header: 'ACCIONES',
      cell: ({ row }: { row: TableRow<EmpresaType> }) => {
        const empresa = row.original
        return (
          <div className="d-flex gap-1">
            <Link href={`/crm/empresas/${empresa.id}`}>
              <Button variant="default" size="sm" className="btn-icon rounded-circle">
                <TbEye className="fs-lg" />
              </Button>
            </Link>
            <Link href={`/crm/empresas/${empresa.id}/editar`}>
              <Button variant="default" size="sm" className="btn-icon rounded-circle" title="Editar">
                <TbEdit className="fs-lg" />
              </Button>
            </Link>
            <Button
              variant="default"
              size="sm"
              className="btn-icon rounded-circle"
              title="Eliminar"
              onClick={() => {
                const originalEmpresa = empresas.find((e: any) => {
                  const eId = e.documentId || e.id?.toString() || ''
                  return eId === empresa.id
                })
                setDeleteModal({ open: true, empresa: originalEmpresa || empresa })
              }}
            >
              <TbTrash className="fs-lg text-danger" />
            </Button>
          </div>
        )
      },
    },
  ], [empresas])

  const table = useReactTable<EmpresaType>({
    data: mappedEmpresas,
    columns,
    state: { sorting, columnFilters, pagination, rowSelection: selectedRowIds },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    onRowSelectionChange: setSelectedRowIds,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableColumnFilters: true,
    enableRowSelection: true,
    manualPagination: false,
    filterFns: {
      includesString: (row, columnId, filterValue) => {
        const value = row.getValue(columnId) as string
        if (!filterValue) return true
        if (!value) return false
        return String(value).toLowerCase().includes(String(filterValue).toLowerCase())
      },
    },
  })

  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const totalItems = globalFilter || region ? (totalRows > 0 ? totalRows : mappedEmpresas.length) : mappedEmpresas.length

  const start = pageIndex * pageSize + 1
  const end = Math.min(start + pageSize - 1, totalItems)

  const handleDelete = async () => {
    if (!deleteModal.empresa) return

    const empresaId = deleteModal.empresa.documentId || deleteModal.empresa.id
    
    if (!empresaId) {
      setError('No se pudo obtener el ID de la empresa')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/crm/empresas/${empresaId}`, {
        method: 'DELETE',
      })

      let result: any = { success: true }
      
      if (response.ok) {
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          try {
            const text = await response.text()
            if (text && text.trim().length > 0) {
              result = JSON.parse(text)
            }
          } catch (parseError) {
            result = { success: true }
          }
        } else {
          result = { success: true }
        }
      }

      if (!response.ok || result.success === false) {
        throw new Error(result.error || 'Error al eliminar empresa')
      }

      setEmpresas(prev => prev.filter(e => {
        const eId = (e as any).documentId || (e as any).id
        return eId !== empresaId
      }))
      
      setDeleteModal({ open: false, empresa: null })
      setError(null)
      setSuccessMessage('Empresa eliminada exitosamente')
      
      router.refresh()
      fetchEmpresas()
      
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err: any) {
      setError(err.message || 'Error al eliminar empresa')
    } finally {
      setLoading(false)
    }
  }

  // Aplicar filtros
  useEffect(() => {
    const filters: ColumnFiltersState = []
    if (region) {
      filters.push({ id: 'region', value: region })
    }
    setColumnFilters(filters)
  }, [region])

  if (error && !empresas.length) {
    return (
      <Row>
        <Col xs={12}>
          <Alert variant="danger">
            <strong>Error:</strong> {error}
          </Alert>
        </Col>
      </Row>
    )
  }

  // Widgets de métricas (reutilizando patrón de deals)
  const metricWidgets = [
    {
      count: metrics.total.toString(),
      change: 'Total',
      icon: TbArrowUp,
      title: 'Total de Empresas',
      progress: 100,
      variant: 'primary' as const,
    },
    {
      count: metrics.activas.toString(),
      change: `${Math.round((metrics.activas / Math.max(metrics.total, 1)) * 100)}%`,
      icon: TbArrowUp,
      title: 'Empresas Activas',
      progress: (metrics.activas / Math.max(metrics.total, 1)) * 100,
      variant: 'success' as const,
    },
    {
      count: metrics.totalContactos.toString(),
      change: 'Contactos',
      icon: TbArrowUp,
      title: 'Total Contactos',
      progress: Math.min((metrics.totalContactos / Math.max(metrics.total, 1)) * 10, 100),
      variant: 'info' as const,
    },
    {
      count: metrics.empresasConOportunidades.toString(),
      change: 'Con Oportunidades',
      icon: TbCurrencyDollar,
      title: 'Con Oportunidades',
      progress: Math.min((metrics.empresasConOportunidades / Math.max(metrics.total, 1)) * 100, 100),
      variant: 'warning' as const,
    },
  ]

  return (
    <>
      {/* Widgets de Métricas */}
      <Row className="mb-4">
        {metricWidgets.map((widget, idx) => (
          <Col key={idx} xs={12} md={6} lg={3} xxl={3}>
            <Card className="mb-2">
              <CardBody>
                <div className="mb-3 d-flex justify-content-between align-items-center">
                  <h5 className="fs-xl mb-0">{widget.count}</h5>
                  <span>
                    {widget.change} <widget.icon className={`text-${widget.variant}`} />
                  </span>
                </div>
                <p className="text-muted mb-2">{widget.title}</p>
                <ProgressBar now={widget.progress} className="progress-sm mb-0" variant={widget.variant} />
              </CardBody>
            </Card>
          </Col>
        ))}
      </Row>
      
      <Row>
        <Col xs={12}>
        <Card className="mb-4">
          <CardHeader className="d-flex justify-content-between align-items-center">
            <div className="d-flex gap-2">
              <div className="app-search">
                <input
                  type="search"
                  className="form-control"
                  placeholder="Buscar por nombre, razón social, RUT..."
                  value={globalFilter ?? ''}
                  onChange={(e) => {
                    setGlobalFilter(e.target.value)
                    setPagination({ pageIndex: 0, pageSize: pagination.pageSize })
                  }}
                />
                <LuSearch className="app-search-icon text-muted" />
              </div>
            </div>

            <div className="d-flex align-items-center gap-2">
              <span className="me-2 fw-semibold">Filtrar por:</span>
              <select
                className="form-select form-select-sm"
                style={{ width: 'auto' }}
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              >
                <option value="">Todas las regiones</option>
                {REGIONES.map((reg) => (
                  <option key={reg} value={reg}>
                    {reg}
                  </option>
                ))}
              </select>
            </div>

            <div className="d-flex gap-1">
              <Button variant="primary" className="ms-1" onClick={() => router.push('/crm/empresas/nuevo')}>
                <LuPlus className="fs-sm me-2" /> Agregar Empresa
              </Button>
            </div>
          </CardHeader>

          <CardBody>
            {successMessage && (
              <Alert variant="success" dismissible onClose={() => setSuccessMessage(null)} className="mb-3">
                {successMessage}
              </Alert>
            )}
            {error && (
              <Alert variant="warning" dismissible onClose={() => setError(null)} className="mb-3">
                <strong>Advertencia:</strong> {error}
              </Alert>
            )}

            {loading && mappedEmpresas.length === 0 ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Cargando...</span>
                </div>
              </div>
            ) : (
              <DataTable<EmpresaType>
                table={table}
                emptyMessage="No se encontraron empresas"
              />
            )}
          </CardBody>

          {table.getRowModel().rows.length > 0 && (
            <CardFooter className="border-0">
              <TablePagination
                totalItems={totalItems}
                start={start}
                end={end}
                itemsName="empresas"
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
            show={deleteModal.open}
            onHide={() => setDeleteModal({ open: false, empresa: null })}
            onConfirm={handleDelete}
            selectedCount={1}
            itemName="empresa"
          />
        </Card>
      </Col>
    </Row>
    </>
  )
}

export default EmpresasListing

