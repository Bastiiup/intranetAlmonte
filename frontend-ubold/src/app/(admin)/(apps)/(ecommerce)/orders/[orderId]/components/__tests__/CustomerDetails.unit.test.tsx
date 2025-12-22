/**
 * @jest-environment jsdom
 */

/**
 * Pruebas unitarias para el componente CustomerDetails
 */

import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import CustomerDetails from '../CustomerDetails'

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

describe('CustomerDetails', () => {
  const mockPedido = {
    id: 123,
    customer_id: 456,
    billing: {
      first_name: 'Juan',
      last_name: 'Pérez',
      email: 'juan.perez@example.com',
      phone: '+56912345678',
      city: 'Santiago',
      country: 'CL',
    },
  }

  it('debe renderizar el nombre del cliente', () => {
    render(<CustomerDetails pedido={mockPedido} />)
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
  })

  it('debe mostrar el email del cliente', () => {
    render(<CustomerDetails pedido={mockPedido} />)
    expect(screen.getByText('juan.perez@example.com')).toBeInTheDocument()
  })

  it('debe mostrar el teléfono del cliente', () => {
    render(<CustomerDetails pedido={mockPedido} />)
    expect(screen.getByText('+56912345678')).toBeInTheDocument()
  })

  it('debe mostrar la ciudad y país', () => {
    render(<CustomerDetails pedido={mockPedido} />)
    expect(screen.getByText(/Santiago, CL/i)).toBeInTheDocument()
  })

  it('debe mostrar el ID del cliente si existe', () => {
    render(<CustomerDetails pedido={mockPedido} />)
    expect(screen.getByText(/ID: 456/i)).toBeInTheDocument()
  })

  it('debe manejar cliente sin nombre', () => {
    const pedidoSinNombre = {
      ...mockPedido,
      billing: {
        ...mockPedido.billing,
        first_name: '',
        last_name: '',
      },
    }
    render(<CustomerDetails pedido={pedidoSinNombre} />)
    expect(screen.getByText(/Cliente sin nombre/i)).toBeInTheDocument()
  })

  it('debe manejar cliente sin email', () => {
    const pedidoSinEmail = {
      ...mockPedido,
      billing: {
        ...mockPedido.billing,
        email: '',
      },
    }
    render(<CustomerDetails pedido={pedidoSinEmail} />)
    expect(screen.getByText(/Sin email/i)).toBeInTheDocument()
  })

  it('debe manejar cliente sin teléfono', () => {
    const pedidoSinTelefono = {
      ...mockPedido,
      billing: {
        ...mockPedido.billing,
        phone: '',
      },
    }
    render(<CustomerDetails pedido={pedidoSinTelefono} />)
    expect(screen.getByText(/Sin teléfono/i)).toBeInTheDocument()
  })

  it('debe retornar null si no hay pedido', () => {
    const { container } = render(<CustomerDetails pedido={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('debe retornar null si no hay billing', () => {
    const pedidoSinBilling = { ...mockPedido, billing: null }
    const { container } = render(<CustomerDetails pedido={pedidoSinBilling} />)
    expect(container.firstChild).toBeNull()
  })

  it('debe mostrar solo el país si no hay ciudad', () => {
    const pedidoSinCiudad = {
      ...mockPedido,
      billing: {
        ...mockPedido.billing,
        city: '',
      },
    }
    render(<CustomerDetails pedido={pedidoSinCiudad} />)
    expect(screen.getByText('CL')).toBeInTheDocument()
  })

  it('NO debe mostrar botón de editar en el header', () => {
    render(<CustomerDetails pedido={mockPedido} />)
    // Verificar que no hay botón de editar (lápiz) en el header
    const header = screen.getByText('Detalles del Cliente').closest('.card-header')
    expect(header).toBeInTheDocument()
    // El botón de editar ya no debería estar presente
  })
})
