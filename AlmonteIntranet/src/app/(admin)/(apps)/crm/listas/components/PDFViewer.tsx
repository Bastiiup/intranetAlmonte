'use client'

import { useState, useEffect } from 'react'
import { Document, Page as PDFPage, pdfjs } from 'react-pdf'
import { Button, ButtonGroup, Spinner, Alert } from 'react-bootstrap'
import { LuZoomIn, LuZoomOut, LuChevronLeft, LuChevronRight } from 'react-icons/lu'
// Comentar los CSS de TextLayer y AnnotationLayer ya que los deshabilitamos
// import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
// import 'react-pdf/dist/esm/Page/TextLayer.css'

// Configurar worker de PDF.js
// Intentar usar el worker .js primero (más compatible), luego .mjs como fallback
if (typeof window !== 'undefined') {
  // Usar el worker .js que es más compatible con pdfjs-dist@2.16.105
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.js'
}

interface PDFViewerProps {
  pdfId: number | string
  pdfUrl?: string
}

export default function PDFViewer({ pdfId, pdfUrl }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [scale, setScale] = useState<number>(1.0)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  // Asegurar que solo se renderice en el cliente
  useEffect(() => {
    setMounted(true)
    
    // Asegurar que el worker esté configurado cuando el componente se monte
    if (typeof window !== 'undefined') {
      // Reconfigurar el worker para asegurar que esté listo
      if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs'
      }
    }
  }, [])

  // Construir URL del PDF
  const pdfSrc = pdfUrl || `/api/crm/cursos/pdf/${pdfId}`

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setLoading(false)
    setError(null)
  }

  const onDocumentLoadError = (error: Error) => {
    console.error('Error al cargar PDF:', error)
    const errorMessage = error.message || ''
    
    // Log detallado para depuración
    console.error('Detalles del error:', {
      message: errorMessage,
      name: error.name,
      stack: error.stack,
      pdfSrc,
    })
    
    setError('Error al cargar el PDF: ' + errorMessage)
    setLoading(false)
  }

  const goToPrevPage = () => {
    setPageNumber((prev) => Math.max(1, prev - 1))
  }

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(numPages, prev + 1))
  }

  const zoomIn = () => {
    setScale((prev) => Math.min(3.0, prev + 0.25))
  }

  const zoomOut = () => {
    setScale((prev) => Math.max(0.5, prev - 0.25))
  }

  const resetZoom = () => {
    setScale(1.0)
  }

  // No renderizar hasta que esté montado en el cliente
  if (!mounted) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ height: '100%' }}>
        <Spinner animation="border" variant="light" />
        <div className="text-light ms-2">Cargando visor...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ height: '100%' }}>
        <Alert variant="danger">{error}</Alert>
      </div>
    )
  }

  return (
    <div className="d-flex flex-column h-100">
      {/* Controles */}
      <div className="p-2 border-bottom bg-white d-flex justify-content-between align-items-center flex-wrap gap-2">
        <ButtonGroup size="sm">
          <Button variant="outline-secondary" onClick={goToPrevPage} disabled={pageNumber <= 1}>
            <LuChevronLeft />
          </Button>
          <Button variant="outline-secondary" disabled>
            Página {pageNumber} de {numPages || '?'}
          </Button>
          <Button
            variant="outline-secondary"
            onClick={goToNextPage}
            disabled={pageNumber >= numPages}
          >
            <LuChevronRight />
          </Button>
        </ButtonGroup>

        <ButtonGroup size="sm">
          <Button variant="outline-secondary" onClick={zoomOut} disabled={scale <= 0.5}>
            <LuZoomOut />
          </Button>
          <Button variant="outline-secondary" onClick={resetZoom}>
            {Math.round(scale * 100)}%
          </Button>
          <Button variant="outline-secondary" onClick={zoomIn} disabled={scale >= 3.0}>
            <LuZoomIn />
          </Button>
        </ButtonGroup>
      </div>

      {/* PDF Viewer */}
      <div
        className="flex-grow-1 d-flex align-items-center justify-content-center"
        style={{ overflow: 'auto', backgroundColor: '#525252' }}
      >
        {loading && (
          <div className="text-center">
            <Spinner animation="border" variant="light" />
            <div className="text-light mt-2">Cargando PDF...</div>
          </div>
        )}

        <Document
          file={pdfSrc}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={
            <div className="text-center">
              <Spinner animation="border" variant="light" />
              <div className="text-light mt-2">Cargando PDF...</div>
            </div>
          }
          error={
            <Alert variant="danger" className="m-3">
              Error al cargar el PDF. Por favor, intenta nuevamente.
            </Alert>
          }
        >
          {numPages > 0 && (
            <PDFPage
              pageNumber={pageNumber}
              scale={scale}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              className="shadow"
            />
          )}
        </Document>
      </div>
    </div>
  )
}

