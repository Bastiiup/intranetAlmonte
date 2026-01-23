import { render } from '@testing-library/react'
import AppWrapper from '../AppWrapper'
import { LayoutProvider } from '@/context/useLayoutContext'
import { NotificationProvider } from '@/context/useNotificationContext'

// Mock de los providers
jest.mock('@/context/useLayoutContext', () => ({
  LayoutProvider: ({ children }: any) => <div data-testid="layout-provider">{children}</div>,
}))

jest.mock('@/context/useNotificationContext', () => ({
  NotificationProvider: ({ children }: any) => <div data-testid="notification-provider">{children}</div>,
}))

// Mock de syncLocalStorageToCookies
jest.mock('@/lib/auth', () => ({
  syncLocalStorageToCookies: jest.fn(),
}))

describe('AppWrapper', () => {
  it('debe renderizar los children', () => {
    const { getByText } = render(
      <AppWrapper>
        <div>Test Content</div>
      </AppWrapper>
    )
    expect(getByText('Test Content')).toBeInTheDocument()
  })

  it('debe envolver children con LayoutProvider', () => {
    const { getByTestId } = render(
      <AppWrapper>
        <div>Test</div>
      </AppWrapper>
    )
    expect(getByTestId('layout-provider')).toBeInTheDocument()
  })

  it('debe envolver children con NotificationProvider', () => {
    const { getByTestId } = render(
      <AppWrapper>
        <div>Test</div>
      </AppWrapper>
    )
    expect(getByTestId('notification-provider')).toBeInTheDocument()
  })

  it('debe tener NotificationProvider dentro de LayoutProvider', () => {
    const { getByTestId } = render(
      <AppWrapper>
        <div>Test</div>
      </AppWrapper>
    )
    const layoutProvider = getByTestId('layout-provider')
    const notificationProvider = getByTestId('notification-provider')
    expect(layoutProvider).toContainElement(notificationProvider)
  })

  it('debe llamar syncLocalStorageToCookies al montar', () => {
    const { syncLocalStorageToCookies } = require('@/lib/auth')
    // Limpiar llamadas previas
    jest.clearAllMocks()
    render(
      <AppWrapper>
        <div>Test</div>
      </AppWrapper>
    )
    // React StrictMode puede llamar useEffect dos veces en desarrollo
    // Aceptamos al menos una llamada
    expect(syncLocalStorageToCookies).toHaveBeenCalled()
  })
})

