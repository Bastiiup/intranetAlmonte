import { debounce } from '../debounce'

describe('debounce', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('debe ejecutar la función después del delay especificado', () => {
    const mockFn = jest.fn()
    const debouncedFn = debounce(mockFn, 1000)

    debouncedFn()
    expect(mockFn).not.toHaveBeenCalled()

    jest.advanceTimersByTime(1000)
    expect(mockFn).toHaveBeenCalledTimes(1)
  })

  it('debe cancelar la ejecución anterior si se llama nuevamente antes del delay', () => {
    const mockFn = jest.fn()
    const debouncedFn = debounce(mockFn, 1000)

    debouncedFn()
    jest.advanceTimersByTime(500)
    
    debouncedFn()
    jest.advanceTimersByTime(500)
    expect(mockFn).not.toHaveBeenCalled()

    jest.advanceTimersByTime(500)
    expect(mockFn).toHaveBeenCalledTimes(1)
  })

  it('debe pasar los argumentos correctamente', () => {
    const mockFn = jest.fn()
    const debouncedFn = debounce(mockFn, 1000)

    debouncedFn('arg1', 'arg2', 123)
    jest.advanceTimersByTime(1000)

    expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2', 123)
  })

  it('debe manejar múltiples llamadas independientes después del delay', () => {
    const mockFn = jest.fn()
    const debouncedFn = debounce(mockFn, 1000)

    debouncedFn('first')
    jest.advanceTimersByTime(1000)
    expect(mockFn).toHaveBeenCalledWith('first')
    expect(mockFn).toHaveBeenCalledTimes(1)

    debouncedFn('second')
    jest.advanceTimersByTime(1000)
    expect(mockFn).toHaveBeenCalledWith('second')
    expect(mockFn).toHaveBeenCalledTimes(2)
  })

  it('debe funcionar con diferentes tipos de funciones', () => {
    const mockFn1 = jest.fn((a: number, b: number) => a + b)
    const mockFn2 = jest.fn((str: string) => str.toUpperCase())

    const debouncedFn1 = debounce(mockFn1, 500)
    const debouncedFn2 = debounce(mockFn2, 500)

    debouncedFn1(1, 2)
    debouncedFn2('hello')
    
    jest.advanceTimersByTime(500)

    expect(mockFn1).toHaveBeenCalledWith(1, 2)
    expect(mockFn2).toHaveBeenCalledWith('hello')
  })
})










