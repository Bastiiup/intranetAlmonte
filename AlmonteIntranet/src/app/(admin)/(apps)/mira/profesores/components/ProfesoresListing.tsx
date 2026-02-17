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
} from 'react-bootstrap'
import { LuSearch, LuRefreshCw, LuUserPlus, LuShieldCheck, LuShieldBan } from 'react-icons/lu'

import DataTable from '@/components/table/DataTable'
import TablePagination from '@/components/table/TablePagination'
import CrearProfesorModal from './CrearProfesorModal'

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
}

const columnHelper = createColumnHelper<ProfesorType>()

export default function ProfesoresListing() {
  const [profesores, setProfesores] = useState<ProfesorType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [showCrearModal, setShowCrearModal] = useState(false)
  const [totalProfesores, setTotalProfesores] = useState(0)

  const fetchProfesores = useCallback(async (search?: string) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ pageSize: '100' })
      if (search) params.set('search', search)

      const res = await fetch(`/api/mira/profesores?${params.toString()}`)
      const data = await res.json()

      if (data.success) {
        setProfesores(data.data || [])
        setTotalProfesores(data.meta?.pagination?.total || data.data?.length || 0)
      } else {
        setError(data.error || 'Error al obtener profesores')
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProfesores()
  }, [fetchProfesores])

  const handleSearch = () => {
    fetchProfesores(searchTerm)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  const handleProfesorCreado = () => {
    setShowCrearModal(false)
    fetchProfesores(searchTerm)
  }

  const columns = [
    columnHelper.accessor('nombre_completo', {
      header: 'Nombre Completo',
      cell: (info) => (
        <div>
          <span className="fw-semibold">{info.getValue()}</span>
        </div>
      ),
    }),
    columnHelper.accessor('rut', {
      header: 'RUT',
      cell: (info) => (
        <span className="font-monospace text-muted">{info.getValue() || '—'}</span>
      ),
    }),
    columnHelper.accessor('email', {
      header: 'Email',
      cell: (info) => (
        <span className="text-primary">{info.getValue() || '—'}</span>
      ),
    }),
    columnHelper.display({
      id: 'estado_cuenta',
      header: 'Cuenta',
      cell: ({ row }) => {
        const { confirmed, blocked } = row.original
        if (blocked) {
          return <Badge bg="danger" className="d-flex align-items-center gap-1" style={{ width: 'fit-content' }}><LuShieldBan size={12} /> Bloqueado</Badge>
        }
        if (confirmed) {
          return <Badge bg="success" className="d-flex align-items-center gap-1" style={{ width: 'fit-content' }}><LuShieldCheck size={12} /> Confirmado</Badge>
        }
        return <Badge bg="warning" text="dark" className="d-flex align-items-center gap-1" style={{ width: 'fit-content' }}>Pendiente</Badge>
      },
    }),
    columnHelper.display({
      id: 'estado_activo',
      header: 'Estado',
      cell: ({ row }) => {
        const activo = row.original.activo
        return activo
          ? <Badge bg="soft-success" text="dark" pill>Activo</Badge>
          : <Badge bg="soft-danger" text="dark" pill>Inactivo</Badge>
      },
    }),
  ]

  const table = useReactTable({
    data: profesores,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 15 },
    },
  })

  return (
    <>
      <Row>
        <Col xs={12}>
          <Card>
            <CardHeader className="border-bottom border-light">
              <Row className="align-items-center g-3">
                <Col lg={4}>
                  <div className="d-flex align-items-center gap-2">
                    <h5 className="card-title mb-0">
                      Profesores
                    </h5>
                    <Badge bg="primary" pill>{totalProfesores}</Badge>
                  </div>
                </Col>
                <Col lg={8}>
                  <div className="d-flex flex-wrap justify-content-end gap-2">
                    <div className="position-relative" style={{ minWidth: '260px' }}>
                      <input
                        type="text"
                        className="form-control ps-4"
                        placeholder="Buscar por nombre, RUT..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={handleKeyDown}
                      />
                      <LuSearch
                        className="position-absolute top-50 translate-middle-y text-muted"
                        style={{ left: '10px' }}
                        size={16}
                      />
                    </div>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={handleSearch}
                      disabled={loading}
                    >
                      <LuSearch size={16} />
                    </Button>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => fetchProfesores(searchTerm)}
                      disabled={loading}
                      title="Refrescar"
                    >
                      <LuRefreshCw size={16} className={loading ? 'spin' : ''} />
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setShowCrearModal(true)}
                      className="d-flex align-items-center gap-1"
                    >
                      <LuUserPlus size={16} />
                      Crear Profesor
                    </Button>
                  </div>
                </Col>
              </Row>
            </CardHeader>

            <div className="table-responsive">
              {error && (
                <Alert variant="danger" className="m-3 mb-0">
                  {error}
                </Alert>
              )}

              {loading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="primary" />
                  <p className="text-muted mt-2">Cargando profesores...</p>
                </div>
              ) : profesores.length === 0 ? (
                <div className="text-center py-5">
                  <p className="text-muted fs-5 mb-1">No se encontraron profesores</p>
                  <p className="text-muted small">
                    {searchTerm
                      ? 'Intenta con otro término de búsqueda'
                      : 'Crea el primer profesor usando el botón de arriba'}
                  </p>
                </div>
              ) : (
                <DataTable<ProfesorType> table={table} />
              )}
            </div>

            {profesores.length > 0 && (
              <CardFooter className="border-top border-light">
                <TablePagination
                  totalItems={profesores.length}
                  start={table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
                  end={Math.min(
                    (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                    profesores.length
                  )}
                  itemsName="profesores"
                  showInfo
                  previousPage={() => table.previousPage()}
                  canPreviousPage={table.getCanPreviousPage()}
                  pageCount={table.getPageCount()}
                  pageIndex={table.getState().pagination.pageIndex}
                  setPageIndex={(idx) => table.setPageIndex(idx)}
                  nextPage={() => table.nextPage()}
                  canNextPage={table.getCanNextPage()}
                />
              </CardFooter>
            )}
          </Card>
        </Col>
      </Row>

      <CrearProfesorModal
        show={showCrearModal}
        onHide={() => setShowCrearModal(false)}
        onCreado={handleProfesorCreado}
      />
    </>
  )
}
