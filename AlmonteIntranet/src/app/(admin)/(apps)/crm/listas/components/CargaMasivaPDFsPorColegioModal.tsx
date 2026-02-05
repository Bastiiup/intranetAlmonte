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
import { LuUpload, LuFileText, LuCheck, LuX, LuSparkles } from 'react-icons/lu'
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
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [loadingColegios, setLoadingColegios] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Cargar colegios al abrir el modal
  useEffect(() => {
    if (show) {
      loadColegios()
      setSelectedColegio(null)
      setAño(new Date().getFullYear())
      setUrlOriginal('')
      setPdfs([])
      setStep('config')
      setError(null)
      setProgress(0)
    }
  }, [show])

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

      // Procesar cada PDF
      for (let i = 0; i < pdfs.length; i++) {
        const pdfInfo = pdfs[i]
        setProgress(Math.round((i / pdfs.length) * 50))

        try {
          // Actualizar estado
          setPdfs(prev => prev.map((p, idx) => 
            idx === i ? { ...p, estado: 'procesando' } : p
          ))

          // Subir PDF a Strapi primero
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
                      estado: 'error',
                      mensaje: `Error al crear curso: ${err.message}`,
                    } : p
                  ))
                  continue
                }
              }

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
                setPdfs(prev => prev.map((p, idx) => 
                  idx === i ? { 
                    ...p, 
                    estado: 'completado',
                    cursoDetectado: {
                      nombre: nombreCurso,
                      nivel,
                      grado,
                      score: 70,
                    },
                    fechaPublicacion,
                    mensaje: cursoExistente ? 'Curso detectado y procesado desde nombre' : 'Curso creado y procesado desde nombre',
                  } : p
                ))
              } else {
                throw new Error(procesarData.error || 'Error al procesar PDF')
              }
            } else {
              // No se pudo detectar grado o nivel
              console.warn(`[Carga Masiva PDFs] ⚠️ No se pudo detectar curso desde nombre: "${pdfInfo.file.name}"`)
              setPdfs(prev => prev.map((p, idx) => 
                idx === i ? { 
                  ...p, 
                  estado: 'error',
                  mensaje: 'No se pudo detectar el curso desde el nombre del archivo',
                } : p
              ))
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

            setPdfs(prev => prev.map((p, idx) => 
              idx === i ? { 
                ...p, 
                estado: 'completado',
                cursoDetectado: {
                  nombre: nombreCurso,
                  nivel,
                  grado,
                  score: 95,
                },
                fechaPublicacion,
                mensaje: cursoExistente ? 'Procesado exitosamente' : 'Curso creado y procesado exitosamente',
              } : p
            ))
          } else {
            throw new Error(procesarData.error || 'Error al procesar PDF')
          }

        } catch (err: any) {
          console.error(`Error procesando PDF ${pdfInfo.file.name}:`, err)
          setPdfs(prev => prev.map((p, idx) => 
            idx === i ? { 
              ...p, 
              estado: 'error',
              mensaje: err.message || 'Error al procesar',
            } : p
          ))
        }
      }

      setProgress(100)
      setStep('results')
    } catch (err: any) {
      console.error('Error en detección de cursos:', err)
      setError('Error al procesar PDFs: ' + err.message)
      setStep('upload')
    } finally {
      setProcessing(false)
    }
  }

  const handleClose = () => {
    setPdfs([])
    setSelectedColegio(null)
    setAño(new Date().getFullYear())
    setStep('config')
    setError(null)
    setProgress(0)
    onHide()
  }

  const successCount = pdfs.filter(p => p.estado === 'completado').length
  const errorCount = pdfs.filter(p => p.estado === 'error').length

  return (
    <Modal show={show} onHide={handleClose} size="xl" centered>
      <ModalHeader closeButton>
        <ModalTitle>
          <LuSparkles className="me-2" />
          Carga Masiva de PDFs por Colegio
        </ModalTitle>
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
                <li><strong>5. Se procesarán los PDFs</strong> para extraer productos y crear las listas</li>
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
              <Button variant="secondary" onClick={() => setStep('config')}>
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
              <Spinner size="sm" className="me-2" />
              Procesando PDFs con IA... Por favor espera.
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
  )
}
