import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ChatCard from '../cards/ChatCard'

// Mock de SimplebarClient
jest.mock('@/components/client-wrapper/SimplebarClient', () => ({
  __esModule: true,
  default: ({ children, className }: any) => <div className={className}>{children}</div>,
}))

// Mock de next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, className }: any) => <img src={src} alt={alt} className={className} />,
}))

// Mock de imágenes
jest.mock('@/assets/images/users/user-2.jpg', () => 'user-2.jpg')
jest.mock('@/assets/images/users/user-5.jpg', () => 'user-5.jpg')

// Mock de data
jest.mock('@/components/cards/data', () => ({
  messages: [
    {
      message: 'Hello',
      time: '10:00 am',
      fromUser: false,
      avatar: 'user-5.jpg',
    },
  ],
}))

// Mock de react-icons
jest.mock('react-icons/lu', () => ({
  LuMessageSquare: () => <span data-testid="message-icon">💬</span>,
}))

jest.mock('react-icons/tb', () => ({
  TbClock: () => <span data-testid="clock-icon">🕐</span>,
  TbSend2: () => <span data-testid="send-icon">📤</span>,
}))

describe('ChatCard', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('debe renderizar el componente', () => {
    render(<ChatCard />)
    expect(screen.getByText('Chat')).toBeInTheDocument()
  })

  it('debe mostrar mensajes iniciales', () => {
    render(<ChatCard />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('debe tener input de mensaje', () => {
    render(<ChatCard />)
    const input = screen.getByPlaceholderText('Enter message...')
    expect(input).toBeInTheDocument()
  })

  it('debe actualizar el input cuando se escribe', () => {
    render(<ChatCard />)
    const input = screen.getByPlaceholderText('Enter message...') as HTMLInputElement
    
    fireEvent.change(input, { target: { value: 'Test message' } })
    
    expect(input.value).toBe('Test message')
  })

  it('debe enviar mensaje cuando se hace submit', async () => {
    render(<ChatCard />)
    const input = screen.getByPlaceholderText('Enter message...')
    const form = input.closest('form')
    
    fireEvent.change(input, { target: { value: 'New message' } })
    fireEvent.submit(form!)
    
    await waitFor(() => {
      expect(screen.getByText('New message')).toBeInTheDocument()
    })
  })

  it('no debe enviar mensaje vacío', () => {
    render(<ChatCard />)
    const input = screen.getByPlaceholderText('Enter message...')
    const form = input.closest('form')
    
    fireEvent.change(input, { target: { value: '   ' } })
    fireEvent.submit(form!)
    
    // No debe agregar mensaje vacío
    const messages = screen.getAllByText(/New message|Hello/)
    expect(messages.length).toBeLessThanOrEqual(1)
  })

  it('debe limpiar el input después de enviar', () => {
    render(<ChatCard />)
    const input = screen.getByPlaceholderText('Enter message...') as HTMLInputElement
    const form = input.closest('form')
    
    fireEvent.change(input, { target: { value: 'Test' } })
    fireEvent.submit(form!)
    
    expect(input.value).toBe('')
  })

  it('debe mostrar botón de enviar', () => {
    render(<ChatCard />)
    const sendButton = screen.getByTestId('send-icon').closest('button')
    expect(sendButton).toBeInTheDocument()
  })

  it('debe mostrar iconos de reloj en los mensajes', () => {
    render(<ChatCard />)
    const clockIcons = screen.getAllByTestId('clock-icon')
    expect(clockIcons.length).toBeGreaterThan(0)
  })
})










