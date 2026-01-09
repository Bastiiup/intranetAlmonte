'use client'
import {
  ColumnFiltersState,
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { useState, useEffect, useMemo } from 'react'
import { Button, Card, CardBody, CardFooter, CardHeader, CardTitle, Col, Row, Alert, Badge, FormControl, InputGroup } from 'react-bootstrap'
import { TbEdit, TbPlus, TbTrash, TbSearch, TbRefresh } from 'react-icons/tb'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import DataTable from '@/components/table/DataTable'
import DeleteConfirmationModal from '@/components/table/DeleteConfirmationModal'
import TablePagination from '@/components/table/TablePagination'
import EditColaboradorModal from './EditColaboradorModal'

// Tipo para colaboradores
type ColaboradorType = {
  id: number | string
  documentId?: string
  email_login: string
  rol?: string
  rol_principal?: string
  rol_operativo?: string
  activo: boolean
  persona?: any
  empresa?: any
  usuario?: any
  createdAt?: string
  updatedAt?: string
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

// Función para mapear colaboradores de Strapi al formato ColaboradorType
const mapStrapiColaboradorToColaboradorType = (colaborador: any): ColaboradorType => {
  const attrs = colaborador.attributes || {}
  const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (colaborador as any)

  return {
    id: colaborador.id || colaborador.documentId || 0,
    documentId: colaborador.documentId,
    email_login: getField(data, 'email_login', 'EMAIL_LOGIN') || '',
    rol: getField(data, 'rol', 'ROL') || '',
    rol_principal: getField(data, 'rol_principal', 'ROL_PRINCIPAL') || '',
    rol_operativo: getField(data, 'rol_operativo', 'ROL_OPERATIVO') || '',
    activo: data.activo !== undefined ? data.activo : true,
    persona: data.persona || null,
    empresa: data.empresa || null,
    usuario: data.usuario || null,
    createdAt: attrs.createdAt || colaborador.createdAt || '',
    updatedAt: attrs.updatedAt || colaborador.updatedAt || '',
  }
}

interface ColaboradoresListingProps {
  colaboradores?: any[]
  error?: string | null
}

const columnHelper = createColumnHelper<ColaboradorType>()

const ColaboradoresListing = ({ colaboradores: propsColaboradores, error: propsError }: ColaboradoresListingProps) => {
  const router = useRouter()
  const [colaboradores, setColaboradores] = useState<ColaboradorType[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(propsError || null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterActivo, setFilterActivo] = useState<string>('all')
  const [filterRol, setFilterRol] = useState<string>('all')
  const [editModal, setEditModal] = useState<{ open: boolean; colaborador: ColaboradorType | null }>({
    open: false,
    colaborador: null,
  })
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; colaborador: ColaboradorType | null }>({
    open: false,
    colaborador: null,
  })

  // Mapear colaboradores al formato correcto
  useEffect(() => {
    if (propsColaboradores && propsColaboradores.length > 0) {
      const mapped = propsColaboradores.map(mapStrapiColaboradorToColaboradorType)
      setColaboradores(mapped)
    } else {
      setColaboradores([])
    }
  }, [propsColaboradores])

  // Obtener roles únicos para el filtro
  const rolesUnicos = useMemo(() => {
    const roles = colaboradores
      .map(c => c.rol || c.rol_principal)
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i)
    return roles.sort()
  }, [colaboradores])

  const columns = useMemo(
    () => [
      columnHelper.accessor('email_login', {
        header: 'Email',
        cell: ({ row }) => (
          <div>
            <div className="fw-semibold">{row.original.email_login}</div>
            {row.original.persona?.data?.attributes?.nombre_completo && (
              <small className="text-muted">{row.original.persona.data.attributes.nombre_completo}</small>
            )}
          </div>
        ),
      }),
      columnHelper.accessor('rol', {
        header: 'Rol',
        cell: ({ row }) => {
          const rol = row.original.rol || row.original.rol_principal || 'Sin rol'
          const variant = rol === 'super_admin' ? 'danger' : rol === 'encargado_adquisiciones' ? 'primary' : 'secondary'
          return <Badge bg={variant}>{rol}</Badge>
        },
      }),
      columnHelper.accessor('activo', {
        header: 'Estado',
        cell: ({ row }) => (
          <Badge bg={row.original.activo ? 'success' : 'secondary'}>
            {row.original.activo ? 'Activo' : 'Inactivo'}
          </Badge>
        ),
      }),
      columnHelper.accessor('persona', {
        header: 'Persona',
        cell: ({ row }) => {
          const persona = row.original.persona?.data?.attributes || row.original.persona
          return persona?.nombre_completo || persona?.nombres || 'Sin persona asignada'
        },
      }),
      columnHelper.accessor('id', {
        header: 'Acciones',
        cell: ({ row }) => (
          <div className="d-flex gap-2">
            <Button
              variant="soft-primary"
              size="sm"
              onClick={() => setEditModal({ open: true, colaborador: row.original })}
            >
              <TbEdit className="fs-base" />
            </Button>
            <Button
              variant="soft-danger"
              size="sm"
              onClick={() => setDeleteModal({ open: true, colaborador: row.original })}
            >
              <TbTrash className="fs-base" />
            </Button>
          </div>
        ),
      }),
    ],
    [router]
  )

  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [sorting, setSorting] = useState<SortingState>([{ id: 'email_login', desc: false }])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })

  // Filtrar datos
  const filteredData = useMemo(() => {
    let filtered = [...colaboradores]

    // Filtro de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(
        c =>
          c.email_login.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (c.persona?.data?.attributes?.nombre_completo || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filtro de activo
    if (filterActivo !== 'all') {
      filtered = filtered.filter(c => c.activo === (filterActivo === 'true'))
    }

    // Filtro de rol
    if (filterRol !== 'all') {
      filtered = filtered.filter(c => (c.rol || c.rol_principal) === filterRol)
    }

    return filtered
  }, [colaboradores, searchTerm, filterActivo, filterRol])

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { columnFilters, sorting, pagination },
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const handleDelete = async () => {
    if (!deleteModal.colaborador) return

    // Obtener el ID correcto (documentId si existe, sino id)
    const colaboradorId = deleteModal.colaborador.documentId || deleteModal.colaborador.id
    
    if (!colaboradorId) {
      setError('No se pudo obtener el ID del colaborador')
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/colaboradores/${colaboradorId}`, {
        method: 'DELETE',
      })

      // Manejar respuestas vacías (204 No Content) o con JSON
      let result: any = { success: true } // Por defecto éxito si no hay error
      
      if (response.ok) {
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          try {
            const text = await response.text()
            if (text && text.trim().length > 0) {
              result = JSON.parse(text)
            }
          } catch (parseError) {
            // Si falla el parseo pero la respuesta fue OK, considerar éxito
            console.warn('[ColaboradoresListing] Respuesta OK pero sin JSON válido, considerando éxito')
            result = { success: true }
          }
        } else {
          // Respuesta 204 No Content o sin content-type JSON - considerar éxito
          result = { success: true }
        }
      }

      if (!response.ok || result.success === false) {
        throw new Error(result.error || 'Error al eliminar colaborador')
      }

      // Actualizar la lista localmente removiendo el colaborador eliminado
      setColaboradores(prev => prev.filter(c => {
        const cId = (c as any).documentId || c.id
        return cId !== colaboradorId
      }))
      
      // Cerrar modal y limpiar error
      setDeleteModal({ open: false, colaborador: null })
      setError(null)
      
      // Opcional: recargar la página para obtener datos actualizados
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Error al eliminar colaborador')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    router.refresh()
  }

  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const totalItems = table.getFilteredRowModel().rows.length
  const start = pageIndex * pageSize + 1
  const end = Math.min(start + pageSize - 1, totalItems)

  return (
    <>
      <Card>
        <CardHeader className="justify-content-between align-items-center border-dashed">
          <CardTitle as="h4" className="mb-0">
            Colaboradores ({filteredData.length})
          </CardTitle>
          <div className="d-flex gap-2">
            <Button variant="soft-secondary" size="sm" onClick={handleRefresh} disabled={loading}>
              <TbRefresh className="me-1" /> Actualizar
            </Button>
            <Link href="/colaboradores/agregar" passHref>
              <Button variant="primary" size="sm">
                <TbPlus className="me-1" /> Agregar Colaborador
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardBody>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Filtros */}
          <Row className="mb-3">
            <Col md={4}>
              <InputGroup>
                <InputGroup.Text>
                  <TbSearch />
                </InputGroup.Text>
                <FormControl
                  placeholder="Buscar por email o nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col md={3}>
              <FormControl as="select" value={filterActivo} onChange={(e) => setFilterActivo(e.target.value)}>
                <option value="all">Todos los estados</option>
                <option value="true">Activos</option>
                <option value="false">Inactivos</option>
              </FormControl>
            </Col>
            <Col md={3}>
              <FormControl as="select" value={filterRol} onChange={(e) => setFilterRol(e.target.value)}>
                <option value="all">Todos los roles</option>
                {rolesUnicos.map((rol) => (
                  <option key={rol} value={rol}>
                    {rol}
                  </option>
                ))}
              </FormControl>
            </Col>
          </Row>

          {/* Tabla */}
          <DataTable<ColaboradorType> table={table} emptyMessage="No se encontraron colaboradores" />
        </CardBody>
        {table.getRowModel().rows.length > 0 && (
          <CardFooter className="border-0">
            <TablePagination
              totalItems={totalItems}
              start={start}
              end={end}
              className="pagination-sm"
              showInfo
              itemsName="colaboradores"
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

      {/* Modal de edición */}
      <EditColaboradorModal
        show={editModal.open}
        onHide={() => setEditModal({ open: false, colaborador: null })}
        colaborador={editModal.colaborador}
        onSuccess={() => {
          setEditModal({ open: false, colaborador: null })
          router.refresh()
        }}
      />

      {/* Modal de confirmación de eliminación */}
      <DeleteConfirmationModal
        show={deleteModal.open}
        onHide={() => setDeleteModal({ open: false, colaborador: null })}
        onConfirm={handleDelete}
        selectedCount={1}
        itemName="colaborador"
        modalTitle="Eliminar Colaborador"
        confirmButtonText="Eliminar Permanentemente"
        cancelButtonText="Cancelar"
      >
        <div>
          <p>¿Estás seguro de que deseas eliminar permanentemente a <strong>{deleteModal.colaborador?.email_login}</strong>?</p>
          <p className="text-danger mb-0">
            <small>Esta acción no se puede deshacer. El colaborador será eliminado permanentemente del sistema.</small>
          </p>
        </div>
      </DeleteConfirmationModal>
    </>
  )
}

export default ColaboradoresListing

