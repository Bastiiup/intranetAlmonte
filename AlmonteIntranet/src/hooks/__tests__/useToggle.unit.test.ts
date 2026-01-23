import { renderHook, act } from '@testing-library/react'
import useToggle from '../useToggle'

describe('useToggle', () => {
  it('debe inicializar con false por defecto', () => {
    const { result } = renderHook(() => useToggle())
    expect(result.current.isTrue).toBe(false)
  })

  it('debe inicializar con el valor inicial proporcionado', () => {
    const { result } = renderHook(() => useToggle(true))
    expect(result.current.isTrue).toBe(true)
  })

  it('debe cambiar a true cuando se llama setTrue', () => {
    const { result } = renderHook(() => useToggle(false))
    
    act(() => {
      result.current.setTrue()
    })
    
    expect(result.current.isTrue).toBe(true)
  })

  it('debe cambiar a false cuando se llama setFalse', () => {
    const { result } = renderHook(() => useToggle(true))
    
    act(() => {
      result.current.setFalse()
    })
    
    expect(result.current.isTrue).toBe(false)
  })

  it('debe alternar el valor cuando se llama toggle', () => {
    const { result } = renderHook(() => useToggle(false))
    
    act(() => {
      result.current.toggle()
    })
    
    expect(result.current.isTrue).toBe(true)
    
    act(() => {
      result.current.toggle()
    })
    
    expect(result.current.isTrue).toBe(false)
  })

  it('debe mantener la referencia de las funciones entre renders', () => {
    const { result, rerender } = renderHook(() => useToggle())
    
    const firstSetTrue = result.current.setTrue
    const firstSetFalse = result.current.setFalse
    const firstToggle = result.current.toggle
    
    rerender()
    
    expect(result.current.setTrue).toBe(firstSetTrue)
    expect(result.current.setFalse).toBe(firstSetFalse)
    expect(result.current.toggle).toBe(firstToggle)
  })

  it('debe manejar múltiples toggles consecutivos', () => {
    const { result } = renderHook(() => useToggle(false))
    
    act(() => {
      result.current.toggle()
      result.current.toggle()
      result.current.toggle()
    })
    
    expect(result.current.isTrue).toBe(true)
  })
})

