'use client'

import { useState, useCallback } from 'react'
import { Modal, Button, Alert, ProgressBar, Badge } from 'react-bootstrap'
import { FiUpload, FiCheck, FiX, FiAlertTriangle, FiFile } from 'react-icons/fi'
import { extraerInfoCurso, procesarPDFsInteligente, type CursoMatch } from '@/lib/utils/curso-matcher'

interface SmartPDFUploadProps {
  show: boolean
  onHide: () => void
  colegioId: string
  cursos: Array<{
    id: string | number
    documentId?: string
    nombre: string
    nivel: string
    grado: number | string
    paralelo?: string
    letra?: string
    año?: number
  }>
  onSuccess?: () => void
}

interface UploadResult {
  archivo: File
  cursoMatch: any | null
  infoExtraida: CursoMatch | null
  score: number
  estado: 'matched' | 'ambiguo' | 'no_encontrado'
  uploading?: boolean
  uploaded?: boolean
  error?: string
}

export default function SmartPDFUpload({ 
  show, 
  onHide, 
  colegioId, 
  cursos, 
  onSuccess 
}: SmartPDFUploadProps) {
  const [archivos, setArchivos] = useState<File[]>([])
  const [resultados, setResultados] = useState<UploadResult[]>([])
  const [procesando, setProcesando] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const pdfFiles = files.filter(f => f.type === 'application/pdf')
    
    if (pdfFiles.length === 0) {
      alert('Por favor selecciona archivos PDF')
      return
    }
    
    setArchivos(pdfFiles)
    
    // Procesar automáticamente
    setProcesando(true)
    try {
      const matches = procesarPDFsInteligente(pdfFiles, cursos)
      setResultados(matches)
    } catch (error) {
      console.error('Error al procesar archivos:', error)
    } finally {
      setProcesando(false)
    }
  }, [cursos])
  
  const handleUploadAll = async () => {
    setSubiendo(true)
    
    try {
      // Subir solo los archivos con match perfecto o ambiguo
      const archivosParaSubir = resultados.filter(
        r => r.estado === 'matched' || r.estado === 'ambiguo'
      )
      
      let exitosos = 0
      let fallidos = 0
      
      for (const resultado of archivosParaSubir) {
        // Actualizar estado
        setResultados(prev => prev.map(r => 
          r.archivo === resultado.archivo 
            ? { ...r, uploading: true, error: undefined }
            : r
        ))
        
        try {
          const formData = new FormData()
          formData.append('pdf', resultado.archivo)
          formData.append('cursoDocumentId', resultado.cursoMatch.documentId || resultado.cursoMatch.id)
          formData.append('cursoIdNum', String(resultado.cursoMatch.id))
          formData.append('colegioId', colegioId)
          
          const response = await fetch('/api/crm/cursos/import-pdf', {
            method: 'POST',
            body: formData
          })
          
          const data = await response.json()
          
          if (response.ok && data.success) {
            exitosos++
            setResultados(prev => prev.map(r => 
              r.archivo === resultado.archivo 
                ? { ...r, uploading: false, uploaded: true }
                : r
            ))
          } else {
            fallidos++
            setResultados(prev => prev.map(r => 
              r.archivo === resultado.archivo 
                ? { ...r, uploading: false, error: data.error || 'Error al subir' }
                : r
            ))
          }
        } catch (error: any) {
          fallidos++
          setResultados(prev => prev.map(r => 
            r.archivo === resultado.archivo 
              ? { ...r, uploading: false, error: error.message }
              : r
          ))
        }
      }
      
      // Mostrar resumen
      if (exitosos > 0) {
        alert(`✅ ${exitosos} archivo(s) subido(s) correctamente${fallidos > 0 ? `\n❌ ${fallidos} fallido(s)` : ''}`)
        
        if (onSuccess) {
          onSuccess()
        }
        
        if (fallidos === 0) {
          handleClose()
        }
      } else {
        alert('❌ No se pudo subir ningún archivo')
      }
    } catch (error: any) {
      console.error('Error al subir archivos:', error)
      alert('Error al subir archivos: ' + error.message)
    } finally {
      setSubiendo(false)
    }
  }
  
  const handleClose = () => {
    setArchivos([])
    setResultados([])
    setProcesando(false)
    setSubiendo(false)
    onHide()
  }
  
  const estadisticas = {
    total: resultados.length,
    matched: resultados.filter(r => r.estado === 'matched').length,
    ambiguos: resultados.filter(r => r.estado === 'ambiguo').length,
    noEncontrados: resultados.filter(r => r.estado === 'no_encontrado').length,
    subidos: resultados.filter(r => r.uploaded).length
  }
  
  return (
    <Modal show={show} onHide={handleClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          <FiUpload className="me-2" />
          Carga Inteligente de PDFs
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        <Alert variant="info">
          <strong>🤖 Reconocimiento Automático</strong>
          <p className="mb-0 mt-2">
            El sistema detecta automáticamente a qué curso pertenece cada PDF analizando su nombre.
            Soporta formatos como: "1° Básico A", "4 medio", "II basico", "segundo basico", etc.
          </p>
        </Alert>
        
        {/* Selector de archivos */}
        {resultados.length === 0 && (
          <div className="text-center py-4">
            <input
              type="file"
              id="pdf-upload"
              accept="application/pdf"
              multiple
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <label htmlFor="pdf-upload">
              <Button as="span" variant="primary" size="lg">
                <FiUpload className="me-2" />
                Seleccionar PDFs
              </Button>
            </label>
            <p className="text-muted mt-3">
              Puedes seleccionar múltiples archivos a la vez
            </p>
          </div>
        )}
        
        {/* Procesando */}
        {procesando && (
          <div className="text-center py-4">
            <ProgressBar animated now={100} label="Analizando archivos..." />
          </div>
        )}
        
        {/* Resultados */}
        {resultados.length > 0 && !procesando && (
          <>
            {/* Estadísticas */}
            <div className="d-flex gap-3 mb-3">
              <Badge bg="success">
                <FiCheck className="me-1" />
                {estadisticas.matched} Perfectos
              </Badge>
              <Badge bg="warning">
                <FiAlertTriangle className="me-1" />
                {estadisticas.ambiguos} Ambiguos
              </Badge>
              <Badge bg="danger">
                <FiX className="me-1" />
                {estadisticas.noEncontrados} Sin match
              </Badge>
              {estadisticas.subidos > 0 && (
                <Badge bg="info">
                  ✅ {estadisticas.subidos} Subidos
                </Badge>
              )}
            </div>
            
            {/* Lista de archivos */}
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {resultados.map((resultado, index) => (
                <div 
                  key={index}
                  className="border rounded p-3 mb-2"
                  style={{
                    backgroundColor: 
                      resultado.uploaded ? '#d4edda' :
                      resultado.error ? '#f8d7da' :
                      resultado.estado === 'matched' ? '#d1ecf1' :
                      resultado.estado === 'ambiguo' ? '#fff3cd' :
                      '#f8f9fa'
                  }}
                >
                  <div className="d-flex align-items-start">
                    <FiFile className="me-2 mt-1" size={20} />
                    <div className="flex-grow-1">
                      <div className="fw-bold">{resultado.archivo.name}</div>
                      <div className="small text-muted">
                        {(resultado.archivo.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                      
                      {resultado.infoExtraida && (
                        <div className="mt-2">
                          <Badge bg="secondary" className="me-2">
                            {resultado.infoExtraida.grado}° {resultado.infoExtraida.nivel}
                            {resultado.infoExtraida.paralelo ? ` ${resultado.infoExtraida.paralelo}` : ''}
                          </Badge>
                          <small className="text-muted">
                            {resultado.infoExtraida.razonamiento}
                          </small>
                        </div>
                      )}
                      
                      {resultado.cursoMatch && (
                        <div className="mt-2">
                          <strong>→ Curso:</strong> {resultado.cursoMatch.nombre}
                          <Badge 
                            bg={resultado.score >= 95 ? 'success' : 'warning'}
                            className="ms-2"
                          >
                            {resultado.score}% confianza
                          </Badge>
                        </div>
                      )}
                      
                      {resultado.estado === 'no_encontrado' && (
                        <Alert variant="danger" className="mt-2 mb-0 py-1">
                          <small>
                            ❌ No se encontró curso compatible. 
                            {!resultado.infoExtraida && ' No se pudo extraer información del nombre.'}
                          </small>
                        </Alert>
                      )}
                      
                      {resultado.uploading && (
                        <ProgressBar 
                          animated 
                          now={100} 
                          label="Subiendo..." 
                          className="mt-2"
                          style={{ height: '20px' }}
                        />
                      )}
                      
                      {resultado.uploaded && (
                        <Alert variant="success" className="mt-2 mb-0 py-1">
                          <small>✅ Subido correctamente</small>
                        </Alert>
                      )}
                      
                      {resultado.error && (
                        <Alert variant="danger" className="mt-2 mb-0 py-1">
                          <small>❌ {resultado.error}</small>
                        </Alert>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Modal.Body>
      
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Cancelar
        </Button>
        
        {resultados.length > 0 && (
          <Button 
            variant="primary" 
            onClick={handleUploadAll}
            disabled={
              subiendo || 
              estadisticas.matched === 0 && estadisticas.ambiguos === 0 ||
              estadisticas.subidos === estadisticas.matched + estadisticas.ambiguos
            }
          >
            {subiendo ? (
              <>
                <span className="spinner-border spinner-border-sm me-2"></span>
                Subiendo...
              </>
            ) : (
              <>
                <FiUpload className="me-2" />
                Subir {estadisticas.matched + estadisticas.ambiguos} Archivo(s)
              </>
            )}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  )
}
