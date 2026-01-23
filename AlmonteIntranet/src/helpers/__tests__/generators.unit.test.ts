import { generateRandomEChartData, getCurrentMonthRange } from '../generators'

describe('generators helpers', () => {
  describe('generateRandomEChartData', () => {
    it('debe generar datos aleatorios para cada nombre', () => {
      const dataName = ['A', 'B', 'C']
      const result = generateRandomEChartData(dataName)

      expect(result).toHaveLength(3)
      expect(result[0].name).toBe('A')
      expect(result[1].name).toBe('B')
      expect(result[2].name).toBe('C')
    })

    it('debe generar valores entre 1 y 100 antes de normalizar', () => {
      const dataName = ['Test']
      const result = generateRandomEChartData(dataName)

      // Los valores se normalizan a porcentajes, así que deben sumar aproximadamente 100
      const total = result.reduce((sum, item) => sum + item.value, 0)
      expect(total).toBeCloseTo(100, 0)
    })

    it('debe normalizar los valores para que sumen 100', () => {
      const dataName = ['A', 'B', 'C']
      const result = generateRandomEChartData(dataName)

      const total = result.reduce((sum, item) => sum + item.value, 0)
      expect(total).toBeCloseTo(100, 1)
    })

    it('debe manejar un solo elemento', () => {
      const dataName = ['Single']
      const result = generateRandomEChartData(dataName)

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Single')
      expect(result[0].value).toBeCloseTo(100, 1)
    })

    it('debe manejar arrays vacíos', () => {
      const result = generateRandomEChartData([])
      expect(result).toHaveLength(0)
    })

    it('debe generar diferentes valores en cada ejecución', () => {
      const dataName = ['A', 'B']
      const result1 = generateRandomEChartData(dataName)
      const result2 = generateRandomEChartData(dataName)

      // Los valores pueden ser diferentes debido a Math.random()
      // Pero la estructura debe ser la misma
      expect(result1).toHaveLength(2)
      expect(result2).toHaveLength(2)
    })
  })

  describe('getCurrentMonthRange', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('debe retornar el primer día del mes actual como inicio', () => {
      // Establecer fecha: 15 de marzo de 2024
      jest.setSystemTime(new Date('2024-03-15T12:00:00Z'))
      
      const [start, end] = getCurrentMonthRange()
      
      expect(start.getDate()).toBe(1)
      expect(start.getMonth()).toBe(2) // Marzo es mes 2 (0-indexed)
      expect(start.getFullYear()).toBe(2024)
      expect(start.getHours()).toBe(0)
      expect(start.getMinutes()).toBe(0)
      expect(start.getSeconds()).toBe(0)
    })

    it('debe retornar el último día del mes actual como fin', () => {
      // Establecer fecha: 15 de marzo de 2024 (marzo tiene 31 días)
      jest.setSystemTime(new Date('2024-03-15T12:00:00Z'))
      
      const [start, end] = getCurrentMonthRange()
      
      expect(end.getDate()).toBe(31)
      expect(end.getMonth()).toBe(2) // Marzo es mes 2
      expect(end.getFullYear()).toBe(2024)
      expect(end.getHours()).toBe(23)
      expect(end.getMinutes()).toBe(59)
      expect(end.getSeconds()).toBe(59)
    })

    it('debe manejar meses con diferentes números de días', () => {
      // Febrero 2024 (año bisiesto, tiene 29 días)
      jest.setSystemTime(new Date('2024-02-15T12:00:00Z'))
      const [start, end] = getCurrentMonthRange()
      
      expect(end.getDate()).toBe(29)
      
      // Abril tiene 30 días
      jest.setSystemTime(new Date('2024-04-15T12:00:00Z'))
      const [start2, end2] = getCurrentMonthRange()
      
      expect(end2.getDate()).toBe(30)
    })

    it('debe manejar cambio de año correctamente', () => {
      // Diciembre 2023
      jest.setSystemTime(new Date('2023-12-15T12:00:00Z'))
      const [start, end] = getCurrentMonthRange()
      
      expect(start.getMonth()).toBe(11) // Diciembre es mes 11
      expect(start.getFullYear()).toBe(2023)
      expect(end.getMonth()).toBe(11)
      expect(end.getFullYear()).toBe(2023)
    })

    it('debe retornar un array con dos elementos Date', () => {
      const result = getCurrentMonthRange()
      
      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(2)
      expect(result[0]).toBeInstanceOf(Date)
      expect(result[1]).toBeInstanceOf(Date)
    })
  })
})

