import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ComponentCard from '../cards/ComponentCard'

// Mock de react-icons
jest.mock('react-icons/tb', () => ({
  TbChevronDown: () => <span data-testid="chevron-down">▼</span>,
  TbRefresh: () => <span data-testid="refresh-icon">🔄</span>,
  TbX: () => <span data-testid="close-icon">✕</span>,
}))

describe('ComponentCard', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('debe renderizar el componente', () => {
    render(
      <ComponentCard title="Test Card">
        <div>Test Content</div>
      </ComponentCard>
    )
    expect(screen.getByText('Test Card')).toBeInTheDocument()
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('debe mostrar el título', () => {
    render(
      <ComponentCard title="My Card">
        <div>Content</div>
      </ComponentCard>
    )
    expect(screen.getByText('My Card')).toBeInTheDocument()
  })

  it('debe renderizar children', () => {
    render(
      <ComponentCard title="Test">
        <div data-testid="child">Child Content</div>
      </ComponentCard>
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('debe ocultar el componente cuando se cierra', () => {
    render(
      <ComponentCard title="Test" isCloseable>
        <div>Content</div>
      </ComponentCard>
    )
    
    const closeButton = screen.getByTestId('close-icon').closest('span')
    fireEvent.click(closeButton!)
    
    expect(screen.queryByText('Test')).not.toBeInTheDocument()
  })

  it('debe mostrar botón de cerrar cuando isCloseable es true', () => {
    render(
      <ComponentCard title="Test" isCloseable>
        <div>Content</div>
      </ComponentCard>
    )
    expect(screen.getByTestId('close-icon')).toBeInTheDocument()
  })

  it('no debe mostrar botón de cerrar cuando isCloseable es false', () => {
    render(
      <ComponentCard title="Test" isCloseable={false}>
        <div>Content</div>
      </ComponentCard>
    )
    expect(screen.queryByTestId('close-icon')).not.toBeInTheDocument()
  })

  it('debe colapsar cuando se hace clic en el botón de colapsar', async () => {
    render(
      <ComponentCard title="Test" isCollapsible>
        <div>Content</div>
      </ComponentCard>
    )
    
    const collapseButton = screen.getByTestId('chevron-down').closest('span')
    fireEvent.click(collapseButton!)
    
    // Esperar a que la animación de collapse termine
    await waitFor(() => {
      const cardBody = document.querySelector('.card-body')
      // Cuando está colapsado, el Collapse de Bootstrap oculta el contenido pero puede estar en el DOM
      // Verificamos que el card tenga la clase card-collapse
      const card = screen.getByText('Test').closest('.card')
      expect(card).toHaveClass('card-collapse')
    })
  })

  it('debe mostrar botón de colapsar cuando isCollapsible es true', () => {
    render(
      <ComponentCard title="Test" isCollapsible>
        <div>Content</div>
      </ComponentCard>
    )
    expect(screen.getByTestId('chevron-down')).toBeInTheDocument()
  })

  it('debe mostrar spinner cuando se refresca', async () => {
    render(
      <ComponentCard title="Test" isRefreshable>
        <div>Content</div>
      </ComponentCard>
    )
    
    const refreshButton = screen.getByTestId('refresh-icon').closest('span')
    fireEvent.click(refreshButton!)
    
    await waitFor(() => {
      const spinner = document.querySelector('.spinner-border')
      expect(spinner).toBeInTheDocument()
    })
  })

  it('debe mostrar botón de refrescar cuando isRefreshable es true', () => {
    render(
      <ComponentCard title="Test" isRefreshable>
        <div>Content</div>
      </ComponentCard>
    )
    expect(screen.getByTestId('refresh-icon')).toBeInTheDocument()
  })

  it('debe aplicar className personalizado', () => {
    render(
      <ComponentCard title="Test" className="custom-card">
        <div>Content</div>
      </ComponentCard>
    )
    const card = screen.getByText('Test').closest('.card')
    expect(card).toHaveClass('custom-card')
  })

  it('debe aplicar bodyClassName', () => {
    render(
      <ComponentCard title="Test" bodyClassName="custom-body">
        <div>Content</div>
      </ComponentCard>
    )
    const body = screen.getByText('Content').closest('.card-body')
    expect(body).toHaveClass('custom-body')
  })

  it('debe aplicar headerClassName', () => {
    render(
      <ComponentCard title="Test" headerClassName="custom-header">
        <div>Content</div>
      </ComponentCard>
    )
    const header = screen.getByText('Test').closest('.card-header')
    expect(header).toHaveClass('custom-header')
  })

  it('debe tener clase card-collapse cuando está colapsado', () => {
    render(
      <ComponentCard title="Test" isCollapsible>
        <div>Content</div>
      </ComponentCard>
    )
    
    const collapseButton = screen.getByTestId('chevron-down').closest('span')
    fireEvent.click(collapseButton!)
    
    const card = screen.getByText('Test').closest('.card')
    expect(card).toHaveClass('card-collapse')
  })
})

