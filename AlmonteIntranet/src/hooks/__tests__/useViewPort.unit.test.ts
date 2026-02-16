import { renderHook, act } from '@testing-library/react'
import useViewPort from '../useViewPort'

describe('useViewPort', () => {
  beforeEach(() => {
    // Mock window.innerWidth e innerHeight
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    })

    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768,
    })

    // Mock addEventListener y removeEventListener
    window.addEventListener = jest.fn()
    window.removeEventListener = jest.fn()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('debe inicializar con las dimensiones actuales de la ventana', () => {
    const { result } = renderHook(() => useViewPort())

    expect(result.current.width).toBe(1024)
    expect(result.current.height).toBe(768)
  })

  it('debe inicializar con 0 cuando window es undefined', () => {
    const originalWindow = global.window
    // @ts-ignore
    delete global.window

    const { result } = renderHook(() => useViewPort())

    expect(result.current.width).toBe(0)
    expect(result.current.height).toBe(0)

    global.window = originalWindow
  })

  it('debe registrar el event listener de resize', () => {
    renderHook(() => useViewPort())

    expect(window.addEventListener).toHaveBeenCalledWith(
      'resize',
      expect.any(Function)
    )
  })

  it('debe limpiar el event listener al desmontar', () => {
    const { unmount } = renderHook(() => useViewPort())

    unmount()

    expect(window.removeEventListener).toHaveBeenCalledWith(
      'resize',
      expect.any(Function)
    )
  })

  it('debe actualizar las dimensiones cuando se redimensiona la ventana', () => {
    const { result } = renderHook(() => useViewPort())

    // Cambiar las dimensiones
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1920,
    })

    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 1080,
    })

    // Obtener el handler del addEventListener
    const resizeHandler = (window.addEventListener as jest.Mock).mock.calls[0][1]

    act(() => {
      resizeHandler()
    })

    expect(result.current.width).toBe(1920)
    expect(result.current.height).toBe(1080)
  })

  it('debe manejar múltiples redimensionamientos', () => {
    const { result } = renderHook(() => useViewPort())

    const resizeHandler = (window.addEventListener as jest.Mock).mock.calls[0][1]

    // Primer resize
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 800,
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 600,
    })

    act(() => {
      resizeHandler()
    })

    expect(result.current.width).toBe(800)
    expect(result.current.height).toBe(600)

    // Segundo resize
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1600,
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 900,
    })

    act(() => {
      resizeHandler()
    })

    expect(result.current.width).toBe(1600)
    expect(result.current.height).toBe(900)
  })

  it('debe retornar un objeto con width y height', () => {
    const { result } = renderHook(() => useViewPort())

    expect(result.current).toHaveProperty('width')
    expect(result.current).toHaveProperty('height')
    expect(typeof result.current.width).toBe('number')
    expect(typeof result.current.height).toBe('number')
  })
})










