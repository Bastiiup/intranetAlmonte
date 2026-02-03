/**
 * Componente principal del visor de PDF
 * Orquesta todos los subcomponentes del PDF viewer
 */

'use client'

import { useMemo, useEffect } from 'react'
import { Card, CardBody, Button, Spinner, Alert } from 'react-bootstrap'
import { TbSparkles, TbFileText } from 'react-icons/tb'
import { Document, Page as PDFPage, pdfjs } from 'react-pdf'
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import 'react-pdf/dist/esm/Page/TextLayer.css'
import PDFControls from './PDFControls'
import PDFHighlight from './PDFHighlight'
import VersionSelector from './VersionSelector'
import type { ProductoIdentificado, ListaData } from '../../types'
import { STRAPI_API_URL } from '@/lib/strapi/config'

pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs'

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
  onCargarLogs
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

  // Log cuando selectedProductData cambia
  useEffect(() => {
    if (selectedProductData) {
      console.log('[PDFViewer] ✅ selectedProductData actualizado:', {
        nombre: selectedProductData.nombre,
        id: selectedProductData.id,
        tieneCoordenadas: !!selectedProductData.coordenadas,
        coordenadas: selectedProductData.coordenadas,
        pageNumber,
        numPages
      })
    } else {
      console.log('[PDFViewer] ⚪ selectedProductData es null')
    }
  }, [selectedProductData, pageNumber, numPages])

  // Determinar URL del PDF
  const pdfUrl = useMemo(() => {
    // Helper para limpiar URL corrupta (elimina dominio duplicado)
    const limpiarUrl = (url: string): string => {
      let urlLimpia = url.trim()
      
      // Si la URL contiene el dominio de Strapi duplicado, limpiarlo
      if (urlLimpia.includes(STRAPI_API_URL)) {
        // Buscar la primera ocurrencia de https:// después del dominio de Strapi
        const index = urlLimpia.indexOf(STRAPI_API_URL)
        if (index !== -1) {
          const parteDespues = urlLimpia.substring(index + STRAPI_API_URL.length)
          // Si después del dominio hay "https://" o "http://", usar esa parte
          if (parteDespues.startsWith('https://') || parteDespues.startsWith('http://')) {
            urlLimpia = parteDespues
            console.log('[PDFViewer] 🧹 URL limpiada (dominio duplicado removido):', urlLimpia)
          } else if (parteDespues.startsWith('https') || parteDespues.startsWith('http')) {
            // Caso especial: "https" sin "://"
            const match = parteDespues.match(/^(https?)(.*)/)
            if (match) {
              urlLimpia = `${match[1]}://${match[2].replace(/^\/+/, '')}`
              console.log('[PDFViewer] 🧹 URL limpiada (formato corregido):', urlLimpia)
            }
          }
        }
      }
      
      return urlLimpia
    }

    // Helper para normalizar URL - detecta si ya es URL completa
    const normalizarUrl = (url: string): string => {
      // Primero limpiar URL corrupta
      let urlLimpia = limpiarUrl(url)
      
      // Si ya es una URL completa (http:// o https://), usarla directamente
      if (urlLimpia.startsWith('http://') || urlLimpia.startsWith('https://')) {
        console.log('[PDFViewer] ✅ URL completa detectada, usando directamente:', urlLimpia)
        return urlLimpia
      }
      
      // Si es una ruta relativa que empieza con /, construir URL completa
      if (urlLimpia.startsWith('/')) {
        const fullUrl = `${STRAPI_API_URL}${urlLimpia}`
        console.log('[PDFViewer] 🔧 Construyendo URL desde ruta relativa:', { url: urlLimpia, fullUrl, STRAPI_API_URL })
        return fullUrl
      }
      
      // Si es una ruta relativa sin /, agregar /
      const fullUrl = `${STRAPI_API_URL}/${urlLimpia}`
      console.log('[PDFViewer] 🔧 Construyendo URL desde ruta sin /:', { url: urlLimpia, fullUrl, STRAPI_API_URL })
      return fullUrl
    }

    console.log('[PDFViewer] 🔍 Determinando URL del PDF:', {
      versionActual_pdf_url: versionActual?.pdf_url,
      versionActual_pdf_id: versionActual?.pdf_id,
      lista_pdf_url: lista?.pdf_url,
      lista_pdf_id: lista?.pdf_id,
      STRAPI_API_URL
    })

    // Prioridad 1: Usar API route para pdf_id de la versión (más confiable, con autenticación)
    if (versionActual?.pdf_id) {
      const url = `/api/crm/listas/pdf/${versionActual.pdf_id}`
      console.log('[PDFViewer] 📄 URL final desde versión pdf_id (API route):', url)
      return url
    }
    
    // Prioridad 2: pdf_url directo de la versión (limpiar si está corrupto)
    if (versionActual?.pdf_url) {
      const url = normalizarUrl(versionActual.pdf_url)
      console.log('[PDFViewer] 📄 URL final desde versión pdf_url:', url)
      return url
    }
    
    // Prioridad 3: Usar API route para pdf_id de la lista (más confiable, con autenticación)
    if (lista?.pdf_id) {
      const url = `/api/crm/listas/pdf/${lista.pdf_id}`
      console.log('[PDFViewer] 📄 URL final desde lista pdf_id (API route):', url)
      return url
    }
    
    // Prioridad 4: pdf_url directo de la lista (limpiar si está corrupto)
    if (lista?.pdf_url) {
      const url = normalizarUrl(lista.pdf_url)
      console.log('[PDFViewer] 📄 URL final desde lista pdf_url:', url)
      return url
    }
    
    console.log('[PDFViewer] ⚠️ No se encontró PDF URL')
    return null
  }, [versionActual, lista])

  if (!pdfUrl) {
    return (
      <Card className="h-100 border-0 rounded-0">
        <CardBody className="d-flex flex-column h-100 p-0">
          <div className="d-flex justify-content-center align-items-center flex-grow-1">
            <Alert variant="warning" className="m-3">
              No hay PDF disponible para este curso.
            </Alert>
          </div>
        </CardBody>
      </Card>
    )
  }

  return (
    <Card className="h-100 border-0 rounded-0">
      <CardBody className="d-flex flex-column h-100 p-0">
        {/* Header con controles */}
        <div style={{
          padding: '1rem',
          borderBottom: '1px solid #dee2e6',
          background: 'white'
        }}>
          <div className="d-flex justify-content-between align-items-start mb-2">
            <div style={{ flex: 1 }}>
              <VersionSelector
                versiones={versiones}
                versionSeleccionada={versionSeleccionada}
                mostrarTodosLosProductos={mostrarTodosLosProductos}
                onChangeVersion={onChangeVersion}
                onChangeMostrarTodos={onChangeMostrarTodos}
                onRecargarProductos={onRecargarProductos}
              />
              <h5 className="mb-1">
                {versionActual?.tipo_lista || versionActual?.nombre || 'Lista de Útiles Original (PDF)'}
              </h5>
              <p className="text-muted mb-0 small">
                {versionActual?.nombre_archivo || versionActual?.metadata?.nombre || 'Documento proporcionado por el colegio'}
                {versionActual?.fecha_subida && (
                  <> - Subido: {new Date(versionActual.fecha_subida).toLocaleDateString('es-CL', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</>
                )}
              </p>
            </div>
            <div className="d-flex gap-2">
              <Button 
                variant="primary" 
                size="sm"
                onClick={onProcesarPDF}
                disabled={processingPDF}
                className="d-flex align-items-center"
              >
                {processingPDF ? (
                  <>
                    <Spinner size="sm" className="me-2" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <TbSparkles className="me-2" />
                    Procesar con IA
                  </>
                )}
              </Button>
              <Button 
                variant="outline-info" 
                size="sm"
                onClick={onCargarLogs}
                disabled={loadingLogs}
                className="d-flex align-items-center"
                title="Ver logs del procesamiento"
              >
                {loadingLogs ? (
                  <>
                    <Spinner size="sm" className="me-2" />
                    Cargando...
                  </>
                ) : (
                  <>
                    <TbFileText className="me-2" />
                    Ver Logs
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
        <div style={{ 
          flexGrow: 1, 
          overflow: 'auto',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '1rem',
          background: '#e5e5e5',
          position: 'relative',
          zIndex: 0
        }}>
          <div style={{ 
            background: 'white',
            padding: '1rem',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            position: 'relative',
            display: 'inline-block',
            isolation: 'isolate',
            overflow: 'hidden'
          }}>
            {/* Mensaje cuando no hay producto seleccionado */}
            {!selectedProductData && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 5,
                backgroundColor: 'rgba(255, 193, 7, 0.95)',
                color: '#000',
                padding: '1.5rem 2rem',
                borderRadius: '12px',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
                textAlign: 'center',
                border: '3px solid rgba(255, 152, 0, 0.9)',
                pointerEvents: 'none',
              }}>
                👈 Haz click en un producto de la tabla<br/>
                <small style={{ fontSize: '0.85rem', opacity: 0.9 }}>para ver su ubicación aquí con resaltado amarillo</small>
              </div>
            )}
            
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={(error) => {
                  console.error('[PDFViewer] ❌ Error al cargar PDF:', error)
                  console.error('[PDFViewer] 📄 URL intentada:', pdfUrl)
                }}
                loading={
                  <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
                    <Spinner animation="border" />
                  </div>
                }
                error={
                  <div className="d-flex flex-column justify-content-center align-items-center" style={{ minHeight: '400px', padding: '2rem' }}>
                    <Alert variant="danger">
                      <strong>Error al cargar el PDF</strong>
                      <br />
                      <small>URL: {pdfUrl}</small>
                      <br />
                      <small>Verifica que el PDF esté disponible y accesible.</small>
                    </Alert>
                  </div>
                }
              >
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <PDFPage 
                    pageNumber={pageNumber} 
                    scale={scale} 
                    className="border rounded"
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                    onRenderSuccess={(page) => {
                      if (page.width && page.height) {
                        setPageDimensions({
                          width: page.width,
                          height: page.height
                        })
                      }
                    }}
                  />
                  
                  {/* Overlay para resaltar productos - VERSIÓN CORREGIDA */}
                  {(() => {
                    // Validaciones tempranas con logging detallado
                    if (!selectedProductData) {
                      console.log('[PDFViewer] ❌ No hay producto seleccionado (selectedProductData es null)')
                      return null
                    }
                    
                    console.log('[PDFViewer] 🔍 Verificando producto seleccionado:', {
                      nombre: selectedProductData.nombre,
                      id: selectedProductData.id,
                      tieneCoordenadas: !!selectedProductData.coordenadas,
                      coordenadas: selectedProductData.coordenadas,
                      pageNumber,
                      numPages
                    })
                    
                    if (!selectedProductData.coordenadas) {
                      console.warn('[PDFViewer] ⚠️ Producto seleccionado pero NO tiene coordenadas:', {
                        nombre: selectedProductData.nombre,
                        id: selectedProductData.id,
                        productoCompleto: selectedProductData
                      })
                      return null
                    }
                    
                    const coord = selectedProductData.coordenadas
                    
                    // Verificar página correcta
                    if (coord.pagina !== pageNumber) {
                      console.log('[PDFViewer] ⏭️ Producto en página diferente:', {
                        paginaProducto: coord.pagina,
                        paginaActual: pageNumber
                      })
                      return null
                    }
                    
                    // Verificar coordenadas X/Y
                    if (coord.posicion_x === undefined || 
                        coord.posicion_x === null ||
                        coord.posicion_y === undefined || 
                        coord.posicion_y === null) {
                      console.warn('[PDFViewer] ⚠️ Producto sin coordenadas X/Y:', {
                        producto: selectedProductData.nombre,
                        coordenadas: coord
                      })
                      return null
                    }

                    // Determinar si son coordenadas reales o aproximadas
                    const esCoordenadasReales = coord.ancho !== undefined && 
                                                coord.ancho !== null && 
                                                coord.alto !== undefined && 
                                                coord.alto !== null

                    console.log('[PDFViewer] ✅ RENDERIZANDO OVERLAY:', {
                      producto: selectedProductData.nombre,
                      tipo: esCoordenadasReales ? '🎯 COORDENADAS REALES' : '📍 COORDENADAS APROXIMADAS',
                      pagina: coord.pagina,
                      posicion_x: `${coord.posicion_x}%`,
                      posicion_y: `${coord.posicion_y}%`,
                      ancho: coord.ancho ? `${coord.ancho}%` : 'calculado',
                      alto: coord.alto ? `${coord.alto}%` : '30px',
                    })

                    // RETORNAR JSX DIRECTAMENTE (NO BOOLEAN)
                    return (
                      <PDFHighlight
                        producto={selectedProductData}
                        pageNumber={pageNumber}
                        scale={scale}
                      />
                    )
                  })()}
                </div>
              </Document>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}
