'use client'

import {
  ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table'
import Link from 'next/link'
import { useState, useEffect, useMemo } from 'react'
import { format, differenceInDays } from 'date-fns'
import { Button, Card, CardHeader, CardBody, Col, Row, Badge, Form, InputGroup, OverlayTrigger, Popover } from 'react-bootstrap'
import { LuSearch, LuFileText, LuDownload, LuEye, LuUpload, LuRefreshCw, LuMapPin, LuPhone, LuChevronLeft } from 'react-icons/lu'
import { TbEdit, TbTrash } from 'react-icons/tb'

import DataTable from '@/components/table/DataTable'
import TablePagination from '@/components/table/TablePagination'
import ImportacionCompletaModal from './ImportacionCompletaModal'
import GestionarVersionesModal from './GestionarVersionesModal'

// Tipo para colegios con listas
interface ColegioRowType {
  id: string | number
  documentId?: string
  nombre: string
  rbd: string
  tipo: string
  telefono: string
  email: string
  direccion: string
  comuna: string
  region: string
  totalListas: number
  matriculaTotal: number
  listasPorAño: { [año: number]: number }
  ultimaActualizacion: string
  cursos: any[]
}

// Tipo para cada fila de listas
interface ListaRowType {
  id: string | number
  documentId: string
  nombre: string
  nivel: 'Basica' | 'Media'
  grado: number
  año: number
  colegio: string
  colegioId: string | number
  direccion: string
  comuna: string
  region: string
  telefono: string
  rbd: string
  curso: string
  matricula: number | null
  tienePDF: boolean
  cantidadPDFs: number
  estado: 'Activo' | 'Inactivo'
  fechaCreacion: string
  fechaModificacion: string
  pdf_url?: string
  pdf_id?: string | number
}

export default function ListasListing({ listas: listasProp, error: initialError }: { listas: any[]; error: string | null }) {
  // Vista actual: 'colegios' o 'listas'
  const [vista, setVista] = useState<'colegios' | 'listas'>('colegios')
  const [colegioSeleccionado, setColegioSeleccionado] = useState<ColegioRowType | null>(null)
  
  const [colegiosData, setColegiosData] = useState<ColegioRowType[]>([])
  const [listasData, setListasData] = useState<ListaRowType[]>([])
  const [error, setError] = useState<string | null>(initialError)
  const [loading, setLoading] = useState(false)
  const [showImportCompletaModal, setShowImportCompletaModal] = useState(false)
  const [showGestionarVersionesModal, setShowGestionarVersionesModal] = useState(false)
  const [cursoParaGestionar, setCursoParaGestionar] = useState<{ id: string | number; nombre: string; colegioNombre?: string } | null>(null)

  // Estados de filtros para colegios
  const [busquedaColegio, setBusquedaColegio] = useState('')
  const [filtroRegionColegio, setFiltroRegionColegio] = useState('')
  const [filtroComunaColegio, setFiltroComunaColegio] = useState('')
  
  // Estados de filtros para listas
  const [busquedaLista, setBusquedaLista] = useState('')
  const [filtroNivel, setFiltroNivel] = useState<string>('')
  const [filtroAño, setFiltroAño] = useState<string>('')
  const [mostrarTodos, setMostrarTodos] = useState(false) // ✅ Estado para mostrar todos los cursos (incluidos sin PDFs)
  
  // Estados de tabla
  const [sortingColegios, setSortingColegios] = useState<SortingState>([{ id: 'ultimaActualizacion', desc: true }])
  const [sortingListas, setSortingListas] = useState<SortingState>([{ id: 'año', desc: true }])
  const [paginationColegios, setPaginationColegios] = useState({ pageIndex: 0, pageSize: 10 })
  const [paginationListas, setPaginationListas] = useState({ pageIndex: 0, pageSize: 10 })

  // Cargar datos (con parámetro opcional para forzar un modo específico)
  const cargarDatos = async (forzarMostrarTodos?: boolean) => {
    // Usar el parámetro forzado o el estado actual
    const modoActual = forzarMostrarTodos !== undefined ? forzarMostrarTodos : mostrarTodos
    
    console.log('[ListasListing] 🚀 Iniciando carga de datos...')
    console.log(`[ListasListing] 📋 Modo: ${modoActual ? 'MOSTRAR TODOS' : 'SOLO CON PDFs'}`)
    setLoading(true)
    setError(null)
    try {
      console.log('[ListasListing] 📡 Haciendo fetch a /api/crm/listas/por-colegio...')
      const startTime = Date.now()
      
      // Agregar timeout y mejor manejo de errores
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 120000) // 2 minutos timeout

      try {
        // Agregar parámetro para forzar recarga sin caché si es necesario
        const url = `/api/crm/listas/por-colegio?t=${Date.now()}${modoActual ? '&mostrarTodos=true' : ''}`
        console.log(`[ListasListing] 🌐 URL: ${url}`)
        const response = await fetch(url, {
          signal: controller.signal,
        })
        clearTimeout(timeoutId)
        const fetchTime = Date.now() - startTime
        console.log(`[ListasListing] ⏱️ Fetch completado en ${fetchTime}ms`)
      
        console.log('[ListasListing] 📥 Respuesta recibida:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          contentType: response.headers.get('content-type'),
        })
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error('[ListasListing] ❌ Error en respuesta HTTP:', {
            status: response.status,
            statusText: response.statusText,
            body: errorText,
          })
          throw new Error(`Error HTTP ${response.status}: ${response.statusText}`)
        }
        
        const parseStartTime = Date.now()
        const result = await response.json()
        const parseTime = Date.now() - parseStartTime
        console.log(`[ListasListing] ⏱️ Parse JSON completado en ${parseTime}ms`)
      console.log('[ListasListing] 📊 Resultado parseado:', {
        success: result.success,
        hasData: !!result.data,
        dataType: Array.isArray(result.data) ? 'array' : typeof result.data,
        dataLength: Array.isArray(result.data) ? result.data.length : 'N/A',
        total: result.total,
        cached: result.cached,
        diagnostic: result.diagnostic,
        error: result.error,
      })

      if (result.success && result.data) {
        console.log('[ListasListing] ✅ Datos recibidos correctamente')
        console.log('[ListasListing] 📋 Primeros 3 colegios:', result.data.slice(0, 3).map((c: any) => ({
          id: c.id,
          nombre: c.nombre,
          rbd: c.rbd,
          totalListas: c.totalListas,
          cantidadCursos: c.cursos?.length || 0,
        })))
        
        // Transformar a colegios
        const colegios: ColegioRowType[] = result.data.map((colegio: any) => {
          console.log('[ListasListing] 🔄 Transformando colegio:', {
            id: colegio.id,
            nombre: colegio.nombre,
            rbd: colegio.rbd,
            totalListas: colegio.totalListas,
            cursos: colegio.cursos?.length || 0,
          })
          const telefonos = colegio.telefonos || []
          const emails = colegio.emails || []
          
          // Contar listas totales, por año y obtener última actualización
          let totalListas = 0
          let ultimaFecha = ''
          const listasPorAño: { [año: number]: number } = {}
          const cursos = colegio.cursos || []
          
          cursos.forEach((curso: any) => {
            const attrs = curso?.attributes || curso
            const versiones = attrs.versiones_materiales || []
            const añoCurso = attrs.año || attrs.ano || 2026
            const versionesConPDF = versiones.filter((v: any) => v.pdf_id || v.pdf_url)
            
            if (versionesConPDF.length > 0) {
              totalListas += versionesConPDF.length
              listasPorAño[añoCurso] = (listasPorAño[añoCurso] || 0) + versionesConPDF.length
            }
            
            // Buscar la fecha más reciente
            versionesConPDF.forEach((v: any) => {
              const fecha = v.fecha_actualizacion || v.fecha_subida || ''
              if (fecha && (!ultimaFecha || new Date(fecha) > new Date(ultimaFecha))) {
                ultimaFecha = fecha
              }
            })
          })
          
          return {
            id: colegio.id || colegio.documentId,
            documentId: colegio.documentId,
            nombre: colegio.nombre,
            rbd: colegio.rbd || '',
            tipo: colegio.tipo || 'Particular Subvencionado',
            telefono: telefonos[0]?.telefono_raw || telefonos[0]?.telefono || '',
            email: emails[0]?.email || '',
            direccion: colegio.direccion || '-',
            comuna: colegio.comuna || '',
            region: colegio.region || '',
            totalListas,
            matriculaTotal: colegio.matriculaTotal || 0,
            listasPorAño,
            ultimaActualizacion: ultimaFecha,
            cursos: colegio.cursos || [],
          }
        }).filter((c: ColegioRowType) => c.totalListas > 0) // Solo colegios con listas
        
        console.log('[ListasListing] ✅ Transformación de colegios completada:', {
          antesFiltro: result.data.length,
          despuesFiltro: colegios.length,
          colegiosFiltrados: result.data.length - colegios.length,
          colegiosSample: colegios.slice(0, 2).map(c => ({ nombre: c.nombre, totalListas: c.totalListas })),
        })
        
        setColegiosData(colegios)
        
        // Transformar a listas
        const listas: ListaRowType[] = []
        result.data.forEach((colegio: any) => {
          if (!colegio.cursos) return
          
          const telefonos = colegio.telefonos || []
          const telefono = telefonos[0]?.telefono_raw || telefonos[0]?.telefono || ''
          
          colegio.cursos.forEach((curso: any) => {
            const attrs = curso?.attributes || curso
            const versiones = attrs.versiones_materiales || curso.versiones_materiales || []
            const año = attrs.año || attrs.ano || curso._año || 2026
            const nivel = attrs.nivel || curso._nivel || 'Basica'
            const grado = parseInt(String(attrs.grado || curso._grado || 1))
            const paralelo = attrs.paralelo || ''
            
            const versionesConPDF = versiones.filter((v: any) => v.pdf_id || v.pdf_url)
            if (versionesConPDF.length === 0) return
            
            const gradoTexto = nivel === 'Media' 
              ? ['I', 'II', 'III', 'IV'][grado - 1] || String(grado)
              : `${grado}º`
            const nivelTexto = nivel === 'Media' ? 'Media' : 'Básico'
            const nombreCurso = `${gradoTexto} ${nivelTexto}${paralelo ? ` ${paralelo}` : ''}`
            
            const ultimaVersion = versionesConPDF.sort((a: any, b: any) => {
              const fechaA = a.fecha_subida ? new Date(a.fecha_subida).getTime() : 0
              const fechaB = b.fecha_subida ? new Date(b.fecha_subida).getTime() : 0
              return fechaB - fechaA
            })[0]
            
            // El documentId es el identificador único que usa Strapi v5
            // Puede estar en curso.documentId o en attrs.documentId
            const cursoDocumentId = curso.documentId || attrs.documentId || curso.id
            
            // Obtener matrícula del curso (verificar múltiples ubicaciones)
            const matricula = curso._matricula || 
                            attrs.matricula || 
                            curso.matricula || 
                            (curso.attributes && curso.attributes.matricula) ||
                            null
            
            listas.push({
              id: curso.id || curso.documentId,
              documentId: cursoDocumentId,
              nombre: `${gradoTexto} ${nivelTexto}`,
              nivel: nivel as 'Basica' | 'Media',
              grado,
              año,
              colegio: colegio.nombre,
              colegioId: colegio.id || colegio.documentId,
              direccion: colegio.direccion || '',
              comuna: colegio.comuna || '',
              region: colegio.region || '',
              telefono,
              rbd: colegio.rbd || '',
              curso: nombreCurso,
              matricula,
              tienePDF: versionesConPDF.length > 0,
              cantidadPDFs: versionesConPDF.length,
              estado: 'Activo',
              fechaCreacion: ultimaVersion?.fecha_subida || '',
              fechaModificacion: ultimaVersion?.fecha_actualizacion || ultimaVersion?.fecha_subida || '',
              pdf_url: ultimaVersion?.pdf_url,
              pdf_id: ultimaVersion?.pdf_id,
            })
          })
        })
        
        console.log('[ListasListing] ✅ Transformación de listas completada:', {
          listasCount: listas.length,
          listasSample: listas.slice(0, 2).map(l => ({ nombre: l.nombre, colegio: l.colegio })),
        })
        
        setListasData(listas)
        
        console.log('[ListasListing] 💾 Estado actualizado:', {
          colegiosDataLength: colegios.length,
          listasDataLength: listas.length,
        })
      } else {
        const errorMsg = result.error || 'Error al cargar datos'
        console.error('[ListasListing] ❌ Error en respuesta:', {
          success: result.success,
          error: errorMsg,
          result,
        })
        setError(errorMsg)
      }
      } catch (fetchError: any) {
        clearTimeout(timeoutId)
        if (fetchError.name === 'AbortError') {
          console.error('[ListasListing] ❌ Timeout: El fetch tardó más de 2 minutos')
          setError('La solicitud tardó demasiado tiempo. Por favor, intenta de nuevo.')
        } else {
          throw fetchError
        }
      }
    } catch (err: any) {
      console.error('[ListasListing] ❌ Excepción al cargar datos:', {
        message: err.message,
        stack: err.stack,
        name: err.name,
        error: err,
      })
      setError(err.message || 'Error al cargar datos')
    } finally {
      console.log('[ListasListing] 🏁 Finalizando carga de datos')
      setLoading(false)
    }
  }

  useEffect(() => {
    console.log('[ListasListing] 🎯 Componente montado, iniciando carga de datos')
    console.log('[ListasListing] 📊 Estado inicial:', {
      colegiosDataLength: colegiosData.length,
      listasDataLength: listasData.length,
      loading,
      error,
      vista,
    })
    cargarDatos()
  }, [])
  
  // Log cuando cambian los datos
  useEffect(() => {
    console.log('[ListasListing] 📊 Estado de colegiosData actualizado:', {
      length: colegiosData.length,
      primeros3: colegiosData.slice(0, 3).map(c => ({ nombre: c.nombre, totalListas: c.totalListas })),
    })
  }, [colegiosData])
  
  useEffect(() => {
    console.log('[ListasListing] 📊 Estado de listasData actualizado:', {
      length: listasData.length,
      primeros3: listasData.slice(0, 3).map(l => ({ nombre: l.nombre, colegio: l.colegio })),
    })
  }, [listasData])

  // Opciones de filtros colegios
  const regionesUnicas = useMemo(() => {
    const set = new Set(colegiosData.map(c => c.region).filter(Boolean))
    return Array.from(set).sort()
  }, [colegiosData])

  const comunasUnicasColegios = useMemo(() => {
    let data = colegiosData
    if (filtroRegionColegio) {
      data = data.filter(c => c.region === filtroRegionColegio)
    }
    const set = new Set(data.map(c => c.comuna).filter(Boolean))
    return Array.from(set).sort()
  }, [colegiosData, filtroRegionColegio])

  // Filtrar colegios
  const colegiosFiltrados = useMemo(() => {
    return colegiosData.filter(colegio => {
      if (busquedaColegio) {
        const searchLower = busquedaColegio.toLowerCase()
        const matchNombre = colegio.nombre.toLowerCase().includes(searchLower)
        const matchRbd = colegio.rbd.toLowerCase().includes(searchLower)
        if (!matchNombre && !matchRbd) return false
      }
      if (filtroRegionColegio && colegio.region !== filtroRegionColegio) return false
      if (filtroComunaColegio && colegio.comuna !== filtroComunaColegio) return false
      return true
    })
  }, [colegiosData, busquedaColegio, filtroRegionColegio, filtroComunaColegio])

  // Filtrar listas (por colegio seleccionado + filtros adicionales)
  const listasFiltradas = useMemo(() => {
    return listasData.filter(lista => {
      // Filtrar por colegio seleccionado
      if (colegioSeleccionado && lista.colegioId !== colegioSeleccionado.id) return false
      
      if (busquedaLista) {
        const searchLower = busquedaLista.toLowerCase()
        const matchNombre = lista.nombre.toLowerCase().includes(searchLower)
        const matchCurso = lista.curso.toLowerCase().includes(searchLower)
        if (!matchNombre && !matchCurso) return false
      }
      if (filtroNivel && lista.nivel !== filtroNivel) return false
      if (filtroAño && lista.año !== parseInt(filtroAño)) return false
      return true
    })
  }, [listasData, colegioSeleccionado, busquedaLista, filtroNivel, filtroAño])

  // Helper para verificar si es "nuevo" (últimos 7 días)
  const esNuevo = (fecha: string) => {
    if (!fecha) return false
    try {
      const diff = differenceInDays(new Date(), new Date(fecha))
      return diff <= 7
    } catch {
      return false
    }
  }

  // Generar iniciales para avatar
  const getIniciales = (nombre: string) => {
    const palabras = nombre.split(' ').filter(p => p.length > 0)
    if (palabras.length >= 2) {
      return (palabras[0][0] + palabras[1][0]).toUpperCase()
    }
    return nombre.substring(0, 2).toUpperCase()
  }

  // ============ COLUMNAS TABLA COLEGIOS ============
  const columnsColegios: ColumnDef<ColegioRowType, any>[] = useMemo(() => [
    {
      id: 'institucion',
      header: 'INSTITUCIÓN',
      accessorKey: 'nombre',
      enableSorting: true,
      cell: ({ row }) => {
        const colegio = row.original
        const iniciales = getIniciales(colegio.nombre)
        return (
          <div className="d-flex align-items-center gap-2">
            <div 
              className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
              style={{ 
                width: 40, 
                height: 40, 
                backgroundColor: '#6366f1',
                fontSize: '12px'
              }}
            >
              {iniciales}
            </div>
            <div>
              <div className="fw-semibold text-dark">{colegio.nombre}</div>
              <div className="text-muted small">RBD: {colegio.rbd || '-'}</div>
            </div>
          </div>
        )
      },
    },
    {
      id: 'comuna',
      header: 'COMUNA',
      accessorKey: 'comuna',
      enableSorting: true,
      cell: ({ row }) => (
        <span style={{ fontSize: '13px' }}>
          {row.original.comuna || '-'}
        </span>
      ),
    },
    {
      id: 'region',
      header: 'REGIÓN',
      accessorKey: 'region',
      enableSorting: true,
      cell: ({ row }) => (
        <span style={{ fontSize: '13px' }}>
          {row.original.region || '-'}
        </span>
      ),
    },
    {
      id: 'direccion',
      header: 'DIRECCIÓN',
      accessorKey: 'direccion',
      enableSorting: false,
      cell: ({ row }) => (
        <span style={{ fontSize: '13px' }} className="text-muted">
          {row.original.direccion || '-'}
        </span>
      ),
    },
    {
      id: 'totalListas',
      header: 'LISTAS',
      accessorKey: 'totalListas',
      enableSorting: true,
      size: 120,
      cell: ({ row }) => {
        const colegio = row.original
        const añosOrdenados = Object.keys(colegio.listasPorAño)
          .map(Number)
          .sort((a, b) => b - a)
        
        const popover = (
          <Popover id={`popover-listas-${colegio.id}`}>
            <Popover.Header as="h6" className="bg-primary text-white py-2">
              Listas por Año
            </Popover.Header>
            <Popover.Body className="p-2">
              {añosOrdenados.length > 0 ? (
                <div className="d-flex flex-column gap-1">
                  {añosOrdenados.map(año => (
                    <div 
                      key={año} 
                      className="d-flex justify-content-between align-items-center px-2 py-1 rounded"
                      style={{ backgroundColor: '#f8f9fa' }}
                    >
                      <span className="fw-semibold">{año}</span>
                      <Badge bg="primary">{colegio.listasPorAño[año]}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-muted">Sin listas</span>
              )}
            </Popover.Body>
          </Popover>
        )
        
        return (
          <OverlayTrigger trigger="click" placement="right" overlay={popover} rootClose>
            <Badge 
              bg="primary" 
              style={{ fontSize: '12px', cursor: 'pointer' }}
              className="d-flex align-items-center gap-1"
            >
              {colegio.totalListas} lista{colegio.totalListas !== 1 ? 's' : ''}
              <span style={{ fontSize: '10px' }}>▼</span>
            </Badge>
          </OverlayTrigger>
        )
      },
    },
    {
      id: 'matriculaTotal',
      header: 'MATRÍCULA TOTAL',
      accessorKey: 'matriculaTotal',
      enableSorting: true,
      size: 120,
      cell: ({ row }) => {
        const matricula = row.original.matriculaTotal || 0
        return (
          <div className="d-flex align-items-center gap-1">
            {matricula > 0 ? (
              <Badge bg="info" style={{ fontSize: '12px', padding: '6px 10px' }}>
                {matricula.toLocaleString('es-CL')} alumnos
              </Badge>
            ) : (
              <span className="text-muted" style={{ fontSize: '12px' }}>-</span>
            )}
          </div>
        )
      },
    },
    {
      id: 'ultimaActualizacion',
      header: 'ÚLTIMA ACTUALIZACIÓN',
      accessorKey: 'ultimaActualizacion',
      enableSorting: true,
      cell: ({ row }) => {
        const colegio = row.original
        const nuevo = esNuevo(colegio.ultimaActualizacion)
        const formatFecha = (fecha: string) => {
          if (!fecha) return '-'
          try {
            return format(new Date(fecha), 'dd/MM/yyyy HH:mm')
          } catch {
            return '-'
          }
        }
        return (
          <div style={{ fontSize: '12px' }}>
            {nuevo && (
              <Badge bg="success" className="mb-1 d-block" style={{ fontSize: '10px', width: 'fit-content' }}>
                Nuevo
              </Badge>
            )}
            <div>{formatFecha(colegio.ultimaActualizacion)}</div>
          </div>
        )
      },
    },
    {
      id: 'acciones',
      header: 'ACCIONES',
      enableSorting: false,
      cell: ({ row }) => {
        const colegio = row.original
        return (
          <div className="d-flex gap-1">
            <Button
              variant="outline-primary"
              size="sm"
              className="btn-icon rounded-circle"
              title="Ver listas"
              onClick={() => {
                setColegioSeleccionado(colegio)
                setVista('listas')
              }}
            >
              <LuEye size={14} />
            </Button>
            <Button
              variant="outline-secondary"
              size="sm"
              className="btn-icon rounded-circle"
              title="Editar"
            >
              <TbEdit size={14} />
            </Button>
            <Button
              variant="outline-success"
              size="sm"
              className="btn-icon rounded-circle"
              title="Descargar"
            >
              <LuDownload size={14} />
            </Button>
            <Button
              variant="outline-danger"
              size="sm"
              className="btn-icon rounded-circle"
              title="Eliminar"
            >
              <TbTrash size={14} />
            </Button>
          </div>
        )
      },
    },
  ], [])

  // ============ COLUMNAS TABLA LISTAS ============
  const columnsListas: ColumnDef<ListaRowType, any>[] = useMemo(() => [
    {
      id: 'nombre',
      header: 'NOMBRE',
      accessorKey: 'nombre',
      enableSorting: true,
      cell: ({ row }) => {
        const lista = row.original
        return (
          <div>
            <div className="fw-semibold" style={{ fontSize: '14px' }}>{lista.nombre}</div>
            <small className="text-muted">Curso: {lista.curso}</small>
          </div>
        )
      },
    },
    {
      id: 'nivel',
      header: 'NIVEL',
      accessorKey: 'nivel',
      enableSorting: true,
      size: 90,
      cell: ({ row }) => {
        const nivel = row.original.nivel
        return (
          <Badge 
            bg={nivel === 'Media' ? 'info' : 'primary'}
            style={{ fontSize: '11px' }}
          >
            {nivel === 'Media' ? 'Media' : 'Basica'}
          </Badge>
        )
      },
    },
    {
      id: 'grado',
      header: 'GRADO',
      accessorKey: 'grado',
      enableSorting: true,
      size: 70,
      cell: ({ row }) => {
        const lista = row.original
        const gradoTexto = lista.nivel === 'Media' 
          ? `${['I', 'II', 'III', 'IV'][lista.grado - 1] || lista.grado}°`
          : `${lista.grado}°`
        return <span style={{ fontSize: '13px' }}>{gradoTexto}</span>
      },
    },
    {
      id: 'año',
      header: 'AÑO',
      accessorKey: 'año',
      enableSorting: true,
      size: 70,
      cell: ({ row }) => (
        <span className="fw-semibold" style={{ fontSize: '13px' }}>{row.original.año}</span>
      ),
    },
    {
      id: 'colegio',
      header: 'COLEGIO',
      accessorKey: 'colegio',
      enableSorting: true,
      cell: ({ row }) => {
        const lista = row.original
        return (
          <div style={{ fontSize: '12px' }}>
            <div className="fw-semibold text-dark">{lista.colegio}</div>
            {lista.direccion && (
              <div className="text-muted d-flex align-items-center gap-1">
                <LuMapPin size={10} />
                {lista.direccion}
              </div>
            )}
            <div className="text-muted">{lista.comuna}{lista.region ? `, ${lista.region}` : ''}</div>
            {lista.telefono && (
              <div className="text-muted d-flex align-items-center gap-1">
                <LuPhone size={10} />
                {lista.telefono}
              </div>
            )}
            {lista.rbd && (
              <div className="text-primary" style={{ fontSize: '11px' }}>
                RBD: {lista.rbd}
              </div>
            )}
          </div>
        )
      },
    },
    {
      id: 'curso',
      header: 'CURSO',
      accessorKey: 'curso',
      enableSorting: true,
      cell: ({ row }) => (
        <span style={{ fontSize: '13px' }}>{row.original.curso}</span>
      ),
    },
    {
      id: 'matricula',
      header: 'MATRÍCULA',
      accessorKey: 'matricula',
      enableSorting: true,
      size: 150,
      enableHiding: false, // Asegurar que siempre esté visible
      cell: ({ row }) => {
        const matricula = row.original.matricula || 0
        return (
          <div className="d-flex align-items-center">
            {matricula > 0 ? (
              <Badge bg="success" style={{ fontSize: '12px', padding: '6px 10px', fontWeight: '500' }}>
                {matricula.toLocaleString('es-CL')} alumnos
              </Badge>
            ) : (
              <span className="text-muted" style={{ fontSize: '12px' }}>-</span>
            )}
          </div>
        )
      },
    },
    {
      id: 'pdf',
      header: 'PDF',
      accessorKey: 'tienePDF',
      enableSorting: true,
      size: 100,
      cell: ({ row }) => {
        const lista = row.original
        return lista.tienePDF ? (
          <Badge bg="success" style={{ fontSize: '11px' }}>
            Disponible
          </Badge>
        ) : (
          <Badge bg="secondary" style={{ fontSize: '11px' }}>
            Sin PDF
          </Badge>
        )
      },
    },
    {
      id: 'cantidadPDFs',
      header: 'CANTIDAD',
      accessorKey: 'cantidadPDFs',
      enableSorting: true,
      size: 100,
      cell: ({ row }) => {
        const cantidad = row.original.cantidadPDFs
        return (
          <Badge bg="info" style={{ fontSize: '11px' }}>
            {cantidad} PDF{cantidad !== 1 ? 's' : ''}
          </Badge>
        )
      },
    },
    {
      id: 'estado',
      header: 'ESTADO',
      accessorKey: 'estado',
      enableSorting: true,
      size: 80,
      cell: () => (
        <Badge bg="success" style={{ fontSize: '11px' }}>
          Activo
        </Badge>
      ),
    },
    {
      id: 'fechas',
      header: 'FECHAS',
      accessorKey: 'fechaModificacion',
      enableSorting: true,
      cell: ({ row }) => {
        const lista = row.original
        const formatFecha = (fecha: string) => {
          if (!fecha) return '-'
          try {
            return format(new Date(fecha), 'dd/MM/yyyy HH:mm')
          } catch {
            return '-'
          }
        }
        return (
          <div style={{ fontSize: '11px' }}>
            <div>Mod: {formatFecha(lista.fechaModificacion)}</div>
            <div className="text-muted">Creado: {formatFecha(lista.fechaCreacion)}</div>
          </div>
        )
      },
    },
    {
      id: 'acciones',
      header: 'ACCIONES',
      enableSorting: false,
      cell: ({ row }) => {
        const lista = row.original
        return (
          <div className="d-flex gap-1">
            <Link href={`/crm/listas/${lista.documentId}/validacion`}>
              <Button
                variant="outline-primary"
                size="sm"
                className="btn-icon rounded-circle"
                title="Ver validación"
              >
                <LuEye size={14} />
              </Button>
            </Link>
            {lista.pdf_url && (
              <a href={lista.pdf_url} target="_blank" rel="noopener noreferrer">
                <Button
                  variant="outline-success"
                  size="sm"
                  className="btn-icon rounded-circle"
                  title="Descargar PDF"
                >
                  <LuDownload size={14} />
                </Button>
              </a>
            )}
            <Button
              variant="outline-secondary"
              size="sm"
              className="btn-icon rounded-circle"
              title="Gestionar versiones"
              onClick={() => {
                setCursoParaGestionar({
                  id: lista.documentId,
                  nombre: lista.curso,
                  colegioNombre: lista.colegio,
                })
                setShowGestionarVersionesModal(true)
              }}
            >
              <TbEdit size={14} />
            </Button>
          </div>
        )
      },
    },
  ], [])

  // Tablas
  const tableColegios = useReactTable<ColegioRowType>({
    data: colegiosFiltrados,
    columns: columnsColegios,
    state: {
      sorting: sortingColegios,
      pagination: paginationColegios,
    },
    onSortingChange: setSortingColegios,
    onPaginationChange: setPaginationColegios,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const tableListas = useReactTable<ListaRowType>({
    data: listasFiltradas,
    columns: columnsListas,
    state: {
      sorting: sortingListas,
      pagination: paginationListas,
    },
    onSortingChange: setSortingListas,
    onPaginationChange: setPaginationListas,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const limpiarFiltrosColegios = () => {
    setBusquedaColegio('')
    setFiltroRegionColegio('')
    setFiltroComunaColegio('')
  }

  const limpiarFiltrosListas = () => {
    setBusquedaLista('')
    setFiltroNivel('')
    setFiltroAño('')
  }

  const volverAColegios = () => {
    setVista('colegios')
    setColegioSeleccionado(null)
    limpiarFiltrosListas()
  }

  // ============ VISTA DE COLEGIOS ============
  if (vista === 'colegios') {
    return (
      <Row>
        <Col>
          <Card className="shadow-sm border-0">
            <CardHeader className="bg-white border-bottom">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0 fw-bold">Listas de Útiles</h5>
                <div className="d-flex gap-2">
                  <Button 
                    variant={mostrarTodos ? "warning" : "outline-secondary"}
                    onClick={async () => {
                      const nuevoValor = !mostrarTodos
                      console.log(`[ListasListing] 🔄 Cambiando modo a: ${nuevoValor ? 'MOSTRAR TODOS' : 'SOLO CON PDFs'}`)
                      setMostrarTodos(nuevoValor)
                      
                      // Limpiar caché primero
                      try {
                        await fetch('/api/crm/listas/por-colegio?cache=false')
                        console.log('[ListasListing] ✅ Caché limpiado')
                      } catch (e) {
                        console.warn('[ListasListing] ⚠️ Error al limpiar caché:', e)
                      }
                      
                      // Recargar datos inmediatamente con el nuevo modo
                      await cargarDatos(nuevoValor)
                    }}
                    title={mostrarTodos ? "Mostrando TODOS los cursos (incluidos sin PDFs)" : "Mostrando solo cursos con PDFs"}
                    disabled={loading}
                  >
                    {loading ? '⏳ Cargando...' : (mostrarTodos ? '🔓 Ver Todos' : '🔒 Solo con PDFs')}
                  </Button>
                  <Button variant="outline-primary" onClick={cargarDatos}>
                    <LuRefreshCw className="me-2" size={16} />
                    Actualizar
                  </Button>
                  <Button variant="outline-success" onClick={() => setShowImportCompletaModal(true)}>
                    <LuUpload className="me-2" size={16} />
                    Importación Completa (Plantilla)
                  </Button>
                </div>
              </div>

              {/* Filtros Colegios */}
              <Row className="g-3 align-items-end">
                <Col lg={3} md={6}>
                  <Form.Label className="small text-muted mb-1">Buscar</Form.Label>
                  <InputGroup>
                    <InputGroup.Text className="bg-light border-end-0">
                      <LuSearch size={14} />
                    </InputGroup.Text>
                    <Form.Control
                      placeholder="Nombre del colegio..."
                      value={busquedaColegio}
                      onChange={(e) => setBusquedaColegio(e.target.value)}
                      className="border-start-0"
                    />
                  </InputGroup>
                </Col>
                <Col lg={2} md={4}>
                  <Form.Label className="small text-muted mb-1">Región</Form.Label>
                  <Form.Select 
                    value={filtroRegionColegio} 
                    onChange={(e) => {
                      setFiltroRegionColegio(e.target.value)
                      setFiltroComunaColegio('')
                    }}
                  >
                    <option value="">Todas las Regiones</option>
                    {regionesUnicas.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </Form.Select>
                </Col>
                <Col lg={2} md={4}>
                  <Form.Label className="small text-muted mb-1">Comuna</Form.Label>
                  <Form.Select value={filtroComunaColegio} onChange={(e) => setFiltroComunaColegio(e.target.value)}>
                    <option value="">Todas las Comunas</option>
                    {comunasUnicasColegios.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </Form.Select>
                </Col>
                <Col lg={1} md={2}>
                  <Form.Label className="small text-muted mb-1">Mostrar</Form.Label>
                  <Form.Select 
                    value={paginationColegios.pageSize} 
                    onChange={(e) => setPaginationColegios({ ...paginationColegios, pageSize: parseInt(e.target.value) })}
                  >
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </Form.Select>
                </Col>
                <Col lg={2} md={4}>
                  <Form.Label className="small text-muted mb-1">&nbsp;</Form.Label>
                  <Button variant="outline-secondary" onClick={limpiarFiltrosColegios} className="w-100">
                    <LuRefreshCw size={14} className="me-1" />
                    Limpiar filtros
                  </Button>
                </Col>
              </Row>

              <div className="mt-2 text-muted small">
                Mostrando <strong>{colegiosFiltrados.length}</strong> de <strong>{colegiosData.length}</strong> colegios con listas
              </div>
            </CardHeader>

            <CardBody className="p-0">
              {error && <div className="alert alert-danger m-3">{error}</div>}

              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Cargando...</span>
                  </div>
                  <p className="mt-2 text-muted">Cargando colegios...</p>
                </div>
              ) : colegiosFiltrados.length === 0 ? (
                <div className="text-center py-5">
                  <LuFileText size={48} className="text-muted mb-3" />
                  <h6>No se encontraron colegios con listas</h6>
                  <p className="text-muted">Ajusta los filtros o importa nuevas listas</p>
                </div>
              ) : (
                <DataTable table={tableColegios} />
              )}
            </CardBody>

            {colegiosFiltrados.length > 0 && (
              <div className="card-footer bg-white border-top">
                <TablePagination table={tableColegios} />
              </div>
            )}
          </Card>

          <ImportacionCompletaModal
            show={showImportCompletaModal}
            onHide={() => {
              setShowImportCompletaModal(false)
              // Refrescar datos después de cerrar el modal (con un pequeño delay para que Strapi procese)
              setTimeout(() => {
                cargarDatos()
              }, 2000)
            }}
            onSuccess={() => {
              setShowImportCompletaModal(false)
              // Forzar recarga sin caché después de importar
              console.log('[ListasListing] 🔄 Importación exitosa, limpiando caché y recargando datos...')
              
              // Limpiar caché primero
              fetch('/api/crm/listas/por-colegio?cache=false')
                .then(() => {
                  console.log('[ListasListing] ✅ Caché limpiado, recargando datos en 2 segundos...')
                  // Esperar un poco para que Strapi termine de procesar
                  setTimeout(() => {
                    cargarDatos()
                  }, 2000)
                })
                .catch(err => {
                  console.error('[ListasListing] ⚠️ Error al limpiar caché, recargando igualmente:', err)
                  setTimeout(() => {
                    cargarDatos()
                  }, 2000)
                })
            }}
          />
        </Col>
      </Row>
    )
  }

  // ============ VISTA DE LISTAS (de un colegio específico) ============
  return (
    <Row>
      <Col>
        <Card className="shadow-sm border-0">
          <CardHeader className="bg-white border-bottom">
            {/* Botón volver y título */}
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div className="d-flex align-items-center gap-3">
                <Button variant="outline-secondary" size="sm" onClick={volverAColegios}>
                  <LuChevronLeft size={16} className="me-1" />
                  Volver
                </Button>
                <div>
                  <h5 className="mb-0 fw-bold">
                    {colegioSeleccionado?.nombre}
                  </h5>
                  <small className="text-muted">
                    {colegioSeleccionado?.comuna}{colegioSeleccionado?.region ? ` - ${colegioSeleccionado.region}` : ''} 
                    {colegioSeleccionado?.rbd ? ` | RBD: ${colegioSeleccionado.rbd}` : ''}
                  </small>
                </div>
              </div>
              <Badge bg="primary" className="px-3 py-2">
                {listasFiltradas.length} listas
              </Badge>
            </div>

            {/* Filtros Listas */}
            <Row className="g-3 align-items-end">
              <Col lg={3} md={6}>
                <Form.Label className="small text-muted mb-1">Buscar</Form.Label>
                <InputGroup>
                  <InputGroup.Text className="bg-light border-end-0">
                    <LuSearch size={14} />
                  </InputGroup.Text>
                  <Form.Control
                    placeholder="Buscar lista..."
                    value={busquedaLista}
                    onChange={(e) => setBusquedaLista(e.target.value)}
                    className="border-start-0"
                  />
                </InputGroup>
              </Col>
              <Col lg={2} md={4}>
                <Form.Label className="small text-muted mb-1">Nivel</Form.Label>
                <Form.Select value={filtroNivel} onChange={(e) => setFiltroNivel(e.target.value)}>
                  <option value="">Todos los Niveles</option>
                  <option value="Basica">Básica</option>
                  <option value="Media">Media</option>
                </Form.Select>
              </Col>
              <Col lg={2} md={4}>
                <Form.Label className="small text-muted mb-1">Año</Form.Label>
                <Form.Select value={filtroAño} onChange={(e) => setFiltroAño(e.target.value)}>
                  <option value="">Todos los Años</option>
                  <option value="2027">2027</option>
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                </Form.Select>
              </Col>
              <Col lg={1} md={2}>
                <Form.Label className="small text-muted mb-1">Mostrar</Form.Label>
                <Form.Select 
                  value={paginationListas.pageSize} 
                  onChange={(e) => setPaginationListas({ ...paginationListas, pageSize: parseInt(e.target.value) })}
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                </Form.Select>
              </Col>
              <Col lg={2} md={4}>
                <Form.Label className="small text-muted mb-1">&nbsp;</Form.Label>
                <Button variant="outline-secondary" onClick={limpiarFiltrosListas} className="w-100">
                  <LuRefreshCw size={14} className="me-1" />
                  Limpiar filtros
                </Button>
              </Col>
            </Row>
          </CardHeader>

          <CardBody className="p-0">
            {listasFiltradas.length === 0 ? (
              <div className="text-center py-5">
                <LuFileText size={48} className="text-muted mb-3" />
                <h6>No se encontraron listas</h6>
                <p className="text-muted">Ajusta los filtros</p>
              </div>
            ) : (
              <DataTable table={tableListas} />
            )}
          </CardBody>

          {listasFiltradas.length > 0 && (
            <div className="card-footer bg-white border-top">
              <TablePagination table={tableListas} />
            </div>
          )}
        </Card>

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
            onSuccess={() => cargarDatos()}
          />
        )}
      </Col>
    </Row>
  )
}
