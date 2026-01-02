/**
 * @jest-environment jsdom
 */

/**
 * Pruebas unitarias para el componente ShippingActivity
 */

import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import ShippingActivity from '../ShippingActivity'

// Mock de Next.js Link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}))

describe('ShippingActivity', () => {
  const mockPedido = {
    id: 123,
    number: 'WB20100',
    date_created: '2024-04-24T10:10:00',
    date_paid: '2024-04-24T10:15:00',
    date_completed: '2024-04-25T14:00:00',
    status: 'completed',
    payment_method_title: 'Tarjeta de Crédito',
    transaction_id: 'TXN123456',
  }

  it('debe renderizar el título "Actividad de Envío"', () => {
    render(<ShippingActivity pedido={mockPedido} />)
    expect(screen.getByText(/Actividad de Envío/i)).toBeInTheDocument()
  })

  it('debe mostrar el evento "Pedido Confirmado"', () => {
    render(<ShippingActivity pedido={mockPedido} />)
    expect(screen.getByText(/Pedido Confirmado/i)).toBeInTheDocument()
  })

  it('debe mostrar el evento "Pago Confirmado" cuando date_paid existe', () => {
    render(<ShippingActivity pedido={mockPedido} />)
    expect(screen.getByText(/Pago Confirmado/i)).toBeInTheDocument()
  })

  it('debe mostrar el evento "Completado" cuando status es completed y date_completed existe', () => {
    render(<ShippingActivity pedido={mockPedido} />)
    expect(screen.getByText(/Completado/i)).toBeInTheDocument()
  })

  it('debe mostrar el número de pedido en el tracking', () => {
    render(<ShippingActivity pedido={mockPedido} />)
    const trackingNumbers = screen.getAllByText(/WB20100/i)
    expect(trackingNumbers.length).toBeGreaterThan(0)
  })

  it('debe mostrar el transaction_id en el tracking del pago', () => {
    render(<ShippingActivity pedido={mockPedido} />)
    const transactionElements = screen.getAllByText(/TXN123456/i)
    expect(transactionElements.length).toBeGreaterThan(0)
  })

  it('debe mostrar "En Procesamiento" cuando status es processing', () => {
    const pedidoProcessing = { ...mockPedido, status: 'processing', date_paid: null, date_completed: null }
    render(<ShippingActivity pedido={pedidoProcessing} />)
    expect(screen.getByText(/En Procesamiento/i)).toBeInTheDocument()
  })

  it('debe mostrar "En Procesamiento" cuando status es on-hold', () => {
    const pedidoOnHold = { ...mockPedido, status: 'on-hold', date_paid: null, date_completed: null }
    render(<ShippingActivity pedido={pedidoOnHold} />)
    expect(screen.getByText(/En Procesamiento/i)).toBeInTheDocument()
  })

  it('debe mostrar "Enviado" cuando status es shipped', () => {
    const pedidoShipped = { ...mockPedido, status: 'shipped', date_paid: null, date_completed: null }
    render(<ShippingActivity pedido={pedidoShipped} />)
    const enviadoElements = screen.getAllByText(/Enviado/i)
    expect(enviadoElements.length).toBeGreaterThan(0)
  })

  it('debe mostrar "Cancelado" cuando status es cancelled', () => {
    const pedidoCancelled = { ...mockPedido, status: 'cancelled', date_paid: null, date_completed: null }
    render(<ShippingActivity pedido={pedidoCancelled} />)
    const canceladoElements = screen.getAllByText(/Cancelado/i)
    expect(canceladoElements.length).toBeGreaterThan(0)
  })

  it('debe mostrar "Reembolsado" cuando status es refunded', () => {
    const pedidoRefunded = { ...mockPedido, status: 'refunded', date_paid: null, date_completed: null }
    render(<ShippingActivity pedido={pedidoRefunded} />)
    const reembolsadoElements = screen.getAllByText(/Reembolsado/i)
    expect(reembolsadoElements.length).toBeGreaterThan(0)
  })

  it('debe retornar null si no hay pedido', () => {
    const { container } = render(<ShippingActivity pedido={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('debe mostrar la fecha formateada correctamente', () => {
    render(<ShippingActivity pedido={mockPedido} />)
    // Verificar que se muestra alguna fecha formateada
    const fechas = screen.getAllByText(/\d{1,2} \w{3}, \d{4}/)
    expect(fechas.length).toBeGreaterThan(0)
  })

  it('debe mostrar el método de pago en el evento de pago', () => {
    render(<ShippingActivity pedido={mockPedido} />)
    expect(screen.getByText(/Tarjeta de Crédito/i)).toBeInTheDocument()
  })

  it('debe usar el ID del pedido si number no existe', () => {
    const pedidoSinNumber = { ...mockPedido, number: undefined }
    render(<ShippingActivity pedido={pedidoSinNumber} />)
    // El ID puede aparecer múltiples veces en el timeline
    const idElements = screen.getAllByText(/123/i)
    expect(idElements.length).toBeGreaterThan(0)
  })
})
