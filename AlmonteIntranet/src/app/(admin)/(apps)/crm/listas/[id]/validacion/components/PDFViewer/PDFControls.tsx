/**
 * Componente para controles de navegación y zoom del PDF
 * Diseño profesional y moderno
 */

'use client'

import { TbChevronLeft, TbChevronRight, TbZoomIn, TbZoomOut, TbZoomReset } from 'react-icons/tb'

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
  const buttonStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    border: '1px solid #dee2e6',
    borderRadius: '8px',
    background: 'white',
    color: '#495057',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontSize: '1rem'
  }

  const buttonDisabledStyle = {
    ...buttonStyle,
    opacity: 0.5,
    cursor: 'not-allowed',
    background: '#f8f9fa'
  }

  const buttonHoverStyle = {
    background: '#f8f9fa',
    borderColor: '#adb5bd'
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '1rem',
      padding: '10px 14px',
      background: '#f8f9fa',
      borderRadius: '10px',
      border: '1px solid #e9ecef'
    }}>
      {/* Navegación de páginas */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <button
          onClick={onPrevPage}
          disabled={pageNumber <= 1}
          style={pageNumber <= 1 ? buttonDisabledStyle : buttonStyle}
          onMouseEnter={(e) => {
            if (pageNumber > 1) {
              Object.assign(e.currentTarget.style, buttonHoverStyle)
            }
          }}
          onMouseLeave={(e) => {
            if (pageNumber > 1) {
              Object.assign(e.currentTarget.style, buttonStyle)
            }
          }}
          title="Página anterior"
        >
          <TbChevronLeft size={18} />
        </button>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          background: 'white',
          borderRadius: '8px',
          border: '1px solid #dee2e6',
          fontSize: '0.85rem',
          fontWeight: 500,
          color: '#495057',
          minWidth: '100px',
          justifyContent: 'center'
        }}>
          <span style={{ color: '#333' }}>{pageNumber}</span>
          <span style={{ color: '#adb5bd' }}>/</span>
          <span style={{ color: '#6c757d' }}>{numPages || '---'}</span>
        </div>

        <button
          onClick={onNextPage}
          disabled={pageNumber >= numPages}
          style={pageNumber >= numPages ? buttonDisabledStyle : buttonStyle}
          onMouseEnter={(e) => {
            if (pageNumber < numPages) {
              Object.assign(e.currentTarget.style, buttonHoverStyle)
            }
          }}
          onMouseLeave={(e) => {
            if (pageNumber < numPages) {
              Object.assign(e.currentTarget.style, buttonStyle)
            }
          }}
          title="Página siguiente"
        >
          <TbChevronRight size={18} />
        </button>
      </div>

      {/* Controles de zoom */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
        <button
          onClick={onZoomOut}
          disabled={scale <= 0.5}
          style={scale <= 0.5 ? buttonDisabledStyle : buttonStyle}
          onMouseEnter={(e) => {
            if (scale > 0.5) {
              Object.assign(e.currentTarget.style, buttonHoverStyle)
            }
          }}
          onMouseLeave={(e) => {
            if (scale > 0.5) {
              Object.assign(e.currentTarget.style, buttonStyle)
            }
          }}
          title="Reducir zoom"
        >
          <TbZoomOut size={18} />
        </button>

        <button
          onClick={onZoomReset}
          style={{
            ...buttonStyle,
            width: 'auto',
            padding: '0 12px',
            fontWeight: 600,
            fontSize: '0.8rem',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}
          onMouseEnter={(e) => {
            Object.assign(e.currentTarget.style, { ...buttonHoverStyle, width: 'auto', padding: '0 12px' })
          }}
          onMouseLeave={(e) => {
            Object.assign(e.currentTarget.style, { ...buttonStyle, width: 'auto', padding: '0 12px' })
          }}
          title="Restaurar zoom al 100%"
        >
          {Math.round(scale * 100)}%
        </button>

        <button
          onClick={onZoomIn}
          disabled={scale >= 3}
          style={scale >= 3 ? buttonDisabledStyle : buttonStyle}
          onMouseEnter={(e) => {
            if (scale < 3) {
              Object.assign(e.currentTarget.style, buttonHoverStyle)
            }
          }}
          onMouseLeave={(e) => {
            if (scale < 3) {
              Object.assign(e.currentTarget.style, buttonStyle)
            }
          }}
          title="Aumentar zoom"
        >
          <TbZoomIn size={18} />
        </button>
      </div>
    </div>
  )
}
