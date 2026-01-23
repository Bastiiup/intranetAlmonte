'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
  Button,
  Form,
  FormGroup,
  FormLabel,
  FormControl,
  Alert,
  Table,
  Badge,
  Spinner,
  ProgressBar,
} from 'react-bootstrap'
import { LuUpload, LuFileText, LuCheck, LuX, LuDownload } from 'react-icons/lu'
import * as XLSX from 'xlsx'

interface ImportacionCompletaModalProps {
  show: boolean
  onHide: () => void
  onSuccess?: () => void
}

interface ImportRow {
  Colegio?: string
  RBD?: string | number
  Comuna?: string
  Orden_colegio?: number
  Curso?: string
  Año_curso?: number
  Orden_curso?: number
  Asignatura?: string
  Orden_asignatura?: number
  Lista_nombre?: string
  Año_lista?: number
  Fecha_actualizacion?: string
  Fecha_publicacion?: string
  URL_lista?: string
  URL_publicacion?: string
  Orden_lista?: number
  Libro_nombre?: string
  Libro_codigo?: string
  Libro_isbn?: string
  Libro_autor?: string
  Libro_editorial?: string
  Libro_orden?: number
  Libro_cantidad?: number
  Libro_observaciones?: string
  Libro_mes_uso?: string
  nivel?: string
  grado?: number
  Nivel?: string
  Grado?: number
  [key: string]: any // Permitir propiedades dinámicas adicionales
}

interface AgrupadoPorLista {
  colegio: {
    nombre: string
    rbd?: number
    comuna?: string
    orden?: number
  }
  curso: {
    nombre: string
    año?: number
    orden?: number
  }
  asignatura: {
    nombre: string
    orden?: number
  }
  lista: {
    nombre: string
    año?: number
    fecha_actualizacion?: string
    fecha_publicacion?: string
    url_lista?: string
    url_publicacion?: string
    orden?: number
  }
  productos: ImportRow[]
}

interface ProcessResult {
  success: boolean
  message: string
  tipo: 'colegio' | 'curso' | 'lista' | 'producto'
  datos?: any
}

export default function ImportacionCompletaModal({
  show,
  onHide,
  onSuccess,
}: ImportacionCompletaModalProps) {
  const [step, setStep] = useState<'upload' | 'review' | 'processing' | 'complete'>('upload')
  const [importData, setImportData] = useState<ImportRow[]>([])
  const [agrupado, setAgrupado] = useState<Map<string, AgrupadoPorLista>>(new Map())
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [processResults, setProcessResults] = useState<ProcessResult[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Estado para almacenar PDFs por grupo (clave del grupo -> File)
  const [pdfsPorGrupo, setPdfsPorGrupo] = useState<Map<string, File>>(new Map())

  // Interceptar console.log/error/warn para enviar logs al servidor
  // Interceptar console.log para capturar logs de importación completa
  // Esto debe ejecutarse siempre, no solo cuando el modal está abierto
  useEffect(() => {
    // Guardar referencias originales solo si no están ya guardadas
    if (!(window as any).__importacionCompletaOriginalLog) {
      (window as any).__importacionCompletaOriginalLog = console.log
      ;(window as any).__importacionCompletaOriginalError = console.error as (...args: any[]) => void
      ;(window as any).__importacionCompletaOriginalWarn = console.warn
    }

    const originalLog = (window as any).__importacionCompletaOriginalLog
    const originalError = (window as any).__importacionCompletaOriginalError
    const originalWarn = (window as any).__importacionCompletaOriginalWarn

    const sendLogToServer = async (level: 'log' | 'warn' | 'error', ...args: any[]) => {
      try {
        const message = args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ')
        
        if (message.includes('[Importación Completa]')) {
          // Enviar al servidor sin esperar respuesta (fire and forget)
          fetch('/api/crm/listas/importacion-completa-logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              level, 
              message, 
              data: args.length > 1 ? args.slice(1) : undefined 
            }),
          }).catch((err) => {
            // Loggear errores en desarrollo
            if (process.env.NODE_ENV === 'development') {
              originalWarn('[Importación Completa] Error al enviar log al servidor:', err)
            }
          })
        }
      } catch (e) {
        // Loggear errores en desarrollo
        if (process.env.NODE_ENV === 'development') {
          originalWarn('[Importación Completa] Excepción al enviar log:', e)
        }
      }
    }

    // Solo interceptar si no está ya interceptado
    if (!(window as any).__importacionCompletaIntercepted) {
      console.log = (...args: any[]) => {
        originalLog(...args)
        sendLogToServer('log', ...args)
      }

      console.error = (...args: any[]) => {
        originalError(...args)
        sendLogToServer('error', ...args)
      }

      console.warn = (...args: any[]) => {
        originalWarn(...args)
        sendLogToServer('warn', ...args)
      }

      (window as any).__importacionCompletaIntercepted = true
    }

    // No restaurar en cleanup para que los logs sigan funcionando
    // return () => {
    //   console.log = originalLog
    //   console.error = originalError
    //   console.warn = originalWarn
    // }
  }, [])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { raw: false })

        // Función helper para obtener URL desde múltiples variantes (case-insensitive)
        const obtenerURLLista = (row: any): string | undefined => {
          if (!row) return undefined
          
          // Buscar en todas las posibles variantes (case-insensitive)
          const posiblesNombres = [
            'URL PDF', 'url pdf', 'Url Pdf', 'URL_PDF', 'url_pdf', // Prioridad: "URL PDF" con espacio
            'URL_lista', 'url_lista',
            'URL', 'url', 'Url',
            'link_pdf', 'link PDF', 'Link PDF', 'LINK_PDF',
            'pdf_url', 'PDF URL', 'Pdf Url', 'PDF_URL',
            'link', 'Link', 'LINK',
            'pdf', 'PDF', 'Pdf'
          ]
          
          // Primero buscar exacto (más rápido)
          for (const nombre of posiblesNombres) {
            if (row[nombre] && String(row[nombre]).trim()) {
              const url = String(row[nombre]).trim()
              // Validar que sea una URL válida
              if (url.startsWith('http://') || url.startsWith('https://')) {
                console.log(`[Importación Completa] ✅ URL encontrada en columna "${nombre}": ${url}`)
                return url
              }
            }
          }
          
          // Si no se encontró exacto, buscar case-insensitive en todas las keys
          const keys = Object.keys(row)
          console.log(`[Importación Completa] 🔍 Buscando URL en columnas:`, keys)
          
          // Normalizar nombres de columnas para comparación (case-insensitive, normalizar espacios)
          const normalizarNombre = (str: string) => str.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[^\w\s]/g, '')
          
          for (const key of keys) {
            const keyNormalizado = normalizarNombre(key)
            
            // Buscar match con cualquiera de los posibles nombres
            for (const nombre of posiblesNombres) {
              const nombreNormalizado = normalizarNombre(nombre)
              
              if (keyNormalizado === nombreNormalizado) {
                const url = String(row[key]).trim()
                if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
                  console.log(`[Importación Completa] ✅ URL encontrada en columna "${key}" (match con "${nombre}"): ${url}`)
                  return url
                }
              }
            }
            
            // También buscar si la key contiene "url" y "pdf" (para casos como "URL PDF" con encoding issues)
            if (keyNormalizado.includes('url') && keyNormalizado.includes('pdf')) {
              const url = String(row[key]).trim()
              if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
                console.log(`[Importación Completa] ✅ URL encontrada en columna "${key}" (contiene "url" y "pdf"): ${url}`)
                return url
              }
            }
          }
          
          console.log(`[Importación Completa] ⚠️ No se encontró URL en la fila. Columnas disponibles:`, keys)
          return undefined
        }

        // Detectar formato del Excel (nuevo formato compacto o formato completo)
        const primeraFila = (jsonData[0] || {}) as Record<string, any>
        const tieneFormatoCompacto = primeraFila.nombre_curso || primeraFila['nombre_curso'] || 
                                     primeraFila.rbd || primeraFila['rbd'] ||
                                     primeraFila.Producto || primeraFila['Producto'] ||
                                     primeraFila.asignaura || primeraFila['asignaura']
        
        // Normalizar datos - soportar ambos formatos
        const normalizedData: ImportRow[] = jsonData.map((row: any) => {
          if (tieneFormatoCompacto) {
            // Formato compacto: rbd, nombre_curso, nivel, asignaura, grado, año, Producto, etc.
            return {
              Colegio: row.Colegio || row.colegio || row.colegio_nombre || '', // Si no hay, se buscará por RBD
              RBD: row.RBD || row.rbd ? parseInt(String(row.RBD || row.rbd)) : undefined,
              Comuna: row.Comuna || row.comuna,
              Orden_colegio: row.Orden_colegio || row.orden_colegio ? parseInt(String(row.Orden_colegio || row.orden_colegio)) : undefined,
              Curso: row.Curso || row.curso || row.nombre_curso || '',
              Año_curso: row.Año_curso || row.año_curso || row.año || row.ano ? parseInt(String(row.Año_curso || row.año_curso || row.año || row.ano)) : undefined,
              Orden_curso: row.Orden_curso || row.orden_curso ? parseInt(String(row.Orden_curso || row.orden_curso)) : undefined,
              Asignatura: row.Asignatura || row.asignatura || row.asignaura || '', // Soporta typo "asignaura"
              Orden_asignatura: row.Orden_asignatura || row.orden_asignatura || row.orden_asigna ? parseInt(String(row.Orden_asignatura || row.orden_asignatura || row.orden_asigna)) : undefined,
              Lista_nombre: row.Lista_nombre || row.lista_nombre || row.Lista || row.lista || (row.Asignatura || row.asignatura || row.asignaura || 'Lista de Útiles'), // Usar asignatura como lista si no hay
              Año_lista: row.Año_lista || row.año_lista || row.año || row.ano ? parseInt(String(row.Año_lista || row.año_lista || row.año || row.ano)) : undefined,
              Fecha_actualizacion: row.Fecha_actualizacion || row.fecha_actualizacion,
              Fecha_publicacion: row.Fecha_publicacion || row.fecha_publicacion,
              URL_lista: obtenerURLLista(row), // Buscar URL en múltiples variantes
              URL_publicacion: row.URL_publicacion || row.url_publicacion,
              Orden_lista: row.Orden_lista || row.orden_lista ? parseInt(String(row.Orden_lista || row.orden_lista)) : undefined,
              Libro_nombre: row.Libro_nombre || row.libro_nombre || row.Producto || row.producto || '',
              Libro_codigo: row.Libro_codigo || row.libro_codigo || row.codigo_prod || row.codigo || '',
              Libro_isbn: row.Libro_isbn || row.libro_isbn || row.ISBN || row.isbn,
              Libro_autor: row.Libro_autor || row.libro_autor || row.Autor || row.autor,
              Libro_editorial: row.Libro_editorial || row.libro_editorial || row.Editorial || row.editorial,
              Libro_orden: row.Libro_orden || row.libro_orden || row.ordden_prdo || row.orden_prod || row.orden ? parseInt(String(row.Libro_orden || row.libro_orden || row.ordden_prdo || row.orden_prod || row.orden)) : undefined,
              Libro_cantidad: row.Libro_cantidad || row.libro_cantidad || row.Cantidad || row.cantidad ? parseInt(String(row.Libro_cantidad || row.libro_cantidad || row.Cantidad || row.cantidad)) : 1,
              Libro_observaciones: row.Libro_observaciones || row.libro_observaciones || row.Observaciones || row.observaciones,
              Libro_mes_uso: row.Libro_mes_uso || row.libro_mes_uso || row.Mes_uso || row.mes_uso,
            }
          } else {
            // Formato completo original
            return {
              Colegio: row.Colegio || row.colegio,
              RBD: row.RBD || row.rbd ? parseInt(String(row.RBD || row.rbd)) : undefined,
              Comuna: row.Comuna || row.comuna,
              Orden_colegio: row.Orden_colegio || row.orden_colegio ? parseInt(String(row.Orden_colegio || row.orden_colegio)) : undefined,
              Curso: row.Curso || row.curso,
              Año_curso: row.Año_curso || row.año_curso ? parseInt(String(row.Año_curso || row.año_curso)) : undefined,
              Orden_curso: row.Orden_curso || row.orden_curso ? parseInt(String(row.Orden_curso || row.orden_curso)) : undefined,
              Asignatura: row.Asignatura || row.asignatura,
              Orden_asignatura: row.Orden_asignatura || row.orden_asignatura ? parseInt(String(row.Orden_asignatura || row.orden_asignatura)) : undefined,
              Lista_nombre: row.Lista_nombre || row.lista_nombre,
              Año_lista: row.Año_lista || row.año_lista ? parseInt(String(row.Año_lista || row.año_lista)) : undefined,
              Fecha_actualizacion: row.Fecha_actualizacion || row.fecha_actualizacion,
              Fecha_publicacion: row.Fecha_publicacion || row.fecha_publicacion,
              URL_lista: row.URL_lista || row.url_lista,
              URL_publicacion: row.URL_publicacion || row.url_publicacion,
              Orden_lista: row.Orden_lista || row.orden_lista ? parseInt(String(row.Orden_lista || row.orden_lista)) : undefined,
              Libro_nombre: row.Libro_nombre || row.libro_nombre,
              Libro_codigo: row.Libro_codigo || row.libro_codigo,
              Libro_isbn: row.Libro_isbn || row.libro_isbn,
              Libro_autor: row.Libro_autor || row.libro_autor,
              Libro_editorial: row.Libro_editorial || row.libro_editorial,
              Libro_orden: row.Libro_orden || row.libro_orden ? parseInt(String(row.Libro_orden || row.libro_orden)) : undefined,
              Libro_cantidad: row.Libro_cantidad || row.libro_cantidad ? parseInt(String(row.Libro_cantidad || row.libro_cantidad)) : undefined,
              Libro_observaciones: row.Libro_observaciones || row.libro_observaciones,
              Libro_mes_uso: row.Libro_mes_uso || row.libro_mes_uso,
            }
          }
        })

        if (normalizedData.length === 0) {
          setError('El archivo está vacío o no contiene datos válidos')
          return
        }

        // OPTIMIZACIÓN: Cargar colegios existentes con TODOS sus datos para auto-completar
        const colegiosExistentesMap = new Map<number, boolean>() // RBD -> existe
        const colegiosExistentesPorNombre = new Map<string, boolean>() // Nombre normalizado -> existe
        const colegiosDatosCompletosPorRBD = new Map<number, any>() // RBD -> datos completos del colegio
        const colegiosDatosCompletosPorNombre = new Map<string, any>() // Nombre normalizado -> datos completos
        
        try {
          const colegiosResponse = await fetch('/api/crm/colegios?page=1&pageSize=10000')
          const colegiosResult = await colegiosResponse.json()
          
          if (colegiosResult.success && Array.isArray(colegiosResult.data)) {
            colegiosResult.data.forEach((colegio: any) => {
              const rbd = colegio.rbd
              const nombre = colegio.colegio_nombre || colegio.nombre || ''
              
              if (rbd !== null && rbd !== undefined && rbd !== '') {
                const rbdNum = Number(rbd)
                if (!isNaN(rbdNum)) {
                  colegiosExistentesMap.set(rbdNum, true)
                  // Guardar datos completos del colegio por RBD
                  colegiosDatosCompletosPorRBD.set(rbdNum, colegio)
                }
              }
              
              if (nombre && nombre.trim()) {
                const normalizedName = nombre
                  .toLowerCase()
                  .trim()
                  .replace(/\s+/g, ' ')
                  .normalize('NFD')
                  .replace(/[\u0300-\u036f]/g, '')
                colegiosExistentesPorNombre.set(normalizedName, true)
                // Guardar datos completos del colegio por nombre
                colegiosDatosCompletosPorNombre.set(normalizedName, colegio)
              }
            })
          }
        } catch (err) {
          console.warn('[Importación Completa] No se pudieron cargar colegios existentes para verificación previa:', err)
        }

        // Agrupar por colegio + curso + asignatura + lista
        const agrupadoMap = new Map<string, AgrupadoPorLista>()
        
        normalizedData.forEach((row) => {
          // Validación flexible: necesita RBD o Colegio, Curso, Asignatura, y Producto
          const tieneDatosMinimos = (row.RBD || row.Colegio) && row.Curso && row.Asignatura && row.Libro_nombre
          
          if (!tieneDatosMinimos) {
            return // Saltar filas incompletas
          }
          
          // Si no hay Colegio pero hay RBD, usar RBD como identificador temporal
          const identificadorColegio = row.Colegio || (row.RBD ? `RBD_${row.RBD}` : '')
          
          // Si no hay Lista_nombre, usar asignatura como lista
          const listaNombre = row.Lista_nombre || row.Asignatura || 'Lista de Útiles'

          // Crear clave única: colegio|curso|asignatura|lista
          const clave = `${identificadorColegio}|${row.Curso}|${row.Asignatura || 'Sin asignatura'}|${listaNombre}`
          
          if (!agrupadoMap.has(clave)) {
            // Extraer nivel y grado
            // Si viene en formato compacto, puede venir en columnas separadas
            let nivel = 'Basica'
            let grado = 1
            
            if (row.nivel || row.Nivel) {
              // Nivel viene en columna separada
              const nivelStr = String(row.nivel || row.Nivel || '').toLowerCase()
              nivel = nivelStr.includes('media') ? 'Media' : 'Basica'
            } else {
              // Extraer del nombre del curso
              const nivelMatch = row.Curso.match(/(Básica|Basica|Media)/i)
              if (nivelMatch) {
                nivel = nivelMatch[0].toLowerCase().includes('basica') ? 'Basica' : 'Media'
              }
            }
            
            if (row.grado || row.Grado) {
              // Grado viene en columna separada
              grado = parseInt(String(row.grado || row.Grado)) || 1
            } else {
              // Extraer del nombre del curso
              const gradoMatch = row.Curso.match(/(\d+)/)
              if (gradoMatch) {
                grado = parseInt(gradoMatch[1]) || 1
              }
            }

            // Verificar si el colegio ya existe y obtener sus datos completos
            let colegioExiste = false
            let colegioDatosCompletos: any = null
            
            // Prioridad 1: Buscar por RBD
            if (row.RBD) {
              const rbdNum = parseInt(String(row.RBD))
              if (!isNaN(rbdNum)) {
                colegioExiste = colegiosExistentesMap.get(rbdNum) || false
                if (colegioExiste) {
                  colegioDatosCompletos = colegiosDatosCompletosPorRBD.get(rbdNum)
                }
              }
            }
            
            // Prioridad 2: Buscar por nombre si no se encontró por RBD
            if (!colegioExiste && row.Colegio) {
              const normalizedName = row.Colegio
                .toLowerCase()
                .trim()
                .replace(/\s+/g, ' ')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
              colegioExiste = colegiosExistentesPorNombre.get(normalizedName) || false
              if (colegioExiste) {
                colegioDatosCompletos = colegiosDatosCompletosPorNombre.get(normalizedName)
              }
            }

            // Si el colegio existe, usar sus datos completos; si no, usar los datos del Excel
            const nombreColegio = colegioDatosCompletos 
              ? (colegioDatosCompletos.colegio_nombre || colegioDatosCompletos.nombre || row.Colegio || `Colegio RBD ${row.RBD}`)
              : (row.Colegio || (row.RBD ? `Colegio RBD ${row.RBD}` : ''))
            
            const comunaColegio = colegioDatosCompletos?.comuna?.comuna_nombre || colegioDatosCompletos?.comuna || row.Comuna

            agrupadoMap.set(clave, {
              colegio: {
                nombre: nombreColegio,
                rbd: row.RBD ? parseInt(String(row.RBD)) : undefined,
                comuna: comunaColegio,
                orden: row.Orden_colegio,
                existe: colegioExiste, // Marcar si el colegio ya existe
                datosCompletos: colegioDatosCompletos, // Guardar datos completos para uso posterior
              },
              curso: {
                nombre: row.Curso,
                año: row.Año_curso,
                orden: row.Orden_curso,
              },
              asignatura: {
                nombre: row.Asignatura,
                orden: row.Orden_asignatura,
              },
              lista: {
                nombre: listaNombre,
                año: row.Año_lista || row.Año_curso,
                fecha_actualizacion: row.Fecha_actualizacion,
                fecha_publicacion: row.Fecha_publicacion,
                url_lista: obtenerURLLista(row),
                url_publicacion: row.URL_publicacion || row.url_publicacion,
                orden: row.Orden_lista,
              },
              productos: [],
            })
          }

          // Agregar producto a la lista
          const grupo = agrupadoMap.get(clave)!
          grupo.productos.push(row)
          
          // Si el grupo no tiene URL_lista pero esta fila sí la tiene, actualizarla
          const urlLista = obtenerURLLista(row)
          if (!grupo.lista.url_lista && urlLista) {
            grupo.lista.url_lista = urlLista
          }
          // Si esta fila tiene URL_publicacion y el grupo no, actualizarla también
          if (!grupo.lista.url_publicacion && row.URL_publicacion) {
            grupo.lista.url_publicacion = row.URL_publicacion
          }
        })

        setImportData(normalizedData)
        setAgrupado(agrupadoMap)
        setStep('review')
        setError(null)
      } catch (err: any) {
        setError(`Error al leer el archivo: ${err.message}`)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleProcess = async () => {
    setProcessing(true)
    setStep('processing')
    setProgress(0)
    setError(null)
    const results: ProcessResult[] = []

    try {
      // Cargar todos los colegios existentes
      const colegiosResponse = await fetch('/api/crm/colegios?page=1&pageSize=10000')
      const colegiosResult = await colegiosResponse.json()
      
      // OPTIMIZACIÓN: Almacenar datos completos del colegio para auto-completar
      const colegiosMap = new Map<number, { id: number | string; nombre: string; datosCompletos?: any }>()
      const colegiosByName = new Map<string, { id: number | string; nombre: string; rbd?: number; datosCompletos?: any }>()
      const colegiosCompletosMap = new Map<number | string, any>() // Mapa de ID -> datos completos

      if (colegiosResult.success && Array.isArray(colegiosResult.data)) {
        colegiosResult.data.forEach((colegio: any) => {
          const id = colegio.id || colegio.documentId
          const nombre = colegio.colegio_nombre || colegio.nombre || ''
          const rbd = colegio.rbd
          
          // Guardar datos completos del colegio
          colegiosCompletosMap.set(id, colegio)
          
          // Agregar por RBD (convertir a número para consistencia)
          if (rbd !== null && rbd !== undefined && rbd !== '') {
            const rbdNum = Number(rbd)
            if (!isNaN(rbdNum)) {
              colegiosMap.set(rbdNum, { id, nombre, datosCompletos: colegio })
            }
          }
          
          // Agregar por nombre normalizado (sin acentos, minúsculas, sin espacios extra)
          if (nombre && nombre.trim()) {
            const normalizedName = nombre
              .toLowerCase()
              .trim()
              .replace(/\s+/g, ' ') // Normalizar espacios múltiples
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
            colegiosByName.set(normalizedName, { id, nombre, rbd, datosCompletos: colegio })
          }
        })
      }

      // Ordenar grupos por orden (colegio -> curso -> asignatura -> lista)
      const gruposArray = Array.from(agrupado.values()).sort((a, b) => {
        // Orden por colegio
        const ordenColegioA = a.colegio.orden || 0
        const ordenColegioB = b.colegio.orden || 0
        if (ordenColegioA !== ordenColegioB) {
          return ordenColegioA - ordenColegioB
        }
        
        // Orden por curso
        const ordenCursoA = a.curso.orden || 0
        const ordenCursoB = b.curso.orden || 0
        if (ordenCursoA !== ordenCursoB) {
          return ordenCursoA - ordenCursoB
        }
        
        // Orden por asignatura
        const ordenAsignaturaA = a.asignatura.orden || 0
        const ordenAsignaturaB = b.asignatura.orden || 0
        if (ordenAsignaturaA !== ordenAsignaturaB) {
          return ordenAsignaturaA - ordenAsignaturaB
        }
        
        // Orden por lista
        const ordenListaA = a.lista.orden || 0
        const ordenListaB = b.lista.orden || 0
        return ordenListaA - ordenListaB
      })
      
      console.log(`[Importación Completa] 🚀 Iniciando procesamiento de ${gruposArray.length} grupos...`)
      let procesados = 0

      // Procesar cada grupo (colegio + curso + asignatura + lista) en orden
      for (const grupo of gruposArray) {
        const progreso = Math.round((procesados / gruposArray.length) * 100)
        setProgress(progreso)
        procesados++
        
        console.log(`[Importación Completa] 📊 Procesando grupo ${procesados}/${gruposArray.length} (${progreso}%): ${grupo.colegio.nombre} → ${grupo.curso.nombre} → ${grupo.asignatura.nombre} → ${grupo.lista.nombre}`)

        try {
          // 1. Buscar o crear colegio
          let colegioId: number | string | null = null
          let colegioEncontrado: { id: number | string; nombre: string; rbd?: number } | null = null

          // OPTIMIZACIÓN: Buscar colegio existente (prioridad: RBD > nombre)
          let colegioExistente: any = null
          
          // Prioridad 1: Buscar por RBD (más confiable)
          if (grupo.colegio.rbd !== null && grupo.colegio.rbd !== undefined && grupo.colegio.rbd !== '') {
            const rbdNum = Number(grupo.colegio.rbd)
            if (!isNaN(rbdNum)) {
              const colegio = colegiosMap.get(rbdNum)
              if (colegio) {
                colegioId = colegio.id
                colegioExistente = colegio.datosCompletos || colegiosCompletosMap.get(colegio.id)
                colegioEncontrado = { id: colegio.id, nombre: colegio.nombre, rbd: rbdNum }
                // Si no había nombre, usar el nombre del colegio encontrado
                if (!grupo.colegio.nombre || grupo.colegio.nombre.startsWith('Colegio RBD')) {
                  grupo.colegio.nombre = colegio.nombre || colegio.datosCompletos?.colegio_nombre || grupo.colegio.nombre
                }
                console.log(`[Importación Completa] ✅ Colegio encontrado por RBD: ${grupo.colegio.rbd} → ${grupo.colegio.nombre} (ID: ${colegio.id})`)
              }
            }
          }

          // Prioridad 2: Buscar por nombre si no se encontró por RBD
          if (!colegioId && grupo.colegio.nombre && grupo.colegio.nombre.trim()) {
            const normalizedName = grupo.colegio.nombre
              .toLowerCase()
              .trim()
              .replace(/\s+/g, ' ') // Normalizar espacios múltiples
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
            
            const colegio = colegiosByName.get(normalizedName)
            if (colegio) {
              colegioId = colegio.id
              colegioExistente = colegio.datosCompletos || colegiosCompletosMap.get(colegio.id)
              colegioEncontrado = colegio
              console.log(`[Importación Completa] ✅ Colegio encontrado por nombre: ${colegio.nombre} (ID: ${colegio.id})`)
            }
          }

          // OPTIMIZACIÓN: Si el colegio existe, usar sus datos completos y solo actualizar campos que vengan en el Excel
          if (colegioId && colegioExistente) {
            console.log(`[Importación Completa] 📋 Usando datos existentes del colegio. Solo se actualizarán campos presentes en el Excel.`)
            // El colegio existe, no necesitamos crear ni actualizar (a menos que el usuario quiera actualizar campos específicos)
            // Por ahora, solo usamos el colegio existente sin modificar
          } else if (!colegioId) {
            // Crear colegio solo si no existe
            // OPTIMIZACIÓN: Si solo viene RBD o nombre, intentar buscar una vez más antes de crear
            if (!grupo.colegio.rbd && grupo.colegio.nombre) {
              // Último intento: buscar por nombre sin normalización estricta
              const nombreBusqueda = grupo.colegio.nombre.trim()
              for (const [normalizedName, colegio] of colegiosByName.entries()) {
                if (colegio.nombre.toLowerCase().trim() === nombreBusqueda.toLowerCase().trim()) {
                  colegioId = colegio.id
                  colegioExistente = colegio.datosCompletos || colegiosCompletosMap.get(colegio.id)
                  colegioEncontrado = colegio
                  console.log(`[Importación Completa] ✅ Colegio encontrado en búsqueda flexible: ${colegio.nombre}`)
                  break
                }
              }
            }
            
            if (!colegioId) {
              // El colegio no existe, crear uno nuevo
              if (!grupo.colegio.rbd) {
                results.push({
                  success: false,
                  message: `No se puede crear colegio "${grupo.colegio.nombre}" sin RBD. Si el colegio ya existe, solo necesitas poner su RBD o nombre en el Excel.`,
                  tipo: 'colegio',
                })
                continue
              }

              console.log(`[Importación Completa] ➕ Creando nuevo colegio: ${grupo.colegio.nombre} (RBD: ${grupo.colegio.rbd})`)
              const createColegioResponse = await fetch('/api/crm/colegios', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  colegio_nombre: grupo.colegio.nombre,
                  rbd: grupo.colegio.rbd,
                  ...(grupo.colegio.comuna && { comuna: grupo.colegio.comuna }),
                }),
              })

              const createColegioResult = await createColegioResponse.json()
              
              if (createColegioResponse.ok && createColegioResult.success) {
                const nuevoColegio = createColegioResult.data
                colegioId = nuevoColegio.id || nuevoColegio.documentId
                
                // Guardar datos completos del nuevo colegio
                colegiosCompletosMap.set(colegioId, nuevoColegio)
                
                // Agregar a ambos mapas para futuras búsquedas
                if (grupo.colegio.rbd) {
                  const rbdNum = Number(grupo.colegio.rbd)
                  if (!isNaN(rbdNum)) {
                    colegiosMap.set(rbdNum, { id: colegioId, nombre: grupo.colegio.nombre, datosCompletos: nuevoColegio })
                  }
                }
                
                const normalizedName = grupo.colegio.nombre
                  .toLowerCase()
                  .trim()
                  .replace(/\s+/g, ' ')
                  .normalize('NFD')
                  .replace(/[\u0300-\u036f]/g, '')
                colegiosByName.set(normalizedName, { id: colegioId, nombre: grupo.colegio.nombre, rbd: grupo.colegio.rbd, datosCompletos: nuevoColegio })
                
                results.push({
                  success: true,
                  message: `Colegio "${grupo.colegio.nombre}" creado`,
                  tipo: 'colegio',
                  datos: { id: colegioId, nombre: grupo.colegio.nombre },
                })
              } else {
                results.push({
                  success: false,
                  message: `Error al crear colegio: ${createColegioResult.error || 'Error desconocido'}`,
                  tipo: 'colegio',
                })
                continue
              }
            }
          }

          // 2. Buscar o crear curso
          if (!colegioId) {
            results.push({
              success: false,
              message: 'No se pudo obtener o crear el colegio',
              tipo: 'curso',
            })
            continue
          }

          // Extraer nivel y grado del nombre del curso
          const nivelMatch = grupo.curso.nombre.match(/(Básica|Basica|Media)/i)
          const gradoMatch = grupo.curso.nombre.match(/(\d+)/)
          const nivel = nivelMatch ? (nivelMatch[0].toLowerCase().includes('basica') ? 'Basica' : 'Media') : 'Basica'
          const grado = gradoMatch ? parseInt(gradoMatch[1]) : 1

          const cursosResponse = await fetch(`/api/crm/colegios/${colegioId}/cursos`)
          const cursosResult = await cursosResponse.json()
          
          let cursoId: number | string | null = null
          
          if (cursosResult.success && Array.isArray(cursosResult.data)) {
            const cursoExistente = cursosResult.data.find((curso: any) => {
              const attrs = curso.attributes || curso
              return (
                (attrs.nombre_curso || '').toLowerCase().trim() === grupo.curso.nombre.toLowerCase().trim() &&
                attrs.nivel === nivel &&
                String(attrs.grado || '') === String(grado) &&
                (attrs.año || 0) === (grupo.curso.año || 0)
              )
            })
            
            if (cursoExistente) {
              // Priorizar documentId sobre id numérico (Strapi v5 usa documentId)
              cursoId = cursoExistente.documentId || cursoExistente.id
              console.log(`[Importación Completa] ✅ Curso existente encontrado. ID: ${cursoId} (documentId: ${cursoExistente.documentId}, id: ${cursoExistente.id})`)
            }
          }

          // Crear curso si no existe
          if (!cursoId) {
            const createCursoResponse = await fetch(`/api/crm/colegios/${colegioId}/cursos`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                nombre_curso: grupo.curso.nombre,
                nivel,
                grado: String(grado),
                año: grupo.curso.año || new Date().getFullYear(),
                activo: true,
              }),
            })

            const createCursoResult = await createCursoResponse.json()
            
            if (createCursoResponse.ok && createCursoResult.success) {
              const nuevoCurso = createCursoResult.data
              // Priorizar documentId sobre id (Strapi v5 usa documentId)
              cursoId = nuevoCurso.documentId || nuevoCurso.id
              
              console.log(`[Importación Completa] ✅ Curso "${grupo.curso.nombre}" creado exitosamente`)
              console.log(`[Importación Completa] 📋 Datos del curso creado:`, {
                id: nuevoCurso.id,
                documentId: nuevoCurso.documentId,
                nombre: nuevoCurso.nombre_curso || nuevoCurso.attributes?.nombre_curso,
                nivel: nuevoCurso.nivel || nuevoCurso.attributes?.nivel,
                grado: nuevoCurso.grado || nuevoCurso.attributes?.grado,
                año: nuevoCurso.año || nuevoCurso.attributes?.año,
                cursoIdAsignado: cursoId,
                tipoCursoId: typeof cursoId,
              })
              console.log(`[Importación Completa] 📋 Respuesta completa de creación:`, JSON.stringify(createCursoResult, null, 2))
              
              // Esperar un momento para que Strapi procese el curso recién creado
              // Aumentar el tiempo de espera para dar más tiempo a Strapi
              console.log(`[Importación Completa] ⏳ Esperando 1.5s para que Strapi procese el curso recién creado...`)
              await new Promise(resolve => setTimeout(resolve, 1500))
              
              results.push({
                success: true,
                message: `Curso "${grupo.curso.nombre}" creado`,
                tipo: 'curso',
                datos: { id: cursoId, nombre: grupo.curso.nombre },
              })
            } else {
              results.push({
                success: false,
                message: `Error al crear curso: ${createCursoResult.error || 'Error desconocido'}`,
                tipo: 'curso',
              })
              continue
            }
          }

          // 3. Crear/actualizar versión de materiales con productos
          if (!cursoId) {
            results.push({
              success: false,
              message: 'No se pudo obtener o crear el curso',
              tipo: 'lista',
            })
            continue
          }

          // Ordenar productos por Libro_orden antes de procesarlos
          const productosOrdenados = grupo.productos
            .filter(p => p.Libro_nombre) // Solo productos con nombre
            .sort((a, b) => {
              const ordenA = a.Libro_orden || 999999
              const ordenB = b.Libro_orden || 999999
              return ordenA - ordenB
            })

          // Convertir productos a formato de materiales (formato usado en versiones_materiales)
          const materiales = productosOrdenados.map((producto, index) => ({
              cantidad: producto.Libro_cantidad || 1,
              nombre: producto.Libro_nombre || '',
              isbn: producto.Libro_isbn || null,
              marca: producto.Libro_editorial || null,
              comprar: true,
              precio: 0,
              asignatura: grupo.asignatura.nombre || null,
              descripcion: [
                producto.Libro_autor ? `Autor: ${producto.Libro_autor}` : '',
                producto.Libro_observaciones || '',
                producto.Libro_mes_uso ? `Mes de uso: ${producto.Libro_mes_uso}` : '',
              ].filter(Boolean).join(' | ') || null,
              woocommerce_id: null,
              woocommerce_sku: producto.Libro_codigo || null,
              precio_woocommerce: null,
              stock_quantity: null,
              disponibilidad: 'no_encontrado',
              encontrado_en_woocommerce: false,
              imagen: null,
              coordenadas: null,
              // Campos adicionales para orden (usar el orden del Excel, no el índice)
              orden_asignatura: grupo.asignatura.orden || null,
              orden_producto: producto.Libro_orden || (index + 1),
            }))

          // Procesar PDF para esta versión
          let pdfUrl: string | null = null
          let pdfId: number | null = null
          const grupoKey = `${grupo.colegio.nombre}-${grupo.curso.nombre}-${grupo.asignatura.nombre}-${grupo.lista.nombre}`

          // Prioridad 1: PDF subido manualmente para este grupo
          const pdfSubido = pdfsPorGrupo.get(grupoKey)
          if (pdfSubido) {
            const resultadoPDF = await subirPDFaStrapi(pdfSubido, `${grupo.lista.nombre || 'lista'}.pdf`)
            pdfUrl = resultadoPDF.pdfUrl
            pdfId = resultadoPDF.pdfId
          }
          // Prioridad 2: URL_lista - descargar y subir automáticamente desde la URL
          else if (grupo.lista.url_lista && grupo.lista.url_lista.trim()) {
            try {
              const nombrePDF = `${grupo.lista.nombre || 'lista'}-${grupo.asignatura.nombre || 'asignatura'}.pdf`
              console.log(`[Importación Completa] 📥 Descargando PDF desde URL: ${grupo.lista.url_lista}`)
              const resultadoPDF = await descargarYSubirPDF(grupo.lista.url_lista.trim(), nombrePDF)
              pdfUrl = resultadoPDF.pdfUrl
              pdfId = resultadoPDF.pdfId
              
              if (pdfUrl && pdfId) {
                console.log(`[Importación Completa] ✅ PDF descargado y subido correctamente: ${pdfUrl}`)
              } else {
                console.warn(`[Importación Completa] ⚠️ No se pudo descargar/subir PDF desde: ${grupo.lista.url_lista}`)
              }
            } catch (err: any) {
              console.error(`[Importación Completa] ❌ Error al procesar PDF desde URL: ${grupo.lista.url_lista}`, err)
              // Continuar sin PDF (solo se guarda la URL en metadata)
            }
          }

          // Crear versión de materiales
          const versionMaterial = {
            id: 1,
            nombre_archivo: grupo.lista.nombre || 'Lista de útiles',
            fecha_subida: grupo.lista.fecha_actualizacion || new Date().toISOString(),
            fecha_actualizacion: grupo.lista.fecha_actualizacion || new Date().toISOString(),
            fecha_publicacion: grupo.lista.fecha_publicacion,
            materiales: materiales,
            // Incluir PDF si se subió correctamente
            pdf_url: pdfUrl,
            pdf_id: pdfId,
            metadata: {
              nombre: grupo.lista.nombre,
              asignatura: grupo.asignatura.nombre,
              orden_asignatura: grupo.asignatura.orden,
              url_lista: grupo.lista.url_lista,
              url_publicacion: grupo.lista.url_publicacion,
            },
          }

          // Obtener curso actual para agregar versión (con retry si falla)
          console.log(`[Importación Completa] 📋 Obteniendo curso para agregar versión. CursoId: ${cursoId}, Tipo: ${typeof cursoId}`)
          let versionesExistentes: any[] = []
          let intentos = 0
          const maxIntentos = 3
          
          while (intentos < maxIntentos) {
            try {
              console.log(`[Importación Completa] 🔍 Intento ${intentos + 1}/${maxIntentos}: Obteniendo curso ${cursoId}...`)
              const cursoResponse = await fetch(`/api/crm/cursos/${cursoId}`)
              console.log(`[Importación Completa] 📡 Respuesta del servidor: Status ${cursoResponse.status}`)
              
              const cursoData = await cursoResponse.json()
              console.log(`[Importación Completa] 📦 Datos recibidos:`, {
                success: cursoData.success,
                hasData: !!cursoData.data,
                error: cursoData.error,
                details: cursoData.details,
              })
              
              if (cursoData.success && cursoData.data) {
                const curso = cursoData.data
                const attrs = curso.attributes || curso
                versionesExistentes = attrs.versiones_materiales || []
                console.log(`[Importación Completa] ✅ Curso obtenido correctamente. Versiones existentes: ${versionesExistentes.length}`)
                break // Salir del loop si se obtuvo correctamente
              } else if (intentos < maxIntentos - 1) {
                // Esperar antes de reintentar (solo si no es el último intento)
                const waitTime = 1000 * (intentos + 1)
                console.log(`[Importación Completa] ⏳ Reintentando obtener curso en ${waitTime}ms (intento ${intentos + 1}/${maxIntentos})...`)
                console.log(`[Importación Completa] ⚠️ Error: ${cursoData.error || 'Error desconocido'}`)
                await new Promise(resolve => setTimeout(resolve, waitTime)) // Backoff exponencial
                intentos++
                continue
              } else {
                // Último intento falló, usar array vacío
                console.warn(`[Importación Completa] ⚠️ No se pudo obtener curso después de ${maxIntentos} intentos. Usando versiones vacías.`)
                console.warn(`[Importación Completa] ⚠️ Último error: ${cursoData.error || 'Error desconocido'}`)
                versionesExistentes = []
                break
              }
            } catch (err: any) {
              const errorMessage = err?.message || String(err) || 'Error desconocido'
              console.error(`[Importación Completa] ❌ Excepción al obtener curso (intento ${intentos + 1}/${maxIntentos}):`, {
                message: errorMessage,
                name: err?.name,
                stack: err?.stack?.substring(0, 200),
              })
              
              if (intentos < maxIntentos - 1) {
                const waitTime = 1000 * (intentos + 1)
                console.log(`[Importación Completa] ⏳ Reintentando en ${waitTime}ms...`)
                await new Promise(resolve => setTimeout(resolve, waitTime))
                intentos++
                continue
              } else {
                console.error(`[Importación Completa] ❌ Error al obtener curso después de ${maxIntentos} intentos:`, errorMessage)
                versionesExistentes = []
                break
              }
            }
          }
          
          // Agregar nueva versión
          const versionesActualizadas = [...versionesExistentes, versionMaterial]

          // Actualizar curso con nueva versión
          console.log(`[Importación Completa] 💾 Actualizando curso ${cursoId} (tipo: ${typeof cursoId}) con ${versionesActualizadas.length} versión(es) de materiales...`)
          console.log(`[Importación Completa] 🔍 Verificando curso antes de actualizar...`)
          
          // Verificar que el curso existe antes de intentar actualizar (con retry robusto)
          let cursoExiste = false
          let cursoIdVerificado: string | number | null = null
          
          // Mecanismo de retry robusto para verificar el curso (hasta 5 intentos con backoff exponencial)
          let verifyIntentos = 0
          const maxVerifyIntentos = 5
          
          while (verifyIntentos < maxVerifyIntentos && !cursoExiste) {
            try {
              console.log(`[Importación Completa] 🔍 Verificación ${verifyIntentos + 1}/${maxVerifyIntentos}: Verificando curso ${cursoId}...`)
              const verifyResponse = await fetch(`/api/crm/cursos/${cursoId}`)
              const verifyData = await verifyResponse.json()
              
              if (verifyData.success && verifyData.data) {
                cursoExiste = true
                // Usar el ID que realmente existe en Strapi
                cursoIdVerificado = verifyData.data.documentId || verifyData.data.id || cursoId
                console.log(`[Importación Completa] ✅ Curso verificado exitosamente. ID correcto: ${cursoIdVerificado}`)
                console.log(`[Importación Completa] 📋 Datos del curso verificado:`, {
                  id: verifyData.data.id,
                  documentId: verifyData.data.documentId,
                  nombre: verifyData.data.attributes?.nombre_curso || verifyData.data.nombre_curso,
                })
                break
              } else {
                console.warn(`[Importación Completa] ⚠️ Verificación ${verifyIntentos + 1}/${maxVerifyIntentos}: Curso ${cursoId} no encontrado.`)
                console.warn(`[Importación Completa] ⚠️ Respuesta del servidor:`, {
                  success: verifyData.success,
                  error: verifyData.error,
                  status: verifyResponse.status,
                  statusText: verifyResponse.statusText,
                })
                
                if (verifyIntentos < maxVerifyIntentos - 1) {
                  // Backoff exponencial: 1s, 2s, 3s, 5s
                  const waitTime = verifyIntentos === 0 ? 1000 : verifyIntentos === 1 ? 2000 : verifyIntentos === 2 ? 3000 : 5000
                  console.log(`[Importación Completa] ⏳ Esperando ${waitTime}ms antes del siguiente intento...`)
                  await new Promise(resolve => setTimeout(resolve, waitTime))
                }
                verifyIntentos++
              }
            } catch (err: any) {
              const errorMessage = err?.message || String(err) || 'Error desconocido'
              console.warn(`[Importación Completa] ⚠️ Error en verificación ${verifyIntentos + 1}/${maxVerifyIntentos}:`, errorMessage)
              
              if (verifyIntentos < maxVerifyIntentos - 1) {
                // Backoff exponencial: 1s, 2s, 3s, 5s
                const waitTime = verifyIntentos === 0 ? 1000 : verifyIntentos === 1 ? 2000 : verifyIntentos === 2 ? 3000 : 5000
                console.log(`[Importación Completa] ⏳ Esperando ${waitTime}ms antes del siguiente intento...`)
                await new Promise(resolve => setTimeout(resolve, waitTime))
              }
              verifyIntentos++
            }
          }
          
          // Usar el ID verificado si está disponible, sino usar el original
          const cursoIdParaActualizar = cursoIdVerificado || cursoId
          
          if (!cursoExiste) {
            console.error(`[Importación Completa] ❌ No se pudo encontrar el curso ${cursoId} después de ${maxVerifyIntentos} intentos de verificación`)
            console.error(`[Importación Completa] ❌ Esto puede deberse a: 1) El curso no se creó correctamente, 2) Strapi tiene latencia alta, 3) El ID del curso es incorrecto`)
            console.error(`[Importación Completa] ❌ Información del grupo:`, {
              colegio: grupo.colegio.nombre,
              colegioId: colegioId,
              curso: grupo.curso.nombre,
              cursoId: cursoId,
              tipoCursoId: typeof cursoId,
            })
            results.push({
              success: false,
              message: `Error: Curso no encontrado después de ${maxVerifyIntentos} intentos (ID: ${cursoId}). El curso puede no haberse creado correctamente o Strapi tiene latencia alta.`,
              tipo: 'lista',
            })
            continue
          }
          
          // Intentar actualizar con retry si falla
          let updateSuccess = false
          let updateError: string | null = null
          let updateIntentos = 0
          const maxUpdateIntentos = 3
          
          while (updateIntentos < maxUpdateIntentos && !updateSuccess) {
            try {
              console.log(`[Importación Completa] 📤 Intento ${updateIntentos + 1}/${maxUpdateIntentos}: Actualizando curso ${cursoIdParaActualizar}...`)
              const updateResponse = await fetch(`/api/crm/cursos/${cursoIdParaActualizar}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  versiones_materiales: versionesActualizadas,
                }),
              })

              console.log(`[Importación Completa] 📡 Respuesta de actualización (intento ${updateIntentos + 1}/${maxUpdateIntentos}): Status ${updateResponse.status}`)
              const updateResult = await updateResponse.json()
              console.log(`[Importación Completa] 📦 Resultado de actualización:`, {
                success: updateResult.success,
                error: updateResult.error,
                message: updateResult.message,
                details: updateResult.details,
              })
              
              if (updateResponse.ok && updateResult.success) {
                updateSuccess = true
                console.log(`[Importación Completa] ✅ Lista "${grupo.lista.nombre}" (${grupo.asignatura.nombre}) creada exitosamente con ${materiales.length} productos`)
                results.push({
                  success: true,
                  message: `Lista "${grupo.lista.nombre}" (${grupo.asignatura.nombre}) creada con ${materiales.length} productos`,
                  tipo: 'lista',
                  datos: { cursoId: cursoIdParaActualizar, productos: materiales.length },
                })
                break
              } else {
                updateError = updateResult.error || 'Error desconocido'
                if (updateIntentos < maxUpdateIntentos - 1) {
                  const waitTime = 1000 * (updateIntentos + 1)
                  console.log(`[Importación Completa] ⏳ Reintentando actualización en ${waitTime}ms...`)
                  await new Promise(resolve => setTimeout(resolve, waitTime))
                  updateIntentos++
                } else {
                  break
                }
              }
            } catch (err: any) {
              updateError = err?.message || String(err) || 'Error desconocido'
              if (updateIntentos < maxUpdateIntentos - 1) {
                const waitTime = 1000 * (updateIntentos + 1)
                console.log(`[Importación Completa] ⏳ Error en actualización, reintentando en ${waitTime}ms...`)
                await new Promise(resolve => setTimeout(resolve, waitTime))
                updateIntentos++
              } else {
                break
              }
            }
          }
          
          if (!updateSuccess) {
            console.error(`[Importación Completa] ❌ Error al crear lista después de ${maxUpdateIntentos} intentos:`, updateError)
            results.push({
              success: false,
              message: `Error al crear lista: ${updateError || 'Error desconocido'}`,
              tipo: 'lista',
            })
          }

        } catch (err: any) {
          results.push({
            success: false,
            message: `Error: ${err.message || 'Error desconocido'}`,
            tipo: 'lista',
          })
        }
      }

      setProcessResults(results)
      setStep('complete')
      
      // Llamar a onSuccess inmediatamente después de completar el procesamiento
      // para que la tabla se recargue y muestre los nuevos datos
      console.log('[Importación Completa] ✅ Procesamiento completado, llamando a onSuccess...')
      if (onSuccess) {
        console.log('[Importación Completa] ✅ onSuccess disponible, llamando inmediatamente...')
        onSuccess()
        // Llamar de nuevo después de un delay para asegurar que Strapi haya procesado todo
        setTimeout(() => {
          console.log('[Importación Completa] ✅ Llamando a onSuccess nuevamente después de 2s...')
          if (onSuccess) onSuccess()
        }, 2000)
        setTimeout(() => {
          console.log('[Importación Completa] ✅ Llamando a onSuccess nuevamente después de 5s...')
          if (onSuccess) onSuccess()
        }, 5000)
      } else {
        console.warn('[Importación Completa] ⚠️ onSuccess no está disponible')
      }
    } catch (err: any) {
      setError(`Error al procesar: ${err.message}`)
      setStep('review')
    } finally {
      setProcessing(false)
    }
  }

  // Función para subir PDF a Strapi
  const subirPDFaStrapi = async (pdfFile: File | Blob, nombreArchivo: string): Promise<{ pdfUrl: string | null; pdfId: number | null }> => {
    try {
      const formData = new FormData()
      const file = pdfFile instanceof File ? pdfFile : new File([pdfFile], nombreArchivo, { type: 'application/pdf' })
      formData.append('files', file)

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}))
        console.error('[Importación Completa] Error al subir PDF:', errorData)
        return { pdfUrl: null, pdfId: null }
      }

      const uploadResult = await uploadResponse.json()
      const uploadedFile = Array.isArray(uploadResult) ? uploadResult[0] : uploadResult

      if (uploadedFile) {
        const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://strapi.moraleja.cl'
        const pdfUrl = uploadedFile.url 
          ? (uploadedFile.url.startsWith('http') ? uploadedFile.url : `${strapiUrl}${uploadedFile.url}`)
          : null
        const pdfId = uploadedFile.id || null

        return { pdfUrl, pdfId }
      }

      return { pdfUrl: null, pdfId: null }
    } catch (err: any) {
      console.error('[Importación Completa] Error al subir PDF:', err)
      return { pdfUrl: null, pdfId: null }
    }
  }

  // Función para descargar PDF desde URL y subirlo a Strapi
  // Usa un endpoint API para evitar problemas de CORS
  const descargarYSubirPDF = async (url: string, nombreArchivo: string): Promise<{ pdfUrl: string | null; pdfId: number | null }> => {
    try {
      // Validar que la URL sea válida
      if (!url || !url.trim()) {
        console.error('[Importación Completa] URL vacía o inválida')
        return { pdfUrl: null, pdfId: null }
      }

      // Validar formato de URL
      let urlValidada = url.trim()
      if (!urlValidada.startsWith('http://') && !urlValidada.startsWith('https://')) {
        console.error('[Importación Completa] URL debe comenzar con http:// o https://')
        return { pdfUrl: null, pdfId: null }
      }

      console.log(`[Importación Completa] Descargando PDF desde: ${urlValidada}`)
      
      // Usar endpoint API para descargar desde el servidor (evita CORS)
      const downloadResponse = await fetch('/api/crm/listas/descargar-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: urlValidada }),
      })

      if (!downloadResponse.ok) {
        const errorData = await downloadResponse.json().catch(() => ({}))
        console.error(`[Importación Completa] Error al descargar PDF: ${downloadResponse.status}`, errorData)
        return { pdfUrl: null, pdfId: null }
      }

      const downloadResult = await downloadResponse.json()
      
      if (!downloadResult.success || !downloadResult.data) {
        console.error('[Importación Completa] No se pudo descargar el PDF:', downloadResult.error)
        return { pdfUrl: null, pdfId: null }
      }

      // Convertir base64 a Blob
      const base64Data = downloadResult.data
      const byteCharacters = atob(base64Data)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: downloadResult.contentType || 'application/pdf' })

      console.log(`[Importación Completa] PDF descargado correctamente (${(blob.size / 1024).toFixed(2)} KB), subiendo a Strapi...`)

      // Subir el PDF a Strapi
      return await subirPDFaStrapi(blob, nombreArchivo)
    } catch (err: any) {
      // Capturar información completa del error
      const errorInfo: any = {
        url,
        message: err?.message || String(err) || 'Error desconocido',
        name: err?.name || 'Error',
      }
      
      // Agregar stack solo si existe
      if (err?.stack) {
        errorInfo.stack = err.stack
      }
      
      // Agregar otros campos si existen
      if (err?.status) errorInfo.status = err.status
      if (err?.statusText) errorInfo.statusText = err.statusText
      if (err?.response) errorInfo.response = String(err.response).substring(0, 200)
      
      console.error('[Importación Completa] Error al descargar PDF desde URL:', JSON.stringify(errorInfo, null, 2))
      return { pdfUrl: null, pdfId: null }
    }
  }

  // Manejar subida de PDF para un grupo específico
  const handlePDFUpload = (grupoKey: string, file: File | null) => {
    if (!file) {
      const nuevosPdfs = new Map(pdfsPorGrupo)
      nuevosPdfs.delete(grupoKey)
      setPdfsPorGrupo(nuevosPdfs)
      return
    }

    if (!file.type.includes('pdf')) {
      setError('El archivo debe ser un PDF')
      return
    }

    const nuevosPdfs = new Map(pdfsPorGrupo)
    nuevosPdfs.set(grupoKey, file)
    setPdfsPorGrupo(nuevosPdfs)
    setError(null)
  }

  const handleReset = () => {
    setImportData([])
    setAgrupado(new Map())
    setStep('upload')
    setError(null)
    setProcessResults([])
    setProgress(0)
    setPdfsPorGrupo(new Map())
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClose = () => {
    console.log('[Importación Completa] 🔒 Cerrando modal...')
    handleReset()
    onHide()
  }

  const handleComplete = () => {
    console.log('[Importación Completa] ✅ Procesamiento completado, llamando a onSuccess...')
    if (onSuccess) {
      console.log('[Importación Completa] ✅ onSuccess disponible, llamando...')
      onSuccess()
    } else {
      console.warn('[Importación Completa] ⚠️ onSuccess no está disponible')
    }
    // Cerrar el modal después de llamar a onSuccess
    handleClose()
  }

  const downloadTemplate = () => {
    // Plantilla en formato compacto (más corto y fácil de usar)
    // Orden optimizado: primero datos del colegio, luego curso, luego producto
    const template = [
      // Fila de ayuda (se agregará manualmente después)
      {},
      // Datos de ejemplo realistas
      {
        rbd: 12345,
        Colegio: '',
        nombre_curso: '1º Básico',
        nivel: 'Basica',
        grado: 1,
        año: 2026,
        asignaura: 'Lenguaje y Comunicación',
        orden_asigna: 1,
        ordden_prdo: 1,
        codigo_prod: '9789566430346',
        Producto: 'Lenguaje y Comunicación 1º Básico - Editorial SM',
        URL_lista: 'https://colegio.com/listas/2026/1basico-lenguaje.pdf',
      },
      {
        rbd: 12345,
        Colegio: '',
        nombre_curso: '1º Básico',
        nivel: 'Basica',
        grado: 1,
        año: 2026,
        asignaura: 'Lenguaje y Comunicación',
        orden_asigna: 1,
        ordden_prdo: 2,
        codigo_prod: '9789566430353',
        Producto: 'Cuaderno Universitario 100 hojas',
        URL_lista: 'https://colegio.com/listas/2026/1basico-lenguaje.pdf',
      },
      {
        rbd: 12345,
        Colegio: '',
        nombre_curso: '1º Básico',
        nivel: 'Basica',
        grado: 1,
        año: 2026,
        asignaura: 'Matemáticas',
        orden_asigna: 2,
        ordden_prdo: 1,
        codigo_prod: '9789566430407',
        Producto: 'Matemáticas 1º Básico - Editorial Santillana',
        URL_lista: 'https://colegio.com/listas/2026/1basico-matematicas.pdf',
      },
      {
        rbd: 12345,
        Colegio: '',
        nombre_curso: '1º Básico',
        nivel: 'Basica',
        grado: 1,
        año: 2026,
        asignaura: 'Matemáticas',
        orden_asigna: 2,
        ordden_prdo: 2,
        codigo_prod: 'CUAD-001',
        Producto: 'Cuaderno de Matemáticas cuadriculado',
        URL_lista: 'https://colegio.com/listas/2026/1basico-matematicas.pdf',
      },
    ]
    
    // Crear hoja con encabezados y datos
    const headers = [
      'RBD',
      'Colegio',
      'Curso',
      'Nivel',
      'Grado',
      'Año',
      'Asignatura',
      'Orden Asig.',
      'Orden Prod.',
      'Código',
      'Producto',
      'URL PDF',
    ]
    
    // Crear array de arrays para mejor control
    const dataRows: any[][] = [
      headers, // Fila 1: Encabezados
      [
        '12345',
        '(Opcional si ya existe)',
        '1º Básico',
        'Basica',
        '1',
        '2026',
        'Lenguaje y Comunicación',
        '1',
        '1',
        '9789566430346',
        'Lenguaje y Comunicación 1º Básico',
        'https://colegio.com/lista.pdf',
      ],
      [
        '12345',
        '',
        '1º Básico',
        'Basica',
        '1',
        '2026',
        'Lenguaje y Comunicación',
        '1',
        '2',
        '9789566430353',
        'Cuaderno Universitario 100 hojas',
        'https://colegio.com/lista.pdf',
      ],
      [
        '12345',
        '',
        '1º Básico',
        'Basica',
        '1',
        '2026',
        'Matemáticas',
        '2',
        '1',
        '9789566430407',
        'Matemáticas 1º Básico',
        'https://colegio.com/lista.pdf',
      ],
      [
        '12345',
        '',
        '1º Básico',
        'Basica',
        '1',
        '2026',
        'Matemáticas',
        '2',
        '2',
        'CUAD-001',
        'Cuaderno de Matemáticas cuadriculado',
        'https://colegio.com/lista.pdf',
      ],
    ]
    
    const ws = XLSX.utils.aoa_to_sheet(dataRows)
    
    // Ajustar ancho de columnas para formato compacto (optimizado)
    ws['!cols'] = [
      { wch: 10 }, // RBD
      { wch: 25 }, // Colegio
      { wch: 15 }, // Curso
      { wch: 8 },  // Nivel
      { wch: 6 },  // Grado
      { wch: 6 },  // Año
      { wch: 22 }, // Asignatura
      { wch: 10 }, // Orden Asig.
      { wch: 10 }, // Orden Prod.
      { wch: 15 }, // Código
      { wch: 40 }, // Producto
      { wch: 45 }, // URL PDF
    ]
    
    // Usar directamente los datos sin fila de ayuda
    const wsFinal = XLSX.utils.aoa_to_sheet(dataRows)
    wsFinal['!cols'] = ws['!cols']
    
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, wsFinal, 'Plantilla')
    XLSX.writeFile(wb, 'plantilla-importacion-completa.xlsx')
  }

  const successCount = processResults.filter((r) => r.success).length
  const errorCount = processResults.filter((r) => !r.success).length
  const gruposCount = agrupado.size

  return (
    <Modal show={show} onHide={handleClose} size="xl" centered>
      <ModalHeader closeButton>
        <ModalTitle>Importación Completa de Listas (Plantilla Completa)</ModalTitle>
      </ModalHeader>
      <ModalBody>
        {step === 'upload' && (
          <div>
            <Alert variant="info" className="mb-3">
              <strong>Instrucciones:</strong>
              <ul className="mb-0 mt-2">
                <li><strong>Columnas requeridas:</strong> Colegio, RBD, Curso, Año_curso, Asignatura, Lista_nombre, Libro_nombre</li>
                <li><strong>🔍 Verificación automática:</strong> El sistema verifica si el colegio ya existe en la base de datos buscando por <strong>RBD</strong> o <strong>nombre</strong>.</li>
                <li><strong>✅ Si el colegio está en el sistema:</strong> Solo necesitas poner su <strong>RBD</strong> o <strong>nombre</strong> en el Excel. El sistema usará automáticamente los datos existentes (dirección, teléfono, etc.). No necesitas completar todos los campos.</li>
                <li><strong>➕ Si el colegio NO está en el sistema:</strong> Necesitas <strong>RBD</strong> (obligatorio) y <strong>nombre</strong>. La comuna es opcional. El sistema creará el colegio nuevo.</li>
                <li><strong>📄 PDFs:</strong> Sube en el paso de revisión o usa <strong>URL_lista</strong> en el Excel para descarga automática.</li>
                <li>El sistema agrupa automáticamente y crea cursos si no existen.</li>
              </ul>
            </Alert>

            <div className="d-flex gap-2 align-items-end mb-3">
              <div className="flex-grow-1">
                <FormGroup className="mb-0">
                  <FormLabel>Subir archivo Excel/CSV</FormLabel>
                  <FormControl
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    ref={fileInputRef}
                  />
                </FormGroup>
              </div>
              <Button variant="outline-primary" onClick={downloadTemplate}>
                <LuDownload className="me-2" />
                Descargar Plantilla
              </Button>
            </div>

            {error && <Alert variant="danger" className="mt-3">{error}</Alert>}
          </div>
        )}

        {step === 'review' && (
          <div>
            <Alert variant="info" className="mb-3">
              <strong>Revisión de datos:</strong> Se encontraron {importData.length} productos agrupados en {gruposCount} listas únicas.
            </Alert>

            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <Table striped bordered hover size="sm">
                <thead>
                  <tr>
                    <th>Colegio</th>
                    <th>Curso</th>
                    <th>Asignatura</th>
                    <th>Lista</th>
                    <th>Productos</th>
                    <th>PDF</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(agrupado.entries()).map(([grupoKey, grupo], index) => {
                    const tienePDFSubido = pdfsPorGrupo.has(grupoKey)
                    const tieneURLPDF = !!grupo.lista.url_lista
                    return (
                      <tr key={index}>
                        <td>
                          {grupo.colegio.nombre} {grupo.colegio.rbd && `(RBD: ${grupo.colegio.rbd})`}
                          {grupo.colegio.existe && (
                            <Badge bg="success" className="ms-2" title="Este colegio ya existe en la base de datos. Solo se agregarán los cursos.">
                              ✓ Existe
                            </Badge>
                          )}
                          {grupo.colegio.existe === false && (
                            <Badge bg="warning" className="ms-2" title="Este colegio será creado. Asegúrate de tener RBD y nombre.">
                              ➕ Nuevo
                            </Badge>
                          )}
                        </td>
                        <td>
                          {grupo.curso.nombre}
                          {grupo.curso.año && ` (Año: ${grupo.curso.año})`}
                        </td>
                        <td>{grupo.asignatura.nombre} {grupo.asignatura.orden && `(Orden: ${grupo.asignatura.orden})`}</td>
                        <td>{grupo.lista.nombre}</td>
                        <td><Badge bg="info">{grupo.productos.length}</Badge></td>
                        <td>
                          <div className="d-flex flex-column gap-1">
                            {tienePDFSubido && (
                              <Badge bg="success" className="w-100">
                                <LuFileText className="me-1" size={12} />
                                PDF listo
                              </Badge>
                            )}
                            {!tienePDFSubido && tieneURLPDF && (
                              <Badge bg="warning" className="w-100">
                                <LuFileText className="me-1" size={12} />
                                URL disponible
                              </Badge>
                            )}
                            {!tienePDFSubido && !tieneURLPDF && (
                              <Badge bg="secondary" className="w-100">
                                Sin PDF
                              </Badge>
                            )}
                            <FormControl
                              type="file"
                              accept=".pdf"
                              size="sm"
                              onChange={(e) => {
                                const file = e.target.files?.[0] || null
                                handlePDFUpload(grupoKey, file)
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </Table>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="text-center">
            <Spinner animation="border" className="mb-3" />
            <p>Procesando {gruposCount} listas...</p>
            <ProgressBar now={progress} label={`${Math.round(progress)}%`} className="mb-3" />
          </div>
        )}

        {step === 'complete' && (
          <div>
            <Alert variant={errorCount === 0 ? 'success' : 'warning'} className="mb-3">
              <strong>Procesamiento completado:</strong>
              <ul className="mb-0 mt-2">
                <li>✅ Exitosos: {successCount}</li>
                <li>❌ Errores: {errorCount}</li>
              </ul>
            </Alert>

            {errorCount > 0 && (
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                <h6>Errores:</h6>
                <ul>
                  {processResults
                    .filter((r) => !r.success)
                    .map((r, idx) => (
                      <li key={idx}>
                        [{r.tipo}] {r.message}
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        {step === 'upload' && (
          <>
            <Button variant="secondary" onClick={handleClose}>
              Cancelar
            </Button>
          </>
        )}
        {step === 'review' && (
          <>
            <Button variant="secondary" onClick={() => setStep('upload')}>
              Volver
            </Button>
            <Button variant="primary" onClick={handleProcess} disabled={processing}>
              {processing ? <Spinner size="sm" /> : 'Procesar'}
            </Button>
          </>
        )}
        {step === 'processing' && (
          <Button variant="secondary" disabled>
            Procesando...
          </Button>
        )}
        {step === 'complete' && (
          <>
            <Button variant="secondary" onClick={handleReset}>
              Nueva Importación
            </Button>
            <Button variant="primary" onClick={handleComplete}>
              Cerrar
            </Button>
          </>
        )}
      </ModalFooter>
    </Modal>
  )
}
