'use client'

import { useState, useEffect, memo, useRef } from 'react'
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
  const selectRef = useRef<HTMLSelectElement>(null)

  useEffect(() => {
    fetchOptions()
  }, [endpoint])

  // Sincronizar valores seleccionados cuando cambia el prop value
  useEffect(() => {
    if (multiple && selectRef.current) {
      const select = selectRef.current
      const valueArray = Array.isArray(value) ? value.map(String) : (value ? [String(value)] : [])
      
      // Deseleccionar todas las opciones primero
      Array.from(select.options).forEach(option => {
        option.selected = false
      })
      
      // Seleccionar las opciones que están en el array de valores
      valueArray.forEach(val => {
        const option = Array.from(select.options).find(opt => opt.value === val)
        if (option) {
          option.selected = true
        }
      })
    }
  }, [value, multiple, options])

  const fetchOptions = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Para productos, cargar todos sin límite de paginación
      const isProductosEndpoint = endpoint.includes('/productos')
      const fetchUrl = isProductosEndpoint 
        ? `${endpoint}?pagination[pageSize]=1000` 
        : endpoint
      
      const res = await fetch(fetchUrl, {
        credentials: 'include', // Incluir cookies en la petición
        headers: {
          'Content-Type': 'application/json',
        },
      })
      const data = await res.json()
      
      if (data.success) {
        let items = data.data || []
        
        // Si hay paginación y hay más páginas, cargar todas
        if (isProductosEndpoint && data.meta?.pagination) {
          const pagination = data.meta.pagination
          const totalPages = pagination.pageCount || 1
          
          if (totalPages > 1) {
            console.log(`[RelationSelector] ${label} - Cargando ${totalPages} páginas...`)
            const allItems = [...items]
            
            // Cargar las páginas restantes
            for (let page = 2; page <= totalPages; page++) {
              try {
                const pageRes = await fetch(`${endpoint}?pagination[pageSize]=1000&pagination[page]=${page}`, {
                  credentials: 'include', // Incluir cookies en la petición
                  headers: {
                    'Content-Type': 'application/json',
                  },
                })
                const pageData = await pageRes.json()
                if (pageData.success && pageData.data) {
                  allItems.push(...pageData.data)
                }
              } catch (pageErr) {
                console.warn(`[RelationSelector] Error al cargar página ${page}:`, pageErr)
              }
            }
            
            items = allItems
          }
        }
        
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
    const attrs = option.attributes || {}
    const data = (attrs && Object.keys(attrs).length > 0) ? attrs : option
    
    // Obtener el ID del producto
    const productId = option.id || option.documentId || data.id || data.documentId
    
    // Intentar obtener el nombre/título del producto
    // Primero intentar con el displayField específico
    let nombre = data[displayField] || option[displayField]
    
    // Si no se encontró, buscar en campos comunes según el tipo de relación
    if (!nombre) {
      // Campos comunes para diferentes tipos de entidades
      const possibleFields = [
        'nombre_obra', 'nombreObra', 'NOMBRE_OBRA', // Obras
        'nombre_libro', 'nombreLibro', 'NOMBRE_LIBRO', // Productos
        'nombre_editorial', 'nombreEditorial', 'NOMBRE_EDITORIAL', // Editoriales
        'razon_social', 'razonSocial', 'RAZON_SOCIAL', // Editoriales (alternativo)
        'nombre_coleccion', 'nombreColeccion', 'NOMBRE_COLECCION', // Colecciones
        'nombre_sello', 'nombreSello', 'NOMBRE_SELLO', // Sellos
        'nombre', 'NOMBRE', 'name', 'NAME', // Autores, Sellos, Marcas, etc. (genérico)
        'titulo', 'TITULO', 'title', 'TITLE', // Obras, Productos
      ]
      
      for (const field of possibleFields) {
        if (data[field] || option[field]) {
          nombre = data[field] || option[field]
          break
        }
      }
    }
    
    // Si aún no hay nombre, intentar buscar en relaciones anidadas
    if (!nombre && data.data) {
      const nestedData = data.data.attributes || data.data
      nombre = nestedData[displayField] || 
               nestedData.nombre_obra ||
               nestedData.nombre_libro ||
               nestedData.nombre_editorial ||
               nestedData.razon_social ||
               nestedData.nombre_coleccion ||
               nestedData.nombre_sello ||
               nestedData.nombre ||
               nestedData.titulo ||
               nestedData.name ||
               nestedData.title
    }
    
    // Si hay nombre, mostrar solo el nombre (sin ID para mejor legibilidad)
    if (nombre && nombre.trim()) {
      return nombre.trim()
    }
    
    // Si no hay nombre, mostrar ID como último recurso
    return productId ? `Item ${productId}` : 'Sin nombre'
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
            ref={selectRef}
            value={multiple ? undefined : (value as string || '')}
            onChange={handleSelectChange}
            multiple={multiple}
            required={required}
            {...(multiple ? { style: { minHeight: '120px' } } : {})}
          >
            {!multiple && <option value="">Add or create a relation</option>}
            {options.map((option: any, index: number) => {
              const optionId = String(option.documentId || option.id || index)
              const displayText = getDisplayValue(option)
              // Usar índice junto con ID para garantizar claves únicas
              const uniqueKey = `${optionId}-${index}`
              return (
                <option key={uniqueKey} value={optionId}>
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

