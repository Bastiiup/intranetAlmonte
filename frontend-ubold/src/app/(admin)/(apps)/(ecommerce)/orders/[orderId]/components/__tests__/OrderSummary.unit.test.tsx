/**
 * @jest-environment jsdom
 */

/**
 * Pruebas unitarias para el componente OrderSummary
 */

import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import OrderSummary from '../OrderSummary'

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

describe('OrderSummary', () => {
  const mockPedido = {
    id: 123,
    number: 'WB20100',
    date_created: '2024-04-24T10:10:00',
    date_paid: '2024-04-24T10:15:00',
    status: 'completed',
    total: '543.86',
    total_tax: '50.75',
    shipping_total: '10.00',
    discount_total: '25.37',
    line_items: [
      {
        id: 1,
        name: 'Wireless Earbuds',
        product_id: 101,
        quantity: 2,
        price: '79.99',
        total: '159.98',
        sku: 'EAR-001',
      },
      {
        id: 2,
        name: 'Smart Watch',
        product_id: 102,
        quantity: 1,
        price: '199.00',
        total: '199.00',
        sku: 'WATCH-001',
      },
    ],
  }

  it('debe renderizar el número de pedido', () => {
    render(<OrderSummary pedido={mockPedido} />)
    expect(screen.getByText(/Pedido #WB20100/i)).toBeInTheDocument()
  })

  it('debe mostrar la fecha y hora del pedido', () => {
    render(<OrderSummary pedido={mockPedido} />)
    expect(screen.getByText(/24 Apr, 2024/i)).toBeInTheDocument()
  })

  it('debe mostrar el estado de pago como "Pagado" cuando date_paid existe', () => {
    render(<OrderSummary pedido={mockPedido} />)
    expect(screen.getByText(/Pagado/i)).toBeInTheDocument()
  })

  it('debe mostrar el estado de pago como "Pendiente" cuando date_paid no existe', () => {
    const pedidoSinPago = { ...mockPedido, date_paid: null }
    render(<OrderSummary pedido={pedidoSinPago} />)
    expect(screen.getByText(/Pendiente/i)).toBeInTheDocument()
  })

  it('debe mostrar el estado del pedido traducido', () => {
    render(<OrderSummary pedido={mockPedido} />)
    expect(screen.getByText(/Completado/i)).toBeInTheDocument()
  })

  it('debe mostrar los productos del pedido', () => {
    render(<OrderSummary pedido={mockPedido} />)
    expect(screen.getByText('Wireless Earbuds')).toBeInTheDocument()
    expect(screen.getByText('Smart Watch')).toBeInTheDocument()
  })

  it('debe mostrar las cantidades de los productos', () => {
    render(<OrderSummary pedido={mockPedido} />)
    expect(screen.getByText('2')).toBeInTheDocument() // Cantidad de Wireless Earbuds
    expect(screen.getByText('1')).toBeInTheDocument() // Cantidad de Smart Watch
  })

  it('debe mostrar el total del pedido', () => {
    render(<OrderSummary pedido={mockPedido} />)
    expect(screen.getByText(/543.86/i)).toBeInTheDocument()
  })

  it('debe mostrar el subtotal, impuestos, descuento y envío', () => {
    render(<OrderSummary pedido={mockPedido} />)
    expect(screen.getByText(/Subtotal/i)).toBeInTheDocument()
    expect(screen.getByText(/Impuestos/i)).toBeInTheDocument()
    expect(screen.getByText(/Descuento/i)).toBeInTheDocument()
    expect(screen.getByText(/Envío/i)).toBeInTheDocument()
  })

  it('debe mostrar mensaje cuando no hay productos', () => {
    const pedidoSinProductos = { ...mockPedido, line_items: [] }
    render(<OrderSummary pedido={pedidoSinProductos} />)
    expect(screen.getByText(/No hay productos en este pedido/i)).toBeInTheDocument()
  })

  it('debe retornar null si no hay pedido', () => {
    const { container } = render(<OrderSummary pedido={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('debe mostrar diferentes estados de pedido correctamente', () => {
    const estados = ['processing', 'on-hold', 'cancelled', 'refunded', 'pending']
    
    estados.forEach((estado) => {
      const { unmount } = render(<OrderSummary pedido={{ ...mockPedido, status: estado }} />)
      expect(screen.getByText(new RegExp(estado === 'processing' ? 'Procesando' : estado === 'cancelled' ? 'Cancelado' : estado === 'refunded' ? 'Reembolsado' : estado === 'on-hold' ? 'En Espera' : 'Pendiente', 'i'))).toBeInTheDocument()
      unmount()
    })
  })

  it('NO debe mostrar botones de editar o eliminar', () => {
    render(<OrderSummary pedido={mockPedido} />)
    expect(screen.queryByText(/Modificar/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Eliminar/i)).not.toBeInTheDocument()
  })
})
