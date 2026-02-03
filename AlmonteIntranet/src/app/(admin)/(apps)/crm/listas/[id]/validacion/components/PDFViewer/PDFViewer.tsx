/**
 * Componente principal del visor de PDF
 * Con búsqueda de texto real (como Ctrl+F) y UI profesional
 */

'use client'

import { useMemo, useEffect, useRef, useCallback } from 'react'
import { Card, CardBody, Button, Spinner, Alert } from 'react-bootstrap'
import { TbSparkles, TbFileText, TbDownload, TbSearch } from 'react-icons/tb'
import { Document, Page as PDFPage, pdfjs } from 'react-pdf'
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import 'react-pdf/dist/esm/Page/TextLayer.css'
import PDFControls from './PDFControls'
import SearchBar from './SearchBar'
import VersionSelector from './VersionSelector'
import { useTextSearch } from '../../hooks/useTextSearch'
import type { ProductoIdentificado, ListaData } from '../../types'
import { STRAPI_API_URL } from '@/lib/strapi/config'

pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs'

// Estilos globales para los highlights
const globalStyles = `
  .pdf-search-highlight {
    background-color: rgba(255, 235, 59, 0.6) !important;
    color: #000 !important;
    border-radius: 2px !important;
    box-shadow: 0 0 0 2px rgba(255, 193, 7, 0.4) !important;
    transition: all 0.3s ease !important;
  }

  .pdf-search-highlight-active {
    background-color: rgba(255, 152, 0, 0.9) !important;
    box-shadow: 0 0 0 3px rgba(255, 87, 34, 0.6), 0 4px 12px rgba(0,0,0,0.3) !important;
    animation: pulse-highlight 1.5s ease-in-out infinite !important;
  }

  @keyframes pulse-highlight {
    0%, 100% {
      box-shadow: 0 0 0 3px rgba(255, 87, 34, 0.6), 0 4px 12px rgba(0,0,0,0.3);
    }
    50% {
      box-shadow: 0 0 0 6px rgba(255, 87, 34, 0.3), 0 6px 20px rgba(0,0,0,0.4);
    }
  }

  .react-pdf__Page__textContent span {
    transition: background-color 0.2s ease, box-shadow 0.2s ease;
  }

  .pdf-viewer-container {
    scrollbar-width: thin;
    scrollbar-color: rgba(0,0,0,0.2) transparent;
  }

  .pdf-viewer-container::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  .pdf-viewer-container::-webkit-scrollbar-track {
    background: transparent;
  }

  .pdf-viewer-container::-webkit-scrollbar-thumb {
    background: rgba(0,0,0,0.2);
    border-radius: 4px;
  }

  .pdf-viewer-container::-webkit-scrollbar-thumb:hover {
    background: rgba(0,0,0,0.3);
  }
`

interface PDFViewerProps {
  lista: ListaData | null
  versionActual: any
  versiones: any[]
  versionSeleccionada: number | null
  mostrarTodosLosProductos: boolean
  onChangeVersion: (index: number) => void
  onChangeMostrarTodos: (mostrar: boolean) => void
  onRecargarProductos: () => void
  pdfViewer: ReturnType<typeof import('../../hooks/usePDFViewer').usePDFViewer>
  selectedProductData: ProductoIdentificado | null
  processingPDF: boolean
  onProcesarPDF: () => void
  loadingLogs: boolean
  onCargarLogs: () => void
  onClearSelection?: () => void
}

export default function PDFViewer({
  lista,
  versionActual,
  versiones,
  versionSeleccionada,
  mostrarTodosLosProductos,
  onChangeVersion,
  onChangeMostrarTodos,
  onRecargarProductos,
  pdfViewer,
  selectedProductData,
  processingPDF,
  onProcesarPDF,
  loadingLogs,
  onCargarLogs,
  onClearSelection
}: PDFViewerProps) {
  const {
    numPages,
    pageNumber,
    scale,
    pageDimensions,
    setPageDimensions,
    onDocumentLoadSuccess,
    nextPage,
    prevPage,
    onZoomIn,
    onZoomOut,
    onZoomReset
  } = pdfViewer

  // Hook de búsqueda de texto
  const {
    searchState,
    searchInPDF,
    nextMatch,
    prevMatch,
    clearSearch
  } = useTextSearch()

  // Ref para el contenedor del PDF
  const pdfContainerRef = useRef<HTMLDivElement>(null)
  const lastSearchedProductRef = useRef<string | null>(null)

  // Inyectar estilos globales
  useEffect(() => {
    const styleId = 'pdf-search-styles'
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style')
      style.id = styleId
      style.textContent = globalStyles
      document.head.appendChild(style)
    }
  }, [])

  // Ejecutar búsqueda cuando cambia el producto seleccionado o la página
  const executeSearch = useCallback((forceSearch: boolean = false) => {
    if (!selectedProductData || !pdfContainerRef.current) {
      if (!selectedProductData && lastSearchedProductRef.current) {
        clearSearch()
        lastSearchedProductRef.current = null
      }
      return
    }

    // Clave única para esta búsqueda (producto + página)
    const productKey = `${selectedProductData.id}-${pageNumber}`

    // Evitar búsquedas repetidas a menos que sea forzada
    if (!forceSearch && lastSearchedProductRef.current === productKey) {
      return
    }

    // Limpiar highlights anteriores antes de buscar en nueva página
    clearSearch()

    // Esperar a que el TextLayer se renderice completamente
    const timeoutId = setTimeout(() => {
      console.log('[PDFViewer] Buscando en página', pageNumber, ':', selectedProductData.nombre)
      searchInPDF(
        selectedProductData.nombre,
        pdfContainerRef.current,
        {
          isbn: selectedProductData.isbn,
          marca: selectedProductData.marca
        }
      )
      lastSearchedProductRef.current = productKey
    }, 400)

    return () => clearTimeout(timeoutId)
  }, [selectedProductData, pageNumber, searchInPDF, clearSearch])

  // Ejecutar búsqueda cuando cambia el producto o la página
  useEffect(() => {
    executeSearch()
  }, [executeSearch])

  // Limpiar cuando se deselecciona el producto
  useEffect(() => {
    if (!selectedProductData) {
      clearSearch()
      lastSearchedProductRef.current = null
    }
  }, [selectedProductData, clearSearch])

  // Manejar la limpieza de búsqueda
  const handleClearSearch = useCallback(() => {
    clearSearch()
    lastSearchedProductRef.current = null
    // También limpiar la selección en el componente padre
    if (onClearSelection) {
      onClearSelection()
    }
  }, [clearSearch, onClearSelection])

  // Determinar URL del PDF
  const pdfUrl = useMemo(() => {
    const limpiarUrl = (url: string): string => {
      let urlLimpia = url.trim()

      if (urlLimpia.includes(STRAPI_API_URL)) {
        const index = urlLimpia.indexOf(STRAPI_API_URL)
        if (index !== -1) {
          const parteDespues = urlLimpia.substring(index + STRAPI_API_URL.length)
          if (parteDespues.startsWith('https://') || parteDespues.startsWith('http://')) {
            urlLimpia = parteDespues
          } else if (parteDespues.startsWith('https') || parteDespues.startsWith('http')) {
            const match = parteDespues.match(/^(https?)(.*)/)
            if (match) {
              urlLimpia = `${match[1]}://${match[2].replace(/^\/+/, '')}`
            }
          }
        }
      }

      return urlLimpia
    }

    const normalizarUrl = (url: string): string => {
      let urlLimpia = limpiarUrl(url)

      if (urlLimpia.startsWith('http://') || urlLimpia.startsWith('https://')) {
        return urlLimpia
      }

      if (urlLimpia.startsWith('/')) {
        return `${STRAPI_API_URL}${urlLimpia}`
      }

      return `${STRAPI_API_URL}/${urlLimpia}`
    }

    if (versionActual?.pdf_id) {
      return `/api/crm/listas/pdf/${versionActual.pdf_id}`
    }

    if (versionActual?.pdf_url) {
      return normalizarUrl(versionActual.pdf_url)
    }

    if (lista?.pdf_id) {
      return `/api/crm/listas/pdf/${lista.pdf_id}`
    }

    if (lista?.pdf_url) {
      return normalizarUrl(lista.pdf_url)
    }

    return null
  }, [versionActual, lista])

  if (!pdfUrl) {
    return (
      <Card className="h-100 border-0 rounded-0" style={{ background: '#f8f9fa' }}>
        <CardBody className="d-flex flex-column h-100 p-0">
          <div className="d-flex justify-content-center align-items-center flex-grow-1">
            <div style={{
              textAlign: 'center',
              padding: '3rem',
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
                color: 'white'
              }}>
                <TbFileText size={32} />
              </div>
              <h5 style={{ color: '#333', marginBottom: '0.5rem' }}>No hay PDF disponible</h5>
              <p style={{ color: '#666', margin: 0, fontSize: '0.9rem' }}>
                Este curso no tiene un PDF de lista de útiles cargado.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    )
  }

  return (
    <Card className="h-100 border-0 rounded-0" style={{ background: '#f8f9fa' }}>
      <CardBody className="d-flex flex-column h-100 p-0">
        {/* Header con controles */}
        <div style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid #e9ecef',
          background: 'white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
        }}>
          {/* Barra de búsqueda cuando hay producto seleccionado */}
          <SearchBar
            selectedProduct={selectedProductData}
            searchState={searchState}
            onNextMatch={nextMatch}
            onPrevMatch={prevMatch}
            onClearSearch={handleClearSearch}
          />

          <div className="d-flex justify-content-between align-items-start mb-3">
            <div style={{ flex: 1 }}>
              <VersionSelector
                versiones={versiones}
                versionSeleccionada={versionSeleccionada}
                mostrarTodosLosProductos={mostrarTodosLosProductos}
                onChangeVersion={onChangeVersion}
                onChangeMostrarTodos={onChangeMostrarTodos}
                onRecargarProductos={onRecargarProductos}
              />
              <h5 style={{
                margin: '0.5rem 0 0.25rem',
                fontSize: '1rem',
                fontWeight: 600,
                color: '#333'
              }}>
                {versionActual?.tipo_lista || versionActual?.nombre || 'Lista de Útiles Original (PDF)'}
              </h5>
              <p style={{
                margin: 0,
                fontSize: '0.8rem',
                color: '#6c757d'
              }}>
                {versionActual?.nombre_archivo || versionActual?.metadata?.nombre || 'Documento proporcionado por el colegio'}
                {versionActual?.fecha_subida && (
                  <span style={{ marginLeft: '8px', opacity: 0.8 }}>
                    • {new Date(versionActual.fecha_subida).toLocaleDateString('es-CL', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                )}
              </p>
            </div>

            <div className="d-flex gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={onProcesarPDF}
                disabled={processingPDF}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontWeight: 500,
                  fontSize: '0.85rem',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)'
                }}
              >
                {processingPDF ? (
                  <>
                    <Spinner size="sm" style={{ width: '14px', height: '14px' }} />
                    Procesando...
                  </>
                ) : (
                  <>
                    <TbSparkles size={16} />
                    Procesar con IA
                  </>
                )}
              </Button>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={onCargarLogs}
                disabled={loadingLogs}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontWeight: 500,
                  fontSize: '0.85rem'
                }}
                title="Ver logs del procesamiento"
              >
                {loadingLogs ? (
                  <>
                    <Spinner size="sm" style={{ width: '14px', height: '14px' }} />
                    Cargando...
                  </>
                ) : (
                  <>
                    <TbFileText size={16} />
                    Logs
                  </>
                )}
              </Button>
            </div>
          </div>

          <PDFControls
            pageNumber={pageNumber}
            numPages={numPages}
            scale={scale}
            onPrevPage={prevPage}
            onNextPage={nextPage}
            onZoomIn={onZoomIn}
            onZoomOut={onZoomOut}
            onZoomReset={onZoomReset}
          />
        </div>

        {/* Área del PDF */}
        <div
          ref={pdfContainerRef}
          className="pdf-viewer-container"
          style={{
            flexGrow: 1,
            overflow: 'auto',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            padding: '1.5rem',
            background: 'linear-gradient(180deg, #e9ecef 0%, #dee2e6 100%)',
            position: 'relative'
          }}
        >
          {/* Mensaje cuando no hay producto seleccionado */}
          {!selectedProductData && (
            <div style={{
              position: 'absolute',
              top: '1.5rem',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 10,
              background: 'white',
              padding: '12px 20px',
              borderRadius: '10px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              border: '1px solid #e9ecef'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}>
                <TbSearch size={16} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#333' }}>
                  Selecciona un producto
                </div>
                <div style={{ fontSize: '0.75rem', color: '#666' }}>
                  Haz clic en la tabla para buscarlo aquí
                </div>
              </div>
            </div>
          )}

          <div style={{
            background: 'white',
            borderRadius: '8px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={(error) => {
                console.error('[PDFViewer] Error al cargar PDF:', error)
              }}
              loading={
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: '400px',
                  minWidth: '300px',
                  gap: '1rem'
                }}>
                  <Spinner animation="border" variant="primary" />
                  <span style={{ color: '#666', fontSize: '0.9rem' }}>Cargando PDF...</span>
                </div>
              }
              error={
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: '400px',
                  minWidth: '300px',
                  padding: '2rem'
                }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: '#ffebee',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1rem'
                  }}>
                    <TbFileText size={32} color="#f44336" />
                  </div>
                  <h6 style={{ color: '#333', marginBottom: '0.5rem' }}>Error al cargar el PDF</h6>
                  <p style={{
                    color: '#666',
                    fontSize: '0.8rem',
                    textAlign: 'center',
                    maxWidth: '250px',
                    margin: 0
                  }}>
                    Verifica que el archivo esté disponible y sea accesible.
                  </p>
                </div>
              }
            >
              <PDFPage
                pageNumber={pageNumber}
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                onRenderSuccess={(page) => {
                  if (page.width && page.height) {
                    setPageDimensions({
                      width: page.width,
                      height: page.height
                    })
                  }
                  // Esperar a que el TextLayer se renderice después del canvas
                  // El TextLayer se renderiza después del onRenderSuccess del canvas
                  if (selectedProductData) {
                    // Intentar múltiples veces con delays incrementales
                    const attempts = [300, 600, 1000]
                    attempts.forEach((delay, index) => {
                      setTimeout(() => {
                        if (pdfContainerRef.current) {
                          const textLayer = pdfContainerRef.current.querySelector('.react-pdf__Page__textContent')
                          if (textLayer && textLayer.children.length > 0) {
                            console.log(`[PDFViewer] TextLayer encontrado en intento ${index + 1} (${delay}ms)`)
                            executeSearch(true)
                          }
                        }
                      }, delay)
                    })
                  }
                }}
              />
            </Document>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}
