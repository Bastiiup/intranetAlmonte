'use client'

import SelectClient from '@/components/client-wrapper/SelectClient'

export type SearchableOption = {
  value: string | number
  label: string
}

type SearchableSelectProps = {
  options: SearchableOption[]
  value: string | number | null | undefined
  onChange: (value: string) => void
  placeholder?: string
  isDisabled?: boolean
  /** Nombre del campo, solo usado para depuración o identificadores */
  name?: string
  /** Mostrar estado de carga en el combo */
  isLoading?: boolean
  /** Se dispara cuando el usuario escribe en el input del select */
  onInputChange?: (input: string) => void
  /** Se dispara cuando se llega al fondo del menú (para cargar más opciones) */
  onMenuScrollToBottom?: () => void
}

/**
 * Wrapper de react-select ya integrado en el proyecto,
 * para usarlo como combo buscable simple (single select).
 */
const SearchableSelect = ({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  isDisabled = false,
  isLoading = false,
  onInputChange,
  onMenuScrollToBottom,
}: SearchableSelectProps) => {
  const stringValue = value != null ? String(value) : ''
  const selected = options.find((opt) => String(opt.value) === stringValue) ?? null

  return (
    <SelectClient
      className="react-select"
      classNamePrefix="react-select"
      isClearable
      isDisabled={isDisabled}
      isLoading={isLoading}
      options={options}
      value={selected}
      placeholder={placeholder}
      onInputChange={(inputValue: string, meta: any) => {
        if (meta?.action === 'input-change') {
          onInputChange?.(inputValue)
        }
      }}
      onMenuScrollToBottom={() => {
        onMenuScrollToBottom?.()
      }}
      onChange={(opt: any) => {
        const val = opt?.value != null ? String(opt.value) : ''
        onChange(val)
      }}
    />
  )
}

export default SearchableSelect

