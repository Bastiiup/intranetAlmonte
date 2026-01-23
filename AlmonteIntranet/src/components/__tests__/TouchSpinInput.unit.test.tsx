import { render, screen, fireEvent } from '@testing-library/react'
import TouchSpinInput from '../TouchSpinInput'

// Mock de react-icons
jest.mock('react-icons/tb', () => ({
  TbMinus: () => <span data-testid="minus-icon">-</span>,
  TbPlus: () => <span data-testid="plus-icon">+</span>,
}))

describe('TouchSpinInput', () => {
  const mockSetValue = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('debe renderizar el componente', () => {
    render(<TouchSpinInput setValue={mockSetValue} />)
    const input = screen.getByRole('spinbutton')
    expect(input).toBeInTheDocument()
  })

  it('debe tener valor inicial de 0 cuando no se proporciona value', () => {
    render(<TouchSpinInput setValue={mockSetValue} />)
    const input = screen.getByRole('spinbutton')
    expect(input).toHaveValue(0)
  })

  it('debe usar valor proporcionado', () => {
    render(<TouchSpinInput value={5} setValue={mockSetValue} />)
    const input = screen.getByRole('spinbutton')
    expect(input).toHaveValue(5)
  })

  it('debe incrementar el valor al hacer clic en el botón plus', () => {
    render(<TouchSpinInput value={0} setValue={mockSetValue} />)
    const plusButton = screen.getByTestId('plus-icon').closest('button')
    
    fireEvent.click(plusButton!)
    
    expect(mockSetValue).toHaveBeenCalledWith(1)
  })

  it('debe decrementar el valor al hacer clic en el botón minus', () => {
    render(<TouchSpinInput value={5} setValue={mockSetValue} />)
    const minusButton = screen.getByTestId('minus-icon').closest('button')
    
    fireEvent.click(minusButton!)
    
    expect(mockSetValue).toHaveBeenCalledWith(4)
  })

  it('debe respetar el valor mínimo', () => {
    render(<TouchSpinInput value={0} min={0} setValue={mockSetValue} />)
    const minusButton = screen.getByTestId('minus-icon').closest('button')
    
    fireEvent.click(minusButton!)
    
    // No debe cambiar si ya está en el mínimo
    expect(mockSetValue).not.toHaveBeenCalled()
  })

  it('debe respetar el valor máximo', () => {
    render(<TouchSpinInput value={100} max={100} setValue={mockSetValue} />)
    const plusButton = screen.getByTestId('plus-icon').closest('button')
    
    fireEvent.click(plusButton!)
    
    // No debe cambiar si ya está en el máximo
    expect(mockSetValue).not.toHaveBeenCalled()
  })

  it('debe actualizar el valor al cambiar el input', () => {
    render(<TouchSpinInput value={0} setValue={mockSetValue} />)
    const input = screen.getByRole('spinbutton')
    
    fireEvent.change(input, { target: { value: '10' } })
    
    expect(mockSetValue).toHaveBeenCalledWith(10)
  })

  it('debe establecer valor mínimo cuando se ingresa un valor menor', () => {
    render(<TouchSpinInput value={5} min={0} setValue={mockSetValue} />)
    const input = screen.getByRole('spinbutton')
    
    fireEvent.change(input, { target: { value: '-5' } })
    
    expect(mockSetValue).toHaveBeenCalledWith(0)
  })

  it('debe establecer valor máximo cuando se ingresa un valor mayor', () => {
    render(<TouchSpinInput value={50} max={100} setValue={mockSetValue} />)
    const input = screen.getByRole('spinbutton')
    
    fireEvent.change(input, { target: { value: '150' } })
    
    expect(mockSetValue).toHaveBeenCalledWith(100)
  })

  it('debe establecer 0 cuando el input está vacío', () => {
    render(<TouchSpinInput value={5} setValue={mockSetValue} />)
    const input = screen.getByRole('spinbutton')
    
    fireEvent.change(input, { target: { value: '' } })
    
    expect(mockSetValue).toHaveBeenCalledWith(0)
  })

  it('debe aplicar className personalizado', () => {
    render(<TouchSpinInput className="custom-class" setValue={mockSetValue} />)
    const container = screen.getByRole('spinbutton').closest('.input-group')
    expect(container).toHaveClass('custom-class')
  })

  it('debe aplicar inputClassName al input', () => {
    render(<TouchSpinInput inputClassName="custom-input" setValue={mockSetValue} />)
    const input = screen.getByRole('spinbutton')
    expect(input).toHaveClass('custom-input')
  })

  it('debe aplicar buttonClassName a los botones', () => {
    render(<TouchSpinInput buttonClassName="custom-button" setValue={mockSetValue} />)
    const buttons = screen.getAllByRole('button')
    buttons.forEach(button => {
      expect(button).toHaveClass('custom-button')
    })
  })

  it('debe deshabilitar botones cuando disabled es true', () => {
    render(<TouchSpinInput disabled setValue={mockSetValue} />)
    const buttons = screen.getAllByRole('button')
    buttons.forEach(button => {
      expect(button).toBeDisabled()
    })
  })

  it('debe no permitir incrementar cuando está en readOnly', () => {
    render(<TouchSpinInput value={5} readOnly setValue={mockSetValue} />)
    const plusButton = screen.getByTestId('plus-icon').closest('button')
    
    fireEvent.click(plusButton!)
    
    expect(mockSetValue).not.toHaveBeenCalled()
  })

  it('debe no permitir decrementar cuando está en readOnly', () => {
    render(<TouchSpinInput value={5} readOnly setValue={mockSetValue} />)
    const minusButton = screen.getByTestId('minus-icon').closest('button')
    
    fireEvent.click(minusButton!)
    
    expect(mockSetValue).not.toHaveBeenCalled()
  })

  it('debe tener min y max en el input', () => {
    render(<TouchSpinInput min={0} max={100} setValue={mockSetValue} />)
    const input = screen.getByRole('spinbutton')
    expect(input).toHaveAttribute('min', '0')
    expect(input).toHaveAttribute('max', '100')
  })

  it('debe aplicar tamaño pequeño cuando size es sm', () => {
    render(<TouchSpinInput size="sm" setValue={mockSetValue} />)
    const container = screen.getByRole('spinbutton').closest('.input-group')
    expect(container).toHaveClass('input-group-sm')
  })

  it('debe aplicar tamaño grande cuando size es lg', () => {
    render(<TouchSpinInput size="lg" setValue={mockSetValue} />)
    const container = screen.getByRole('spinbutton').closest('.input-group')
    expect(container).toHaveClass('input-group-lg')
  })

  it('debe usar variant por defecto light', () => {
    render(<TouchSpinInput setValue={mockSetValue} />)
    const buttons = screen.getAllByRole('button')
    buttons.forEach(button => {
      expect(button).toHaveClass('btn-light')
    })
  })

  it('debe aplicar variant personalizado', () => {
    render(<TouchSpinInput variant="primary" setValue={mockSetValue} />)
    const buttons = screen.getAllByRole('button')
    buttons.forEach(button => {
      expect(button).toHaveClass('btn-primary')
    })
  })
})

