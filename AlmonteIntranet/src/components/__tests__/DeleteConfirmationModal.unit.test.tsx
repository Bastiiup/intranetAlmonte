import { render, screen, fireEvent } from '@testing-library/react'
import DeleteConfirmationModal from '../table/DeleteConfirmationModal'

describe('DeleteConfirmationModal', () => {
  const mockOnHide = jest.fn()
  const mockOnConfirm = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('debe renderizar el modal cuando show es true', () => {
    render(
      <DeleteConfirmationModal
        show={true}
        onHide={mockOnHide}
        onConfirm={mockOnConfirm}
        selectedCount={1}
      />
    )
    expect(screen.getByText('Confirm Deletion')).toBeInTheDocument()
  })

  it('no debe renderizar el modal cuando show es false', () => {
    render(
      <DeleteConfirmationModal
        show={false}
        onHide={mockOnHide}
        onConfirm={mockOnConfirm}
        selectedCount={1}
      />
    )
    expect(screen.queryByText('Confirm Deletion')).not.toBeInTheDocument()
  })

  it('debe mostrar mensaje para un solo item', () => {
    render(
      <DeleteConfirmationModal
        show={true}
        onHide={mockOnHide}
        onConfirm={mockOnConfirm}
        selectedCount={1}
        itemName="product"
      />
    )
    expect(screen.getByText(/Are you sure you want to delete this product/)).toBeInTheDocument()
  })

  it('debe mostrar mensaje para múltiples items', () => {
    render(
      <DeleteConfirmationModal
        show={true}
        onHide={mockOnHide}
        onConfirm={mockOnConfirm}
        selectedCount={5}
        itemName="product"
      />
    )
    expect(screen.getByText(/Are you sure you want to delete these 5 products/)).toBeInTheDocument()
  })

  it('debe usar itemName por defecto "row"', () => {
    render(
      <DeleteConfirmationModal
        show={true}
        onHide={mockOnHide}
        onConfirm={mockOnConfirm}
        selectedCount={1}
      />
    )
    expect(screen.getByText(/Are you sure you want to delete this row/)).toBeInTheDocument()
  })

  it('debe mostrar children cuando se proporciona', () => {
    render(
      <DeleteConfirmationModal
        show={true}
        onHide={mockOnHide}
        onConfirm={mockOnConfirm}
        selectedCount={1}
      >
        <div>Custom message</div>
      </DeleteConfirmationModal>
    )
    expect(screen.getByText('Custom message')).toBeInTheDocument()
  })

  it('debe usar título personalizado', () => {
    render(
      <DeleteConfirmationModal
        show={true}
        onHide={mockOnHide}
        onConfirm={mockOnConfirm}
        selectedCount={1}
        modalTitle="Custom Title"
      />
    )
    expect(screen.getByText('Custom Title')).toBeInTheDocument()
  })

  it('debe usar texto de botón personalizado', () => {
    render(
      <DeleteConfirmationModal
        show={true}
        onHide={mockOnHide}
        onConfirm={mockOnConfirm}
        selectedCount={1}
        confirmButtonText="Eliminar"
        cancelButtonText="Cancelar"
      />
    )
    expect(screen.getByText('Eliminar')).toBeInTheDocument()
    expect(screen.getByText('Cancelar')).toBeInTheDocument()
  })

  it('debe llamar onConfirm cuando se confirma', () => {
    render(
      <DeleteConfirmationModal
        show={true}
        onHide={mockOnHide}
        onConfirm={mockOnConfirm}
        selectedCount={1}
      />
    )
    const confirmButton = screen.getByText('Delete')
    fireEvent.click(confirmButton)
    
    expect(mockOnConfirm).toHaveBeenCalledTimes(1)
  })

  it('debe llamar onHide cuando se cancela', () => {
    render(
      <DeleteConfirmationModal
        show={true}
        onHide={mockOnHide}
        onConfirm={mockOnConfirm}
        selectedCount={1}
      />
    )
    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)
    
    expect(mockOnHide).toHaveBeenCalledTimes(1)
  })

  it('debe deshabilitar botones cuando loading es true', () => {
    render(
      <DeleteConfirmationModal
        show={true}
        onHide={mockOnHide}
        onConfirm={mockOnConfirm}
        selectedCount={1}
        loading={true}
      />
    )
    // Filtrar el botón de cerrar del modal que no se deshabilita
    const buttons = screen.getAllByRole('button').filter(button => {
      const text = button.textContent || ''
      return text !== '' && !button.classList.contains('btn-close')
    })
    buttons.forEach(button => {
      expect(button).toBeDisabled()
    })
  })

  it('debe deshabilitar botones cuando disabled es true', () => {
    render(
      <DeleteConfirmationModal
        show={true}
        onHide={mockOnHide}
        onConfirm={mockOnConfirm}
        selectedCount={1}
        disabled={true}
      />
    )
    // Filtrar el botón de cerrar del modal que no se deshabilita
    const buttons = screen.getAllByRole('button').filter(button => {
      const text = button.textContent || ''
      return text !== '' && !button.classList.contains('btn-close')
    })
    buttons.forEach(button => {
      expect(button).toBeDisabled()
    })
  })

  it('debe mostrar "Eliminando..." cuando loading es true', () => {
    render(
      <DeleteConfirmationModal
        show={true}
        onHide={mockOnHide}
        onConfirm={mockOnConfirm}
        selectedCount={1}
        loading={true}
      />
    )
    expect(screen.getByText('Eliminando...')).toBeInTheDocument()
  })

  it('debe usar variant personalizado para botones', () => {
    render(
      <DeleteConfirmationModal
        show={true}
        onHide={mockOnHide}
        onConfirm={mockOnConfirm}
        selectedCount={1}
        confirmButtonVariant="warning"
        cancelButtonVariant="secondary"
      />
    )
    const confirmButton = screen.getByText('Delete')
    const cancelButton = screen.getByText('Cancel')
    expect(confirmButton).toHaveClass('btn-warning')
    expect(cancelButton).toHaveClass('btn-secondary')
  })
})

