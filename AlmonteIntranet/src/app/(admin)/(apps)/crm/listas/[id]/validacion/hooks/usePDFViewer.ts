/**
 * Hook para manejar el visor de PDF
 * Extrae la lógica de navegación, zoom y dimensiones del PDF
 */

import { useState, useCallback } from 'react'
import type { ProductoIdentificado } from '../types'

export function usePDFViewer() {
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [scale, setScale] = useState<number>(1.0)
  const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number } | null>(null)

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    console.log('[usePDFViewer] Documento cargado, páginas:', numPages)
    setNumPages(numPages)
    setPageNumber(1) // Reset a primera página
  }, [])

  const nextPage = useCallback(() => {
    setPageNumber(prev => {
      if (prev < numPages) {
        return prev + 1
      }
      return prev
    })
  }, [numPages])

  const prevPage = useCallback(() => {
    setPageNumber(prev => {
      if (prev > 1) {
        return prev - 1
      }
      return prev
    })
  }, [])

  const onZoomIn = useCallback(() => {
    setScale(prev => {
      const nuevo = prev + 0.2
      return Math.min(nuevo, 3) // Máximo 300%
    })
  }, [])

  const onZoomOut = useCallback(() => {
    setScale(prev => {
      const nuevo = prev - 0.2
      return Math.max(nuevo, 0.5) // Mínimo 50%
    })
  }, [])

  const onZoomReset = useCallback(() => {
    setScale(1.0)
  }, [])

  const navegarAPagina = useCallback((pagina: number) => {
    if (pagina >= 1 && pagina <= numPages) {
      setPageNumber(pagina)
      // Scroll suave al visor de PDF
      setTimeout(() => {
        const pdfViewer = document.querySelector('.pdf-viewer-container')
        if (pdfViewer) {
          pdfViewer.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 100)
    } else {
      console.warn('[usePDFViewer] Página inválida:', pagina, 'Rango válido: 1-' + numPages)
    }
  }, [numPages])

  const navegarAProducto = useCallback((producto: ProductoIdentificado) => {
    if (producto.coordenadas && producto.coordenadas.pagina) {
      const paginaProducto = producto.coordenadas.pagina
      console.log('[usePDFViewer] Navegando a producto en página:', paginaProducto)
      navegarAPagina(paginaProducto)
    } else {
      console.warn('[usePDFViewer] Producto no tiene coordenadas:', producto.nombre)
    }
  }, [navegarAPagina])

  return {
    // Estados
    numPages,
    pageNumber,
    scale,
    pageDimensions,
    
    // Setters
    setNumPages,
    setPageNumber,
    setScale,
    setPageDimensions,
    
    // Funciones
    onDocumentLoadSuccess,
    nextPage,
    prevPage,
    onZoomIn,
    onZoomOut,
    onZoomReset,
    navegarAPagina,
    navegarAProducto
  }
}
