/**
 * Componente para resaltar productos en el PDF
 * Muestra un resaltado amarillo con etiqueta y punto rojo en las coordenadas exactas
 */

'use client'

import type { ProductoIdentificado } from '../../types'

interface PDFHighlightProps {
  producto: ProductoIdentificado
  pageNumber: number
  scale: number
}

export default function PDFHighlight({ 
  producto, 
  pageNumber,
  scale
}: PDFHighlightProps) {
  const coord = producto.coordenadas
  
  // Verificaciones tempranas con logging
  if (!coord) {
    console.warn('[PDFHighlight] ❌ No hay coordenadas para el producto:', producto.nombre)
    return null
  }
  
  if (coord.pagina !== pageNumber) {
    console.log('[PDFHighlight] ⏭️ Página no coincide:', {
      paginaProducto: coord.pagina,
      paginaActual: pageNumber
    })
    return null
  }
  
  if (coord.posicion_x === undefined || coord.posicion_x === null ||
      coord.posicion_y === undefined || coord.posicion_y === null) {
    console.warn('[PDFHighlight] ⚠️ Coordenadas X/Y faltantes:', {
      producto: producto.nombre,
      coordenadas: coord
    })
    return null
  }

  // Determinar si son coordenadas reales o aproximadas
  const esCoordenadasReales = coord.ancho !== undefined && 
                              coord.ancho !== null && 
                              coord.alto !== undefined && 
                              coord.alto !== null

  console.log('[PDFHighlight] ✅ RENDERIZANDO OVERLAY:', {
    producto: producto.nombre,
    tipo: esCoordenadasReales ? '🎯 COORDENADAS REALES' : '📍 COORDENADAS APROXIMADAS',
    pagina: coord.pagina,
    posicion_x: `${coord.posicion_x}%`,
    posicion_y: `${coord.posicion_y}%`,
    ancho: coord.ancho ? `${coord.ancho}%` : 'calculado',
    alto: coord.alto ? `${coord.alto}%` : '30px',
    scale
  })

  // Calcular dimensiones del resaltado
  const anchoResaltado = coord.ancho 
    ? `${coord.ancho}%`
    : `${Math.min(producto.nombre.length * 0.75 + 5, 45)}%`
  
  const altoResaltado = coord.alto
    ? `${coord.alto}%`
    : '30px'

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 10,
        overflow: 'visible',
      }}
    >
      {/* 1. Resaltado amarillo principal */}
      <div
        style={{
          position: 'absolute',
          left: `${coord.posicion_x}%`,
          top: `${coord.posicion_y}%`,
          width: anchoResaltado,
          minWidth: '100px',
          maxWidth: '60%',
          height: altoResaltado,
          backgroundColor: 'rgba(255, 235, 59, 0.75)',
          border: '3px solid rgba(255, 193, 7, 1)',
          borderRadius: '5px',
          boxShadow: '0 4px 16px rgba(255, 193, 7, 0.9), inset 0 0 10px rgba(255, 235, 59, 0.5)',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          animation: 'pulse 2s ease-in-out infinite',
          zIndex: 2,
        }}
      />

      {/* 2. Etiqueta con nombre del producto */}
      <div
        style={{
          position: 'absolute',
          top: `${coord.posicion_y}%`,
          left: `${coord.posicion_x}%`,
          transform: 'translate(-50%, calc(-100% - 12px))',
          backgroundColor: esCoordenadasReales 
            ? 'rgba(76, 175, 80, 0.98)'  // 🟢 Verde = coordenadas reales
            : 'rgba(255, 193, 7, 0.98)',  // 🟡 Amarillo = aproximadas
          color: esCoordenadasReales ? '#fff' : '#000',
          padding: '6px 14px',
          borderRadius: '6px',
          fontSize: '0.85rem',
          fontWeight: 'bold',
          boxShadow: '0 4px 10px rgba(0,0,0,0.4)',
          maxWidth: '400px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          zIndex: 3,
          border: '2px solid rgba(255, 152, 0, 0.9)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
        title={producto.nombre}
      >
        {esCoordenadasReales ? '✓' : '≈'} {producto.nombre}
        <span style={{ 
          fontSize: '10px', 
          opacity: 0.8,
          marginLeft: '4px',
          backgroundColor: 'rgba(0,0,0,0.2)',
          padding: '2px 6px',
          borderRadius: '3px'
        }}>
          {esCoordenadasReales ? 'Exacto' : 'Aproximado'}
        </span>
      </div>

      {/* 3. Punto rojo indicador de posición exacta */}
      <div
        style={{
          position: 'absolute',
          left: `${coord.posicion_x}%`,
          top: `${coord.posicion_y}%`,
          width: '10px',
          height: '10px',
          backgroundColor: '#FF6F00',
          border: '3px solid #FFF',
          borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          zIndex: 4,
          boxShadow: '0 0 12px rgba(255, 111, 0, 1), 0 0 6px rgba(255, 193, 7, 0.8)',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}
      />

      {/* 4. Líneas guía (opcional - para debug en desarrollo) */}
      {process.env.NODE_ENV === 'development' && (
        <>
          {/* Línea vertical */}
          <div style={{
            position: 'absolute',
            left: `${coord.posicion_x}%`,
            top: 0,
            bottom: 0,
            width: '1px',
            backgroundColor: 'rgba(255, 0, 0, 0.3)',
            pointerEvents: 'none',
            zIndex: 1,
          }} />
          {/* Línea horizontal */}
          <div style={{
            position: 'absolute',
            top: `${coord.posicion_y}%`,
            left: 0,
            right: 0,
            height: '1px',
            backgroundColor: 'rgba(255, 0, 0, 0.3)',
            pointerEvents: 'none',
            zIndex: 1,
          }} />
        </>
      )}
    </div>
  )
}
