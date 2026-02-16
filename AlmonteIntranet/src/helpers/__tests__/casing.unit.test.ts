import { toPascalCase, generateInitials, abbreviatedNumber } from '../casing'

describe('casing helpers', () => {
  describe('toPascalCase', () => {
    it('debe convertir texto con guiones a Pascal Case', () => {
      expect(toPascalCase('hello-world')).toBe('Hello World')
      expect(toPascalCase('hello-world-test')).toBe('Hello World Test')
    })

    it('debe convertir texto con guiones bajos a Pascal Case', () => {
      expect(toPascalCase('hello_world')).toBe('Hello World')
      expect(toPascalCase('hello_world_test')).toBe('Hello World Test')
    })

    it('debe convertir texto con espacios a Pascal Case', () => {
      expect(toPascalCase('hello world')).toBe('Hello World')
      expect(toPascalCase('hello world test')).toBe('Hello World Test')
    })

    it('debe manejar texto ya en Pascal Case', () => {
      expect(toPascalCase('Hello World')).toBe('Hello World')
    })

    it('debe manejar texto en minúsculas', () => {
      expect(toPascalCase('hello')).toBe('Hello')
      expect(toPascalCase('hello world')).toBe('Hello World')
    })

    it('debe manejar texto en mayúsculas', () => {
      expect(toPascalCase('HELLO')).toBe('Hello')
      expect(toPascalCase('HELLO WORLD')).toBe('Hello World')
    })

    it('debe manejar strings vacíos', () => {
      expect(toPascalCase('')).toBe('')
    })

    it('debe manejar múltiples espacios o guiones', () => {
      expect(toPascalCase('hello---world')).toBe('Hello World')
      expect(toPascalCase('hello   world')).toBe('Hello World')
    })
  })

  describe('generateInitials', () => {
    it('debe generar iniciales de un nombre completo', () => {
      expect(generateInitials('Juan Pérez')).toBe('JP')
      expect(generateInitials('María José García')).toBe('MJG')
    })

    it('debe manejar un solo nombre', () => {
      expect(generateInitials('Juan')).toBe('J')
    })

    it('debe convertir a mayúsculas', () => {
      expect(generateInitials('juan pérez')).toBe('JP')
      expect(generateInitials('MARÍA JOSÉ')).toBe('MJ')
    })

    it('debe manejar strings vacíos', () => {
      expect(generateInitials('')).toBe('')
    })

    it('debe manejar múltiples espacios', () => {
      expect(generateInitials('Juan  Pérez')).toBe('JP')
      expect(generateInitials('María   José   García')).toBe('MJG')
    })

    it('debe manejar nombres con caracteres especiales', () => {
      expect(generateInitials('José María')).toBe('JM')
      expect(generateInitials('Ángel López')).toBe('ÁL')
    })
  })

  describe('abbreviatedNumber', () => {
    it('debe retornar 0 para cero', () => {
      expect(abbreviatedNumber(0)).toBe('0')
    })

    it('debe retornar números menores a 1000 sin abreviatura', () => {
      expect(abbreviatedNumber(1)).toBe('1')
      expect(abbreviatedNumber(100)).toBe('100')
      expect(abbreviatedNumber(999)).toBe('999')
    })

    it('debe abreviar miles con "k"', () => {
      expect(abbreviatedNumber(1000)).toBe('1k')
      expect(abbreviatedNumber(1500)).toBe('2k')
      expect(abbreviatedNumber(9999)).toBe('10k')
    })

    it('debe abreviar millones con "m"', () => {
      expect(abbreviatedNumber(1000000)).toBe('1m')
      expect(abbreviatedNumber(1500000)).toBe('2m')
    })

    it('debe abreviar billones con "b"', () => {
      expect(abbreviatedNumber(1000000000)).toBe('1b')
    })

    it('debe manejar números grandes', () => {
      expect(abbreviatedNumber(1234567)).toBe('1m')
      expect(abbreviatedNumber(1234567890)).toBe('1b')
    })
  })
})

