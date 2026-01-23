import { formatBytes } from '../../helpers/file'

describe('file helpers', () => {
  describe('formatBytes', () => {
    it('debe formatear bytes a "0 Bytes" cuando es 0', () => {
      expect(formatBytes(0)).toBe('0 Bytes')
    })

    it('debe formatear bytes correctamente', () => {
      expect(formatBytes(500)).toBe('500 Bytes')
    })

    it('debe formatear kilobytes correctamente', () => {
      expect(formatBytes(1024)).toBe('1 KB')
      expect(formatBytes(1536)).toBe('1.5 KB')
    })

    it('debe formatear megabytes correctamente', () => {
      expect(formatBytes(1048576)).toBe('1 MB')
      expect(formatBytes(1572864)).toBe('1.5 MB')
    })

    it('debe formatear gigabytes correctamente', () => {
      expect(formatBytes(1073741824)).toBe('1 GB')
    })

    it('debe usar el número de decimales especificado', () => {
      expect(formatBytes(1536, 0)).toBe('2 KB')
      expect(formatBytes(1536, 1)).toBe('1.5 KB')
      expect(formatBytes(1536, 2)).toBe('1.5 KB')
      expect(formatBytes(1536, 3)).toBe('1.5 KB')
    })

    it('debe manejar decimales negativos como 0', () => {
      expect(formatBytes(1536, -1)).toBe('2 KB')
    })

    it('debe formatear terabytes correctamente', () => {
      expect(formatBytes(1099511627776)).toBe('1 TB')
    })

    it('debe manejar números muy grandes', () => {
      expect(formatBytes(1125899906842624)).toBe('1 PB')
    })
  })
})

