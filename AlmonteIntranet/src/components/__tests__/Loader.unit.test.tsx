import { render, screen } from '@testing-library/react'
import Loader from '../Loader'

describe('Loader', () => {
  it('debe renderizar el loader', () => {
    render(<Loader />)
    const spinner = document.querySelector('.spinner-border')
    expect(spinner).toBeInTheDocument()
  })

  it('debe aplicar altura y ancho por defecto', () => {
    render(<Loader />)
    const container = document.querySelector('.position-relative')
    expect(container).toHaveStyle({ height: '100%', width: '100%' })
  })

  it('debe aplicar altura personalizada', () => {
    render(<Loader height="200px" />)
    const container = document.querySelector('.position-relative')
    expect(container).toHaveStyle({ height: '200px' })
  })

  it('debe aplicar ancho personalizado', () => {
    render(<Loader width="300px" />)
    const container = document.querySelector('.position-relative')
    expect(container).toHaveStyle({ width: '300px' })
  })

  it('no debe mostrar overlay por defecto', () => {
    render(<Loader />)
    const overlay = document.querySelector('.card-overlay')
    expect(overlay).not.toBeInTheDocument()
  })

  it('debe mostrar overlay cuando overlay es true', () => {
    render(<Loader overlay={true} />)
    const overlay = document.querySelector('.card-overlay')
    expect(overlay).toBeInTheDocument()
  })

  it('debe tener el spinner con variant primary', () => {
    render(<Loader />)
    const spinner = document.querySelector('.spinner-border')
    expect(spinner).toHaveClass('text-primary')
  })

  it('debe tener z-index correcto para spinner y overlay', () => {
    render(<Loader overlay={true} />)
    const spinner = document.querySelector('.spinner-border')
    const overlay = document.querySelector('.card-overlay')
    
    expect(spinner).toHaveStyle({ zIndex: 2 })
    expect(overlay).toHaveStyle({ zIndex: 1 })
  })
})










