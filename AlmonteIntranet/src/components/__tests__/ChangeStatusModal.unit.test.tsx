import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ChangeStatusModal from '../table/ChangeStatusModal'

describe('ChangeStatusModal', () => {
  const mockOnHide = jest.fn()
  const mockOnConfirm = jest.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('debe renderizar el modal cuando show es true', () => {
    render(
      <ChangeStatusModal
        show={true}
        onHide={mockOnHide}
        onConfirm={mockOnConfirm}
        currentStatus="Pendiente"
        productName="Test Product"
      />
    )
    expect(screen.getByText('Cambiar Estado de Publicación')).toBeInTheDocument()
  })

  it('no debe renderizar el modal cuando show es false', () => {
    render(
      <ChangeStatusModal
        show={false}
        onHide={mockOnHide}
        onConfirm={mockOnConfirm}
        currentStatus="Pendiente"
        productName="Test Product"
      />
    )
    expect(screen.queryByText('Cambiar Estado de Publicación')).not.toBeInTheDocument()
  })

  it('debe mostrar el nombre del producto', () => {
    render(
      <ChangeStatusModal
        show={true}
        onHide={mockOnHide}
        onConfirm={mockOnConfirm}
        currentStatus="Pendiente"
        productName="Test Product"
      />
    )
    expect(screen.getByText(/Test Product/)).toBeInTheDocument()
  })

  it('debe mostrar el estado actual', () => {
    render(
      <ChangeStatusModal
        show={true}
        onHide={mockOnHide}
        onConfirm={mockOnConfirm}
        currentStatus="Publicado"
        productName="Test Product"
      />
    )
    expect(screen.getByText(/Estado actual/)).toBeInTheDocument()
    // Buscar el badge específicamente, no el option del select
    const badge = document.querySelector('.badge')
    expect(badge).toHaveTextContent('Publicado')
  })

  it('debe tener opciones de estado', () => {
    render(
      <ChangeStatusModal
        show={true}
        onHide={mockOnHide}
        onConfirm={mockOnConfirm}
        currentStatus="Pendiente"
        productName="Test Product"
      />
    )
    const select = screen.getByRole('combobox')
    expect(select).toBeInTheDocument()
    // Verificar las opciones del select directamente
    const options = select.querySelectorAll('option')
    const optionTexts = Array.from(options).map(opt => opt.textContent)
    expect(optionTexts).toContain('Publicado')
    expect(optionTexts).toContain('Pendiente')
    expect(optionTexts).toContain('Borrador')
  })

  it('debe mostrar campo de confirmación cuando se cambia el estado', () => {
    render(
      <ChangeStatusModal
        show={true}
        onHide={mockOnHide}
        onConfirm={mockOnConfirm}
        currentStatus="Pendiente"
        productName="Test Product"
      />
    )
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'Publicado' } })
    
    expect(screen.getByPlaceholderText(/Escribe "Confirmar"/)).toBeInTheDocument()
  })

  it('debe validar el texto de confirmación', () => {
    render(
      <ChangeStatusModal
        show={true}
        onHide={mockOnHide}
        onConfirm={mockOnConfirm}
        currentStatus="Pendiente"
        productName="Test Product"
      />
    )
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'Publicado' } })
    
    const input = screen.getByPlaceholderText(/Escribe "Confirmar"/)
    fireEvent.change(input, { target: { value: 'Incorrecto' } })
    
    expect(screen.getByText(/Debes escribir exactamente/)).toBeInTheDocument()
  })

  it('debe habilitar el botón cuando la confirmación es válida', () => {
    render(
      <ChangeStatusModal
        show={true}
        onHide={mockOnHide}
        onConfirm={mockOnConfirm}
        currentStatus="Pendiente"
        productName="Test Product"
      />
    )
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'Publicado' } })
    
    const input = screen.getByPlaceholderText(/Escribe "Confirmar"/)
    fireEvent.change(input, { target: { value: 'Confirmar' } })
    
    const submitButton = screen.getByText('Guardar Cambios')
    expect(submitButton).not.toBeDisabled()
  })

  it('debe llamar onConfirm cuando se confirma', async () => {
    render(
      <ChangeStatusModal
        show={true}
        onHide={mockOnHide}
        onConfirm={mockOnConfirm}
        currentStatus="Pendiente"
        productName="Test Product"
      />
    )
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'Publicado' } })
    
    const input = screen.getByPlaceholderText(/Escribe "Confirmar"/)
    fireEvent.change(input, { target: { value: 'Confirmar' } })
    
    const submitButton = screen.getByText('Guardar Cambios')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledWith('Publicado')
    })
  })

  it('debe llamar onHide cuando se cancela', () => {
    render(
      <ChangeStatusModal
        show={true}
        onHide={mockOnHide}
        onConfirm={mockOnConfirm}
        currentStatus="Pendiente"
        productName="Test Product"
      />
    )
    const cancelButton = screen.getByText('Cancelar')
    fireEvent.click(cancelButton)
    
    expect(mockOnHide).toHaveBeenCalled()
  })

  it('debe mostrar error cuando onConfirm falla', async () => {
    const mockOnConfirmError = jest.fn().mockRejectedValue(new Error('Error de red'))
    render(
      <ChangeStatusModal
        show={true}
        onHide={mockOnHide}
        onConfirm={mockOnConfirmError}
        currentStatus="Pendiente"
        productName="Test Product"
      />
    )
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'Publicado' } })
    
    const input = screen.getByPlaceholderText(/Escribe "Confirmar"/)
    fireEvent.change(input, { target: { value: 'Confirmar' } })
    
    const submitButton = screen.getByText('Guardar Cambios')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/Error/)).toBeInTheDocument()
    })
  })

  it('debe mostrar "Guardando..." cuando está enviando', async () => {
    const mockOnConfirmSlow = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)))
    render(
      <ChangeStatusModal
        show={true}
        onHide={mockOnHide}
        onConfirm={mockOnConfirmSlow}
        currentStatus="Pendiente"
        productName="Test Product"
      />
    )
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'Publicado' } })
    
    const input = screen.getByPlaceholderText(/Escribe "Confirmar"/)
    fireEvent.change(input, { target: { value: 'Confirmar' } })
    
    const submitButton = screen.getByText('Guardar Cambios')
    fireEvent.click(submitButton)
    
    expect(screen.getByText('Guardando...')).toBeInTheDocument()
  })
})

