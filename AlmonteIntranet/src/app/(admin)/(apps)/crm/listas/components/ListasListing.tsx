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
import { Button, Card, CardFooter, CardHeader, Col, Row, Alert, Badge } from 'react-bootstrap'
import { LuSearch, LuFileText, LuDownload, LuEye, LuPlus, LuUpload, LuRefreshCw, LuFileCode } from 'react-icons/lu'
import { exportarListasColegioAExcel } from '@/helpers/excel'
import { TbEdit, TbTrash } from 'react-icons/tb'

import DataTable from '@/components/table/DataTable'
import DeleteConfirmationModal from '@/components/table/DeleteConfirmationModal'
import TablePagination from '@/components/table/TablePagination'
import ListaModal from './ListaModal'
import ImportacionMasivaModal from './ImportacionMasivaModal'
import ImportacionMasivaPDFsModal from './ImportacionMasivaPDFsModal'
import ImportacionMasivaColegiosModal from './ImportacionMasivaColegiosModal'
import ImportacionCompletaModal from './ImportacionCompletaModal'
import GestionarVersionesModal from './GestionarVersionesModal'

interface ListaType {
  id: number | string
  documentId?: string
  nombre: string
  nivel: 'Basica' | 'Media'
  grado: number
  año?: number
  descripcion?: string
  activo: boolean
  pdf_id?: number | string
  pdf_url?: string
  pdf_nombre?: string
  colegio?: {
    id: number | string
    nombre: string
    rbd?: string | number
    direccion?: string
    comuna?: string
    region?: string
    telefono?: string
  }
  curso?: {
    id: number | string
    nombre: string
  }
  materiales?: any[]
  createdAt?: string
  updatedAt?: string
  versiones?: number
  cantidadPDFs?: number
  cursosAgrupados?: (string | number)[] // IDs de cursos que fueron agrupados
}

const columnHelper = createColumnHelper<ListaType>()

interface ListasListingProps {
  listas: any[]
  error: string | null
}

export default function ListasListing({ listas: listasProp, error }: ListasListingProps) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [editingLista, setEditingLista] = useState<ListaType | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedListaId, setSelectedListaId] = useState<string | number | null>(null)
  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showImportColegiosModal, setShowImportColegiosModal] = useState(false)
  const [showImportCompletaModal, setShowImportCompletaModal] = useState(false)
  const [showImportPDFsModal, setShowImportPDFsModal] = useState(false)
  const [exportando, setExportando] = useState(false)
  const [showGestionarVersionesModal, setShowGestionarVersionesModal] = useState(false)
  const [cursoParaGestionar, setCursoParaGestionar] = useState<{ id: string | number; nombre: string; colegioNombre?: string } | null>(null)

  // Los datos ya vienen transformados desde la API /api/crm/listas
  const mappedListas = useMemo(() => {
    if (!listasProp || !Array.isArray(listasProp)) return []
    
    // 🔍 LOG DIAGNÓSTICO: Resumen de listas recibidas
    const listasConRBD = listasProp.filter((l: any) => l.colegio?.rbd || l.colegio?.RBD)
    const listasSinRBD = listasProp.filter((l: any) => !l.colegio?.rbd && !l.colegio?.RBD)
    console.log('[ListasListing] 📊 Resumen de listas recibidas:', {
      total: listasProp.length,
      conRBD: listasConRBD.length,
      sinRBD: listasSinRBD.length,
      rbdEjemplos: listasConRBD.slice(0, 5).map((l: any) => ({
        curso: l.nombre,
        colegio: l.colegio?.nombre,
        rbd: l.colegio?.rbd || l.colegio?.RBD,
      })),
    })
    
    // Agrupar cursos por colegio + grado + nivel + año
    // Esto evita duplicados como "1º Basica A", "1º Basica B" - solo muestra "1º Básico"
    const gruposMap = new Map<string, any[]>()
    
    listasProp.forEach((lista: any) => {
      // Normalizar colegio ID - usar RBD si está disponible (más confiable), sino ID
      let colegioId = lista.colegio?.rbd || lista.colegio?.RBD
      if (!colegioId) {
        colegioId = lista.colegio?.id || 'sin-colegio'
      }
      // Convertir a string para consistencia
      colegioId = String(colegioId)
      
      // Normalizar grado - extraer número del nombre si no está en grado
      let grado = lista.grado
      if (!grado || grado === 0 || isNaN(parseInt(String(grado)))) {
        // Intentar extraer del nombre del curso (ej: "1º Basica A" -> 1)
        const nombreMatch = (lista.nombre || '').match(/(\d+)/)
        if (nombreMatch) {
          grado = parseInt(nombreMatch[1])
        } else {
          // Intentar extraer del nombre del curso si está en formato diferente
          const nombreCurso = lista.curso?.nombre || lista.nombre || ''
          const matchCurso = nombreCurso.match(/(\d+)/)
          if (matchCurso) {
            grado = parseInt(matchCurso[1])
          } else {
            grado = 1
          }
        }
      } else {
        grado = parseInt(String(grado))
      }
      
      // Normalizar nivel - extraer de nombre si no está disponible
      let nivel = lista.nivel || 'Basica'
      if (!nivel || nivel === '') {
        // Intentar extraer del nombre
        const nombreLower = (lista.nombre || '').toLowerCase()
        if (nombreLower.includes('media')) {
          nivel = 'Media'
        } else {
          nivel = 'Basica'
        }
      } else if (typeof nivel === 'string') {
        nivel = nivel.toLowerCase()
        if (nivel.includes('media')) {
          nivel = 'Media'
        } else {
          nivel = 'Basica'
        }
      }
      
      // Normalizar año
      let año = lista.año || lista.ano
      if (!año) {
        año = new Date().getFullYear()
      } else {
        año = parseInt(String(año)) || new Date().getFullYear()
      }
      
      // Crear clave única para agrupar (usar valores normalizados)
      const claveGrupo = `${colegioId}-${grado}-${nivel}-${año}`
      
      if (!gruposMap.has(claveGrupo)) {
        gruposMap.set(claveGrupo, [])
      }
      gruposMap.get(claveGrupo)!.push(lista)
      
      // Log para debugging (solo primeros 5)
      if (listasProp.indexOf(lista) < 5) {
        console.log('[ListasListing] 🔍 Agrupando curso:', {
          nombre: lista.nombre,
          colegioId: colegioId,
          grado: grado,
          nivel: nivel,
          año: año,
          claveGrupo: claveGrupo,
        })
      }
    })
    
    // Procesar cada grupo y combinar versiones
    const listasAgrupadas: any[] = []
    
    console.log('[ListasListing] 📊 Agrupando cursos:', {
      totalCursos: listasProp.length,
      totalGrupos: gruposMap.size,
      grupos: Array.from(gruposMap.entries()).map(([clave, cursos]) => ({
        clave,
        cantidad: cursos.length,
        nombres: cursos.map((c: any) => c.nombre),
        colegio: cursos[0]?.colegio?.nombre,
        grado: cursos[0]?.grado,
        nivel: cursos[0]?.nivel,
      })),
    })
    
    gruposMap.forEach((cursosDelGrupo: any[], claveGrupo: string) => {
      // Usar el primer curso como base
      const cursoBase = cursosDelGrupo[0]
      
      if (cursosDelGrupo.length > 1) {
        console.log(`[ListasListing] 🔗 Agrupando ${cursosDelGrupo.length} cursos en uno:`, {
          clave: claveGrupo,
          cursos: cursosDelGrupo.map((c: any) => c.nombre || c.curso?.nombre),
          colegio: cursoBase.colegio?.nombre,
          grado: cursoBase.grado,
          nivel: cursoBase.nivel,
        })
      }
      const rbdFinal = cursoBase.colegio?.rbd || cursoBase.colegio?.RBD || undefined
      
      // Combinar todas las versiones_materiales de todos los cursos del grupo
      const todasLasVersiones: any[] = []
      cursosDelGrupo.forEach((curso: any) => {
        const versiones = curso.versiones_materiales || []
        todasLasVersiones.push(...versiones)
      })
      
      // Eliminar versiones duplicadas (mismo pdf_id o misma fecha + nombre)
      const versionesUnicas = todasLasVersiones.filter((version, index, self) => {
        return index === self.findIndex((v) => {
          // Si tienen pdf_id, comparar por pdf_id
          if (version.pdf_id && v.pdf_id) {
            return v.pdf_id === version.pdf_id
          }
          // Si no, comparar por fecha y nombre
          const fechaVersion = version.fecha_subida || version.fecha_actualizacion
          const fechaV = v.fecha_subida || v.fecha_actualizacion
          const nombreVersion = version.nombre_archivo || version.metadata?.nombre
          const nombreV = v.nombre_archivo || v.metadata?.nombre
          return fechaVersion === fechaV && nombreVersion === nombreV
        })
      })
      
      // Extraer pdf_id y pdf_url de la versión más reciente
      let pdf_id: number | undefined = undefined
      let pdf_url: string | undefined = undefined
      let pdf_nombre: string | undefined = undefined
      
      // Contar versiones con PDF (solo las que tienen pdf_id o pdf_url)
      const versionesConPDF = versionesUnicas.filter((v: any) => v.pdf_id || v.pdf_url)
      const cantidadPDFs = versionesConPDF.length
      
      // Buscar la última versión con PDF (la más reciente)
      if (versionesUnicas.length > 0) {
        // Ordenar por fecha_subida descendente para obtener la más reciente
        const versionesOrdenadas = [...versionesUnicas].sort((a: any, b: any) => {
          const fechaA = a.fecha_subida ? new Date(a.fecha_subida).getTime() : 0
          const fechaB = b.fecha_subida ? new Date(b.fecha_subida).getTime() : 0
          return fechaB - fechaA
        })
        
        // Buscar la primera versión que tenga pdf_id o pdf_url
        for (const version of versionesOrdenadas) {
          if (version.pdf_id || version.pdf_url) {
            pdf_id = version.pdf_id || undefined
            pdf_url = version.pdf_url || undefined
            pdf_nombre = version.nombre_archivo || undefined
            break
          }
        }
      }
      
      // Si no se encontró en versiones_materiales, usar los valores directos del curso base
      if (!pdf_id && !pdf_url) {
        pdf_id = cursoBase.pdf_id || undefined
        pdf_url = cursoBase.pdf_url || undefined
        pdf_nombre = cursoBase.pdf_nombre || undefined
      }
      
      // Crear nombre simplificado del curso (solo grado + nivel, sin letra)
      const nombreSimplificado = `${cursoBase.grado || 1}º ${cursoBase.nivel === 'Media' ? 'Media' : 'Básico'}`
      
      listasAgrupadas.push({
        id: cursoBase.id || cursoBase.documentId,
        documentId: cursoBase.documentId || String(cursoBase.id || ''),
        nombre: nombreSimplificado,
        nivel: cursoBase.nivel || 'Basica',
        grado: cursoBase.grado || 1,
        año: cursoBase.año || cursoBase.ano || new Date().getFullYear(),
        descripcion: cursoBase.descripcion || '',
        activo: cursoBase.activo !== false,
        pdf_id: pdf_id,
        pdf_url: pdf_url,
        pdf_nombre: pdf_nombre,
        colegio: cursoBase.colegio ? {
          ...cursoBase.colegio,
          rbd: rbdFinal,
        } : undefined,
        curso: {
          id: cursoBase.id || cursoBase.documentId,
          nombre: nombreSimplificado,
        },
        materiales: cursoBase.materiales || [],
        createdAt: cursoBase.createdAt || null,
        updatedAt: cursoBase.updatedAt || null,
        versiones: versionesUnicas.length || 0,
        cantidadPDFs: cantidadPDFs,
        // Guardar todos los IDs de cursos agrupados para poder gestionarlos
        cursosAgrupados: cursosDelGrupo.map((c: any) => c.id || c.documentId),
      } as ListaType)
    })
    
    return listasAgrupadas
  }, [listasProp])

  const columns: ColumnDef<ListaType, any>[] = [
    {
      id: 'select',
      maxSize: 45,
      size: 45,
      header: ({ table }: { table: TableType<ListaType> }) => (
        <input
          type="checkbox"
          className="form-check-input form-check-input-light fs-14"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row }: { row: TableRow<ListaType> }) => (
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
      id: 'nombre',
      header: 'Nombre',
      accessorKey: 'nombre',
      enableSorting: true,
      cell: ({ row }) => (
        <div>
          <h6 className="mb-0">{row.original.nombre || 'Sin nombre'}</h6>
          {row.original.descripcion && (
            <small className="text-muted">{row.original.descripcion}</small>
          )}
        </div>
      ),
    },
    {
      id: 'nivel',
      header: 'Nivel',
      accessorKey: 'nivel',
      enableSorting: true,
      enableColumnFilter: true,
      cell: ({ row }) => (
        <Badge bg={row.original.nivel === 'Basica' ? 'primary' : 'info'}>
          {row.original.nivel}
        </Badge>
      ),
    },
    {
      id: 'grado',
      header: 'Grado',
      accessorKey: 'grado',
      enableSorting: true,
      cell: ({ row }) => `${row.original.grado}°`,
    },
    {
      id: 'año',
      header: 'Año',
      accessorKey: 'año',
      enableSorting: true,
      enableColumnFilter: true,
      filterFn: 'equalsString',
      cell: ({ row }) => row.original.año || '-',
    },
    {
      id: 'colegio',
      header: 'Colegio',
      accessorFn: (row) => row.colegio?.nombre || '',
      enableSorting: true,
      enableColumnFilter: true,
      filterFn: 'includesString',
      cell: ({ row }) => {
        const colegio = row.original.colegio
        if (!colegio) return '-'
        return (
          <div>
            <div className="fw-semibold">{colegio.nombre || '-'}</div>
            {colegio.direccion && (
              <small className="text-muted d-block">
                <span className="me-1">📍</span>
                {colegio.direccion}
              </small>
            )}
            {(colegio.comuna || colegio.region) && (
              <small className="text-muted d-block">
                {colegio.comuna && colegio.region 
                  ? `${colegio.comuna}, ${colegio.region}`
                  : colegio.comuna || colegio.region}
              </small>
            )}
            {colegio.telefono && (
              <small className="text-muted d-block">
                <span className="me-1">📞</span>
                {colegio.telefono}
              </small>
            )}
            {colegio.rbd && (
              <small className="text-muted d-block">
                <span className="me-1">🔢</span>
                RBD: {colegio.rbd}
              </small>
            )}
          </div>
        )
      },
    },
    {
      id: 'curso',
      header: 'Curso',
      cell: ({ row }) => {
        const nombre = row.original.curso?.nombre || row.original.nombre || '-'
        // Priorizar documentId si existe, sino usar id numérico
        const listaId = row.original.documentId || row.original.id
        
        console.log('[ListasListing] Curso clickeado:', {
          nombre,
          id: row.original.id,
          documentId: row.original.documentId,
          listaIdUsado: listaId,
          rowOriginal: row.original
        })
        
        if (!listaId) {
          console.warn('[ListasListing] ⚠️ No hay ID disponible para el curso:', nombre)
          return <span>{nombre}</span>
        }
        
        return (
          <Link 
            href={`/crm/listas/${listaId}/validacion`}
            className="link-reset fw-semibold"
            style={{ 
              cursor: 'pointer',
              color: '#667eea',
              textDecoration: 'none'
            }}
            onClick={(e) => {
              console.log('[ListasListing] Navegando a validación con ID:', listaId)
              // Permitir que el clic navegue normalmente
              e.stopPropagation()
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.textDecoration = 'underline'
              e.currentTarget.style.color = '#764ba2'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.textDecoration = 'none'
              e.currentTarget.style.color = '#667eea'
            }}
          >
            {nombre}
          </Link>
        )
      },
    },
    {
      id: 'pdf',
      header: 'PDF',
      cell: ({ row }) => {
        if (row.original.pdf_id) {
          return (
            <Badge bg="success">
              <LuFileText className="me-1" size={14} />
              Disponible
            </Badge>
          )
        }
        return <Badge bg="secondary">Sin PDF</Badge>
      },
    },
    {
      id: 'cantidadPDFs',
      header: 'Cantidad de Listas',
      enableSorting: true,
      cell: ({ row }) => {
        const cantidad = row.original.cantidadPDFs || 0
        if (cantidad === 0) {
          return (
            <Badge bg="secondary" className="d-flex align-items-center" style={{ width: 'fit-content', gap: '4px' }}>
              <LuFileText size={14} />
              <span>0</span>
            </Badge>
          )
        }
        return (
          <Badge bg="info" className="d-flex align-items-center" style={{ width: 'fit-content', gap: '4px' }}>
            <LuFileText size={14} />
            <span className="fw-bold">{cantidad}</span>
            <span className="opacity-75" style={{ fontSize: '0.85em' }}>
              {cantidad === 1 ? 'PDF' : 'PDFs'}
            </span>
          </Badge>
        )
      },
    },
    {
      id: 'activo',
      header: 'Estado',
      accessorKey: 'activo',
      enableSorting: true,
      enableColumnFilter: true,
      cell: ({ row }) => (
        <Badge bg={row.original.activo ? 'success' : 'secondary'}>
          {row.original.activo ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      id: 'fechas',
      header: 'Fechas',
      enableSorting: true,
      accessorFn: (row) => row.updatedAt || row.createdAt || '',
      cell: ({ row }) => {
        const updatedAt = row.original.updatedAt
        const createdAt = row.original.createdAt
        
        const formatDate = (dateStr: string | null | undefined) => {
          if (!dateStr) return '-'
          try {
            const date = new Date(dateStr)
            return date.toLocaleDateString('es-CL', { 
              day: '2-digit', 
              month: '2-digit', 
              year: 'numeric' 
            })
          } catch {
            return '-'
          }
        }
        
        return (
          <div className="small">
            {updatedAt && (
              <div>
                <span className="text-muted">Mod:</span> {formatDate(updatedAt)}
              </div>
            )}
            {createdAt && (
              <div>
                <span className="text-muted">Creado:</span> {formatDate(createdAt)}
              </div>
            )}
            {!updatedAt && !createdAt && '-'}
          </div>
        )
      },
    },
    {
      id: 'acciones',
      header: 'Acciones',
      cell: ({ row }) => {
        const listaId = row.original.documentId || row.original.id
        const cursoNombre = row.original.nombre || 'Sin nombre'
        const colegioNombre = row.original.colegio?.nombre
        
        return (
          <div className="d-flex gap-1">
            <Button
              variant="outline-info"
              size="sm"
              className="btn-icon rounded-circle"
              onClick={() => {
                setCursoParaGestionar({
                  id: listaId,
                  nombre: cursoNombre,
                  colegioNombre: colegioNombre,
                })
                setShowGestionarVersionesModal(true)
              }}
              title="Gestionar listas (agregar/eliminar PDFs)"
            >
              <LuFileText className="fs-lg" />
            </Button>
            {row.original.pdf_id && (
              <>
                <Link href={`/crm/listas/${listaId}/validacion`}>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    className="btn-icon rounded-circle"
                    title="Ver detalle y validación"
                  >
                    <LuEye className="fs-lg" />
                  </Button>
                </Link>
                <Button
                  variant="outline-success"
                  size="sm"
                  className="btn-icon rounded-circle"
                  onClick={() => {
                    const pdfUrl = `/api/crm/cursos/pdf/${row.original.pdf_id}`
                    const link = document.createElement('a')
                    link.href = pdfUrl
                    link.download = row.original.pdf_nombre || `${row.original.nombre}.pdf`
                    link.target = '_blank'
                    document.body.appendChild(link)
                    link.click()
                    document.body.removeChild(link)
                  }}
                  title="Descargar PDF"
                >
                  <LuDownload className="fs-lg" />
                </Button>
              </>
            )}
            <Button
              variant="outline-primary"
              size="sm"
              className="btn-icon rounded-circle"
              onClick={() => {
                setEditingLista(row.original)
                setShowModal(true)
              }}
              title="Editar"
            >
              <TbEdit className="fs-lg" />
            </Button>
            <Button
              variant="outline-danger"
              size="sm"
              className="btn-icon rounded-circle"
              onClick={() => {
                setSelectedRowIds({}) // Limpiar selección múltiple
                setSelectedListaId(row.original.id)
                setShowDeleteModal(true)
              }}
              title="Eliminar"
            >
              <TbTrash className="fs-lg" />
            </Button>
          </div>
        )
      },
    },
  ]

  const [data, setData] = useState<ListaType[]>([])

  // Verificar si debemos abrir el modal automáticamente al restaurar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const shouldRestore = localStorage.getItem('importacion-completa-restore-modal') === 'true'
      if (shouldRestore) {
        setShowImportCompletaModal(true)
        localStorage.removeItem('importacion-completa-restore-modal')
      }
    }
  }, [])
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'año', desc: true },
  ])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })

  useEffect(() => {
    setData(mappedListas)
  }, [mappedListas])

  // Función de filtro global personalizada que busca en nombre, colegio.nombre y colegio.rbd
  const globalFilterFn = (row: any, columnId: string, filterValue: string) => {
    if (!filterValue) return true
    
    // Normalizar el valor de búsqueda: eliminar espacios y convertir a minúsculas
    const searchValue = String(filterValue).toLowerCase().trim().replace(/\s+/g, '')
    
    if (!searchValue) return true
    
    // 🔍 LOG DIAGNÓSTICO: Datos de la fila
    const cursoId = row.original.id || row.original.documentId
    const cursoNombre = row.original.nombre || 'Sin nombre'
    const colegioNombre = row.original.colegio?.nombre || 'Sin colegio'
    const rbd = row.original.colegio?.rbd
    
    // Buscar en nombre de la lista (normalizado)
    const nombre = String(row.original.nombre || '').toLowerCase().trim().replace(/\s+/g, '')
    if (nombre.includes(searchValue)) {
      console.log(`[ListasListing] ✅ Match por nombre de lista: "${cursoNombre}" (ID: ${cursoId})`)
      return true
    }
    
    // Buscar en nombre del colegio (normalizado)
    const colegioNombreNormalizado = String(row.original.colegio?.nombre || '').toLowerCase().trim().replace(/\s+/g, '')
    if (colegioNombreNormalizado.includes(searchValue)) {
      console.log(`[ListasListing] ✅ Match por nombre de colegio: "${colegioNombre}" (ID: ${cursoId})`)
      return true
    }
    
    // Buscar en RBD del colegio (normalizado, sin espacios)
    if (rbd !== undefined && rbd !== null) {
      // Convertir a string, eliminar espacios y convertir a minúsculas
      const rbdStr = String(rbd).trim().replace(/\s+/g, '').toLowerCase()
      const rbdNum = String(rbd).trim().replace(/\s+/g, '')
      
      // 🔍 LOG DIAGNÓSTICO: Comparación de RBD
      const matchExacto = rbdStr === searchValue
      const matchParcial = rbdStr.includes(searchValue)
      const matchNumero = rbdNum === searchValue || rbdNum.includes(searchValue)
      
      if (matchExacto || matchParcial || matchNumero) {
        console.log(`[ListasListing] ✅ Match por RBD: "${rbd}" (ID: ${cursoId}, Curso: ${cursoNombre}, Colegio: ${colegioNombre})`, {
          rbdOriginal: rbd,
          rbdTipo: typeof rbd,
          rbdStr: rbdStr,
          rbdNum: rbdNum,
          searchValue: searchValue,
          matchExacto,
          matchParcial,
          matchNumero,
        })
        return true
      } else {
        // Solo loggear si es numérico (probable búsqueda por RBD)
        if (/^\d+$/.test(searchValue)) {
          console.log(`[ListasListing] ❌ No match por RBD: "${rbd}" vs "${searchValue}" (ID: ${cursoId})`, {
            rbdOriginal: rbd,
            rbdTipo: typeof rbd,
            rbdStr: rbdStr,
            rbdNum: rbdNum,
            searchValue: searchValue,
          })
        }
      }
    } else {
      // 🔍 LOG DIAGNÓSTICO: RBD no disponible (solo si la búsqueda es numérica, probable RBD)
      if (/^\d+$/.test(searchValue)) {
        console.log(`[ListasListing] ⚠️ RBD no disponible para curso ${cursoId}:`, {
          cursoNombre: cursoNombre,
          colegioNombre: colegioNombre,
          tieneColegio: !!row.original.colegio,
          colegioKeys: row.original.colegio ? Object.keys(row.original.colegio) : [],
          searchValue: searchValue,
        })
      }
    }
    
    // Buscar en nombre del curso (normalizado)
    const cursoNombreNormalizado = String(row.original.curso?.nombre || '').toLowerCase().trim().replace(/\s+/g, '')
    if (cursoNombreNormalizado.includes(searchValue)) {
      console.log(`[ListasListing] ✅ Match por nombre de curso: "${row.original.curso?.nombre}" (ID: ${cursoId})`)
      return true
    }
    
    return false
  }

  const table = useReactTable<ListaType>({
    data,
    columns,
    getRowId: (row) => String(row.id || row.documentId || Math.random()), // Usar el ID real de la fila
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
    globalFilterFn: globalFilterFn as any,
    enableColumnFilters: true,
    enableRowSelection: true,
  })

  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const totalItems = table.getFilteredRowModel().rows.length

  const start = pageIndex * pageSize + 1
  const end = Math.min(start + pageSize - 1, totalItems)

  const handleDelete = async () => {
    // Obtener IDs seleccionados (puede ser uno solo o múltiples)
    const selectedIds: (string | number)[] = []
    
    if (selectedListaId) {
      // Eliminación individual (desde el botón de eliminar de una fila)
      selectedIds.push(selectedListaId)
    } else {
      // Eliminación múltiple (desde checkboxes)
      const selectedRows = table.getSelectedRowModel().rows
      console.log('[ListasListing] Filas seleccionadas en modelo:', selectedRows.length)
      console.log('[ListasListing] selectedRowIds:', selectedRowIds)
      console.log('[ListasListing] Total filas en tabla:', table.getRowModel().rows.length)
      
      if (selectedRows.length > 0) {
        // Usar las filas seleccionadas del modelo
        selectedIds.push(...selectedRows.map(row => row.original.id))
        console.log('[ListasListing] IDs desde getSelectedRowModel:', selectedIds)
      } else {
        // Si no hay filas en el modelo, usar selectedRowIds directamente
        const rowIds = Object.keys(selectedRowIds).filter(key => selectedRowIds[key])
        console.log('[ListasListing] Usando selectedRowIds directamente:', rowIds)
        
        // Buscar los IDs reales de los datos usando los IDs de fila
        rowIds.forEach((rowId) => {
          const row = table.getRowModel().rows.find(r => String(r.id) === String(rowId))
          if (row && row.original) {
            selectedIds.push(row.original.id)
            console.log('[ListasListing] ID encontrado:', row.original.id, 'para rowId:', rowId)
          } else {
            console.warn('[ListasListing] No se encontró fila para rowId:', rowId)
          }
        })
      }
    }

    console.log('[ListasListing] IDs a eliminar:', selectedIds)

    if (selectedIds.length === 0) {
      alert('No hay cursos seleccionados para eliminar')
      setShowDeleteModal(false)
      return
    }

    setLoading(true)
    try {
      console.log('[ListasListing] Eliminando curso(s):', selectedIds)
      
      // Eliminar cada curso secuencialmente para evitar problemas
      const results: Array<{ id: string | number; success: boolean; error?: string }> = []
      
      for (const id of selectedIds) {
        try {
          // Usar documentId si está disponible, sino usar id numérico
          const row = data.find(r => r.id === id || r.documentId === id || String(r.id) === String(id) || String(r.documentId) === String(id))
          const idParaEliminar = row?.documentId || row?.id || id
          
          console.log('[ListasListing] 🗑️ Eliminando curso:', {
            idOriginal: id,
            idParaEliminar: idParaEliminar,
            tieneDocumentId: !!row?.documentId,
            nombre: row?.nombre
          })
          
          const response = await fetch(`/api/crm/listas/${idParaEliminar}`, {
            method: 'DELETE',
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache',
            },
          })
          
          if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
          }
          
          const result = await response.json()
          console.log('[ListasListing] ✅ Resultado eliminación:', { 
            idOriginal: id,
            idParaEliminar: idParaEliminar,
            success: result.success, 
            error: result.error,
            message: result.message 
          })
          
          if (!result.success) {
            throw new Error(result.error || 'Error desconocido al eliminar')
          }
          
          results.push({ id: idParaEliminar, success: true, error: undefined })
        } catch (err: any) {
          console.error('[ListasListing] ❌ Error al eliminar curso:', id, err)
          results.push({ id, success: false, error: err.message || 'Error desconocido' })
        }
      }

      const successful = results.filter(r => r.success)
      const failed = results.filter(r => !r.success)

      console.log('[ListasListing] Resultados de eliminación:', { 
        total: results.length,
        successful: successful.length, 
        failed: failed.length,
        successfulIds: successful.map(r => r.id),
        failedIds: failed.map(r => r.id)
      })

      if (successful.length > 0) {
        // Limpiar selección primero
        setSelectedRowIds({})
        setSelectedListaId(null)
        setShowDeleteModal(false)
        
        // Mostrar mensaje
        if (failed.length > 0) {
          alert(`${successful.length} curso(s) eliminado(s) exitosamente. ${failed.length} curso(s) fallaron: ${failed.map(f => f.error || 'Error desconocido').join(', ')}`)
        } else {
          alert(`${successful.length} curso(s) eliminado(s) exitosamente.`)
        }
        
        // Recargar datos desde la API PRIMERO (antes de actualizar estado local)
        try {
          console.log('[ListasListing] 🔄 Recargando datos desde la API después de eliminar...')
          console.log('[ListasListing] IDs eliminados exitosamente:', successful.map(r => r.id))
          
          // Esperar un momento para que Strapi procese la eliminación completamente
          // Aumentar el tiempo de espera para asegurar que la eliminación se haya propagado
          console.log('[ListasListing] ⏳ Esperando 1 segundo para que Strapi procese la eliminación...')
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          // Agregar timestamp para evitar caché
          const timestamp = Date.now()
          const response = await fetch(`/api/crm/listas?_t=${timestamp}`, {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache',
            },
          })
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          
          const result = await response.json()
          console.log('[ListasListing] Respuesta de API:', { 
            success: result.success, 
            count: result.data?.length || 0,
            data: result.data 
          })
          
          if (result.success && Array.isArray(result.data)) {
            const nuevasListas = result.data.map((lista: any) => ({
              id: lista.id || lista.documentId,
              documentId: lista.documentId || String(lista.id || ''),
              nombre: lista.nombre || '',
              nivel: lista.nivel || 'Basica',
              grado: lista.grado || 1,
              año: lista.año || lista.ano || new Date().getFullYear(),
              descripcion: lista.descripcion || '',
              activo: lista.activo !== false,
              pdf_id: lista.pdf_id || undefined,
              pdf_url: lista.pdf_url || undefined,
              pdf_nombre: lista.pdf_nombre || undefined,
              colegio: lista.colegio || undefined,
              curso: lista.curso || undefined,
              materiales: lista.materiales || [],
              createdAt: lista.createdAt || null,
              updatedAt: lista.updatedAt || null,
              versiones: lista.versiones || 0,
            } as ListaType))
            
            console.log('[ListasListing] ✅ Datos recargados desde API:', nuevasListas.length, 'cursos')
            console.log('[ListasListing] IDs en nuevos datos:', nuevasListas.map((l: ListaType) => l.id))
            console.log('[ListasListing] IDs eliminados que NO deberían aparecer:', successful.map((r: any) => r.id))
            
            // Verificar que los eliminados no estén en los nuevos datos
            const eliminadosAunPresentes = nuevasListas.filter((l: ListaType) => 
              successful.some(r => 
                r.id === l.id || 
                r.id === l.documentId || 
                String(r.id) === String(l.id) || 
                String(r.id) === String(l.documentId)
              )
            )
            
            if (eliminadosAunPresentes.length > 0) {
              console.warn('[ListasListing] ⚠️ ADVERTENCIA: Algunos cursos eliminados aún aparecen en la respuesta:', eliminadosAunPresentes.map((l: ListaType) => l.id))
            }
            
            // Actualizar estado con los nuevos datos
            setData(nuevasListas)
            console.log('[ListasListing] ✅ Estado actualizado con', nuevasListas.length, 'cursos')
            
            // Notificar cambio a otras páginas
            // Si solo se eliminó uno, pasar el ID; si son múltiples, solo el tipo
            if (successful.length === 1) {
              notificarCambio('eliminado', successful[0].id)
            } else {
              notificarCambio('eliminado') // Sin ID para múltiples eliminaciones
            }
          } else {
            console.error('[ListasListing] ❌ Respuesta de API no válida:', result)
            // Si la API falla, al menos remover los eliminados del estado local
            setData((old) => {
              const nuevos = old.filter((l) => !successful.some(r => {
                const match = r.id === l.id || r.id === l.documentId || String(r.id) === String(l.id) || String(r.id) === String(l.documentId)
                return match
              }))
              console.log('[ListasListing] Datos actualizados localmente (fallback):', old.length, '→', nuevos.length)
              return nuevos
            })
          }
        } catch (refreshError: any) {
          console.error('[ListasListing] ❌ Error al recargar datos:', refreshError)
          // Si falla la recarga, remover los eliminados del estado local como fallback
          setData((old) => {
            const nuevos = old.filter((l) => !successful.some(r => {
              const match = r.id === l.id || r.id === l.documentId || String(r.id) === String(l.id) || String(r.id) === String(l.documentId)
              return match
            }))
            console.log('[ListasListing] Datos actualizados localmente (fallback por error):', old.length, '→', nuevos.length)
            return nuevos
          })
        }
      } else {
        alert('Error al eliminar cursos: ' + (failed[0]?.error || 'Error desconocido'))
        setShowDeleteModal(false)
      }
    } catch (error: any) {
      console.error('[ListasListing] Error al eliminar curso(s):', error)
      alert('Error al eliminar curso(s): ' + error.message)
      setShowDeleteModal(false)
    } finally {
      setLoading(false)
    }
  }

  const handleModalClose = () => {
    setShowModal(false)
    setEditingLista(null)
  }

  const recargarListas = async (retryCount = 0): Promise<void> => {
    setLoading(true)
    try {
      console.log(`[ListasListing] 🔄 Recargando listas desde API... (intento ${retryCount + 1})`)
      // Usar múltiples parámetros para forzar cache busting
      const timestamp = Date.now()
      const random = Math.random()
      const response = await fetch(`/api/crm/listas?_t=${timestamp}&_r=${random}`, {
        cache: 'no-store',
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      })
      
      if (!response.ok) {
        // Intentar leer el error de la respuesta
        let errorText = ''
        try {
          errorText = await response.text()
        } catch (e) {
          errorText = 'No se pudo leer el error'
        }
        
        console.error('[ListasListing] ❌ Error HTTP al recargar listas:', {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText.substring(0, 500),
          retryCount,
        })
        
        // Si es error 500 y es el primer o segundo intento, reintentar después de 1 segundo
        if (response.status === 500 && retryCount < 2) {
          console.log(`[ListasListing] ⏳ Reintentando en 1 segundo... (intento ${retryCount + 1}/2)`)
          setTimeout(() => {
            recargarListas(retryCount + 1)
          }, 1000)
          return
        }
        
        throw new Error(`HTTP error! status: ${response.status}${errorText ? ` - ${errorText.substring(0, 200)}` : ''}`)
      }
      
      const result = await response.json()
      console.log('[ListasListing] ✅ Respuesta de API:', { 
        success: result.success, 
        count: result.data?.length || 0,
        ids: result.data?.map((l: any) => l.id || l.documentId) || [],
      })
      
      if (result.success && Array.isArray(result.data)) {
        const nuevasListas = result.data.map((lista: any) => ({
          id: lista.id || lista.documentId,
          documentId: lista.documentId || String(lista.id || ''),
          nombre: lista.nombre || '',
          nivel: lista.nivel || 'Basica',
          grado: lista.grado || 1,
          paralelo: lista.paralelo || '',
          año: lista.año || lista.ano || new Date().getFullYear(),
          descripcion: lista.descripcion || '',
          activo: lista.activo !== false,
          pdf_id: lista.pdf_id || undefined,
          pdf_url: lista.pdf_url || undefined,
          pdf_nombre: lista.pdf_nombre || undefined,
          colegio: lista.colegio || undefined,
          curso: lista.curso || undefined,
          materiales: lista.materiales || [],
          createdAt: lista.createdAt || null,
          updatedAt: lista.updatedAt || null,
          versiones: lista.versiones || 0,
        } as ListaType))
        
        console.log('[ListasListing] ✅ Listas actualizadas en la UI:', nuevasListas.length, 'listas')
        setData(nuevasListas)
      } else {
        console.error('[ListasListing] ❌ Respuesta de API no válida:', result)
        // Solo mostrar alert si no es un reintento
        if (retryCount >= 2) {
          alert('Error al recargar listas: ' + (result.error || 'Error desconocido'))
        }
      }
    } catch (refreshError: any) {
      console.error('[ListasListing] ❌ Error al recargar listas:', refreshError)
      // Solo mostrar alert si no es un reintento
      if (retryCount >= 2) {
        alert('Error al recargar listas: ' + refreshError.message)
      }
    } finally {
      setLoading(false)
    }
  }

  // Función para notificar cambios a otras páginas
  const notificarCambio = (tipo: 'eliminado' | 'creado' | 'editado', cursoId?: string | number) => {
    // Usar CustomEvent para notificar a otras pestañas/ventanas
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('curso-cambiado', {
        detail: { tipo, cursoId, timestamp: Date.now() }
      }))
      
      // También usar localStorage como backup
      localStorage.setItem('curso-cambio-notificacion', JSON.stringify({
        tipo,
        cursoId,
        timestamp: Date.now()
      }))
    }
  }

  // Listener para cambios desde otras páginas
  useEffect(() => {
    const handleCambioCurso = (event: any) => {
      console.log('[ListasListing] 🔔 Cambio detectado desde otra página:', event.detail)
      // Recargar después de un pequeño delay
      setTimeout(() => {
        recargarListas()
      }, 500)
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'curso-cambio-notificacion' && e.newValue) {
        try {
          const cambio = JSON.parse(e.newValue)
          console.log('[ListasListing] 🔔 Cambio detectado desde localStorage:', cambio)
          setTimeout(() => {
            recargarListas()
          }, 500)
        } catch (err) {
          console.error('[ListasListing] Error al parsear notificación:', err)
        }
      }
    }

    window.addEventListener('curso-cambiado', handleCambioCurso)
    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('curso-cambiado', handleCambioCurso)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  const handleModalSuccess = () => {
    console.log('[ListasListing] ✅ handleModalSuccess llamado, recargando listas...')
    // Notificar cambio
    notificarCambio('creado')
    
    // Función para forzar recarga múltiple
    const forzarRecarga = () => {
      console.log('[ListasListing] 🔄 Forzando recarga de listas...')
      recargarListas()
    }
    
    // Recargar inmediatamente (igual que el botón "Agregar Lista")
    forzarRecarga()
    
    // Recargar de nuevo después de delays progresivos para asegurar que Strapi haya procesado todo
    setTimeout(() => forzarRecarga(), 1000)  // 1 segundo
    setTimeout(() => forzarRecarga(), 2000)  // 2 segundos
    setTimeout(() => forzarRecarga(), 3500)  // 3.5 segundos
    setTimeout(() => forzarRecarga(), 5000)   // 5 segundos (última recarga)
  }

  const handleExportarColegio = async () => {
    const colegioFiltro = table.getColumn('colegio')?.getFilterValue() as string | undefined
    if (!colegioFiltro) {
      alert('Por favor, selecciona un colegio del filtro para exportar')
      return
    }

    // Buscar el colegio en los datos para obtener su ID
    const colegioEncontrado = data.find(lista => lista.colegio?.nombre === colegioFiltro)
    if (!colegioEncontrado || !colegioEncontrado.colegio?.id) {
      alert('No se pudo encontrar el ID del colegio seleccionado')
      return
    }

    setExportando(true)
    try {
      const colegioId = colegioEncontrado.colegio.id
      const response = await fetch(`/api/crm/listas/exportar-colegio?colegioId=${colegioId}`)
      const result = await response.json()

      if (!result.success) {
        alert(`Error al obtener datos: ${result.error}`)
        return
      }

      if (!result.data.datosExcel || result.data.datosExcel.length === 0) {
        alert('No hay productos para exportar en este colegio')
        return
      }

      await exportarListasColegioAExcel(result.data)
    } catch (error: any) {
      console.error('Error al exportar:', error)
      alert(`Error al exportar: ${error.message || 'Error desconocido'}`)
    } finally {
      setExportando(false)
    }
  }

  if (error && mappedListas.length === 0) {
    return (
      <Row>
        <Col xs={12}>
          <Alert variant="warning">
            <strong>Error al cargar listas:</strong> {error}
          </Alert>
        </Col>
      </Row>
    )
  }

  return (
    <Row>
      <Col xs={12}>
        <Card className="mb-4">
          <CardHeader className="d-flex justify-content-between align-items-center">
            <div className="d-flex gap-2">
              <div className="app-search">
                <input
                  type="search"
                  className="form-control"
                  placeholder="Buscar por nombre, colegio o RBD..."
                  value={globalFilter ?? ''}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                />
                <LuSearch className="app-search-icon text-muted" />
              </div>
            </div>

            <div className="d-flex align-items-center gap-2 flex-wrap">
              <div className="app-search">
                <select
                  className="form-select form-control my-1 my-md-0"
                  value={(table.getColumn('colegio')?.getFilterValue() as string) ?? ''}
                  onChange={(e) => {
                    const value = e.target.value
                    table.getColumn('colegio')?.setFilterValue(value === '' ? undefined : value)
                  }}>
                  <option value="">Todos los Colegios</option>
                  {Array.from(new Set(data.map(l => l.colegio?.nombre).filter(Boolean))).sort().map((nombre) => {
                    // Contar listas por colegio en los datos filtrados actuales
                    const filteredRows = table.getFilteredRowModel().rows
                    const count = filteredRows.filter(row => row.original.colegio?.nombre === nombre).length
                    return (
                      <option key={nombre} value={nombre}>
                        {nombre} {count > 0 ? `(${count} ${count === 1 ? 'lista' : 'listas'})` : ''}
                      </option>
                    )
                  })}
                </select>
              </div>

              <div className="app-search">
                <select
                  className="form-select form-control my-1 my-md-0"
                  value={(table.getColumn('nivel')?.getFilterValue() as string) ?? ''}
                  onChange={(e) => {
                    const value = e.target.value
                    table.getColumn('nivel')?.setFilterValue(value === '' ? undefined : value)
                  }}>
                  <option value="">Todos los Niveles</option>
                  <option value="Basica">Básica</option>
                  <option value="Media">Media</option>
                </select>
              </div>

              <div className="app-search">
                <select
                  className="form-select form-control my-1 my-md-0"
                  value={(table.getColumn('año')?.getFilterValue() as string) ?? ''}
                  onChange={(e) =>
                    table.getColumn('año')?.setFilterValue(e.target.value === '' ? undefined : e.target.value)
                  }>
                  <option value="">Todos los Años</option>
                  {Array.from(new Set(data.map(l => l.año).filter(Boolean))).sort((a, b) => (b || 0) - (a || 0)).map((año) => (
                    <option key={año} value={String(año)}>{año}</option>
                  ))}
                </select>
              </div>


              <div className="app-search">
                <select
                  className="form-select form-control my-1 my-md-0"
                  value={(table.getColumn('activo')?.getFilterValue() as string) ?? ''}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value === '') {
                      table.getColumn('activo')?.setFilterValue(undefined)
                    } else {
                      table.getColumn('activo')?.setFilterValue(value === 'true')
                    }
                  }}>
                  <option value="">Todos los Estados</option>
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
              </div>

              <div className="app-search">
                <select
                  className="form-select form-control my-1 my-md-0"
                  value={(table.getColumn('nivel')?.getFilterValue() as string) ?? 'All'}
                  onChange={(e) =>
                    table.getColumn('nivel')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)
                  }>
                  <option value="All">Nivel</option>
                  <option value="Basica">Básica</option>
                  <option value="Media">Media</option>
                </select>
              </div>

              <div className="app-search">
                <select
                  className="form-select form-control my-1 my-md-0"
                  value={
                    (() => {
                      const filterValue = table.getColumn('activo')?.getFilterValue()
                      if (filterValue === undefined) return 'All'
                      if (typeof filterValue === 'boolean') return filterValue ? 'true' : 'false'
                      return String(filterValue)
                    })()
                  }
                  onChange={(e) => {
                    const value = e.target.value
                    table.getColumn('activo')?.setFilterValue(value === 'All' ? undefined : value === 'true')
                  }}>
                  <option value="All">Estado</option>
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
              </div>

              <div>
                <select
                  className="form-select form-control my-1 my-md-0"
                  value={table.getState().pagination.pageSize}
                  onChange={(e) => table.setPageSize(Number(e.target.value))}>
                  {[5, 10, 15, 20, 25].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="d-flex gap-1">
              {(table.getColumn('colegio')?.getFilterValue() as string | undefined) && (
                <Button 
                  variant="outline-primary" 
                  onClick={handleExportarColegio}
                  disabled={exportando}
                  title="Exportar listas del colegio filtrado a Excel"
                >
                  <LuDownload className={`fs-sm me-2 ${exportando ? 'spinning' : ''}`} style={exportando ? { animation: 'spin 1s linear infinite' } : {}} /> 
                  {exportando ? 'Exportando...' : 'Exportar para Escolar'}
                </Button>
              )}
              {data.length > 0 && (
                <Button 
                  variant="outline-danger" 
                  onClick={() => {
                    // Seleccionar todos los cursos para eliminación masiva
                    const allRowIds: Record<string, boolean> = {}
                    table.getRowModel().rows.forEach((row) => {
                      allRowIds[row.id] = true
                    })
                    setSelectedRowIds(allRowIds)
                    setSelectedListaId(null) // Limpiar selección individual
                    setShowDeleteModal(true)
                  }}
                  title="Eliminar todos los cursos y listas"
                >
                  <TbTrash className="fs-sm me-2" /> Vaciar Todo ({data.length})
                </Button>
              )}
              {Object.keys(selectedRowIds).length > 0 && (
                <Button 
                  variant="danger" 
                  onClick={() => {
                    setSelectedListaId(null) // Limpiar selección individual
                    setShowDeleteModal(true)
                  }}
                >
                  <TbTrash className="fs-sm me-2" /> Eliminar Seleccionados ({Object.keys(selectedRowIds).length})
                </Button>
              )}
              <Button variant="success" onClick={() => setShowImportModal(true)}>
                <LuUpload className="fs-sm me-2" /> Importación Masiva
              </Button>
              <Button variant="primary" onClick={() => setShowModal(true)}>
                <LuPlus className="fs-sm me-2" /> Agregar Lista
              </Button>
              {/* Ocultado: Importar Colegios y Cursos */}
              {/* <Button variant="outline-primary" onClick={() => setShowImportColegiosModal(true)}>
                <LuUpload className="fs-sm me-2" /> Importar Colegios y Cursos
              </Button> */}
              {/* Ocultado: Logs Importación */}
              {/* <Link href="/crm/listas/importacion-completa-logs" className="btn btn-outline-info me-2">
                <LuFileCode className="me-1" />
                Logs Importación
              </Link> */}
              <Button variant="outline-success" onClick={() => setShowImportCompletaModal(true)}>
                <LuUpload className="fs-sm me-2" /> Importación Completa (Plantilla)
              </Button>
              {/* Ocultado: Ver Logs */}
              {/* <Link href="/crm/listas/logs">
                <Button variant="outline-info" title="Ver logs de procesamiento">
                  <LuFileCode className="fs-sm me-2" /> Ver Logs
                </Button>
              </Link> */}
              {/* Ocultado: Logs Importación Completa */}
              {/* <Link href="/crm/listas/importacion-completa-logs">
                <Button variant="outline-warning" title="Ver logs de importación completa">
                  <LuFileCode className="fs-sm me-2" /> Logs Importación Completa
                </Button>
              </Link> */}
            </div>
          </CardHeader>

          <DataTable<ListaType>
            table={table}
            emptyMessage="No se encontraron listas"
          />

          {table.getRowModel().rows.length > 0 && (
            <CardFooter className="border-0">
              <TablePagination
                totalItems={totalItems}
                start={start}
                end={end}
                itemsName="listas"
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
            onHide={() => {
              setShowDeleteModal(false)
              setSelectedListaId(null)
            }}
            onConfirm={handleDelete}
            selectedCount={
              selectedListaId 
                ? 1 
                : Object.keys(selectedRowIds).length
            }
            itemName="curso"
            modalTitle="Confirmar Eliminación"
            confirmButtonText="Eliminar"
            cancelButtonText="Cancelar"
            loading={loading}
          />
        </Card>

        <ListaModal
          show={showModal}
          onHide={handleModalClose}
          lista={editingLista}
          onSuccess={handleModalSuccess}
        />

        <ImportacionMasivaModal
          show={showImportModal}
          onHide={() => setShowImportModal(false)}
          onSuccess={handleModalSuccess}
        />
        
        <ImportacionMasivaPDFsModal
          show={showImportPDFsModal}
          onHide={() => setShowImportPDFsModal(false)}
          onSuccess={handleModalSuccess}
        />

        {/* Ocultado: Modal de Importación Masiva de Colegios */}
        {/* <ImportacionMasivaColegiosModal
          show={showImportColegiosModal}
          onHide={() => setShowImportColegiosModal(false)}
          onSuccess={handleModalSuccess}
        /> */}

        <ImportacionCompletaModal
          show={showImportCompletaModal}
          onHide={() => setShowImportCompletaModal(false)}
          onSuccess={() => {
            console.log('[ListasListing] ✅ Importación completa exitosa, recargando listas...')
            // Recargar listas después de un pequeño delay para dar tiempo a Strapi
            setTimeout(() => {
              recargarListas()
            }, 1000)
            // Recargar de nuevo después de más tiempo para asegurar que se reflejen todos los cambios
            setTimeout(() => {
              recargarListas()
            }, 3000)
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
              // Recargar listas después de actualizar versiones
              setTimeout(() => {
                recargarListas()
              }, 500)
            }}
          />
        )}
      </Col>
    </Row>
  )
}
