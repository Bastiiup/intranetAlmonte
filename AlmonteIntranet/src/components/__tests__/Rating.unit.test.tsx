import { render, screen } from '@testing-library/react'
import Rating from '../Rating'

// Mock de react-icons
jest.mock('react-icons/tb', () => ({
  TbStar: () => <span data-testid="star-empty">★</span>,
  TbStarFilled: () => <span data-testid="star-full">★</span>,
  TbStarHalfFilled: () => <span data-testid="star-half">★</span>,
}))

describe('Rating', () => {
  it('debe renderizar el componente', () => {
    render(<Rating rating={3} />)
    expect(screen.getByTestId('star-full')).toBeInTheDocument()
  })

  it('debe mostrar 5 estrellas vacías cuando rating es 0', () => {
    render(<Rating rating={0} />)
    const emptyStars = screen.getAllByTestId('star-empty')
    expect(emptyStars).toHaveLength(5)
  })

  it('debe mostrar estrellas llenas correctamente', () => {
    render(<Rating rating={3} />)
    const fullStars = screen.getAllByTestId('star-full')
    expect(fullStars).toHaveLength(3)
  })

  it('debe mostrar media estrella cuando rating tiene decimal', () => {
    render(<Rating rating={3.5} />)
    const fullStars = screen.getAllByTestId('star-full')
    const halfStar = screen.getByTestId('star-half')
    const emptyStars = screen.getAllByTestId('star-empty')
    
    expect(fullStars).toHaveLength(3)
    expect(halfStar).toBeInTheDocument()
    expect(emptyStars).toHaveLength(1)
  })

  it('debe mostrar 5 estrellas llenas cuando rating es 5', () => {
    render(<Rating rating={5} />)
    const fullStars = screen.getAllByTestId('star-full')
    const emptyStars = screen.queryAllByTestId('star-empty')
    
    expect(fullStars).toHaveLength(5)
    expect(emptyStars).toHaveLength(0)
  })

  it('debe manejar rating con decimales menores a 0.5', () => {
    render(<Rating rating={2.3} />)
    const fullStars = screen.getAllByTestId('star-full')
    const halfStar = screen.queryByTestId('star-half')
    
    expect(fullStars).toHaveLength(2)
    expect(halfStar).not.toBeInTheDocument()
  })

  it('debe manejar rating con decimales mayores a 0.5', () => {
    render(<Rating rating={2.7} />)
    const fullStars = screen.getAllByTestId('star-full')
    const halfStar = screen.getByTestId('star-half')
    
    expect(fullStars).toHaveLength(2)
    expect(halfStar).toBeInTheDocument()
  })

  it('debe aplicar className personalizado', () => {
    render(<Rating rating={3} className="custom-rating" />)
    const container = screen.getByTestId('star-full').closest('span')
    expect(container).toHaveClass('custom-rating')
  })

  it('debe tener clase text-warning por defecto', () => {
    render(<Rating rating={3} />)
    const container = screen.getByTestId('star-full').closest('span')
    expect(container).toHaveClass('text-warning')
  })

  it('debe manejar rating negativo como 0', () => {
    render(<Rating rating={-1} />)
    const emptyStars = screen.getAllByTestId('star-empty')
    expect(emptyStars).toHaveLength(5)
  })

  it('debe manejar rating mayor a 5', () => {
    render(<Rating rating={10} />)
    const fullStars = screen.getAllByTestId('star-full')
    expect(fullStars).toHaveLength(5)
  })

  it('debe calcular correctamente estrellas llenas, media y vacías', () => {
    const { rerender } = render(<Rating rating={2.5} />)
    
    let fullStars = screen.getAllByTestId('star-full')
    let halfStar = screen.getByTestId('star-half')
    let emptyStars = screen.getAllByTestId('star-empty')
    
    expect(fullStars).toHaveLength(2)
    expect(halfStar).toBeInTheDocument()
    expect(emptyStars).toHaveLength(2)

    rerender(<Rating rating={4.8} />)
    
    fullStars = screen.getAllByTestId('star-full')
    halfStar = screen.getByTestId('star-half')
    emptyStars = screen.queryAllByTestId('star-empty')
    
    expect(fullStars).toHaveLength(4)
    expect(halfStar).toBeInTheDocument()
    expect(emptyStars).toHaveLength(0)
  })

  it('debe renderizar correctamente con rating de 1', () => {
    render(<Rating rating={1} />)
    const fullStars = screen.getAllByTestId('star-full')
    const emptyStars = screen.getAllByTestId('star-empty')
    
    expect(fullStars).toHaveLength(1)
    expect(emptyStars).toHaveLength(4)
  })

  it('debe renderizar correctamente con rating de 4.5', () => {
    render(<Rating rating={4.5} />)
    const fullStars = screen.getAllByTestId('star-full')
    const halfStar = screen.getByTestId('star-half')
    const emptyStars = screen.queryAllByTestId('star-empty')
    
    expect(fullStars).toHaveLength(4)
    expect(halfStar).toBeInTheDocument()
    expect(emptyStars).toHaveLength(0)
  })
})










