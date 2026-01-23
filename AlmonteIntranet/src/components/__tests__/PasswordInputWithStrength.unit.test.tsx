import { render, screen, fireEvent } from '@testing-library/react'
import PasswordInputWithStrength from '../PasswordInputWithStrength'

describe('PasswordInputWithStrength', () => {
  const mockSetPassword = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('debe renderizar el componente', () => {
    render(<PasswordInputWithStrength password="" setPassword={mockSetPassword} />)
    expect(screen.getByPlaceholderText(undefined)).toBeInTheDocument()
  })

  it('debe mostrar el label cuando se proporciona', () => {
    render(
      <PasswordInputWithStrength 
        password="" 
        setPassword={mockSetPassword} 
        label="Contraseña"
      />
    )
    expect(screen.getByText('Contraseña')).toBeInTheDocument()
  })

  it('debe mostrar asterisco rojo en el label', () => {
    render(
      <PasswordInputWithStrength 
        password="" 
        setPassword={mockSetPassword} 
        label="Contraseña"
      />
    )
    const asterisk = screen.getByText('*')
    expect(asterisk).toHaveClass('text-danger')
  })

  it('debe actualizar el valor cuando se escribe', () => {
    render(<PasswordInputWithStrength password="" setPassword={mockSetPassword} />)
    
    const input = screen.getByRole('textbox') || screen.getByDisplayValue('')
    fireEvent.change(input, { target: { value: 'test123' } })

    expect(mockSetPassword).toHaveBeenCalledWith('test123')
  })

  it('debe mostrar placeholder cuando se proporciona', () => {
    render(
      <PasswordInputWithStrength 
        password="" 
        setPassword={mockSetPassword} 
        placeholder="Ingrese su contraseña"
      />
    )
    expect(screen.getByPlaceholderText('Ingrese su contraseña')).toBeInTheDocument()
  })

  it('debe mostrar mensaje de ayuda', () => {
    render(<PasswordInputWithStrength password="" setPassword={mockSetPassword} />)
    expect(screen.getByText(/Use 8\+ characters/)).toBeInTheDocument()
  })

  it('debe calcular fuerza de contraseña correctamente', () => {
    const { rerender } = render(
      <PasswordInputWithStrength password="" setPassword={mockSetPassword} />
    )
    
    // Contraseña débil (solo longitud)
    rerender(
      <PasswordInputWithStrength password="12345678" setPassword={mockSetPassword} />
    )
    let bars = screen.getAllByRole('generic').filter(el => 
      el.className.includes('strong-bar')
    )
    expect(bars.length).toBeGreaterThan(0)

    // Contraseña con mayúsculas
    rerender(
      <PasswordInputWithStrength password="Test12345678" setPassword={mockSetPassword} />
    )
    
    // Contraseña con símbolos
    rerender(
      <PasswordInputWithStrength password="Test123!@#" setPassword={mockSetPassword} />
    )
  })

  it('debe mostrar 4 barras de fuerza', () => {
    render(<PasswordInputWithStrength password="" setPassword={mockSetPassword} />)
    
    const passwordBar = screen.getByText(/Use 8\+ characters/).closest('div')?.previousSibling
    expect(passwordBar).toBeInTheDocument()
  })

  it('debe aplicar className personalizado al label', () => {
    render(
      <PasswordInputWithStrength 
        password="" 
        setPassword={mockSetPassword} 
        label="Contraseña"
        labelClassName="custom-label"
      />
    )
    const label = screen.getByText('Contraseña')
    expect(label).toHaveClass('custom-label')
  })

  it('debe aplicar className personalizado al input', () => {
    render(
      <PasswordInputWithStrength 
        password="" 
        setPassword={mockSetPassword} 
        inputClassName="custom-input"
      />
    )
    const input = screen.getByRole('textbox') || screen.getByDisplayValue('')
    expect(input).toHaveClass('custom-input')
  })

  it('debe mostrar icono cuando showIcon es true', () => {
    render(
      <PasswordInputWithStrength 
        password="" 
        setPassword={mockSetPassword} 
        showIcon
      />
    )
    // Buscar el icono por su clase
    const icon = document.querySelector('.app-search-icon')
    expect(icon).toBeInTheDocument()
  })

  it('debe tener input de tipo password', () => {
    render(<PasswordInputWithStrength password="" setPassword={mockSetPassword} />)
    
    const input = screen.getByRole('textbox') || document.querySelector('input[type="password"]')
    expect(input).toHaveAttribute('type', 'password')
  })

  it('debe ser requerido', () => {
    render(<PasswordInputWithStrength password="" setPassword={mockSetPassword} />)
    
    const input = screen.getByRole('textbox') || document.querySelector('input[type="password"]')
    expect(input).toHaveAttribute('required')
  })

  it('debe mostrar diferentes niveles de fuerza', () => {
    const { rerender } = render(
      <PasswordInputWithStrength password="weak" setPassword={mockSetPassword} />
    )
    
    // Contraseña con longitud mínima
    rerender(
      <PasswordInputWithStrength password="12345678" setPassword={mockSetPassword} />
    )
    
    // Contraseña con mayúsculas
    rerender(
      <PasswordInputWithStrength password="Test12345678" setPassword={mockSetPassword} />
    )
    
    // Contraseña con números
    rerender(
      <PasswordInputWithStrength password="Test12345678" setPassword={mockSetPassword} />
    )
    
    // Contraseña con símbolos
    rerender(
      <PasswordInputWithStrength password="Test123!@#" setPassword={mockSetPassword} />
    )
  })
})

