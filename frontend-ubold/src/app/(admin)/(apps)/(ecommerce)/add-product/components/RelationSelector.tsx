'use client'

import { useState, useEffect } from 'react'
import { FormLabel, FormSelect } from 'react-bootstrap'

interface RelationSelectorProps {
  label: string
  value: string | string[] | null
  onChange: (value: string | string[]) => void
  endpoint: string
  multiple?: boolean
  required?: boolean
  displayField?: string
  className?: string
}

export function RelationSelector({ 
  label, 
  value, 
  onChange, 
  endpoint, 
  multiple = false,
  required = false,
  displayField = 'nombre',
  className = ''
}: RelationSelectorProps) {
  const [options, setOptions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchOptions()
  }, [endpoint])

  const fetchOptions = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(endpoint)
      const data = await res.json()
      
      if (data.success) {
        setOptions(data.data || [])
      } else {
        setError(data.error || 'Error al cargar opciones')
      }
    } catch (err: any) {
      console.error('[RelationSelector] Error fetching options:', err)
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (multiple) {
      const selectedOptions = Array.from(e.target.selectedOptions, option => option.value)
      onChange(selectedOptions.filter(v => v !== '')) // Filtrar opción vacía
    } else {
      onChange(e.target.value || '')
    }
  }

  const getDisplayValue = (option: any): string => {
    return option[displayField] || option.nombre || option.titulo || option.name || 'Sin nombre'
  }

  return (
    <div className={`mb-3 ${className}`}>
      <FormLabel>
        {label} {required && <span className="text-danger">*</span>}
      </FormLabel>
      
      {loading ? (
        <div className="text-muted small">Cargando opciones...</div>
      ) : error ? (
        <div className="alert alert-warning py-2 mb-0 small">{error}</div>
      ) : (
        <>
          <FormSelect
            value={multiple ? undefined : (value as string || '')}
            onChange={handleSelectChange}
            multiple={multiple}
            required={required}
            {...(multiple ? { style: { minHeight: '120px' } } : {})}
          >
            <option value="">Add or create a relation</option>
            {options.map((option: any) => {
              const optionId = option.documentId || option.id
              const displayText = getDisplayValue(option)
              return (
                <option key={optionId} value={optionId}>
                  {displayText}
                </option>
              )
            })}
          </FormSelect>
          
          <button 
            type="button" 
            className="btn btn-link btn-sm mt-1 p-0 text-decoration-none"
            onClick={() => alert('Funcionalidad "Crear nueva relación" próximamente')}
            style={{ fontSize: '0.875rem' }}
          >
            + Create a relation
          </button>
        </>
      )}
    </div>
  )
}

