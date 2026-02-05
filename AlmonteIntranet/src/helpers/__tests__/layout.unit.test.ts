import { toggleAttribute, easeInOutQuad, scrollToElement } from '../layout'

describe('layout helpers', () => {
  beforeEach(() => {
    // Mock document methods
    document.body = document.createElement('body')
    document.documentElement.setAttribute('test-attr', 'initial')
  })

  afterEach(() => {
    document.documentElement.removeAttribute('test-attr')
  })

  describe('toggleAttribute', () => {
    it('debe establecer un atributo en el elemento HTML', () => {
      toggleAttribute('data-theme', 'dark')
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    })

    it('debe remover un atributo cuando remove es true', () => {
      document.documentElement.setAttribute('data-theme', 'dark')
      toggleAttribute('data-theme', '', true)
      expect(document.documentElement.getAttribute('data-theme')).toBeNull()
    })

    it('debe actualizar un atributo existente', () => {
      document.documentElement.setAttribute('data-theme', 'light')
      toggleAttribute('data-theme', 'dark')
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    })

    it('debe manejar diferentes tags', () => {
      const body = document.createElement('body')
      document.body = body
      body.setAttribute('data-test', 'initial')
      
      toggleAttribute('data-test', 'updated', false, 'body')
      expect(body.getAttribute('data-test')).toBe('updated')
    })

    it('debe manejar cuando document.body no existe', () => {
      const originalBody = document.body
      // @ts-ignore - Simular que body no existe
      document.body = null
      
      // No debe lanzar error
      expect(() => {
        toggleAttribute('data-test', 'value')
      }).not.toThrow()
      
      document.body = originalBody
    })
  })

  describe('easeInOutQuad', () => {
    it('debe retornar el valor inicial cuando t es 0', () => {
      const result = easeInOutQuad(0, 0, 100, 100)
      expect(result).toBe(0)
    })

    it('debe retornar el valor final cuando t es igual a d', () => {
      const result = easeInOutQuad(100, 0, 100, 100)
      expect(result).toBeCloseTo(100, 1)
    })

    it('debe calcular valores intermedios correctamente', () => {
      const result = easeInOutQuad(50, 0, 100, 100)
      expect(result).toBeGreaterThan(0)
      expect(result).toBeLessThan(100)
    })

    it('debe manejar diferentes valores de inicio y cambio', () => {
      const result1 = easeInOutQuad(50, 10, 50, 100)
      const result2 = easeInOutQuad(50, 0, 100, 100)
      
      expect(result1).not.toBe(result2)
      expect(result1).toBeGreaterThan(10)
      expect(result1).toBeLessThan(60)
    })

    it('debe aplicar easing cuadrático en la primera mitad', () => {
      const t1 = easeInOutQuad(25, 0, 100, 100)
      const t2 = easeInOutQuad(50, 0, 100, 100)
      
      // Debe acelerar (segunda mitad del primer tramo)
      expect(t2 - t1).toBeGreaterThan(t1)
    })
  })

  describe('scrollToElement', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.runOnlyPendingTimers()
      jest.useRealTimers()
    })

    it('debe hacer scroll del elemento', () => {
      const element = document.createElement('div')
      element.scrollTop = 0
      element.style.height = '100px'
      element.style.overflow = 'auto'
      
      scrollToElement(element, 100, 200)
      
      jest.advanceTimersByTime(100)
      expect(element.scrollTop).toBeGreaterThan(0)
      
      jest.advanceTimersByTime(200)
      expect(element.scrollTop).toBeCloseTo(100, 0)
    })

    it('debe animar el scroll suavemente', () => {
      const element = document.createElement('div')
      element.scrollTop = 0
      
      const initialScroll = element.scrollTop
      scrollToElement(element, 200, 100)
      
      jest.advanceTimersByTime(50)
      const midScroll = element.scrollTop
      
      jest.advanceTimersByTime(100)
      const finalScroll = element.scrollTop
      
      expect(midScroll).toBeGreaterThan(initialScroll)
      expect(midScroll).toBeLessThan(finalScroll)
      expect(finalScroll).toBeCloseTo(200, 0)
    })

    it('debe manejar scroll hacia arriba', () => {
      const element = document.createElement('div')
      element.scrollTop = 200
      
      scrollToElement(element, 0, 100)
      
      jest.advanceTimersByTime(100)
      expect(element.scrollTop).toBeLessThan(200)
      expect(element.scrollTop).toBeGreaterThanOrEqual(0)
    })

    it('debe manejar diferentes duraciones', () => {
      const element1 = document.createElement('div')
      const element2 = document.createElement('div')
      element1.scrollTop = 0
      element2.scrollTop = 0
      
      scrollToElement(element1, 100, 50)
      scrollToElement(element2, 100, 200)
      
      jest.advanceTimersByTime(50)
      
      // El elemento con duración más corta debería estar más cerca del objetivo
      expect(element1.scrollTop).toBeGreaterThanOrEqual(element2.scrollTop)
    })
  })
})










