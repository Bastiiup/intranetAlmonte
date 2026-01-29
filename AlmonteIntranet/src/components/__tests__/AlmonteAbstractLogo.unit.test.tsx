import { render, screen } from '@testing-library/react'
import AlmonteAbstractLogo from '../AlmonteAbstractLogo'

describe('AlmonteAbstractLogo', () => {
  it('debe renderizar el componente SVG', () => {
    render(<AlmonteAbstractLogo />)
    const svg = document.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('debe usar altura por defecto de 60', () => {
    render(<AlmonteAbstractLogo />)
    const svg = document.querySelector('svg')
    expect(svg).toHaveAttribute('width', '60')
    expect(svg).toHaveAttribute('height', '60')
  })

  it('debe usar altura personalizada cuando se proporciona', () => {
    render(<AlmonteAbstractLogo height={100} />)
    const svg = document.querySelector('svg')
    expect(svg).toHaveAttribute('width', '100')
    expect(svg).toHaveAttribute('height', '100')
  })

  it('debe tener viewBox correcto', () => {
    render(<AlmonteAbstractLogo />)
    const svg = document.querySelector('svg')
    expect(svg).toHaveAttribute('viewBox', '0 0 200 200')
  })

  it('debe tener display block en el estilo', () => {
    render(<AlmonteAbstractLogo />)
    const svg = document.querySelector('svg')
    expect(svg).toHaveStyle({ display: 'block' })
  })

  it('debe tener paths con fill black', () => {
    render(<AlmonteAbstractLogo />)
    const paths = document.querySelectorAll('path')
    expect(paths.length).toBeGreaterThan(0)
    paths.forEach(path => {
      expect(path).toHaveAttribute('fill', 'black')
    })
  })

  it('debe tener xmlns correcto', () => {
    render(<AlmonteAbstractLogo />)
    const svg = document.querySelector('svg')
    expect(svg).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg')
  })
})










