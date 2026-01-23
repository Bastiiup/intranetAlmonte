import { renderHook, act } from '@testing-library/react'
import useModal from '../useModal'

describe('useModal', () => {
  it('debe inicializar con modal cerrado', () => {
    const { result } = renderHook(() => useModal())
    
    expect(result.current.isOpen).toBe(false)
    expect(result.current.size).toBeUndefined()
    expect(result.current.className).toBe('')
    expect(result.current.scroll).toBe(false)
  })

  it('debe abrir el modal con tamaño pequeño', () => {
    const { result } = renderHook(() => useModal())
    
    act(() => {
      result.current.openModalWithSize('sm')
    })
    
    expect(result.current.isOpen).toBe(true)
    expect(result.current.size).toBe('sm')
    expect(result.current.className).toBe('')
    expect(result.current.scroll).toBe(false)
  })

  it('debe abrir el modal con tamaño grande', () => {
    const { result } = renderHook(() => useModal())
    
    act(() => {
      result.current.openModalWithSize('lg')
    })
    
    expect(result.current.isOpen).toBe(true)
    expect(result.current.size).toBe('lg')
  })

  it('debe abrir el modal con tamaño extra grande', () => {
    const { result } = renderHook(() => useModal())
    
    act(() => {
      result.current.openModalWithSize('xl')
    })
    
    expect(result.current.isOpen).toBe(true)
    expect(result.current.size).toBe('xl')
  })

  it('debe abrir el modal con clase personalizada', () => {
    const { result } = renderHook(() => useModal())
    
    act(() => {
      result.current.openModalWithClass('custom-class')
    })
    
    expect(result.current.isOpen).toBe(true)
    expect(result.current.className).toBe('custom-class')
    expect(result.current.scroll).toBe(false)
  })

  it('debe abrir el modal con scroll', () => {
    const { result } = renderHook(() => useModal())
    
    act(() => {
      result.current.openModalWithScroll()
    })
    
    expect(result.current.isOpen).toBe(true)
    expect(result.current.scroll).toBe(true)
    expect(result.current.className).toBe('w-100')
  })

  it('debe alternar el modal con toggleModal', () => {
    const { result } = renderHook(() => useModal())
    
    act(() => {
      result.current.toggleModal()
    })
    
    expect(result.current.isOpen).toBe(true)
    
    act(() => {
      result.current.toggleModal()
    })
    
    expect(result.current.isOpen).toBe(false)
  })

  it('debe resetear className y scroll al abrir con tamaño', () => {
    const { result } = renderHook(() => useModal())
    
    // Primero abrir con scroll
    act(() => {
      result.current.openModalWithScroll()
    })
    
    expect(result.current.scroll).toBe(true)
    expect(result.current.className).toBe('w-100')
    
    // Luego abrir con tamaño
    act(() => {
      result.current.openModalWithSize('lg')
    })
    
    expect(result.current.scroll).toBe(false)
    expect(result.current.className).toBe('')
    expect(result.current.size).toBe('lg')
  })

  it('debe resetear scroll al abrir con clase', () => {
    const { result } = renderHook(() => useModal())
    
    act(() => {
      result.current.openModalWithScroll()
    })
    
    expect(result.current.scroll).toBe(true)
    
    act(() => {
      result.current.openModalWithClass('test-class')
    })
    
    expect(result.current.scroll).toBe(false)
    expect(result.current.className).toBe('test-class')
  })
})

