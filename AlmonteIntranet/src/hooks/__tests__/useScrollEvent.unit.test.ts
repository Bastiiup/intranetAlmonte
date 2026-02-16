import { renderHook, act } from '@testing-library/react'
import useScrollEvent from '../useScrollEvent'

describe('useScrollEvent', () => {
  beforeEach(() => {
    // Mock window.scrollY
    Object.defineProperty(window, 'scrollY', {
      writable: true,
      value: 0,
    })

    // Mock window.innerHeight
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      value: 800,
    })

    // Mock document.body.offsetHeight
    Object.defineProperty(document.body, 'offsetHeight', {
      writable: true,
      value: 2000,
    })

    // Mock addEventListener y removeEventListener
    window.addEventListener = jest.fn()
    window.removeEventListener = jest.fn()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('debe inicializar con valores por defecto', () => {
    const { result } = renderHook(() => useScrollEvent())

    expect(result.current.scrollY).toBe(0)
    expect(result.current.scrollPassed).toBeGreaterThanOrEqual(0)
    expect(result.current.scrollHeight).toBe(2000)
  })

  it('debe registrar el event listener de scroll', () => {
    renderHook(() => useScrollEvent())

    expect(window.addEventListener).toHaveBeenCalledWith(
      'scroll',
      expect.any(Function),
      { passive: true }
    )
  })

  it('debe limpiar el event listener al desmontar', () => {
    const { unmount } = renderHook(() => useScrollEvent())

    unmount()

    expect(window.removeEventListener).toHaveBeenCalledWith(
      'scroll',
      expect.any(Function)
    )
  })

  it('debe actualizar scrollY cuando se hace scroll', () => {
    const { result } = renderHook(() => useScrollEvent())

    // Simular scroll
    Object.defineProperty(window, 'scrollY', {
      writable: true,
      value: 500,
    })

    // Obtener el handler del addEventListener
    const scrollHandler = (window.addEventListener as jest.Mock).mock.calls[0][1]

    act(() => {
      scrollHandler()
    })

    expect(result.current.scrollY).toBe(500)
  })

  it('debe calcular scrollPassed correctamente', () => {
    const { result } = renderHook(() => useScrollEvent())

    // scrollY = 500, innerHeight = 800, offsetHeight = 2000
    // scrollPassed = ((500 + 800) * 100) / 2000 = 65%
    Object.defineProperty(window, 'scrollY', {
      writable: true,
      value: 500,
    })

    const scrollHandler = (window.addEventListener as jest.Mock).mock.calls[0][1]

    act(() => {
      scrollHandler()
    })

    const expectedScrollPassed = ((500 + 800) * 100) / 2000
    expect(result.current.scrollPassed).toBeCloseTo(expectedScrollPassed, 1)
  })

  it('debe manejar cuando window es undefined', () => {
    // Guardar referencias originales
    const originalWindow = global.window
    const originalAddEventListener = window.addEventListener
    const originalRemoveEventListener = window.removeEventListener
    
    // Mock window como undefined temporalmente
    // @ts-ignore
    Object.defineProperty(global, 'window', {
      value: undefined,
      writable: true,
      configurable: true,
    })

    const { result } = renderHook(() => useScrollEvent())

    expect(result.current.scrollY).toBe(0)
    expect(result.current.scrollPassed).toBe(0)
    expect(result.current.scrollHeight).toBe(0)

    // Restaurar window
    // @ts-ignore
    Object.defineProperty(global, 'window', {
      value: originalWindow,
      writable: true,
      configurable: true,
    })
  })

  it('debe actualizar scrollHeight al inicializar', () => {
    Object.defineProperty(document.body, 'offsetHeight', {
      writable: true,
      value: 3000,
    })

    const { result } = renderHook(() => useScrollEvent())

    expect(result.current.scrollHeight).toBe(3000)
  })

  it('debe calcular scrollPassed como 100% cuando se llega al final', () => {
    const { result } = renderHook(() => useScrollEvent())

    // scrollY = 1200, innerHeight = 800, offsetHeight = 2000
    // scrollPassed = ((1200 + 800) * 100) / 2000 = 100%
    Object.defineProperty(window, 'scrollY', {
      writable: true,
      value: 1200,
    })

    const scrollHandler = (window.addEventListener as jest.Mock).mock.calls[0][1]

    act(() => {
      scrollHandler()
    })

    const expectedScrollPassed = ((1200 + 800) * 100) / 2000
    expect(result.current.scrollPassed).toBeCloseTo(expectedScrollPassed, 1)
  })
})

