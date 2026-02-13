/**
 * Barra de búsqueda de texto en PDF
 * Muestra el producto seleccionado y las coincidencias encontradas
 */

'use client'

import { Badge, Spinner } from 'react-bootstrap'
import { TbSearch, TbChevronUp, TbChevronDown, TbX, TbCheck, TbAlertTriangle } from 'react-icons/tb'
import type { ProductoIdentificado } from '../../types'
import type { SearchState } from '../../hooks/usePDFViewer'

interface SearchBarProps {
  selectedProduct: ProductoIdentificado | null
  searchState: SearchState
  onNextMatch: () => void
  onPrevMatch: () => void
  onClearSearch: () => void
}

export default function SearchBar({
  selectedProduct,
  searchState,
  onNextMatch,
  onPrevMatch,
  onClearSearch
}: SearchBarProps) {
  if (!selectedProduct) {
    return null
  }

  const { totalMatches, currentMatchIndex, isSearching, searchStatus, matches } = searchState
  const hasMatches = totalMatches > 0
  const currentMatch = matches[currentMatchIndex]
  const isExactMatch = currentMatch?.matchType === 'exact'

  // Determinar colores según estado
  const getBackgroundStyle = () => {
    if (isSearching) {
      return 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)'
    }
    if (hasMatches) {
      return isExactMatch
        ? 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)'
        : 'linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%)'
    }
    return 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)'
  }

  const getBorderColor = () => {
    if (isSearching) return '#90caf9'
    if (hasMatches) return isExactMatch ? '#a5d6a7' : '#ffe082'
    return '#ef9a9a'
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        background: getBackgroundStyle(),
        borderRadius: '10px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        marginBottom: '12px',
        border: `1px solid ${getBorderColor()}`,
        transition: 'all 0.3s ease'
      }}
    >
      {/* Icono de estado */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          background: isSearching
            ? '#2196f3'
            : hasMatches
              ? (isExactMatch ? '#4caf50' : '#ff9800')
              : '#f44336',
          color: 'white',
          flexShrink: 0,
          boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
        }}
      >
        {isSearching ? (
          <Spinner animation="border" size="sm" style={{ width: '18px', height: '18px' }} />
        ) : hasMatches ? (
          <TbCheck size={20} strokeWidth={2.5} />
        ) : (
          <TbAlertTriangle size={20} />
        )}
      </div>

      {/* Información del producto */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: '0.9rem',
            color: '#333',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            marginBottom: '2px'
          }}
          title={selectedProduct.nombre}
        >
          {selectedProduct.nombre}
        </div>
        <div style={{
          fontSize: '0.75rem',
          color: '#555',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap'
        }}>
          {selectedProduct.isbn && (
            <span style={{
              background: 'rgba(0,0,0,0.06)',
              padding: '2px 8px',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '0.7rem'
            }}>
              {selectedProduct.isbn}
            </span>
          )}
          {selectedProduct.marca && (
            <span style={{ opacity: 0.8 }}>{selectedProduct.marca}</span>
          )}
        </div>
      </div>

      {/* Estado de la búsqueda */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        flexShrink: 0
      }}>
        {isSearching ? (
          <Badge
            bg="primary"
            style={{
              fontSize: '0.75rem',
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <TbSearch size={14} />
            Buscando...
          </Badge>
        ) : hasMatches ? (
          <>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: '2px'
            }}>
              <Badge
                bg={isExactMatch ? 'success' : 'warning'}
                text={isExactMatch ? 'white' : 'dark'}
                style={{
                  fontSize: '0.8rem',
                  padding: '6px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <TbCheck size={14} />
                {currentMatchIndex + 1} / {totalMatches}
              </Badge>
              <span style={{
                fontSize: '0.65rem',
                color: isExactMatch ? '#2e7d32' : '#f57c00',
                fontWeight: 500
              }}>
                {isExactMatch ? 'Coincidencia exacta' : 'Por palabra clave'}
              </span>
            </div>

            {/* Navegación entre matches */}
            {totalMatches > 1 && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '2px'
              }}>
                <button
                  onClick={onPrevMatch}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '28px',
                    height: '22px',
                    border: 'none',
                    borderRadius: '4px',
                    background: isExactMatch ? '#4caf50' : '#ff9800',
                    color: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  title="Anterior"
                >
                  <TbChevronUp size={16} />
                </button>
                <button
                  onClick={onNextMatch}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '28px',
                    height: '22px',
                    border: 'none',
                    borderRadius: '4px',
                    background: isExactMatch ? '#4caf50' : '#ff9800',
                    color: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  title="Siguiente"
                >
                  <TbChevronDown size={16} />
                </button>
              </div>
            )}
          </>
        ) : (
          <Badge
            bg="danger"
            style={{
              fontSize: '0.75rem',
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <TbAlertTriangle size={14} />
            No encontrado
          </Badge>
        )}

        {/* Botón cerrar */}
        <button
          onClick={onClearSearch}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            border: '1px solid rgba(0,0,0,0.1)',
            borderRadius: '8px',
            background: 'white',
            color: '#666',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            marginLeft: '4px'
          }}
          title="Cerrar búsqueda (deseleccionar)"
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f5f5f5'
            e.currentTarget.style.borderColor = '#ccc'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'white'
            e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'
          }}
        >
          <TbX size={18} />
        </button>
      </div>
    </div>
  )
}
