/**
 * @jest-environment jsdom
 */

/**
 * Pruebas unitarias para el componente OrdersList
 */

import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import OrdersList from '../OrdersList'

// Mock de Next.js Image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />
  },
}))

// Mock de Next.js Link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}))

describe('OrdersList', () => {
  const mockPedidos = [
    {
      id: 1,
      number: '1001',
      date_created: '2024-04-24T10:10:00',
      date_paid: '2024-04-24T10:15:00',
      status: 'completed',
      total: '100.00',
      total_tax: '10.00',
      shipping_total: '5.00',
      discount_total: '0.00',
      billing: {
        first_name: 'Juan',
        last_name: 'Pérez',
        email: 'juan@example.com',
        phone: '+56912345678',
      },
      payment_method_title: 'Tarjeta de Crédito',
      line_items: [],
    },
    {
      id: 2,
      number: '1002',
      date_created: '2024-04-25T11:20:00',
      date_paid: null,
      status: 'pending',
      total: '200.00',
      total_tax: '20.00',
      shipping_total: '10.00',
      discount_total: '0.00',
      billing: {
        first_name: 'María',
        last_name: 'González',
        email: 'maria@example.com',
        phone: '+56987654321',
      },
      payment_method_title: 'Transferencia',
      line_items: [],
    },
  ]

  it('debe renderizar la lista de pedidos sin errores', () => {
    const { container } = render(<OrdersList pedidos={mockPedidos} />)
    expect(container).toBeInTheDocument()
  })

  it('debe mostrar los números de pedido en los links', () => {
    render(<OrdersList pedidos={mockPedidos} />)
    // Buscar los links que apuntan a los detalles del pedido
    const links = screen.getAllByRole('link')
    const orderLinks = links.filter((link) => link.getAttribute('href')?.includes('/orders/'))
    expect(orderLinks.length).toBeGreaterThan(0)
    // Verificar que los links tienen los IDs correctos
    expect(orderLinks.some(link => link.getAttribute('href')?.includes('/orders/1'))).toBe(true)
    expect(orderLinks.some(link => link.getAttribute('href')?.includes('/orders/2'))).toBe(true)
  })

  it('debe mostrar los nombres de los clientes', () => {
    render(<OrdersList pedidos={mockPedidos} />)
    expect(screen.getByText(/Juan Pérez/i)).toBeInTheDocument()
    expect(screen.getByText(/María González/i)).toBeInTheDocument()
  })

  it('debe mostrar los montos de los pedidos', () => {
    render(<OrdersList pedidos={mockPedidos} />)
    expect(screen.getByText(/100/i)).toBeInTheDocument()
    expect(screen.getByText(/200/i)).toBeInTheDocument()
  })

  it('debe mostrar los estados de pago traducidos', () => {
    render(<OrdersList pedidos={mockPedidos} />)
    expect(screen.getAllByText(/Pagado/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Pendiente/i).length).toBeGreaterThan(0)
  })

  it('NO debe mostrar el botón "Agregar Pedido"', () => {
    render(<OrdersList pedidos={mockPedidos} />)
    expect(screen.queryByText(/Agregar Pedido/i)).not.toBeInTheDocument()
  })

  it('debe mostrar solo el botón del ojo en la columna de acciones', () => {
    render(<OrdersList pedidos={mockPedidos} />)
    // Buscar los links que apuntan a los detalles del pedido (el botón del ojo está dentro de un Link)
    const links = screen.getAllByRole('link')
    const orderLinks = links.filter((link) => link.getAttribute('href')?.includes('/orders/'))
    expect(orderLinks.length).toBeGreaterThan(0)
  })

  it('NO debe mostrar botones de editar o eliminar en acciones', () => {
    render(<OrdersList pedidos={mockPedidos} />)
    // Verificar que no hay botones de editar o eliminar
    // Estos botones ya no deberían estar presentes
    const buttons = screen.getAllByRole('button')
    const editButtons = buttons.filter((btn) => btn.textContent?.includes('Editar') || btn.getAttribute('aria-label')?.includes('edit'))
    const deleteButtons = buttons.filter((btn) => btn.textContent?.includes('Eliminar') || btn.getAttribute('aria-label')?.includes('delete'))
    expect(editButtons.length).toBe(0)
    expect(deleteButtons.length).toBe(0)
  })

  it('debe manejar pedidos vacíos sin errores', () => {
    const { container } = render(<OrdersList pedidos={[]} />)
    expect(container).toBeInTheDocument()
  })

  it('debe manejar pedidos undefined sin errores', () => {
    const { container } = render(<OrdersList pedidos={undefined} />)
    expect(container).toBeInTheDocument()
  })
})
