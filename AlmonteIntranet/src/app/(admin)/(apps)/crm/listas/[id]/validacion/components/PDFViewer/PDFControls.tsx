/**
 * Componente para controles de navegación y zoom del PDF
 */

'use client'

import { Button } from 'react-bootstrap'
import { TbArrowLeft, TbArrowRight, TbZoomIn, TbZoomOut } from 'react-icons/tb'

interface PDFControlsProps {
  pageNumber: number
  numPages: number
  scale: number
  onPrevPage: () => void
  onNextPage: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomReset: () => void
}

export default function PDFControls({
  pageNumber,
  numPages,
  scale,
  onPrevPage,
  onNextPage,
  onZoomIn,
  onZoomOut,
  onZoomReset
}: PDFControlsProps) {
  return (
    <div className="d-flex gap-2 align-items-center flex-wrap mt-2">
      <Button 
        variant="outline-secondary" 
        size="sm"
        onClick={onPrevPage}
        disabled={pageNumber <= 1}
      >
        <TbArrowLeft />
      </Button>
      <span className="small">
        Página {pageNumber} de {numPages || '---'}
      </span>
      <Button 
        variant="outline-secondary" 
        size="sm"
        onClick={onNextPage}
        disabled={pageNumber >= numPages}
      >
        <TbArrowRight />
      </Button>
      <div className="ms-auto d-flex gap-1">
        <Button variant="outline-secondary" size="sm" onClick={onZoomOut}>
          <TbZoomOut />
        </Button>
        <Button variant="outline-secondary" size="sm" onClick={onZoomReset}>
          {Math.round(scale * 100)}%
        </Button>
        <Button variant="outline-secondary" size="sm" onClick={onZoomIn}>
          <TbZoomIn />
        </Button>
      </div>
    </div>
  )
}
