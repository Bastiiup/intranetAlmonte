/**
 * Componente de paneles resizables con separador arrastrable
 */

'use client'

import { useState, useCallback, useRef, useEffect, ReactNode } from 'react'

interface ResizablePanelsProps {
  leftPanel: ReactNode
  rightPanel: ReactNode
  defaultLeftWidth?: number // Porcentaje inicial del panel izquierdo (0-100)
  minLeftWidth?: number // Ancho mínimo del panel izquierdo en porcentaje
  maxLeftWidth?: number // Ancho máximo del panel izquierdo en porcentaje
  storageKey?: string // Key para guardar en localStorage
}

export default function ResizablePanels({
  leftPanel,
  rightPanel,
  defaultLeftWidth = 50,
  minLeftWidth = 25,
  maxLeftWidth = 75,
  storageKey = 'validacion-panel-width'
}: ResizablePanelsProps) {
  // Cargar ancho guardado o usar default
  const [leftWidth, setLeftWidth] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = parseFloat(saved)
        if (!isNaN(parsed) && parsed >= minLeftWidth && parsed <= maxLeftWidth) {
          return parsed
        }
      }
    }
    return defaultLeftWidth
  })

  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Guardar en localStorage cuando cambia
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, leftWidth.toString())
    }
  }, [leftWidth, storageKey])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return

    const container = containerRef.current
    const containerRect = container.getBoundingClientRect()
    const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100

    // Aplicar límites
    const clampedWidth = Math.min(Math.max(newLeftWidth, minLeftWidth), maxLeftWidth)
    setLeftWidth(clampedWidth)
  }, [isDragging, minLeftWidth, maxLeftWidth])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Event listeners globales para drag
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  // Doble clic para resetear
  const handleDoubleClick = useCallback(() => {
    setLeftWidth(defaultLeftWidth)
  }, [defaultLeftWidth])

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        flex: '1 1 auto',
        minHeight: 0,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Panel izquierdo */}
      <div
        style={{
          width: `${leftWidth}%`,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: isDragging ? 'none' : 'width 0.1s ease'
        }}
      >
        {leftPanel}
      </div>

      {/* Separador / Resize Handle */}
      <div
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        style={{
          width: '8px',
          cursor: 'col-resize',
          background: isDragging
            ? 'linear-gradient(180deg, #667eea 0%, #764ba2 100%)'
            : 'linear-gradient(180deg, #e9ecef 0%, #dee2e6 100%)',
          borderLeft: '1px solid #dee2e6',
          borderRight: '1px solid #dee2e6',
          position: 'relative',
          flexShrink: 0,
          transition: 'background 0.2s ease',
          zIndex: 100
        }}
        title="Arrastra para redimensionar. Doble clic para resetear."
      >
        {/* Indicador visual en el centro */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
            padding: '8px 0'
          }}
        >
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                width: '4px',
                height: '4px',
                borderRadius: '50%',
                background: isDragging ? 'white' : '#adb5bd',
                transition: 'background 0.2s ease'
              }}
            />
          ))}
        </div>

        {/* Área de hover expandida */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: '-4px',
            right: '-4px',
            cursor: 'col-resize'
          }}
        />
      </div>

      {/* Panel derecho */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: isDragging ? 'none' : 'flex 0.1s ease'
        }}
      >
        {rightPanel}
      </div>

      {/* Overlay durante drag para evitar interferencias */}
      {isDragging && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 99,
            cursor: 'col-resize'
          }}
        />
      )}
    </div>
  )
}
