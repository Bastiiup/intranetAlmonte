'use client'

import {
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { useState, useEffect, useCallback } from 'react'
import {
  Button,
  Card,
  CardFooter,
  CardHeader,
  Col,
  Row,
  Alert,
  Badge,
  Spinner,
  Tabs,
  Tab,
} from 'react-bootstrap'
import { LuSearch, LuRefreshCw, LuUserPlus, LuBriefcase, LuCheckCircle } from 'react-icons/lu'

import DataTable from '@/components/table/DataTable'
import TablePagination from '@/components/table/TablePagination'
import CrearProfesorModal from './CrearProfesorModal'
import AsignarCargaModal from './AsignarCargaModal'

export interface ProfesorType {
  id: number | string
  documentId?: string
  nombres: string
  primer_apellido: string
  segundo_apellido: string
  nombre_completo: string
  rut: string
  email: string
  username: string
  confirmed: boolean
  blocked: boolean
  activo: boolean
  usuarioId: number | string | null
  status_nombres?: string | null
  createdAt?: string | null
  carga_academica?: string
  carga_items?: string[]
}

const columnHelper = createColumnHelper<ProfesorType>()

type TabKey = 'pendientes' | 'activos'

export default function ProfesoresListing() {
  const [activeTab, setActiveTab] = useState<TabKey>('pendientes')
  const [pendientes, setPendientes] = useState<ProfesorType[]>([])
  const [activos, setActivos] = useState<ProfesorType[]>([])
  const [loadingPendientes, setLoadingPendientes] = useState(true)
  const [loadingActivos, setLoadingActivos] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [showCrearModal, setShowCrearModal] = useState(false)
  const [showAsignarModal, setShowAsignarModal] = useState(false)
  const [profesorSeleccionado, setProfesorSeleccionado] = useState<ProfesorType | null>(null)
  const [aprobandoId, setAprobandoId] = useState<string | number | null>(null)

  const fetchPendientes = useCallback(async (search?: string) => {
    setLoadingPendientes(true)
    setError(null)
    try {
      const params = new URLSearchParams({ pageSize: '100', status: 'Por Verificar' })
      if (search) params.set('search', search)
      const res = await fetch(`/api/mira/profesores?${params.toString()}`)
      const data = await res.json()
      if (data.success) {
        setPendientes(data.data || [])
      } else {
        setError(data.error || 'Error al obtener pendientes')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error de conexión')
    } finally {
      setLoadingPendientes(false)
    }
  }, [])

  const fetchActivos = useCallback(async (search?: string) => {
    setLoadingActivos(true)
    setError(null)
    try {
      const params = new URLSearchParams({ pageSize: '100', status: 'Aprobado' })
      if (search) params.set('search', search)
      const res = await fetch(`/api/mira/profesores?${params.toString()}`)
      const data = await res.json()
      if (data.success) {
        setActivos(data.data || [])
      } else {
        setError(data.error || 'Error al obtener profesores activos')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error de conexión')
    } finally {
      setLoadingActivos(false)
    }
  }, [])

  useEffect(() => {
    fetchPendientes()
  }, [fetchPendientes])

  useEffect(() => {
    fetchActivos()
  }, [fetchActivos])

  const handleSearch = () => {
    if (activeTab === 'pendientes') fetchPendientes(searchTerm)
    else fetchActivos(searchTerm)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  const handleRefrescar = () => {
    fetchPendientes(searchTerm)
    fetchActivos(searchTerm)
  }

  const handleProfesorCreado = () => {
    setShowCrearModal(false)
    fetchPendientes(searchTerm)
    fetchActivos(searchTerm)
  }

  const handleAprobar = async (profesor: ProfesorType) => {
    const id = profesor.documentId || String(profesor.id)
    if (!id) return
    setAprobandoId(id)
    setError(null)
    try {
      const res = await fetch(`/api/mira/profesores/${encodeURIComponent(id)}/aprobar`, { method: 'PUT' })
      const data = await res.json()
      if (data.success) {
        setPendientes((prev) => prev.filter((p) => (p.documentId || String(p.id)) !== id))
        fetchActivos(searchTerm)
      } else {
        setError(data.error || 'Error al aprobar')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al aprobar')
    } finally {
      setAprobandoId(null)
    }
  }

  const handleAsignarCerrar = () => {
    setShowAsignarModal(false)
    setProfesorSeleccionado(null)
    fetchActivos(searchTerm)
  }

  const formatFecha = (createdAt: string | null | undefined) => {
    if (!createdAt) return '—'
    try {
      const d = new Date(createdAt)
      return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
    } catch {
      return '—'
    }
  }

  const columnsPendientes = [
    columnHelper.accessor('nombre_completo', {
      header: 'Nombre',
      cell: (info) => <span className="fw-semibold">{info.getValue() || '—'}</span>,
    }),
    columnHelper.accessor('rut', {
      header: 'RUT',
      cell: (info) => <span className="font-monospace text-muted">{info.getValue() || '—'}</span>,
    }),
    columnHelper.accessor('email', {
      header: 'Email',
      cell: (info) => <span className="text-primary">{info.getValue() || '—'}</span>,
    }),
    columnHelper.display({
      id: 'fecha_registro',
      header: 'Fecha de registro',
      cell: ({ row }) => formatFecha(row.original.createdAt),
    }),
    columnHelper.display({
      id: 'acciones',
      header: 'Acción',
      cell: ({ row }) => {
        const p = row.original
        const id = p.documentId || String(p.id)
        const loading = aprobandoId === id
        return (
          <Button
            variant="success"
            size="sm"
            onClick={() => handleAprobar(p)}
            disabled={loading}
            className="d-flex align-items-center gap-1"
            title="Aprobar cuenta"
          >
            {loading ? (
              <Spinner animation="border" size="sm" className="me-1" />
            ) : (
              <LuCheckCircle size={16} />
            )}
            Aprobar cuenta
          </Button>
        )
      },
    }),
  ]

  const columnsActivos = [
    columnHelper.accessor('nombre_completo', {
      header: 'Nombre',
      cell: (info) => <span className="fw-semibold">{info.getValue() || '—'}</span>,
    }),
    columnHelper.accessor('rut', {
      header: 'RUT',
      cell: (info) => <span className="font-monospace text-muted">{info.getValue() || '—'}</span>,
    }),
    columnHelper.accessor('email', {
      header: 'Email',
      cell: (info) => <span className="text-primary">{info.getValue() || '—'}</span>,
    }),
    columnHelper.display({
      id: 'carga',
      header: 'Carga académica',
      cell: ({ row }) => {
        const summary = row.original.carga_academica
        const items = row.original.carga_items ?? []
        const sinAsignar = !summary || summary === 'Sin asignar'
        if (sinAsignar) {
          return <span className="text-muted">Sin asignar</span>
        }
        if (items.length === 1) {
          return <span className="text-dark small">{items[0]}</span>
        }
        if (items.length <= 3) {
          return (
            <div className="d-flex flex-wrap gap-1 align-items-center">
              {items.map((item, i) => (
                <Badge key={i} bg="light" text="dark" className="fw-normal border border-secondary">
                  {item.length > 40 ? `${item.slice(0, 37)}…` : item}
                </Badge>
              ))}
            </div>
          )
        }
        return (
          <div>
            <span className="small text-dark d-block">{summary}</span>
            <div className="d-flex flex-wrap gap-1 mt-1">
              {items.slice(0, 4).map((item, i) => (
                <Badge key={i} bg="light" text="dark" className="fw-normal border border-secondary">
                  {item.length > 30 ? `${item.slice(0, 27)}…` : item}
                </Badge>
              ))}
              {items.length > 4 && (
                <Badge bg="secondary" className="fw-normal">+{items.length - 4}</Badge>
              )}
            </div>
          </div>
        )
      },
    }),
    columnHelper.display({
      id: 'acciones',
      header: 'Acción',
      cell: ({ row }) => (
        <Button
          variant="outline-primary"
          size="sm"
          onClick={() => {
            setProfesorSeleccionado(row.original)
            setShowAsignarModal(true)
          }}
          className="d-flex align-items-center gap-1"
          title="Asignar carga académica"
        >
          <LuBriefcase size={14} />
          Asignar Carga
        </Button>
      ),
    }),
  ]

  const dataPendientes = pendientes
  const dataActivos = activos

  const tablePendientes = useReactTable({
    data: dataPendientes,
    columns: columnsPendientes,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 15 } },
  })

  const tableActivos = useReactTable({
    data: dataActivos,
    columns: columnsActivos,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 15 } },
  })

  const loading = activeTab === 'pendientes' ? loadingPendientes : loadingActivos
  const countPendientes = pendientes.length

  return (
    <>
      <Row>
        <Col xs={12}>
          <Card className="shadow-sm border-0 rounded-3">
            <CardHeader className="border-0 bg-white pt-4 pb-0 px-4">
              <Row className="align-items-center g-3 mb-3">
                <Col lg={4}>
                  <h5 className="card-title mb-0 text-dark">Panel de aprobación</h5>
                </Col>
                <Col lg={8}>
                  <div className="d-flex flex-wrap justify-content-end gap-2">
                    <div className="position-relative" style={{ minWidth: '240px' }}>
                      <input
                        type="text"
                        className="form-control form-control-sm ps-4 border rounded-2"
                        placeholder="Buscar por nombre, RUT..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={handleKeyDown}
                      />
                      <LuSearch
                        className="position-absolute top-50 translate-middle-y text-muted"
                        style={{ left: '12px' }}
                        size={16}
                      />
                    </div>
                    <Button variant="outline-secondary" size="sm" onClick={handleSearch} disabled={loading} className="rounded-2">
                      <LuSearch size={16} />
                    </Button>
                    <Button variant="outline-secondary" size="sm" onClick={handleRefrescar} disabled={loading} title="Refrescar" className="rounded-2">
                      <LuRefreshCw size={16} className={loading ? 'spin' : ''} />
                    </Button>
                    <Button variant="primary" size="sm" onClick={() => setShowCrearModal(true)} className="d-flex align-items-center gap-1 rounded-2">
                      <LuUserPlus size={16} />
                      Crear Profesor
                    </Button>
                  </div>
                </Col>
              </Row>
            </CardHeader>

            <div className="card-body px-4 pb-4 pt-3">
              {error && (
                <Alert variant="danger" className="mb-3" onClose={() => setError(null)} dismissible>
                  {error}
                </Alert>
              )}
              <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab((k as TabKey) || 'pendientes')} className="nav-bordered mb-0">
                <Tab
                  eventKey="pendientes"
                  title={
                    <span className="d-flex align-items-center gap-2">
                      <span className="text-danger">🔴</span>
                      Pendientes de Verificación
                      {countPendientes > 0 && (
                        <Badge bg="danger" pill className="ms-1">
                          {countPendientes}
                        </Badge>
                      )}
                    </span>
                  }
                >
                  <div className="table-responsive">
                    {loadingPendientes ? (
                      <div className="text-center py-5">
                        <Spinner animation="border" variant="primary" />
                        <p className="text-muted mt-2">Cargando pendientes...</p>
                      </div>
                    ) : dataPendientes.length === 0 ? (
                      <div className="text-center py-5 rounded-3 bg-light">
                        <p className="text-muted fs-5 mb-1">No hay profesores pendientes de verificación</p>
                        <p className="text-muted small">{searchTerm ? 'Intenta con otro término de búsqueda' : 'Los nuevos registros desde MIRA aparecerán aquí.'}</p>
                      </div>
                    ) : (
                      <>
                        <DataTable<ProfesorType> table={tablePendientes} />
                        <CardFooter className="border-0 bg-transparent px-0 pb-0 pt-3">
                          <TablePagination
                            totalItems={dataPendientes.length}
                            start={tablePendientes.getState().pagination.pageIndex * tablePendientes.getState().pagination.pageSize + 1}
                            end={Math.min((tablePendientes.getState().pagination.pageIndex + 1) * tablePendientes.getState().pagination.pageSize, dataPendientes.length)}
                            itemsName="pendientes"
                            showInfo
                            previousPage={() => tablePendientes.previousPage()}
                            canPreviousPage={tablePendientes.getCanPreviousPage()}
                            pageCount={tablePendientes.getPageCount()}
                            pageIndex={tablePendientes.getState().pagination.pageIndex}
                            setPageIndex={(idx) => tablePendientes.setPageIndex(idx)}
                            nextPage={() => tablePendientes.nextPage()}
                            canNextPage={tablePendientes.getCanNextPage()}
                          />
                        </CardFooter>
                      </>
                    )}
                  </div>
                </Tab>
                <Tab eventKey="activos" title={<span className="d-flex align-items-center gap-2"><span className="text-success">🟢</span> Profesores Activos</span>}>
                  <div className="table-responsive">
                    {loadingActivos ? (
                      <div className="text-center py-5">
                        <Spinner animation="border" variant="primary" />
                        <p className="text-muted mt-2">Cargando profesores activos...</p>
                      </div>
                    ) : dataActivos.length === 0 ? (
                      <div className="text-center py-5 rounded-3 bg-light">
                        <p className="text-muted fs-5 mb-1">No hay profesores activos</p>
                        <p className="text-muted small">{searchTerm ? 'Intenta con otro término de búsqueda' : 'Aprueba cuentas desde la pestaña Pendientes.'}</p>
                      </div>
                    ) : (
                      <>
                        <DataTable<ProfesorType> table={tableActivos} />
                        <CardFooter className="border-0 bg-transparent px-0 pb-0 pt-3">
                          <TablePagination
                            totalItems={dataActivos.length}
                            start={tableActivos.getState().pagination.pageIndex * tableActivos.getState().pagination.pageSize + 1}
                            end={Math.min((tableActivos.getState().pagination.pageIndex + 1) * tableActivos.getState().pagination.pageSize, dataActivos.length)}
                            itemsName="profesores"
                            showInfo
                            previousPage={() => tableActivos.previousPage()}
                            canPreviousPage={tableActivos.getCanPreviousPage()}
                            pageCount={tableActivos.getPageCount()}
                            pageIndex={tableActivos.getState().pagination.pageIndex}
                            setPageIndex={(idx) => tableActivos.setPageIndex(idx)}
                            nextPage={() => tableActivos.nextPage()}
                            canNextPage={tableActivos.getCanNextPage()}
                          />
                        </CardFooter>
                      </>
                    )}
                  </div>
                </Tab>
              </Tabs>
            </div>
          </Card>
        </Col>
      </Row>

      <CrearProfesorModal show={showCrearModal} onHide={() => setShowCrearModal(false)} onCreado={handleProfesorCreado} />

      <AsignarCargaModal show={showAsignarModal} onHide={handleAsignarCerrar} profesor={profesorSeleccionado} />
    </>
  )
}
