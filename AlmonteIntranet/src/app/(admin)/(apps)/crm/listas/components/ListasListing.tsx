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
import { useRouter } from 'next/navigation'
import { useState, useEffect, useMemo } from 'react'
import { Button, Card, CardHeader, Col, Row, Alert, Badge, Form, Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter, Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'react-bootstrap'
import { LuSearch, LuFileText, LuDownload, LuEye, LuPlus, LuUpload, LuRefreshCw, LuFileCode, LuChevronLeft, LuMapPin, LuCalendar, LuInfo, LuChevronDown } from 'react-icons/lu'
import { TbEdit, TbTrash } from 'react-icons/tb'

import DataTable from '@/components/table/DataTable'
import TablePagination from '@/components/table/TablePagination'
import ImportacionCompletaModal from './ImportacionCompletaModal'
import GestionarVersionesModal from './GestionarVersionesModal'

interface ColegioConListasType {
  id: string | number
  documentId?: string
  nombre: string
  rbd?: string
  direccion?: string
  region?: string
  comuna?: string
  representante?: string
  listas2024: number
  listas2025: number
  listas2026: number
  listas2027: number
  totalListas: number
  cursos: any[]
}

interface CursoConListaType {
  id: string | number
  nombre: string
  nivel: 'Basica' | 'Media'
  grado: number
  año: number
  paralelo?: string
  pdf_id?: string | number
  pdf_url?: string
  pdf_nombre?: string
  cantidadPDFs?: number
  colegio?: {
    id: string | number
    nombre: string
  }
}

const columnHelper = createColumnHelper<ColegioConListasType>()

export default function ListasListing({ listas: listasProp, error: initialError }: { listas: any[]; error: string | null }) {
  const router = useRouter()
  const [colegios, setColegios] = useState<ColegioConListasType[]>([])
  const [error, setError] = useState<string | null>(initialError)
  const [loading, setLoading] = useState(false)
  const [selectedColegio, setSelectedColegio] = useState<ColegioConListasType | null>(null)
  const [cursos2026, setCursos2026] = useState<CursoConListaType[]>([])
  const [cursos2027, setCursos2027] = useState<CursoConListaType[]>([])
  const [cursos2025, setCursos2025] = useState<CursoConListaType[]>([])
  const [cursos2024, setCursos2024] = useState<CursoConListaType[]>([])
  const [showImportCompletaModal, setShowImportCompletaModal] = useState(false)
  const [showGestionarVersionesModal, setShowGestionarVersionesModal] = useState(false)
  const [cursoParaGestionar, setCursoParaGestionar] = useState<{ id: string | number; nombre: string; colegioNombre?: string } | null>(null)
  const [showEstadisticasModal, setShowEstadisticasModal] = useState(false)
  const [colegioParaEstadisticas, setColegioParaEstadisticas] = useState<ColegioConListasType | null>(null)
  const [dropdownAbierto, setDropdownAbierto] = useState<Record<string, boolean>>({})

  // Estados de tabla de colegios
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })

  // Cargar colegios con listas
  const cargarColegios = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/crm/listas/por-colegio')
      const result = await response.json()

      if (result.success && result.data) {
        setColegios(result.data)
      } else {
        setError(result.error || 'Error al cargar colegios')
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar colegios')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarColegios()
  }, [])

  // Cargar cursos del colegio seleccionado
  const cargarCursosDelColegio = async (colegio: ColegioConListasType) => {
    if (!colegio.cursos || colegio.cursos.length === 0) {
      setCursos2024([])
      setCursos2025([])
      setCursos2026([])
      setCursos2027([])
      return
    }

    const cursosPorAño: { [key: number]: CursoConListaType[] } = {
      2024: [],
      2025: [],
      2026: [],
      2027: [],
    }

    colegio.cursos.forEach((curso: any) => {
      const attrs = (curso as any)?.attributes || curso
      const versiones = attrs.versiones_materiales || []
      const año = attrs.año || attrs.ano || new Date().getFullYear()
      
      // Verificar si tiene versiones con PDFs o materiales
      const versionesConPDF = versiones.filter((v: any) => v.pdf_id || v.pdf_url)
      const cantidadPDFs = versionesConPDF.length

      if (versionesConPDF.length === 0 && !versiones.some((v: any) => v.materiales && Array.isArray(v.materiales) && v.materiales.length > 0)) {
        return
      }

      // Obtener la última versión con PDF
      let pdf_id: string | number | undefined
      let pdf_url: string | undefined
      let pdf_nombre: string | undefined

      if (versionesConPDF.length > 0) {
        const versionesOrdenadas = [...versionesConPDF].sort((a: any, b: any) => {
          const fechaA = a.fecha_subida ? new Date(a.fecha_subida).getTime() : 0
          const fechaB = b.fecha_subida ? new Date(b.fecha_subida).getTime() : 0
          return fechaB - fechaA
        })
        const ultimaVersion = versionesOrdenadas[0]
        pdf_id = ultimaVersion.pdf_id
        pdf_url = ultimaVersion.pdf_url
        pdf_nombre = ultimaVersion.nombre_archivo
      }

      const nombreCompleto = `${attrs.grado || 1}º ${attrs.nivel === 'Media' ? 'Media' : 'Básico'}${attrs.paralelo ? ` ${attrs.paralelo}` : ''} ${año}`

      const cursoData: CursoConListaType = {
        id: curso.id || curso.documentId,
        nombre: nombreCompleto,
        nivel: attrs.nivel || 'Basica',
        grado: attrs.grado || 1,
        año: año,
        paralelo: attrs.paralelo,
        pdf_id,
        pdf_url,
        pdf_nombre,
        cantidadPDFs,
        colegio: {
          id: colegio.id,
          nombre: colegio.nombre,
        },
      }

      if (año >= 2024 && año <= 2027) {
        cursosPorAño[año].push(cursoData)
      }
    })

    // Ordenar cursos por grado, luego por año (descendente - más reciente primero)
    // Ejemplo: "Cuarto Básico 2026", "Cuarto Básico 2025", "Cuarto Básico 2024"
    const ordenarCursos = (cursos: CursoConListaType[]) => {
      return cursos.sort((a, b) => {
        // Primero por grado (ascendente: 1º, 2º, 3º, 4º...)
        if (a.grado !== b.grado) {
          return a.grado - b.grado
        }
        // Luego por año (descendente - más reciente primero: 2027, 2026, 2025, 2024)
        return b.año - a.año
      })
    }

    setCursos2024(ordenarCursos(cursosPorAño[2024]))
    setCursos2025(ordenarCursos(cursosPorAño[2025]))
    setCursos2026(ordenarCursos(cursosPorAño[2026]))
    setCursos2027(ordenarCursos(cursosPorAño[2027]))
  }

  useEffect(() => {
    if (selectedColegio) {
      cargarCursosDelColegio(selectedColegio)
    }
  }, [selectedColegio])

  // Columnas de la tabla de colegios
  const columns: ColumnDef<ColegioConListasType, any>[] = useMemo(() => [
    {
      id: 'nombre',
      header: 'COLEGIO',
      accessorKey: 'nombre',
      enableSorting: true,
      cell: ({ row }) => {
        const colegio = row.original
        return (
          <div>
            <h6 className="mb-0 fw-semibold">{colegio.nombre}</h6>
            {colegio.rbd && (
              <small className="text-muted">RBD: {colegio.rbd}</small>
            )}
          </div>
        )
      },
    },
    {
      id: 'listasPorAño',
      header: 'LISTAS POR AÑO',
      enableSorting: true,
      accessorKey: 'totalListas',
      cell: ({ row }) => {
        const colegio = row.original
        const total = colegio.totalListas
        const colegioId = String(colegio.id || colegio.documentId || '')
        const isOpen = dropdownAbierto[colegioId] || false
        
        const handleAñoClick = (año: number, e: React.MouseEvent) => {
          e.stopPropagation()
          setDropdownAbierto({ ...dropdownAbierto, [colegioId]: false })
          // Navegar a las listas del colegio con filtro por año
          setSelectedColegio(colegio)
          // Scroll a la sección del año correspondiente después de cargar
          setTimeout(() => {
            const añoElement = document.getElementById(`listas-${año}`)
            if (añoElement) {
              añoElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
          }, 500)
        }

        const años = [
          { año: 2024, count: colegio.listas2024, color: 'primary', bgClass: 'bg-primary' },
          { año: 2025, count: colegio.listas2025, color: 'warning', bgClass: 'bg-warning' },
          { año: 2026, count: colegio.listas2026, color: 'info', bgClass: 'bg-info' },
          { año: 2027, count: colegio.listas2027, color: 'success', bgClass: 'bg-success' },
        ]

        return (
          <div onClick={(e) => e.stopPropagation()}>
            <Dropdown
              show={isOpen}
              onToggle={(isOpen) => {
                setDropdownAbierto((prev) => ({ ...prev, [colegioId]: isOpen }))
              }}
            >
              <DropdownToggle
                as={Button}
                variant={total > 0 ? 'primary' : 'secondary'}
                className="d-flex align-items-center gap-2"
                style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  padding: '8px 16px',
                  border: 'none',
                  boxShadow: isOpen ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                  transition: 'all 0.2s ease',
                }}
                onClick={(e) => {
                  e.stopPropagation()
                }}
              >
                <span>{total} {total === 1 ? 'lista' : 'listas'}</span>
                <LuChevronDown 
                  size={16} 
                  style={{ 
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease'
                  }} 
                />
              </DropdownToggle>
            <DropdownMenu 
              onClick={(e) => {
                e.stopPropagation()
              }}
              style={{ 
                minWidth: '220px',
                padding: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: 1050,
              }}
            >
              <div className="px-2 py-1 mb-2 border-bottom">
                <small className="text-muted fw-semibold">Desglose por año</small>
              </div>
              {años.map(({ año, count, color, bgClass }) => (
                <DropdownItem
                  key={año}
                  onClick={(e) => handleAñoClick(año, e)}
                  disabled={count === 0}
                  style={{
                    cursor: count > 0 ? 'pointer' : 'not-allowed',
                    opacity: count > 0 ? 1 : 0.6,
                    padding: '10px 12px',
                    borderRadius: '6px',
                    marginBottom: '4px',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (count > 0) {
                      e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center gap-2">
                      <div 
                        className={`${bgClass} rounded-circle`}
                        style={{
                          width: '12px',
                          height: '12px',
                          opacity: count > 0 ? 1 : 0.4,
                        }}
                      />
                      <span className="fw-semibold" style={{ fontSize: '14px' }}>
                        {año}
                      </span>
                    </div>
                    <Badge 
                      bg={count > 0 ? color : 'secondary'} 
                      className="px-2 py-1"
                      style={{ fontSize: '12px', fontWeight: '600' }}
                    >
                      {count} {count === 1 ? 'lista' : 'listas'}
                    </Badge>
                  </div>
                </DropdownItem>
              ))}
              <div className="px-2 py-2 mt-2 border-top">
                <DropdownItem
                  as="div"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setDropdownAbierto({ ...dropdownAbierto, [colegioId]: false })
                    // Usar setTimeout para asegurar que el dropdown se cierre antes de abrir el modal
                    setTimeout(() => {
                      setColegioParaEstadisticas(colegio)
                      setShowEstadisticasModal(true)
                    }, 100)
                  }}
                  style={{ 
                    cursor: 'pointer',
                    padding: '8px 12px',
                    borderRadius: '6px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  <div className="d-flex align-items-center justify-content-between">
                    <small className="text-primary fw-semibold">Ver estadísticas completas</small>
                    <LuInfo size={14} className="text-primary" />
                  </div>
                </DropdownItem>
              </div>
            </DropdownMenu>
          </Dropdown>
          </div>
        )
      },
    },
    {
      id: 'direccion',
      header: 'DIRECCIÓN',
      accessorKey: 'direccion',
      enableSorting: true,
      cell: ({ row }) => {
        const direccion = row.original.direccion
        return direccion ? (
          <div className="d-flex align-items-center">
            <LuMapPin className="me-1" size={14} />
            <span>{direccion}</span>
          </div>
        ) : (
          <span className="text-muted">-</span>
        )
      },
    },
    {
      id: 'region',
      header: 'REGIÓN',
      accessorKey: 'region',
      enableSorting: true,
      cell: ({ row }) => {
        const region = row.original.region
        return region || <span className="text-muted">-</span>
      },
    },
    {
      id: 'representante',
      header: 'REPRESENTANTE',
      accessorKey: 'representante',
      enableSorting: true,
      cell: ({ row }) => {
        const representante = row.original.representante
        return representante || <span className="text-muted">-</span>
      },
    },
    {
      id: 'acciones',
      header: 'ACCIONES',
      enableSorting: false,
      cell: ({ row }) => {
        const colegio = row.original
        return (
                <Button
            variant="primary"
                  size="sm"
            onClick={() => setSelectedColegio(colegio)}
                >
            Ver Listas
                </Button>
        )
      },
    },
  ], [])

  const table = useReactTable<ColegioConListasType>({
    data: colegios,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  // Si hay un colegio seleccionado, mostrar vista de detalle
  if (selectedColegio) {
    return (
      <Row>
        <Col>
          <Card>
            <CardHeader className="d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => setSelectedColegio(null)}
                >
                  <LuChevronLeft className="me-1" />
                  Volver
                </Button>
                <h5 className="mb-0">{selectedColegio.nombre}</h5>
              </div>
              <Button
                variant="outline-success"
                onClick={() => setShowImportCompletaModal(true)}
              >
                <LuUpload className="me-2" />
                Importación Completa (Plantilla)
              </Button>
            </CardHeader>
            <div className="p-3">
    <Row>
                {/* Panel 2026 */}
                <Col md={6}>
                  <Card className="mb-3">
                    <CardHeader className="bg-primary text-white">
                      <h6 className="mb-0">Listas 2026 ({cursos2026.length})</h6>
                    </CardHeader>
                    <div className="p-3" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                      {cursos2026.length === 0 ? (
                        <Alert variant="info">No hay listas para 2026</Alert>
                      ) : (
                        <div className="table-responsive">
                          <table className="table table-sm">
                            <thead>
                              <tr>
                                <th>Curso</th>
                                <th>PDFs</th>
                                <th>Acciones</th>
                              </tr>
                            </thead>
                            <tbody>
                              {cursos2026.map((curso) => (
                                <tr key={`${curso.id}-2026`}>
                                  <td>
                                    <strong>{curso.nombre.replace(` ${curso.año}`, '')}</strong>
                                    <br />
                                    <small className="text-muted">{curso.nivel} - {curso.año}</small>
                                  </td>
                                  <td>
                                    <Badge bg={curso.cantidadPDFs && curso.cantidadPDFs > 0 ? 'info' : 'secondary'}>
                                      {curso.cantidadPDFs || 0} {curso.cantidadPDFs === 1 ? 'PDF' : 'PDFs'}
                                    </Badge>
                                  </td>
                                  <td>
                                    <div className="d-flex gap-1">
                                      {curso.pdf_id && (
                                        <Link href={`/crm/listas/${curso.id}/validacion`}>
                                          <Button variant="outline-primary" size="sm" title="Ver detalle">
                                            <LuEye size={14} />
                                          </Button>
                                        </Link>
                                      )}
                                      <Button
                                        variant="outline-success"
                                        size="sm"
                                        onClick={() => {
                                          setCursoParaGestionar({
                                            id: curso.id,
                                            nombre: curso.nombre,
                                            colegioNombre: selectedColegio.nombre,
                                          })
                                          setShowGestionarVersionesModal(true)
                                        }}
                                        title="Gestionar listas"
                                      >
                                        <LuFileText size={14} />
                                      </Button>
              </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
              </div>
                      )}
              </div>
                  </Card>
                </Col>

                {/* Panel 2027 */}
                <Col md={6}>
                  <Card className="mb-3" id="listas-2027">
                    <CardHeader className="bg-success text-white">
                      <h6 className="mb-0">Listas 2027 ({cursos2027.length})</h6>
                    </CardHeader>
                    <div className="p-3" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                      {cursos2027.length === 0 ? (
                        <Alert variant="info">No hay listas para 2027</Alert>
                      ) : (
                        <div className="table-responsive">
                          <table className="table table-sm">
                            <thead>
                              <tr>
                                <th>Curso</th>
                                <th>PDFs</th>
                                <th>Acciones</th>
                              </tr>
                            </thead>
                            <tbody>
                              {cursos2027.map((curso) => (
                                <tr key={`${curso.id}-2027`}>
                                  <td>
                                    <strong>{curso.nombre.replace(` ${curso.año}`, '')}</strong>
                                    <br />
                                    <small className="text-muted">{curso.nivel} - {curso.año}</small>
                                  </td>
                                  <td>
                                    <Badge bg={curso.cantidadPDFs && curso.cantidadPDFs > 0 ? 'info' : 'secondary'}>
                                      {curso.cantidadPDFs || 0} {curso.cantidadPDFs === 1 ? 'PDF' : 'PDFs'}
                                    </Badge>
                                  </td>
                                  <td>
                                    <div className="d-flex gap-1">
                                      {curso.pdf_id && (
                                        <Link href={`/crm/listas/${curso.id}/validacion`}>
                                          <Button variant="outline-primary" size="sm" title="Ver detalle">
                                            <LuEye size={14} />
                                          </Button>
                                        </Link>
                                      )}
                                      <Button
                                        variant="outline-success"
                                        size="sm"
                                        onClick={() => {
                                          setCursoParaGestionar({
                                            id: curso.id,
                                            nombre: curso.nombre,
                                            colegioNombre: selectedColegio.nombre,
                                          })
                                          setShowGestionarVersionesModal(true)
                                        }}
                                        title="Gestionar listas"
                                      >
                                        <LuFileText size={14} />
                                      </Button>
              </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
              </div>
                      )}
            </div>
                  </Card>
                </Col>
              </Row>

              {/* Paneles adicionales para 2024 y 2025 si hay datos */}
              {(cursos2024.length > 0 || cursos2025.length > 0) && (
                <Row className="mt-3">
                  {cursos2025.length > 0 && (
                    <Col md={6}>
                      <Card className="mb-3" id="listas-2025">
                        <CardHeader className="bg-warning text-dark">
                          <h6 className="mb-0">Listas 2025 ({cursos2025.length})</h6>
                        </CardHeader>
                        <div className="p-3" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                          <div className="table-responsive">
                            <table className="table table-sm">
                              <thead>
                                <tr>
                                  <th>Curso</th>
                                  <th>PDFs</th>
                                  <th>Acciones</th>
                                </tr>
                              </thead>
                              <tbody>
                                {cursos2025.map((curso) => (
                                  <tr key={`${curso.id}-2025`}>
                                    <td>
                                      <strong>{curso.nombre.replace(` ${curso.año}`, '')}</strong>
                                      <br />
                                      <small className="text-muted">{curso.nivel} - {curso.año}</small>
                                    </td>
                                    <td>
                                      <Badge bg={curso.cantidadPDFs && curso.cantidadPDFs > 0 ? 'info' : 'secondary'}>
                                        {curso.cantidadPDFs || 0} {curso.cantidadPDFs === 1 ? 'PDF' : 'PDFs'}
                                      </Badge>
                                    </td>
                                    <td>
            <div className="d-flex gap-1">
                                        {curso.pdf_id && (
                                          <Link href={`/crm/listas/${curso.id}/validacion`}>
                                            <Button variant="outline-primary" size="sm" title="Ver detalle">
                                              <LuEye size={14} />
                </Button>
                                          </Link>
              )}
                <Button 
                                          variant="outline-success"
                                          size="sm"
                  onClick={() => {
                                            setCursoParaGestionar({
                                              id: curso.id,
                                              nombre: curso.nombre,
                                              colegioNombre: selectedColegio.nombre,
                                            })
                                            setShowGestionarVersionesModal(true)
                                          }}
                                          title="Gestionar listas"
                                        >
                                          <LuFileText size={14} />
                </Button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </Card>
                    </Col>
                  )}
                  {cursos2024.length > 0 && (
                    <Col md={6}>
                      <Card className="mb-3" id="listas-2024">
                        <CardHeader className="bg-secondary text-white">
                          <h6 className="mb-0">Listas 2024 ({cursos2024.length})</h6>
                        </CardHeader>
                        <div className="p-3" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                          <div className="table-responsive">
                            <table className="table table-sm">
                              <thead>
                                <tr>
                                  <th>Curso</th>
                                  <th>PDFs</th>
                                  <th>Acciones</th>
                                </tr>
                              </thead>
                              <tbody>
                                {cursos2024.map((curso) => (
                                  <tr key={`${curso.id}-2024`}>
                                    <td>
                                      <strong>{curso.nombre.replace(` ${curso.año}`, '')}</strong>
                                      <br />
                                      <small className="text-muted">{curso.nivel} - {curso.año}</small>
                                    </td>
                                    <td>
                                      <Badge bg={curso.cantidadPDFs && curso.cantidadPDFs > 0 ? 'info' : 'secondary'}>
                                        {curso.cantidadPDFs || 0} {curso.cantidadPDFs === 1 ? 'PDF' : 'PDFs'}
                                      </Badge>
                                    </td>
                                    <td>
                                      <div className="d-flex gap-1">
                                        {curso.pdf_id && (
                                          <Link href={`/crm/listas/${curso.id}/validacion`}>
                                            <Button variant="outline-primary" size="sm" title="Ver detalle">
                                              <LuEye size={14} />
                                            </Button>
                                          </Link>
                                        )}
                <Button 
                                          variant="outline-success"
                                          size="sm"
                  onClick={() => {
                                            setCursoParaGestionar({
                                              id: curso.id,
                                              nombre: curso.nombre,
                                              colegioNombre: selectedColegio.nombre,
                                            })
                                            setShowGestionarVersionesModal(true)
                                          }}
                                          title="Gestionar listas"
                                        >
                                          <LuFileText size={14} />
                </Button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </Card>
                    </Col>
                  )}
                </Row>
              )}
            </div>
          </Card>
        </Col>
      </Row>
    )
  }

  // Vista principal: Lista de colegios
  return (
    <Row>
      <Col>
        <Card>
          <CardHeader className="d-flex align-items-center justify-content-between">
            <h5 className="mb-0">Listas de Útiles por Colegio</h5>
              <Button 
              variant="outline-success"
              onClick={() => setShowImportCompletaModal(true)}
            >
              <LuUpload className="me-2" />
              Importación Completa (Plantilla)
              </Button>
          </CardHeader>
          <div className="p-3">
            {error && (
              <Alert variant="danger" className="mb-3">
                {error}
              </Alert>
            )}

            <div className="mb-3">
              <Form.Control
                type="text"
                placeholder="Buscar colegio..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                style={{ maxWidth: '300px' }}
              />
            </div>

            <DataTable
              table={table}
              isLoading={loading}
            />

            <TablePagination table={table} />
          </div>
        </Card>

        <ImportacionCompletaModal
          show={showImportCompletaModal}
          onHide={() => setShowImportCompletaModal(false)}
          onSuccess={() => {
            cargarColegios()
          }}
        />

        {cursoParaGestionar && (
          <GestionarVersionesModal
            show={showGestionarVersionesModal}
            onHide={() => {
              setShowGestionarVersionesModal(false)
              setCursoParaGestionar(null)
            }}
            cursoId={cursoParaGestionar.id}
            cursoNombre={cursoParaGestionar.nombre}
            colegioNombre={cursoParaGestionar.colegioNombre}
            onSuccess={() => {
              if (selectedColegio) {
                cargarCursosDelColegio(selectedColegio)
              }
            }}
          />
        )}

        {/* Modal de Estadísticas por Año */}
        <Modal show={showEstadisticasModal} onHide={() => {
          setShowEstadisticasModal(false)
          setColegioParaEstadisticas(null)
        }} size="lg" centered>
          <ModalHeader closeButton>
            <ModalTitle>
              <div className="d-flex align-items-center gap-2">
                <LuCalendar />
                <span>Estadísticas de Listas - {colegioParaEstadisticas?.nombre}</span>
              </div>
            </ModalTitle>
          </ModalHeader>
          <ModalBody>
            {colegioParaEstadisticas && (
              <Row className="g-3">
                <Col md={6}>
                  <Card className="border-primary">
                    <CardHeader className="bg-primary text-white">
                      <h6 className="mb-0 d-flex align-items-center justify-content-between">
                        <span>2024</span>
                        <Badge bg="light" text="dark">{colegioParaEstadisticas.listas2024} listas</Badge>
                      </h6>
                    </CardHeader>
                    <div className="p-3">
                      <div className="d-flex align-items-center justify-content-between">
                        <span className="text-muted">Total de listas:</span>
                        <strong className="fs-4">{colegioParaEstadisticas.listas2024}</strong>
                      </div>
                    </div>
                  </Card>
                </Col>
                <Col md={6}>
                  <Card className="border-warning">
                    <CardHeader className="bg-warning text-dark">
                      <h6 className="mb-0 d-flex align-items-center justify-content-between">
                        <span>2025</span>
                        <Badge bg="dark">{colegioParaEstadisticas.listas2025} listas</Badge>
                      </h6>
                    </CardHeader>
                    <div className="p-3">
                      <div className="d-flex align-items-center justify-content-between">
                        <span className="text-muted">Total de listas:</span>
                        <strong className="fs-4">{colegioParaEstadisticas.listas2025}</strong>
                      </div>
                    </div>
                  </Card>
                </Col>
                <Col md={6}>
                  <Card className="border-info">
                    <CardHeader className="bg-info text-white">
                      <h6 className="mb-0 d-flex align-items-center justify-content-between">
                        <span>2026</span>
                        <Badge bg="light" text="dark">{colegioParaEstadisticas.listas2026} listas</Badge>
                      </h6>
                    </CardHeader>
                    <div className="p-3">
                      <div className="d-flex align-items-center justify-content-between">
                        <span className="text-muted">Total de listas:</span>
                        <strong className="fs-4">{colegioParaEstadisticas.listas2026}</strong>
                      </div>
                    </div>
                  </Card>
                </Col>
                <Col md={6}>
                  <Card className="border-success">
                    <CardHeader className="bg-success text-white">
                      <h6 className="mb-0 d-flex align-items-center justify-content-between">
                        <span>2027</span>
                        <Badge bg="light" text="dark">{colegioParaEstadisticas.listas2027} listas</Badge>
                      </h6>
                    </CardHeader>
                    <div className="p-3">
                      <div className="d-flex align-items-center justify-content-between">
                        <span className="text-muted">Total de listas:</span>
                        <strong className="fs-4">{colegioParaEstadisticas.listas2027}</strong>
                      </div>
                    </div>
                  </Card>
                </Col>
                <Col md={12}>
                  <Card className="border-secondary">
                    <CardHeader className="bg-secondary text-white">
                      <h6 className="mb-0">Resumen General</h6>
                    </CardHeader>
                    <div className="p-3">
                      <Row>
                        <Col md={6}>
                          <div className="mb-2">
                            <span className="text-muted">Total de listas:</span>
                            <strong className="fs-5 ms-2">{colegioParaEstadisticas.totalListas}</strong>
                          </div>
                        </Col>
                        <Col md={6}>
                          <div className="mb-2">
                            <span className="text-muted">Años con listas:</span>
                            <strong className="fs-5 ms-2">
                              {[
                                colegioParaEstadisticas.listas2024 > 0 ? '2024' : null,
                                colegioParaEstadisticas.listas2025 > 0 ? '2025' : null,
                                colegioParaEstadisticas.listas2026 > 0 ? '2026' : null,
                                colegioParaEstadisticas.listas2027 > 0 ? '2027' : null,
                              ].filter(Boolean).join(', ') || 'Ninguno'}
                            </strong>
                          </div>
                        </Col>
                      </Row>
                    </div>
                  </Card>
                </Col>
              </Row>
            )}
          </ModalBody>
          <ModalFooter>
            <Button
              variant="primary"
              onClick={() => {
                if (colegioParaEstadisticas) {
                  setSelectedColegio(colegioParaEstadisticas)
                  setShowEstadisticasModal(false)
                  setColegioParaEstadisticas(null)
                }
              }}
            >
              Ver Listas Detalladas
            </Button>
            <Button variant="secondary" onClick={() => {
              setShowEstadisticasModal(false)
              setColegioParaEstadisticas(null)
            }}>
              Cerrar
            </Button>
          </ModalFooter>
        </Modal>
      </Col>
    </Row>
  )
}
