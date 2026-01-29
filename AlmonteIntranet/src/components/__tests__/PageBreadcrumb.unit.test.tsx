import { render, screen } from '@testing-library/react'
import PageBreadcrumb from '../PageBreadcrumb'

describe('PageBreadcrumb', () => {
  it('debe renderizar el título', () => {
    render(<PageBreadcrumb title="Test Title" />)
    expect(screen.getByText('Test Title')).toBeInTheDocument()
  })

  it('debe renderizar el subtítulo cuando se proporciona', () => {
    render(<PageBreadcrumb title="Test Title" subtitle="Subtitle" />)
    expect(screen.getByText('Subtitle')).toBeInTheDocument()
  })

  it('debe mostrar el breadcrumb con "Intranet Almonte"', () => {
    render(<PageBreadcrumb title="Test Title" />)
    expect(screen.getByText('Intranet Almonte')).toBeInTheDocument()
  })

  it('debe mostrar el título como item activo en el breadcrumb', () => {
    render(<PageBreadcrumb title="Test Title" />)
    const activeItem = screen.getByText('Test Title')
    expect(activeItem).toBeInTheDocument()
  })

  it('debe mostrar el botón de información cuando se proporciona infoText', () => {
    render(<PageBreadcrumb title="Test Title" infoText="Test info" />)
    const infoButton = document.querySelector('button')
    expect(infoButton).toBeInTheDocument()
  })

  it('no debe mostrar el botón de información cuando no hay infoText', () => {
    render(<PageBreadcrumb title="Test Title" />)
    const infoButtons = document.querySelectorAll('button')
    // Solo debería haber botones del breadcrumb si los hay
    expect(infoButtons.length).toBe(0)
  })

  it('debe renderizar correctamente con todos los props', () => {
    render(
      <PageBreadcrumb 
        title="Test Title" 
        subtitle="Test Subtitle" 
        infoText="Test info text"
      />
    )
    
    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(screen.getByText('Test Subtitle')).toBeInTheDocument()
    expect(screen.getByText('Intranet Almonte')).toBeInTheDocument()
  })

  it('debe tener la estructura correcta del breadcrumb', () => {
    render(<PageBreadcrumb title="Test Title" subtitle="Subtitle" />)
    
    const breadcrumb = document.querySelector('.breadcrumb')
    expect(breadcrumb).toBeInTheDocument()
  })
})










