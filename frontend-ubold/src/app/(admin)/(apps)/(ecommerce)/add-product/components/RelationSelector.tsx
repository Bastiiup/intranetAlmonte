'use client'

import { useState, useEffect, memo } from 'react'
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

const RelationSelector = memo(function RelationSelector({ 
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
        const items = data.data || []
        console.log(`[RelationSelector] ${label} - Items recibidos:`, items.length)
        
        // LOG para ver campos disponibles del primer item
        if (items.length > 0) {
          console.log(`[RelationSelector] ${label} - Campos del primer item:`, Object.keys(items[0]))
        }
        
        setOptions(items)
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
    // Intentar múltiples campos posibles para el nombre
    return option[displayField] || 
           option.nombre || 
           option.titulo || 
           option.name ||
           option.title ||
           `Item ${option.id || option.documentId}`
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
})

export { RelationSelector }

