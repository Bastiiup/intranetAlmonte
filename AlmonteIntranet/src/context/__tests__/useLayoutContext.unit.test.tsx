import { renderHook, act } from '@testing-library/react'
import { LayoutProvider, useLayoutContext } from '@/context/useLayoutContext'
import { ReactNode } from 'react'

// Mock de usehooks-ts
const mockSetSettings = jest.fn()
const mockSettings = {
  skin: 'default',
  theme: 'light',
  monochrome: false,
  orientation: 'vertical',
  sidenavColor: 'light',
  sidenavSize: 'default' as const,
  sidenavUser: false,
  topBarColor: 'light',
  position: 'fixed',
  width: 'fluid',
}

jest.mock('usehooks-ts', () => ({
  useLocalStorage: jest.fn(() => [mockSettings, mockSetSettings]),
}))

// Mock de helpers
jest.mock('@/helpers/debounce', () => ({
  debounce: jest.fn((fn) => fn),
}))

jest.mock('@/helpers/layout', () => ({
  toggleAttribute: jest.fn(),
}))

// Mock de window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

describe('useLayoutContext', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <div>
      <LayoutProvider>{children}</LayoutProvider>
    </div>
  )

  beforeEach(() => {
    jest.clearAllMocks()
    // Mock de document
    document.documentElement.setAttribute = jest.fn()
    document.documentElement.classList.add = jest.fn()
    document.documentElement.classList.remove = jest.fn()
    document.documentElement.getAttribute = jest.fn(() => null)
    document.body.appendChild = jest.fn()
    document.body.removeChild = jest.fn()
    document.getElementById = jest.fn(() => null)
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1920,
    })
  })

  it('debe proporcionar el contexto correctamente', () => {
    const { result } = renderHook(() => useLayoutContext(), { wrapper })
    
    expect(result.current).toBeDefined()
    expect(result.current.skin).toBe('default')
    expect(result.current.theme).toBe('light')
  })

  it('debe tener updateSettings', () => {
    const { result } = renderHook(() => useLayoutContext(), { wrapper })
    
    expect(result.current.updateSettings).toBeDefined()
    expect(typeof result.current.updateSettings).toBe('function')
  })

  it('debe actualizar settings cuando se llama updateSettings', () => {
    const { result } = renderHook(() => useLayoutContext(), { wrapper })
    
    act(() => {
      result.current.updateSettings({ theme: 'dark' })
    })

    expect(mockSetSettings).toHaveBeenCalled()
  })

  it('debe tener toggleCustomizer', () => {
    const { result } = renderHook(() => useLayoutContext(), { wrapper })
    
    expect(result.current.toggleCustomizer).toBeDefined()
    expect(typeof result.current.toggleCustomizer).toBe('function')
  })

  it('debe tener reset', () => {
    const { result } = renderHook(() => useLayoutContext(), { wrapper })
    
    expect(result.current.reset).toBeDefined()
    expect(typeof result.current.reset).toBe('function')
  })

  it('debe resetear a estado inicial cuando se llama reset', () => {
    const { result } = renderHook(() => useLayoutContext(), { wrapper })
    
    act(() => {
      result.current.reset()
    })

    expect(mockSetSettings).toHaveBeenCalledWith({
      skin: 'default',
      theme: 'light',
      monochrome: false,
      orientation: 'vertical',
      sidenavColor: 'light',
      sidenavSize: 'default',
      sidenavUser: false,
      topBarColor: 'light',
      position: 'fixed',
      width: 'fluid',
    })
  })

  it('debe tener showBackdrop y hideBackdrop', () => {
    const { result } = renderHook(() => useLayoutContext(), { wrapper })
    
    expect(result.current.showBackdrop).toBeDefined()
    expect(result.current.hideBackdrop).toBeDefined()
  })

  it('debe mostrar backdrop cuando se llama showBackdrop', () => {
    const { result } = renderHook(() => useLayoutContext(), { wrapper })
    const mockBackdrop = document.createElement('div')
    document.createElement = jest.fn(() => mockBackdrop)
    
    act(() => {
      result.current.showBackdrop()
    })

    expect(document.createElement).toHaveBeenCalledWith('div')
    expect(document.body.appendChild).toHaveBeenCalled()
  })

  it('debe ocultar backdrop cuando se llama hideBackdrop', () => {
    const { result } = renderHook(() => useLayoutContext(), { wrapper })
    const mockBackdrop = document.createElement('div')
    document.getElementById = jest.fn(() => mockBackdrop)
    
    act(() => {
      result.current.hideBackdrop()
    })

    expect(document.body.removeChild).toHaveBeenCalled()
  })

  it('debe tener isCustomizerOpen', () => {
    const { result } = renderHook(() => useLayoutContext(), { wrapper })
    
    expect(result.current.isCustomizerOpen).toBeDefined()
    expect(typeof result.current.isCustomizerOpen).toBe('boolean')
  })

  it('debe lanzar error cuando se usa fuera del provider', () => {
    // Suprimir console.error para este test
    const originalError = console.error
    console.error = jest.fn()
    
    expect(() => {
      renderHook(() => useLayoutContext())
    }).toThrow('useLayoutContext can only be used within LayoutProvider')
    
    console.error = originalError
  })

  it('debe aplicar atributos al DOM cuando cambian settings', () => {
    const { toggleAttribute } = require('@/helpers/layout')
    
    renderHook(() => useLayoutContext(), { wrapper })
    
    // Los atributos deberían aplicarse en el efecto
    expect(toggleAttribute).toHaveBeenCalled()
  })

  it('debe manejar resize de ventana', () => {
    const { result } = renderHook(() => useLayoutContext(), { wrapper })
    
    act(() => {
      // Simular resize
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 800,
      })
      window.dispatchEvent(new Event('resize'))
    })

    // Debería actualizar settings según el ancho
    expect(mockSetSettings).toHaveBeenCalled()
  })
})

