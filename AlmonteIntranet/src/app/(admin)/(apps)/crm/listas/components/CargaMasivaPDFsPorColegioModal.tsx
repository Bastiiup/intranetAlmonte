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
  FormCheck,
  Alert,
  Table,
  Badge,
  Spinner,
  ProgressBar,
} from 'react-bootstrap'
import { LuUpload, LuFileText, LuCheck, LuX, LuSparkles, LuMinimize2, LuMaximize2 } from 'react-icons/lu'
import Select from 'react-select'

interface CargaMasivaPDFsPorColegioModalProps {
  show: boolean
  onHide: () => void
  onSuccess?: () => void
}

interface ColegioOption {
  value: number | string
  label: string
  rbd?: number
}

interface PDFInfo {
  file: File
  cursoDetectado?: {
    nombre: string
    nivel: string
    grado: number
    score: number
  }
  fechaPublicacion?: string
  estado: 'pendiente' | 'procesando' | 'completado' | 'error'
  mensaje?: string
}

export default function CargaMasivaPDFsPorColegioModal({
  show,
  onHide,
  onSuccess,
}: CargaMasivaPDFsPorColegioModalProps) {
  const [step, setStep] = useState<'config' | 'upload' | 'processing' | 'results'>('config')
  const [colegios, setColegios] = useState<ColegioOption[]>([])
  const [selectedColegio, setSelectedColegio] = useState<ColegioOption | null>(null)
  const [año, setAño] = useState<number>(new Date().getFullYear())
  const [urlOriginal, setUrlOriginal] = useState<string>('')
  const [pdfs, setPdfs] = useState<PDFInfo[]>([])
  const [processing, setProcessing] = useState(false)
  const [procesarPDF, setProcesarPDF] = useState<boolean>(true) // ⚠️ Checkbox: procesar PDF con IA (por defecto true)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [loadingColegios, setLoadingColegios] = useState(false)
  const [minimized, setMinimized] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('carga-masiva-pdfs-minimized')
      return saved === 'true'
    }
    return false
  })
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default')
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  // Resetear estado cuando se abre el modal (permitir iniciar nuevo proceso incluso si hay uno en curso)
  useEffect(() => {
    if (show) {
      // ⚠️ IMPORTANTE: Cargar colegios siempre que el modal esté abierto
      // Si ya están cargados, no los recargamos (evita llamadas innecesarias)
      if (colegios.length === 0) {
        loadColegios()
      }
      
      if (typeof window !== 'undefined') {
        const isProcessing = localStorage.getItem('carga-masiva-pdfs-processing') === 'true'
        const isMinimized = localStorage.getItem('carga-masiva-pdfs-minimized') === 'true'
        const savedProgress = localStorage.getItem('carga-masiva-pdfs-progress')
        const savedColegio = localStorage.getItem('carga-masiva-pdfs-colegio')
        const savedAño = localStorage.getItem('carga-masiva-pdfs-año')
        const savedUrlOriginal = localStorage.getItem('carga-masiva-pdfs-url-original')
        
        // Si hay un proceso en curso, restaurar el estado de procesamiento (sin importar si estaba minimizado)
        // También verificar si está minimizado pero con progreso guardado (puede ser que se recargó la página)
        if ((isProcessing && savedProgress) || (isMinimized && savedProgress)) {
          setProcessing(isProcessing) // Mantener el estado de procesamiento real
          setProgress(parseInt(savedProgress, 10))
          setStep('processing')
          setMinimized(false) // Siempre mostrar el modal cuando se restaura
          
          // Restaurar año y URL primero
          if (savedAño) {
            setAño(parseInt(savedAño, 10))
          }
          if (savedUrlOriginal) {
            setUrlOriginal(savedUrlOriginal)
          }

          // Restaurar información de PDFs
          const savedPdfsInfo = localStorage.getItem('carga-masiva-pdfs-pdfs-info')
          if (savedPdfsInfo) {
            try {
              const pdfsInfo = JSON.parse(savedPdfsInfo)
              // Crear objetos PDFInfo con información restaurada (sin File object)
              const pdfsRestaurados: PDFInfo[] = pdfsInfo.map((info: any) => ({
                file: new File([], info.nombre || 'archivo.pdf', { type: 'application/pdf' }), // File vacío como placeholder
                estado: info.estado || 'pendiente',
                cursoDetectado: info.cursoDetectado,
                fechaPublicacion: info.fechaPublicacion,
                mensaje: info.mensaje
              }))
              setPdfs(pdfsRestaurados)
            } catch (e) {
              console.error('Error al restaurar PDFs:', e)
            }
          }
          
          // Restaurar colegio (usar un efecto separado para esperar a que los colegios se carguen)
          if (savedColegio) {
            try {
              const colegioData = JSON.parse(savedColegio)
              // Usar un efecto separado para restaurar el colegio después de que se carguen
              const restoreColegio = () => {
                if (colegios.length > 0) {
                  const colegioEncontrado = colegios.find(c => 
                    String(c.value) === String(colegioData.value) || 
                    c.label === colegioData.label ||
                    (c.rbd && colegioData.rbd && c.rbd === colegioData.rbd)
                  )
                  if (colegioEncontrado && !selectedColegio) {
                    setSelectedColegio(colegioEncontrado)
                  }
                }
              }
              // Intentar restaurar inmediatamente
              restoreColegio()
              // Si los colegios aún no están cargados, intentar de nuevo después de un momento
              setTimeout(restoreColegio, 500)
              setTimeout(restoreColegio, 1000) // Un intento más por si acaso
            } catch (e) {
              console.error('Error al restaurar colegio:', e)
            }
          }
        } else if (!isProcessing && !processing) {
          // Si NO hay proceso en curso, resetear todo
          setMinimized(false)
          localStorage.removeItem('carga-masiva-pdfs-minimized')
          setSelectedColegio(null)
          setAño(new Date().getFullYear())
          setUrlOriginal('')
          setPdfs([])
          setStep('config')
          setError(null)
          setProgress(0)
          // ⚠️ IMPORTANTE: Asegurar que los colegios estén cargados
          if (colegios.length === 0) {
            loadColegios()
          }
        } else {
          // Si hay un proceso pero no estaba minimizado, mostrar config para iniciar uno nuevo
          setStep('config')
          setError(null)
          // ⚠️ IMPORTANTE: Asegurar que los colegios estén cargados
          if (colegios.length === 0) {
            loadColegios()
          }
        }
      } else {
        // Si no hay localStorage, resetear todo
        setSelectedColegio(null)
        setAño(new Date().getFullYear())
        setUrlOriginal('')
        setPdfs([])
        setStep('config')
        setError(null)
        setProgress(0)
      }
    }
  }, [show])

  // Guardar estado de PDFs en localStorage cuando cambian
  useEffect(() => {
    if (typeof window !== 'undefined' && processing && pdfs.length > 0) {
      // Guardar información de los PDFs (sin el File object que no es serializable)
      const pdfsInfo = pdfs.map(pdf => ({
        nombre: pdf.file.name,
        tamaño: pdf.file.size,
        estado: pdf.estado,
        cursoDetectado: pdf.cursoDetectado,
        fechaPublicacion: pdf.fechaPublicacion,
        mensaje: pdf.mensaje
      }))
      localStorage.setItem('carga-masiva-pdfs-pdfs-info', JSON.stringify(pdfsInfo))
    }
  }, [pdfs, processing])

  // Persistir estado de minimización en localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (minimized) {
        localStorage.setItem('carga-masiva-pdfs-minimized', 'true')
        localStorage.setItem('carga-masiva-pdfs-processing', processing ? 'true' : 'false')
        localStorage.setItem('carga-masiva-pdfs-progress', progress.toString())
        if (selectedColegio) {
          localStorage.setItem('carga-masiva-pdfs-colegio', JSON.stringify({
            value: selectedColegio.value,
            label: selectedColegio.label,
            rbd: selectedColegio.rbd
          }))
        }
        if (año) {
          localStorage.setItem('carga-masiva-pdfs-año', año.toString())
        }
        if (urlOriginal) {
          localStorage.setItem('carga-masiva-pdfs-url-original', urlOriginal)
        }
        // Guardar también el estado actual de los PDFs cuando se minimiza
        if (pdfs.length > 0) {
          const pdfsInfo = pdfs.map(pdf => ({
            nombre: pdf.file.name,
            tamaño: pdf.file.size,
            estado: pdf.estado,
            cursoDetectado: pdf.cursoDetectado,
            fechaPublicacion: pdf.fechaPublicacion,
            mensaje: pdf.mensaje
          }))
          localStorage.setItem('carga-masiva-pdfs-pdfs-info', JSON.stringify(pdfsInfo))
        }
        // Disparar evento para actualizar el componente global (diferir para evitar actualizar durante renderizado)
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('carga-masiva-pdfs-update'))
        }, 0)
      } else {
        localStorage.removeItem('carga-masiva-pdfs-minimized')
        if (!processing) {
          localStorage.removeItem('carga-masiva-pdfs-processing')
          localStorage.removeItem('carga-masiva-pdfs-progress')
          localStorage.removeItem('carga-masiva-pdfs-colegio')
          localStorage.removeItem('carga-masiva-pdfs-pdfs-info')
          localStorage.removeItem('carga-masiva-pdfs-año')
          localStorage.removeItem('carga-masiva-pdfs-url-original')
        }
        // Disparar evento para actualizar el componente global (diferir para evitar actualizar durante renderizado)
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('carga-masiva-pdfs-update'))
        }, 0)
      }
    }
  }, [minimized, processing, progress, selectedColegio, año, urlOriginal, pdfs])

  // Escuchar evento de apertura del modal (desde componente global)
  useEffect(() => {
    const handleOpenModal = (event: CustomEvent) => {
      // Si el modal está minimizado, restaurarlo
      if (minimized) {
        setMinimized(false)
        localStorage.removeItem('carga-masiva-pdfs-minimized')
      }
      // Si el modal no está abierto, abrirlo
      if (!show && event.detail?.restore) {
        // Disparar evento para que el componente padre abra el modal
        window.dispatchEvent(new CustomEvent('carga-masiva-pdfs-force-open'))
      }
    }

    window.addEventListener('carga-masiva-pdfs-open-modal', handleOpenModal as EventListener)
    return () => {
      window.removeEventListener('carga-masiva-pdfs-open-modal', handleOpenModal as EventListener)
    }
  }, [show, minimized])


  // Restaurar colegio cuando se carguen los colegios y haya un proceso en curso
  useEffect(() => {
    if (colegios.length > 0 && processing && step === 'processing') {
      const savedColegio = localStorage.getItem('carga-masiva-pdfs-colegio')
      if (savedColegio && !selectedColegio) {
        try {
          const colegioData = JSON.parse(savedColegio)
          const colegioEncontrado = colegios.find(c => 
            String(c.value) === String(colegioData.value) || 
            c.label === colegioData.label ||
            (c.rbd && colegioData.rbd && c.rbd === colegioData.rbd)
          )
          if (colegioEncontrado) {
            setSelectedColegio(colegioEncontrado)
          }
        } catch (e) {
          console.error('Error al restaurar colegio:', e)
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colegios.length, processing, step])

  // Función para mostrar notificación
  const mostrarNotificacion = (titulo: string, mensaje: string, tipo: 'success' | 'error' | 'info' = 'info') => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const icon = tipo === 'success' ? '✅' : tipo === 'error' ? '❌' : 'ℹ️'
      const notification = new Notification(`${icon} ${titulo}`, {
        body: mensaje,
        icon: '/favicon.ico',
        tag: 'carga-masiva-pdfs',
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

  const loadColegios = async () => {
    setLoadingColegios(true)
    try {
      // Optimizar: cargar solo campos necesarios, sin relaciones, y usar cache del navegador
      const cacheKey = 'colegios-list-cache'
      const cacheTime = 5 * 60 * 1000 // 5 minutos
      
      // Verificar cache
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        const { data: cachedData, timestamp } = JSON.parse(cached)
        if (Date.now() - timestamp < cacheTime) {
          console.log('[Carga Masiva PDFs] 📦 Usando colegios desde cache')
          setColegios(cachedData)
          setLoadingColegios(false)
          return
        }
      }
      
      // Cargar desde API
      const response = await fetch('/api/crm/colegios?page=1&pageSize=1000&populate=false', {
        cache: 'force-cache', // Usar cache del navegador
      })
      const data = await response.json()
      if (data.success && Array.isArray(data.data)) {
        const options: ColegioOption[] = data.data.map((colegio: any) => {
          const nombre = colegio.colegio_nombre || colegio.nombre || 'Sin nombre'
          const rbd = colegio.rbd
          return {
            value: colegio.documentId || colegio.id,
            label: `${nombre}${rbd ? ` (RBD: ${rbd})` : ''}`,
            rbd: rbd,
            // Asegurar que data esté disponible para react-select
            data: {
              rbd: rbd,
            },
          } as ColegioOption & { data: { rbd?: number } }
        })
        
        // Guardar en cache
        localStorage.setItem(cacheKey, JSON.stringify({
          data: options,
          timestamp: Date.now(),
        }))
        
        setColegios(options)
        console.log(`[Carga Masiva PDFs] ✅ ${options.length} colegios cargados`)
      }
    } catch (err: any) {
      console.error('Error al cargar colegios:', err)
      setError('Error al cargar colegios: ' + err.message)
    } finally {
      setLoadingColegios(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const pdfFiles = files.filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'))
    
    if (pdfFiles.length === 0) {
      setError('Por favor selecciona al menos un archivo PDF')
      return
    }

    const nuevosPDFs: PDFInfo[] = pdfFiles.map(file => ({
      file,
      estado: 'pendiente' as const,
    }))

    setPdfs(prev => [...prev, ...nuevosPDFs])
    setError(null)
    
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemovePDF = (index: number) => {
    setPdfs(prev => prev.filter((_, i) => i !== index))
  }

  const handleDetectarCursos = async () => {
    if (!selectedColegio) {
      setError('Por favor selecciona un colegio')
      return
    }

    if (pdfs.length === 0) {
      setError('Por favor sube al menos un PDF')
      return
    }

    setStep('processing')
    setProcessing(true)
    setProgress(0)
    setError(null)

    try {
      // Obtener cursos existentes del colegio
      const cursosResponse = await fetch(`/api/crm/colegios/${selectedColegio.value}/cursos`)
      const cursosData = await cursosResponse.json()
      const cursosExistentes = cursosData.success && Array.isArray(cursosData.data) ? cursosData.data : []

      // Preparar grupos para el mapeo con IA
      const grupos = cursosExistentes.map((curso: any) => {
        const attrs = curso.attributes || curso
        return {
          key: `${selectedColegio.value}|${attrs.nombre_curso}|${attrs.nivel}|${attrs.grado}|${attrs.año || año}`,
          curso: attrs.nombre_curso || '',
          colegio: selectedColegio.label,
          nivel: attrs.nivel || 'Basica',
          grado: attrs.grado || 1,
          año: attrs.año || año,
        }
      })

      // Si no hay cursos, crear grupos potenciales basados en nombres comunes
      if (grupos.length === 0) {
        const niveles = ['Basica', 'Media']
        const gradosBasica = [1, 2, 3, 4, 5, 6, 7, 8]
        const gradosMedia = [1, 2, 3, 4]
        
        niveles.forEach(nivel => {
          const grados = nivel === 'Basica' ? gradosBasica : gradosMedia
          grados.forEach(grado => {
            grupos.push({
              key: `${selectedColegio.value}|${grado}° ${nivel}|${nivel}|${grado}|${año}`,
              curso: `${grado}° ${nivel}`,
              colegio: selectedColegio.label,
              nivel,
              grado,
              año,
            })
          })
        })
      }

      // ⚡ OPTIMIZACIÓN: Procesar PDFs en lotes pequeños para mejorar el tiempo de respuesta
      // Procesar cada PDF (secuencial para evitar saturar la API, pero optimizado)
      for (let i = 0; i < pdfs.length; i++) {
        const pdfInfo = pdfs[i]
        const nuevoProgreso = Math.round((i / pdfs.length) * 50)
        setProgress(nuevoProgreso)
        // Persistir progreso en localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('carga-masiva-pdfs-progress', nuevoProgreso.toString())
          // Guardar también el estado actual de los PDFs
          const pdfsInfo = pdfs.map(p => ({
            nombre: p.file.name,
            tamaño: p.file.size,
            estado: p.estado,
            cursoDetectado: p.cursoDetectado,
            fechaPublicacion: p.fechaPublicacion,
            mensaje: p.mensaje
          }))
          localStorage.setItem('carga-masiva-pdfs-pdfs-info', JSON.stringify(pdfsInfo))
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('carga-masiva-pdfs-update'))
          }, 0)
        }

        try {
          // Actualizar estado
          setPdfs(prev => {
            const updated = prev.map((p, idx) => 
              idx === i ? { ...p, estado: 'procesando' as const } : p
            )
            
            // Guardar estado actualizado en localStorage
            if (typeof window !== 'undefined') {
              const pdfsInfo = updated.map(p => ({
                nombre: p.file.name,
                tamaño: p.file.size,
                estado: p.estado,
                cursoDetectado: p.cursoDetectado,
                fechaPublicacion: p.fechaPublicacion,
                mensaje: p.mensaje
              }))
              localStorage.setItem('carga-masiva-pdfs-pdfs-info', JSON.stringify(pdfsInfo))
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('carga-masiva-pdfs-update'))
              }, 0)
            }
            
            return updated
          })

          // ⚡ OPTIMIZACIÓN: Subir PDF a Strapi (siempre necesario para asignarlo al curso)
          // La optimización está en que solo procesamos con IA si el checkbox está marcado
          const formData = new FormData()
          formData.append('files', pdfInfo.file)

          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          })

          if (!uploadResponse.ok) {
            throw new Error(`Error al subir PDF: ${uploadResponse.statusText}`)
          }

          const uploadData = await uploadResponse.json()
          const pdfId = uploadData[0]?.id

          if (!pdfId) {
            throw new Error('No se recibió ID del PDF subido')
          }

          // Mapear PDF a curso usando IA
          const mapeoResponse = await fetch('/api/crm/listas/mapear-pdfs-ia', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pdfFileNames: [pdfInfo.file.name],
              grupos: grupos,
            }),
          })

          const mapeoData = await mapeoResponse.json()
          const cursoKey = mapeoData.mapping?.[pdfInfo.file.name]

          if (!cursoKey) {
            // Si no se encontró match, intentar extraer info del nombre del archivo
            // Patrones a buscar:
            // - "5 basico.pdf" → 5° Básica
            // - "6 basico.pdf" → 6° Básica
            // - "cuarto basico2025.pdf" → 4° Básica
            // - "1º Básico.pdf" → 1° Básica
            // - "II Medio.pdf" → 2° Media
            // - "Colegio_X_5_Basico.pdf" → 5° Básica (ignorar nombre colegio)
            // - "I_Medio.pdf" → 1° Media
            // - "IV_Medio.pdf" → 4° Media
            
            let grado: number | null = null
            let nivel: 'Basica' | 'Media' = 'Basica'
            let nombreArchivo = pdfInfo.file.name.toLowerCase()
            
            // Remover extensión .pdf
            nombreArchivo = nombreArchivo.replace(/\.pdf$/i, '')
            
            // Intentar remover nombre del colegio al inicio (si está seleccionado)
            // Buscar patrones como "colegio_x_", "colegio-x-", "colegio x ", etc.
            if (selectedColegio) {
              const nombreColegio = selectedColegio.label.toLowerCase()
              // Extraer solo el nombre sin RBD
              const nombreSinRBD = nombreColegio.split('(rbd:')[0].trim()
              // Remover palabras comunes que pueden aparecer
              const palabrasColegio = nombreSinRBD.split(/\s+/).filter(p => p.length > 3)
              
              // Si el nombre del archivo empieza con palabras del colegio, removerlas
              for (const palabra of palabrasColegio) {
                const regex = new RegExp(`^${palabra.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[_\s-]+`, 'i')
                nombreArchivo = nombreArchivo.replace(regex, '')
              }
              
              // También remover patrones comunes: "colegio_", "colegio-", "colegio ", etc.
              nombreArchivo = nombreArchivo.replace(/^colegio[_\s-]+/i, '')
              nombreArchivo = nombreArchivo.replace(/^escuela[_\s-]+/i, '')
              nombreArchivo = nombreArchivo.replace(/^instituto[_\s-]+/i, '')
            }
            
            // Mapeo de números romanos a números
            const numerosRomanos: Record<string, number> = {
              'i': 1, 'ii': 2, 'iii': 3, 'iv': 4, 'v': 5,
              'vi': 6, 'vii': 7, 'viii': 8, 'ix': 9, 'x': 10,
              'xi': 11, 'xii': 12, 'xiii': 13, 'xiv': 14, 'xv': 15,
            }
            
            // Mapeo de números en texto a números
            const numerosTexto: Record<string, number> = {
              'primero': 1, 'primer': 1, '1ro': 1, '1er': 1, 'uno': 1,
              'segundo': 2, '2do': 2, '2º': 2, 'dos': 2,
              'tercero': 3, 'tercer': 3, '3ro': 3, '3er': 3, '3º': 3, 'tres': 3,
              'cuarto': 4, '4to': 4, '4º': 4, 'cuatro': 4,
              'quinto': 5, '5to': 5, '5º': 5, 'cinco': 5,
              'sexto': 6, '6to': 6, '6º': 6, 'seis': 6,
              'séptimo': 7, 'septimo': 7, '7mo': 7, '7º': 7, 'siete': 7,
              'octavo': 8, '8vo': 8, '8º': 8, 'ocho': 8,
              'noveno': 9, '9no': 9, '9º': 9, 'nueve': 9,
              'décimo': 10, 'decimo': 10, '10mo': 10, '10º': 10, 'diez': 10,
            }
            
            // Buscar número romano primero (puede estar al inicio, medio o final)
            // Buscar patrones como "i_medio", "ii_medio", "iv_medio", "i medio", "i_basico", etc.
            const patronRomano = nombreArchivo.match(/\b([ivxlcdm]+)\s*[_\s-]*(medio|media|basico|basica|básica)\b/i)
            if (patronRomano) {
              const romano = patronRomano[1].toLowerCase()
              if (numerosRomanos[romano]) {
                grado = numerosRomanos[romano]
                if (patronRomano[2] && (patronRomano[2].includes('medio') || patronRomano[2].includes('media'))) {
                  nivel = 'Media'
                } else {
                  nivel = 'Basica'
                }
                console.log(`[Carga Masiva PDFs] 🔍 Número romano detectado: "${romano}" → ${grado}° ${nivel}`)
              }
            }
            
            // Si no se encontró romano, buscar número romano aislado (sin palabra de nivel)
            if (!grado) {
              const romanoAislado = nombreArchivo.match(/\b([ivxlcdm]+)\b/i)
              if (romanoAislado) {
                const romano = romanoAislado[1].toLowerCase()
                if (numerosRomanos[romano] && numerosRomanos[romano] <= 4) {
                  // Solo para I, II, III, IV (típicamente Media)
                  grado = numerosRomanos[romano]
                  nivel = 'Media' // Asumir Media para números romanos sin contexto
                  console.log(`[Carga Masiva PDFs] 🔍 Número romano aislado detectado: "${romano}" → ${grado}° ${nivel}`)
                }
              }
            }
            
            // Si no se encontró romano, buscar número en texto
            if (!grado) {
              for (const [texto, num] of Object.entries(numerosTexto)) {
                if (nombreArchivo.includes(texto)) {
                  grado = num
                  break
                }
              }
            }
            
            // Si no se encontró en texto, buscar número directo
            // Buscar números que estén cerca de palabras clave de nivel
            if (!grado) {
              // Patrón: número seguido de espacio/guion/underscore y luego nivel
              const patronNumero = nombreArchivo.match(/(\d+)[º°]?\s*[_\s-]*(basico|basica|básica|medio|media)/i)
              if (patronNumero) {
                grado = parseInt(patronNumero[1])
                if (patronNumero[2] && (patronNumero[2].includes('medio') || patronNumero[2].includes('media'))) {
                  nivel = 'Media'
                }
              } else {
                // Buscar cualquier número en el archivo (puede estar en cualquier posición)
                const numeroMatch = nombreArchivo.match(/(\d+)/)
                if (numeroMatch) {
                  const num = parseInt(numeroMatch[1])
                  // Validar que sea un grado válido (1-12)
                  if (num >= 1 && num <= 12) {
                    grado = num
                  }
                }
              }
            }
            
            // Detectar nivel si no se detectó antes
            if (!nivel || nivel === 'Basica') {
              if (nombreArchivo.includes('medio') || nombreArchivo.includes('media')) {
                nivel = 'Media'
              } else if (nombreArchivo.includes('basico') || nombreArchivo.includes('básica') || nombreArchivo.includes('basica')) {
                nivel = 'Basica'
              }
            }
            
            // Si encontramos grado pero no nivel, asumir Básica para grados 1-8, Media para 9-12
            if (grado && !nivel) {
              nivel = grado <= 8 ? 'Basica' : 'Media'
            }
            
            // Si encontramos grado y nivel, proceder
            if (grado && nivel) {
              const nombreCurso = `${grado}° ${nivel}`
              console.log(`[Carga Masiva PDFs] 🔍 Curso detectado desde nombre: "${pdfInfo.file.name}" → ${nombreCurso}`)
              
              // Verificar si el curso existe, si no, crearlo
              let cursoId: string | number | null = null
              const cursoExistente = cursosExistentes.find((c: any) => {
                const attrs = c.attributes || c
                return (
                  attrs.nombre_curso === nombreCurso &&
                  attrs.nivel === nivel &&
                  String(attrs.grado) === String(grado) &&
                  (attrs.año || 0) === año
                )
              })

              if (cursoExistente) {
                cursoId = cursoExistente.documentId || cursoExistente.id
                console.log(`[Carga Masiva PDFs] ✅ Curso existente encontrado desde nombre: ${nombreCurso} (ID: ${cursoId})`)
              } else {
                // Crear curso si no existe
                console.log(`[Carga Masiva PDFs] ➕ Creando nuevo curso desde nombre: ${nombreCurso} (${nivel}, grado ${grado}, año ${año})`)
                try {
                  const crearCursoResponse = await fetch(`/api/crm/colegios/${selectedColegio.value}/cursos`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      nombre_curso: nombreCurso,
                      nivel: nivel,
                      grado: String(grado),
                      año: año,
                      activo: true,
                    }),
                  })

                  const crearCursoData = await crearCursoResponse.json()
                  if (crearCursoData.success && crearCursoData.data) {
                    cursoId = crearCursoData.data.documentId || crearCursoData.data.id
                    console.log(`[Carga Masiva PDFs] ✅ Curso creado exitosamente desde nombre: ${nombreCurso} (ID: ${cursoId})`)
                  } else {
                    throw new Error(crearCursoData.error || 'Error al crear curso')
                  }
                } catch (err: any) {
                  console.error(`[Carga Masiva PDFs] ❌ Error al crear curso desde nombre:`, err)
                  setPdfs(prev => prev.map((p, idx) => 
                    idx === i ? { 
                      ...p, 
                      estado: 'error' as const,
                      mensaje: `Error al crear curso: ${err.message}`,
                    } : p
                  ))
                  continue
                }
              }

              // ⚠️ IMPORTANTE: Solo procesar PDF con IA si el checkbox está marcado
              if (procesarPDF) {
                // Procesar PDF con IA para extraer productos
                const pdfBase64 = await new Promise<string>((resolve, reject) => {
                  const reader = new FileReader()
                  reader.onload = () => {
                    const result = reader.result as string
                    const base64 = result.split(',')[1]
                    resolve(base64)
                  }
                  reader.onerror = reject
                  reader.readAsDataURL(pdfInfo.file)
                })

                const procesarResponse = await fetch(`/api/crm/listas/carga-masiva-ia`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    colegioId: selectedColegio.value,
                    archivos: [{
                      nombre: pdfInfo.file.name,
                      contenido: pdfBase64,
                      colegioId: selectedColegio.value,
                      nivel: nivel as 'Basica' | 'Media',
                      grado: grado,
                      año: año,
                      cursoId: cursoId, // Pasar el cursoId si existe para que el endpoint lo actualice
                      url_original: urlOriginal || undefined,
                    }],
                  }),
                })

                const procesarData = await procesarResponse.json()

                if (procesarData.success) {
                const fechaPublicacion = procesarData.fechaPublicacion || new Date().toISOString()
                setPdfs(prev => {
                  const updated = prev.map((p, idx) => 
                    idx === i ? { 
                      ...p, 
                      estado: 'completado' as const,
                      cursoDetectado: {
                        nombre: nombreCurso,
                        nivel,
                        grado,
                        score: 70,
                      },
                      fechaPublicacion,
                      mensaje: cursoExistente ? 'Curso detectado y procesado desde nombre' : 'Curso creado y procesado desde nombre',
                    } : p
                  )
                  
                  // Guardar estado actualizado en localStorage
                  if (typeof window !== 'undefined') {
                    const pdfsInfo = updated.map(p => ({
                      nombre: p.file.name,
                      tamaño: p.file.size,
                      estado: p.estado,
                      cursoDetectado: p.cursoDetectado,
                      fechaPublicacion: p.fechaPublicacion,
                      mensaje: p.mensaje
                    }))
                    localStorage.setItem('carga-masiva-pdfs-pdfs-info', JSON.stringify(pdfsInfo))
                    setTimeout(() => {
                      window.dispatchEvent(new CustomEvent('carga-masiva-pdfs-update'))
                    }, 0)
                  }
                  
                  return updated
                })
                } else {
                  throw new Error(procesarData.error || 'Error al procesar PDF')
                }
              } else {
                // ⚡ OPTIMIZACIÓN: Si no se procesa el PDF, solo asignarlo al curso sin extraer productos
                // Esto es mucho más rápido ya que no requiere procesamiento con IA
                try {
                  const importPdfFormData = new FormData()
                  importPdfFormData.append('pdf', pdfInfo.file)
                  importPdfFormData.append('cursoId', String(cursoId))
                  importPdfFormData.append('colegioId', String(selectedColegio.value))

                  const importPdfResponse = await fetch('/api/crm/cursos/import-pdf', {
                    method: 'POST',
                    body: importPdfFormData,
                  })

                  const importPdfData = await importPdfResponse.json()

                  if (importPdfResponse.ok && importPdfData.success) {
                    setPdfs(prev => {
                      const updated = prev.map((p, idx) => 
                        idx === i ? { 
                          ...p, 
                          estado: 'completado' as const,
                          cursoDetectado: {
                            nombre: nombreCurso,
                            nivel,
                            grado,
                            score: 70,
                          },
                          mensaje: cursoExistente ? 'PDF asignado al curso (sin procesar)' : 'Curso creado y PDF asignado (sin procesar)',
                        } : p
                      )
                      
                      // Guardar estado actualizado en localStorage
                      if (typeof window !== 'undefined') {
                        const pdfsInfo = updated.map(p => ({
                          nombre: p.file.name,
                          tamaño: p.file.size,
                          estado: p.estado,
                          cursoDetectado: p.cursoDetectado,
                          fechaPublicacion: p.fechaPublicacion,
                          mensaje: p.mensaje
                        }))
                        localStorage.setItem('carga-masiva-pdfs-pdfs-info', JSON.stringify(pdfsInfo))
                        setTimeout(() => {
                          window.dispatchEvent(new CustomEvent('carga-masiva-pdfs-update'))
                        }, 0)
                      }
                      
                      return updated
                    })
                  } else {
                    throw new Error(importPdfData.error || 'Error al asignar PDF al curso')
                  }
                } catch (importErr: any) {
                  console.error(`[Carga Masiva PDFs] ❌ Error al asignar PDF sin procesar:`, importErr)
                  setPdfs(prev => prev.map((p, idx) => 
                    idx === i ? { 
                      ...p, 
                      estado: 'error' as const,
                      mensaje: `Error al asignar PDF: ${importErr.message}`,
                    } : p
                  ))
                }
              }
            } else {
              // No se pudo detectar grado o nivel
              console.warn(`[Carga Masiva PDFs] ⚠️ No se pudo detectar curso desde nombre: "${pdfInfo.file.name}"`)
              setPdfs(prev => {
                const updated = prev.map((p, idx) => 
                  idx === i ? { 
                    ...p, 
                    estado: 'error' as const,
                    mensaje: 'No se pudo detectar el curso desde el nombre del archivo',
                  } : p
                )
                
                // Guardar estado actualizado en localStorage
                if (typeof window !== 'undefined') {
                  const pdfsInfo = updated.map(p => ({
                    nombre: p.file.name,
                    tamaño: p.file.size,
                    estado: p.estado,
                    cursoDetectado: p.cursoDetectado,
                    fechaPublicacion: p.fechaPublicacion,
                    mensaje: p.mensaje
                  }))
                  localStorage.setItem('carga-masiva-pdfs-pdfs-info', JSON.stringify(pdfsInfo))
                  setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('carga-masiva-pdfs-update'))
                  }, 0)
                }
                
                return updated
              })
            }
            continue
          }

          // Extraer información del curso desde el key
          const [colegioId, nombreCurso, nivel, gradoStr, añoStr] = cursoKey.split('|')
          const grado = parseInt(gradoStr) || 1
          const añoCurso = parseInt(añoStr) || año

          // Verificar si el curso existe, si no, crearlo
          let cursoId: string | number | null = null
          const cursoExistente = cursosExistentes.find((c: any) => {
            const attrs = c.attributes || c
            return (
              attrs.nombre_curso === nombreCurso &&
              attrs.nivel === nivel &&
              String(attrs.grado) === String(grado) &&
              (attrs.año || 0) === añoCurso
            )
          })

          if (cursoExistente) {
            cursoId = cursoExistente.documentId || cursoExistente.id
            console.log(`[Carga Masiva PDFs] ✅ Curso existente encontrado: ${nombreCurso} (ID: ${cursoId})`)
          } else {
            // Crear curso si no existe
            console.log(`[Carga Masiva PDFs] ➕ Creando nuevo curso: ${nombreCurso} (${nivel}, grado ${grado}, año ${añoCurso})`)
            try {
              const crearCursoResponse = await fetch(`/api/crm/colegios/${selectedColegio.value}/cursos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  nombre_curso: nombreCurso,
                  nivel: nivel,
                  grado: String(grado),
                  año: añoCurso,
                  activo: true,
                }),
              })

              const crearCursoData = await crearCursoResponse.json()
              if (crearCursoData.success && crearCursoData.data) {
                cursoId = crearCursoData.data.documentId || crearCursoData.data.id
                console.log(`[Carga Masiva PDFs] ✅ Curso creado exitosamente: ${nombreCurso} (ID: ${cursoId})`)
              } else {
                throw new Error(crearCursoData.error || 'Error al crear curso')
              }
            } catch (err: any) {
              console.error(`[Carga Masiva PDFs] ❌ Error al crear curso:`, err)
              throw new Error(`Error al crear curso: ${err.message}`)
            }
          }

          // ⚠️ IMPORTANTE: Solo procesar PDF con IA si el checkbox está marcado
          if (procesarPDF) {
            // Convertir PDF a base64 para enviarlo a la API
            const pdfBase64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader()
              reader.onload = () => {
                const result = reader.result as string
                // Remover el prefijo "data:application/pdf;base64,"
                const base64 = result.split(',')[1]
                resolve(base64)
              }
              reader.onerror = reject
              reader.readAsDataURL(pdfInfo.file)
            })

            // Procesar PDF con IA para extraer productos
            const procesarResponse = await fetch(`/api/crm/listas/carga-masiva-ia`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                colegioId: selectedColegio.value,
                archivos: [{
                  nombre: pdfInfo.file.name,
                  contenido: pdfBase64,
                  colegioId: selectedColegio.value,
                  nivel: nivel as 'Basica' | 'Media',
                  grado: grado,
                  año: añoCurso,
                  cursoId: cursoId, // Pasar el cursoId si existe para que el endpoint lo actualice
                  url_original: urlOriginal || undefined, // URL original de donde se obtuvo el PDF
                }],
              }),
            })

            const procesarData = await procesarResponse.json()

            if (procesarData.success) {
            // Extraer fecha de publicación si está disponible
            const fechaPublicacion = procesarData.fechaPublicacion || new Date().toISOString()

            setPdfs(prev => {
              const updated = prev.map((p, idx) => 
                idx === i ? { 
                  ...p, 
                  estado: 'completado' as const,
                  cursoDetectado: {
                    nombre: nombreCurso,
                    nivel,
                    grado,
                    score: 95,
                  },
                  fechaPublicacion,
                  mensaje: cursoExistente ? 'Procesado exitosamente' : 'Curso creado y procesado exitosamente',
                } : p
              )
              
              // Guardar estado actualizado en localStorage
              if (typeof window !== 'undefined') {
                const pdfsInfo = updated.map(p => ({
                  nombre: p.file.name,
                  tamaño: p.file.size,
                  estado: p.estado,
                  cursoDetectado: p.cursoDetectado,
                  fechaPublicacion: p.fechaPublicacion,
                  mensaje: p.mensaje
                }))
                localStorage.setItem('carga-masiva-pdfs-pdfs-info', JSON.stringify(pdfsInfo))
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent('carga-masiva-pdfs-update'))
                }, 0)
              }
              
              return updated
            })
            } else {
              throw new Error(procesarData.error || 'Error al procesar PDF')
            }
          } else {
            // ⚡ OPTIMIZACIÓN: Si no se procesa el PDF, solo asignarlo al curso sin extraer productos
            // Esto es mucho más rápido ya que no requiere procesamiento con IA
            try {
              const importPdfFormData = new FormData()
              importPdfFormData.append('pdf', pdfInfo.file)
              importPdfFormData.append('cursoId', String(cursoId))
              importPdfFormData.append('colegioId', String(selectedColegio.value))

              const importPdfResponse = await fetch('/api/crm/cursos/import-pdf', {
                method: 'POST',
                body: importPdfFormData,
              })

              const importPdfData = await importPdfResponse.json()

              if (importPdfResponse.ok && importPdfData.success) {
                setPdfs(prev => {
                  const updated = prev.map((p, idx) => 
                    idx === i ? { 
                      ...p, 
                      estado: 'completado' as const,
                      cursoDetectado: {
                        nombre: nombreCurso,
                        nivel,
                        grado,
                        score: 95,
                      },
                      mensaje: cursoExistente ? 'PDF asignado al curso (sin procesar)' : 'Curso creado y PDF asignado (sin procesar)',
                    } : p
                  )
                  
                  // Guardar estado actualizado en localStorage
                  if (typeof window !== 'undefined') {
                    const pdfsInfo = updated.map(p => ({
                      nombre: p.file.name,
                      tamaño: p.file.size,
                      estado: p.estado,
                      cursoDetectado: p.cursoDetectado,
                      fechaPublicacion: p.fechaPublicacion,
                      mensaje: p.mensaje
                    }))
                    localStorage.setItem('carga-masiva-pdfs-pdfs-info', JSON.stringify(pdfsInfo))
                    setTimeout(() => {
                      window.dispatchEvent(new CustomEvent('carga-masiva-pdfs-update'))
                    }, 0)
                  }
                  
                  return updated
                })
              } else {
                throw new Error(importPdfData.error || 'Error al asignar PDF al curso')
              }
            } catch (importErr: any) {
              console.error(`[Carga Masiva PDFs] ❌ Error al asignar PDF sin procesar:`, importErr)
              setPdfs(prev => prev.map((p, idx) => 
                idx === i ? { 
                  ...p, 
                  estado: 'error' as const,
                  mensaje: `Error al asignar PDF: ${importErr.message}`,
                } : p
              ))
            }
          }

        } catch (err: any) {
          console.error(`Error procesando PDF ${pdfInfo.file.name}:`, err)
          setPdfs(prev => {
            const updated = prev.map((p, idx) => 
              idx === i ? { 
                ...p, 
                estado: 'error' as const,
                mensaje: err.message || 'Error al procesar',
              } : p
            )
            
            // Guardar estado actualizado en localStorage
            if (typeof window !== 'undefined') {
              const pdfsInfo = updated.map(p => ({
                nombre: p.file.name,
                tamaño: p.file.size,
                estado: p.estado,
                cursoDetectado: p.cursoDetectado,
                fechaPublicacion: p.fechaPublicacion,
                mensaje: p.mensaje
              }))
              localStorage.setItem('carga-masiva-pdfs-pdfs-info', JSON.stringify(pdfsInfo))
            }
            
            return updated
          })
        }
      }

      setProgress(100)
      setStep('results')
      
      // ⚠️ IMPORTANTE: Asegurar que los colegios estén cargados después del procesamiento
      // Esto evita que desaparezcan cuando el usuario quiere iniciar un nuevo proceso
      if (colegios.length === 0) {
        loadColegios()
      }
      
      // Mostrar notificación de éxito
      const successCount = pdfs.filter(p => p.estado === 'completado').length
      const errorCount = pdfs.filter(p => p.estado === 'error').length
      
      // Limpiar localStorage inmediatamente cuando termine
      if (typeof window !== 'undefined') {
        localStorage.removeItem('carga-masiva-pdfs-minimized')
        localStorage.removeItem('carga-masiva-pdfs-processing')
        localStorage.removeItem('carga-masiva-pdfs-progress')
        localStorage.removeItem('carga-masiva-pdfs-colegio')
        localStorage.removeItem('carga-masiva-pdfs-pdfs-info')
        localStorage.removeItem('carga-masiva-pdfs-año')
        localStorage.removeItem('carga-masiva-pdfs-url-original')
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('carga-masiva-pdfs-update'))
        }, 0)
      }
      
      if (successCount > 0) {
        // Construir mensaje de notificación con colegio y RBD
        const colegioNombre = selectedColegio?.label || 'Colegio'
        const colegioRBD = selectedColegio?.rbd ? ` (RBD: ${selectedColegio.rbd})` : ''
        const mensajeNotificacion = `${colegioNombre}${colegioRBD} procesado, listo para su uso!`
        
        mostrarNotificacion(
          'Carga Masiva Completada',
          mensajeNotificacion,
          errorCount > 0 ? 'info' : 'success'
        )
        
        // Disparar evento para que la tabla se actualice automáticamente
        if (typeof window !== 'undefined') {
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('carga-masiva-pdfs-completada', {
              detail: {
                colegioId: selectedColegio?.value,
                colegioNombre: selectedColegio?.label,
                colegioRBD: selectedColegio?.rbd,
                successCount,
                errorCount
              }
            }))
          }, 0)
        }
        
        // Cerrar el modal automáticamente después de mostrar la notificación (si está minimizado o no)
        setTimeout(() => {
          // Limpiar estado antes de cerrar
          setPdfs([])
          setSelectedColegio(null)
          setAño(new Date().getFullYear())
          setStep('config')
          setError(null)
          setProgress(0)
          setMinimized(false)
          
          // Cerrar el modal
          onHide()
          
          // Llamar callback de éxito si existe
          if (onSuccess) {
            onSuccess()
          }
        }, 2000) // Esperar 2 segundos para que el usuario vea la notificación
      } else {
        // Si no hubo éxitos, también cerrar después de un tiempo
        setTimeout(() => {
          setPdfs([])
          setSelectedColegio(null)
          setAño(new Date().getFullYear())
          setStep('config')
          setError(null)
          setProgress(0)
          setMinimized(false)
          onHide()
        }, 3000)
      }
    } catch (err: any) {
      console.error('Error en detección de cursos:', err)
      setError('Error al procesar PDFs: ' + err.message)
      setStep('upload')
      mostrarNotificacion('Error en Carga Masiva', err.message || 'Error al procesar PDFs', 'error')
    } finally {
      setProcessing(false)
      // El localStorage ya se limpió en el bloque anterior cuando terminó exitosamente
      // Solo limpiar aquí si hubo un error
      if (typeof window !== 'undefined' && step !== 'results') {
        // Si terminó con error, limpiar también
        localStorage.removeItem('carga-masiva-pdfs-minimized')
        localStorage.removeItem('carga-masiva-pdfs-processing')
        localStorage.removeItem('carga-masiva-pdfs-progress')
        localStorage.removeItem('carga-masiva-pdfs-colegio')
        localStorage.removeItem('carga-masiva-pdfs-pdfs-info')
        localStorage.removeItem('carga-masiva-pdfs-año')
        localStorage.removeItem('carga-masiva-pdfs-url-original')
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('carga-masiva-pdfs-update'))
        }, 0)
      }
    }
  }

  const handleClose = () => {
    // Si hay procesamiento en curso, minimizar en lugar de cerrar
    if (processing) {
      // Guardar estado actual antes de minimizar
      if (typeof window !== 'undefined') {
        localStorage.setItem('carga-masiva-pdfs-minimized', 'true')
        localStorage.setItem('carga-masiva-pdfs-processing', 'true')
        localStorage.setItem('carga-masiva-pdfs-progress', progress.toString())
        if (selectedColegio) {
          localStorage.setItem('carga-masiva-pdfs-colegio', JSON.stringify({
            value: selectedColegio.value,
            label: selectedColegio.label,
            rbd: selectedColegio.rbd
          }))
        }
        if (año) {
          localStorage.setItem('carga-masiva-pdfs-año', año.toString())
        }
        if (urlOriginal) {
          localStorage.setItem('carga-masiva-pdfs-url-original', urlOriginal)
        }
        if (pdfs.length > 0) {
          const pdfsInfo = pdfs.map(pdf => ({
            nombre: pdf.file.name,
            tamaño: pdf.file.size,
            estado: pdf.estado,
            cursoDetectado: pdf.cursoDetectado,
            fechaPublicacion: pdf.fechaPublicacion,
            mensaje: pdf.mensaje
          }))
          localStorage.setItem('carga-masiva-pdfs-pdfs-info', JSON.stringify(pdfsInfo))
        }
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('carga-masiva-pdfs-update'))
        }, 0)
      }
      setMinimized(true)
      return
    }
    
    // Solo limpiar si no hay procesamiento en curso
    setPdfs([])
    setSelectedColegio(null)
    setAño(new Date().getFullYear())
    setStep('config')
    setError(null)
    setProgress(0)
    setMinimized(false)
    // ⚠️ IMPORTANTE: Asegurar que los colegios estén cargados al cerrar y volver a abrir
    if (colegios.length === 0) {
      loadColegios()
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('carga-masiva-pdfs-minimized')
      localStorage.removeItem('carga-masiva-pdfs-processing')
      localStorage.removeItem('carga-masiva-pdfs-progress')
      localStorage.removeItem('carga-masiva-pdfs-colegio')
      localStorage.removeItem('carga-masiva-pdfs-pdfs-info')
      localStorage.removeItem('carga-masiva-pdfs-año')
      localStorage.removeItem('carga-masiva-pdfs-url-original')
    }
    // NO minimizar automáticamente - solo cuando el usuario haga clic en el botón
    onHide()
  }

  const successCount = pdfs.filter(p => p.estado === 'completado').length
  const errorCount = pdfs.filter(p => p.estado === 'error').length

  // Verificar si hay un proceso en curso guardado en localStorage (para persistencia)
  const [hasPersistedProcess, setHasPersistedProcess] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('carga-masiva-pdfs-processing') === 'true'
    }
    return false
  })

  // Actualizar hasPersistedProcess cuando cambie processing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setHasPersistedProcess(processing || localStorage.getItem('carga-masiva-pdfs-processing') === 'true')
    }
  }, [processing])

  return (
    <>
      <Modal 
        show={show && !minimized} 
        onHide={() => {
          // Si está procesando, minimizar en lugar de cerrar
          if (processing) {
            setMinimized(true)
          } else {
            handleClose()
          }
        }}
        size="xl" 
        centered
        backdrop={processing ? 'static' : true} // Prevenir cerrar con click fuera si está procesando
      >
        <ModalHeader closeButton={!processing}>
          <div className="d-flex align-items-center justify-content-between w-100 me-3">
            <ModalTitle>
              <LuSparkles className="me-2" />
              Carga Masiva de PDFs por Colegio
            </ModalTitle>
            {processing && (
              <div className="d-flex align-items-center gap-2">
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setMinimized(true)}
                  className="p-0"
                  title="Minimizar (continuará en segundo plano)"
                >
                  <LuMinimize2 size={20} />
                </Button>
              </div>
            )}
          </div>
        </ModalHeader>
      <ModalBody>
        {error && (
          <Alert variant="danger" className="mb-3">
            {error}
          </Alert>
        )}

        {step === 'config' && (
          <div>
            <Alert variant="info" className="mb-3">
              <strong>Instrucciones:</strong>
              <ul className="mb-0 mt-2">
                <li><strong>1. Selecciona el colegio</strong> al que pertenecen los PDFs</li>
                <li><strong>2. Indica el año</strong> de las listas de útiles</li>
                <li><strong>3. Sube los PDFs</strong> de las listas (puedes subir múltiples)</li>
                <li><strong>4. El sistema usará IA</strong> para reconocer automáticamente el curso de cada PDF</li>
                <li><strong>5. Opcionalmente se procesarán los PDFs</strong> con IA para extraer productos y crear las listas (puedes desactivarlo con el checkbox)</li>
              </ul>
            </Alert>

            <FormGroup className="mb-3">
              <FormLabel>Colegio <span className="text-danger">*</span></FormLabel>
              <Select
                options={colegios}
                value={selectedColegio}
                onChange={(option) => setSelectedColegio(option)}
                placeholder="Selecciona un colegio o busca por RBD..."
                isLoading={loadingColegios}
                isClearable
                isSearchable
                filterOption={(option: any, searchText: string) => {
                  if (!searchText) return true
                  const search = searchText.toLowerCase()
                  const label = String(option.label || '').toLowerCase()
                  const rbd = (option.data?.rbd || option.rbd) ? String(option.data?.rbd || option.rbd) : ''
                  
                  // Buscar por nombre o RBD
                  return label.includes(search) || rbd.includes(search)
                }}
                formatOptionLabel={(option: any) => {
                  if (!option) return null
                  const label = option.label || ''
                  const rbd = option.data?.rbd || option.rbd
                  return (
                    <div>
                      <div>{label}</div>
                      {rbd && (
                        <small className="text-muted">RBD: {rbd}</small>
                      )}
                    </div>
                  )
                }}
                noOptionsMessage={({ inputValue }) => 
                  inputValue ? `No se encontró colegio con "${inputValue}"` : 'No hay colegios disponibles'
                }
              />
              <small className="text-muted">
                💡 Puedes escribir el nombre del colegio o su RBD para buscar más rápido
              </small>
            </FormGroup>

            <FormGroup className="mb-3">
              <FormLabel>Año <span className="text-danger">*</span></FormLabel>
              <FormControl
                as="select"
                value={año}
                onChange={(e) => setAño(parseInt(e.target.value))}
              >
                {Array.from({ length: 11 }, (_, i) => {
                  const year = new Date().getFullYear() - 2 + i
                  return (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  )
                })}
              </FormControl>
            </FormGroup>

            <FormGroup className="mb-3">
              <FormLabel>URL ORIGINAL (opcional)</FormLabel>
              <FormControl
                type="url"
                placeholder="https://colegio.cl/listas-utiles"
                value={urlOriginal}
                onChange={(e) => setUrlOriginal(e.target.value)}
              />
              <small className="text-muted">
                URL de la página web de donde se obtuvieron los PDFs. Se aplicará a todos los PDFs subidos.
              </small>
            </FormGroup>

            <FormGroup className="mb-3">
              <FormCheck
                type="checkbox"
                id="procesar-pdf-checkbox"
                checked={procesarPDF}
                onChange={(e) => setProcesarPDF(e.target.checked)}
                label={
                  <div>
                    <strong>Procesar PDFs con IA</strong>
                    <br />
                    <small className="text-muted">
                      Si está marcado, los PDFs se procesarán automáticamente con IA para extraer productos y crear las listas. 
                      Si no está marcado, solo se subirán los PDFs y se asignarán a los cursos sin procesar.
                    </small>
                  </div>
                }
              />
            </FormGroup>

            <div className="d-flex justify-content-end">
              <Button
                variant="primary"
                onClick={() => setStep('upload')}
                disabled={!selectedColegio || !año}
              >
                Continuar
              </Button>
            </div>
          </div>
        )}

        {step === 'upload' && (
          <div>
            <Alert variant="info" className="mb-3">
              <strong>Colegio seleccionado:</strong> {selectedColegio?.label}<br />
              <strong>Año:</strong> {año}
              {urlOriginal && (
                <>
                  <br />
                  <strong>URL Original:</strong> <a href={urlOriginal} target="_blank" rel="noopener noreferrer" className="text-break">{urlOriginal}</a>
                </>
              )}
              <br />
              <strong>Procesar PDFs con IA:</strong> {procesarPDF ? '✓ Sí' : '✗ No'}
            </Alert>

            <FormGroup className="mb-3">
              <FormLabel>Subir PDFs de Listas de Útiles</FormLabel>
              <FormControl
                type="file"
                accept=".pdf"
                multiple
                onChange={handleFileSelect}
                ref={fileInputRef}
              />
              <small className="text-muted">Puedes seleccionar múltiples PDFs a la vez</small>
            </FormGroup>

            {pdfs.length > 0 && (
              <div className="mb-3">
                <h6>PDFs seleccionados ({pdfs.length}):</h6>
                <Table striped bordered size="sm">
                  <thead>
                    <tr>
                      <th>Archivo</th>
                      <th>Tamaño</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pdfs.map((pdf, index) => (
                      <tr key={index}>
                        <td>{pdf.file.name}</td>
                        <td>{(pdf.file.size / 1024).toFixed(2)} KB</td>
                        <td>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleRemovePDF(index)}
                          >
                            <LuX />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}

            <div className="d-flex justify-content-between">
              <Button variant="secondary" onClick={() => {
                // ⚠️ IMPORTANTE: Asegurar que los colegios estén cargados al volver a config
                if (colegios.length === 0) {
                  loadColegios()
                }
                setStep('config')
              }}>
                Atrás
              </Button>
              <Button
                variant="success"
                onClick={handleDetectarCursos}
                disabled={pdfs.length === 0 || processing}
              >
                <LuSparkles className="me-2" />
                Procesar con IA
              </Button>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div>
            <Alert variant="info" className="mb-3">
              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center">
                  <Spinner size="sm" className="me-2" />
                  <span>Procesando PDFs con IA... Por favor espera.</span>
                </div>
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={() => setMinimized(true)}
                  className="d-flex align-items-center gap-1"
                >
                  <LuMinimize2 size={16} />
                  Minimizar
                </Button>
              </div>
              <small className="mt-2 d-block">
                💡 <strong>Tip:</strong> Puedes minimizar este modal (botón arriba o aquí) y seguir trabajando. 
                El progreso se mostrará en la esquina inferior derecha. También puedes hacer click fuera del modal 
                para minimizarlo automáticamente.
              </small>
            </Alert>
            {selectedColegio && (
              <Alert variant="secondary" className="mb-3">
                <strong>Colegio:</strong> {selectedColegio.label}
                {selectedColegio.rbd && (
                  <span className="ms-2">
                    <strong>RBD:</strong> {selectedColegio.rbd}
                  </span>
                )}
              </Alert>
            )}
            <ProgressBar now={progress} label={`${progress}%`} className="mb-3" />
            
            <Table striped bordered size="sm">
              <thead>
                <tr>
                  <th>Archivo</th>
                  <th>Estado</th>
                  <th>Curso Detectado</th>
                </tr>
              </thead>
              <tbody>
                {pdfs.map((pdf, index) => (
                  <tr key={index}>
                    <td>{pdf.file.name}</td>
                    <td>
                      {pdf.estado === 'pendiente' && <Badge bg="secondary">Pendiente</Badge>}
                      {pdf.estado === 'procesando' && (
                        <Badge bg="warning">
                          <Spinner size="sm" className="me-1" />
                          Procesando...
                        </Badge>
                      )}
                      {pdf.estado === 'completado' && <Badge bg="success">Completado</Badge>}
                      {pdf.estado === 'error' && <Badge bg="danger">Error</Badge>}
                    </td>
                    <td>
                      {pdf.cursoDetectado ? (
                        <span>
                          {pdf.cursoDetectado.nombre} (Score: {pdf.cursoDetectado.score}%)
                        </span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}

        {step === 'results' && (
          <div>
            <Alert variant={errorCount === 0 ? 'success' : 'warning'} className="mb-3">
              <strong>Procesamiento completado:</strong><br />
              ✅ Exitosos: {successCount}<br />
              {errorCount > 0 && <>❌ Errores: {errorCount}<br /></>}
            </Alert>

            <Table striped bordered>
              <thead>
                <tr>
                  <th>Archivo</th>
                  <th>Estado</th>
                  <th>Curso</th>
                  <th>Fecha Publicación</th>
                  <th>Mensaje</th>
                </tr>
              </thead>
              <tbody>
                {pdfs.map((pdf, index) => (
                  <tr key={index}>
                    <td>{pdf.file.name}</td>
                    <td>
                      {pdf.estado === 'completado' && <Badge bg="success"><LuCheck /> Completado</Badge>}
                      {pdf.estado === 'error' && <Badge bg="danger"><LuX /> Error</Badge>}
                    </td>
                    <td>
                      {pdf.cursoDetectado ? (
                        <strong>{pdf.cursoDetectado.nombre}</strong>
                      ) : (
                        <span className="text-muted">No detectado</span>
                      )}
                    </td>
                    <td>
                      {pdf.fechaPublicacion ? (
                        new Date(pdf.fechaPublicacion).toLocaleDateString('es-CL')
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>{pdf.mensaje || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        {step === 'results' && (
          <Button variant="success" onClick={() => {
            if (onSuccess) onSuccess()
            handleClose()
          }}>
            Cerrar
          </Button>
        )}
        {step !== 'results' && (
          <Button variant="secondary" onClick={handleClose}>
            Cancelar
          </Button>
        )}
      </ModalFooter>
    </Modal>
    </>
  )
}
