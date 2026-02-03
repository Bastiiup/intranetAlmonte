'use client'

import {
  ColumnDef,
  ColumnFiltersState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  RowSelectionState,
  Row as TableRow,
  Table as TableType,
  useReactTable,
} from '@tanstack/react-table'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useMemo } from 'react'
import { Button, Card, CardFooter, CardHeader, Col, Row, Alert, Badge, Modal, ProgressBar, Spinner } from 'react-bootstrap'
import { LuSearch, LuFileText, LuEye, LuArrowLeft, LuDownload, LuFileSpreadsheet, LuCheck, LuPencil, LuX, LuRefreshCw, LuZap } from 'react-icons/lu'
import { TbCheck, TbEye, TbX } from 'react-icons/tb'

import DataTable from '@/components/table/DataTable'
import TablePagination from '@/components/table/TablePagination'
import SmartPDFUpload from './SmartPDFUpload'

interface CursoType {
  id: number | string
  documentId?: string
  nombre: string
  nivel: string
  grado: number
  año: number
  pdf_id?: number | string
  pdf_url?: string
  cantidadProductos: number
  cantidadVersiones: number
  matriculados?: number
  updatedAt?: string
  estado_revision?: 'borrador' | 'revisado' | 'publicado' | null
  fecha_publicacion?: string | null
  fecha_revision?: string | null
}

interface CursosColegioListingProps {
  colegio: any
  cursos: any[]
  error: string | null
}

export default function CursosColegioListing({ colegio, cursos: cursosProp, error }: CursosColegioListingProps) {
  const router = useRouter()

  const mappedCursos = useMemo(() => {
    if (!cursosProp || !Array.isArray(cursosProp)) return []
    
    return cursosProp.map((curso: any) => {
      // Normalizar nombre del curso: reemplazar "Básica" por "Básico" y "Media" por "Medio"
      let nombreNormalizado = (curso.nombre || '').trim()
      nombreNormalizado = nombreNormalizado.replace(/Básica/gi, 'Básico')
      nombreNormalizado = nombreNormalizado.replace(/Basica/gi, 'Básico')
      nombreNormalizado = nombreNormalizado.replace(/\bMedia\b/g, 'Medio')
      
      // Normalizar nivel: "Basica" -> "Básico", "Media" -> "Medio"
      let nivelNormalizado = curso.nivel || 'Basica'
      if (nivelNormalizado.toLowerCase() === 'basica' || nivelNormalizado.toLowerCase() === 'básica') {
        nivelNormalizado = 'Básico'
      } else if (nivelNormalizado.toLowerCase() === 'media') {
        nivelNormalizado = 'Medio'
      }
      
      return {
        id: curso.id || curso.documentId,
        documentId: curso.documentId || String(curso.id || ''),
        nombre: nombreNormalizado,
        nivel: nivelNormalizado,
        grado: curso.grado || 1,
        año: curso.año || curso.ano || new Date().getFullYear(),
        pdf_id: curso.pdf_id || undefined,
        pdf_url: curso.pdf_url || undefined,
        cantidadProductos: curso.cantidadProductos || 0,
        cantidadVersiones: curso.cantidadVersiones || 0,
        matriculados: curso.matricula || curso.matriculados || 0, // Usar "matricula" de Strapi
        updatedAt: curso.updatedAt || null,
        estado_revision: curso.estado_revision || null,
        fecha_publicacion: curso.fecha_publicacion || null,
        fecha_revision: curso.fecha_revision || null,
      } as CursoType
    })
  }, [cursosProp])

  // Calcular años únicos para el filtro
  const añosDisponibles = useMemo(() => {
    const años = new Set<number>()
    mappedCursos.forEach(curso => años.add(curso.año))
    return Array.from(años).sort((a, b) => b - a) // Orden descendente
  }, [mappedCursos])

  // Calcular niveles únicos para el filtro
  const nivelesDisponibles = useMemo(() => {
    const niveles = new Set<string>()
    mappedCursos.forEach(curso => niveles.add(curso.nivel))
    return Array.from(niveles).sort()
  }, [mappedCursos])

  const [data, setData] = useState<CursoType[]>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'curso', desc: false }, // Ordenar por curso alfabéticamente por defecto
  ])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 })
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [exportando, setExportando] = useState(false)
  const [filtroAño, setFiltroAño] = useState<string>('todos')
  const [filtroNivel, setFiltroNivel] = useState<string>('todos')
  
  // Estados para procesamiento masivo con IA
  const [showProcesarModal, setShowProcesarModal] = useState(false)
  const [procesando, setProcesando] = useState(false)
  const [progresoTotal, setProgresoTotal] = useState(0)
  const [cursoActual, setCursoActual] = useState('')
  const [resultados, setResultados] = useState<Array<{
    curso: string
    status: 'pending' | 'processing' | 'success' | 'error'
    mensaje: string
    productosEncontrados?: number
  }>>([])
  
  // Estado para carga inteligente de PDFs
  const [showSmartUpload, setShowSmartUpload] = useState(false)
  const columns: ColumnDef<CursoType, any>[] = [
    {
      id: 'select',
      maxSize: 45,
      size: 45,
      header: ({ table }: { table: TableType<CursoType> }) => (
        <input
          type="checkbox"
          className="form-check-input form-check-input-light fs-14"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row }: { row: TableRow<CursoType> }) => (
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
      id: 'curso',
      header: 'CURSO',
      accessorKey: 'nombre',
      enableSorting: true,
      cell: ({ row }) => (
        <div>
          <h5 className="mb-1 fw-bold fs-16">{row.original.nombre || 'Sin nombre'}</h5>
          <div className="d-flex gap-2 align-items-center">
            <Badge bg={row.original.nivel === 'Media' ? 'info' : 'success'} className="fs-12">
              {row.original.nivel}
            </Badge>
            <Badge bg="primary" className="fs-12">
              {row.original.año}
            </Badge>
          </div>
        </div>
      ),
    },
    {
      id: 'pdf',
      header: 'PDFs',
      accessorKey: 'cantidadVersiones',
      enableSorting: true,
      cell: ({ row }) => {
        const cantidad = row.original.cantidadVersiones || 0
        if (cantidad > 0) {
          return (
            <Badge bg="success" className="fs-13">
              <LuFileText className="me-1" size={14} />
              {cantidad} {cantidad === 1 ? 'PDF' : 'PDFs'}
            </Badge>
          )
        }
        return <Badge bg="secondary">Sin PDFs</Badge>
      },
    },
    {
      id: 'estado',
      header: 'ESTADO',
      accessorKey: 'estado_revision',
      enableSorting: true,
      cell: ({ row }) => {
        const estado = row.original.estado_revision
        const fechaPublicacion = row.original.fecha_publicacion
        const fechaRevision = row.original.fecha_revision
        const totalProductos = row.original.cantidadProductos || 0
        const totalVersiones = row.original.cantidadVersiones || 0
        const tienePDF = row.original.pdf_id
        
        let badgeBg = 'secondary'
        let badgeText = '✗ Sin Validar'
        let icon = <TbX className="me-1" size={14} />
        let tooltip = 'Esta lista aún no ha sido validada.'
        
        if (estado === 'publicado') {
          badgeBg = 'success'
          badgeText = '✓ Lista para Exportar'
          icon = <TbCheck className="me-1" size={14} />
          tooltip = `Lista publicada el ${fechaPublicacion ? new Date(fechaPublicacion).toLocaleDateString() : 'fecha desconocida'}. Lista para comercialización y exportación.`
        } else if (estado === 'revisado') {
          badgeBg = 'info'
          badgeText = '👁 En Revisión'
          icon = <TbEye className="me-1" size={14} />
          tooltip = `Lista revisada el ${fechaRevision ? new Date(fechaRevision).toLocaleDateString() : 'fecha desconocida'}. Pendiente de publicación.`
        } else if (estado === 'borrador') {
          badgeBg = 'warning'
          badgeText = '✏ Borrador'
          icon = <LuPencil className="me-1" size={14} />
          tooltip = 'Esta lista está en borrador y requiere validación.'
        } else if (totalProductos > 0 || totalVersiones > 0 || tienePDF) {
          badgeBg = 'secondary'
          badgeText = '✗ Sin Validar'
          icon = <TbX className="me-1" size={14} />
          tooltip = 'Esta lista tiene productos o versiones, pero aún no ha sido validada.'
        }
        
        return (
          <Badge bg={badgeBg} className="fs-13" title={tooltip}>
            {icon} {badgeText}
          </Badge>
        )
      },
    },
    {
      id: 'matriculados',
      header: 'MATRICULADOS',
      accessorKey: 'matriculados',
      enableSorting: true,
      cell: ({ row }) => {
        const cantidad = row.original.matriculados || 0
        if (cantidad > 0) {
          return (
            <Badge bg="warning" text="dark" className="fs-13">
              {cantidad.toLocaleString('es-CL')} estudiantes
            </Badge>
          )
        }
        return <Badge bg="secondary">Sin datos</Badge>
      },
    },
    {
      id: 'acciones',
      header: 'ACCIONES',
      cell: ({ row }) => {
        const cursoId = row.original.documentId || row.original.id
        
        return (
          <div className="d-flex gap-1">
            <Link href={`/crm/listas/${cursoId}/validacion`}>
              <Button
                variant="primary"
                size="sm"
                title="Ver validación"
              >
                <LuEye className="me-1" />
                Ver Validación
              </Button>
            </Link>
          </div>
        )
      },
    },
  ]

  useEffect(() => {
    let cursosFiltrados = [...mappedCursos]

    // Filtrar por año
    if (filtroAño !== 'todos') {
      cursosFiltrados = cursosFiltrados.filter(curso => curso.año === parseInt(filtroAño))
    }

    // Filtrar por nivel
    if (filtroNivel !== 'todos') {
      cursosFiltrados = cursosFiltrados.filter(curso => curso.nivel === filtroNivel)
    }

    setData(cursosFiltrados)
  }, [mappedCursos, filtroAño, filtroNivel])

  const exportarCSV = async () => {
    const selectedRows = table.getSelectedRowModel().rows
    if (selectedRows.length === 0) {
      alert('Por favor selecciona al menos un curso para exportar')
      return
    }

    setExportando(true)
    try {
      const cursosIds = selectedRows.map(row => row.original.documentId || row.original.id)
      const colegioId = colegio?.documentId || colegio?.id
      
      const response = await fetch('/api/crm/listas/exportar-cursos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          cursosIds, 
          colegioId,
          formato: 'csv' 
        }),
      })

      if (!response.ok) throw new Error('Error al exportar')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `listas_${colegio?.nombre || 'colegio'}_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error al exportar CSV:', error)
      alert('Error al exportar CSV. Por favor intenta de nuevo.')
    } finally {
      setExportando(false)
    }
  }

  const exportarEscolar = async () => {
    const selectedRows = table.getSelectedRowModel().rows
    if (selectedRows.length === 0) {
      alert('Por favor selecciona al menos un curso para exportar')
      return
    }

    setExportando(true)
    try {
      const cursosIds = selectedRows.map(row => row.original.documentId || row.original.id)
      const colegioId = colegio?.documentId || colegio?.id
      
      const response = await fetch('/api/crm/listas/exportar-cursos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          cursosIds, 
          colegioId,
          formato: 'escolar' 
        }),
      })

      if (!response.ok) throw new Error('Error al exportar')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `escolar_${colegio?.nombre || 'colegio'}_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error al exportar para escolar.cl:', error)
      alert('Error al exportar. Por favor intenta de nuevo.')
    } finally {
      setExportando(false)
    }
  }

  const procesarMasivamente = async () => {
    const selectedRows = table.getSelectedRowModel().rows
    if (selectedRows.length === 0) {
      alert('Por favor selecciona al menos un curso para procesar')
      return
    }

    // Verificar que todos los cursos seleccionados tengan PDF
    const cursosSinPDF = selectedRows.filter(row => !row.original.pdf_id)
    if (cursosSinPDF.length > 0) {
      const confirmar = window.confirm(
        `${cursosSinPDF.length} curso(s) no tienen PDF asociado y serán omitidos. ¿Deseas continuar?`
      )
      if (!confirmar) return
    }

    // Filtrar solo cursos con PDF
    const cursosConPDF = selectedRows.filter(row => row.original.pdf_id)
    if (cursosConPDF.length === 0) {
      alert('Ninguno de los cursos seleccionados tiene PDF asociado')
      return
    }

    // Inicializar resultados
    const resultadosIniciales = cursosConPDF.map(row => ({
      curso: row.original.nombre,
      cursoId: row.original.documentId || row.original.id,
      pdfId: row.original.pdf_id,
      status: 'pending' as const,
      mensaje: 'Pendiente',
    }))
    
    setResultados(resultadosIniciales)
    setShowProcesarModal(true)
    setProcesando(true)
    setProgresoTotal(0)

    // Procesar cada curso secuencialmente
    for (let i = 0; i < cursosConPDF.length; i++) {
      const row = cursosConPDF[i]
      const cursoId = row.original.documentId || row.original.id
      const pdfId = row.original.pdf_id
      const cursoNombre = row.original.nombre

      try {
        // Actualizar estado actual
        setCursoActual(cursoNombre)
        setResultados(prev => prev.map((r, idx) => 
          idx === i ? { ...r, status: 'processing', mensaje: 'Procesando con Claude AI...' } : r
        ))

        // Usar el mismo endpoint que funciona en validación individual
        console.log(`[Procesamiento Masivo] Procesando curso ${cursoNombre} con Claude AI...`, {
          cursoId,
          pdfId
        })
        
        const response = await fetch(`/api/crm/listas/${cursoId}/procesar-pdf`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ forzarReprocesar: true }), // Forzar reprocesamiento en procesamiento masivo
        })

        const result = await response.json()
        
        console.log(`[Procesamiento Masivo] Resultado para ${cursoNombre}:`, result)

        if (response.ok && result.success) {
          const productosEncontrados = result.data?.productos?.length || 0
          const guardadoExitoso = result.data?.guardadoEnStrapi || false
          
          // Verificar que se guardaron correctamente
          if (!guardadoExitoso) {
            console.warn(`[Procesamiento Masivo] ⚠️ Productos extraídos pero no guardados para ${cursoNombre}`)
          }
          
          // Verificar que hay productos
          if (productosEncontrados === 0) {
            console.warn(`[Procesamiento Masivo] ⚠️ No se encontraron productos para ${cursoNombre}`)
          }
          
          setResultados(prev => prev.map((r, idx) => 
            idx === i ? { 
              ...r, 
              status: 'success', 
              mensaje: `✓ ${productosEncontrados} productos extraídos${guardadoExitoso ? ' y guardados' : ' (error al guardar)'} con Claude AI`,
              productosEncontrados 
            } : r
          ))
        } else {
          throw new Error(result.error || 'Error al procesar PDF')
        }
      } catch (error: any) {
        console.error(`[Procesamiento Masivo] Error en ${cursoNombre}:`, error)
        setResultados(prev => prev.map((r, idx) => 
          idx === i ? { 
            ...r, 
            status: 'error', 
            mensaje: `✗ Error: ${error.message}` 
          } : r
        ))
      }

      // Actualizar progreso
      setProgresoTotal(((i + 1) / cursosConPDF.length) * 100)
      
      // Esperar 3 segundos entre cada procesamiento para evitar rate limits de Claude
      if (i < cursosConPDF.length - 1) {
        console.log(`[Procesamiento Masivo] Esperando 3 segundos antes del siguiente curso...`)
        await new Promise(resolve => setTimeout(resolve, 3000))
      }
    }

    setProcesando(false)
    setCursoActual('')
    console.log('[Procesamiento Masivo] ✅ Procesamiento completo de todos los cursos')
  }

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination,
      rowSelection,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableRowSelection: true,
  })

  if (error) {
    return (
      <Alert variant="danger">
        <h5>Error al cargar cursos</h5>
        <p>{error}</p>
      </Alert>
    )
  }

  if (!colegio) {
    return (
      <Alert variant="warning">
        <h5>Colegio no encontrado</h5>
        <p>No se pudo cargar la información del colegio</p>
      </Alert>
    )
  }

  return (
    <>
      <Row>
        <Col lg={12}>
          <Card>
            <CardHeader className="d-flex justify-content-between align-items-center">
              <div>
                <h4 className="mb-2">{colegio.nombre}</h4>
                <div className="text-muted">
                  <span className="me-3">RBD: {colegio.rbd}</span>
                  {colegio.comuna && <span className="me-3">• {colegio.comuna}</span>}
                  {colegio.region && <span>• {colegio.region}</span>}
                </div>
                {colegio.total_matriculados > 0 && (
                  <Badge bg="warning" text="dark" className="mt-2">
                    {colegio.total_matriculados.toLocaleString('es-CL')} estudiantes matriculados
                  </Badge>
                )}
              </div>
              <div className="d-flex gap-2">
                <Button
                  variant="primary"
                  onClick={() => setShowSmartUpload(true)}
                  title="Cargar PDFs automáticamente reconociendo el curso"
                >
                  <LuZap className="me-2" />
                  Carga Inteligente
                </Button>
                <Button
                  variant="outline-primary"
                  onClick={() => router.refresh()}
                  title="Recargar para ver cambios actualizados"
                >
                  <LuRefreshCw className="me-2" />
                  Recargar
                </Button>
                <Button
                  variant="outline-secondary"
                  onClick={() => router.back()}
                >
                  <LuArrowLeft className="me-2" />
                  Volver
                </Button>
              </div>
            </CardHeader>

            <Card.Body>
              <Row className="mb-3">
                <Col sm={12} md={4}>
                  <div className="app-search position-relative">
                    <input
                      type="search"
                      className="form-control"
                      placeholder="Buscar curso..."
                      value={globalFilter ?? ''}
                      onChange={(e) => setGlobalFilter(e.target.value)}
                    />
                    <span className="mdi mdi-magnify search-icon"></span>
                  </div>
                </Col>
                <Col sm={6} md={2}>
                  <select
                    className="form-select form-control"
                    value={filtroAño}
                    onChange={(e) => setFiltroAño(e.target.value)}
                  >
                    <option value="todos">Todos los años</option>
                    {añosDisponibles.map(año => (
                      <option key={año} value={año}>{año}</option>
                    ))}
                  </select>
                </Col>
                <Col sm={6} md={2}>
                  <select
                    className="form-select form-control"
                    value={filtroNivel}
                    onChange={(e) => setFiltroNivel(e.target.value)}
                  >
                    <option value="todos">Todos los niveles</option>
                    {nivelesDisponibles.map(nivel => (
                      <option key={nivel} value={nivel}>{nivel}</option>
                    ))}
                  </select>
                </Col>
                <Col sm={12} md={4} className="d-flex justify-content-end align-items-center gap-2">
                  <small className="text-muted">Mostrar:</small>
                  <div>
                    <select
                      className="form-select form-control"
                      value={table.getState().pagination.pageSize}
                      onChange={(e) => table.setPageSize(Number(e.target.value))}>
                      {[10, 25, 50, 100].map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </div>
                </Col>
              </Row>

              {Object.keys(rowSelection).length > 0 && (
                <Row className="mb-3">
                  <Col xs={12}>
                    <Alert variant="info" className="d-flex justify-content-between align-items-center mb-0">
                      <span>
                        <strong>{Object.keys(rowSelection).length}</strong> curso(s) seleccionado(s)
                      </span>
                      <div className="d-flex gap-2">
                        <Button 
                          variant="warning" 
                          size="sm"
                          onClick={procesarMasivamente}
                          disabled={procesando}
                          title="Procesar PDFs con IA (Gemini) para extraer productos automáticamente"
                        >
                          <LuZap className="me-1" />
                          {procesando ? 'Procesando...' : 'Procesar con IA'}
                        </Button>
                        <Button 
                          variant="success" 
                          size="sm"
                          onClick={exportarCSV}
                          disabled={exportando}
                        >
                          <LuDownload className="me-1" />
                          {exportando ? 'Exportando...' : 'Exportar CSV'}
                        </Button>
                        <Button 
                          variant="primary" 
                          size="sm"
                          onClick={exportarEscolar}
                          disabled={exportando}
                        >
                          <LuFileSpreadsheet className="me-1" />
                          {exportando ? 'Exportando...' : 'Exportar para escolar.cl'}
                        </Button>
                      </div>
                    </Alert>
                  </Col>
                </Row>
              )}

              {data.length === 0 ? (
                <div className="text-center py-5">
                  <p className="text-muted">No se encontraron cursos con listas para este colegio</p>
                </div>
              ) : (
                <>
                  <DataTable table={table} />
                  <CardFooter className="border-top py-3">
                    <TablePagination
                      totalItems={table.getFilteredRowModel().rows.length}
                      start={table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
                      end={Math.min(
                        (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                        table.getFilteredRowModel().rows.length
                      )}
                      itemsName="cursos"
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
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Modal de Procesamiento Masivo con IA */}
      <Modal
        show={showProcesarModal}
        onHide={() => !procesando && setShowProcesarModal(false)}
        size="lg"
        backdrop={procesando ? 'static' : true}
        keyboard={!procesando}
      >
        <Modal.Header closeButton={!procesando}>
          <Modal.Title>
            <LuZap className="me-2" />
            Procesamiento Masivo con Claude AI
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3">
            <div className="d-flex justify-content-between mb-2">
              <span className="fw-bold">Progreso Total:</span>
              <span>{Math.round(progresoTotal)}%</span>
            </div>
            <ProgressBar 
              now={progresoTotal} 
              variant={procesando ? 'primary' : 'success'}
              animated={procesando}
              striped={procesando}
            />
          </div>

          {cursoActual && (
            <Alert variant="info" className="mb-3">
              <Spinner animation="border" size="sm" className="me-2" />
              <strong>Procesando:</strong> {cursoActual}
            </Alert>
          )}

          <div className="mt-3">
            <h6 className="mb-3">Resultados:</h6>
            {resultados.length === 0 ? (
              <div className="text-center text-muted py-3">
                Iniciando procesamiento...
              </div>
            ) : (
              <div className="list-group">
                {resultados.map((resultado, index) => (
                  <div
                    key={index}
                    className={`list-group-item d-flex justify-content-between align-items-start ${
                      resultado.status === 'processing' ? 'list-group-item-info' :
                      resultado.status === 'success' ? 'list-group-item-success' :
                      resultado.status === 'error' ? 'list-group-item-danger' : ''
                    }`}
                  >
                    <div className="flex-grow-1">
                      <h6 className="mb-1">{resultado.curso}</h6>
                      <p className="mb-0 small">{resultado.mensaje}</p>
                    </div>
                    <div>
                      {resultado.status === 'pending' && (
                        <Badge bg="secondary">Pendiente</Badge>
                      )}
                      {resultado.status === 'processing' && (
                        <Spinner animation="border" size="sm" variant="info" />
                      )}
                      {resultado.status === 'success' && (
                        <Badge bg="success">✓</Badge>
                      )}
                      {resultado.status === 'error' && (
                        <Badge bg="danger">✗</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer>
          {!procesando && (
            <>
              <Button
                variant="secondary"
                onClick={() => setShowProcesarModal(false)}
              >
                Cerrar
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setShowProcesarModal(false)
                  router.refresh()
                }}
              >
                <LuRefreshCw className="me-2" />
                Recargar Página
              </Button>
            </>
          )}
          {procesando && (
            <div className="text-muted small">
              Por favor espera mientras se procesan los PDFs...
            </div>
          )}
        </Modal.Footer>
      </Modal>
      
      {/* Modal de Carga Inteligente */}
      <SmartPDFUpload
        show={showSmartUpload}
        onHide={() => setShowSmartUpload(false)}
        colegioId={colegio?.documentId || colegio?.id || ''}
        cursos={mappedCursos.map(c => ({
          id: c.id,
          documentId: c.documentId,
          nombre: c.nombre,
          nivel: c.nivel === 'Básico' ? 'Basica' : c.nivel === 'Medio' ? 'Media' : c.nivel,
          grado: c.grado,
          paralelo: c.nombre.match(/\b([A-Z])\b/)?.[1],
          letra: c.nombre.match(/\b([A-Z])\b/)?.[1],
          año: c.año
        }))}
        onSuccess={() => {
          setShowSmartUpload(false)
          router.refresh()
        }}
      />
    </>
  )
}
