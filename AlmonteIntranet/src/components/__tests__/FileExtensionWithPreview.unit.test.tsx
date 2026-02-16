import { render, screen } from '@testing-library/react'
import FileExtensionWithPreview from '../FileExtensionWithPreview'

describe('FileExtensionWithPreview', () => {
  it('debe renderizar el componente SVG', () => {
    render(<FileExtensionWithPreview extension="pdf" />)
    const svg = document.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('debe mostrar la extensión en mayúsculas', () => {
    render(<FileExtensionWithPreview extension="pdf" />)
    const text = screen.getByText('PDF')
    expect(text).toBeInTheDocument()
  })

  it('debe convertir extensiones a mayúsculas', () => {
    render(<FileExtensionWithPreview extension="docx" />)
    const text = screen.getByText('DOCX')
    expect(text).toBeInTheDocument()
  })

  it('debe tener dimensiones correctas', () => {
    render(<FileExtensionWithPreview extension="pdf" />)
    const svg = document.querySelector('svg')
    expect(svg).toHaveAttribute('width', '40')
    expect(svg).toHaveAttribute('height', '40')
  })

  it('debe tener viewBox correcto', () => {
    render(<FileExtensionWithPreview extension="pdf" />)
    const svg = document.querySelector('svg')
    expect(svg).toHaveAttribute('viewBox', '0 0 40 40')
  })

  it('debe tener paths con fill correcto', () => {
    render(<FileExtensionWithPreview extension="pdf" />)
    const paths = document.querySelectorAll('path')
    expect(paths.length).toBeGreaterThan(0)
    // Primer path debe tener fill white
    expect(paths[0]).toHaveAttribute('fill', 'white')
  })

  it('debe tener path con opacity 0.3', () => {
    render(<FileExtensionWithPreview extension="pdf" />)
    const pathWithOpacity = document.querySelector('path[opacity="0.3"]')
    expect(pathWithOpacity).toBeInTheDocument()
  })

  it('debe tener texto centrado', () => {
    render(<FileExtensionWithPreview extension="pdf" />)
    const text = screen.getByText('PDF')
    expect(text).toHaveAttribute('x', '50%')
    expect(text).toHaveAttribute('y', '70%')
    expect(text).toHaveAttribute('textAnchor', 'middle')
    expect(text).toHaveAttribute('dominantBaseline', 'middle')
  })

  it('debe tener texto con fill white', () => {
    render(<FileExtensionWithPreview extension="pdf" />)
    const text = screen.getByText('PDF')
    expect(text).toHaveAttribute('fill', 'white')
  })

  it('debe tener fontSize de 10', () => {
    render(<FileExtensionWithPreview extension="pdf" />)
    const text = screen.getByText('PDF')
    expect(text).toHaveAttribute('fontSize', '10')
  })

  it('debe pasar props adicionales al SVG', () => {
    render(<FileExtensionWithPreview extension="pdf" className="custom-class" />)
    const svg = document.querySelector('svg')
    expect(svg).toHaveClass('custom-class')
  })

  it('debe manejar extensiones cortas', () => {
    render(<FileExtensionWithPreview extension="js" />)
    const text = screen.getByText('JS')
    expect(text).toBeInTheDocument()
  })

  it('debe manejar extensiones largas', () => {
    render(<FileExtensionWithPreview extension="javascript" />)
    const text = screen.getByText('JAVASCRIPT')
    expect(text).toBeInTheDocument()
  })
})










