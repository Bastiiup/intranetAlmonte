import { render, screen } from '@testing-library/react'
import Spinner from '../Spinner'

describe('Spinner', () => {
  it('debe renderizar el spinner', () => {
    render(<Spinner />)
    const spinner = screen.getByRole('status')
    expect(spinner).toBeInTheDocument()
  })

  it('debe aplicar la clase spinner-border por defecto', () => {
    render(<Spinner />)
    const spinner = screen.getByRole('status')
    expect(spinner).toHaveClass('spinner-border')
  })

  it('debe aplicar la clase spinner-grow cuando type es grow', () => {
    render(<Spinner type="grow" />)
    const spinner = screen.getByRole('status')
    expect(spinner).toHaveClass('spinner-grow')
  })

  it('debe aplicar el color correcto', () => {
    render(<Spinner color="primary" />)
    const spinner = screen.getByRole('status')
    expect(spinner).toHaveClass('text-primary')
  })

  it('debe aplicar el tamaño correcto', () => {
    render(<Spinner size="lg" />)
    const spinner = screen.getByRole('status')
    expect(spinner).toHaveClass('avatar-lg')
  })

  it('debe aplicar className personalizada', () => {
    render(<Spinner className="custom-class" />)
    const spinner = screen.getByRole('status')
    expect(spinner).toHaveClass('custom-class')
  })

  it('debe renderizar children', () => {
    render(<Spinner>Loading...</Spinner>)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('debe usar el tag personalizado', () => {
    render(<Spinner tag="span" />)
    const spinner = document.querySelector('span[role="status"]')
    expect(spinner).toBeInTheDocument()
  })

  it('debe combinar todas las props correctamente', () => {
    render(
      <Spinner 
        type="grow" 
        color="success" 
        size="sm" 
        className="custom"
      />
    )
    const spinner = screen.getByRole('status')
    expect(spinner).toHaveClass('spinner-grow')
    expect(spinner).toHaveClass('text-success')
    expect(spinner).toHaveClass('avatar-sm')
    expect(spinner).toHaveClass('custom')
  })
})

