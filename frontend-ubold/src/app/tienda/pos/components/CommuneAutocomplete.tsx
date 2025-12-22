'use client'

import { useState, useEffect, useRef } from 'react'
import { Form, ListGroup } from 'react-bootstrap'
import { getAllCommuneNames, getCommuneId } from '@/lib/shipit/communes'

interface CommuneAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onCommuneIdChange?: (communeId: number | null) => void
  placeholder?: string
  required?: boolean
  label?: string
  className?: string
}

export default function CommuneAutocomplete({
  value,
  onChange,
  onCommuneIdChange,
  placeholder = 'Ej: Las Condes, Santiago, Providencia...',
  required = false,
  label,
  className,
}: CommuneAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isValid, setIsValid] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const allCommunes = getAllCommuneNames()

  // Filtrar comunas según el input con ordenamiento por relevancia
  useEffect(() => {
    if (!value || value.trim() === '') {
      setSuggestions([])
      setShowSuggestions(false)
      setIsValid(true)
      if (onCommuneIdChange) {
        onCommuneIdChange(null)
      }
      return
    }

    const searchTerm = value.toUpperCase().trim()
    
    // Filtrar y ordenar por relevancia
    const filtered = allCommunes
      .map((commune) => {
        const communeUpper = commune.toUpperCase()
        const index = communeUpper.indexOf(searchTerm)
        
        // Prioridad: exact match > starts with > contains
        let priority = 3
        if (communeUpper === searchTerm) {
          priority = 1 // Exact match
        } else if (communeUpper.startsWith(searchTerm)) {
          priority = 2 // Starts with
        } else if (index !== -1) {
          priority = 3 // Contains
        } else {
          return null // No match
        }
        
        return { commune, priority, index }
      })
      .filter((item): item is { commune: string; priority: number; index: number } => item !== null)
      .sort((a, b) => {
        // Ordenar por prioridad, luego por posición del match
        if (a.priority !== b.priority) {
          return a.priority - b.priority
        }
        return a.index - b.index
      })
      .map((item) => item.commune)
      .slice(0, 10) // Limitar a 10 sugerencias

    setSuggestions(filtered)
    setShowSuggestions(filtered.length > 0 && value.length > 0)

    // Verificar si el valor actual es una comuna válida
    const communeId = getCommuneId(value)
    setIsValid(communeId !== null || value.length === 0)
    
    if (onCommuneIdChange) {
      onCommuneIdChange(communeId)
    }
  }, [value, allCommunes, onCommuneIdChange])

  // Cerrar sugerencias al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }

  const handleSelectSuggestion = (commune: string) => {
    onChange(commune)
    setShowSuggestions(false)
    inputRef.current?.blur()
  }

  const handleInputFocus = () => {
    if (suggestions.length > 0 && value.length > 0) {
      setShowSuggestions(true)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Flecha abajo: seleccionar primera sugerencia
    if (e.key === 'ArrowDown' && suggestions.length > 0) {
      e.preventDefault()
      setShowSuggestions(true)
    }
    // Escape: cerrar sugerencias
    if (e.key === 'Escape') {
      setShowSuggestions(false)
      inputRef.current?.blur()
    }
  }

  return (
    <div ref={containerRef} className={`position-relative ${className || ''}`}>
      {label && (
        <Form.Label>
          {label} {required && <span className="text-danger">*</span>}
        </Form.Label>
      )}
      <Form.Control
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        required={required}
        isInvalid={!isValid && value.length > 0}
        className={!isValid && value.length > 0 ? 'border-danger' : ''}
        autoComplete="off"
      />
      {!isValid && value.length > 0 && (
        <Form.Control.Feedback type="invalid" className="d-block">
          Comuna no encontrada. Selecciona una de las sugerencias.
        </Form.Control.Feedback>
      )}
      {isValid && value.length > 0 && (
        <Form.Text className="text-muted">
          ✓ Comuna válida
        </Form.Text>
      )}
      {showSuggestions && suggestions.length > 0 && (
        <div
          className="position-absolute w-100 bg-white border rounded shadow-lg"
          style={{
            zIndex: 1050,
            maxHeight: '200px',
            overflowY: 'auto',
            marginTop: '2px',
          }}
        >
          <ListGroup variant="flush">
            {suggestions.map((commune, index) => (
              <ListGroup.Item
                key={index}
                action
                onClick={() => handleSelectSuggestion(commune)}
                style={{ cursor: 'pointer' }}
                className="px-3 py-2"
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8f9fa'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                {commune}
              </ListGroup.Item>
            ))}
          </ListGroup>
        </div>
      )}
    </div>
  )
}
