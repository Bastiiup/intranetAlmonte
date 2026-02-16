import { exportarMaterialesAPDF, MaterialPDF } from '../pdf'

// Mock de pdfmake
const mockCreatePdf = jest.fn(() => ({
  download: jest.fn(),
}))

const mockPdfMake = {
  default: {
    vfs: {},
    createPdf: mockCreatePdf,
  },
}

jest.mock('pdfmake/build/pdfmake', () => ({
  __esModule: true,
  default: {
    vfs: {},
    createPdf: mockCreatePdf,
  },
}))

jest.mock('pdfmake/build/vfs_fonts', () => ({
  __esModule: true,
  default: {
    pdfMake: {
      vfs: {},
    },
  },
}))

describe('pdf helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Resetear el mock de createPdf
    mockCreatePdf.mockReturnValue({
      download: jest.fn(),
    })
  })

  describe('exportarMaterialesAPDF', () => {
    const mockMateriales: MaterialPDF[] = [
      {
        material_nombre: 'Lápiz',
        tipo: 'util',
        cantidad: 2,
        obligatorio: true,
        descripcion: 'Lápiz grafito',
      },
      {
        material_nombre: 'Cuaderno',
        tipo: 'cuaderno',
        cantidad: 1,
        obligatorio: false,
      },
    ]

    it('debe exportar materiales a PDF correctamente', async () => {
      await exportarMaterialesAPDF(mockMateriales)

      expect(mockCreatePdf).toHaveBeenCalled()
      const docDefinition = mockCreatePdf.mock.calls[0][0]
      
      expect(docDefinition).toHaveProperty('content')
      expect(docDefinition).toHaveProperty('styles')
      expect(docDefinition.content[0].text).toBe('Lista de Materiales')
    })

    it('debe usar título personalizado cuando se proporciona', async () => {
      await exportarMaterialesAPDF(mockMateriales, 'test-materiales', 'Título Personalizado')

      const docDefinition = mockCreatePdf.mock.calls[0][0]
      expect(docDefinition.content[0].text).toBe('Título Personalizado')
    })

    it('debe usar nombre de archivo personalizado', async () => {
      await exportarMaterialesAPDF(mockMateriales, 'archivo-personalizado')

      expect(mockCreatePdf).toHaveBeenCalled()
      const downloadCall = mockCreatePdf.mock.results[0].value.download
      expect(downloadCall).toHaveBeenCalledWith('archivo-personalizado.pdf')
    })

    it('debe incluir el total de materiales', async () => {
      await exportarMaterialesAPDF(mockMateriales)

      const docDefinition = mockCreatePdf.mock.calls[0][0]
      const subheader = docDefinition.content.find((item: any) => 
        item.text && item.text.includes('Total de materiales')
      )
      expect(subheader.text).toContain('Total de materiales: 2')
    })

    it('debe mapear correctamente los tipos de materiales', async () => {
      const materiales: MaterialPDF[] = [
        { material_nombre: 'Util', tipo: 'util', cantidad: 1, obligatorio: true },
        { material_nombre: 'Libro', tipo: 'libro', cantidad: 1, obligatorio: true },
        { material_nombre: 'Cuaderno', tipo: 'cuaderno', cantidad: 1, obligatorio: true },
        { material_nombre: 'Otro', tipo: 'otro', cantidad: 1, obligatorio: true },
      ]

      await exportarMaterialesAPDF(materiales)

      const docDefinition = mockCreatePdf.mock.calls[0][0]
      const tableBody = docDefinition.content.find((item: any) => item.table)?.table.body
      
      expect(tableBody[1][2].text).toBe('Útil Escolar')
      expect(tableBody[2][2].text).toBe('Libro')
      expect(tableBody[3][2].text).toBe('Cuaderno')
      expect(tableBody[4][2].text).toBe('Otro')
    })

    it('debe mapear correctamente obligatorio a Obligatorio/Opcional', async () => {
      const materiales: MaterialPDF[] = [
        { material_nombre: 'Obligatorio', tipo: 'util', cantidad: 1, obligatorio: true },
        { material_nombre: 'Opcional', tipo: 'util', cantidad: 1, obligatorio: false },
      ]

      await exportarMaterialesAPDF(materiales)

      const docDefinition = mockCreatePdf.mock.calls[0][0]
      const tableBody = docDefinition.content.find((item: any) => item.table)?.table.body
      
      expect(tableBody[1][3].text).toBe('Obligatorio')
      expect(tableBody[1][3].color).toBe('#28a745')
      expect(tableBody[2][3].text).toBe('Opcional')
      expect(tableBody[2][3].color).toBe('#6c757d')
    })

    it('debe incluir descripción cuando está disponible', async () => {
      await exportarMaterialesAPDF(mockMateriales)

      const docDefinition = mockCreatePdf.mock.calls[0][0]
      const tableBody = docDefinition.content.find((item: any) => item.table)?.table.body
      
      expect(tableBody[1][4].text).toBe('Lápiz grafito')
      expect(tableBody[2][4].text).toBe('-')
    })

    it('debe usar cantidad por defecto de 1 cuando no se proporciona', async () => {
      const materiales: MaterialPDF[] = [
        { material_nombre: 'Sin cantidad', tipo: 'util', cantidad: 0, obligatorio: true },
      ]

      await exportarMaterialesAPDF(materiales)

      const docDefinition = mockCreatePdf.mock.calls[0][0]
      const tableBody = docDefinition.content.find((item: any) => item.table)?.table.body
      
      expect(tableBody[1][0].text).toBe('1')
    })

    it('debe incluir fecha de generación', async () => {
      await exportarMaterialesAPDF(mockMateriales)

      const docDefinition = mockCreatePdf.mock.calls[0][0]
      const footer = docDefinition.content.find((item: any) => 
        item.text && item.text.includes('Generado el')
      )
      
      expect(footer).toBeDefined()
      expect(footer.text).toContain('Generado el')
    })

    it('debe tener estilos correctos definidos', async () => {
      await exportarMaterialesAPDF(mockMateriales)

      const docDefinition = mockCreatePdf.mock.calls[0][0]
      
      expect(docDefinition.styles).toHaveProperty('header')
      expect(docDefinition.styles).toHaveProperty('subheader')
      expect(docDefinition.styles).toHaveProperty('tableHeader')
      expect(docDefinition.styles).toHaveProperty('descripcion')
      expect(docDefinition.styles).toHaveProperty('footer')
      
      expect(docDefinition.styles.header.fontSize).toBe(20)
      expect(docDefinition.styles.header.bold).toBe(true)
    })

    it('debe manejar errores correctamente', async () => {
      mockCreatePdf.mockImplementationOnce(() => {
        throw new Error('PDF generation error')
      })

      await expect(exportarMaterialesAPDF(mockMateriales)).rejects.toThrow('Error al generar el PDF')
    })

    it('debe manejar diferentes estructuras de pdfFonts', async () => {
      // Simular diferentes estructuras de pdfFonts
      jest.resetModules()
      
      jest.doMock('pdfmake/build/vfs_fonts', () => ({
        __esModule: true,
        default: {
          vfs: { 'test': 'font data' },
        },
      }))

      const { exportarMaterialesAPDF: exportFn } = await import('../pdf')
      
      await exportFn(mockMateriales)

      expect(mockCreatePdf).toHaveBeenCalled()
    })

    it('debe tener márgenes de página correctos', async () => {
      await exportarMaterialesAPDF(mockMateriales)

      const docDefinition = mockCreatePdf.mock.calls[0][0]
      expect(docDefinition.pageMargins).toEqual([40, 60, 40, 60])
    })

    it('debe tener ancho de columnas correcto', async () => {
      await exportarMaterialesAPDF(mockMateriales)

      const docDefinition = mockCreatePdf.mock.calls[0][0]
      const table = docDefinition.content.find((item: any) => item.table)
      
      expect(table.table.widths).toEqual(['8%', '35%', '20%', '15%', '22%'])
    })
  })
})

