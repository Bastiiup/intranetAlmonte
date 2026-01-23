import { getColor, getFont } from '../chart'

// Mock de getComputedStyle
const mockGetComputedStyle = jest.fn()

describe('chart helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock de window y document
    Object.defineProperty(window, 'getComputedStyle', {
      writable: true,
      value: mockGetComputedStyle,
    })
    
    Object.defineProperty(document, 'documentElement', {
      writable: true,
      value: {
        style: {},
      },
    })
    
    Object.defineProperty(document, 'body', {
      writable: true,
      value: {
        style: {},
      },
    })
  })

  describe('getColor', () => {
    it('debe retornar color por defecto cuando window no está definido', () => {
      const originalWindow = global.window
      // @ts-ignore
      delete global.window

      const result = getColor('primary')
      expect(result).toBe('#000000')

      global.window = originalWindow
    })

    it('debe retornar rgba por defecto cuando window no está definido y el valor incluye -rgb', () => {
      const originalWindow = global.window
      // @ts-ignore
      delete global.window

      const result = getColor('primary-rgb', 0.5)
      expect(result).toBe('rgba(0,0,0,0.5)')

      global.window = originalWindow
    })

    it('debe obtener el color desde CSS variables', () => {
      mockGetComputedStyle.mockReturnValue({
        getPropertyValue: jest.fn((prop: string) => {
          if (prop === '--ins-primary') return ' #ff0000 '
          return ''
        }),
      })

      const result = getColor('primary')
      expect(result).toBe('#ff0000')
      expect(mockGetComputedStyle).toHaveBeenCalledWith(document.documentElement)
    })

    it('debe retornar color por defecto cuando la variable CSS está vacía', () => {
      mockGetComputedStyle.mockReturnValue({
        getPropertyValue: jest.fn(() => ''),
      })

      const result = getColor('primary')
      expect(result).toBe('#000000')
    })

    it('debe retornar rgba cuando el valor incluye -rgb', () => {
      mockGetComputedStyle.mockReturnValue({
        getPropertyValue: jest.fn((prop: string) => {
          if (prop === '--ins-primary-rgb') return '255, 0, 0'
          return ''
        }),
      })

      const result = getColor('primary-rgb', 0.8)
      expect(result).toBe('rgba(255, 0, 0, 0.8)')
    })

    it('debe usar alpha por defecto de 1', () => {
      mockGetComputedStyle.mockReturnValue({
        getPropertyValue: jest.fn((prop: string) => {
          if (prop === '--ins-primary-rgb') return '255, 0, 0'
          return ''
        }),
      })

      const result = getColor('primary-rgb')
      expect(result).toBe('rgba(255, 0, 0, 1)')
    })

    it('debe manejar valores con espacios en blanco', () => {
      mockGetComputedStyle.mockReturnValue({
        getPropertyValue: jest.fn((prop: string) => {
          if (prop === '--ins-primary') return '  #00ff00  '
          return ''
        }),
      })

      const result = getColor('primary')
      expect(result).toBe('#00ff00')
    })
  })

  describe('getFont', () => {
    it('debe retornar undefined cuando window no está definido', () => {
      const originalWindow = global.window
      // @ts-ignore
      delete global.window

      const result = getFont()
      expect(result).toBeUndefined()

      global.window = originalWindow
    })

    it('debe obtener la fuente desde CSS', () => {
      mockGetComputedStyle.mockReturnValue({
        getPropertyValue: jest.fn(() => ''),
        fontFamily: ' Arial, sans-serif ',
      })

      const result = getFont()
      expect(result).toBe('Arial, sans-serif')
      expect(mockGetComputedStyle).toHaveBeenCalledWith(document.body)
    })

    it('debe manejar fuentes con espacios en blanco', () => {
      mockGetComputedStyle.mockReturnValue({
        getPropertyValue: jest.fn(() => ''),
        fontFamily: '  "Times New Roman", serif  ',
      })

      const result = getFont()
      expect(result).toBe('"Times New Roman", serif')
    })

    it('debe retornar fuente vacía cuando no hay fuente definida', () => {
      mockGetComputedStyle.mockReturnValue({
        getPropertyValue: jest.fn(() => ''),
        fontFamily: '',
      })

      const result = getFont()
      expect(result).toBe('')
    })
  })
})

