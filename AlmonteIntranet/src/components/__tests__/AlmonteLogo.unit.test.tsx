import { render, screen } from '@testing-library/react'
import AlmonteLogo from '../AlmonteLogo'

describe('AlmonteLogo', () => {
  it('debe renderizar el componente SVG', () => {
    render(<AlmonteLogo />)
    const svg = document.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('debe usar altura por defecto de 150', () => {
    render(<AlmonteLogo />)
    const svg = document.querySelector('svg')
    expect(svg).toHaveAttribute('width', '150')
    expect(svg).toHaveAttribute('height', '150')
  })

  it('debe usar altura personalizada cuando se proporciona', () => {
    render(<AlmonteLogo height={200} />)
    const svg = document.querySelector('svg')
    expect(svg).toHaveAttribute('width', '200')
    expect(svg).toHaveAttribute('height', '200')
  })

  it('debe tener viewBox correcto', () => {
    render(<AlmonteLogo />)
    const svg = document.querySelector('svg')
    expect(svg).toHaveAttribute('viewBox', '0 0 150 150')
  })

  it('debe tener display block en el estilo por defecto', () => {
    render(<AlmonteLogo />)
    const svg = document.querySelector('svg')
    expect(svg).toHaveStyle({ display: 'block' })
  })

  it('debe aplicar estilos personalizados', () => {
    const customStyle = { margin: '10px' }
    render(<AlmonteLogo style={customStyle} />)
    const svg = document.querySelector('svg')
    expect(svg).toHaveStyle({ display: 'block', margin: '10px' })
  })

  it('debe tener paths con fill currentColor', () => {
    render(<AlmonteLogo />)
    const paths = document.querySelectorAll('path[fill="currentColor"]')
    expect(paths.length).toBeGreaterThan(0)
  })

  it('debe tener defs con estilos', () => {
    render(<AlmonteLogo />)
    const defs = document.querySelector('defs')
    expect(defs).toBeInTheDocument()
    const style = document.querySelector('style')
    expect(style).toBeInTheDocument()
  })

  it('debe tener xmlns correcto', () => {
    render(<AlmonteLogo />)
    const svg = document.querySelector('svg')
    expect(svg).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg')
  })

  it('debe tener className cls-1 en el primer path', () => {
    render(<AlmonteLogo />)
    const firstPath = document.querySelector('path.cls-1')
    expect(firstPath).toBeInTheDocument()
  })
})










