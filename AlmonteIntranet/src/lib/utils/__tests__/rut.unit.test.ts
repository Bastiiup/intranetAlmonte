import { validarRUTChileno, formatearRUT, limpiarRUT } from '../rut'

describe('RUT utilities', () => {
  describe('validarRUTChileno', () => {
    it('debe validar un RUT correcto sin formato', () => {
      const result = validarRUTChileno('123456785')
      expect(result.valid).toBe(true)
      expect(result.formatted).toBe('12345678-5')
    })

    it('debe validar un RUT correcto con guión', () => {
      const result = validarRUTChileno('12345678-5')
      expect(result.valid).toBe(true)
      expect(result.formatted).toBe('12345678-5')
    })

    it('debe validar un RUT correcto con puntos y guión', () => {
      const result = validarRUTChileno('12.345.678-5')
      expect(result.valid).toBe(true)
      expect(result.formatted).toBe('12345678-5')
    })

    it('debe validar un RUT con dígito verificador K', () => {
      const result = validarRUTChileno('11111111-K')
      expect(result.valid).toBe(true)
      expect(result.formatted).toBe('11111111-K')
    })

    it('debe rechazar un RUT con dígito verificador incorrecto', () => {
      const result = validarRUTChileno('12345678-0')
      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('debe rechazar un RUT muy corto', () => {
      const result = validarRUTChileno('123456')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('8 y 9 caracteres')
    })

    it('debe rechazar un RUT muy largo', () => {
      const result = validarRUTChileno('1234567890')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('8 y 9 caracteres')
    })

    it('debe rechazar un RUT con caracteres no numéricos en el cuerpo', () => {
      const result = validarRUTChileno('12345abc-9')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('solo números')
    })

    it('debe rechazar un dígito verificador inválido', () => {
      const result = validarRUTChileno('12345678-X')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('número o la letra K')
    })

    it('debe manejar espacios en el RUT', () => {
      const result = validarRUTChileno('12 345 678-5')
      expect(result.valid).toBe(true)
      expect(result.formatted).toBe('12345678-5')
    })
  })

  describe('formatearRUT', () => {
    it('debe formatear un RUT sin formato', () => {
      expect(formatearRUT('123456785')).toBe('12345678-5')
    })

    it('debe formatear un RUT con puntos', () => {
      expect(formatearRUT('12.345.678.5')).toBe('12345678-5')
    })

    it('debe formatear un RUT con guión', () => {
      expect(formatearRUT('12345678-5')).toBe('12345678-5')
    })

    it('debe convertir el dígito verificador a mayúsculas', () => {
      expect(formatearRUT('12345678-k')).toBe('12345678-K')
    })

    it('debe manejar strings muy cortos', () => {
      expect(formatearRUT('1')).toBe('1')
      expect(formatearRUT('')).toBe('')
    })

    it('debe manejar espacios', () => {
      expect(formatearRUT('12 345 678 5')).toBe('12345678-5')
    })
  })

  describe('limpiarRUT', () => {
    it('debe limpiar puntos y guiones', () => {
      expect(limpiarRUT('12.345.678-9')).toBe('123456789')
    })

    it('debe limpiar espacios', () => {
      expect(limpiarRUT('12 345 678 9')).toBe('123456789')
    })

    it('debe convertir a mayúsculas', () => {
      expect(limpiarRUT('12345678-k')).toBe('12345678K')
    })

    it('debe mantener solo dígitos y K', () => {
      expect(limpiarRUT('12.345.678-K')).toBe('12345678K')
    })
  })
})

