import { render, screen } from '@testing-library/react'
import AppLogo from '../AppLogo'

// Mock de next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, height }: any) => (
    <img src={src} alt={alt} height={height} data-testid="app-logo-image" />
  ),
}))

// Mock de next/link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, className }: any) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}))

// Mock de imágenes
jest.mock('@/assets/images/logo-black.png', () => 'logo-black.png')
jest.mock('@/assets/images/logo.png', () => 'logo.png')

describe('AppLogo', () => {
  it('debe renderizar ambos logos', () => {
    render(<AppLogo />)
    const images = screen.getAllByTestId('app-logo-image')
    expect(images).toHaveLength(2)
  })

  it('debe tener logo-dark con clase correcta', () => {
    const { container } = render(<AppLogo />)
    const darkLink = container.querySelector('.logo-dark')
    expect(darkLink).toBeInTheDocument()
    expect(darkLink).toHaveClass('logo-dark')
  })

  it('debe tener logo-light con clase correcta', () => {
    render(<AppLogo />)
    const links = screen.getAllByRole('link')
    const lightLink = links.find(link => link.className.includes('logo-light'))
    expect(lightLink).toBeInTheDocument()
  })

  it('debe tener enlaces al home', () => {
    render(<AppLogo />)
    const links = screen.getAllByRole('link')
    links.forEach(link => {
      expect(link).toHaveAttribute('href', '/')
    })
  })

  it('debe usar altura por defecto de 28', () => {
    render(<AppLogo />)
    const images = screen.getAllByTestId('app-logo-image')
    images.forEach(img => {
      expect(img).toHaveAttribute('height', '28')
    })
  })

  it('debe usar altura personalizada cuando se proporciona', () => {
    render(<AppLogo height={50} />)
    const images = screen.getAllByTestId('app-logo-image')
    images.forEach(img => {
      expect(img).toHaveAttribute('height', '50')
    })
  })

  it('debe tener alt text para logo-dark', () => {
    render(<AppLogo />)
    const images = screen.getAllByTestId('app-logo-image')
    const darkImage = images.find(img => img.getAttribute('alt') === 'dark logo')
    expect(darkImage).toBeInTheDocument()
  })

  it('debe tener alt text para logo-light', () => {
    render(<AppLogo />)
    const images = screen.getAllByTestId('app-logo-image')
    const lightImage = images.find(img => img.getAttribute('alt') === 'logo')
    expect(lightImage).toBeInTheDocument()
  })

  it('debe cargar las imágenes correctas', () => {
    render(<AppLogo />)
    const images = screen.getAllByTestId('app-logo-image')
    const sources = images.map(img => img.getAttribute('src'))
    expect(sources).toContain('logo-black.png')
    expect(sources).toContain('logo.png')
  })
})

