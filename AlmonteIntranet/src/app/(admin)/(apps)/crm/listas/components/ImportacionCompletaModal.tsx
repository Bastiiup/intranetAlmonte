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
import { LuUpload, LuFileText, LuCheck, LuX, LuDownload, LuFileSpreadsheet, LuMinimize2, LuMaximize2 } from 'react-icons/lu'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'

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
    existe?: boolean
    datosCompletos?: any
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

// Funciones de normalización y extracción de componentes (disponibles para todo el componente)
const normalizeCurso = (nombre: string) => {
  return nombre
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    .replace(/[°º°o]/g, '') // Quitar símbolos de grado y "o" después del número
    .replace(/[^\w]/g, '') // Quitar TODOS los caracteres especiales, dejar solo letras y números
}

const extractComponents = (nombre: string) => {
  // Normalización más agresiva para extraer componentes
  let textoLimpio = nombre
    .toLowerCase()
    .trim()
    .replace(/[-_\.]/g, ' ') // Convertir guiones, guiones bajos y puntos a espacios
    .replace(/\s+/g, ' ') // Normalizar espacios múltiples
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    .replace(/[°º°]/g, '') // Quitar símbolos de grado
  
  // Convertir palabras ordinales a números ANTES de normalizar "o" después de números
  const ordinales: { [key: string]: string } = {
    'primero': '1',
    'primera': '1',
    'segundo': '2',
    'segunda': '2',
    'tercero': '3',
    'tercera': '3',
    'cuarto': '4',
    'cuarta': '4',
    'quinto': '5',
    'quinta': '5',
    'sexto': '6',
    'sexta': '6',
    'septimo': '7',
    'septima': '7',
    'octavo': '8',
    'octava': '8',
    'noveno': '9',
    'novena': '9',
    'decimo': '10',
    'decima': '10',
  }
  
  // Reemplazar palabras ordinales por números
  for (const [palabra, numero] of Object.entries(ordinales)) {
    const regex = new RegExp(`\\b${palabra}\\b`, 'gi')
    textoLimpio = textoLimpio.replace(regex, numero)
  }
  
  // Normalizar "o" después de números (cualquier número: 1o, 2o, 3o, 5o, 10o, etc.)
  textoLimpio = textoLimpio.replace(/(\d+)\s*[oº°]/gi, '$1')
  
  // Normalizar plurales y variaciones de nivel
  const nivelNormalizado = textoLimpio
    .replace(/\bbasicos\b/gi, 'basico')
    .replace(/\bbasicas\b/gi, 'basica')
    .replace(/\bbasico\b/gi, 'basico')
    .replace(/\bbasica\b/gi, 'basica')
    .replace(/\bmedios\b/gi, 'medio')
    .replace(/\bmedias\b/gi, 'media')
    .replace(/\bmedio\b/gi, 'medio')
    .replace(/\bmedia\b/gi, 'media')
    // Variaciones adicionales
    .replace(/\bprimaria\b/gi, 'basica')
    .replace(/\bsecundaria\b/gi, 'media')
    .replace(/\belemental\b/gi, 'basica')
  
  const normalized = normalizeCurso(nombre)
  
  // Extraer TODOS los números (grado puede ser cualquier número: 1, 2, 3, 5, 10, etc.)
  // También buscar números en textoLimpio (que ya tiene ordinales convertidos)
  const numerosNormalizados = textoLimpio.match(/\d+/g) || []
  const numeros = normalized.match(/\d+/g) || []
  // Combinar ambos arrays y eliminar duplicados
  const todosNumeros = [...new Set([...numerosNormalizados, ...numeros])]
  
  // Extraer nivel con múltiples patrones y variaciones
  let nivel = ''
  const patronesNivel = [
    /\b(basica|basico)\w*\b/i,
    /\b(media|medio)\w*\b/i,
    /\bprimaria\w*\b/i,
    /\bsecundaria\w*\b/i,
    /\belemental\w*\b/i,
  ]
  
  for (const patron of patronesNivel) {
    const match = nivelNormalizado.match(patron)
    if (match) {
      const nivelEncontrado = match[1].toLowerCase()
      // Normalizar a basico/basica o medio/media
      if (nivelEncontrado.includes('basic') || nivelEncontrado.includes('primaria') || nivelEncontrado.includes('elemental')) {
        nivel = nivelEncontrado.startsWith('basico') ? 'basico' : 'basica'
      } else if (nivelEncontrado.includes('medi') || nivelEncontrado.includes('secundaria')) {
        nivel = nivelEncontrado.startsWith('medio') ? 'medio' : 'media'
      } else {
        nivel = nivelEncontrado
      }
      break
    }
  }
  
  // Si no se encontró nivel, intentar buscar en el texto normalizado completo
  if (!nivel) {
    const textoCompleto = normalized
    if (textoCompleto.includes('basic')) {
      nivel = 'basico'
    } else if (textoCompleto.includes('medi')) {
      nivel = 'medio'
    }
  }
  
  // Determinar año PRIMERO (número de 4 dígitos entre 2000-2100)
  const año4Digitos = todosNumeros.find(n => n.length === 4 && parseInt(n) >= 2000 && parseInt(n) <= 2100)
  const año = año4Digitos || ''
  
  // Determinar grado (cualquier número de 1-2 dígitos que NO sea el año)
  // Priorizar números de 1-2 dígitos como grado (1, 2, 3, 5, 10, etc.)
  let grado = ''
  if (todosNumeros.length > 0) {
    // Filtrar números que NO sean el año y que tengan 1-2 dígitos
    const posiblesGrados = todosNumeros.filter(n => {
      const num = parseInt(n)
      return n.length <= 2 && n !== año && num >= 1 && num <= 12 // Grados típicamente van de 1 a 12
    })
    
    if (posiblesGrados.length > 0) {
      grado = posiblesGrados[0]
    } else {
      // Si no hay números de 1-2 dígitos, tomar el primero que no sea el año
      const otrosNumeros = todosNumeros.filter(n => n !== año)
      grado = otrosNumeros[0] || ''
    }
  }
  
  return {
    normalized,
    numeros: todosNumeros,
    nivel,
    grado,
    año,
    textoOriginal: nombre, // Guardar original para debugging
  }
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
  const [minimized, setMinimized] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('importacion-completa-minimized')
      return saved === 'true'
    }
    return false
  })
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default')
  const [processResults, setProcessResults] = useState<ProcessResult[]>([])

  // Solicitar permiso de notificaciones al montar el componente
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        setNotificationPermission(permission)
      })
    } else if ('Notification' in window) {
      setNotificationPermission(Notification.permission)
    }
  }, [])

  // Resetear estado minimizado cuando se abre el modal (si no hay proceso en curso)
  useEffect(() => {
    if (show) {
      if (typeof window !== 'undefined') {
        const isProcessing = localStorage.getItem('importacion-completa-processing') === 'true'
        // Si no hay proceso en curso, resetear el estado minimizado
        if (!isProcessing && !processing) {
          setMinimized(false)
          localStorage.removeItem('importacion-completa-minimized')
          localStorage.removeItem('importacion-completa-processing')
          localStorage.removeItem('importacion-completa-progress')
        }
      }
    }
  }, [show, processing])

  // Detectar si debemos abrir el modal automáticamente al restaurar
  useEffect(() => {
    if (typeof window !== 'undefined' && show) {
      const shouldRestore = localStorage.getItem('importacion-completa-restore-modal') === 'true'
      if (shouldRestore) {
        // Si el modal está abierto y hay un proceso en curso, restaurar el estado minimizado
        const isMinimized = localStorage.getItem('importacion-completa-minimized') === 'true'
        if (isMinimized) {
          setMinimized(false)
          localStorage.removeItem('importacion-completa-restore-modal')
        }
      }
    }
  }, [show])

  // Persistir estado de minimización en localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (minimized) {
        localStorage.setItem('importacion-completa-minimized', 'true')
        localStorage.setItem('importacion-completa-processing', processing ? 'true' : 'false')
        localStorage.setItem('importacion-completa-progress', progress.toString())
      } else {
        localStorage.removeItem('importacion-completa-minimized')
        if (!processing) {
          localStorage.removeItem('importacion-completa-processing')
          localStorage.removeItem('importacion-completa-progress')
        }
      }
    }
  }, [minimized, processing, progress])

  // Restaurar estado de procesamiento al montar si estaba minimizado
  useEffect(() => {
    if (typeof window !== 'undefined' && minimized) {
      const wasProcessing = localStorage.getItem('importacion-completa-processing') === 'true'
      const savedProgress = localStorage.getItem('importacion-completa-progress')
      
      if (wasProcessing && savedProgress) {
        setProcessing(true)
        setProgress(parseInt(savedProgress, 10))
        setStep('processing')
      }
    }
  }, [minimized])

  // Función para mostrar notificación
  const mostrarNotificacion = (titulo: string, mensaje: string, tipo: 'success' | 'error' | 'info' = 'info') => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const icon = tipo === 'success' ? '✅' : tipo === 'error' ? '❌' : 'ℹ️'
      const notification = new Notification(`${icon} ${titulo}`, {
        body: mensaje,
        icon: '/favicon.ico',
        tag: 'importacion-completa',
        requireInteraction: false,
      })

      notification.onclick = () => {
        window.focus()
        setMinimized(false)
        notification.close()
      }

      // Cerrar automáticamente después de 5 segundos
      setTimeout(() => {
        notification.close()
      }, 5000)
    }
  }

  const fileInputRef = useRef<HTMLInputElement>(null)
  // Estado para almacenar PDFs por grupo (clave del grupo -> File[])
  // Permite múltiples PDFs por grupo (versiones)
  const [pdfsPorGrupo, setPdfsPorGrupo] = useState<Map<string, File[]>>(new Map())
  // Estados para importación masiva de PDFs
  const [excelPDFsFile, setExcelPDFsFile] = useState<File | null>(null)
  const [zipPDFsFile, setZipPDFsFile] = useState<File | null>(null)
  const [loadingPDFsImport, setLoadingPDFsImport] = useState(false)
  const excelPDFsInputRef = useRef<HTMLInputElement>(null)
  const zipPDFsInputRef = useRef<HTMLInputElement>(null)

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
          // Solo loggear en modo debug para reducir verbosidad
          // console.log(`[Importación Completa] 🔍 Buscando URL en columnas:`, keys)
          
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
          
          // No loggear warning si no hay URL - es normal que no todas las filas tengan URL
          // console.log(`[Importación Completa] ⚠️ No se encontró URL en la fila. Columnas disponibles:`, keys)
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
              if (row.Curso) {
                const nivelMatch = row.Curso.match(/(Básica|Basica|Media)/i)
                if (nivelMatch) {
                  nivel = nivelMatch[0].toLowerCase().includes('basica') ? 'Basica' : 'Media'
                }
              }
            }
            
            if (row.grado || row.Grado) {
              // Grado viene en columna separada
              grado = parseInt(String(row.grado || row.Grado)) || 1
            } else {
              // Extraer del nombre del curso
              if (row.Curso) {
                const gradoMatch = row.Curso.match(/(\d+)/)
                if (gradoMatch) {
                  grado = parseInt(gradoMatch[1]) || 1
                }
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
                nombre: row.Curso || '',
                año: row.Año_curso,
                orden: row.Orden_curso,
              },
              asignatura: {
                nombre: row.Asignatura || '',
                orden: row.Orden_asignatura,
              },
              lista: {
                nombre: listaNombre || '',
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

      // Mapa para cachear cursos ya procesados: clave = colegioId|nombreCurso|nivel|grado|año -> cursoId
      // Esto evita duplicar cursos cuando el mismo curso aparece con diferentes asignaturas/PDFs
      const cursosProcesadosMap = new Map<string, number | string>()

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
          if (grupo.colegio.rbd !== null && grupo.colegio.rbd !== undefined) {
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
                if (colegioId) {
                  colegiosCompletosMap.set(colegioId, nuevoColegio)
                }
                
                // Agregar a ambos mapas para futuras búsquedas
                if (grupo.colegio.rbd && colegioId) {
                  const rbdNum = Number(grupo.colegio.rbd)
                  if (!isNaN(rbdNum)) {
                    colegiosMap.set(rbdNum, { id: colegioId, nombre: grupo.colegio.nombre, datosCompletos: nuevoColegio })
                  }
                }
                
                if (colegioId) {
                  const normalizedName = grupo.colegio.nombre
                    .toLowerCase()
                    .trim()
                    .replace(/\s+/g, ' ')
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                  colegiosByName.set(normalizedName, { id: colegioId, nombre: grupo.colegio.nombre, rbd: grupo.colegio.rbd, datosCompletos: nuevoColegio })
                }
                
                results.push({
                  success: true,
                  message: `Colegio "${grupo.colegio.nombre}" creado`,
                  tipo: 'colegio',
                  datos: { id: colegioId, nombre: grupo.colegio.nombre },
                })
              } else {
                // Si el error es que el RBD ya existe, buscar el colegio existente y usarlo
                const errorMessage = createColegioResult.error || ''
                if (errorMessage.includes('RBD') && (errorMessage.includes('ya existe') || errorMessage.includes('existe'))) {
                  console.log(`[Importación Completa] ⚠️ RBD ya existe, buscando colegio existente...`)
                  
                  // Buscar el colegio por RBD - primero en el mapa, luego en la API
                  if (grupo.colegio.rbd) {
                    const rbdNum = Number(grupo.colegio.rbd)
                    if (!isNaN(rbdNum)) {
                      // Primero intentar en el mapa en memoria
                      if (colegiosMap.has(rbdNum)) {
                        const colegio = colegiosMap.get(rbdNum)!
                        colegioId = colegio.id
                        colegioExistente = colegio.datosCompletos || colegiosCompletosMap.get(colegio.id)
                        colegioEncontrado = { id: colegio.id, nombre: colegio.nombre, rbd: rbdNum }
                        
                        // Actualizar nombre si no estaba definido
                        if (!grupo.colegio.nombre || grupo.colegio.nombre.startsWith('Colegio RBD')) {
                          grupo.colegio.nombre = colegio.nombre || colegio.datosCompletos?.colegio_nombre || grupo.colegio.nombre
                        }
                        
                        console.log(`[Importación Completa] ✅ Colegio existente encontrado por RBD en mapa: ${colegio.nombre} (ID: ${colegioId})`)
                      } else {
                        // Si no está en el mapa, buscar directamente en la API
                        console.log(`[Importación Completa] 🔍 RBD no encontrado en mapa, buscando en API...`)
                        try {
                          const searchResponse = await fetch(`/api/crm/colegios?rbd=${rbdNum}&page=1&pageSize=1`)
                          const searchResult = await searchResponse.json()
                          
                          if (searchResult.success && searchResult.data && searchResult.data.length > 0) {
                            const colegioEncontradoAPI = searchResult.data[0]
                            colegioId = colegioEncontradoAPI.id || colegioEncontradoAPI.documentId
                            colegioExistente = colegioEncontradoAPI
                            if (colegioId !== null && colegioId !== undefined) {
                              colegioEncontrado = { 
                                id: colegioId, 
                                nombre: colegioEncontradoAPI.colegio_nombre || colegioEncontradoAPI.nombre || grupo.colegio.nombre, 
                                rbd: rbdNum 
                              }
                              
                              // Actualizar nombre
                              if (!grupo.colegio.nombre || grupo.colegio.nombre.startsWith('Colegio RBD')) {
                                grupo.colegio.nombre = colegioEncontrado.nombre
                              }
                              
                              // Agregar al mapa para futuras búsquedas
                              colegiosMap.set(rbdNum, { id: colegioId, nombre: colegioEncontrado.nombre, datosCompletos: colegioEncontradoAPI })
                              colegiosCompletosMap.set(colegioId, colegioEncontradoAPI)
                              
                              console.log(`[Importación Completa] ✅ Colegio existente encontrado por RBD en API: ${colegioEncontrado.nombre} (ID: ${colegioId})`)
                            }
                          } else {
                            // Intentar buscar por nombre como último recurso
                            const nombreBusqueda = grupo.colegio.nombre.trim().toLowerCase()
                            for (const [normalizedName, colegio] of colegiosByName.entries()) {
                              if (normalizedName === nombreBusqueda || 
                                  colegio.nombre.toLowerCase().trim() === nombreBusqueda) {
                                colegioId = colegio.id
                                colegioExistente = colegio.datosCompletos || colegiosCompletosMap.get(colegio.id)
                                colegioEncontrado = colegio
                                console.log(`[Importación Completa] ✅ Colegio existente encontrado por nombre: ${colegio.nombre} (ID: ${colegioId})`)
                                break
                              }
                            }
                          }
                        } catch (searchError: any) {
                          console.warn(`[Importación Completa] ⚠️ Error al buscar colegio en API:`, searchError)
                          // Intentar buscar por nombre como último recurso
                          const nombreBusqueda = grupo.colegio.nombre.trim().toLowerCase()
                          for (const [normalizedName, colegio] of colegiosByName.entries()) {
                            if (normalizedName === nombreBusqueda || 
                                colegio.nombre.toLowerCase().trim() === nombreBusqueda) {
                              colegioId = colegio.id
                              colegioExistente = colegio.datosCompletos || colegiosCompletosMap.get(colegio.id)
                              colegioEncontrado = colegio
                              console.log(`[Importación Completa] ✅ Colegio existente encontrado por nombre: ${colegio.nombre} (ID: ${colegioId})`)
                              break
                            }
                          }
                        }
                      }
                    }
                  }
                  
                  // Si encontramos el colegio, continuar normalmente (no agregar error)
                  if (colegioId) {
                    console.log(`[Importación Completa] ✅ Usando colegio existente. Continuando con la importación de listas...`)
                    // NO hacer continue, simplemente continuar con el flujo normal
                  } else {
                    // Si aún no encontramos el colegio, entonces sí es un error
                    results.push({
                      success: false,
                      message: `Error: El RBD ${grupo.colegio.rbd} ya existe pero no se pudo encontrar el colegio. ${createColegioResult.error || 'Error desconocido'}`,
                      tipo: 'colegio',
                    })
                    continue
                  }
                } else {
                  // Otro tipo de error, reportarlo
                  results.push({
                    success: false,
                    message: `Error al crear colegio: ${createColegioResult.error || 'Error desconocido'}`,
                    tipo: 'colegio',
                  })
                  continue
                }
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

          // Crear clave única para el curso: colegioId|nombreCurso|nivel|grado|año
          // Esto permite reutilizar el mismo curso cuando aparece con diferentes asignaturas/PDFs
          const cursoKey = `${colegioId}|${grupo.curso.nombre.toLowerCase().trim()}|${nivel}|${grado}|${grupo.curso.año || new Date().getFullYear()}`
          
          // Verificar si ya procesamos este curso en un grupo anterior
          let cursoId: number | string | null = cursosProcesadosMap.get(cursoKey) || null
          
          if (cursoId) {
            console.log(`[Importación Completa] ♻️ Reutilizando curso ya procesado: ${grupo.curso.nombre} (ID: ${cursoId})`)
          } else {
            // Buscar curso existente en Strapi
            const cursosResponse = await fetch(`/api/crm/colegios/${colegioId}/cursos`)
            const cursosResult = await cursosResponse.json()
            
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
                // Guardar en el mapa para reutilizar en siguientes grupos (solo si cursoId no es null)
                if (cursoId) {
                  cursosProcesadosMap.set(cursoKey, cursoId)
                  console.log(`[Importación Completa] ✅ Curso existente encontrado. ID: ${cursoId} (documentId: ${cursoExistente.documentId}, id: ${cursoExistente.id})`)
                } else {
                  console.warn(`[Importación Completa] ⚠️ Curso existente encontrado pero sin ID válido (documentId: ${cursoExistente.documentId}, id: ${cursoExistente.id})`)
                }
              }
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
                año: grupo.curso.año || new Date().getFullYear(), // Usar "año" con acento (igual que otros endpoints)
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
              
              // Guardar en el mapa para reutilizar en siguientes grupos con el mismo curso
              if (cursoId) {
                cursosProcesadosMap.set(cursoKey, cursoId)
                console.log(`[Importación Completa] 💾 Curso guardado en mapa de cache (clave: ${cursoKey}) para reutilización`)
              }
              
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
          
          // Generar grupoKey usando la misma lógica que al agrupar (para que coincida con las claves de pdfsPorGrupo)
          // Usar el identificador del colegio (RBD_xxx o nombre) en lugar del nombre completo
          const identificadorColegio = grupo.colegio.rbd ? `RBD_${grupo.colegio.rbd}` : (grupo.colegio.nombre || '')
          const grupoKey = `${identificadorColegio}|${grupo.curso.nombre}|${grupo.asignatura.nombre}|${grupo.lista.nombre}`
          
          // También buscar con la clave alternativa (nombre del colegio con guiones) por compatibilidad
          const grupoKeyAlternativo = `${grupo.colegio.nombre}-${grupo.curso.nombre}-${grupo.asignatura.nombre}-${grupo.lista.nombre}`
          
          // Array para guardar todos los PDFs subidos exitosamente (para crear múltiples versiones)
          const pdfsSubidosConExito: Array<{ pdfUrl: string; pdfId: number; nombre: string; fecha: string }> = []

          // Prioridad 1: PDF(s) subido(s) manualmente para este grupo
          // Procesar todos los PDFs (versiones) asignados a este grupo
          // Buscar en ambas claves posibles
          const pdfsSubidos = pdfsPorGrupo.get(grupoKey) || pdfsPorGrupo.get(grupoKeyAlternativo) || []
          
          console.log(`[Importación Completa] 🔍 Buscando PDFs para grupo:`, {
            grupoKey,
            grupoKeyAlternativo,
            pdfsEnGrupoKey: pdfsPorGrupo.get(grupoKey)?.length || 0,
            pdfsEnGrupoKeyAlternativo: pdfsPorGrupo.get(grupoKeyAlternativo)?.length || 0,
            pdfsEncontrados: pdfsSubidos.length,
            todasLasClaves: Array.from(pdfsPorGrupo.keys()),
            colegioRBD: grupo.colegio.rbd,
            colegioNombre: grupo.colegio.nombre,
            identificadorColegio,
          })
          
          // Enviar log al sistema de logs
          try {
            await fetch('/api/crm/listas/importacion-completa-logs', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                level: 'log',
                message: `[Importación Completa] 🔍 Buscando PDFs para grupo: ${grupoKey}`,
                data: {
                  grupoKey,
                  grupoKeyAlternativo,
                  pdfsEnGrupoKey: pdfsPorGrupo.get(grupoKey)?.length || 0,
                  pdfsEnGrupoKeyAlternativo: pdfsPorGrupo.get(grupoKeyAlternativo)?.length || 0,
                  pdfsEncontrados: pdfsSubidos.length,
                  colegioRBD: grupo.colegio.rbd,
                  colegioNombre: grupo.colegio.nombre,
                  todasLasClaves: Array.from(pdfsPorGrupo.keys()).slice(0, 10), // Solo primeras 10 para no saturar
                },
              }),
            })
          } catch (e) {
            // Ignorar errores de logging
          }
          
          // 🔍 LOG: Verificar qué PDFs tenemos disponibles
          const urlListaValue = grupo.lista.url_lista
          const urlListaTrimmed = urlListaValue ? String(urlListaValue).trim() : ''
          const tieneURL = !!(urlListaValue && urlListaTrimmed)
          
          console.log(`[Importación Completa] 🔍 Verificando PDFs para grupo ${grupoKey}:`)
          console.log(`  - PDFs subidos manualmente: ${pdfsSubidos.length}`)
          console.log(`  - URL_lista (raw): ${urlListaValue}`)
          console.log(`  - URL_lista (trimmed): ${urlListaTrimmed}`)
          console.log(`  - Tiene URL válida: ${tieneURL}`)
          console.log(`  - Tipo de url_lista: ${typeof urlListaValue}`)
          
          if (pdfsSubidos.length > 0) {
            console.log(`[Importación Completa] 📄 Subiendo ${pdfsSubidos.length} PDF(s) para el grupo: ${grupoKey}`)
            
            // Subir todos los PDFs y guardar sus URLs e IDs
            for (let i = 0; i < pdfsSubidos.length; i++) {
              const pdf = pdfsSubidos[i]
              const nombrePDF = i === 0 
                ? `${grupo.lista.nombre || 'lista'}.pdf`
                : `${grupo.lista.nombre || 'lista'}_v${i + 1}.pdf`
              
              try {
                console.log(`[Importación Completa] 📤 Subiendo PDF ${i + 1}/${pdfsSubidos.length}: ${pdf.name}`)
                const resultadoPDF = await subirPDFaStrapi(pdf, nombrePDF)
                
                if (resultadoPDF.pdfUrl && resultadoPDF.pdfId) {
                  pdfsSubidosConExito.push({
                    pdfUrl: resultadoPDF.pdfUrl,
                    pdfId: resultadoPDF.pdfId,
                    nombre: nombrePDF,
                    fecha: new Date().toISOString(),
                  })
                  console.log(`[Importación Completa] ✅ PDF ${i + 1}/${pdfsSubidos.length} subido exitosamente: ${resultadoPDF.pdfUrl}`)
                } else {
                  console.warn(`[Importación Completa] ⚠️ PDF ${i + 1}/${pdfsSubidos.length} no se pudo subir correctamente`)
                }
                
                // Pequeño delay entre subidas para evitar saturar Strapi
                if (i < pdfsSubidos.length - 1) {
                  await new Promise(resolve => setTimeout(resolve, 500))
                }
              } catch (err: any) {
                console.error(`[Importación Completa] ❌ Error al subir PDF ${i + 1}/${pdfsSubidos.length}:`, err)
                // Continuar con los demás PDFs
              }
            }
            
            // Usar el último PDF subido exitosamente para la versión principal
            if (pdfsSubidosConExito.length > 0) {
              const ultimoPDFExitoso = pdfsSubidosConExito[pdfsSubidosConExito.length - 1]
              pdfUrl = ultimoPDFExitoso.pdfUrl
              pdfId = ultimoPDFExitoso.pdfId
              console.log(`[Importación Completa] ✅ ${pdfsSubidosConExito.length} PDF(s) subido(s) exitosamente. Usando el último para versión principal.`)
              
              // Enviar log al sistema de logs
              try {
                await fetch('/api/crm/listas/importacion-completa-logs', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    level: 'log',
                    message: `[Importación Completa] ✅ ${pdfsSubidosConExito.length} PDF(s) subido(s) exitosamente para grupo: ${grupoKey}`,
                    data: {
                      grupoKey,
                      cantidadPDFs: pdfsSubidosConExito.length,
                      pdfsSubidos: pdfsSubidosConExito.map(p => ({
                        nombre: p.nombre,
                        pdfId: p.pdfId,
                        pdfUrl: p.pdfUrl ? p.pdfUrl.substring(0, 100) + '...' : null,
                      })),
                      pdfUrlFinal: pdfUrl ? pdfUrl.substring(0, 100) + '...' : null,
                      pdfIdFinal: pdfId,
                    },
                  }),
                })
              } catch (e) {
                // Ignorar errores de logging
              }
            } else {
              console.warn(`[Importación Completa] ⚠️ Ningún PDF se subió exitosamente para el grupo: ${grupoKey}`)
              
              // Enviar log de advertencia
              try {
                await fetch('/api/crm/listas/importacion-completa-logs', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    level: 'warn',
                    message: `[Importación Completa] ⚠️ Ningún PDF se subió exitosamente para el grupo: ${grupoKey}`,
                    data: {
                      grupoKey,
                      pdfsSubidos: pdfsSubidos.length,
                      pdfsSubidosConExito: pdfsSubidosConExito.length,
                      tieneURL: !!grupo.lista.url_lista,
                    },
                  }),
                })
              } catch (e) {
                // Ignorar errores de logging
              }
            }
          }
          
          // Prioridad 2: URL_lista - descargar y subir automáticamente desde la URL
          // Solo si NO hay PDFs subidos manualmente O si ninguno se subió exitosamente
          const urlListaParaDescarga = grupo.lista.url_lista
          const urlListaTrimmedParaDescarga = urlListaParaDescarga ? String(urlListaParaDescarga).trim() : ''
          const tieneURLParaDescarga = !!(urlListaParaDescarga && urlListaTrimmedParaDescarga && (urlListaTrimmedParaDescarga.startsWith('http://') || urlListaTrimmedParaDescarga.startsWith('https://')))
          const debeDescargarDesdeURL = pdfsSubidosConExito.length === 0 && tieneURLParaDescarga
          
          console.log(`[Importación Completa] 🔍 Evaluando descarga desde URL para grupo ${grupoKey}:`)
          console.log(`  - PDFs subidos exitosamente: ${pdfsSubidosConExito.length}`)
          console.log(`  - URL_lista (raw): ${urlListaParaDescarga}`)
          console.log(`  - URL_lista (trimmed): ${urlListaTrimmedParaDescarga}`)
          console.log(`  - URL empieza con http:// o https://: ${urlListaTrimmedParaDescarga ? (urlListaTrimmedParaDescarga.startsWith('http://') || urlListaTrimmedParaDescarga.startsWith('https://')) : false}`)
          console.log(`  - Tiene URL válida: ${tieneURLParaDescarga}`)
          console.log(`  - Debe descargar desde URL: ${debeDescargarDesdeURL}`)
          console.log(`  - Condición completa: pdfsSubidosConExito.length (${pdfsSubidosConExito.length}) === 0 && tieneURLParaDescarga (${tieneURLParaDescarga})`)
          
          if (debeDescargarDesdeURL) {
            try {
              const nombrePDF = `${grupo.lista.nombre || 'lista'}-${grupo.asignatura.nombre || 'asignatura'}.pdf`
              const urlParaDescargar = urlListaTrimmedParaDescarga
              console.log(`[Importación Completa] 📥 Descargando PDF desde URL: ${urlParaDescargar}`)
              console.log(`[Importación Completa] 📥 Nombre del PDF: ${nombrePDF}`)
              
              // 🔍 LOG CRÍTICO: Enviar a logs del servidor
              try {
                await fetch('/api/crm/listas/importacion-completa-logs', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    level: 'log',
                    message: `[Importación Completa] 📥 Descargando PDF desde URL: ${grupo.lista.url_lista}`,
                    data: {
                      grupo: grupoKey,
                      url: grupo.lista.url_lista,
                      nombrePDF,
                    },
                  }),
                })
              } catch (e) {
                // Ignorar errores de logging
              }
              
              const resultadoPDF = await descargarYSubirPDF(urlParaDescargar, nombrePDF)
              pdfUrl = resultadoPDF.pdfUrl
              pdfId = resultadoPDF.pdfId
              
              // Agregar a pdfsSubidosConExito para que se incluya en las versiones
              if (pdfUrl && pdfId && resultadoPDF.pdfUrl && resultadoPDF.pdfId) {
                pdfsSubidosConExito.push({
                  pdfUrl: resultadoPDF.pdfUrl,
                  pdfId: resultadoPDF.pdfId,
                  nombre: nombrePDF,
                  fecha: new Date().toISOString(),
                })
                console.log(`[Importación Completa] ✅ PDF descargado y agregado a pdfsSubidosConExito: ${pdfUrl.substring(0, 80)}...`)
              }
              
              // 🔍 LOG CRÍTICO: Resultado de descarga y subida
              console.log(`[Importación Completa] 📥 Resultado de descarga/subida PDF:`, {
                url: grupo.lista.url_lista,
                nombrePDF,
                pdfUrl: pdfUrl ? pdfUrl.substring(0, 80) + '...' : null,
                pdfId,
                tienePDF: !!(pdfUrl && pdfId),
                agregadoAPdfsSubidos: pdfsSubidosConExito.length,
              })
              
              // 🔍 LOG CRÍTICO: Enviar a logs del servidor
              try {
                await fetch('/api/crm/listas/importacion-completa-logs', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    level: pdfUrl && pdfId ? 'log' : 'warn',
                    message: pdfUrl && pdfId 
                      ? `[Importación Completa] ✅ PDF descargado y subido correctamente: ${pdfUrl.substring(0, 80)}...`
                      : `[Importación Completa] ⚠️ No se pudo descargar/subir PDF desde: ${grupo.lista.url_lista}`,
                    data: {
                      grupo: grupoKey,
                      url: grupo.lista.url_lista,
                      nombrePDF,
                      pdfUrl,
                      pdfId,
                      tienePDF: !!(pdfUrl && pdfId),
                      agregadoAPdfsSubidos: pdfsSubidosConExito.length,
                    },
                  }),
                })
              } catch (e) {
                // Ignorar errores de logging
              }
              
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
          
          // Crear versión de materiales (después de obtener versionesExistentes)
          // IMPORTANTE: Solo crear versión si hay PDF o materiales
          if (!pdfUrl && !pdfId && materiales.length === 0) {
            console.warn(`[Importación Completa] ⚠️ Grupo ${grupoKey} no tiene PDF ni materiales, omitiendo versión`)
            continue
          }
          
          // 🔍 LOG CRÍTICO: Verificar PDF antes de crear versión
          console.log(`[Importación Completa] 🔍 Verificando PDF antes de crear versión:`, {
            grupo: grupoKey,
            colegio: grupo.colegio.nombre,
            curso: grupo.curso.nombre,
            asignatura: grupo.asignatura.nombre,
            lista: grupo.lista.nombre,
            url_lista: grupo.lista.url_lista ? grupo.lista.url_lista.substring(0, 80) + '...' : null,
            pdfUrl: pdfUrl ? pdfUrl.substring(0, 80) + '...' : null,
            pdfId,
            tienePDF: !!(pdfUrl && pdfId),
            pdfsSubidosConExito: pdfsSubidosConExito.length,
            pdfsSubidos: pdfsSubidosConExito.map(p => ({
              nombre: p.nombre,
              pdfId: p.pdfId,
              pdfUrl: p.pdfUrl ? p.pdfUrl.substring(0, 60) + '...' : null,
            })),
          })
          
          // 🔍 LOG CRÍTICO: Enviar a logs del servidor
          try {
            await fetch('/api/crm/listas/importacion-completa-logs', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                level: 'log',
                message: `[Importación Completa] 🔍 Verificando PDF antes de crear versión: ${grupoKey}`,
                data: {
                  grupo: grupoKey,
                  colegio: grupo.colegio.nombre,
                  curso: grupo.curso.nombre,
                  asignatura: grupo.asignatura.nombre,
                  lista: grupo.lista.nombre,
                  url_lista: grupo.lista.url_lista,
                  pdfUrl: pdfUrl,
                  pdfId: pdfId,
                  tienePDF: !!(pdfUrl && pdfId),
                  pdfsSubidosConExito: pdfsSubidosConExito.length,
                },
              }),
            })
          } catch (e) {
            // Ignorar errores de logging
          }
          
          const versionMaterial = {
            id: versionesExistentes.length + 1,
            nombre_archivo: grupo.lista.nombre || 'Lista de útiles',
            fecha_subida: grupo.lista.fecha_actualizacion || new Date().toISOString(),
            fecha_actualizacion: grupo.lista.fecha_actualizacion || new Date().toISOString(),
            fecha_publicacion: grupo.lista.fecha_publicacion,
            materiales: materiales,
            // Incluir PDF si se subió correctamente (puede ser null si no hay PDF)
            pdf_url: pdfUrl || null,
            pdf_id: pdfId || null,
            metadata: {
              nombre: grupo.lista.nombre,
              asignatura: grupo.asignatura.nombre,
              orden_asignatura: grupo.asignatura.orden,
              url_lista: grupo.lista.url_lista,
              url_publicacion: grupo.lista.url_publicacion,
            },
          }
          
          // 🔍 LOG CRÍTICO: Verificar que la versión tenga PDF antes de agregarla
          console.log(`[Importación Completa] 📋 Versión de materiales creada:`, {
            nombre: versionMaterial.nombre_archivo,
            tienePDF: !!(versionMaterial.pdf_url && versionMaterial.pdf_id),
            pdf_url: versionMaterial.pdf_url ? versionMaterial.pdf_url.substring(0, 80) + '...' : null,
            pdf_id: versionMaterial.pdf_id,
            materiales: versionMaterial.materiales.length,
            estructuraCompleta: JSON.stringify(versionMaterial, null, 2),
          })
          
          // 🔍 LOG: Verificar que el PDF esté presente
          console.log(`[Importación Completa] 📋 Versión de materiales creada:`, {
            nombre: versionMaterial.nombre_archivo,
            tienePDF: !!(versionMaterial.pdf_url && versionMaterial.pdf_id),
            pdfUrl: versionMaterial.pdf_url,
            pdfId: versionMaterial.pdf_id,
            materiales: versionMaterial.materiales.length,
            pdfsSubidosConExito: pdfsSubidosConExito.length,
          })
          
          // Agregar nueva versión
          // Si hay múltiples PDFs subidos, crear una versión por cada PDF
          const versionesParaAgregar: any[] = []
          
          // Crear versión principal con el último PDF (o la única versión si solo hay un PDF)
          versionesParaAgregar.push(versionMaterial)
          
          // Si hay múltiples PDFs subidos, crear versiones adicionales para cada uno
          if (pdfsSubidosConExito.length > 1) {
            console.log(`[Importación Completa] 📄 Creando ${pdfsSubidosConExito.length - 1} versión(es) adicional(es) para PDFs múltiples`)
            
            // Crear una versión por cada PDF adicional (excepto el último que ya está en versionMaterial)
            for (let i = 0; i < pdfsSubidosConExito.length - 1; i++) {
              const pdfInfo = pdfsSubidosConExito[i]
              const versionAdicional = {
                id: versionesExistentes.length + versionesParaAgregar.length + 1,
                nombre_archivo: pdfInfo.nombre,
                fecha_subida: pdfInfo.fecha,
                fecha_actualizacion: pdfInfo.fecha,
                fecha_publicacion: grupo.lista.fecha_publicacion,
                materiales: materiales, // Mismos materiales para todas las versiones
                pdf_url: pdfInfo.pdfUrl,
                pdf_id: pdfInfo.pdfId,
                metadata: {
                  nombre: grupo.lista.nombre,
                  asignatura: grupo.asignatura.nombre,
                  orden_asignatura: grupo.asignatura.orden,
                  url_lista: grupo.lista.url_lista,
                  url_publicacion: grupo.lista.url_publicacion,
                  version: i + 1, // Número de versión
                },
              }
              versionesParaAgregar.push(versionAdicional)
              console.log(`[Importación Completa] ✅ Versión ${i + 1} creada para PDF: ${pdfInfo.nombre}`)
            }
          }
          
          const versionesActualizadas = [...versionesExistentes, ...versionesParaAgregar]
          console.log(`[Importación Completa] 📋 Total de versiones después de agregar: ${versionesActualizadas.length} (existentes: ${versionesExistentes.length}, nuevas: ${versionesParaAgregar.length})`)
          
          // 🔍 LOG: Verificar que las versiones tengan PDFs
          const versionesConPDF = versionesActualizadas.filter(v => v.pdf_url && v.pdf_id)
          const versionesSinPDF = versionesActualizadas.filter(v => !v.pdf_url || !v.pdf_id)
          console.log(`[Importación Completa] 📊 Resumen de versiones:`, {
            total: versionesActualizadas.length,
            conPDF: versionesConPDF.length,
            sinPDF: versionesSinPDF.length,
            versionesConPDF: versionesConPDF.map(v => ({ nombre: v.nombre_archivo, pdfUrl: v.pdf_url, pdfId: v.pdf_id })),
            versionesSinPDF: versionesSinPDF.map(v => ({ nombre: v.nombre_archivo })),
          })
          
          // 🔍 LOG: Verificar estructura completa de versiones antes de enviar
          console.log(`[Importación Completa] 📦 Versiones a enviar a Strapi:`, JSON.stringify(versionesActualizadas, null, 2))

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
      
      // Restaurar modal si estaba minimizado y limpiar localStorage
      if (minimized) {
        setMinimized(false)
      }
      if (typeof window !== 'undefined') {
        localStorage.removeItem('importacion-completa-minimized')
        localStorage.removeItem('importacion-completa-processing')
        localStorage.removeItem('importacion-completa-progress')
      }
      
      // Llamar a onSuccess una sola vez después de completar el procesamiento
      // para que la tabla se recargue y muestre los nuevos datos
      console.log('[Importación Completa] ✅ Procesamiento completado')
      
      // Mostrar notificación de éxito
      const successCount = results.filter((r) => r.success).length
      const errorCount = results.filter((r) => !r.success).length
      mostrarNotificacion(
        'Importación Completada',
        `${successCount} grupos procesados exitosamente${errorCount > 0 ? `, ${errorCount} con errores` : ''}`,
        errorCount > 0 ? 'error' : 'success'
      )
      
      // Llamar a onSuccess después de un pequeño delay para asegurar que Strapi haya procesado todo
      // Solo una vez, no múltiples veces
      if (onSuccess) {
        setTimeout(() => {
          console.log('[Importación Completa] ✅ Llamando a onSuccess para refrescar la tabla...')
          onSuccess()
        }, 1000) // 1 segundo es suficiente
      } else {
        console.warn('[Importación Completa] ⚠️ onSuccess no está disponible')
      }
    } catch (err: any) {
      setError(`Error al procesar: ${err.message}`)
      setStep('review')
      
      // Mostrar notificación de error
      mostrarNotificacion(
        'Error en Importación',
        `Error al procesar: ${err.message}`,
        'error'
      )
    } finally {
      setProcessing(false)
      // Limpiar localStorage cuando termine el procesamiento
      if (typeof window !== 'undefined') {
        localStorage.removeItem('importacion-completa-processing')
        localStorage.removeItem('importacion-completa-progress')
        if (!minimized) {
          localStorage.removeItem('importacion-completa-minimized')
        }
      }
    }
  }

  // Función para subir PDF a Strapi
  const subirPDFaStrapi = async (pdfFile: File | Blob, nombreArchivo: string): Promise<{ pdfUrl: string | null; pdfId: number | null }> => {
    const uploadStartTime = Date.now()
    try {
      const tamañoKB = (pdfFile.size / 1024).toFixed(2)
      const tamañoMB = (pdfFile.size / 1024 / 1024).toFixed(2)
      
      console.log(`[Importación Completa] 📤 Subiendo PDF a Strapi: ${nombreArchivo} (${tamañoKB} KB / ${tamañoMB} MB)`)
      
      // Enviar log al sistema de logs
      try {
        await fetch('/api/crm/listas/importacion-completa-logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            level: 'log',
            message: `[Importación Completa] 📤 Subiendo PDF a Strapi: ${nombreArchivo}`,
            data: {
              nombreArchivo,
              tamañoBytes: pdfFile.size,
              tamañoKB: parseFloat(tamañoKB),
              tamañoMB: parseFloat(tamañoMB),
              tipo: pdfFile instanceof File ? pdfFile.type : 'application/pdf',
            },
          }),
        })
      } catch (e) {
        // Ignorar errores de logging
      }
      
      const formData = new FormData()
      const file = pdfFile instanceof File ? pdfFile : new File([pdfFile], nombreArchivo, { type: 'application/pdf' })
      formData.append('files', file)

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const uploadDuration = Date.now() - uploadStartTime

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}))
        console.error('[Importación Completa] ❌ Error al subir PDF:', {
          status: uploadResponse.status,
          statusText: uploadResponse.statusText,
          error: errorData,
          duration: `${uploadDuration}ms`,
        })
        
        // Enviar log de error
        try {
          await fetch('/api/crm/listas/importacion-completa-logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              level: 'error',
              message: `[Importación Completa] ❌ Error al subir PDF: ${uploadResponse.status} ${uploadResponse.statusText}`,
              data: {
                nombreArchivo,
                status: uploadResponse.status,
                statusText: uploadResponse.statusText,
                error: errorData,
                duration: `${uploadDuration}ms`,
              },
            }),
          })
        } catch (e) {
          // Ignorar errores de logging
        }
        
        return { pdfUrl: null, pdfId: null }
      }

      const uploadResult = await uploadResponse.json()
      console.log(`[Importación Completa] 📥 Respuesta de /api/upload:`, {
        esArray: Array.isArray(uploadResult),
        tieneDatos: !!uploadResult,
        cantidad: Array.isArray(uploadResult) ? uploadResult.length : 1,
        duration: `${uploadDuration}ms`,
      })
      
      const uploadedFile = Array.isArray(uploadResult) ? uploadResult[0] : uploadResult

      if (uploadedFile) {
        const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://strapi.moraleja.cl'
        const pdfUrl = uploadedFile.url 
          ? (uploadedFile.url.startsWith('http') ? uploadedFile.url : `${strapiUrl}${uploadedFile.url}`)
          : null
        const pdfId = uploadedFile.id || null

        console.log(`[Importación Completa] ✅ PDF subido exitosamente:`, {
          nombre: nombreArchivo,
          pdfId,
          pdfUrl: pdfUrl ? pdfUrl.substring(0, 80) + '...' : null,
          tieneId: !!pdfId,
          tieneUrl: !!pdfUrl,
          duration: `${uploadDuration}ms`,
        })

        // Enviar log de éxito
        try {
          await fetch('/api/crm/listas/importacion-completa-logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              level: 'log',
              message: `[Importación Completa] ✅ PDF subido exitosamente: ${nombreArchivo}`,
              data: {
                nombreArchivo,
                pdfId,
                pdfUrl: pdfUrl ? pdfUrl.substring(0, 100) + '...' : null,
                tamañoBytes: pdfFile.size,
                tamañoKB: parseFloat(tamañoKB),
                tamañoMB: parseFloat(tamañoMB),
                duration: `${uploadDuration}ms`,
                strapiFileId: uploadedFile.id,
                strapiFileName: uploadedFile.name,
                strapiFileSize: uploadedFile.size,
              },
            }),
          })
        } catch (e) {
          // Ignorar errores de logging
        }

        return { pdfUrl, pdfId }
      }

      console.warn(`[Importación Completa] ⚠️ PDF subido pero sin datos de archivo`)
      return { pdfUrl: null, pdfId: null }
    } catch (err: any) {
      const uploadDuration = Date.now() - uploadStartTime
      console.error('[Importación Completa] ❌ Error al subir PDF:', {
        error: err.message,
        stack: err.stack?.substring(0, 200),
        duration: `${uploadDuration}ms`,
      })
      
      // Enviar log de excepción
      try {
        await fetch('/api/crm/listas/importacion-completa-logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            level: 'error',
            message: `[Importación Completa] ❌ Excepción al subir PDF: ${err.message}`,
            data: {
              nombreArchivo,
              error: err.message,
              stack: err.stack?.substring(0, 500),
              duration: `${uploadDuration}ms`,
            },
          }),
        })
      } catch (e) {
        // Ignorar errores de logging
      }
      
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

    // Validación más flexible para PDFs
    const esPDF = file.type === 'application/pdf' || 
                  file.type.includes('pdf') || 
                  file.name.toLowerCase().endsWith('.pdf') ||
                  file.type === '' // Algunos navegadores no detectan el tipo correctamente
    
    if (!esPDF) {
      console.error(`[Importación Completa] Archivo rechazado en handlePDFUpload: ${file.name} (tipo: ${file.type})`)
      setError(`El archivo "${file.name}" no es un PDF válido`)
      return
    }

    const nuevosPdfs = new Map(pdfsPorGrupo)
    // NO sobrescribir: agregar como nueva versión si ya existe
    const pdfsExistentes = nuevosPdfs.get(grupoKey) || []
    nuevosPdfs.set(grupoKey, [...pdfsExistentes, file])
    setPdfsPorGrupo(nuevosPdfs)
    setError(null)
    console.log(`[Importación Completa] PDF agregado exitosamente: ${file.name} al grupo ${grupoKey}. Total PDFs en grupo: ${nuevosPdfs.get(grupoKey)?.length || 0}`)
  }

  // Importación masiva de PDFs desde Excel + ZIP (o sin ZIP si se agregan manualmente)
  const handleImportarPDFsMasivo = async () => {
    if (!excelPDFsFile) {
      setError('Por favor, sube un archivo Excel con el mapeo de PDFs')
      return
    }

    // El ZIP es opcional - si no hay ZIP, los PDFs se pueden agregar manualmente después
    if (!zipPDFsFile) {
      // Permitir continuar sin ZIP - el usuario puede agregar PDFs manualmente después
      console.log('[Importación Completa] Excel procesado sin ZIP. Los PDFs se pueden agregar manualmente después.')
    }

    setLoadingPDFsImport(true)
    setError(null)

    try {
      // 1. Leer Excel
      const reader = new FileReader()
      reader.onload = async (event) => {
        try {
          const data = event.target?.result
          const workbook = XLSX.read(data, { type: 'binary' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[]

          // Normalizar nombres de columnas
          const normalizeKey = (key: string) => key.toLowerCase().trim().replace(/\s+/g, '_')
          const normalizedData = jsonData.map(row => {
            const normalized: any = {}
            Object.keys(row).forEach(key => {
              normalized[normalizeKey(key)] = row[key]
            })
            return normalized
          })

          // 2. Extraer PDFs del ZIP (si está disponible)
          let zipContents: any = null
          if (zipPDFsFile) {
            const zip = new JSZip()
            const zipData = await zipPDFsFile.arrayBuffer()
            zipContents = await zip.loadAsync(zipData)
          }

          // 3. Mapear PDFs a grupos
          const nuevosPdfs = new Map(pdfsPorGrupo)
          let mapeados = 0
          let noEncontrados = 0
          let sinZIP = 0

          for (const row of normalizedData) {
            const curso = String(row.curso || row.nombre_curso || '').trim()
            const nombrePDF = String(row.nombre_pdf || row.archivo_pdf || row.ruta_pdf || row.pdf || '').trim()

            if (!curso || !nombrePDF) {
              continue
            }

            // Usar las funciones globales normalizeCurso y extractComponents
            const cursoComponents = extractComponents(curso)
            
            // Buscar todos los grupos que coincidan con este curso (búsqueda muy flexible)
            let gruposEncontrados: string[] = []
            
            for (const [key, grupo] of agrupado.entries()) {
              const cursoGrupo = grupo.curso.nombre.trim()
              const grupoComponents = extractComponents(cursoGrupo)
              
              // Múltiples estrategias de comparación para máxima flexibilidad
              let cursoMatch = false
              
              // Estrategia 1: Comparación normalizada completa (sin espacios ni caracteres especiales)
              if (cursoComponents.normalized === grupoComponents.normalized) {
                cursoMatch = true
              }
              // Estrategia 2: Uno contiene al otro (coincidencia parcial)
              else if (cursoComponents.normalized.includes(grupoComponents.normalized) || 
                       grupoComponents.normalized.includes(cursoComponents.normalized)) {
                cursoMatch = true
              }
              // Estrategia 3: Comparar por componentes clave (grado + nivel + año) - CUALQUIER número
              else if (cursoComponents.grado && grupoComponents.grado && 
                       cursoComponents.nivel && grupoComponents.nivel) {
                // Comparar grado (cualquier número: 1, 2, 3, 5, 10, etc.)
                const mismoGrado = cursoComponents.grado === grupoComponents.grado
                
                // Comparar nivel (normalizado: basico/basica, medio/media)
                const mismoNivel = cursoComponents.nivel === grupoComponents.nivel ||
                                  (cursoComponents.nivel.includes('basic') && grupoComponents.nivel.includes('basic')) ||
                                  (cursoComponents.nivel.includes('medi') && grupoComponents.nivel.includes('medi'))
                
                // Comparar año (opcional, pero si ambos tienen año, deben coincidir)
                const mismoAño = !cursoComponents.año || !grupoComponents.año || 
                                 cursoComponents.año === grupoComponents.año ||
                                 // También aceptar si uno tiene año y el otro no (flexibilidad)
                                 (cursoComponents.año && !grupoComponents.año) ||
                                 (!cursoComponents.año && grupoComponents.año)
                
                // Si coinciden grado y nivel, y año (si está presente), es un match
                if (mismoGrado && mismoNivel && mismoAño) {
                  cursoMatch = true
                }
              }
              // Estrategia 4: Comparación por similitud de palabras clave (números y nivel)
              else {
                const palabrasCurso = cursoComponents.normalized.match(/\d+|[a-z]+/g) || []
                const palabrasGrupo = grupoComponents.normalized.match(/\d+|[a-z]+/g) || []
                
                // Extraer números de ambos
                const numerosCurso = palabrasCurso.filter(p => /^\d+$/.test(p))
                const numerosGrupo = palabrasGrupo.filter(p => /^\d+$/.test(p))
                
                // Extraer palabras (nivel)
                const palabrasCursoTexto = palabrasCurso.filter(p => !/^\d+$/.test(p))
                const palabrasGrupoTexto = palabrasGrupo.filter(p => !/^\d+$/.test(p))
                
                // Verificar si tienen números en común (grado)
                const numerosComunes = numerosCurso.filter(n => numerosGrupo.includes(n))
                
                // Verificar si tienen palabras en común (nivel)
                const palabrasComunes = palabrasCursoTexto.filter(p => palabrasGrupoTexto.includes(p))
                
                // Si tienen al menos un número en común (grado) y una palabra en común (nivel), es un match
                if (numerosComunes.length >= 1 && palabrasComunes.length >= 1) {
                  cursoMatch = true
                }
                // O si tienen al menos 2 elementos en común (número + palabra o 2 palabras)
                else if ((numerosComunes.length + palabrasComunes.length) >= 2) {
                  cursoMatch = true
                }
              }
              
              if (cursoMatch) {
                gruposEncontrados.push(key)
              }
            }

            // Buscar PDF en el ZIP (si está disponible)
            let pdfFile: File | null = null
            
            if (zipContents) {
              for (const [fileName, file] of Object.entries(zipContents.files)) {
                const zipFile = file as any
                if (zipFile.dir) continue
                
                // Comparar nombres (case-insensitive, sin extensiones)
                const zipFileName = fileName.toLowerCase().replace(/\.pdf$/i, '').split('/').pop() || ''
                const searchName = nombrePDF.toLowerCase().replace(/\.pdf$/i, '')
                
                if (zipFileName === searchName || zipFileName.includes(searchName) || searchName.includes(zipFileName)) {
                  // Extraer el archivo
                  const blob = await zipFile.async('blob')
                  pdfFile = new File([blob], fileName.split('/').pop() || nombrePDF, { type: 'application/pdf' })
                  break
                }
              }
            }

            if (pdfFile) {
              // Asignar el PDF a todos los grupos encontrados que coincidan con el curso
              // NO sobrescribir: agregar como nueva versión si ya existe
              if (gruposEncontrados.length > 0) {
                let nuevos = 0
                let agregados = 0
                gruposEncontrados.forEach(key => {
                  // Si ya había PDF(s) asignado(s), agregar como nueva versión (NO sobrescribir)
                  const pdfsExistentes = nuevosPdfs.get(key) || []
                  if (pdfsExistentes.length > 0) {
                    // Agregar como nueva versión
                    nuevosPdfs.set(key, [...pdfsExistentes, pdfFile])
                    agregados++
                  } else {
                    // Primera vez, crear array con un solo PDF
                    nuevosPdfs.set(key, [pdfFile])
                    nuevos++
                  }
                })
                mapeados++
                const mensaje = agregados > 0 
                  ? `PDF "${nombrePDF}" agregado como nueva versión a ${gruposEncontrados.length} grupo(s) del curso "${curso}" (${agregados} grupo(s) ya tenían PDF)`
                  : `PDF "${nombrePDF}" asignado a ${gruposEncontrados.length} grupo(s) del curso "${curso}"`
                console.log(`[Importación Completa] ${mensaje}: ${gruposEncontrados.join(', ')}`)
              } else {
                noEncontrados++
                console.warn(`[Importación Completa] No se encontró ningún grupo que coincida con curso: ${curso}`)
              }
            } else {
              // PDF no encontrado en ZIP o no hay ZIP
              if (zipPDFsFile) {
                noEncontrados++
                console.warn(`[Importación Completa] PDF no encontrado en ZIP: ${nombrePDF} para curso: ${curso}`)
              } else {
                // Sin ZIP - marcar para agregar manualmente
                sinZIP++
                console.log(`[Importación Completa] Sin ZIP - PDF "${nombrePDF}" para curso "${curso}" deberá agregarse manualmente`)
                
                // Aún así, marcar los grupos encontrados para que el usuario sepa dónde agregar el PDF
                if (gruposEncontrados.length > 0) {
                  gruposEncontrados.forEach(key => {
                    // No agregar PDF, pero el usuario puede agregarlo manualmente después
                    console.log(`[Importación Completa] Grupo encontrado para agregar PDF manualmente: ${key}`)
                  })
                }
              }
            }
          }

          setPdfsPorGrupo(nuevosPdfs)
          setLoadingPDFsImport(false)

          if (mapeados > 0 || sinZIP > 0) {
            setError(null)
            let mensaje = ''
            if (mapeados > 0) {
              mensaje = `✅ ${mapeados} PDF(s) mapeado(s) correctamente desde el ZIP.`
            }
            if (sinZIP > 0) {
              mensaje += `\n📋 ${sinZIP} curso(s) identificado(s) en el Excel. Puedes agregar los PDFs manualmente en la tabla.`
            }
            if (noEncontrados > 0) {
              mensaje += `\n⚠️ ${noEncontrados} PDF(s) no encontrado(s) en el ZIP.`
            }
            alert(mensaje.trim())
            
            // Mostrar información adicional si hay PDFs que actualizaron otros anteriores
            const totalAsignados = nuevosPdfs.size
            const totalGrupos = agrupado.size
            if (totalAsignados < totalGrupos) {
              console.log(`[Importación Completa] ${totalAsignados} de ${totalGrupos} grupos tienen PDF asignado`)
            }
          } else {
            if (zipPDFsFile) {
              setError(`No se pudo mapear ningún PDF. Verifica que los nombres en el Excel coincidan con los archivos en el ZIP.`)
            } else {
              setError(`Excel procesado. Los grupos están listos para agregar PDFs manualmente.`)
            }
          }
        } catch (err: any) {
          setError('Error al procesar Excel/ZIP: ' + err.message)
          setLoadingPDFsImport(false)
        }
      }

      if (excelPDFsFile.name.endsWith('.csv')) {
        reader.readAsText(excelPDFsFile)
      } else {
        reader.readAsBinaryString(excelPDFsFile)
      }
    } catch (err: any) {
      setError('Error al procesar archivos: ' + err.message)
      setLoadingPDFsImport(false)
    }
  }

  const handleReset = () => {
    setImportData([])
    setAgrupado(new Map())
    setStep('upload')
    setError(null)
    setProcessResults([])
    setProgress(0)
    setPdfsPorGrupo(new Map())
    setExcelPDFsFile(null)
    setZipPDFsFile(null)
    if (excelPDFsInputRef.current) {
      excelPDFsInputRef.current.value = ''
    }
    if (zipPDFsInputRef.current) {
      zipPDFsInputRef.current.value = ''
    }
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
    console.log('[Importación Completa] ✅ Procesamiento completado, cerrando modal...')
    // onSuccess ya se llamó en el procesamiento (una sola vez), solo cerrar el modal
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

  // Verificar si hay un proceso en curso guardado en localStorage (para persistencia)
  const [hasPersistedProcess, setHasPersistedProcess] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('importacion-completa-processing') === 'true'
    }
    return false
  })

  // Actualizar hasPersistedProcess cuando cambie processing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setHasPersistedProcess(processing || localStorage.getItem('importacion-completa-processing') === 'true')
    }
  }, [processing])

  return (
    <>
      {/* Componente minimizado flotante - mostrar si está minimizado Y procesando, o si hay un proceso persistido */}
      {(minimized || hasPersistedProcess) && (processing || hasPersistedProcess) && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            zIndex: 1050,
            backgroundColor: 'white',
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            padding: '12px 16px',
            minWidth: '300px',
            maxWidth: '400px',
          }}
        >
          <div className="d-flex align-items-center justify-content-between mb-2">
            <div className="d-flex align-items-center gap-2">
              <Spinner size="sm" />
              <strong>Importación en Progreso</strong>
            </div>
            <Button
              variant="link"
              size="sm"
              onClick={() => {
                setMinimized(false)
                if (typeof window !== 'undefined') {
                  localStorage.removeItem('importacion-completa-minimized')
                }
              }}
              className="p-0"
              title="Restaurar ventana"
            >
              <LuMaximize2 size={18} />
            </Button>
          </div>
          <div className="mb-2">
            <ProgressBar now={progress} label={`${progress}%`} />
          </div>
          <small className="text-muted">
            Procesando grupos... Puedes continuar trabajando en otra pestaña.
          </small>
        </div>
      )}

      <Modal 
        show={show && !minimized} 
        onHide={handleClose} 
        size="xl" 
        centered
      >
        <ModalHeader closeButton>
          <div className="d-flex align-items-center justify-content-between w-100 me-3">
            <ModalTitle>Importación Completa de Listas (Plantilla Completa)</ModalTitle>
            {processing && (
              <Button
                variant="link"
                size="sm"
                onClick={() => setMinimized(true)}
                className="p-0 ms-2"
                title="Minimizar (continuará en segundo plano)"
              >
                <LuMinimize2 size={20} />
              </Button>
            )}
          </div>
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

            {/* Importación masiva de PDFs */}
            <Alert variant="secondary" className="mb-3">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <strong><LuFileSpreadsheet className="me-2" />Importación Masiva de PDFs:</strong>
                  <small className="d-block text-muted mt-1 mb-2">
                    <strong>Opción 1 (Automático):</strong> Sube un Excel con el mapeo (<strong>Curso</strong>, <strong>Nombre_PDF</strong>) y un ZIP con los PDFs.
                    <br />
                    <strong>Opción 2 (Manual):</strong> Sube solo el Excel y agrega PDFs manualmente (múltiples a la vez) en cada fila.
                    <br />
                    <strong>Opción 3 (Directo):</strong> Sube múltiples PDFs directamente abajo (sin Excel) - mapeo automático por nombre.
                    <br />
                    El año debe estar incluido en el nombre del curso. El PDF se asignará a todas las listas del curso.
                  </small>
                </div>
                <div className="d-flex gap-2">
                  <FormControl
                    ref={excelPDFsInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    size="sm"
                    style={{ width: '200px' }}
                    onChange={(e) => {
                      const file = (e.target as HTMLInputElement).files?.[0] || null
                      setExcelPDFsFile(file)
                    }}
                    disabled={loadingPDFsImport}
                  />
                  <FormControl
                    ref={zipPDFsInputRef}
                    type="file"
                    accept=".zip"
                    size="sm"
                    style={{ width: '200px' }}
                    onChange={(e) => {
                      const file = (e.target as HTMLInputElement).files?.[0] || null
                      setZipPDFsFile(file)
                    }}
                    disabled={loadingPDFsImport}
                  />
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={handleImportarPDFsMasivo}
                    disabled={!excelPDFsFile || loadingPDFsImport}
                  >
                    {loadingPDFsImport ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <LuUpload className="me-2" />
                        Importar PDFs
                      </>
                    )}
                  </Button>
                </div>
              </div>
              {excelPDFsFile && (
                <small className="text-muted d-block mt-2">
                  Excel: {excelPDFsFile.name}
                </small>
              )}
              {zipPDFsFile && (
                <small className="text-muted d-block">
                  ZIP: {zipPDFsFile.name}
                </small>
              )}
              
              {/* Input masivo para subir múltiples PDFs sin Excel */}
              <div className="mt-3 pt-3 border-top">
                <FormLabel className="mb-2">
                  <strong>📁 O sube múltiples PDFs directamente (sin Excel - mapeo automático):</strong>
                </FormLabel>
                <FormControl
                  type="file"
                  accept=".pdf,application/pdf"
                  multiple
                  onChange={(e) => {
                    const target = e.target as HTMLInputElement
                    const files = Array.from(target.files || [])
                    const pdfFiles = files.filter(file => 
                      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
                    )
                    
                    if (pdfFiles.length === 0) {
                      setError('Por favor, selecciona al menos un archivo PDF')
                      return
                    }
                    
                    // Intentar mapear automáticamente por nombre del archivo
                    const nuevosPdfs = new Map(pdfsPorGrupo)
                    let mapeados = 0
                    
                    pdfFiles.forEach(pdfFile => {
                      const fileName = pdfFile.name
                      const pdfComponents = extractComponents(fileName)
                      
                      console.log(`[Importación Completa] Procesando PDF: "${fileName}"`)
                      console.log(`[Importación Completa] Componentes extraídos del PDF:`, pdfComponents)
                      
                      // Buscar TODOS los grupos que coincidan (no solo el mejor, sino todos los que coincidan)
                      const matches: Array<{ key: string; score: number; cursoNombre: string }> = []
                      
                      for (const [key, grupo] of agrupado.entries()) {
                        const cursoGrupo = grupo.curso.nombre.trim()
                        const cursoComponents = extractComponents(cursoGrupo)
                        
                        console.log(`[Importación Completa] Comparando con curso: "${cursoGrupo}"`, cursoComponents)
                        
                        // Calcular score de coincidencia (más flexible)
                        let score = 0
                        
                        // Mismo grado = +3 puntos
                        if (cursoComponents.grado && pdfComponents.grado && cursoComponents.grado === pdfComponents.grado) {
                          score += 3
                          console.log(`  ✓ Mismo grado: ${cursoComponents.grado} (+3 puntos)`)
                        }
                        
                        // Mismo nivel = +2 puntos (más flexible)
                        if (cursoComponents.nivel && pdfComponents.nivel) {
                          const nivelCurso = cursoComponents.nivel.toLowerCase()
                          const nivelPDF = pdfComponents.nivel.toLowerCase()
                          if (nivelCurso === nivelPDF || 
                              nivelCurso.includes(nivelPDF) || 
                              nivelPDF.includes(nivelCurso) ||
                              (nivelCurso.includes('basic') && nivelPDF.includes('basic')) ||
                              (nivelCurso.includes('medi') && nivelPDF.includes('medi'))) {
                            score += 2
                            console.log(`  ✓ Mismo nivel: ${nivelCurso} / ${nivelPDF} (+2 puntos)`)
                          }
                        }
                        
                        // Mismo año = +1 punto
                        if (cursoComponents.año && pdfComponents.año && cursoComponents.año === pdfComponents.año) {
                          score += 1
                          console.log(`  ✓ Mismo año: ${cursoComponents.año} (+1 punto)`)
                        }
                        
                        // Comparación por texto normalizado (coincidencia parcial)
                        if (cursoComponents.normalized && pdfComponents.normalized) {
                          if (cursoComponents.normalized.includes(pdfComponents.normalized) || 
                              pdfComponents.normalized.includes(cursoComponents.normalized)) {
                            score += 1
                            console.log(`  ✓ Coincidencia parcial en texto normalizado (+1 punto)`)
                          }
                        }
                        
                        console.log(`  Score total: ${score}`)
                        
                        // Si tiene al menos grado y nivel, es un match válido
                        if (score >= 3) {
                          matches.push({ key, score, cursoNombre: cursoGrupo })
                          console.log(`  ✅ MATCH encontrado para curso "${cursoGrupo}" (score: ${score})`)
                        }
                        // Si solo tiene grado (sin nivel), también puede ser válido si el score es alto
                        else if (score >= 2 && cursoComponents.grado && pdfComponents.grado && 
                                 cursoComponents.grado === pdfComponents.grado) {
                          matches.push({ key, score, cursoNombre: cursoGrupo })
                          console.log(`  ✅ MATCH encontrado (solo grado) para curso "${cursoGrupo}" (score: ${score})`)
                        }
                        // Si solo tiene nivel (sin grado), también puede ser válido
                        else if (score >= 2 && cursoComponents.nivel && pdfComponents.nivel && 
                                 (cursoComponents.nivel.includes(pdfComponents.nivel) || 
                                  pdfComponents.nivel.includes(cursoComponents.nivel))) {
                          matches.push({ key, score, cursoNombre: cursoGrupo })
                          console.log(`  ✅ MATCH encontrado (solo nivel) para curso "${cursoGrupo}" (score: ${score})`)
                        }
                      }
                      
                      // Si hay matches, asignar a todos los que coincidan (o al mejor si hay varios)
                      if (matches.length > 0) {
                        // Ordenar por score descendente
                        matches.sort((a, b) => b.score - a.score)
                        
                        // Si hay múltiples matches con el mismo score alto, asignar a todos
                        // Si hay un match claramente mejor, solo asignar a ese
                        const mejorScore = matches[0].score
                        const matchesMejores = matches.filter(m => m.score === mejorScore)
                        
                        if (matchesMejores.length === 1 || mejorScore >= 5) {
                          // Solo un match o score muy alto, asignar solo a ese
                          const match = matchesMejores[0]
                          const pdfsExistentes = nuevosPdfs.get(match.key) || []
                          nuevosPdfs.set(match.key, [...pdfsExistentes, pdfFile])
                          mapeados++
                          console.log(`[Importación Completa] ✅ PDF "${fileName}" mapeado a curso "${match.cursoNombre}" (score: ${match.score})`)
                        } else {
                          // Múltiples matches con mismo score, asignar al primero (el mejor)
                          const match = matchesMejores[0]
                          const pdfsExistentes = nuevosPdfs.get(match.key) || []
                          nuevosPdfs.set(match.key, [...pdfsExistentes, pdfFile])
                          mapeados++
                          console.log(`[Importación Completa] ✅ PDF "${fileName}" mapeado a curso "${match.cursoNombre}" (score: ${match.score}, había ${matches.length} matches)`)
                        }
                      } else {
                        console.warn(`[Importación Completa] ❌ No se pudo mapear PDF "${fileName}"`)
                        console.warn(`[Importación Completa] Componentes extraídos:`, pdfComponents)
                        console.warn(`[Importación Completa] Total grupos disponibles: ${agrupado.size}`)
                      }
                    })
                    
                    setPdfsPorGrupo(nuevosPdfs)
                    if (mapeados > 0) {
                      alert(`✅ ${mapeados} PDF(s) mapeado(s) automáticamente. ${pdfFiles.length - mapeados > 0 ? `${pdfFiles.length - mapeados} PDF(s) no se pudieron mapear automáticamente - agrégalos manualmente.` : ''}`)
                    } else {
                      alert(`⚠️ No se pudieron mapear automáticamente. Agrega los PDFs manualmente en cada fila usando el botón "Seleccionar archivo".`)
                    }
                    
                    target.value = ''
                  }}
                  title="Selecciona múltiples PDFs (Ctrl+Click o Shift+Click). El sistema intentará mapearlos automáticamente por nombre."
                />
                <Form.Text className="text-muted">
                  Selecciona múltiples PDFs y el sistema intentará mapearlos automáticamente a los cursos según el nombre del archivo (ej: "1o-Basicos-2026.pdf" → curso "1 Basico 2026").
                </Form.Text>
              </div>
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
                    const pdfsDelGrupo = pdfsPorGrupo.get(grupoKey) || []
                    const tienePDFSubido = pdfsDelGrupo.length > 0
                    const cantidadPDFs = pdfsDelGrupo.length
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
                                {cantidadPDFs > 1 ? `${cantidadPDFs} PDFs listos` : 'PDF listo'}
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
                              accept=".pdf,application/pdf"
                              size="sm"
                              multiple
                              onChange={(e) => {
                                const target = e.target as HTMLInputElement
                                const files = Array.from(target.files || [])
                                
                                console.log(`[Importación Completa] Archivos seleccionados para grupo ${grupoKey}:`, files.length, files.map(f => ({ name: f.name, type: f.type, size: f.size })))
                                
                                if (files.length === 0) {
                                  console.warn('[Importación Completa] No se seleccionaron archivos')
                                  return
                                }
                                
                                const pdfFiles = files.filter(file => {
                                  const isPDF = file.type === 'application/pdf' || 
                                                file.name.toLowerCase().endsWith('.pdf') ||
                                                file.type === '' // Algunos navegadores no detectan el tipo correctamente
                                  if (!isPDF) {
                                    console.warn(`[Importación Completa] Archivo rechazado (no es PDF): ${file.name} (tipo: ${file.type})`)
                                  }
                                  return isPDF
                                })
                                
                                console.log(`[Importación Completa] PDFs válidos después del filtro:`, pdfFiles.length)
                                
                                if (pdfFiles.length === 0) {
                                  setError(`Ninguno de los ${files.length} archivo(s) seleccionado(s) es un PDF válido. Por favor, selecciona solo archivos PDF.`)
                                  target.value = ''
                                  return
                                }
                                
                                // Agregar todos los PDFs seleccionados (múltiples versiones)
                                pdfFiles.forEach((file, index) => {
                                  console.log(`[Importación Completa] Agregando PDF ${index + 1}/${pdfFiles.length}: ${file.name}`)
                                  handlePDFUpload(grupoKey, file)
                                })
                                
                                setError(null)
                                
                                // Limpiar el input para permitir seleccionar los mismos archivos de nuevo si es necesario
                                target.value = ''
                              }}
                              title="Puedes seleccionar múltiples PDFs a la vez (Ctrl+Click o Shift+Click)"
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
    </>
  )
}
