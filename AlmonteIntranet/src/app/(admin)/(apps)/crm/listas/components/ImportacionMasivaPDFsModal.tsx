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
import { LuUpload, LuFileText, LuCheck, LuX, LuDownload, LuFileSpreadsheet } from 'react-icons/lu'
import Select from 'react-select'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'

interface ImportacionMasivaPDFsModalProps {
  show: boolean
  onHide: () => void
  onSuccess?: () => void
  colegioId?: number | string
}

interface ColegioOption {
  value: number | string
  label: string
}

interface CursoOption {
  value: number | string
  label: string
  nivel: string
  grado: number
}

interface PDFMapping {
  file: File | null
  cursoId: number | string | null
  cursoNombre: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
  _nombrePDF?: string // Para modo Excel
  _rowData?: any // Para modo Excel
}

export default function ImportacionMasivaPDFsModal({ 
  show, 
  onHide, 
  onSuccess,
  colegioId: initialColegioId 
}: ImportacionMasivaPDFsModalProps) {
  const [colegios, setColegios] = useState<ColegioOption[]>([])
  const [selectedColegio, setSelectedColegio] = useState<ColegioOption | null>(null)
  const [cursos, setCursos] = useState<CursoOption[]>([])
  const [loadingColegios, setLoadingColegios] = useState(false)
  const [loadingCursos, setLoadingCursos] = useState(false)
  const [pdfMappings, setPdfMappings] = useState<PDFMapping[]>([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [importMode, setImportMode] = useState<'manual' | 'excel'>('excel')
  const [excelFile, setExcelFile] = useState<File | null>(null)
  const [zipFile, setZipFile] = useState<File | null>(null)
  const [loadingExcel, setLoadingExcel] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const excelInputRef = useRef<HTMLInputElement>(null)
  const zipInputRef = useRef<HTMLInputElement>(null)

  // Cargar colegios al abrir el modal
  useEffect(() => {
    if (show) {
      loadColegios()
      if (initialColegioId) {
        // Si se pasa un colegioId inicial, seleccionarlo
        setTimeout(() => {
          const colegio = colegios.find(c => c.value === initialColegioId)
          if (colegio) {
            setSelectedColegio(colegio)
            loadCursos(initialColegioId)
          }
        }, 500)
      }
    }
  }, [show])

  // Cargar colegios cuando cambia la lista
  useEffect(() => {
    if (show && colegios.length > 0 && initialColegioId) {
      const colegio = colegios.find(c => c.value === initialColegioId)
      if (colegio) {
        setSelectedColegio(colegio)
        loadCursos(initialColegioId)
      }
    }
  }, [colegios, initialColegioId, show])

  const loadColegios = async () => {
    setLoadingColegios(true)
    setError(null)
    try {
      const response = await fetch('/api/crm/colegios/list?pagination[pageSize]=1000')
      const result = await response.json()
      
      if (result.success && Array.isArray(result.data)) {
        const colegiosOptions: ColegioOption[] = result.data.map((colegio: any) => ({
          value: colegio.id,
          label: colegio.nombre || 'Sin nombre',
        }))
        setColegios(colegiosOptions)
      }
    } catch (err: any) {
      setError('Error al cargar colegios: ' + err.message)
    } finally {
      setLoadingColegios(false)
    }
  }

  const loadCursos = async (colegioId: number | string) => {
    setLoadingCursos(true)
    setError(null)
    try {
      const response = await fetch(`/api/crm/colegios/${colegioId}/cursos`)
      const result = await response.json()
      
      if (result.success && Array.isArray(result.data)) {
        const cursosOptions: CursoOption[] = result.data.map((curso: any) => {
          const attrs = curso.attributes || curso
          return {
            value: curso.id || curso.documentId,
            label: `${attrs.nombre_curso || attrs.curso_nombre || 'Sin nombre'} - ${attrs.nivel || ''} ${attrs.grado || ''}°`,
            nivel: attrs.nivel || '',
            grado: attrs.grado || 0,
          }
        })
        setCursos(cursosOptions)
      }
    } catch (err: any) {
      setError('Error al cargar cursos: ' + err.message)
    } finally {
      setLoadingCursos(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const pdfFiles = files.filter(file => file.type === 'application/pdf' || file.name.endsWith('.pdf'))
    
    if (pdfFiles.length === 0) {
      setError('Por favor, selecciona al menos un archivo PDF')
      return
    }

    // Crear mappings iniciales con intento de identificación automática
    const mappings: PDFMapping[] = pdfFiles.map(file => {
      // Intentar identificar el curso desde el nombre del archivo
      // Ejemplos: "1° Basica - Lista Utiles.pdf", "1 Basica.pdf", "1° Basica.pdf"
      const fileName = file.name.toLowerCase()
      let cursoId: number | string | null = null
      let cursoNombre = 'No identificado'

      // Buscar coincidencias en los nombres de cursos
      for (const curso of cursos) {
        const cursoLabel = curso.label.toLowerCase()
        // Buscar grado y nivel en el nombre del archivo
        const gradoMatch = cursoLabel.match(/(\d+)/)
        const nivelMatch = cursoLabel.match(/(basica|media)/)
        
        if (gradoMatch && nivelMatch) {
          const grado = gradoMatch[1]
          const nivel = nivelMatch[1]
          
          // Verificar si el nombre del archivo contiene el grado y nivel
          if (fileName.includes(grado) && fileName.includes(nivel)) {
            cursoId = curso.value
            cursoNombre = curso.label
            break
          }
        }
      }

      return {
        file,
        cursoId,
        cursoNombre,
        status: 'pending' as const,
      }
    })

    setPdfMappings(mappings)
    setError(null)
  }

  const handleCursoChange = (index: number, cursoId: number | string | null) => {
    setPdfMappings(prev => {
      const updated = [...prev]
      const curso = cursos.find(c => c.value === cursoId)
      updated[index] = {
        ...updated[index],
        cursoId,
        cursoNombre: curso ? curso.label : 'No seleccionado',
      }
      return updated
    })
  }

  const handleUpload = async () => {
    if (!selectedColegio) {
      setError('Por favor, selecciona un colegio')
      return
    }

    const validMappings = pdfMappings.filter(m => m.cursoId && m.file)
    if (validMappings.length === 0) {
      setError('Por favor, asigna al menos un PDF a un curso')
      return
    }

    setUploading(true)
    setProgress(0)
    setError(null)

    const results: PDFMapping[] = []

    for (let i = 0; i < validMappings.length; i++) {
      const mapping = validMappings[i]
      
      // Actualizar estado a uploading
      setPdfMappings(prev => {
        const updated = [...prev]
        const index = prev.findIndex(m => m.file === mapping.file)
        if (index !== -1) {
          updated[index] = { ...updated[index], status: 'uploading' }
        }
        return updated
      })

      setProgress(Math.round(((i + 1) / validMappings.length) * 100))

      try {
        if (!mapping.file) {
          throw new Error('Archivo PDF no disponible')
        }

        const formData = new FormData()
        formData.append('pdf', mapping.file)
        formData.append('cursoId', String(mapping.cursoId))
        formData.append('colegioId', String(selectedColegio.value))

        const response = await fetch('/api/crm/cursos/import-pdf', {
          method: 'POST',
          body: formData,
        })

        const result = await response.json()

        if (result.success) {
          results.push({ ...mapping, status: 'success' })
          
          // Actualizar estado a success
          setPdfMappings(prev => {
            const updated = [...prev]
            const index = prev.findIndex(m => m.file === mapping.file)
            if (index !== -1) {
              updated[index] = { ...updated[index], status: 'success' }
            }
            return updated
          })
        } else {
          results.push({ 
            ...mapping, 
            status: 'error',
            error: result.error || 'Error desconocido'
          })
          
          // Actualizar estado a error
          setPdfMappings(prev => {
            const updated = [...prev]
            const index = prev.findIndex(m => m.file === mapping.file)
            if (index !== -1) {
              updated[index] = { 
                ...updated[index], 
                status: 'error',
                error: result.error || 'Error desconocido'
              }
            }
            return updated
          })
        }

        // Pequeño delay entre uploads para evitar sobrecarga
        if (i < validMappings.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      } catch (err: any) {
        results.push({ 
          ...mapping, 
          status: 'error',
          error: err.message || 'Error al subir PDF'
        })
        
        // Actualizar estado a error
        setPdfMappings(prev => {
          const updated = [...prev]
          const index = prev.findIndex(m => m.file === mapping.file)
          if (index !== -1) {
            updated[index] = { 
              ...updated[index], 
              status: 'error',
              error: err.message || 'Error al subir PDF'
            }
          }
          return updated
        })
      }
    }

    setUploading(false)
    
    // Notificar éxito
    const successCount = results.filter(r => r.status === 'success').length
    if (successCount > 0 && onSuccess) {
      onSuccess()
    }
  }

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls') && !file.name.endsWith('.csv')) {
      setError('Por favor, selecciona un archivo Excel (.xlsx, .xls) o CSV')
      return
    }

    if (!selectedColegio) {
      setError('Por favor, selecciona un colegio primero')
      return
    }

    setLoadingExcel(true)
    setError(null)
    setExcelFile(file)

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

        // Crear mappings desde el Excel
        const mappings: PDFMapping[] = []
        
        for (const row of normalizedData) {
          const nombrePDF = String(row.nombre_pdf || row.archivo_pdf || row.ruta_pdf || row.pdf || '').trim()
          if (!nombrePDF) continue

          // Buscar el curso por nombre, nivel y grado
          const nombreCurso = String(row.nombre_curso || row.curso || row.curso_nombre || '').trim()
          const nivel = String(row.nivel || '').trim()
          const grado = String(row.grado || '').trim()

          let cursoId: number | string | null = null
          let cursoNombre = 'No encontrado'

          // Buscar curso que coincida
          for (const curso of cursos) {
            const cursoLabel = curso.label.toLowerCase()
            const matchNombre = !nombreCurso || cursoLabel.includes(nombreCurso.toLowerCase())
            const matchNivel = !nivel || cursoLabel.includes(nivel.toLowerCase())
            const matchGrado = !grado || cursoLabel.includes(grado)

            if (matchNombre && matchNivel && matchGrado) {
              cursoId = curso.value
              cursoNombre = curso.label
              break
            }
          }

          // Si no se encontró, intentar solo por grado y nivel
          if (!cursoId) {
            for (const curso of cursos) {
              const cursoLabel = curso.label.toLowerCase()
              const matchNivel = nivel && cursoLabel.includes(nivel.toLowerCase())
              const matchGrado = grado && cursoLabel.includes(grado)

              if (matchNivel && matchGrado) {
                cursoId = curso.value
                cursoNombre = curso.label
                break
              }
            }
          }

          mappings.push({
            file: null, // Se asignará cuando se extraiga del ZIP
            cursoId,
            cursoNombre,
            status: 'pending',
            _nombrePDF: nombrePDF, // Guardar nombre para buscar en ZIP
            _rowData: row, // Guardar datos de la fila
          })
        }

        // Si hay ZIP, extraer los PDFs
        if (zipFile) {
          await extractPDFsFromZip(mappings)
        } else {
          setPdfMappings(mappings as any)
          setError('Excel procesado. Por favor, sube un archivo ZIP con los PDFs.')
        }

        setLoadingExcel(false)
      } catch (err: any) {
        setError('Error al leer el archivo Excel: ' + err.message)
        setLoadingExcel(false)
      }
    }

    if (file.name.endsWith('.csv')) {
      reader.readAsText(file)
    } else {
      reader.readAsBinaryString(file)
    }
  }

  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.zip')) {
      setError('Por favor, selecciona un archivo ZIP')
      return
    }

    setZipFile(file)
    setError(null)

    // Si ya hay mappings del Excel, extraer PDFs
    if (pdfMappings.length > 0) {
      await extractPDFsFromZip(pdfMappings)
    }
  }

  const extractPDFsFromZip = async (mappings: any[]) => {
    if (!zipFile) {
      setError('Por favor, sube un archivo ZIP con los PDFs')
      return
    }

    try {
      const zip = new JSZip()
      const zipData = await zipFile.arrayBuffer()
      const zipContents = await zip.loadAsync(zipData)

      const updatedMappings: PDFMapping[] = []

      for (const mapping of mappings) {
        const nombrePDF = mapping._nombrePDF || ''
        
        // Buscar el archivo en el ZIP (buscar por nombre exacto o similar)
        let pdfFile: File | null = null
        
        for (const [fileName, file] of Object.entries(zipContents.files)) {
          if (file.dir) continue
          
          // Comparar nombres (case-insensitive, sin extensiones)
          const zipFileName = fileName.toLowerCase().replace(/\.pdf$/i, '')
          const searchName = nombrePDF.toLowerCase().replace(/\.pdf$/i, '')
          
          if (zipFileName === searchName || zipFileName.includes(searchName) || searchName.includes(zipFileName)) {
            // Extraer el archivo
            const blob = await file.async('blob')
            pdfFile = new File([blob], fileName.split('/').pop() || nombrePDF, { type: 'application/pdf' })
            break
          }
        }

        if (pdfFile) {
          updatedMappings.push({
            file: pdfFile,
            cursoId: mapping.cursoId,
            cursoNombre: mapping.cursoNombre,
            status: 'pending',
          })
        } else {
          // PDF no encontrado en ZIP
          updatedMappings.push({
            file: null,
            cursoId: mapping.cursoId,
            cursoNombre: mapping.cursoNombre,
            status: 'error',
            error: `PDF no encontrado: ${nombrePDF}`,
          })
        }
      }

      setPdfMappings(updatedMappings.filter(m => m.file))
      
      const notFound = updatedMappings.filter(m => !m.file).length
      if (notFound > 0) {
        setError(`${notFound} PDF(s) no encontrado(s) en el ZIP. Verifica que los nombres coincidan con el Excel.`)
      }
    } catch (err: any) {
      setError('Error al extraer PDFs del ZIP: ' + err.message)
    }
  }

  const handleReset = () => {
    setPdfMappings([])
    setProgress(0)
    setError(null)
    setExcelFile(null)
    setZipFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    if (excelInputRef.current) {
      excelInputRef.current.value = ''
    }
    if (zipInputRef.current) {
      zipInputRef.current.value = ''
    }
  }

  const successCount = pdfMappings.filter(m => m.status === 'success').length
  const errorCount = pdfMappings.filter(m => m.status === 'error').length
  const pendingCount = pdfMappings.filter(m => m.status === 'pending').length

  return (
    <Modal show={show} onHide={onHide} size="xl">
      <ModalHeader closeButton>
        <ModalTitle>
          <LuUpload className="me-2" />
          Importación Masiva de PDFs
        </ModalTitle>
      </ModalHeader>
      <ModalBody>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Form>
          <FormGroup className="mb-3">
            <FormLabel>Seleccionar Colegio</FormLabel>
            <Select
              options={colegios}
              value={selectedColegio}
              onChange={(option) => {
                setSelectedColegio(option)
                if (option) {
                  loadCursos(option.value)
                } else {
                  setCursos([])
                }
              }}
              isLoading={loadingColegios}
              placeholder="Selecciona un colegio..."
              isDisabled={!!initialColegioId}
            />
          </FormGroup>

          {selectedColegio && (
            <>
              <FormGroup className="mb-3">
                <FormLabel>Modo de Importación</FormLabel>
                <div className="btn-group" role="group">
                  <input
                    type="radio"
                    className="btn-check"
                    name="importMode"
                    id="modeExcel"
                    checked={importMode === 'excel'}
                    onChange={() => setImportMode('excel')}
                    disabled={uploading}
                  />
                  <label className="btn btn-outline-primary" htmlFor="modeExcel">
                    <LuFileSpreadsheet className="me-2" />
                    Por Excel + ZIP
                  </label>
                  
                  <input
                    type="radio"
                    className="btn-check"
                    name="importMode"
                    id="modeManual"
                    checked={importMode === 'manual'}
                    onChange={() => setImportMode('manual')}
                    disabled={uploading}
                  />
                  <label className="btn btn-outline-primary" htmlFor="modeManual">
                    <LuUpload className="me-2" />
                    Manual
                  </label>
                </div>
              </FormGroup>

              {importMode === 'excel' ? (
                <>
                  <FormGroup className="mb-3">
                    <FormLabel>
                      <LuFileSpreadsheet className="me-2" />
                      Archivo Excel (.xlsx, .xls, .csv)
                    </FormLabel>
                    <FormControl
                      ref={excelInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                      onChange={handleExcelUpload}
                      disabled={uploading || loadingCursos || loadingExcel}
                    />
                    <Form.Text className="text-muted">
                      El Excel debe tener columnas: <strong>nombre_curso</strong> (o curso), <strong>nivel</strong>, <strong>grado</strong>, y <strong>nombre_pdf</strong> (o archivo_pdf, ruta_pdf).
                    </Form.Text>
                    {excelFile && (
                      <Alert variant="info" className="mt-2 mb-0">
                        <LuFileSpreadsheet className="me-2" />
                        {excelFile.name} {loadingExcel && <Spinner animation="border" size="sm" className="ms-2" />}
                      </Alert>
                    )}
                  </FormGroup>

                  <FormGroup className="mb-3">
                    <FormLabel>
                      <LuFileText className="me-2" />
                      Archivo ZIP con PDFs
                    </FormLabel>
                    <FormControl
                      ref={zipInputRef}
                      type="file"
                      accept=".zip,application/zip"
                      onChange={handleZipUpload}
                      disabled={uploading || loadingCursos || !excelFile}
                    />
                    <Form.Text className="text-muted">
                      Sube un archivo ZIP que contenga todos los PDFs mencionados en el Excel. Los nombres deben coincidir exactamente.
                    </Form.Text>
                    {zipFile && (
                      <Alert variant="info" className="mt-2 mb-0">
                        <LuFileText className="me-2" />
                        {zipFile.name}
                      </Alert>
                    )}
                  </FormGroup>
                </>
              ) : (
                <FormGroup className="mb-3">
                  <FormLabel>Seleccionar PDFs (múltiples archivos)</FormLabel>
                  <FormControl
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    multiple
                    onChange={handleFileSelect}
                    disabled={uploading || loadingCursos}
                  />
                  <Form.Text className="text-muted">
                    Puedes seleccionar múltiples archivos PDF. El sistema intentará identificar automáticamente a qué curso pertenece cada PDF basándose en el nombre del archivo.
                  </Form.Text>
                </FormGroup>
              )}

              {pdfMappings.length > 0 && (
                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6>Asignar PDFs a Cursos</h6>
                    <div>
                      <Badge bg="success" className="me-2">{successCount} Exitosos</Badge>
                      <Badge bg="danger" className="me-2">{errorCount} Errores</Badge>
                      <Badge bg="secondary">{pendingCount} Pendientes</Badge>
                    </div>
                  </div>
                  
                  {uploading && (
                    <ProgressBar now={progress} label={`${progress}%`} className="mb-3" />
                  )}

                  <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    <Table striped bordered hover size="sm">
                      <thead>
                        <tr>
                          <th style={{ width: '40%' }}>Archivo PDF</th>
                          <th style={{ width: '50%' }}>Curso</th>
                          <th style={{ width: '10%' }}>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pdfMappings.map((mapping, index) => (
                          <tr key={index}>
                            <td>
                              <div className="d-flex align-items-center">
                                <LuFileText className="me-2" />
                                <span className="text-truncate" style={{ maxWidth: '200px' }} title={mapping.file?.name || mapping._nombrePDF || 'Sin archivo'}>
                                  {mapping.file?.name || mapping._nombrePDF || 'Sin archivo'}
                                </span>
                                {mapping.file && (
                                  <small className="text-muted ms-2">
                                    ({(mapping.file.size / 1024).toFixed(1)} KB)
                                  </small>
                                )}
                              </div>
                            </td>
                            <td>
                              <Select
                                options={cursos}
                                value={cursos.find(c => c.value === mapping.cursoId) || null}
                                onChange={(option) => handleCursoChange(index, option?.value || null)}
                                placeholder="Selecciona un curso..."
                                isDisabled={uploading || mapping.status === 'uploading'}
                                styles={{
                                  control: (base) => ({
                                    ...base,
                                    minHeight: '32px',
                                    fontSize: '0.875rem',
                                  }),
                                }}
                              />
                            </td>
                            <td className="text-center">
                              {mapping.status === 'success' && (
                                <Badge bg="success">
                                  <LuCheck /> OK
                                </Badge>
                              )}
                              {mapping.status === 'error' && (
                                <Badge bg="danger" title={mapping.error}>
                                  <LuX /> Error
                                </Badge>
                              )}
                              {mapping.status === 'uploading' && (
                                <Spinner animation="border" size="sm" />
                              )}
                              {mapping.status === 'pending' && (
                                <Badge bg="secondary">Pendiente</Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </div>
              )}
            </>
          )}
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={handleReset} disabled={uploading}>
          Limpiar
        </Button>
        <Button variant="secondary" onClick={onHide} disabled={uploading}>
          Cancelar
        </Button>
        <Button 
          variant="primary" 
          onClick={handleUpload}
          disabled={!selectedColegio || pdfMappings.length === 0 || uploading || pdfMappings.filter(m => m.cursoId).length === 0}
        >
          {uploading ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Subiendo... ({progress}%)
            </>
          ) : (
            <>
              <LuUpload className="me-2" />
              Subir PDFs ({pdfMappings.filter(m => m.cursoId).length})
            </>
          )}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
