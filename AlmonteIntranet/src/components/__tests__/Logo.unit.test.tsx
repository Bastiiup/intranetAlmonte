import { render, screen } from '@testing-library/react'
import Logo from '../Logo'

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>
  }
})

describe('Logo', () => {
  it('debe renderizar el componente Logo', () => {
    render(<Logo />)
    const svg = document.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('debe tener un enlace al dashboard', () => {
    render(<Logo />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/dashboard')
  })

  it('debe aplicar className cuando se proporciona', () => {
    render(<Logo className="test-class" />)
    const link = screen.getByRole('link')
    expect(link).toHaveClass('test-class')
  })

  it('debe renderizar el SVG con el tamaño correcto', () => {
    render(<Logo size="lg" />)
    const svg = document.querySelector('svg')
    expect(svg).toHaveAttribute('width', '22')
    expect(svg).toHaveAttribute('height', '22')
  })

  it('debe renderizar el SVG con tamaño pequeño', () => {
    render(<Logo size="sm" />)
    const svg = document.querySelector('svg')
    expect(svg).toHaveAttribute('width', '22')
    expect(svg).toHaveAttribute('height', '22')
  })

  it('debe tener el viewBox correcto', () => {
    render(<Logo />)
    const svg = document.querySelector('svg')
    expect(svg).toHaveAttribute('viewBox', '0 0 150 150')
  })

  it('debe tener los paths del logo', () => {
    render(<Logo />)
    const paths = document.querySelectorAll('svg path')
    expect(paths.length).toBeGreaterThan(0)
  })

  it('debe tener estilos inline correctos', () => {
    render(<Logo />)
    const link = screen.getByRole('link')
    const styles = window.getComputedStyle(link)
    
    expect(link).toHaveStyle({
      textDecoration: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    })
  })
})










