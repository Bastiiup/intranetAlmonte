import { renderHook, act } from '@testing-library/react'
import { useCountdown } from '../useCountdown'

describe('useCountdown', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('debe calcular el tiempo restante correctamente', () => {
    const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // 2 días en el futuro
    const { result } = renderHook(() => useCountdown(futureDate))

    expect(result.current.days).toBeGreaterThanOrEqual(1)
    expect(result.current.hours).toBeGreaterThanOrEqual(0)
    expect(result.current.minutes).toBeGreaterThanOrEqual(0)
    expect(result.current.seconds).toBeGreaterThanOrEqual(0)
  })

  it('debe retornar ceros cuando la fecha ya pasó', () => {
    const pastDate = new Date(Date.now() - 1000) // 1 segundo en el pasado
    const { result } = renderHook(() => useCountdown(pastDate))

    expect(result.current.days).toBe(0)
    expect(result.current.hours).toBe(0)
    expect(result.current.minutes).toBe(0)
    expect(result.current.seconds).toBe(0)
  })

  it('debe actualizar cada segundo', () => {
    const futureDate = new Date(Date.now() + 5000) // 5 segundos en el futuro
    const { result } = renderHook(() => useCountdown(futureDate))

    const initialSeconds = result.current.seconds

    act(() => {
      jest.advanceTimersByTime(1000)
    })

    expect(result.current.seconds).not.toBe(initialSeconds)
  })

  it('debe manejar fechas como string', () => {
    const futureDate = new Date(Date.now() + 10000).toISOString()
    const { result } = renderHook(() => useCountdown(futureDate))

    expect(result.current.days).toBeGreaterThanOrEqual(0)
    expect(result.current.hours).toBeGreaterThanOrEqual(0)
    expect(result.current.minutes).toBeGreaterThanOrEqual(0)
    expect(result.current.seconds).toBeGreaterThanOrEqual(0)
  })

  it('debe calcular días correctamente', () => {
    const futureDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 días
    const { result } = renderHook(() => useCountdown(futureDate))

    expect(result.current.days).toBeGreaterThanOrEqual(2)
    expect(result.current.days).toBeLessThanOrEqual(3)
  })

  it('debe limpiar el intervalo al desmontar', () => {
    const futureDate = new Date(Date.now() + 10000)
    const { unmount } = renderHook(() => useCountdown(futureDate))

    const clearIntervalSpy = jest.spyOn(global, 'clearInterval')

    unmount()

    expect(clearIntervalSpy).toHaveBeenCalled()
    clearIntervalSpy.mockRestore()
  })
})










