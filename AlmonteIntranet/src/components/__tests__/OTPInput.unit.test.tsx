import { render, screen, fireEvent } from '@testing-library/react'
import OTPInput from '../OTPInput'

describe('OTPInput', () => {
  const mockSetCode = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('debe renderizar el componente', () => {
    render(<OTPInput code={['', '', '', '']} setCode={mockSetCode} />)
    const inputs = screen.getAllByRole('textbox')
    expect(inputs).toHaveLength(4)
  })

  it('debe renderizar el número correcto de inputs', () => {
    render(<OTPInput code={['', '', '', '', '', '']} setCode={mockSetCode} />)
    const inputs = screen.getAllByRole('textbox')
    expect(inputs).toHaveLength(6)
  })

  it('debe mostrar el label cuando se proporciona', () => {
    render(
      <OTPInput 
        code={['', '', '', '']} 
        setCode={mockSetCode} 
        label="Código OTP"
      />
    )
    expect(screen.getByText('Código OTP')).toBeInTheDocument()
  })

  it('debe mostrar asterisco rojo en el label', () => {
    render(
      <OTPInput 
        code={['', '', '', '']} 
        setCode={mockSetCode} 
        label="Código OTP"
      />
    )
    const asterisk = screen.getByText('*')
    expect(asterisk).toHaveClass('text-danger')
  })

  it('debe actualizar el código cuando se escribe un dígito', () => {
    render(<OTPInput code={['', '', '', '']} setCode={mockSetCode} />)
    
    const inputs = screen.getAllByRole('textbox')
    fireEvent.change(inputs[0], { target: { value: '1' } })

    expect(mockSetCode).toHaveBeenCalledWith(['1', '', '', ''])
  })

  it('debe mover el foco al siguiente input cuando se escribe un dígito', () => {
    render(<OTPInput code={['', '', '', '']} setCode={mockSetCode} />)
    
    const inputs = screen.getAllByRole('textbox')
    fireEvent.change(inputs[0], { target: { value: '1' } })

    // El siguiente input debería recibir el foco
    expect(inputs[1]).toHaveFocus()
  })

  it('debe rechazar caracteres no numéricos', () => {
    render(<OTPInput code={['', '', '', '']} setCode={mockSetCode} />)
    
    const inputs = screen.getAllByRole('textbox')
    fireEvent.change(inputs[0], { target: { value: 'a' } })

    expect(mockSetCode).not.toHaveBeenCalled()
  })

  it('debe permitir solo un dígito por input', () => {
    render(<OTPInput code={['', '', '', '']} setCode={mockSetCode} />)
    
    const inputs = screen.getAllByRole('textbox')
    fireEvent.change(inputs[0], { target: { value: '12' } })

    // Solo debe aceptar el primer dígito
    expect(mockSetCode).toHaveBeenCalledWith(['1', '', '', ''])
  })

  it('debe mover el foco al input anterior con Backspace cuando está vacío', () => {
    render(<OTPInput code={['1', '', '', '']} setCode={mockSetCode} />)
    
    const inputs = screen.getAllByRole('textbox')
    inputs[1].focus()
    fireEvent.keyDown(inputs[1], { key: 'Backspace' })

    // El input anterior debería recibir el foco
    expect(inputs[0]).toHaveFocus()
  })

  it('debe tener maxLength de 1', () => {
    render(<OTPInput code={['', '', '', '']} setCode={mockSetCode} />)
    
    const inputs = screen.getAllByRole('textbox')
    inputs.forEach(input => {
      expect(input).toHaveAttribute('maxLength', '1')
    })
  })

  it('debe tener inputMode numérico', () => {
    render(<OTPInput code={['', '', '', '']} setCode={mockSetCode} />)
    
    const inputs = screen.getAllByRole('textbox')
    inputs.forEach(input => {
      expect(input).toHaveAttribute('inputMode', 'numeric')
    })
  })

  it('debe tener pattern numérico', () => {
    render(<OTPInput code={['', '', '', '']} setCode={mockSetCode} />)
    
    const inputs = screen.getAllByRole('textbox')
    inputs.forEach(input => {
      expect(input).toHaveAttribute('pattern', '[0-9]*')
    })
  })

  it('debe tener autoComplete one-time-code', () => {
    render(<OTPInput code={['', '', '', '']} setCode={mockSetCode} />)
    
    const inputs = screen.getAllByRole('textbox')
    inputs.forEach(input => {
      expect(input).toHaveAttribute('autoComplete', 'one-time-code')
    })
  })

  it('debe aplicar className personalizado al label', () => {
    render(
      <OTPInput 
        code={['', '', '', '']} 
        setCode={mockSetCode} 
        label="Código"
        labelClassName="custom-label"
      />
    )
    const label = screen.getByText('Código')
    expect(label).toHaveClass('custom-label')
  })

  it('debe aplicar className personalizado a los inputs', () => {
    render(
      <OTPInput 
        code={['', '', '', '']} 
        setCode={mockSetCode} 
        inputClassName="custom-input"
      />
    )
    const inputs = screen.getAllByRole('textbox')
    inputs.forEach(input => {
      expect(input).toHaveClass('custom-input')
    })
  })

  it('debe tener clase text-center en los inputs', () => {
    render(<OTPInput code={['', '', '', '']} setCode={mockSetCode} />)
    
    const inputs = screen.getAllByRole('textbox')
    inputs.forEach(input => {
      expect(input).toHaveClass('text-center')
    })
  })

  it('debe mantener el valor cuando se proporciona en code', () => {
    render(<OTPInput code={['1', '2', '3', '4']} setCode={mockSetCode} />)
    
    const inputs = screen.getAllByRole('textbox')
    expect(inputs[0]).toHaveValue('1')
    expect(inputs[1]).toHaveValue('2')
    expect(inputs[2]).toHaveValue('3')
    expect(inputs[3]).toHaveValue('4')
  })

  it('debe manejar códigos de diferentes longitudes', () => {
    const { rerender } = render(
      <OTPInput code={['', '']} setCode={mockSetCode} />
    )
    expect(screen.getAllByRole('textbox')).toHaveLength(2)

    rerender(<OTPInput code={['', '', '', '', '', '', '', '']} setCode={mockSetCode} />)
    expect(screen.getAllByRole('textbox')).toHaveLength(8)
  })

  it('no debe mover el foco si es el último input', () => {
    render(<OTPInput code={['', '', '', '']} setCode={mockSetCode} />)
    
    const inputs = screen.getAllByRole('textbox')
    fireEvent.change(inputs[3], { target: { value: '4' } })

    // El último input debe mantener el foco
    expect(inputs[3]).toHaveFocus()
  })
})










